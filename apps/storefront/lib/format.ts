import type { HttpTypes } from "@medusajs/types"

const pyg = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 })

/** 180000 → "₲ 180.000" */
export function formatGuarani(amount: number | null | undefined): string {
  if (amount == null) return ""
  return `₲ ${pyg.format(Math.round(amount))}`
}

export type ProductPrice = {
  current: number
  original: number
  discountPercent: number
  hasRange: boolean
}

/** Precio más bajo entre las variantes, con el original para el badge de descuento. */
export function getProductPrice(product: HttpTypes.StoreProduct): ProductPrice | null {
  const prices = (product.variants ?? [])
    .map((v) => v.calculated_price)
    .filter((p): p is NonNullable<typeof p> => p?.calculated_amount != null)

  if (!prices.length) return null

  const cheapest = prices.reduce((min, p) =>
    (p.calculated_amount ?? 0) < (min.calculated_amount ?? 0) ? p : min
  )
  const current = cheapest.calculated_amount ?? 0
  const original = cheapest.original_amount ?? current
  const discountPercent =
    original > current ? Math.round(((original - current) / original) * 100) : 0

  return {
    current,
    original,
    discountPercent,
    hasRange: new Set(prices.map((p) => p.calculated_amount)).size > 1,
  }
}
