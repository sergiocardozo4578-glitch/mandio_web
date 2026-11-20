import Link from "next/link"
import { ProductCard } from "@/components/product-card"
import { getCategoryTree } from "@/lib/medusa"
import { searchProducts, type SearchProduct } from "@/lib/search"

function ProductRow({ title, href, products }: { title: string; href: string; products: SearchProduct[] }) {
  if (!products.length) return null
  return (
    <section className="my-12">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-extrabold">{title}</h2>
        <Link href={href} className="text-sm font-semibold text-brand hover:underline">
          Ver todo
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}

export default async function Home() {
  const [categories, latest, offers] = await Promise.all([
    getCategoryTree(),
    searchProducts({ sort: "novedades", perPage: 8, inStock: true }),
    searchProducts({ onSale: true, sort: "descuento", perPage: 4, inStock: true }),
  ])

  return (
    <div className="mx-auto max-w-7xl px-4">
      <section className="my-8 overflow-hidden rounded-3xl bg-brand px-6 py-12 text-white sm:px-12 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Nuevo en Mandi&apos;o</p>
        <h1 className="mt-3 max-w-xl text-4xl font-extrabold leading-tight sm:text-5xl">
          De todo un poco, para todo el Paraguay
        </h1>
        <p className="mt-4 max-w-lg text-cream/90">
          Ropa, calzados, hogar, accesorios y regalos. Pagá por transferencia o contra entrega.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/tienda" className="rounded-full bg-accent px-6 py-3 font-bold text-ink transition hover:bg-accent-dark">
            Ver la tienda
          </Link>
          <Link href="/ofertas" className="rounded-full border-2 border-white/70 px-6 py-3 font-bold transition hover:bg-white hover:text-brand">
            Ver ofertas
          </Link>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="my-12">
          <h2 className="text-2xl font-extrabold">Explorá las categorías</h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/c/${c.handle}`}
                  className="flex h-24 items-center justify-center rounded-2xl border border-line bg-surface p-3 text-center text-sm font-bold transition hover:border-brand hover:text-brand"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProductRow title="Ofertas imperdibles" href="/ofertas" products={offers.hits} />
      <ProductRow title="Novedades" href="/tienda?orden=novedades" products={latest.hits} />

      {!latest.hits.length && (
        <p className="my-12 rounded-2xl border border-dashed border-line p-8 text-center text-muted">
          Todavía no hay productos para mostrar. ¿Están corriendo el backend y Meilisearch?
        </p>
      )}
    </div>
  )
}
