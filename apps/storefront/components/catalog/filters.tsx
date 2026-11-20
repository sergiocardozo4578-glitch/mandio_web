"use client"

import { useRouter } from "next/navigation"
import { useRef, useTransition } from "react"
import { formatGuarani } from "@/lib/format"

type Props = {
  basePath: string
  current: {
    q?: string
    talle: string[]
    color: string[]
    min?: number
    max?: number
    onSale: boolean
    inStock: boolean
    sort?: string
  }
  facets: { talle: Record<string, number>; color: Record<string, number> }
  priceRange: { min: number; max: number } | null
  sortOptions: { value: string; label: string }[]
  hideOnSale?: boolean
  total: number
}

/** Orden natural de talles: P/M/G/XG primero, luego números. */
const SIZE_ORDER = ["XS", "PP", "P", "S", "M", "G", "L", "XG", "XL", "XXG", "XXL"]
const sortSizes = (a: string, b: string) => {
  const ia = SIZE_ORDER.indexOf(a)
  const ib = SIZE_ORDER.indexOf(b)
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  return a.localeCompare(b, "es", { numeric: true })
}

export function CatalogFilters({
  basePath,
  current,
  facets,
  priceRange,
  sortOptions,
  hideOnSale,
  total,
}: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()

  function apply() {
    const form = formRef.current
    if (!form) return
    const params = new URLSearchParams()
    for (const [key, value] of new FormData(form)) {
      if (typeof value === "string" && value.trim() !== "") params.append(key, value.trim())
    }
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false }))
  }

  const talles = Object.keys(facets.talle).sort(sortSizes)
  const colors = Object.keys(facets.color).sort((a, b) => a.localeCompare(b, "es"))
  const activeCount =
    current.talle.length +
    current.color.length +
    (current.min ? 1 : 0) +
    (current.max ? 1 : 0) +
    (current.onSale ? 1 : 0) +
    (current.inStock ? 1 : 0)

  const chip = (name: string, value: string, checked: boolean, count?: number) => (
    <label
      key={`${name}-${value}`}
      className="cursor-pointer select-none rounded-full border border-line bg-surface px-3 py-1 text-sm transition has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-white"
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        onChange={apply}
        className="sr-only"
      />
      {value}
      {count != null && <span className="ml-1 opacity-60">({count})</span>}
    </label>
  )

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault()
        apply()
      }}
      aria-busy={pending}
      className={pending ? "opacity-60 transition" : "transition"}
    >
      {current.q && <input type="hidden" name="q" value={current.q} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {total} {total === 1 ? "producto" : "productos"}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Ordenar por</span>
          <select
            name="orden"
            defaultValue={current.sort ?? (current.q ? "relevancia" : "novedades")}
            onChange={apply}
            className="rounded-full border border-line bg-surface px-3 py-1.5"
          >
            {sortOptions
              .filter((o) => current.q || o.value !== "relevancia")
              .map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
          </select>
        </label>
      </div>

      <details className="group mt-4 rounded-2xl border border-line bg-surface p-4 lg:open:block" open={activeCount > 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
          <span>
            Filtros{activeCount > 0 && <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs text-white">{activeCount}</span>}
          </span>
          <span className="text-sm text-muted group-open:hidden">Mostrar</span>
          <span className="hidden text-sm text-muted group-open:inline">Ocultar</span>
        </summary>

        <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {talles.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Talle</legend>
              <div className="flex flex-wrap gap-2">
                {talles.map((t) => chip("talle", t, current.talle.includes(t), facets.talle[t]))}
              </div>
            </fieldset>
          )}

          {colors.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Color</legend>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => chip("color", c, current.color.includes(c), facets.color[c]))}
              </div>
            </fieldset>
          )}

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Precio (₲)</legend>
            <div className="flex items-center gap-2">
              <input
                name="min"
                inputMode="numeric"
                placeholder={priceRange ? formatGuarani(priceRange.min) : "Mínimo"}
                defaultValue={current.min ?? ""}
                onBlur={apply}
                className="w-full rounded-lg border border-line px-3 py-1.5 text-sm"
                aria-label="Precio mínimo"
              />
              <span className="text-muted">a</span>
              <input
                name="max"
                inputMode="numeric"
                placeholder={priceRange ? formatGuarani(priceRange.max) : "Máximo"}
                defaultValue={current.max ?? ""}
                onBlur={apply}
                className="w-full rounded-lg border border-line px-3 py-1.5 text-sm"
                aria-label="Precio máximo"
              />
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-2 font-semibold">Mostrar</legend>
            {!hideOnSale && (
              <label className="flex items-center gap-2">
                <input type="checkbox" name="oferta" value="1" defaultChecked={current.onSale} onChange={apply} className="accent-brand" />
                Solo ofertas
              </label>
            )}
            <label className="flex items-center gap-2">
              <input type="checkbox" name="stock" value="1" defaultChecked={current.inStock} onChange={apply} className="accent-brand" />
              Solo con stock
            </label>
          </fieldset>
        </div>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() =>
              startTransition(() =>
                router.push(current.q ? `${basePath}?q=${encodeURIComponent(current.q)}` : basePath, { scroll: false })
              )
            }
            className="mt-4 text-sm font-semibold text-brand hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </details>
    </form>
  )
}
