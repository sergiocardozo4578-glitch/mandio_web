import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { CartLine } from "@/components/cart/cart-line"
import { CartTotals } from "@/components/cart/cart-totals"
import { CouponForm } from "@/components/cart/coupon-form"
import { cartItemCount, retrieveCart } from "@/lib/cart"

export const metadata: Metadata = {
  title: "Carrito",
  robots: { index: false, follow: true },
}

async function CartContent() {
  const cart = await retrieveCart()
  const items = cart?.items ?? []

  if (!cart || !items.length) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-5xl" aria-hidden>🛍️</p>
        <h1 className="page-title mt-4">Tu carrito está vacío</h1>
        <p className="mt-2 text-muted">Agregá productos para empezar tu compra.</p>
        <Link href="/tienda" className="mt-8 inline-flex h-12 items-center rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-dark">
          Ir a la tienda
        </Link>
      </div>
    )
  }

  const count = cartItemCount(cart)
  const sorted = [...items].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))

  return (
    <>
      <h1 className="page-title">Carrito</h1>
      <p className="mt-1 text-muted">{count} {count === 1 ? "producto" : "productos"}</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface px-4 sm:px-6">
          {sorted.map((item) => (
            <CartLine
              key={item.id}
              id={item.id}
              title={item.product_title ?? item.title}
              variant={item.variant_title ?? null}
              handle={(item as { product_handle?: string }).product_handle ?? null}
              thumbnail={item.thumbnail ?? null}
              unitPrice={item.unit_price}
              quantity={item.quantity}
              total={item.total ?? item.unit_price * item.quantity}
            />
          ))}
        </ul>

        <aside className="space-y-5 rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-36">
          <CouponForm applied={(cart.promotions ?? []).map((p) => p.code).filter((c): c is string => Boolean(c))} />
          <CartTotals cart={cart} />
          <Link
            href="/checkout"
            className="grid h-14 place-items-center rounded-full bg-brand text-base font-bold text-white hover:bg-brand-dark"
          >
            Finalizar compra
          </Link>
          <Link href="/tienda" className="block text-center text-sm font-semibold text-brand hover:underline">
            Seguir comprando
          </Link>
        </aside>
      </div>
    </>
  )
}

export default function CarritoPage() {
  return (
    <div className="store-container pb-12">
      <Breadcrumbs items={[{ name: "Carrito" }]} />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-line/50" aria-hidden />}>
        <CartContent />
      </Suspense>
    </div>
  )
}
