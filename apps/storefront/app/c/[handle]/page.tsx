import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { CatalogListing, ListingSkeleton } from "@/components/catalog/listing"
import { getCategoryByHandle, getCategoryTree } from "@/lib/medusa"

export async function generateStaticParams() {
  const tree = await getCategoryTree()
  const all = tree.flatMap((c) => [c, ...c.children])
  // Sin backend en el build se prerenderiza al menos el shell con un handle placeholder.
  return all.length ? all.map((c) => ({ handle: c.handle })) : [{ handle: "todas" }]
}

export async function generateMetadata(props: PageProps<"/c/[handle]">): Promise<Metadata> {
  const { handle } = await props.params
  const category = await getCategoryByHandle(handle)
  if (!category) return { title: "Categoría no encontrada" }
  return {
    title: category.name,
    description:
      category.description ?? `Comprá ${category.name.toLowerCase()} online en Mandi'o, con envío a todo Paraguay.`,
    alternates: { canonical: `/c/${category.handle}` },
  }
}

async function CategoryContent({ params, searchParams }: PageProps<"/c/[handle]">) {
  const { handle } = await params
  const category = await getCategoryByHandle(handle)
  if (!category) notFound()

  const crumbs = category.path.map((c, i) => ({
    name: c.name,
    href: i < category.path.length - 1 ? `/c/${c.handle}` : undefined,
  }))

  return (
    <>
      <Breadcrumbs items={crumbs} />
      <h1 className="text-3xl font-extrabold">{category.name}</h1>
      {category.description && <p className="mt-1 text-muted">{category.description}</p>}

      {category.children.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {category.children.map((child) => (
            <li key={child.id}>
              <Link
                href={`/c/${child.handle}`}
                className="block rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-semibold hover:border-brand hover:text-brand"
              >
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Suspense fallback={<ListingSkeleton />}>
          <CatalogListing
            searchParams={searchParams}
            basePath={`/c/${category.handle}`}
            fixed={{ category: category.handle }}
            emptyMessage="Todavía no hay productos en esta categoría."
          />
        </Suspense>
      </div>
    </>
  )
}

export default function CategoryPage(props: PageProps<"/c/[handle]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <Suspense fallback={<ListingSkeleton />}>
        <CategoryContent {...props} />
      </Suspense>
    </div>
  )
}
