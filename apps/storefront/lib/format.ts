const pyg = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 })

/** 180000 → "₲ 180.000" */
export function formatGuarani(amount: number | null | undefined): string {
  if (amount == null) return ""
  return `₲ ${pyg.format(Math.round(amount))}`
}

export function discountPercent(current: number, original: number | null | undefined) {
  if (!original || original <= current) return 0
  return Math.round(((original - current) / original) * 100)
}

/** Arma un link de WhatsApp con mensaje prellenado. */
export function whatsappLink(message: string) {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP
  if (!phone) return null
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
