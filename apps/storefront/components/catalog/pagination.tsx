import Link from "next/link"

type Props = {
  basePath: string
  searchParams: Record<string, string | string[] | undefined>
  page: number
  totalPages: number
}

/** Paginación numérica: 1 … 4 5 [6] 7 8 … 20 */
export function Pagination({ basePath, searchParams, page, totalPages }: Props) {
  if (totalPages <= 1) return null

  const href = (p: number) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === "pagina" || v == null) continue
      for (const item of Array.isArray(v) ? v : [v]) params.append(k, item)
    }
    if (p > 1) params.set("pagina", String(p))
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages))
  const sorted = [...pages].sort((a, b) => a - b)

  const base = "flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold"

  return (
    <nav aria-label="Paginación" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={href(page - 1)} className={`${base} border border-line bg-surface hover:border-brand`} aria-label="Página anterior">
          ←
        </Link>
      )}
      {sorted.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - sorted[i - 1] > 1 && <span className="text-muted">…</span>}
          {p === page ? (
            <span aria-current="page" className={`${base} bg-brand text-white`}>{p}</span>
          ) : (
            <Link href={href(p)} className={`${base} border border-line bg-surface hover:border-brand`}>{p}</Link>
          )}
        </span>
      ))}
      {page < totalPages && (
        <Link href={href(page + 1)} className={`${base} border border-line bg-surface hover:border-brand`} aria-label="Página siguiente">
          →
        </Link>
      )}
    </nav>
  )
}
