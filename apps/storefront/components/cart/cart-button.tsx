import Link from "next/link"
import { Suspense } from "react"
import { cartItemCount, retrieveCart } from "@/lib/cart"

const className =
  "inline-flex min-h-10 items-center gap-2 rounded-full border border-brand bg-brand px-3.5 py-1.5 text-white transition-colors hover:border-brand-dark hover:bg-brand-dark"

async function CartCount() {
  const count = cartItemCount(await retrieveCart())
  return (
    <Link href="/carrito" className={className} aria-label={`Carrito, ${count} productos`}>
      Carrito
      {count > 0 && (
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-surface px-1.5 text-xs font-bold text-brand-dark">
          {count}
        </span>
      )}
    </Link>
  )
}

/** Botón del carrito con contador. Lee la cookie del carrito: se resuelve en streaming. */
export function CartButton() {
  return (
    <Suspense
      fallback={
        <Link href="/carrito" className={className}>
          Carrito
        </Link>
      }
    >
      <CartCount />
    </Suspense>
  )
}
