import Image from "next/image"
import Link from "next/link"
import { ProductCard } from "@/components/product-card"
import { getCategoryTree } from "@/lib/medusa"
import { searchProducts, type SearchProduct } from "@/lib/search"

function ProductRow({ title, href, products }: { title: string; href: string; products: SearchProduct[] }) {
  if (!products.length) return null
  return (
    <section className="mt-12 sm:mt-16">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-line pb-4">
        <h2 className="section-title">{title}</h2>
        <Link href={href} className="text-sm font-bold text-brand hover:underline">
          Ver todo <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
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

  const featuredHandles = ["ropa-mujer", "joyeria", "hogar"]
  const featured = featuredHandles.flatMap((handle) => categories.filter((category) => category.handle === handle))
  const otherCategories = categories.filter((category) => !featuredHandles.includes(category.handle))

  return (
    <div className="store-container">
      <section className="boutique-cover">
        <div className="cover-copy">
          <p className="cover-kicker">Mandi’o Boutique</p>
          <h1>Tu día, con<br /><em>más estilo.</em></h1>
          <p className="cover-description">Moda, joyería y objetos para darle tu toque a lo cotidiano.</p>
          <div className="cover-actions">
            <Link href="/tienda" className="cover-button">Explorá la tienda <span aria-hidden="true">→</span></Link>
            <Link href="/ofertas" className="cover-link">Ver ofertas</Link>
          </div>
        </div>
        <div className="cover-window">
          <Image src="/portada-boutique.webp" alt="" fill preload sizes="(min-width: 1280px) 540px, (min-width: 700px) 45vw, 88vw" className="object-cover" />
        </div>
      </section>

      {categories.length > 0 && (
        <section className="boutique-collections">
          <h2 className="section-title">Explorá las categorías</h2>
          {featured.length > 0 && (
            <ul className="collection-gallery">
              {featured.map((category) => (
                <li key={category.id}>
                  <Link href={`/c/${category.handle}`} className="collection-cover">
                    <Image src={`/editorial-${category.handle}.webp`} alt="" fill sizes="(max-width: 639px) 86vw, (max-width: 1279px) 33vw, 420px" className="object-cover" />
                    <span className="collection-caption">{category.name}<span aria-hidden="true">↗</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {otherCategories.length > 0 && (
            <ul className="collection-links">
              {otherCategories.map((category) => (
                <li key={category.id}><Link href={`/c/${category.handle}`}>{category.name}</Link></li>
              ))}
            </ul>
          )}
        </section>
      )}

      <ProductRow title="Novedades" href="/tienda?orden=novedades" products={latest.hits} />
      <ProductRow title="Ofertas imperdibles" href="/ofertas" products={offers.hits} />
      <ul className="mt-12 grid divide-y divide-line rounded-xl border border-line bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <li className="px-5 py-3 sm:py-4 sm:text-center">
          <p className="text-sm font-bold text-brand-dark">Envíos a todo Paraguay</p>
          <p className="mt-0.5 text-xs text-muted">Delivery y encomiendas</p>
        </li>
        <li className="px-5 py-3 sm:py-4 sm:text-center">
          <p className="text-sm font-bold text-brand-dark">Retiro sin costo</p>
          <p className="mt-0.5 text-xs text-muted">Retirá tu pedido en tienda</p>
        </li>
        <li className="px-5 py-3 sm:py-4 sm:text-center">
          <p className="text-sm font-bold text-brand-dark">Formas de pago</p>
          <p className="mt-0.5 text-xs text-muted">Transferencia o contra entrega</p>
        </li>
      </ul>
    </div>
  )
}
