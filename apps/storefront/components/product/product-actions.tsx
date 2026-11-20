"use client"

import { useMemo, useState } from "react"
import { discountPercent, formatGuarani } from "@/lib/format"

export type ActionVariant = {
  id: string
  sku: string | null
  options: Record<string, string>
  price: number | null
  original: number | null
  /** null = sin control de stock (siempre disponible) */
  stock: number | null
}

type Props = {
  title: string
  productUrl: string
  options: { title: string; values: string[] }[]
  variants: ActionVariant[]
  whatsapp: string | null
}

export function ProductActions({ title, productUrl, options, variants, whatsapp }: Props) {
  // Si hay una sola variante queda seleccionada desde el inicio.
  const [selected, setSelected] = useState<Record<string, string>>(
    variants.length === 1 ? variants[0].options : {}
  )
  const [qty, setQty] = useState(1)

  const variant = useMemo(
    () =>
      variants.find((v) => options.every((o) => v.options[o.title] === selected[o.title])) ?? null,
    [variants, options, selected]
  )

  const prices = variants.map((v) => v.price).filter((p): p is number => p != null)
  const minPrice = prices.length ? Math.min(...prices) : null
  const shownPrice = variant?.price ?? minPrice
  const shownOriginal = variant
    ? variant.original
    : variants.find((v) => v.price === minPrice)?.original ?? null
  const discount = shownPrice != null ? discountPercent(shownPrice, shownOriginal) : 0

  const inStock = (v: ActionVariant) => v.stock == null || v.stock > 0
  const maxQty = variant?.stock ?? 99
  const allSelected = options.every((o) => selected[o.title])

  /** ¿Existe una variante con stock para este valor, dado lo ya elegido en las otras opciones? */
  const isValueAvailable = (optionTitle: string, value: string) =>
    variants.some(
      (v) =>
        v.options[optionTitle] === value &&
        inStock(v) &&
        options.every((o) => o.title === optionTitle || !selected[o.title] || v.options[o.title] === selected[o.title])
    )

  const waText = [
    `¡Hola Mandi'o! Quiero consultar por: ${title}`,
    variant && options.length && variants.length > 1
      ? `(${options.map((o) => `${o.title}: ${variant.options[o.title]}`).join(", ")})`
      : "",
    `Cantidad: ${qty}`,
    productUrl,
  ]
    .filter(Boolean)
    .join("\n")

  return (
    <div className="flex flex-col gap-5">
      <div>
        {shownPrice != null && (
          <p className="flex flex-wrap items-baseline gap-3">
            {!variant && variants.length > 1 && new Set(prices).size > 1 && (
              <span className="text-sm text-muted">desde</span>
            )}
            <span className="text-3xl font-extrabold text-brand">{formatGuarani(shownPrice)}</span>
            {discount > 0 && (
              <>
                <span className="text-lg text-muted line-through">{formatGuarani(shownOriginal)}</span>
                <span className="rounded-full bg-accent px-2.5 py-1 text-sm font-bold text-ink">-{discount}%</span>
              </>
            )}
          </p>
        )}
        <p className="mt-1 text-xs text-muted">Precio con IVA incluido.</p>
      </div>

      {variants.length > 1 &&
        options.map((option) => (
          <fieldset key={option.title}>
            <legend className="mb-2 text-sm font-semibold">
              {option.title}
              {selected[option.title] && <span className="ml-1 font-normal text-muted">: {selected[option.title]}</span>}
            </legend>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const available = isValueAvailable(option.title, value)
                const active = selected[option.title] === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setSelected((s) => ({ ...s, [option.title]: value }))
                      setQty(1)
                    }}
                    className={`min-w-12 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "border-brand bg-brand text-white"
                        : available
                          ? "border-line bg-surface hover:border-brand"
                          : "border-line bg-surface text-muted line-through opacity-60"
                    }`}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}

      <div className="text-sm">
        {variant ? (
          inStock(variant) ? (
            <p className="font-semibold text-brand">
              {variant.stock == null ? "Disponible" : `${variant.stock} disponibles`}
            </p>
          ) : (
            <p className="font-semibold text-red-700">Agotado</p>
          )
        ) : (
          <p className="text-muted">Elegí una opción para ver la disponibilidad.</p>
        )}
        {variant?.sku && <p className="mt-1 text-xs text-muted">SKU: {variant.sku}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-full border border-line bg-surface">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="h-11 w-11 text-lg font-bold"
            aria-label="Restar uno"
          >
            −
          </button>
          <span className="w-8 text-center font-semibold" aria-live="polite">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            className="h-11 w-11 text-lg font-bold"
            aria-label="Sumar uno"
          >
            +
          </button>
        </div>

        <button
          type="button"
          disabled
          title="El carrito se habilita en la próxima fase"
          className="h-11 flex-1 rounded-full bg-brand px-6 font-bold text-white opacity-50"
        >
          {!allSelected ? "Elegí una opción" : variant && !inStock(variant) ? "Agotado" : "Añadir al carrito (pronto)"}
        </button>
      </div>

      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(waText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 items-center justify-center gap-2 rounded-full border-2 border-[#25D366] font-bold text-[#128C7E] transition hover:bg-[#25D366] hover:text-white"
        >
          Consultar por WhatsApp
        </a>
      )}
    </div>
  )
}
