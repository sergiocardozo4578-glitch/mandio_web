import { NextResponse, type NextRequest } from "next/server"
import { adminFetch, getAdminToken } from "@/lib/admin-auth"

const MAX_FILES = 8
const MAX_FILE_BYTES = 12 * 1024 * 1024

/**
 * POST /api/panel/productos (multipart/form-data)
 * Campos: title, price, category_id?, sizes (JSON), stock, publish ("1"/"0"), description?, photos (archivos)
 * Sube las fotos a Medusa y crea el producto con /admin/carga-rapida, todo con el token del admin.
 */
export async function POST(request: NextRequest) {
  const token = await getAdminToken()
  if (!token) return NextResponse.json({ error: "Tu sesión venció. Ingresá de nuevo." }, { status: 401 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "No se pudieron leer los datos." }, { status: 400 })
  }

  const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0)
  if (!photos.length) return NextResponse.json({ error: "Agregá al menos una foto." }, { status: 400 })
  if (photos.length > MAX_FILES) return NextResponse.json({ error: `Máximo ${MAX_FILES} fotos.` }, { status: 400 })
  if (photos.some((f) => f.size > MAX_FILE_BYTES || !f.type.startsWith("image/"))) {
    return NextResponse.json({ error: "Las fotos deben ser imágenes de hasta 12 MB." }, { status: 400 })
  }

  let sizes: string[] = []
  try {
    const parsed = JSON.parse(String(form.get("sizes") ?? "[]"))
    if (Array.isArray(parsed)) sizes = parsed.map(String)
  } catch {
    // sin talles = talle único
  }

  // 1) Subir fotos
  const upload = new FormData()
  for (const f of photos) upload.append("files", f, f.name)
  const up = await adminFetch("/admin/uploads", token, { method: "POST", body: upload })
  if (up.status === 401) return NextResponse.json({ error: "Tu sesión venció. Ingresá de nuevo." }, { status: 401 })
  if (!up.ok) return NextResponse.json({ error: "No se pudieron subir las fotos." }, { status: 502 })
  const { files } = (await up.json()) as { files: { url: string }[] }

  // 2) Crear el producto
  const res = await adminFetch("/admin/carga-rapida", token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      items: [
        {
          title: String(form.get("title") ?? ""),
          price: Number(String(form.get("price") ?? "").replace(/\D/g, "")),
          category_id: String(form.get("category_id") ?? "") || undefined,
          description: String(form.get("description") ?? "") || undefined,
          sizes,
          stock: Number(form.get("stock") ?? 0),
          image_urls: files.map((f) => f.url),
          publish: form.get("publish") !== "0",
        },
      ],
    }),
  })

  const body = (await res.json().catch(() => ({}))) as {
    message?: string
    products?: { id: string; handle: string; title: string; status: string }[]
  }
  if (!res.ok) {
    return NextResponse.json({ error: body.message ?? "No se pudo guardar el producto." }, { status: res.status })
  }
  return NextResponse.json({ product: body.products?.[0] }, { status: 201 })
}
