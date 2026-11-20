import Link from "next/link"
import { SearchBox } from "@/components/search-box"
import { getCategoryTree } from "@/lib/medusa"

export async function Header() {
  const categories = await getCategoryTree()

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="shrink-0 text-2xl font-extrabold tracking-tight text-brand">
          Mandi<span className="text-accent-dark">&apos;</span>o
        </Link>

        <SearchBox className="mx-auto hidden w-full max-w-md md:block" />

        <nav className="ml-auto flex shrink-0 items-center gap-4 text-sm font-medium text-ink">
          <Link href="/favoritos" className="hover:text-brand" aria-label="Favoritos">♡</Link>
          <Link href="/cuenta" className="hidden hover:text-brand sm:inline">Mi cuenta</Link>
          <Link href="/carrito" className="rounded-full bg-brand px-3 py-1.5 text-white hover:bg-brand-dark">
            Carrito
          </Link>
        </nav>
      </div>

      <SearchBox className="px-4 pb-3 md:hidden" />

      {categories.length > 0 && (
        <nav aria-label="Categorías" className="border-t border-line">
          <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 text-sm text-ink md:overflow-visible">
            <li className="shrink-0">
              <Link href="/ofertas" className="block px-3 py-2.5 font-bold text-accent-dark hover:text-brand">
                Ofertas
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id} className="group relative shrink-0">
                <Link href={`/c/${c.handle}`} className="block px-3 py-2.5 hover:text-brand">
                  {c.name}
                </Link>
                {c.children.length > 0 && (
                  <div className="invisible absolute left-0 top-full z-40 min-w-52 rounded-b-2xl border border-line bg-surface p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 md:group-hover:visible md:group-hover:opacity-100">
                    <Link href={`/c/${c.handle}`} className="block rounded-lg px-3 py-2 font-semibold hover:bg-cream">
                      Ver todo {c.name}
                    </Link>
                    {c.children.map((child) => (
                      <Link key={child.id} href={`/c/${child.handle}`} className="block rounded-lg px-3 py-2 hover:bg-cream">
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
