import type { HttpTypes } from "@medusajs/types"
import { formatGuarani } from "@/lib/format"

/** Resumen de importes. Los precios ya incluyen IVA. */
export function CartTotals({ cart, showShipping = true }: { cart: HttpTypes.StoreCart; showShipping?: boolean }) {
  const itemSubtotal = (cart as { item_subtotal?: number }).item_subtotal ?? cart.subtotal ?? 0
  const discount = cart.discount_total ?? 0
  const shipping = cart.shipping_total ?? 0
  const hasShipping = (cart.shipping_methods?.length ?? 0) > 0

  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted">Productos</dt>
        <dd>{formatGuarani(itemSubtotal)}</dd>
      </div>
      {discount > 0 && (
        <div className="flex justify-between font-semibold text-green-700">
          <dt>Descuento</dt>
          <dd>− {formatGuarani(discount)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-muted">Envío</dt>
        <dd>{showShipping && hasShipping ? (shipping ? formatGuarani(shipping) : "Gratis") : "Se calcula al finalizar"}</dd>
      </div>
      <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
        <dt>Total</dt>
        <dd className="text-brand">{formatGuarani(cart.total ?? 0)}</dd>
      </div>
      <p className="text-xs text-muted">Precios con IVA incluido.</p>
    </dl>
  )
}
