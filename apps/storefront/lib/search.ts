import "server-only"
import { cacheLife, cacheTag } from "next/cache"

/**
 * Búsqueda y listados del catálogo sobre Meilisearch (solo servidor).
 * La clave nunca llega al navegador: el autocompletado pasa por /api/search.
 */

export type SearchProduct = {
  id: string
  handle: string
  title: string
  thumbnail: string | null
  category_names: string[]
  price: number | null
  original_price: number | null
  discount_percent: number
  on_sale: boolean
  in_stock: boolean
  variant_count: number
}

export type SortKey = "relevancia" | "novedades" | "precio-asc" | "precio-desc" | "descuento"

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevancia", label: "Relevancia" },
  { value: "novedades", label: "Lo más nuevo" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
  { value: "descuento", label: "Mayor descuento" },
]

export type SearchInput = {
  q?: string
  category?: string
  talle?: string[]
  color?: string[]
  min?: number
  max?: number
  onSale?: boolean
  inStock?: boolean
  sort?: SortKey
  page?: number
  perPage?: number
  excludeId?: string
}

export type SearchResult = {
  hits: SearchProduct[]
  total: number
  page: number
  totalPages: number
  facets: { talle: Record<string, number>; color: Record<string, number> }
  priceRange: { min: number; max: number } | null
}

const EMPTY: SearchResult = {
  hits: [],
  total: 0,
  page: 1,
  totalPages: 0,
  facets: { talle: {}, color: {} },
  priceRange: null,
}

const ATTRIBUTES: (keyof SearchProduct)[] = [
  "id",
  "handle",
  "title",
  "thumbnail",
  "category_names",
  "price",
  "original_price",
  "discount_percent",
  "on_sale",
  "in_stock",
  "variant_count",
]

const quote = (v: string) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`

function buildFilter(input: SearchInput): string[] {
  const f: string[] = []
  if (input.category) f.push(`category_handles = ${quote(input.category)}`)
  if (input.talle?.length) f.push(`talle IN [${input.talle.map(quote).join(", ")}]`)
  if (input.color?.length) f.push(`color IN [${input.color.map(quote).join(", ")}]`)
  if (input.min != null) f.push(`price >= ${input.min}`)
  if (input.max != null) f.push(`price <= ${input.max}`)
  if (input.onSale) f.push("on_sale = true")
  if (input.inStock) f.push("in_stock = true")
  if (input.excludeId) f.push(`id != ${quote(input.excludeId)}`)
  return f
}

function buildSort(sort: SortKey | undefined, hasQuery: boolean): string[] | undefined {
  switch (sort) {
    case "precio-asc":
      return ["price:asc"]
    case "precio-desc":
      return ["price:desc"]
    case "descuento":
      return ["discount_percent:desc"]
    case "novedades":
      return ["created_at:desc"]
    default:
      // Sin texto de búsqueda "relevancia" no significa nada: se muestran las novedades.
      return hasQuery ? undefined : ["created_at:desc"]
  }
}

async function meili<T>(path: string, body: unknown): Promise<T> {
  const host = (process.env.MEILISEARCH_HOST || "http://localhost:7700").replace(/\/$/, "")
  const key = process.env.MEILISEARCH_SEARCH_KEY
  const res = await fetch(`${host}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`Meilisearch ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

type MeiliResponse = {
  hits: SearchProduct[]
  totalHits?: number
  totalPages?: number
  page?: number
  facetDistribution?: Record<string, Record<string, number>>
  facetStats?: Record<string, { min: number; max: number }>
}

// Las funciones cacheadas lanzan el error (Next no cachea errores) y las
// exportadas devuelven un resultado vacío: una caída de Meilisearch no queda guardada.

async function searchProductsCached(input: SearchInput): Promise<SearchResult> {
  "use cache"
  cacheLife("minutes")
  cacheTag("products")

  const perPage = input.perPage ?? 24
  const page = Math.max(1, input.page ?? 1)
  const q = input.q?.trim() ?? ""

  const res = await meili<MeiliResponse>("/indexes/products/search", {
    q,
    filter: buildFilter(input),
    sort: buildSort(input.sort, Boolean(q)),
    hitsPerPage: perPage,
    page,
    facets: ["talle", "color", "price"],
    attributesToRetrieve: ATTRIBUTES,
  })
  return {
    hits: res.hits,
    total: res.totalHits ?? 0,
    page: res.page ?? page,
    totalPages: res.totalPages ?? 0,
    facets: {
      talle: res.facetDistribution?.talle ?? {},
      color: res.facetDistribution?.color ?? {},
    },
    priceRange: res.facetStats?.price ?? null,
  }
}

export async function searchProducts(input: SearchInput): Promise<SearchResult> {
  try {
    return await searchProductsCached(input)
  } catch (error) {
    console.error("[search] falló:", (error as Error).message)
    return EMPTY
  }
}

async function quickSearchCached(q: string, limit: number) {
  "use cache"
  cacheLife("minutes")
  cacheTag("products")
  const res = await meili<{ hits: SearchProduct[]; estimatedTotalHits?: number }>(
    "/indexes/products/search",
    { q, limit, attributesToRetrieve: ATTRIBUTES }
  )
  return { hits: res.hits, total: res.estimatedTotalHits ?? res.hits.length }
}

/** Para el autocompletado del buscador: pocos resultados, sin facetas. */
export async function quickSearch(q: string, limit = 6) {
  if (!q.trim()) return { hits: [] as SearchProduct[], total: 0 }
  try {
    return await quickSearchCached(q.trim(), limit)
  } catch (error) {
    console.error("[search] quickSearch falló:", (error as Error).message)
    return { hits: [] as SearchProduct[], total: 0 }
  }
}

/** Convierte los searchParams de la URL en filtros de búsqueda. */
export function parseSearchParams(
  sp: Record<string, string | string[] | undefined>
): Omit<SearchInput, "category"> {
  const list = (k: string) => {
    const v = sp[k]
    return (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean)
  }
  const one = (k: string) => list(k)[0]
  const num = (k: string) => {
    const digits = one(k)?.replace(/\D/g, "")
    if (!digits) return undefined
    const n = Number(digits)
    return Number.isSafeInteger(n) && (k !== "pagina" || n > 0) ? n : undefined
  }
  const sort = one("orden") as SortKey | undefined
  return {
    q: one("q"),
    talle: list("talle"),
    color: list("color"),
    min: num("min"),
    max: num("max"),
    onSale: one("oferta") === "1",
    inStock: one("stock") === "1",
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? sort : undefined,
    page: num("pagina"),
  }
}
