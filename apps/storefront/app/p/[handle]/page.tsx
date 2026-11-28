import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import type { HttpTypes } from "@medusajs/types"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ProductCard } from "@/components/product-card"
import { ProductGallery } from "@/components/product/gallery"
import { ProductActions, type ActionVariant } from "@/components/product/product-actions"
import { getCategoryByHandle, getProductByHandle } from "@/lib/medusa"
import { searchProducts } from "@/lib/search"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:8000"

export async function generateStaticParams() {
  // Los más nuevos se prerenderizan en el build; el resto se genera en la primera visita.
  const { hits } = await searchProducts({ sort: "novedades", perPage: 24 })
  return hits.length ? hits.map((p) => ({ handle: p.handle })) : [{ handle: "producto" }]
}

export async function generateMetadata(props: PageProps<"/p/[handle]">): Promise<Metadata> {
  const { handle } = await props.params
  const product = await getProductByHandle(handle)
  if (!product) return { title: "Producto no encontrado" }
  const description = product.description?.slice(0, 160) || `Comprá ${product.title} en Mandi'o.`
  return {
    title: product.title,
    description,
    alternates: { canonical: `/p/${product.handle}` },
    openGraph: {
      title: product.title,
      description,
      type: "website",
      images: product.thumbnail ? [{ url: product.thumbnail }] : undefined,
    },
  }
}

function toActionVariants(product: HttpTypes.StoreProduct): ActionVariant[] {
  return (product.variants ?? []).map((v) => {
    const options: Record<string, string> = {}
    for (const ov of v.options ?? []) {
      const title = product.options?.find((o) => o.id === ov.option_id)?.title
      if (title && ov.value) options[title] = ov.value
    }
    const managed = v.manage_inventory && !v.allow_backorder
    return {
      id: v.id,
      sku: v.sku ?? null,
      options,
      price: v.calculated_price?.calculated_amount ?? null,
      original: v.calculated_price?.original_amount ?? null,
      stock: managed ? Math.max(0, v.inventory_quantity ?? 0) : null,
    }
  })
}

/** Categoría más específica (una subcategoría si la hay). */
function mainCategory(product: HttpTypes.StoreProduct) {
  const cats = product.categories ?? []
  return cats.find((c) => c.parent_category_id) ?? cats[0] ?? null
}

async function Related({ productId, category }: { productId: string; category: string }) {
  const { hits } = await searchProducts({ category, excludeId: productId, inStock: true, perPage: 4 })
  if (!hits.length) return null
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-extrabold">También te puede gustar</h2>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {hits.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}

async function ProductDetail({ params }: Pick<PageProps<"/p/[handle]">, "params">) {
  const { handle } = await params
  const product = await getProductByHandle(handle)
  if (!product) notFound()

  const variants = toActionVariants(product)
  const options = (product.options ?? [])
    .map((o) => ({ title: o.title, values: (o.values ?? []).map((v) => v.value) }))
    .filter((o) => o.values.length)
  const images = (product.images?.length ? product.images.map((i) => i.url) : [product.thumbnail]).filter(
    (u): u is string => Boolean(u)
  )
  const category = mainCategory(product)
  const categoryPath = category ? (await getCategoryByHandle(category.handle))?.path ?? [category] : []
  const crumbs = [
    ...categoryPath.map((c) => ({ name: c.name, href: `/c/${c.handle}` })),
    { name: product.title },
  ]

  const prices = variants.map((v) => v.price).filter((p): p is number => p != null)
  const url = `${SITE_URL}/p/${product.handle}`
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? undefined,
    image: images,
    sku: variants[0]?.sku ?? undefined,
    brand: { "@type": "Brand", name: "Mandi'o" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "PYG",
      lowPrice: prices.length ? Math.min(...prices) : undefined,
      highPrice: prices.length ? Math.max(...prices) : undefined,
      offerCount: variants.length,
      availability: variants.some((v) => v.stock == null || v.stock > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url,
    },
  }

  const details = [
    ...options.map((o) => ({ label: o.title, value: o.values.join(", ") })),
    ...(product.material ? [{ label: "Material", value: product.material }] : []),
    ...(product.weight ? [{ label: "Peso", value: `${product.weight} g` }] : []),
  ]

  return (
    <>
      <Breadcrumbs items={crumbs} />
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={images} title={product.title} />

        <div>
          <h1 className="page-title leading-tight">{product.title}</h1>
          <div className="mt-5">
            <ProductActions
              title={product.title}
              productUrl={url}
              options={options}
              variants={variants}
              whatsapp={process.env.NEXT_PUBLIC_WHATSAPP ?? null}
            />
          </div>

          <div className="mt-8 divide-y divide-line rounded-xl border border-line bg-surface">
            {product.description && (
              <details open className="group p-4">
                <summary className="cursor-pointer list-none font-semibold">Descripción</summary>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/90">{product.description}</p>
              </details>
            )}
            {details.length > 0 && (
              <details className="group p-4">
                <summary className="cursor-pointer list-none font-semibold">Información adicional</summary>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                  {details.map((d) => (
                    <div key={d.label} className="contents">
                      <dt className="text-muted">{d.label}</dt>
                      <dd>{d.value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
            <details className="group p-4">
              <summary className="cursor-pointer list-none font-semibold">Envíos y cambios</summary>
              <p className="mt-3 text-sm text-ink/90">
                Retiro sin costo, delivery en Asunción y Gran Asunción, y encomienda a todo el país.
                Cambios dentro de los 2 días de recibido el pedido, con el producto sin uso y en su empaque.
              </p>
            </details>
          </div>
        </div>
      </div>

      {category && (
        <Suspense fallback={null}>
          <Related productId={product.id} category={category.handle} />
        </Suspense>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  )
}

export default function ProductPage(props: PageProps<"/p/[handle]">) {
  return (
    <div className="store-container pb-8">
      <Suspense
        fallback={
          <div className="grid gap-8 py-12 lg:grid-cols-2" aria-hidden>
            <div className="aspect-square animate-pulse rounded-3xl bg-line/60" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 animate-pulse rounded bg-line/60" />
              <div className="h-10 w-1/3 animate-pulse rounded bg-line/60" />
            </div>
          </div>
        }
      >
        <ProductDetail params={props.params} />
      </Suspense>
    </div>
  )
}
