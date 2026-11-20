import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { CreateInventoryLevelInput } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules, ProductStatus } from "@medusajs/framework/utils"
import { createInventoryLevelsWorkflow, createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { syncProducts } from "../../../lib/search-index"

/**
 * POST /admin/carga-rapida
 * Crea productos a partir de las fotos ya subidas (POST /admin/uploads).
 * Pensado para cargar prendas en cantidad: nombre, precio, categoría, talles y stock.
 */

type Item = {
  title: string
  /** Guaraníes, sin decimales */
  price: number
  description?: string
  category_id?: string
  sizes?: string[]
  stock?: number
  image_urls: string[]
  publish?: boolean
}

const MAX_ITEMS = 50

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "producto"

function validate(body: unknown): Item[] {
  const items = (body as { items?: unknown })?.items
  if (!Array.isArray(items) || !items.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Mandá al menos una prenda.")
  }
  if (items.length > MAX_ITEMS) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Máximo ${MAX_ITEMS} prendas por vez.`)
  }
  return items.map((raw, i) => {
    const it = raw as Partial<Item>
    const n = i + 1
    const title = String(it.title ?? "").trim()
    const price = Math.round(Number(it.price))
    if (!title) throw new MedusaError(MedusaError.Types.INVALID_DATA, `Prenda ${n}: falta el nombre.`)
    if (!Number.isFinite(price) || price <= 0) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Prenda ${n}: el precio no es válido.`)
    }
    const urls = Array.isArray(it.image_urls) ? it.image_urls.filter((u) => typeof u === "string" && u) : []
    if (!urls.length) throw new MedusaError(MedusaError.Types.INVALID_DATA, `Prenda ${n}: falta la foto.`)
    const sizes = Array.isArray(it.sizes)
      ? [...new Set(it.sizes.map((s) => String(s).trim()).filter(Boolean))].slice(0, 30)
      : []
    const stock = Math.max(0, Math.round(Number(it.stock ?? 0)) || 0)
    return {
      title: title.slice(0, 200),
      price,
      description: it.description ? String(it.description).slice(0, 5000) : undefined,
      category_id: it.category_id ? String(it.category_id) : undefined,
      sizes,
      stock,
      image_urls: urls.slice(0, 10),
      publish: it.publish !== false,
    }
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const items = validate(req.body)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const storeService = req.scope.resolve(Modules.STORE)

  const [store] = await storeService.listStores({}, { select: ["id", "default_sales_channel_id", "default_location_id"] })
  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
    filters: { type: "default" },
  })
  if (!store?.default_sales_channel_id || !store.default_location_id || !profiles[0]) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "La tienda no tiene canal de venta, depósito o perfil de envío por defecto. Corré el seed."
    )
  }

  // Handles únicos: si "remera-negra" existe, se usa "remera-negra-2", etc.
  const bases = items.map((it) => slugify(it.title))
  const candidates = [...new Set(bases)].flatMap((b) => [
    b,
    ...Array.from({ length: 49 }, (_, k) => `${b}-${k + 2}`),
  ])
  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["handle"],
    filters: { handle: candidates },
    withDeleted: true,
  })
  const taken = new Set(existing.map((p) => p.handle))
  const handles = bases.map((base) => {
    let h = base
    let n = 2
    while (taken.has(h)) h = `${base}-${n++}`
    taken.add(h)
    return h
  })

  const stamp = Date.now().toString(36).toUpperCase()
  const products = items.map((it, i) => {
    const sizes = it.sizes?.length ? it.sizes : null
    const skuBase = `MND-${stamp}-${String(i + 1).padStart(2, "0")}`
    return {
      title: it.title,
      handle: handles[i],
      description: it.description,
      status: it.publish ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
      thumbnail: it.image_urls[0],
      images: it.image_urls.map((url) => ({ url })),
      category_ids: it.category_id ? [it.category_id] : [],
      shipping_profile_id: profiles[0].id,
      sales_channels: [{ id: store.default_sales_channel_id! }],
      options: [{ title: sizes ? "Talle" : "Modelo", values: sizes ?? ["Único"] }],
      variants: (sizes ?? ["Único"]).map((size) => ({
        title: size,
        sku: sizes ? `${skuBase}-${size.toUpperCase().replace(/[^A-Z0-9]/g, "")}` : skuBase,
        options: { [sizes ? "Talle" : "Modelo"]: size },
        manage_inventory: true,
        prices: [{ currency_code: "pyg", amount: it.price }],
      })),
    }
  })

  const { result: created } = await createProductsWorkflow(req.scope).run({ input: { products } })
  const ids = created.map((p) => p.id)

  // Stock inicial por talle en el depósito por defecto
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product_id", "inventory_items.inventory_item_id"],
    filters: { product_id: ids },
  })
  const stockByProduct = Object.fromEntries(created.map((p, i) => [p.id, items[i].stock ?? 0]))
  const levels: CreateInventoryLevelInput[] = variants.flatMap((v) =>
    (v.inventory_items ?? []).map((ii) => ({
      location_id: store.default_location_id!,
      inventory_item_id: ii!.inventory_item_id,
      stocked_quantity: stockByProduct[v.product_id!] ?? 0,
    }))
  )
  if (levels.length) {
    await createInventoryLevelsWorkflow(req.scope).run({ input: { inventory_levels: levels } })
  }

  // El subscriber de product.created indexa antes de que exista el stock: se reindexa acá.
  await syncProducts(req.scope, ids).catch(() => {})

  res.status(201).json({
    products: created.map((p) => ({ id: p.id, title: p.title, handle: p.handle, status: p.status })),
  })
}
