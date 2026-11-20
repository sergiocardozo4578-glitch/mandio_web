import Link from "next/link"
import { getTopCategories } from "@/lib/medusa"

export async function Header() {
  const categories = await getTopCategories()

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-brand">
          Mandi<span className="text-accent-dark">&apos;</span>o
        </Link>

        <form action="/buscar" className="mx-auto hidden w-full max-w-md md:block">
          <label className="sr-only" htmlFor="q">Buscar productos</label>
          <input
            id="q"
            name="q"
            type="search"
            placeholder="Empezá a escribir para buscar productos…"
            className="w-full rounded-full border border-line bg-cream px-4 py-2 text-sm outline-none focus:border-brand"
          />
        </form>

        <nav className="ml-auto flex items-center gap-4 text-sm font-medium text-ink">
          <Link href="/favoritos" className="hover:text-brand" aria-label="Favoritos">♡</Link>
          <Link href="/cuenta" className="hover:text-brand">Mi cuenta</Link>
          <Link href="/carrito" className="rounded-full bg-brand px-3 py-1.5 text-white hover:bg-brand-dark">
            Carrito · ₲ 0
          </Link>
        </nav>
      </div>

      {categories.length > 0 && (
        <nav aria-label="Categorías" className="border-t border-line">
          <ul className="mx-auto flex max-w-7xl gap-5 overflow-x-auto px-4 py-2 text-sm text-muted">
            {categories.map((c) => (
              <li key={c.id} className="shrink-0">
                <Link href={`/c/${c.handle}`} className="hover:text-brand">{c.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
