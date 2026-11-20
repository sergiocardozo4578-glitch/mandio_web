import type { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  createPriceListsWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Datos de demostración para probar el catálogo (filtros, paginación, ofertas).
 * Requiere haber corrido `pnpm seed`. Ejecutar: pnpm --filter @mandio/backend seed:demo
 * No usar en producción.
 */

const img = (text: string) => `https://placehold.co/800x800/png?text=${encodeURIComponent(text)}`

type Demo = {
  title: string
  category: string
  price: number
  sizes?: string[]
  colors?: string[]
  sale?: number // precio de oferta
  stock?: number
}

const DEMO: Demo[] = [
  { title: "Remera oversize negra estampada", category: "ropa-hombre-remeras", price: 120000, sizes: ["P", "M", "G", "XG"], sale: 84000 },
  { title: "Remera básica blanca unisex", category: "ropa-hombre-remeras", price: 79000, sizes: ["P", "M", "G"] },
  { title: "Jeans barrel negro de hombre", category: "ropa-hombre-pantalones", price: 265000, sizes: ["38", "40", "42", "44"] },
  { title: "Camisa rayas rosas con bordado", category: "ropa-hombre-camisas", price: 210000, sizes: ["P", "M", "G"], sale: 147000 },
  { title: "Top rojo con ojales metálicos", category: "ropa-mujer-remeras", price: 73000, sizes: ["P", "M", "G"] },
  { title: "Jeans barrel patchwork de mujer", category: "ropa-mujer-pantalones", price: 370000, sizes: ["36", "38", "40"], sale: 259000 },
  { title: "Blusa blanca con lazo", category: "ropa-mujer-blusas", price: 135000, sizes: ["P", "M", "G"], colors: ["Blanco", "Negro"] },
  { title: "Pantufla peluda de osito", category: "calzados-pantuflas", price: 69000, sizes: ["35-36", "37-38", "39-40"], colors: ["Rosa", "Gris"] },
  { title: "Zapatilla gatito blanca", category: "calzados-zapatillas", price: 95000, sizes: ["35", "36", "37", "38"], sale: 35000 },
  { title: "Gorra trucker verde", category: "accesorios-gorras", price: 59000, colors: ["Verde", "Negro", "Beige"] },
  { title: "Pack de 2 medias ajolote", category: "accesorios-medias", price: 42000 },
  { title: "Funda de celular transparente con glitter", category: "accesorios-celular", price: 39000, sale: 19500 },
  { title: "Aros de acero corazón", category: "joyeria-aros", price: 49000, colors: ["Dorado", "Plateado"] },
  { title: "Pulsera de cuarzo rosa", category: "joyeria-pulseras", price: 65000, sale: 33000 },
  { title: "Lámpara medusa con luz LED", category: "hogar-lamparas", price: 145000, stock: 0 },
  { title: "Taza mágica que cambia de color", category: "hogar-tazas", price: 55000 },
  { title: "Velas aromáticas set de 3", category: "hogar-decoracion", price: 78000, sale: 54600 },
  { title: "Peluche de capibara 30 cm", category: "jugueteria", price: 89000, colors: ["Marrón", "Rosa"] },
  { title: "Bloques para armar cabaña alpina", category: "jugueteria", price: 40000 },
  { title: "Cuaderno A5 tapa dura kawaii", category: "libreria", price: 32000, colors: ["Celeste", "Lila"] },
  { title: "Set de stickers 3D", category: "libreria", price: 18000 },
  { title: "Mascarilla facial de arcilla", category: "cuidado-corporal", price: 45000 },
  { title: "Mochila impermeable negra", category: "mochilas-y-carteras", price: 189000, sale: 132000 },
  { title: "Cama redonda para mascotas", category: "mascotas", price: 160000, sizes: ["S", "M", "L"] },
]

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

export default async function seedDemo({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const pricingService = container.resolve(Modules.PRICING)

  const existing = await pricingService.listPriceLists({})
  if (existing.some((pl) => pl.title === "Ofertas de lanzamiento")) {
    logger.info("Los datos de demo ya existen. Nada que hacer.")
    return
  }

  const { data: categories } = await query.graph({ entity: "product_category", fields: ["id", "handle"] })
  const catId = Object.fromEntries(categories.map((c) => [c.handle, c.id]))
  const { data: channels } = await query.graph({ entity: "sales_channel", fields: ["id"], filters: { name: "Tienda online" } })
  const { data: profiles } = await query.graph({ entity: "shipping_profile", fields: ["id"], filters: { type: "default" } })
  const { data: locations } = await query.graph({ entity: "stock_location", fields: ["id"], filters: { name: "Depósito Central" } })
  if (!channels[0] || !profiles[0] || !locations[0]) throw new Error("Primero corré `pnpm seed`.")

  const products = DEMO.map((d, i) => {
    const sizes = d.sizes ?? []
    const colors = d.colors ?? []
    const options = [
      ...(sizes.length ? [{ title: "Talle", values: sizes }] : []),
      ...(colors.length ? [{ title: "Color", values: colors }] : []),
    ]
    if (!options.length) options.push({ title: "Modelo", values: ["Único"] })

    const combos: Record<string, string>[] = [{}]
    for (const opt of options) {
      const next: Record<string, string>[] = []
      for (const c of combos) for (const v of opt.values) next.push({ ...c, [opt.title]: v })
      combos.splice(0, combos.length, ...next)
    }

    const handle = slug(d.title)
    return {
      title: d.title,
      handle,
      description: `${d.title}. Producto de demostración de Mandi'o.`,
      status: ProductStatus.PUBLISHED,
      category_ids: [catId[d.category]].filter(Boolean),
      thumbnail: img(d.title.split(" ").slice(0, 2).join(" ")),
      images: [{ url: img(d.title.split(" ").slice(0, 2).join(" ")) }, { url: img("Detalle") }],
      shipping_profile_id: profiles[0].id,
      sales_channels: [{ id: channels[0].id }],
      options,
      variants: combos.map((combo, j) => ({
        title: Object.values(combo).join(" / "),
        sku: `MND-DEMO-${String(i + 1).padStart(3, "0")}-${j + 1}`,
        options: combo,
        prices: [{ currency_code: "pyg", amount: d.price }],
      })),
    }
  })

  logger.info(`Creando ${products.length} productos de demo...`)
  const { result: created } = await createProductsWorkflow(container).run({ input: { products } })

  // Stock: 15 por variante, salvo los marcados como agotados
  const createdIds = created.map((p) => p.id)
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product_id", "inventory_items.inventory_item_id"],
    filters: { product_id: createdIds },
  })
  const stockByHandle = Object.fromEntries(DEMO.map((d) => [slug(d.title), d.stock ?? 15]))
  const handleById = Object.fromEntries(created.map((p) => [p.id, p.handle]))
  const levels: CreateInventoryLevelInput[] = variants.flatMap((v) =>
    (v.inventory_items ?? []).map((ii) => ({
      location_id: locations[0].id,
      inventory_item_id: ii!.inventory_item_id,
      stocked_quantity: stockByHandle[handleById[v.product_id!]] ?? 15,
    }))
  )
  await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels: levels } })

  // Ofertas: lista de precios (tipo "sale" por defecto) (genera precio tachado y badge en la tienda)
  const saleByHandle = Object.fromEntries(DEMO.filter((d) => d.sale).map((d) => [slug(d.title), d.sale!]))
  const prices = variants
    .filter((v) => saleByHandle[handleById[v.product_id!]])
    .map((v) => ({ variant_id: v.id, currency_code: "pyg", amount: saleByHandle[handleById[v.product_id!]] }))

  await createPriceListsWorkflow(container).run({
    input: {
      price_lists_data: [
        {
          title: "Ofertas de lanzamiento",
          description: "Descuentos de apertura de Mandi'o",
          status: "active",
          prices,
        },
      ],
    },
  })

  logger.info(`Demo lista: ${created.length} productos y ${prices.length} precios en oferta.`)
}
