import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import type { HttpTypes } from "@medusajs/types"
import { PAYMENT_METHODS } from "@/lib/cart"
import { formatGuarani, whatsappLink } from "@/lib/format"
import { sdk } from "@/lib/medusa"

export const metadata: Metadata = {
  title: "Pedido confirmado",
  robots: { index: false, follow: false },
}

/** Datos bancarios para transferencias (variables de entorno del servidor). */
function bankInfo() {
  const rows: [string, string | undefined][] = [
    ["Banco", process.env.BANCO_NOMBRE],
    ["Titular", process.env.BANCO_TITULAR],
    ["Cuenta", process.env.BANCO_CUENTA],
    ["CI / RUC", process.env.BANCO_DOCUMENTO],
    ["Alias", process.env.BANCO_ALIAS],
  ]
  return rows.filter((r): r is [string, string] => Boolean(r[1]))
}

async function retrieveOrder(id: string): Promise<HttpTypes.StoreOrder | null> {
  try {
    const { order } = await sdk.store.order.retrieve(id, {
      fields: "id,display_id,email,total,subtotal,item_subtotal,discount_total,shipping_total,currency_code,created_at,*items,*shipping_address,*shipping_methods",
    })
    return order
  } catch {
    return null
  }
}

/** La Store API no expone metadata: el método de pago sale de una ruta propia del backend. */
async function retrievePaymentMethod(id: string): Promise<string | null> {
  try {
    const { pedido } = await sdk.client.fetch<{ pedido: { payment_method: string | null } }>(
      `/store/pedidos/${encodeURIComponent(id)}`
    )
    return pedido.payment_method
  } catch {
    return null
  }
}

async function OrderDetail({ params }: Pick<PageProps<"/pedido/[id]">, "params">) {
  const { id } = await params
  const [order, paymentMethod] = await Promise.all([retrieveOrder(id), retrievePaymentMethod(id)])
  if (!order) notFound()

  const m = { payment_method: paymentMethod }
  const method = PAYMENT_METHODS.find((p) => p.id === m.payment_method)
  const number = `#${order.display_id}`
  const a = order.shipping_address
  const shippingName = order.shipping_methods?.[0]?.name ?? "Entrega"
  const isPickup = /retiro/i.test(shippingName)
  const bank = bankInfo()
  const wa = whatsappLink(
    m.payment_method === "transferencia"
      ? `¡Hola Mandi'o! Hice el pedido ${number} por ${formatGuarani(order.total)}. Te envío el comprobante de la transferencia.`
      : `¡Hola Mandi'o! Hice el pedido ${number} por ${formatGuarani(order.total)}.`
  )

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-green-100 text-4xl text-green-700" aria-hidden>✓</div>
        <h1 className="page-title mt-5">¡Gracias por tu compra!</h1>
        <p className="mt-2 text-lg text-ink">Tu pedido es el <strong>{number}</strong></p>
        {order.email && <p className="text-sm text-muted">Guardá este número. Te contactamos al celular que dejaste.</p>}
      </div>

      {/* Cómo pagar */}
      <section className="mt-8 rounded-2xl border-2 border-accent bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-bold text-brand-dark">{method?.label ?? "Pago"}</h2>
        {m.payment_method === "transferencia" && (
          <>
            <p className="mt-1 text-sm text-ink">
              Transferí <strong>{formatGuarani(order.total)}</strong> y envianos el comprobante por WhatsApp con tu número de pedido.
            </p>
            {bank.length > 0 ? (
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-xl bg-cream p-4 text-sm">
                {bank.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted">Te enviamos los datos de la cuenta por WhatsApp.</p>
            )}
          </>
        )}
        {m.payment_method === "contra_entrega" && (
          <p className="mt-1 text-sm text-ink">
            Pagás <strong>{formatGuarani(order.total)}</strong> {isPickup ? "al retirar" : "al recibir"} tu pedido, en efectivo o con POS.
          </p>
        )}
        {m.payment_method === "whatsapp" && (
          <p className="mt-1 text-sm text-ink">Te escribimos por WhatsApp para coordinar el pago y la entrega.</p>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex h-12 items-center justify-center rounded-full bg-[#25D366] font-bold text-white hover:brightness-95"
          >
            {m.payment_method === "transferencia" ? "Enviar comprobante por WhatsApp" : "Escribirnos por WhatsApp"}
          </a>
        )}
      </section>

      {/* Detalle */}
      <section className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-bold text-brand-dark">Detalle del pedido</h2>
        <ul className="mt-3 divide-y divide-line">
          {(order.items ?? []).map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-2 text-sm">
              <span>
                {i.quantity} × {i.product_title ?? i.title}
                {i.variant_title && !/^(único|unico|default)/i.test(i.variant_title) && <span className="text-muted"> ({i.variant_title})</span>}
              </span>
              <span className="font-semibold">{formatGuarani(i.total ?? i.unit_price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          {(order.discount_total ?? 0) > 0 && (
            <div className="flex justify-between text-green-700"><dt>Descuento</dt><dd>− {formatGuarani(order.discount_total)}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-muted">{shippingName}</dt><dd>{order.shipping_total ? formatGuarani(order.shipping_total) : "Gratis"}</dd></div>
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd className="text-brand">{formatGuarani(order.total)}</dd></div>
        </dl>
        {a && !isPickup && (
          <p className="mt-4 text-sm text-muted">
            Enviamos a: {[a.address_1, a.address_2, a.city, a.province].filter(Boolean).join(", ")}
          </p>
        )}
      </section>

      <div className="mt-8 text-center">
        <Link href="/tienda" className="inline-flex h-12 items-center rounded-full border border-line bg-surface px-6 font-bold text-brand-dark hover:bg-rosewash">
          Seguir comprando
        </Link>
      </div>
    </div>
  )
}

export default function PedidoPage(props: PageProps<"/pedido/[id]">) {
  return (
    <div className="store-container py-10">
      <Suspense fallback={<div className="mx-auto h-96 max-w-2xl animate-pulse rounded-2xl bg-line/50" aria-hidden />}>
        <OrderDetail params={props.params} />
      </Suspense>
    </div>
  )
}
