import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  QueryContext,
  getVariantAvailability,
} from "@medusajs/framework/utils"
/**
 * Índice de productos en Meilisearch.
 * Un documento por producto publicado, con los datos que necesita la tienda
 * para listar, filtrar y ordenar sin volver a consultar Medusa.
 *
 * Se usa la API REST directamente (el cliente oficial es solo ESM y el
 * backend de Medusa compila a CommonJS).
 */

export const PRODUCTS_INDEX = "products"

export type ProductDocument = {
  id: string
  handle: string
  title: string
  description: string
  thumbnail: string | null
  skus: string[]
  category_ids: string[]
  category_handles: string[]
  category_names: string[]
  /** Valores de opciones normalizados por nombre: { talle: ["P","M"], color: ["Rosa"] } */
  talle: string[]
  color: string[]
  option_values: string[]
  price: number | null
  original_price: number | null
  discount_percent: number
  on_sale: boolean
  in_stock: boolean
  stock: number | null
  variant_count: number
  created_at: number
}

type MeiliTask = { taskUid: number }

/** Cliente mínimo de Meilisearch sobre fetch. null si no está configurado. */
export function getMeiliClient() {
  const host = process.env.MEILISEARCH_HOST?.replace(/\/$/, "")
  if (!host) return null
  const apiKey = process.env.MEILISEARCH_API_KEY

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${host}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Meilisearch ${method} ${path}: ${res.status} ${await res.text()}`)
    return (await res.json()) as T
  }

  async function waitTask(task: MeiliTask, timeoutMs = 60_000) {
    const started = Date.now()
    for (;;) {
      const t = await request<{ status: string; error?: { message: string } }>(
        "GET",
        `/tasks/${task.taskUid}`
      )
      if (t.status === "succeeded") return
      if (t.status === "failed" || t.status === "canceled") {
        throw new Error(`Tarea de Meilisearch ${t.status}: ${t.error?.message ?? ""}`)
      }
      if (Date.now() - started > timeoutMs) throw new Error("Timeout esperando a Meilisearch")
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  const run = async (method: string, path: string, body?: unknown) =>
    waitTask(await request<MeiliTask>(method, path, body))

  return {
    createIndex: (uid: string, primaryKey: string) => run("POST", "/indexes", { uid, primaryKey }),
    index: (uid: string) => ({
      updateSettings: (settings: Record<string, unknown>) =>
        run("PATCH", `/indexes/${uid}/settings`, settings),
      addDocuments: (docs: unknown[]) =>
        run("POST", `/indexes/${uid}/documents?primaryKey=id`, docs),
      deleteDocuments: (ids: string[]) => run("POST", `/indexes/${uid}/documents/delete-batch`, ids),
      getDocuments: (opts: { fields: string[]; limit: number; offset: number }) =>
        request<{ results: { id: string }[] }>("POST", `/indexes/${uid}/documents/fetch`, opts),
    }),
  }
}

export async function configureProductsIndex() {
  const client = getMeiliClient()
  if (!client) return
  await client.createIndex(PRODUCTS_INDEX, "id").catch(() => {}) // ya existe
  await client
    .index(PRODUCTS_INDEX)
    .updateSettings({
      searchableAttributes: [
        "title",
        "category_names",
        "option_values",
        "skus",
        "description",
      ],
      filterableAttributes: [
        "id",
        "category_ids",
        "category_handles",
        "talle",
        "color",
        "price",
        "on_sale",
        "in_stock",
      ],
      sortableAttributes: ["price", "created_at", "discount_percent", "title"],
      // Español paraguayo: equivalencias comunes al buscar
      synonyms: {
        remera: ["camiseta", "polera"],
        camiseta: ["remera"],
        celu: ["celular"],
        celular: ["celu", "telefono"],
        zapatilla: ["tenis", "championes"],
        campera: ["chaqueta", "abrigo"],
        pollera: ["falda"],
        aros: ["aretes", "pendientes"],
      },
      typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
      pagination: { maxTotalHits: 5000 },
    })

}

const PRODUCT_FIELDS = [
  "id",
  "handle",
  "title",
  "description",
  "thumbnail",
  "status",
  "created_at",
  "categories.id",
  "categories.handle",
  "categories.name",
  "categories.parent_category_id",
  "categories.parent_category.id",
  "categories.parent_category.handle",
  "categories.parent_category.name",
  "variants.id",
  "variants.sku",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "variants.options.value",
  "variants.options.option.title",
  "variants.calculated_price.*",
  "sales_channels.id",
]

async function getPricingContext(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "currency_code"],
    filters: { currency_code: "pyg" },
  })
  const { data: channels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
    filters: { name: "Tienda online" },
  })
  return { region: regions[0], salesChannelId: channels[0]?.id as string | undefined }
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

/** Convierte productos de Medusa en documentos del índice. */
async function buildDocuments(
  container: MedusaContainer,
  filters: Record<string, unknown>
): Promise<{ docs: ProductDocument[]; unpublishedIds: string[] }> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { region, salesChannelId } = await getPricingContext(container)
  if (!region) return { docs: [], unpublishedIds: [] }

  const { data: products } = await query.graph({
    entity: "product",
    fields: PRODUCT_FIELDS,
    filters,
    context: {
      variants: {
        calculated_price: QueryContext({
          region_id: region.id,
          currency_code: region.currency_code,
        }),
      },
    },
  })

  const published = products.filter((p) => p.status === "published")
  const unpublishedIds = products.filter((p) => p.status !== "published").map((p) => p.id)

  const variantIds = published.flatMap((p) => (p.variants ?? []).map((v) => v!.id))
  const availability =
    salesChannelId && variantIds.length
      ? await getVariantAvailability(query, { variant_ids: variantIds, sales_channel_id: salesChannelId })
      : {}

  const docs = published.map((p): ProductDocument => {
    const variants = (p.variants ?? []).filter(Boolean) as any[]
    const prices = variants
      .map((v) => v.calculated_price)
      .filter((cp) => cp?.calculated_amount != null)
    const cheapest = prices.sort((a, b) => a.calculated_amount - b.calculated_amount)[0]
    const price = cheapest ? Number(cheapest.calculated_amount) : null
    const original = cheapest ? Number(cheapest.original_amount ?? cheapest.calculated_amount) : null
    const discount =
      price != null && original && original > price ? Math.round(((original - price) / original) * 100) : 0

    // Una variante está en stock si no gestiona inventario, permite backorder o tiene disponibilidad.
    // totalStock = null significa "sin límite" (alguna variante no controla stock).
    let totalStock: number | null = 0
    let inStock = false
    for (const v of variants) {
      if (!v.manage_inventory || v.allow_backorder) {
        totalStock = null
        inStock = true
        continue
      }
      const qty = availability[v.id]?.availability ?? 0
      if (totalStock !== null) totalStock += qty
      if (qty > 0) inStock = true
    }

    const optionsByName: Record<string, Set<string>> = {}
    for (const v of variants) {
      for (const o of v.options ?? []) {
        const name = normalize(o?.option?.title ?? "")
        if (!name || !o?.value) continue
        ;(optionsByName[name] ??= new Set()).add(o.value)
      }
    }

    // Se indexan también las categorías padre, así "Ropa Mujer" incluye sus subcategorías.
    const cats = new Map<string, { id: string; handle: string; name: string }>()
    for (const c of (p.categories ?? []).filter(Boolean) as any[]) {
      cats.set(c.id, { id: c.id, handle: c.handle, name: c.name })
      if (c.parent_category) {
        const pc = c.parent_category
        cats.set(pc.id, { id: pc.id, handle: pc.handle, name: pc.name })
      }
    }

    return {
      id: p.id,
      handle: p.handle,
      title: p.title,
      description: p.description ?? "",
      thumbnail: p.thumbnail ?? null,
      skus: variants.map((v) => v.sku).filter(Boolean),
      category_ids: [...cats.values()].map((c) => c.id),
      category_handles: [...cats.values()].map((c) => c.handle),
      category_names: [...cats.values()].map((c) => c.name),
      talle: [...(optionsByName["talle"] ?? [])],
      color: [...(optionsByName["color"] ?? [])],
      option_values: Object.values(optionsByName).flatMap((s) => [...s]),
      price,
      original_price: original,
      discount_percent: discount,
      on_sale: discount > 0,
      in_stock: inStock,
      stock: totalStock,
      variant_count: variants.length,
      created_at: new Date(p.created_at as unknown as string).getTime(),
    }
  })

  return { docs, unpublishedIds }
}

/** Reindexa productos puntuales (o todo el catálogo si no se pasan ids). */
export async function syncProducts(container: MedusaContainer, ids?: string[]) {
  const client = getMeiliClient()
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  if (!client) {
    logger.warn("[search] MEILISEARCH_HOST no está configurado: no se indexa.")
    return { indexed: 0, removed: 0 }
  }
  const index = client.index(PRODUCTS_INDEX)

  if (ids?.length) {
    const { docs, unpublishedIds } = await buildDocuments(container, { id: ids })
    const foundIds = new Set([...docs.map((d) => d.id), ...unpublishedIds])
    const toRemove = [...unpublishedIds, ...ids.filter((id) => !foundIds.has(id))]
    if (docs.length) await index.addDocuments(docs)
    if (toRemove.length) await index.deleteDocuments(toRemove)
    return { indexed: docs.length, removed: toRemove.length }
  }

  // Reindexado completo por lotes
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const batchSize = 200
  let offset = 0
  let indexed = 0
  const seen = new Set<string>()
  for (;;) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id"],
      pagination: { skip: offset, take: batchSize },
    })
    if (!data.length) break
    const { docs } = await buildDocuments(container, { id: data.map((p) => p.id) })
    if (docs.length) await index.addDocuments(docs)
    docs.forEach((d) => seen.add(d.id))
    indexed += docs.length
    offset += batchSize
    if (data.length < batchSize) break
  }

  // Quitar del índice lo que ya no existe o no está publicado
  const stale: string[] = []
  let page = 0
  for (;;) {
    const res = await index.getDocuments({ fields: ["id"], limit: 1000, offset: page * 1000 })
    for (const d of res.results) if (!seen.has(d.id as string)) stale.push(d.id as string)
    if (res.results.length < 1000) break
    page++
  }
  if (stale.length) await index.deleteDocuments(stale)

  logger.info(`[search] Reindexado completo: ${indexed} productos, ${stale.length} eliminados.`)
  return { indexed, removed: stale.length }
}
