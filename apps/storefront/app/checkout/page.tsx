import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { CheckoutForm, type CheckoutDefaults, type ShippingChoice } from "@/components/checkout/checkout-form"
import { DEPARTAMENTOS, listShippingOptions, PAYMENT_METHODS, retrieveCart } from "@/lib/cart"

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false, follow: false },
}

async function CheckoutContent() {
  const cart = await retrieveCart()
  if (!cart || !cart.items?.length) redirect("/carrito")

  const options = await listShippingOptions(cart.id)
  const shipping: ShippingChoice[] = options.map((o) => ({
    id: o.id,
    name: o.name,
    description: (o as { type?: { description?: string } }).type?.description ?? null,
    amount: (o as { amount?: number; calculated_price?: { calculated_amount?: number } }).calculated_price
      ?.calculated_amount ?? (o as { amount?: number }).amount ?? 0,
    isPickup: /retiro/i.test(o.name),
  }))

  const a = cart.shipping_address
  const m = (cart.metadata ?? {}) as Record<string, unknown>
  const defaults: CheckoutDefaults = {
    email: cart.email ?? "",
    first_name: a?.first_name ?? "",
    last_name: a?.last_name ?? "",
    phone: a?.phone ?? "",
    document_type: m.document_type === "ruc" ? "ruc" : "ci",
    document_number: typeof m.document_number === "string" ? m.document_number : "",
    business_name: typeof m.business_name === "string" ? m.business_name : "",
    province: a?.province && a.address_1 !== "Retiro en tienda" ? a.province : "",
    city: a?.city && a.address_1 !== "Retiro en tienda" ? a.city : "",
    neighborhood: a?.address_2 ?? "",
    address_1: a?.address_1 && a.address_1 !== "Retiro en tienda" ? a.address_1 : "",
    reference: typeof m.delivery_reference === "string" ? m.delivery_reference : "",
    shipping_option_id: cart.shipping_methods?.[0]?.shipping_option_id ?? "",
    payment_method: typeof m.payment_method === "string" ? m.payment_method : "",
  }

  const items = (cart.items ?? []).map((i) => ({
    id: i.id,
    title: i.product_title ?? i.title,
    variant: i.variant_title ?? null,
    quantity: i.quantity,
    total: i.total ?? i.unit_price * i.quantity,
    thumbnail: i.thumbnail ?? null,
  }))

  const currentShipping = cart.shipping_total ?? 0
  return (
    <CheckoutForm
      defaults={defaults}
      shipping={shipping}
      departamentos={[...DEPARTAMENTOS]}
      paymentMethods={PAYMENT_METHODS.map((p) => ({ ...p }))}
      summary={{
        items,
        itemSubtotal: (cart as { item_subtotal?: number }).item_subtotal ?? cart.subtotal ?? 0,
        discount: cart.discount_total ?? 0,
        // total sin envío: el envío se suma en el cliente según la opción elegida
        totalWithoutShipping: (cart.total ?? 0) - currentShipping,
      }}
    />
  )
}

export default function CheckoutPage() {
  return (
    <div className="store-container pb-16">
      <Breadcrumbs items={[{ name: "Carrito", href: "/carrito" }, { name: "Finalizar compra" }]} />
      <h1 className="page-title">Finalizar compra</h1>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-line/50" aria-hidden />}>
        <CheckoutContent />
      </Suspense>
    </div>
  )
}
