"use client"

import { useActionState } from "react"
import { loginAction, type LoginState } from "@/app/panel/actions"

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {})

  return (
    <form action={action} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-ink">Email</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          defaultValue={state.email}
          required
          className="h-14 rounded-xl border border-line bg-surface px-4 text-base outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-ink">Contraseña</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-14 rounded-xl border border-line bg-surface px-4 text-base outline-none focus:border-brand"
        />
      </label>

      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-14 rounded-full bg-brand text-base font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  )
}
