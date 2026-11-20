"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { compressImage } from "@/lib/compress-image"
import { formatGuarani } from "@/lib/format"

export type CategoryOption = { id: string; label: string }

type Photo = { file: File; url: string }
type Saved = { title: string; price: number; handle: string; published: boolean }

const SIZE_GROUPS: { id: string; label: string; sizes: string[] }[] = [
  { id: "ropa", label: "Ropa", sizes: ["PP", "P", "M", "G", "XG", "XXG"] },
  { id: "jeans", label: "Jeans", sizes: ["34", "36", "38", "40", "42", "44", "46"] },
  { id: "calzado", label: "Calzado", sizes: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44"] },
  { id: "unico", label: "Talle único", sizes: [] },
]
const DEFAULT_SIZES = ["P", "M", "G"]
const MEMORY_KEY = "mandio-panel-ultimos"
const MAX_PHOTOS = 8

const onlyDigits = (s: string) => s.replace(/\D/g, "").slice(0, 10)
const pyg = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 })

type Memory = { categoryId: string; group: string; sizes: string[] }

function readMemory(): Memory | null {
  try {
    const raw = localStorage.getItem(MEMORY_KEY)
    return raw ? (JSON.parse(raw) as Memory) : null
  } catch {
    return null
  }
}

function writeMemory(m: Memory) {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(m))
  } catch {
    // modo privado: no pasa nada
  }
}

