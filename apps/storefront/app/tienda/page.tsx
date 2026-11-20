import type { Metadata } from "next"
import { Suspense } from "react"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { CatalogListing, ListingSkeleton } from "@/components/catalog/listing"

export const metadata: Metadata = {
  title: "Tienda",
  description: "Todos los productos de Mandi'o: ropa, calzados, hogar, accesorios y más.",
}

export default function TiendaPage(props: PageProps<"/tienda">) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <Breadcrumbs items={[{ name: "Tienda" }]} />
      <h1 className="mb-6 text-3xl font-extrabold">Tienda</h1>
      <Suspense fallback={<ListingSkeleton />}>
        <CatalogListing searchParams={props.searchParams} basePath="/tienda" />
      </Suspense>
    </div>
  )
}
