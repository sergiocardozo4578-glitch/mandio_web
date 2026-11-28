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
  const term = q.trim()
  const [result, setResult] = useState<{ term: string; hits: Hit[]; total: number; failed?: boolean } | null>(null)
  const current = result?.term === term ? result : null
  const hits = current?.hits ?? []
  const total = current?.total ?? 0
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [active, setActive] = useState(-1)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Con menos de 2 letras el panel no se muestra, no hace falta buscar.
    if (term.length < 2) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        if (!res.ok) throw new Error("search")
        const data = (await res.json()) as { hits: Hit[]; total: number }
        if (!controller.signal.aborted) setResult({ term, hits: data.hits, total: data.total })
      } catch {
        if (!controller.signal.aborted) setResult({ term, hits: [], total: 0, failed: true })
      }
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [term])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const goTo = (href: string) => {
    setOpen(false)
    setActive(-1)
    router.push(href)
  }

  const showPanel = open && q.trim().length >= 2

  return (
    <div ref={boxRef} className={`relative ${className}`} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }}>
      <form
        role="search"
        className="relative"
        onSubmit={(e) => {
          e.preventDefault()
          if (showPanel && active >= 0 && hits[active]) return goTo(`/p/${hits[active].handle}`)
          if (q.trim()) goTo(`/buscar?q=${encodeURIComponent(q.trim())}`)
        }}
      >
        <label className="sr-only" htmlFor={`${listId}-input`}>Buscar productos</label>
        <span aria-hidden="true" className="search-icon pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-accent-dark" />
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="search"
          value={q}
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-autocomplete="list"
          aria-controls={showPanel && hits.length ? listId : undefined}
          aria-activedescendant={showPanel && hits[active] ? `${listId}-${active}` : undefined}
          onChange={(e) => {
            setActive(-1)
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setOpen(true)
              setActive((a) => Math.min(hits.length - 1, a + 1))
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              setActive((a) => Math.max(-1, a - 1))
            } else if (e.key === "Escape") {
              e.preventDefault()
              setActive(-1)
              setOpen(false)
            }
          }}
          placeholder="Buscá en Mandi’o…"
          className="min-h-11 w-full rounded-full border border-line bg-cream py-2 pr-12 pl-11 [&::-webkit-search-cancel-button]:hidden text-sm placeholder:text-muted focus:border-brand"
        />
        {q && (
          <button type="button" aria-label="Borrar búsqueda" className="absolute inset-y-0 right-0 w-11 rounded-full text-lg text-muted hover:text-brand"
            onClick={() => {
              setQ("")
              setActive(-1)
              inputRef.current?.focus()
            }}>
            <span aria-hidden="true">×</span>
          </button>
        )}
      </form>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[55dvh] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface shadow-xl">
          {hits.length > 0 ? (
            <>
              <ul id={listId} role="listbox" aria-label="Sugerencias de productos">
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
            <p role="status" className="px-4 py-4 text-sm text-muted">
              {!current ? "Buscando…" : current.failed ? "No pudimos cargar las sugerencias. Presioná Enter para buscar." : `No encontramos productos para “${term}”.`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
