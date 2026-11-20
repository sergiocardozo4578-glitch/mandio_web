import Image from "next/image"
import Link from "next/link"
import type { HttpTypes } from "@medusajs/types"
import { formatGuarani, getProductPrice } from "@/lib/format"

export function ProductCard({ product }: { product: HttpTypes.StoreProduct }) {
  const price = getProductPrice(product)
  const hasVariants = (product.variants?.length ?? 0) > 1

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:shadow-md">
      <Link href={`/p/${product.handle}`} className="relative block aspect-square bg-cream">
        {product.thumbnail && (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        )}
        {price && price.discountPercent > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-ink">
            -{price.discountPercent}%
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/p/${product.handle}`} className="line-clamp-2 text-sm font-semibold text-ink hover:text-brand">
          {product.title}
        </Link>

        {price && (
          <p className="flex items-baseline gap-2">
            {price.hasRange && <span className="text-xs text-muted">desde</span>}
            <span className="text-lg font-bold text-brand">{formatGuarani(price.current)}</span>
            {price.discountPercent > 0 && (
              <span className="text-sm text-muted line-through">{formatGuarani(price.original)}</span>
            )}
          </p>
        )}

        <Link
          href={`/p/${product.handle}`}
          className="mt-auto rounded-full bg-brand px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          {hasVariants ? "Seleccionar opciones" : "Ver producto"}
        </Link>
      </div>
    </article>
  )
}
