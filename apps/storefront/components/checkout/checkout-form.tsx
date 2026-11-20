"use client"

import Image from "next/image"
import Link from "next/link"
import { useActionState, useState } from "react"
import { placeOrder, type CheckoutState } from "@/app/actions/cart"
import { formatGuarani } from "@/lib/format"

export type ShippingChoice = {
  id: string
  name: string
  description: string | null
  amount: number
  isPickup: boolean
}

export type CheckoutDefaults = Record<
  | "email"
  | "first_name"
  | "last_name"
  | "phone"
  | "document_type"
  | "document_number"
  | "business_name"
  | "province"
  | "city"
  | "neighborhood"
  | "address_1"
  | "reference"
  | "shipping_option_id"
  | "payment_method",
  string
>

type Props = {
  defaults: CheckoutDefaults
  shipping: ShippingChoice[]
  departamentos: string[]
  paymentMethods: { id: string; label: string; help: string }[]
  summary: {
    items: { id: string; title: string; variant: string | null; quantity: number; total: number; thumbnail: string | null }[]
    itemSubtotal: number
    discount: number
    totalWithoutShipping: number
  }
}

const input =
  "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base outline-none focus:border-brand aria-[invalid=true]:border-red-600"

function Field({
  label,
  name,
  error,
  className = "",
  children,
}: {
  label: string
  name: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-sm font-bold text-ink">{label}</label>
      {children}
      {error && <p id={`${name}-error`} className="mt-1 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  )
}

export function CheckoutForm({ defaults, shipping, departamentos, paymentMethods, summary }: Props) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, {})
  const val = (k: keyof CheckoutDefaults) => state.values?.[k] ?? defaults[k]
  const err = (k: string) => state.fieldErrors?.[k]
  const aria = (k: string) => ({ "aria-invalid": Boolean(err(k)), "aria-describedby": err(k) ? `${k}-error` : undefined })

  const [docType, setDocType] = useState(val("document_type") || "ci")
  const [shippingId, setShippingId] = useState(val("shipping_option_id") || (shipping.length === 1 ? shipping[0].id : ""))
  const [payment, setPayment] = useState(val("payment_method"))
  const selected = shipping.find((s) => s.id === shippingId)
  const total = summary.totalWithoutShipping + (selected?.amount ?? 0)

  return (
    <form action={action} noValidate className="mt-6 grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
      <div className="space-y-8">
        {/* 1. Datos */}
        <fieldset className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <legend className="px-1 text-lg font-bold text-brand-dark">1. Tus datos</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" name="first_name" error={err("first_name")}>
              <input id="first_name" name="first_name" autoComplete="given-name" defaultValue={val("first_name")} className={input} {...aria("first_name")} />
            </Field>
            <Field label="Apellido" name="last_name" error={err("last_name")}>
              <input id="last_name" name="last_name" autoComplete="family-name" defaultValue={val("last_name")} className={input} {...aria("last_name")} />
            </Field>
            <Field label="Celular (WhatsApp)" name="phone" error={err("phone")}>
              <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0981 123 456" defaultValue={val("phone")} className={input} {...aria("phone")} />
            </Field>
            <Field label="Email" name="email" error={err("email")}>
              <input id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" defaultValue={val("email")} className={input} {...aria("email")} />
            </Field>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-bold text-ink">Documento</p>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-rosewash/60 p-1 sm:max-w-sm">
              {[
                { id: "ci", label: "Cédula (sin factura)" },
                { id: "ruc", label: "RUC (con factura)" },
              ].map((d) => (
                <label key={d.id} className={`cursor-pointer rounded-lg px-3 py-2 text-center text-sm font-bold ${docType === d.id ? "bg-surface text-brand-dark shadow-sm" : "text-muted"}`}>
                  <input type="radio" name="document_type" value={d.id} checked={docType === d.id} onChange={() => setDocType(d.id)} className="sr-only" />
                  {d.label}
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={docType === "ruc" ? "RUC" : "Número de cédula"} name="document_number" error={err("document_number")}>
                <input id="document_number" name="document_number" inputMode="numeric" placeholder={docType === "ruc" ? "1234567-8" : "1234567"} defaultValue={val("document_number")} className={input} {...aria("document_number")} />
              </Field>
              {docType === "ruc" && (
                <Field label="Razón social" name="business_name" error={err("business_name")}>
                  <input id="business_name" name="business_name" autoComplete="organization" defaultValue={val("business_name")} className={input} {...aria("business_name")} />
                </Field>
              )}
            </div>
          </div>
        </fieldset>

        {/* 2. Entrega */}
        <fieldset className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <legend className="px-1 text-lg font-bold text-brand-dark">2. Entrega</legend>
          {shipping.length === 0 ? (
            <p className="text-sm font-semibold text-red-700">No hay formas de entrega disponibles. Escribinos por WhatsApp.</p>
          ) : (
            <div className="space-y-3">
              {shipping.map((s) => (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 ${shippingId === s.id ? "border-brand bg-rosewash/40" : "border-line"}`}
                >
                  <input type="radio" name="shipping_option_id" value={s.id} checked={shippingId === s.id} onChange={() => setShippingId(s.id)} className="h-5 w-5 accent-brand" />
                  <span className="flex-1">
                    <span className="block font-bold text-ink">{s.name}</span>
                    {s.description && <span className="block text-sm text-muted">{s.description}</span>}
                  </span>
                  <span className="font-bold text-brand">{s.amount ? formatGuarani(s.amount) : "Gratis"}</span>
                </label>
              ))}
              {err("shipping_option_id") && <p className="text-sm font-semibold text-red-700">{err("shipping_option_id")}</p>}
            </div>
          )}

          {selected && !selected.isPickup && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Departamento" name="province" error={err("province")}>
                <select id="province" name="province" defaultValue={val("province")} className={input} {...aria("province")}>
                  <option value="">Elegí…</option>
                  {departamentos.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="Ciudad" name="city" error={err("city")}>
                <input id="city" name="city" autoComplete="address-level2" placeholder="Ej: San Lorenzo" defaultValue={val("city")} className={input} {...aria("city")} />
              </Field>
              <Field label="Barrio" name="neighborhood">
                <input id="neighborhood" name="neighborhood" defaultValue={val("neighborhood")} className={input} />
              </Field>
              <Field label="Dirección (calle y número)" name="address_1" error={err("address_1")}>
                <input id="address_1" name="address_1" autoComplete="address-line1" defaultValue={val("address_1")} className={input} {...aria("address_1")} />
              </Field>
              <Field label="Referencia (opcional)" name="reference" className="sm:col-span-2">
                <input id="reference" name="reference" placeholder="Ej: casa con portón negro, frente a la plaza" defaultValue={val("reference")} className={input} />
              </Field>
            </div>
          )}
          {selected?.isPickup && (
            <p className="mt-4 rounded-xl bg-cream px-4 py-3 text-sm text-ink">
              Te avisamos por WhatsApp cuando tu pedido esté listo para retirar.
            </p>
          )}
        </fieldset>

        {/* 3. Pago */}
        <fieldset className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <legend className="px-1 text-lg font-bold text-brand-dark">3. Pago</legend>
          <div className="space-y-3">
            {paymentMethods.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 ${payment === p.id ? "border-brand bg-rosewash/40" : "border-line"}`}
              >
                <input type="radio" name="payment_method" value={p.id} checked={payment === p.id} onChange={() => setPayment(p.id)} className="mt-0.5 h-5 w-5 accent-brand" />
                <span>
                  <span className="block font-bold text-ink">{p.label}</span>
                  <span className="block text-sm text-muted">{p.help}</span>
                </span>
              </label>
            ))}
            <p className="flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
              💳 Pago con tarjeta (Bancard): próximamente.
            </p>
            {err("payment_method") && <p className="text-sm font-semibold text-red-700">{err("payment_method")}</p>}
          </div>
          <div className="mt-5">
            <label htmlFor="notes" className="mb-1.5 block text-sm font-bold text-ink">Notas para el pedido (opcional)</label>
            <textarea id="notes" name="notes" rows={2} defaultValue={state.values?.notes ?? ""} className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base outline-none focus:border-brand" />
          </div>
        </fieldset>
      </div>

      {/* Resumen */}
      <aside className="space-y-4 rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-36">
        <h2 className="text-lg font-bold text-brand-dark">Tu pedido</h2>
        <ul className="divide-y divide-line">
          {summary.items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 py-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-rosewash/50">
                {i.thumbnail && <Image src={i.thumbnail} alt="" fill sizes="56px" className="object-cover" />}
                <span className="absolute -right-0 -top-0 grid h-5 min-w-5 place-items-center rounded-bl-lg bg-ink px-1 text-xs font-bold text-white">{i.quantity}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-semibold">{i.title}</span>
                {i.variant && !/^(único|unico|default)/i.test(i.variant) && <span className="text-xs text-muted">{i.variant}</span>}
              </span>
              <span className="text-sm font-bold">{formatGuarani(i.total)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Productos</dt><dd>{formatGuarani(summary.itemSubtotal)}</dd></div>
          {summary.discount > 0 && (
            <div className="flex justify-between font-semibold text-green-700"><dt>Descuento</dt><dd>− {formatGuarani(summary.discount)}</dd></div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">Envío</dt>
            <dd>{selected ? (selected.amount ? formatGuarani(selected.amount) : "Gratis") : "—"}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
            <dt>Total</dt><dd className="text-brand">{formatGuarani(total)}</dd>
          </div>
          <p className="text-xs text-muted">Precios con IVA incluido.</p>
        </dl>

        {state.error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending || shipping.length === 0}
          className="h-14 w-full rounded-full bg-brand text-base font-bold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Confirmando pedido…" : "Confirmar pedido"}
        </button>
        <Link href="/carrito" className="block text-center text-sm font-semibold text-brand hover:underline">
          Volver al carrito
        </Link>
      </aside>
    </form>
  )
}
