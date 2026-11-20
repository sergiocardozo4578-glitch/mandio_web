import { NextResponse, type NextRequest } from "next/server"
import { quickSearch } from "@/lib/search"

/** GET /api/search?q=remera → autocompletado del buscador (la clave de Meilisearch queda en el servidor). */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100)
  const result = await quickSearch(q, 6)
  return NextResponse.json(result, {
    headers: { "cache-control": "public, max-age=30, stale-while-revalidate=120" },
  })
}
