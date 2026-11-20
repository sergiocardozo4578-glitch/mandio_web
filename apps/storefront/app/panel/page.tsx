import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { CargaProducto, type CategoryOption } from "@/components/panel/carga-producto"
import { getAdminToken, getAdminUser } from "@/lib/admin-auth"
import { getCategoryTree, type CategoryNode } from "@/lib/medusa"
import { logoutAction } from "./actions"

export const metadata: Metadata = { title: "Cargar producto" }

function flatten(nodes: CategoryNode[], prefix = ""): CategoryOption[] {
  return nodes.flatMap((n) => {
    const label = prefix ? `${prefix} › ${n.name}` : n.name
    return [{ id: n.id, label }, ...flatten(n.children, label)]
  })
}

async function Panel() {
  const user = await getAdminUser(await getAdminToken())
  if (!user) redirect("/panel/ingresar")

  const categories = flatten(await getCategoryTree())

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
        <p className="font-display text-2xl leading-none tracking-[-0.06em] text-brand-dark">
          Mandi<span className="text-accent-dark">&apos;</span>o
          <span className="ml-2 align-middle font-sans text-xs font-bold uppercase tracking-widest text-muted">Panel</span>
        </p>
        <form action={logoutAction}>
          <button type="submit" className="rounded-full px-3 py-2 text-sm font-semibold text-muted hover:bg-rosewash">
            Salir
          </button>
        </form>
      </header>
      <CargaProducto categories={categories} />
    </>
  )
}

export default function PanelPage() {
  return (
    <Suspense
      fallback={<p className="px-5 py-16 text-center text-muted">Cargando…</p>}
    >
      <Panel />
    </Suspense>
  )
}
