import type { Metadata } from "next"
import { Suspense } from "react"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { CatalogListing, ListingSkeleton } from "@/components/catalog/listing"

export const metadata: Metadata = {
  title: "Ofertas",
  description: "Productos con descuento en Mandi'o.",
}

export default function OfertasPage(props: PageProps<"/ofertas">) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <Breadcrumbs items={[{ name: "Ofertas" }]} />
      <h1 className="text-3xl font-extrabold">Ofertas</h1>
      <p className="mb-6 mt-1 text-muted">Descuentos por tiempo limitado, hasta agotar stock.</p>
      <Suspense fallback={<ListingSkeleton />}>
        <CatalogListing
          searchParams={props.searchParams}
          basePath="/ofertas"
          fixed={{ onSale: true }}
          emptyMessage="No hay ofertas activas en este momento."
        />
      </Suspense>
    </div>
  )
}