export function CargaProducto({ categories }: { categories: CategoryOption[] }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [price, setPrice] = useState("")
  const [title, setTitle] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [group, setGroup] = useState("ropa")
  const [sizes, setSizes] = useState<string[]>(DEFAULT_SIZES)
  const [stock, setStock] = useState(1)
  const [publish, setPublish] = useState(true)
  const [description, setDescription] = useState("")
  const [showDescription, setShowDescription] = useState(false)
  const [phase, setPhase] = useState<"idle" | "comprimiendo" | "subiendo">("idle")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<Saved | null>(null)

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  // Recordar la última categoría y talles: cargar 20 remeras seguidas es más rápido.
  useEffect(() => {
    const m = readMemory()
    if (!m) return
    /* eslint-disable react-hooks/set-state-in-effect -- se lee localStorage una sola vez al montar */
    if (m.categoryId && categories.some((c) => c.id === m.categoryId)) setCategoryId(m.categoryId)
    if (m.group) setGroup(m.group)
    if (Array.isArray(m.sizes)) setSizes(m.sizes)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [categories])

  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  const addFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name))
    if (!files.length) return
    setError(null)
    setPhotos((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_PHOTOS))
  }

  const removePhoto = (i: number) =>
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[i].url)
      return prev.filter((_, j) => j !== i)
    })

  const makeCover = (i: number) =>
    setPhotos((prev) => [prev[i], ...prev.filter((_, j) => j !== i)])

  const chooseGroup = (id: string) => {
    setGroup(id)
    const g = SIZE_GROUPS.find((x) => x.id === id)!
    setSizes(id === "ropa" ? DEFAULT_SIZES : g.sizes)
  }

  const toggleSize = (s: string) =>
    setSizes((prev) => {
      const order = SIZE_GROUPS.find((g) => g.id === group)?.sizes ?? []
      const next = prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
      return next.sort((a, b) => order.indexOf(a) - order.indexOf(b))
    })

  const resetForNext = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url))
    setPhotos([])
    setPrice("")
    setTitle("")
    setStock(1)
    setDescription("")
    setShowDescription(false)
    setError(null)
    setSaved(null)
    window.scrollTo({ top: 0 })
  }

  const save = async () => {
    setError(null)
    if (!photos.length) return setError("Agregá al menos una foto.")
    if (!Number(price)) return setError("Poné el precio.")
    if (!title.trim()) return setError("Poné un nombre para el producto.")
    if (group !== "unico" && !sizes.length) return setError("Elegí al menos un talle, o marcá “Talle único”.")

    try {
      setPhase("comprimiendo")
      const files = await Promise.all(photos.map((p) => compressImage(p.file)))

      setPhase("subiendo")
      const form = new FormData()
      files.forEach((f) => form.append("photos", f, f.name))
      form.set("title", title.trim())
      form.set("price", price)
      form.set("category_id", categoryId)
      form.set("sizes", JSON.stringify(group === "unico" ? [] : sizes))
      form.set("stock", String(stock))
      form.set("publish", publish ? "1" : "0")
      if (description.trim()) form.set("description", description.trim())

      const res = await fetch("/api/panel/productos", { method: "POST", body: form })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        product?: { handle: string; status: string }
      }
      if (res.status === 401) {
        router.push("/panel/ingresar")
        return
      }
      if (!res.ok || !body.product) throw new Error(body.error ?? "No se pudo guardar.")

      writeMemory({ categoryId, group, sizes })
      setSaved({
        title: title.trim(),
        price: Number(price),
        handle: body.product.handle,
        published: body.product.status === "published",
      })
      window.scrollTo({ top: 0 })
    } catch (e) {
      setError((e as Error).message || "No se pudo guardar. Revisá la conexión.")
    } finally {
      setPhase("idle")
    }
  }

  // ---------- Pantalla de éxito ----------
  if (saved) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center px-5 py-12 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-green-100 text-4xl text-green-700" aria-hidden>
          ✓
        </div>
        <h1 className="mt-5 text-2xl font-bold text-ink">¡Producto cargado!</h1>
        <p className="mt-2 text-base text-ink">{saved.title}</p>
        <p className="text-xl font-bold text-brand">{formatGuarani(saved.price)}</p>
        <p className="mt-2 text-sm text-muted">
          {saved.published ? "Ya está visible en la tienda." : "Quedó guardado como borrador (no visible)."}
        </p>
        <button
          type="button"
          onClick={resetForNext}
          className="mt-8 h-14 w-full rounded-full bg-brand text-base font-bold text-white hover:bg-brand-dark"
        >
          Cargar otro producto
        </button>
        {saved.published && (
          <a
            href={`/p/${saved.handle}`}
            target="_blank"
            rel="noopener"
            className="mt-3 grid h-14 w-full place-items-center rounded-full border border-line bg-surface text-base font-bold text-brand-dark"
          >
            Ver en la tienda
          </a>
        )}
      </main>
    )
  }

  const busy = phase !== "idle"
  const fileInputs = (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = "" }} />
      <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = "" }} />
    </>
  )

  // ---------- Paso 1: elegir fotos ----------
  if (!photos.length) {
    return (
      <main className="mx-auto flex max-w-md flex-col px-5 py-8">
        <h1 className="text-2xl font-bold text-ink">Cargar producto</h1>
        <p className="mt-1 text-sm text-muted">Empezá con una foto de la prenda.</p>
        <div className="mt-8 flex flex-col gap-4">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl bg-brand text-white shadow-sm active:scale-[0.99]"
          >
            <span className="text-4xl" aria-hidden>📷</span>
            <span className="text-lg font-bold">Sacar foto</span>
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-brand/30 bg-surface text-brand-dark active:scale-[0.99]"
          >
            <span className="text-4xl" aria-hidden>🖼️</span>
            <span className="text-lg font-bold">Elegir de la galería</span>
            <span className="text-xs text-muted">Podés elegir varias fotos de la misma prenda</span>
          </button>
        </div>
        {fileInputs}
      </main>
    )
  }

  // ---------- Paso 2: datos ----------
  const currentGroup = SIZE_GROUPS.find((g) => g.id === group)!

  return (
    <main className="mx-auto max-w-md pb-32">
      {/* Fotos */}
      <section className="px-4 pt-4">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-rosewash">
          {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
          <img src={photos[0].url} alt="Foto principal" className="h-full w-full object-cover" />
          <span className="absolute left-3 top-3 rounded-full bg-ink/75 px-2.5 py-1 text-xs font-bold text-white">Portada</span>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <div key={p.url} className="relative shrink-0">
              <button
                type="button"
                onClick={() => makeCover(i)}
                aria-label={i === 0 ? "Foto de portada" : "Usar como portada"}
                className={`block h-16 w-16 overflow-hidden rounded-xl border-2 ${i === 0 ? "border-brand" : "border-transparent"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
                <img src={p.url} alt="" className="h-full w-full object-cover" />
              </button>
              <button
                type="button"
                onClick={() => removePhoto(i)}
                aria-label="Quitar foto"
                className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink text-xs font-bold text-white"
              >
                ✕
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <>
              <button type="button" onClick={() => cameraRef.current?.click()} className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border-2 border-dashed border-line bg-surface text-xl" aria-label="Sacar otra foto">
                📷
              </button>
              <button type="button" onClick={() => galleryRef.current?.click()} className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border-2 border-dashed border-line bg-surface text-xl" aria-label="Agregar desde la galería">
                🖼️
              </button>
            </>
          )}
        </div>
        {fileInputs}
      </section>

      <fieldset disabled={busy} className="mt-6 flex flex-col gap-6 px-4">
        {/* Precio */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-ink">Precio</span>
          <div className="flex h-16 items-center rounded-2xl border-2 border-line bg-surface px-4 focus-within:border-brand">
            <span className="mr-2 text-2xl font-bold text-muted">₲</span>
            <input
              value={price ? pyg.format(Number(price)) : ""}
              onChange={(e) => setPrice(onlyDigits(e.target.value))}
              inputMode="numeric"
              enterKeyHint="next"
              placeholder="120.000"
              aria-label="Precio en guaraníes"
              className="w-full bg-transparent text-3xl font-bold text-ink outline-none placeholder:text-line"
            />
          </div>
        </label>

        {/* Nombre */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-ink">Nombre</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            enterKeyHint="done"
            autoCapitalize="sentences"
            placeholder="Ej: Vestido floreado de verano"
            className="h-14 rounded-2xl border-2 border-line bg-surface px-4 text-base outline-none focus:border-brand"
          />
        </label>

        {/* Categoría */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-ink">Categoría</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-14 rounded-2xl border-2 border-line bg-surface px-4 text-base outline-none focus:border-brand"
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        {/* Talles */}
        <div>
          <p className="text-sm font-bold text-ink">Talles</p>
          <div className="mt-2 grid grid-cols-4 gap-1 rounded-2xl bg-rosewash/60 p-1">
            {SIZE_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => chooseGroup(g.id)}
                aria-pressed={group === g.id}
                className={`h-10 rounded-xl text-xs font-bold ${group === g.id ? "bg-surface text-brand-dark shadow-sm" : "text-muted"}`}
              >
                {g.label}
              </button>
            ))}
          </div>
          {currentGroup.sizes.length > 0 ? (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                {currentGroup.sizes.map((s) => {
                  const on = sizes.includes(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSize(s)}
                      aria-pressed={on}
                      className={`h-12 min-w-12 rounded-xl border-2 px-3 text-base font-bold ${on ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink"}`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-muted">Tocá los talles que tenés disponibles.</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">Se vende sin elegir talle (accesorios, bolsos, etc.).</p>
          )}
        </div>

        {/* Stock */}
        <div>
          <p className="text-sm font-bold text-ink">
            Cantidad {group !== "unico" && sizes.length > 0 ? "por talle" : "disponible"}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={() => setStock((s) => Math.max(0, s - 1))} className="h-14 w-14 rounded-2xl border-2 border-line bg-surface text-2xl font-bold" aria-label="Restar uno">
              −
            </button>
            <input
              value={stock}
              onChange={(e) => setStock(Math.min(9999, Number(onlyDigits(e.target.value)) || 0))}
              inputMode="numeric"
              aria-label="Cantidad"
              className="h-14 w-20 rounded-2xl border-2 border-line bg-surface text-center text-2xl font-bold outline-none focus:border-brand"
            />
            <button type="button" onClick={() => setStock((s) => Math.min(9999, s + 1))} className="h-14 w-14 rounded-2xl border-2 border-line bg-surface text-2xl font-bold" aria-label="Sumar uno">
              +
            </button>
            {group !== "unico" && sizes.length > 1 && (
              <span className="text-sm text-muted">= {stock * sizes.length} en total</span>
            )}
          </div>
        </div>

        {/* Descripción opcional */}
        {showDescription ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-ink">Descripción (opcional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Tela, medidas, cómo queda…"
              className="rounded-2xl border-2 border-line bg-surface px-4 py-3 text-base outline-none focus:border-brand"
            />
          </label>
        ) : (
          <button type="button" onClick={() => setShowDescription(true)} className="self-start text-sm font-bold text-brand">
            + Agregar descripción
          </button>
        )}

        {/* Publicar */}
        <label className="flex items-center justify-between rounded-2xl border-2 border-line bg-surface px-4 py-3">
          <span>
            <span className="block text-base font-bold text-ink">Publicar ya</span>
            <span className="text-xs text-muted">{publish ? "Se ve en la tienda al guardar" : "Se guarda como borrador"}</span>
          </span>
          <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="h-7 w-7 accent-brand" />
        </label>
      </fieldset>

      {/* Barra fija para guardar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          {error && (
            <p role="alert" className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="h-14 w-full rounded-full bg-brand text-lg font-bold text-white hover:bg-brand-dark disabled:opacity-70"
          >
            {phase === "comprimiendo" ? "Preparando fotos…" : phase === "subiendo" ? "Guardando…" : "Guardar producto"}
          </button>
        </div>
      </div>
    </main>
  )
}
