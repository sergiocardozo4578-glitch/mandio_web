import Link from "next/link"
import { ProductCard } from "@/components/product-card"
import { getLatestProducts, getTopCategories } from "@/lib/medusa"

export default async function Home() {
  const [categories, products] = await Promise.all([
    getTopCategories(),
    getLatestProducts(12),
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
        <Link
          href="/tienda"
          className="mt-8 inline-block rounded-full bg-accent px-6 py-3 font-bold text-ink transition hover:bg-accent-dark"
        >
          Ver la tienda
        </Link>
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

      <section className="my-12">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-extrabold">Novedades</h2>
          <Link href="/tienda" className="text-sm font-semibold text-brand hover:underline">
            Ver todo
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl border border-dashed border-line p-8 text-center text-muted">
            Todavía no hay productos para mostrar. ¿Está corriendo el backend en el puerto 9000?
          </p>
        )}
      </section>
    </div>
  )
}
