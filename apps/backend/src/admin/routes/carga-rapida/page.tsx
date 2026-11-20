import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Camera, Trash, XMark } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Label,
  Select,
  Switch,
  Text,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { compressImage, titleFromFileName } from "../../lib/image"
import { sdk } from "../../lib/sdk"

// ---------- Tipos y constantes ----------

type Status = "pendiente" | "guardando" | "guardado" | "error"

type Prenda = {
  key: string
  files: File[]
  previews: string[]
  title: string
  price: string // solo dígitos
  categoryId: string
  sizes: string[]
  stock: string
  publish: boolean
  status: Status
  error?: string
  productId?: string
}

type CategoryOption = { id: string; label: string }

const SIZE_PRESETS: { label: string; sizes: string[] }[] = [
  { label: "Ropa (P-XG)", sizes: ["P", "M", "G", "XG"] },
  { label: "Ropa (S-XL)", sizes: ["S", "M", "L", "XL"] },
  { label: "Jeans (36-46)", sizes: ["36", "38", "40", "42", "44", "46"] },
  { label: "Calzado (35-44)", sizes: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44"] },
  { label: "Talle único", sizes: [] },
]

const NO_CATEGORY = "__ninguna__"
const pyg = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 })
const formatPrice = (digits: string) => (digits ? pyg.format(Number(digits)) : "")
const onlyDigits = (s: string) => s.replace(/\D/g, "").slice(0, 10)
const newKey = () => Math.random().toString(36).slice(2, 10)

function newPrenda(files: File[], defaults: Partial<Prenda>): Prenda {
  return {
    key: newKey(),
    files,
    previews: files.map((f) => URL.createObjectURL(f)),
    title: titleFromFileName(files[0]?.name ?? ""),
    price: defaults.price ?? "",
    categoryId: defaults.categoryId ?? NO_CATEGORY,
    sizes: defaults.sizes ?? ["P", "M", "G"],
    stock: defaults.stock ?? "1",
    publish: defaults.publish ?? true,
    status: "pendiente",
  }
}

// ---------- Hook de categorías ----------

function useCategories() {
  const [options, setOptions] = useState<CategoryOption[]>([])
  useEffect(() => {
    sdk.admin.productCategory
      .list({ limit: 500, fields: "id,name,parent_category_id,rank" })
      .then(({ product_categories }) => {
        const byId = new Map(product_categories.map((c) => [c.id, c]))
        const pathOf = (id: string): string => {
          const c = byId.get(id)
          if (!c) return ""
          return c.parent_category_id ? `${pathOf(c.parent_category_id)} › ${c.name}` : c.name
        }
        setOptions(
          product_categories
            .map((c) => ({ id: c.id, label: pathOf(c.id) }))
            .sort((a, b) => a.label.localeCompare(b.label, "es"))
        )
      })
      .catch(() => toast.error("No se pudieron cargar las categorías"))
  }, [])
  return options
}

// ---------- Componentes ----------

