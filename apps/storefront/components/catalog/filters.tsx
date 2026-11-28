"use client"

import Link from "next/link"
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
      if (typeof value !== "string" || !value.trim()) continue
      const text = value.trim()
      params.append(key, key === "min" || key === "max" ? text.replaceAll(".", "") : text)
    }
    const min = params.get("min")
    const max = params.get("max")
    if (!form.reportValidity()) return
    if (min && max && Number(min) > Number(max)) {
      const upper = form.elements.namedItem("max") as HTMLInputElement
      upper.setCustomValidity("El precio máximo debe ser igual o mayor que el mínimo.")
      upper.reportValidity()
      upper.setCustomValidity("")
      return
    }
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false }))
  }

  const talles = Array.from(new Set([...current.talle, ...Object.keys(facets.talle)])).sort(sortSizes)
  const colors = Array.from(new Set([...current.color, ...Object.keys(facets.color)])).sort((a, b) => a.localeCompare(b, "es"))
  const filters = [
    ...current.talle.map(value => ({ key: "talle", value, label: `Talle ${value}` })),
    ...current.color.map(value => ({ key: "color", value, label: `Color ${value}` })),
    ...(current.min != null ? [{ key: "min", value: String(current.min), label: `Desde ${formatGuarani(current.min)}` }] : []),
    ...(current.max != null ? [{ key: "max", value: String(current.max), label: `Hasta ${formatGuarani(current.max)}` }] : []),
    ...(current.onSale && !hideOnSale ? [{ key: "oferta", value: "1", label: "Solo ofertas" }] : []),
    ...(current.inStock ? [{ key: "stock", value: "1", label: "Con stock" }] : []),
  ]
  const activeCount = filters.length

  function catalogUrl(remaining: typeof filters) {
    const params = new URLSearchParams()
    if (current.q) params.set("q", current.q)
    if (current.sort) params.set("orden", current.sort)
    remaining.forEach(({ key, value }) => params.append(key, value))
    return params.size ? `${basePath}?${params}` : basePath
  }

  const chip = (name: string, value: string, checked: boolean, count?: number) => (
    <label
      key={`${name}-${value}`}
      className="cursor-pointer select-none rounded-full border border-line bg-cream px-3 py-1 text-sm transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-white"
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
            className="min-h-10 rounded-full border border-line bg-surface px-3 py-1.5"
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

      {activeCount > 0 && (
        <div aria-label="Filtros aplicados" role="group" className="mt-4 flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <Link key={`${filter.key}-${filter.value}`} scroll={false}
              href={catalogUrl(filters.filter(item => item !== filter))}
              aria-label={`Quitar filtro: ${filter.label}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-brand/25 bg-rosewash px-3 text-sm text-brand-dark hover:border-brand">
              {filter.label}<span aria-hidden="true">×</span>
            </Link>
          ))}
          <Link href={catalogUrl([])} scroll={false} className="px-2 py-2 text-sm font-semibold text-brand underline underline-offset-4">
            Limpiar filtros
          </Link>
        </div>
      )}

      <details className="group mt-4 rounded-xl border border-line bg-surface p-4 sm:px-5" open={activeCount > 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-brand-dark">
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
                pattern="[0-9]+|[0-9]{1,3}([.][0-9]{3})+"
                title="Escribí un monto en guaraníes, por ejemplo 15000 o 15.000"
                className="w-full rounded-lg border border-line px-3 py-1.5 text-sm"
                aria-label="Precio mínimo"
              />
              <span className="text-muted">a</span>
              <input
                name="max"
                inputMode="numeric"
                placeholder={priceRange ? formatGuarani(priceRange.max) : "Máximo"}
                defaultValue={current.max ?? ""}
                pattern="[0-9]+|[0-9]{1,3}([.][0-9]{3})+"
                title="Escribí un monto en guaraníes, por ejemplo 15000 o 15.000"
                className="w-full rounded-lg border border-line px-3 py-1.5 text-sm"
                aria-label="Precio máximo"
              />
            </div>
            <button type="submit" className="mt-2 min-h-10 rounded-full border border-line px-4 text-sm font-bold text-brand hover:bg-rosewash">Aplicar precio</button>
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

      </details>
    </form>
  )
}
