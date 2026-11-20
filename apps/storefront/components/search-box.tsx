"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { formatGuarani } from "@/lib/format"

type Hit = {
  id: string
  handle: string
  title: string
  thumbnail: string | null
  price: number | null
  original_price: number | null
  on_sale: boolean
}

/** Buscador con resultados en vivo mientras se escribe. */
export function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter()
  const listId = useId()
  const [q, setQ] = useState("")
  const [hits, setHits] = useState<Hit[]>([])
  const [total, setTotal] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const term = q.trim()
    // Con menos de 2 letras el panel no se muestra, no hace falta buscar.
    if (term.length < 2) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        const data = (await res.json()) as { hits: Hit[]; total: number }
        setHits(data.hits)
        setTotal(data.total)
        setActive(-1)
      } catch {
        // búsqueda cancelada o sin conexión
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [q])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const goTo = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const showPanel = open && q.trim().length >= 2

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (active >= 0 && hits[active]) return goTo(`/p/${hits[active].handle}`)
          if (q.trim()) goTo(`/buscar?q=${encodeURIComponent(q.trim())}`)
        }}
      >
        <label className="sr-only" htmlFor={`${listId}-input`}>Buscar productos</label>
        <input
          id={`${listId}-input`}
          type="search"
          value={q}
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setActive((a) => Math.min(hits.length - 1, a + 1))
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              setActive((a) => Math.max(-1, a - 1))
            } else if (e.key === "Escape") {
              setOpen(false)
            }
          }}
          placeholder="Empezá a escribir para buscar productos…"
          className="w-full rounded-full border border-line bg-cream px-4 py-2 text-sm outline-none focus:border-brand"
        />
      </form>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
          {hits.length > 0 ? (
            <>
              <ul id={listId} role="listbox">
                {hits.map((h, i) => (
                  <li key={h.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                    <Link
                      href={`/p/${h.handle}`}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2 hover:bg-cream ${i === active ? "bg-cream" : ""}`}
                    >
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream">
                        {h.thumbnail && <Image src={h.thumbnail} alt="" fill sizes="48px" className="object-cover" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{h.title}</span>
                        <span className="text-sm font-bold text-brand">{formatGuarani(h.price)}</span>
                        {h.on_sale && (
                          <span className="ml-2 text-xs text-muted line-through">{formatGuarani(h.original_price)}</span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/buscar?q=${encodeURIComponent(q.trim())}`}
                onClick={() => setOpen(false)}
                className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-brand hover:bg-cream"
              >
                Ver los {total} resultados
              </Link>
            </>
          ) : (
            <p className="px-4 py-4 text-sm text-muted">
              {loading ? "Buscando…" : `No encontramos productos para “${q.trim()}”.`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
