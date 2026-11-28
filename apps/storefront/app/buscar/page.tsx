import type { Metadata } from "next"
import { Suspense } from "react"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { CatalogListing, ListingSkeleton } from "@/components/catalog/listing"

export const metadata: Metadata = {
  title: "Buscar",
  robots: { index: false, follow: true },
}

async function SearchHeading({ searchParams }: { searchParams: PageProps<"/buscar">["searchParams"] }) {
  const { q } = await searchParams
  const term = (Array.isArray(q) ? q[0] : q)?.trim()
  return (
    <h1 className="page-title mb-6">
      {term ? <>Resultados para “{term}”</> : "Buscar productos"}
    </h1>
  )
}

export default function BuscarPage(props: PageProps<"/buscar">) {
  return (
    <div className="store-container pb-8">
      <Breadcrumbs items={[{ name: "Búsqueda" }]} />
      <Suspense fallback={<h1 className="page-title mb-6">Buscar productos</h1>}>
        <SearchHeading searchParams={props.searchParams} />
      </Suspense>
      <Suspense fallback={<ListingSkeleton />}>
        <CatalogListing
          searchParams={props.searchParams}
          basePath="/buscar"
          emptyMessage="No encontramos productos para tu búsqueda. Probá con otra palabra."
        />
      </Suspense>
    </div>
  )
}
