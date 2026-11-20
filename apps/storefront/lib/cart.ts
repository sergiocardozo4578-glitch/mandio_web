import "server-only"
import type { HttpTypes } from "@medusajs/types"
import { cookies } from "next/headers"
import { sdk } from "@/lib/medusa"

/**
 * Carrito: vive en Medusa; el navegador solo guarda su id en una cookie httpOnly.
 * Nada de esto se cachea: es por cliente y cambia todo el tiempo.
 */

export const CART_COOKIE = "mandio_cart"

const CART_FIELDS = [
  "id",
  "email",
  "region_id",
  "currency_code",
  "metadata",
  "subtotal",
  "item_subtotal",
  "discount_total",
  "shipping_total",
  "tax_total",
  "total",
  "*items",
  "items.product_handle",
  "*promotions",
  "*shipping_methods",
  "*shipping_address",
  "*billing_address",
  "*payment_collection",
  "*payment_collection.payment_sessions",
].join(",")

export async function getCartId() {
  return (await cookies()).get(CART_COOKIE)?.value ?? null
}

export async function setCartId(id: string) {
  ;(await cookies()).set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function clearCartId() {
  ;(await cookies()).delete(CART_COOKIE)
}

/** Carrito actual, o null si no hay / ya se completó / el backend no responde. */
export async function retrieveCart(id?: string | null): Promise<HttpTypes.StoreCart | null> {
  const cartId = id ?? (await getCartId())
  if (!cartId) return null
  try {
    const { cart } = await sdk.store.cart.retrieve(cartId, { fields: CART_FIELDS })
    // Un carrito ya convertido en pedido no se puede seguir usando
    if ((cart as { completed_at?: string | null }).completed_at) return null
    return cart
  } catch {
    return null
  }
}

export function cartItemCount(cart: HttpTypes.StoreCart | null) {
  return (cart?.items ?? []).reduce((n, i) => n + i.quantity, 0)
}

export async function listShippingOptions(cartId: string) {
  try {
    const { shipping_options } = await sdk.store.fulfillment.listCartOptions({ cart_id: cartId })
    return shipping_options
  } catch {
    return []
  }
}

/** Mensaje amigable a partir de un error de Medusa. */
export function friendlyError(error: unknown, fallback = "Algo salió mal. Probá de nuevo.") {
  const message = (error as { message?: string })?.message ?? ""
  if (/inventory|stock|quantity/i.test(message)) return "No hay stock suficiente para esa cantidad."
  if (/promotion|promo|code/i.test(message)) return "El cupón no es válido o ya venció."
  if (/shipping/i.test(message)) return "Elegí una forma de entrega válida."
  return fallback
}

// ---------- Datos de Paraguay para el checkout ----------

export const DEPARTAMENTOS = [
  "Asunción (Capital)",
  "Central",
  "Alto Paraná",
  "Itapúa",
  "Caaguazú",
  "Cordillera",
  "Paraguarí",
  "San Pedro",
  "Guairá",
  "Caazapá",
  "Misiones",
  "Ñeembucú",
  "Concepción",
  "Amambay",
  "Canindeyú",
  "Presidente Hayes",
  "Boquerón",
  "Alto Paraguay",
] as const

export const PAYMENT_METHODS = [
  {
    id: "transferencia",
    label: "Transferencia bancaria",
    help: "Te mostramos los datos de la cuenta al confirmar. Enviás el comprobante por WhatsApp.",
  },
  {
    id: "contra_entrega",
    label: "Pago contra entrega",
    help: "Pagás en efectivo o con POS al recibir o retirar el pedido.",
  },
  {
    id: "whatsapp",
    label: "Coordinar por WhatsApp",
    help: "Confirmamos el pedido y acordamos el pago por WhatsApp.",
  },
] as const

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"]
