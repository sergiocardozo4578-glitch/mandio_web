import type { Metadata } from "next"
import { LoginForm } from "@/components/panel/login-form"

export const metadata: Metadata = { title: "Ingresar" }

export default function IngresarPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <p className="font-display text-4xl tracking-[-0.06em] text-brand-dark">
        Mandi<span className="text-accent-dark">&apos;</span>o
      </p>
      <h1 className="mt-2 text-lg font-bold text-ink">Panel para cargar productos</h1>
      <p className="mt-1 text-sm text-muted">Ingresá con tu cuenta de administrador.</p>
      <LoginForm />
    </main>
  )
}
