import { revalidateTag } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"

const ALLOWED = /^(products|categories|regions|product:[a-z0-9-]+)$/

/**
 * POST /api/revalidate  { tags: ["products", "product:camisa-blanca"] }
 * Lo llama el backend (subscribers de Medusa) cuando cambia el catálogo.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret || request.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null
  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((t): t is string => typeof t === "string" && ALLOWED.test(t))
    : []

  for (const tag of tags) revalidateTag(tag, "max")
  return NextResponse.json({ revalidated: tags })
}