function SizeEditor({ sizes, onChange }: { sizes: string[]; onChange: (s: string[]) => void }) {
  const [custom, setCustom] = useState("")
  const add = () => {
    const values = custom
      .split(/[,\s]+/)
      .map((v) => v.trim().toUpperCase())
      .filter(Boolean)
    if (values.length) onChange([...new Set([...sizes, ...values])])
    setCustom("")
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {SIZE_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.sizes)}
            className="txt-compact-xsmall rounded-full border border-ui-border-base px-2 py-0.5 text-ui-fg-subtle hover:bg-ui-bg-base-hover"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {sizes.length === 0 && <Badge size="2xsmall">Único</Badge>}
        {sizes.map((s) => (
          <Badge key={s} size="2xsmall" className="gap-1">
            {s}
            <button type="button" aria-label={`Quitar talle ${s}`} onClick={() => onChange(sizes.filter((x) => x !== s))}>
              <XMark className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
          onBlur={add}
          placeholder="+ talle"
          className="txt-compact-xsmall w-16 rounded border border-ui-border-base bg-ui-bg-field px-1.5 py-0.5"
        />
      </div>
    </div>
  )
}

function CategorySelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: CategoryOption[]
}) {
  return (
    <Select value={value} onValueChange={onChange} size="small">
      <Select.Trigger>
        <Select.Value placeholder="Sin categoría" />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value={NO_CATEGORY}>Sin categoría</Select.Item>
        {options.map((o) => (
          <Select.Item key={o.id} value={o.id}>
            {o.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  )
}

function PrendaCard({
  prenda,
  index,
  categories,
  onChange,
  onRemove,
  onAddPhotos,
}: {
  prenda: Prenda
  index: number
  categories: CategoryOption[]
  onChange: (patch: Partial<Prenda>) => void
  onRemove: () => void
  onAddPhotos: (files: File[]) => void
}) {
  const locked = prenda.status === "guardando" || prenda.status === "guardado"
  const extraRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-lg border bg-ui-bg-base shadow-elevation-card-rest ${
        prenda.status === "error" ? "border-ui-border-error" : "border-ui-border-base"
      }`}
    >
      <div className="relative aspect-square bg-ui-bg-subtle">
        <img src={prenda.previews[0]} alt={prenda.title || `Prenda ${index + 1}`} className="h-full w-full object-cover" />
        <div className="absolute left-2 top-2">
          {prenda.status === "guardado" && <Badge color="green">Guardado</Badge>}
          {prenda.status === "guardando" && <Badge color="blue">Guardando…</Badge>}
          {prenda.status === "error" && <Badge color="red">Error</Badge>}
        </div>
        {!locked && (
          <IconButton size="small" variant="transparent" className="absolute right-2 top-2 bg-ui-bg-base/90" onClick={onRemove} aria-label="Quitar prenda">
            <Trash />
          </IconButton>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto p-2">
        {prenda.previews.map((src, i) => (
          <img key={src} src={src} alt="" className={`h-10 w-10 shrink-0 rounded object-cover ${i === 0 ? "ring-2 ring-ui-fg-interactive" : ""}`} />
        ))}
        {!locked && (
          <>
            <button
              type="button"
              onClick={() => extraRef.current?.click()}
              className="txt-compact-xsmall h-10 shrink-0 rounded border border-dashed border-ui-border-strong px-2 text-ui-fg-subtle"
            >
              + foto
            </button>
            <input
              ref={extraRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                onAddPhotos(Array.from(e.target.files ?? []))
                e.target.value = ""
              }}
            />
          </>
        )}
      </div>

      <fieldset disabled={locked} className="flex flex-col gap-3 p-3 pt-0">
        <div>
          <Label size="xsmall" htmlFor={`t-${prenda.key}`}>Nombre</Label>
          <Input
            id={`t-${prenda.key}`}
            size="small"
            value={prenda.title}
            placeholder="Ej: Remera oversize negra"
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label size="xsmall" htmlFor={`p-${prenda.key}`}>Precio (₲)</Label>
            <Input
              id={`p-${prenda.key}`}
              size="small"
              inputMode="numeric"
              value={formatPrice(prenda.price)}
              placeholder="120.000"
              onChange={(e) => onChange({ price: onlyDigits(e.target.value) })}
            />
          </div>
          <div>
            <Label size="xsmall" htmlFor={`s-${prenda.key}`}>
              Stock {prenda.sizes.length ? "por talle" : ""}
            </Label>
            <Input
              id={`s-${prenda.key}`}
              size="small"
              inputMode="numeric"
              value={prenda.stock}
              onChange={(e) => onChange({ stock: onlyDigits(e.target.value) })}
            />
          </div>
        </div>

        <div>
          <Label size="xsmall">Categoría</Label>
          <CategorySelect value={prenda.categoryId} onChange={(v) => onChange({ categoryId: v })} options={categories} />
        </div>

        <div>
          <Label size="xsmall">Talles</Label>
          <SizeEditor sizes={prenda.sizes} onChange={(sizes) => onChange({ sizes })} />
        </div>

        <div className="flex items-center justify-between">
          <Label size="xsmall" htmlFor={`pub-${prenda.key}`}>Publicar en la tienda</Label>
          <Switch id={`pub-${prenda.key}`} checked={prenda.publish} onCheckedChange={(publish) => onChange({ publish })} />
        </div>

        {prenda.error && <Text size="xsmall" className="text-ui-fg-error">{prenda.error}</Text>}
        {prenda.productId && (
          <Link to={`/products/${prenda.productId}`} className="txt-compact-small text-ui-fg-interactive hover:underline">
            Ver producto →
          </Link>
        )}
      </fieldset>
    </div>
  )
}

// ---------- Página ----------

const CargaRapidaPage = () => {
  const categories = useCategories()
  const [prendas, setPrendas] = useState<Prenda[]>([])
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [onePerPhoto, setOnePerPhoto] = useState(true)
  const [bulk, setBulk] = useState({ price: "", categoryId: NO_CATEGORY, sizes: ["P", "M", "G"], stock: "1" })
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  // Liberar las URLs de vista previa al salir
  const prendasRef = useRef(prendas)
  prendasRef.current = prendas
  useEffect(() => () => prendasRef.current.forEach((p) => p.previews.forEach(URL.revokeObjectURL)), [])

  const addFiles = useCallback(
    (list: File[]) => {
      const images = list.filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name))
      if (!images.length) return
      const defaults = { price: bulk.price, categoryId: bulk.categoryId, sizes: bulk.sizes, stock: bulk.stock }
      const nuevas = onePerPhoto ? images.map((f) => newPrenda([f], defaults)) : [newPrenda(images, defaults)]
      setPrendas((prev) => [...prev, ...nuevas])
    },
    [bulk, onePerPhoto]
  )

  const update = (key: string, patch: Partial<Prenda>) =>
    setPrendas((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch, status: p.status === "error" ? "pendiente" : p.status, error: patch.error } : p)))

  const remove = (key: string) =>
    setPrendas((prev) => {
      prev.find((p) => p.key === key)?.previews.forEach(URL.revokeObjectURL)
      return prev.filter((p) => p.key !== key)
    })

  const addPhotos = (key: string, files: File[]) =>
    setPrendas((prev) =>
      prev.map((p) =>
        p.key === key ? { ...p, files: [...p.files, ...files], previews: [...p.previews, ...files.map((f) => URL.createObjectURL(f))] } : p
      )
    )

  const applyToAll = () => {
    setPrendas((prev) =>
      prev.map((p) =>
        p.status === "guardado"
          ? p
          : {
              ...p,
              ...(bulk.price ? { price: bulk.price } : {}),
              ...(bulk.categoryId !== NO_CATEGORY ? { categoryId: bulk.categoryId } : {}),
              sizes: bulk.sizes,
              ...(bulk.stock ? { stock: bulk.stock } : {}),
            }
      )
    )
    toast.success("Datos aplicados a todas las prendas pendientes")
  }

  const pendientes = useMemo(() => prendas.filter((p) => p.status !== "guardado"), [prendas])
  const guardadas = prendas.length - pendientes.length

  const saveAll = async () => {
    // Validación local antes de subir nada
    let invalid = 0
    setPrendas((prev) =>
      prev.map((p) => {
        if (p.status === "guardado") return p
        const error = !p.title.trim() ? "Falta el nombre." : !Number(p.price) ? "Falta el precio." : undefined
        if (error) invalid++
        return error ? { ...p, status: "error", error } : p
      })
    )
    const toSave = pendientes.filter((p) => p.title.trim() && Number(p.price))
    if (invalid) toast.warning(`${invalid} prenda(s) sin nombre o precio. Se guardan las demás.`)
    if (!toSave.length) return

    setSaving(true)
    let ok = 0
    for (const p of toSave) {
      setPrendas((prev) => prev.map((x) => (x.key === p.key ? { ...x, status: "guardando", error: undefined } : x)))
      try {
        const files = await Promise.all(p.files.map((f) => compressImage(f)))
        const { files: uploaded } = await sdk.admin.upload.create({ files })
        const res = await sdk.client.fetch<{ products: { id: string }[] }>("/admin/carga-rapida", {
          method: "POST",
          body: {
            items: [
              {
                title: p.title.trim(),
                price: Number(p.price),
                category_id: p.categoryId === NO_CATEGORY ? undefined : p.categoryId,
                sizes: p.sizes,
                stock: Number(p.stock || 0),
                image_urls: uploaded.map((u) => u.url),
                publish: p.publish,
              },
            ],
          },
        })
        ok++
        setPrendas((prev) =>
          prev.map((x) => (x.key === p.key ? { ...x, status: "guardado", productId: res.products[0]?.id } : x))
        )
      } catch (e) {
        const message = (e as Error).message || "No se pudo guardar"
        setPrendas((prev) => prev.map((x) => (x.key === p.key ? { ...x, status: "error", error: message } : x)))
      }
    }
    setSaving(false)
    if (ok) toast.success(`${ok} prenda(s) cargadas en la tienda`)
  }

  const clearSaved = () =>
    setPrendas((prev) => {
      prev.filter((p) => p.status === "guardado").forEach((p) => p.previews.forEach(URL.revokeObjectURL))
      return prev.filter((p) => p.status !== "guardado")
    })

  return (
    <div className="flex flex-col gap-4">
      <Container className="flex flex-col gap-4 px-6 py-4">
        <div>
          <Heading level="h1">Carga rápida por foto</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Subí las fotos de las prendas, completá nombre y precio, y guardalas todas juntas. Las fotos se
            achican automáticamente antes de subirse.
          </Text>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            addFiles(Array.from(e.dataTransfer.files))
          }}
          className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition ${
            dragging ? "border-ui-fg-interactive bg-ui-bg-highlight" : "border-ui-border-strong"
          }`}
        >
          <Camera className="h-8 w-8 text-ui-fg-muted" />
          <Text weight="plus">Arrastrá las fotos acá</Text>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" size="small" onClick={() => fileRef.current?.click()}>
              Elegir fotos
            </Button>
            <Button variant="secondary" size="small" onClick={() => cameraRef.current?.click()}>
              Sacar foto (celular)
            </Button>
          </div>
          <label className="txt-compact-small flex items-center gap-2 text-ui-fg-subtle">
            <Switch checked={onePerPhoto} onCheckedChange={setOnePerPhoto} size="small" />
            {onePerPhoto ? "Cada foto es una prenda distinta" : "Todas las fotos son de la misma prenda"}
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []))
              e.target.value = ""
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []))
              e.target.value = ""
            }}
          />
        </div>
      </Container>

      {prendas.length > 0 && (
        <Container className="flex flex-col gap-3 px-6 py-4">
          <Heading level="h2">Aplicar a todas</Heading>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label size="xsmall">Precio (₲)</Label>
              <Input
                size="small"
                inputMode="numeric"
                value={formatPrice(bulk.price)}
                placeholder="Sin cambiar"
                onChange={(e) => setBulk((b) => ({ ...b, price: onlyDigits(e.target.value) }))}
              />
            </div>
            <div>
              <Label size="xsmall">Categoría</Label>
              <CategorySelect value={bulk.categoryId} onChange={(v) => setBulk((b) => ({ ...b, categoryId: v }))} options={categories} />
            </div>
            <div>
              <Label size="xsmall">Stock por talle</Label>
              <Input
                size="small"
                inputMode="numeric"
                value={bulk.stock}
                onChange={(e) => setBulk((b) => ({ ...b, stock: onlyDigits(e.target.value) }))}
              />
            </div>
            <div>
              <Label size="xsmall">Talles</Label>
              <SizeEditor sizes={bulk.sizes} onChange={(sizes) => setBulk((b) => ({ ...b, sizes }))} />
            </div>
          </div>
          <div>
            <Button size="small" variant="secondary" onClick={applyToAll} disabled={saving}>
              Aplicar a las {pendientes.length} pendientes
            </Button>
          </div>
        </Container>
      )}

      {prendas.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {prendas.map((p, i) => (
            <PrendaCard
              key={p.key}
              prenda={p}
              index={i}
              categories={categories}
              onChange={(patch) => update(p.key, patch)}
              onRemove={() => remove(p.key)}
              onAddPhotos={(files) => addPhotos(p.key, files)}
            />
          ))}
        </div>
      )}

      {prendas.length > 0 && (
        <Container className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 px-6 py-3 shadow-elevation-flyout">
          <Text size="small" className="text-ui-fg-subtle">
            {pendientes.length} pendiente(s){guardadas ? ` · ${guardadas} guardada(s)` : ""}
          </Text>
          <div className="flex gap-2">
            {guardadas > 0 && (
              <Button variant="secondary" size="small" onClick={clearSaved} disabled={saving}>
                Limpiar guardadas
              </Button>
            )}
            <Button size="small" onClick={saveAll} isLoading={saving} disabled={!pendientes.length}>
              Guardar {pendientes.length} prenda(s)
            </Button>
          </div>
        </Container>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Carga rápida",
  icon: Camera,
})

export default CargaRapidaPage
