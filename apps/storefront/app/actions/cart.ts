"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"
import {
  clearCartId,
  friendlyError,
  getCartId,
  PAYMENT_METHODS,
  retrieveCart,
  setCartId,
  type PaymentMethodId,
} from "@/lib/cart"
import { getRegion, sdk } from "@/lib/medusa"

export type ActionResult = { ok: boolean; error?: string }

/** Devuelve el carrito activo o crea uno nuevo en la región Paraguay. */
async function ensureCartId(): Promise<string> {
  const existing = await retrieveCart()
  if (existing) return existing.id
  const region = await getRegion()
  if (!region) throw new Error("La tienda no está disponible en este momento.")
  const { cart } = await sdk.store.cart.create({ region_id: region.id })
  await setCartId(cart.id)
  return cart.id
}

export async function addToCart(variantId: string, quantity: number): Promise<ActionResult> {
  if (!variantId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return { ok: false, error: "Cantidad no válida." }
  }
  try {
    const cartId = await ensureCartId()
    await sdk.store.cart.createLineItem(cartId, { variant_id: variantId, quantity })
    refresh()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: friendlyError(e, "No se pudo agregar al carrito.") }
  }
}

export async function updateItemQuantity(lineId: string, quantity: number): Promise<ActionResult> {
  const cartId = await getCartId()
  if (!cartId) return { ok: false, error: "Tu carrito expiró." }
  try {
    if (quantity < 1) await sdk.store.cart.deleteLineItem(cartId, lineId)
    else await sdk.store.cart.updateLineItem(cartId, lineId, { quantity: Math.min(99, quantity) })
    refresh()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: friendlyError(e, "No se pudo actualizar la cantidad.") }
  }
}

export async function removeItem(lineId: string): Promise<ActionResult> {
  return updateItemQuantity(lineId, 0)
}

export async function applyCoupon(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase()
  const cartId = await getCartId()
  if (!code) return { ok: false, error: "Escribí el código del cupón." }
  if (!cartId) return { ok: false, error: "Tu carrito expiró." }
  try {
    const { cart } = await sdk.store.cart.addPromotions(cartId, { promo_codes: [code] }, { fields: "promotions.code" })
    // Medusa ignora en silencio los códigos inválidos: se verifica que haya quedado aplicado.
    if (!cart.promotions?.some((p) => p.code?.toUpperCase() === code)) {
      return { ok: false, error: "El cupón no es válido o ya venció." }
    }
    refresh()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: friendlyError(e, "El cupón no es válido o ya venció.") }
  }
}

export async function removeCoupon(code: string): Promise<ActionResult> {
  const cartId = await getCartId()
  if (!cartId) return { ok: false }
  try {
    await sdk.store.cart.removePromotions(cartId, { promo_codes: [code] })
    refresh()
    return { ok: true }
  } catch {
    return { ok: false, error: "No se pudo quitar el cupón." }
  }
}

// ---------- Checkout ----------

export type CheckoutState = {
  error?: string
  fieldErrors?: Record<string, string>
  values?: Record<string, string>
}

const PAYMENT_PROVIDER = "pp_system_default" // pago manual de Medusa; Bancard se suma como otro provider

export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const v = Object.fromEntries(
    [...formData.entries()].map(([k, val]) => [k, typeof val === "string" ? val.trim() : ""])
  ) as Record<string, string>

  const cart = await retrieveCart()
  if (!cart || !cart.items?.length) return { error: "Tu carrito está vacío.", values: v }

  const options = await sdk.store.fulfillment
    .listCartOptions({ cart_id: cart.id })
    .then((r) => r.shipping_options)
    .catch(() => [])
  const option = options.find((o) => o.id === v.shipping_option_id)
  const isPickup = /retiro/i.test(option?.name ?? "")

  // Validación
  const fe: Record<string, string> = {}
  const phoneDigits = (v.phone ?? "").replace(/\D/g, "")
  if (!v.first_name) fe.first_name = "Poné tu nombre."
  if (!v.last_name) fe.last_name = "Poné tu apellido."
  if (!/^\S+@\S+\.\S+$/.test(v.email ?? "")) fe.email = "El email no es válido."
  if (phoneDigits.length < 9) fe.phone = "Poné un celular válido, por ejemplo 0981 123 456."
  if (!/^\d{5,9}(-\d)?$/.test((v.document_number ?? "").replace(/[.\s]/g, ""))) {
    fe.document_number = v.document_type === "ruc" ? "El RUC no es válido (ej: 1234567-8)." : "La cédula no es válida."
  }
  if (v.document_type === "ruc" && !v.business_name) fe.business_name = "Poné la razón social para la factura."
  if (!option) fe.shipping_option_id = "Elegí cómo querés recibir el pedido."
  if (option && !isPickup) {
    if (!v.province) fe.province = "Elegí el departamento."
    if (!v.city) fe.city = "Poné la ciudad."
    if (!v.address_1) fe.address_1 = "Poné la dirección."
  }
  if (!PAYMENT_METHODS.some((p) => p.id === v.payment_method)) fe.payment_method = "Elegí cómo vas a pagar."
  if (Object.keys(fe).length) return { error: "Revisá los datos marcados.", fieldErrors: fe, values: v }

  const address = {
    first_name: v.first_name,
    last_name: v.last_name,
    phone: phoneDigits,
    company: v.document_type === "ruc" ? v.business_name : undefined,
    address_1: isPickup ? "Retiro en tienda" : v.address_1,
    address_2: isPickup ? undefined : v.neighborhood || undefined,
    city: isPickup ? "Asunción" : v.city,
    province: isPickup ? "Asunción (Capital)" : v.province,
    country_code: "py",
  }

  try {
    await sdk.store.cart.update(cart.id, {
      email: v.email.toLowerCase(),
      shipping_address: address,
      billing_address: address,
      metadata: {
        document_type: v.document_type === "ruc" ? "ruc" : "ci",
        document_number: v.document_number.replace(/[.\s]/g, ""),
        business_name: v.document_type === "ruc" ? v.business_name : null,
        wants_invoice: v.document_type === "ruc",
        delivery_reference: isPickup ? null : v.reference || null,
        payment_method: v.payment_method as PaymentMethodId,
        notes: v.notes || null,
      },
    })
    await sdk.store.cart.addShippingMethod(cart.id, { option_id: option!.id })

    const { cart: fresh } = await sdk.store.cart.retrieve(cart.id, {
      fields: "id,*payment_collection,*payment_collection.payment_sessions,total,currency_code,region_id",
    })
    await sdk.store.payment.initiatePaymentSession(fresh, { provider_id: PAYMENT_PROVIDER })

    const result = await sdk.store.cart.complete(cart.id)
    if (result.type !== "order") {
      return { error: friendlyError(result.error, "No se pudo confirmar el pedido."), values: v }
    }
    await clearCartId()
    redirect(`/pedido/${result.order.id}`)
  } catch (e) {
    // redirect() lanza una excepción especial que hay que dejar pasar
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e
    return { error: friendlyError(e, "No se pudo confirmar el pedido. Probá de nuevo."), values: v }
  }
  return {}
}
