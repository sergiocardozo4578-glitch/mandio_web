"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import type { CategoryNode } from "@/lib/medusa"

export function CategoryNav({ categories }: { categories: CategoryNode[] }) {
  const menu = useRef<HTMLDetailsElement>(null)
  const trigger = useRef<HTMLElement>(null)

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (menu.current?.open && !menu.current.contains(event.target as Node)) menu.current.open = false
    }
    document.addEventListener("pointerdown", closeOutside)
    return () => document.removeEventListener("pointerdown", closeOutside)
  }, [])

  return (
    <nav aria-label="Navegación de la tienda" className="border-t border-line bg-cream">
      <div className="store-container relative flex items-center gap-2 text-sm sm:gap-4">
        {categories.length > 0 && (
          <details
            ref={menu}
            className="group"
            onKeyDown={(event) => {
              if (event.key === "Escape" && event.currentTarget.open) {
                event.currentTarget.open = false
                trigger.current?.focus()
              }
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false
            }}
          >
            <summary ref={trigger} className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded px-2 font-bold text-brand-dark hover:bg-rosewash">
              Categorías <span aria-hidden="true" className="text-brand group-open:rotate-180">▾</span>
            </summary>
            <div className="absolute inset-x-2 top-full z-20 grid max-h-[55dvh] grid-cols-2 gap-x-3 gap-y-4 overflow-y-auto overscroll-contain rounded-b-xl border border-line bg-surface p-4 shadow-xl sm:inset-x-8 sm:grid-cols-3 lg:grid-cols-4"
              onClick={(event) => {
                if ((event.target as Element).closest("a") && menu.current) menu.current.open = false
              }}>
              {categories.map((category) => (
                <div key={category.id}>
                  <Link href={`/c/${category.handle}`} className="block border-b border-line pb-2 font-bold text-brand-dark hover:underline">{category.name}</Link>
                  {category.children.map((child) => (
                    <Link key={child.id} href={`/c/${child.handle}`} className="block py-2 text-muted hover:text-brand hover:underline">{child.name}</Link>
                  ))}
                </div>
              ))}
            </div>
          </details>
        )}
        <Link href="/tienda" className="px-2 py-3 font-bold text-brand-dark hover:underline">Tienda</Link>
        <Link href="/ofertas" className="px-2 py-3 font-bold text-accent-dark hover:underline">Ofertas</Link>
        {categories.slice(0, 4).map((category) => (
          <Link key={category.id} href={`/c/${category.handle}`} className="hidden px-2 py-3 hover:text-brand hover:underline lg:block">{category.name}</Link>
        ))}
      </div>
    </nav>
  )
}
