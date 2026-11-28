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
 *  - Las funciones usan "use cache" y atrapan el error DENTRO del scope
 *    cacheado, devolviendo un valor de respaldo: un error que escapa de
 *    "use cache" hace fallar el prerender (y el build) aunque se atrape afuera.
 *  - Se llama a cacheLife una sola vez por ejecución: el perfil normal si hubo
 *    datos, FALLBACK_LIFE si falló, para que una caída temporal del backend
 *    no quede guardada por mucho tiempo.
 * Las etiquetas (cacheTag) las invalida el backend vía POST /api/revalidate.
 */

/**
 * Vida corta para el respaldo tras un error: se revalida a los 30 s.
 * stale y expire de 5 min o más mantienen la entrada dentro del prerender
 * (con expire < 5 min Next la vuelve un "hueco dinámico" que exige <Suspense>).
 */
export const FALLBACK_LIFE = { stale: 300, revalidate: 30, expire: 600 }

export function logFailure(label: string, error: unknown) {
  console.error(`${label} falló:`, (error as Error)?.message ?? error)
}

// ---------- Región ----------

export async function getRegion(): Promise<HttpTypes.StoreRegion | null> {
  "use cache"
  cacheTag("regions")
  try {
    const { regions } = await sdk.store.region.list({ limit: 10 })
    cacheLife("hours")
    return regions.find((r) => r.currency_code === "pyg") ?? regions[0] ?? null
  } catch (error) {
    logFailure("[medusa] getRegion", error)
    cacheLife(FALLBACK_LIFE)
    return null
  }
}

// ---------- Categorías ----------

export type CategoryNode = {
  id: string
  name: string
  handle: string
  children: CategoryNode[]
}

/** Árbol de categorías activas (para el menú), ordenado por rank. */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  "use cache"
  cacheTag("categories")
  let product_categories: HttpTypes.StoreProductCategory[]
  try {
    ;({ product_categories } = await sdk.store.category.list({
      fields: "id,name,handle,rank,parent_category_id",
      limit: 500,
    }))
  } catch (error) {
    logFailure("[medusa] getCategoryTree", error)
    cacheLife(FALLBACK_LIFE)
    return []
  }
  cacheLife("minutes")
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

export type CategoryWithPath = {
  id: string
  name: string
  handle: string
  description: string | null
  children: { id: string; name: string; handle: string }[]
  /** De la raíz a la categoría actual (para breadcrumbs). */
  path: { name: string; handle: string }[]
}

export async function getCategoryByHandle(handle: string): Promise<CategoryWithPath | null> {
  "use cache"
  cacheTag("categories")
  let product_categories: HttpTypes.StoreProductCategory[]
  try {
    ;({ product_categories } = await sdk.store.category.list({
      handle,
      fields:
        "id,name,handle,description,*category_children,*parent_category,*parent_category.parent_category",
      limit: 1,
    }))
  } catch (error) {
    logFailure("[medusa] getCategoryByHandle", error)
    cacheLife(FALLBACK_LIFE)
    return null
  }
  cacheLife("minutes")
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

// ---------- Productos ----------

export async function getProductByHandle(handle: string): Promise<HttpTypes.StoreProduct | null> {
  "use cache"
  cacheTag("products", `product:${handle}`)
  const region = await getRegion()
  if (!region) {
    // Sin región (backend caído o sin configurar): respaldo de vida corta
    cacheLife(FALLBACK_LIFE)
    return null
  }
  try {
    const { products } = await sdk.store.product.list({
      handle,
      region_id: region.id,
      limit: 1,
      fields:
        "*images,*options,*options.values,*categories,*variants.calculated_price,*variants.options,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder,+material,+weight",
    })
    cacheLife("minutes")
    return products[0] ?? null
  } catch (error) {
    logFailure("[medusa] getProductByHandle", error)
    cacheLife(FALLBACK_LIFE)
    return null
  }
}
