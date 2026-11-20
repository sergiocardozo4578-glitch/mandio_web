import Image from "next/image"
import Link from "next/link"
import type { SearchProduct } from "@/lib/search"
import { formatGuarani } from "@/lib/format"

export function ProductCard({ product }: { product: SearchProduct }) {
  const href = `/p/${product.handle}`

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:shadow-md">
      <Link href={href} className="relative block aspect-square bg-cream">
        {product.thumbnail && (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition duration-300 group-hover:scale-105 ${product.in_stock ? "" : "opacity-60 grayscale"}`}
          />
        )}
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {product.discount_percent > 0 && (
            <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-ink">
              -{product.discount_percent}%
            </span>
          )}
          {!product.in_stock && (
            <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-white">Agotado</span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        {product.category_names[0] && (
          <p className="truncate text-xs text-muted">{product.category_names[0]}</p>
        )}
        <Link href={href} className="line-clamp-2 text-sm font-semibold text-ink hover:text-brand">
          {product.title}
        </Link>

        {product.price != null && (
          <p className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
            <span className="text-lg font-bold text-brand">{formatGuarani(product.price)}</span>
            {product.on_sale && product.original_price && (
              <span className="text-sm text-muted line-through">
                {formatGuarani(product.original_price)}
              </span>
            )}
          </p>
        )}

        <Link
          href={href}
          className="mt-2 rounded-full border border-brand px-4 py-2 text-center text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
        >
          {product.variant_count > 1 ? "Seleccionar opciones" : "Ver producto"}
        </Link>
      </div>
    </article>
  )
}
