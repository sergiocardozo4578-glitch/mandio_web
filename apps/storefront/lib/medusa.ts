import Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import { cacheLife, cacheTag } from "next/cache"

export const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  debug: process.env.NODE_ENV === "development",
})

/**
 * Las lecturas del catálogo se cachean unos minutos y se etiquetan para
 * poder invalidarlas desde Medusa (webhook de revalidación, fase 1).
 * Si el backend no responde se devuelve una lista vacía para que la
 * tienda no se caiga (y el build no falle sin backend).
 */
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T) {
  try {
    return await fn()
  } catch (error) {
    console.error(`[medusa] ${label} falló:`, (error as Error).message)
    return fallback
  }
}

export async function getRegion(): Promise<HttpTypes.StoreRegion | null> {
  "use cache"
  cacheLife("hours")
  cacheTag("regions")
  return safe(
    "getRegion",
    async () => {
      const { regions } = await sdk.store.region.list({ limit: 10 })
      return regions.find((r) => r.currency_code === "pyg") ?? regions[0] ?? null
    },
    null
  )
}

export async function getTopCategories(): Promise<HttpTypes.StoreProductCategory[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("categories")
  return safe(
    "getTopCategories",
    async () => {
      const { product_categories } = await sdk.store.category.list({
        parent_category_id: "null",
        fields: "id,name,handle,rank,*category_children",
        limit: 50,
      })
      return [...product_categories].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    },
    []
  )
}

export async function getLatestProducts(limit = 12): Promise<HttpTypes.StoreProduct[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("products")
  const region = await getRegion()
  if (!region) return []
  return safe(
    "getLatestProducts",
    async () => {
      const { products } = await sdk.store.product.list({
        region_id: region.id,
        limit,
        order: "-created_at",
        fields: "id,title,handle,thumbnail,*variants.calculated_price",
      })
      return products
    },
    []
  )
}
