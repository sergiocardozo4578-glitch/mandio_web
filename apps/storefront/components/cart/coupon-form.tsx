"use client"

import { useActionState, useTransition } from "react"
import { applyCoupon, removeCoupon, type ActionResult } from "@/app/actions/cart"

export function CouponForm({ applied }: { applied: string[] }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(applyCoupon, { ok: true })
  const [removing, startRemove] = useTransition()

  return (
    <div>
      {applied.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {applied.map((code) => (
            <li key={code} className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
              {code}
              <button
                type="button"
                disabled={removing}
                onClick={() => startRemove(async () => void (await removeCoupon(code)))}
                aria-label={`Quitar cupón ${code}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="flex gap-2">
        <label className="sr-only" htmlFor="coupon">Cupón de descuento</label>
        <input
          id="coupon"
          name="code"
          placeholder="Cupón de descuento"
          autoCapitalize="characters"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-sm uppercase outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 shrink-0 rounded-full border border-brand px-4 text-sm font-bold text-brand hover:bg-rosewash disabled:opacity-60"
        >
          {pending ? "…" : "Aplicar"}
        </button>
      </form>
      {!state.ok && state.error && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{state.error}</p>}
    </div>
  )
}
