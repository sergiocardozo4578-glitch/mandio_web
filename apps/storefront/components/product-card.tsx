import Image from "next/image"
import Link from "next/link"
import type { SearchProduct } from "@/lib/search"
import { formatGuarani } from "@/lib/format"

export function ProductCard({ product }: { product: SearchProduct }) {
  const href = `/p/${product.handle}`

  const hasPhoto = product.thumbnail && !/^https?:\/\/placehold\.co\//i.test(product.thumbnail)

  return (
    <article className="product-tile group flex min-w-0 flex-col overflow-hidden rounded-sm border border-line bg-surface transition-colors hover:border-accent-dark/45">
      <Link href={href} aria-label={product.title} className="relative block aspect-square overflow-hidden bg-rosewash/50 focus-visible:-outline-offset-4">
        {hasPhoto && product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, (max-width: 1279px) 25vw, 304px"
            className={`object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105 ${product.in_stock ? "" : "opacity-60 grayscale"}`}
          />
        ) : (
          <div className="product-fallback" aria-hidden="true"><span>M</span></div>
        )}
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {product.discount_percent > 0 && (
            <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-brand-dark">
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
          <p className="truncate text-[0.65rem] font-bold uppercase tracking-[0.12em] text-accent-dark">{product.category_names[0]}</p>
        )}
        <Link href={href} className="line-clamp-2 font-display text-base leading-tight text-brand-dark hover:underline sm:text-lg">
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
          className="mt-2 grid min-h-10 place-items-center rounded-sm border border-accent/80 bg-cream px-2 py-2 text-center text-xs font-bold text-brand transition-colors hover:border-brand/55 hover:bg-rosewash sm:text-sm"
        >
          {product.variant_count > 1 ? "Seleccionar opciones" : "Ver producto"}
        </Link>
      </div>
    </article>
  )
}
