import { ProductCard } from "@/components/product-card"
import { CatalogFilters } from "@/components/catalog/filters"
import { Pagination } from "@/components/catalog/pagination"
import { parseSearchParams, searchProducts, SORT_OPTIONS, type SearchInput } from "@/lib/search"

type SP = Record<string, string | string[] | undefined>

type Props = {
  searchParams: Promise<SP>
  basePath: string
  /** Filtros fijos de la página (categoría, solo ofertas, etc.) */
  fixed?: Partial<SearchInput>
  emptyMessage?: string
}

/** Listado con filtros, orden y paginación. Lee searchParams: va dentro de <Suspense>. */
export async function CatalogListing({ searchParams, basePath, fixed, emptyMessage }: Props) {
  const sp = await searchParams
  const parsed = parseSearchParams(sp)
  const input: SearchInput = { ...parsed, ...fixed, perPage: 24 }
  const result = await searchProducts(input)

  return (
    <div>
      <CatalogFilters
        // Re-montar el form cuando cambian los filtros para que los defaultValue se actualicen
        key={JSON.stringify(sp)}
        basePath={basePath}
        current={{
          q: parsed.q,
          talle: parsed.talle ?? [],
          color: parsed.color ?? [],
          min: parsed.min,
          max: parsed.max,
          onSale: Boolean(input.onSale),
          inStock: Boolean(parsed.inStock),
          sort: parsed.sort,
        }}
        facets={result.facets}
        priceRange={result.priceRange}
        sortOptions={SORT_OPTIONS}
        hideOnSale={Boolean(fixed?.onSale)}
        total={result.total}
      />

      {result.hits.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {result.hits.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-xl border border-line bg-surface px-5 py-10 text-center text-muted">
          {emptyMessage ?? "No encontramos productos con esos filtros."}
        </p>
      )}

      <Pagination basePath={basePath} searchParams={sp} page={result.page} totalPages={result.totalPages} />
    </div>
  )
}

export function ListingSkeleton() {
  return (
    <div aria-hidden>
      <div className="h-8 w-48 animate-pulse rounded-full bg-line" />
      <div className="mt-4 h-14 animate-pulse rounded-2xl bg-line/60" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-line/60" />
        ))}
      </div>
    </div>
  )
}
