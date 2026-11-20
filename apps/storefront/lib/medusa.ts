import Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import { cacheLife, cacheTag } from "next/cache"

export const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})

/*
 * Patrón de lectura del catálogo:
 *  - Las funciones `*Cached` usan "use cache" y LANZAN el error si Medusa falla.
 *    Next no cachea errores, así que una caída del backend no deja guardado
 *    un resultado vacío.
 *  - Las funciones exportadas envuelven a las cacheadas y devuelven un valor
 *    de respaldo, para que la tienda (y el build) no se caigan sin backend.
 * Las etiquetas (cacheTag) las invalida el backend vía POST /api/revalidate.
 */
async function withFallback<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.error(`[medusa] ${label} falló:`, (error as Error).message)
    return fallback
  }
}

// ---------- Región ----------

async function getRegionCached(): Promise<HttpTypes.StoreRegion | null> {
  "use cache"
  cacheLife("hours")
  cacheTag("regions")
  const { regions } = await sdk.store.region.list({ limit: 10 })
  return regions.find((r) => r.currency_code === "pyg") ?? regions[0] ?? null
}

export const getRegion = () => withFallback("getRegion", getRegionCached, null)

// ---------- Categorías ----------

export type CategoryNode = {
  id: string
  name: string
  handle: string
  children: CategoryNode[]
}

async function getCategoryTreeCached(): Promise<CategoryNode[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("categories")
  const { product_categories } = await sdk.store.category.list({
    fields: "id,name,handle,rank,parent_category_id",
    limit: 500,
  })
  const byParent = new Map<string | null, typeof product_categories>()
  for (const c of product_categories) {
    const key = c.parent_category_id ?? null
    byParent.set(key, [...(byParent.get(key) ?? []), c])
  }
  const build = (parent: string | null): CategoryNode[] =>
    (byParent.get(parent) ?? [])
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
      .map((c) => ({ id: c.id, name: c.name, handle: c.handle, children: build(c.id) }))
  return build(null)
}

/** Árbol de categorías activas (para el menú), ordenado por rank. */
export const getCategoryTree = () => withFallback("getCategoryTree", getCategoryTreeCached, [])

export type CategoryWithPath = {
  id: string
  name: string
  handle: string
  description: string | null
  children: { id: string; name: string; handle: string }[]
  /** De la raíz a la categoría actual (para breadcrumbs). */
  path: { name: string; handle: string }[]
}

async function getCategoryByHandleCached(handle: string): Promise<CategoryWithPath | null> {
  "use cache"
  cacheLife("minutes")
  cacheTag("categories")
  const { product_categories } = await sdk.store.category.list({
    handle,
    fields:
      "id,name,handle,description,*category_children,*parent_category,*parent_category.parent_category",
    limit: 1,
  })
  const c = product_categories[0]
  if (!c) return null

  const path: { name: string; handle: string }[] = []
  let node: HttpTypes.StoreProductCategory | null | undefined = c
  while (node) {
    path.unshift({ name: node.name, handle: node.handle })
    node = node.parent_category
  }

  return {
    id: c.id,
    name: c.name,
    handle: c.handle,
    description: c.description || null,
    children: (c.category_children ?? []).map((ch) => ({ id: ch.id, name: ch.name, handle: ch.handle })),
    path,
  }
}

export const getCategoryByHandle = (handle: string) =>
  withFallback("getCategoryByHandle", () => getCategoryByHandleCached(handle), null)

// ---------- Productos ----------

async function getProductByHandleCached(handle: string): Promise<HttpTypes.StoreProduct | null> {
  "use cache"
  cacheLife("minutes")
  cacheTag("products", `product:${handle}`)
  const region = await getRegionCached()
  if (!region) return null
  const { products } = await sdk.store.product.list({
    handle,
    region_id: region.id,
    limit: 1,
    fields:
      "*images,*options,*options.values,*categories,*variants.calculated_price,*variants.options,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder,+material,+weight",
  })
  return products[0] ?? null
}

export const getProductByHandle = (handle: string) =>
  withFallback("getProductByHandle", () => getProductByHandleCached(handle), null)
