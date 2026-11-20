"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useTransition } from "react"
import { removeItem, updateItemQuantity } from "@/app/actions/cart"
import { formatGuarani } from "@/lib/format"

type Props = {
  id: string
  title: string
  variant: string | null
  handle: string | null
  thumbnail: string | null
  unitPrice: number
  quantity: number
  total: number
}

export function CartLine({ id, title, variant, handle, thumbnail, unitPrice, quantity, total }: Props) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const change = (q: number) =>
    start(async () => {
      setError(null)
      const r = await updateItemQuantity(id, q)
      if (!r.ok) setError(r.error ?? "No se pudo actualizar.")
    })

  const href = handle ? `/p/${handle}` : undefined
  const showVariant = variant && !/^(único|unico|default)/i.test(variant)

  return (
    <li className={`flex gap-3 py-4 sm:gap-4 ${pending ? "opacity-60" : ""}`}>
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-rosewash/50 sm:h-28 sm:w-28">
        {thumbnail && <Image src={thumbnail} alt={title} fill sizes="112px" className="object-cover" />}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {href ? (
              <Link href={href} className="line-clamp-2 font-semibold text-ink hover:text-brand">{title}</Link>
            ) : (
              <p className="line-clamp-2 font-semibold text-ink">{title}</p>
            )}
            {showVariant && <p className="text-sm text-muted">Talle / opción: {variant}</p>}
            <p className="text-sm text-muted">{formatGuarani(unitPrice)} c/u</p>
          </div>
          <p className="shrink-0 font-bold text-brand">{formatGuarani(total)}</p>
        </div>

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center rounded-full border border-line bg-surface">
            <button
              type="button"
              disabled={pending}
              onClick={() => change(quantity - 1)}
              className="h-10 w-10 text-lg font-bold"
              aria-label={quantity === 1 ? "Quitar del carrito" : "Restar uno"}
            >
              −
            </button>
            <span className="w-8 text-center font-semibold" aria-live="polite">{quantity}</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => change(quantity + 1)}
              className="h-10 w-10 text-lg font-bold"
              aria-label="Sumar uno"
            >
              +
            </button>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => start(async () => void (await removeItem(id)))}
            className="text-sm font-semibold text-muted underline-offset-2 hover:text-brand hover:underline"
          >
            Quitar
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
      </div>
    </li>
  )
}
