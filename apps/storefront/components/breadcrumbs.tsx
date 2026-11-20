import Link from "next/link"

export type Crumb = { name: string; href?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ name: "Inicio", href: "/" }, ...items]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:8000"

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.href ? { item: `${siteUrl}${c.href}` } : {}),
    })),
  }

  return (
    <nav aria-label="Ruta de navegación" className="py-4 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {all.map((c, i) => (
          <li key={`${c.name}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {c.href && i < all.length - 1 ? (
              <Link href={c.href} className="hover:text-brand">{c.name}</Link>
            ) : (
              <span className="font-semibold text-ink">{c.name}</span>
            )}
          </li>
        ))}
      </ol>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </nav>
  )
}
