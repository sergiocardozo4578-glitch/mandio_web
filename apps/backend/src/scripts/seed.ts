import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Seed inicial de Mandi'o (Paraguay).
 * - Tienda en PYG (₲, sin decimales, precios con IVA incluido)
 * - Región Paraguay con IVA 10 %
 * - Depósito central + opciones de envío provisorias (se reemplazan en la fase 2)
 * - Árbol de categorías base y productos de ejemplo
 *
 * Ejecutar: pnpm seed  (si la región Paraguay ya existe, no hace nada)
 */

type CategoryNode = { name: string; handle: string; children?: CategoryNode[] }

const CATEGORY_TREE: CategoryNode[] = [
  {
    name: "Ropa Mujer",
    handle: "ropa-mujer",
    children: [
      { name: "Remeras", handle: "ropa-mujer-remeras" },
      { name: "Blusas", handle: "ropa-mujer-blusas" },
      { name: "Pantalones y Jeans", handle: "ropa-mujer-pantalones" },
    ],
  },
  {
    name: "Ropa Hombre",
    handle: "ropa-hombre",
    children: [
      { name: "Remeras", handle: "ropa-hombre-remeras" },
      { name: "Camisas", handle: "ropa-hombre-camisas" },
      { name: "Pantalones y Jeans", handle: "ropa-hombre-pantalones" },
    ],
  },
  {
    name: "Calzados",
    handle: "calzados",
    children: [
      { name: "Zapatillas", handle: "calzados-zapatillas" },
      { name: "Pantuflas", handle: "calzados-pantuflas" },
    ],
  },
  {
    name: "Accesorios",
    handle: "accesorios",
    children: [
      { name: "Celular", handle: "accesorios-celular" },
      { name: "Gorras", handle: "accesorios-gorras" },
      { name: "Medias", handle: "accesorios-medias" },
    ],
  },
  {
    name: "Joyería",
    handle: "joyeria",
    children: [
      { name: "Pulseras", handle: "joyeria-pulseras" },
      { name: "Aros", handle: "joyeria-aros" },
    ],
  },
  {
    name: "Hogar",
    handle: "hogar",
    children: [
      { name: "Tazas", handle: "hogar-tazas" },
      { name: "Lámparas", handle: "hogar-lamparas" },
      { name: "Decoración", handle: "hogar-decoracion" },
    ],
  },
  { name: "Juguetería", handle: "jugueteria" },
  { name: "Librería", handle: "libreria" },
  { name: "Cuidado Corporal", handle: "cuidado-corporal" },
  { name: "Mochilas y Carteras", handle: "mochilas-y-carteras" },
  { name: "Mascotas", handle: "mascotas" },
  { name: "Ideas para regalar", handle: "ideas-para-regalar" },
]

const img = (text: string) =>
  `https://placehold.co/800x800/png?text=${encodeURIComponent(text)}`

export default async function seedMandio({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentService = container.resolve(Modules.FULFILLMENT)
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
  const storeService = container.resolve(Modules.STORE)
  const regionService = container.resolve(Modules.REGION)

  const existing = await regionService.listRegions({ name: "Paraguay" })
  if (existing.length) {
    logger.info("La región Paraguay ya existe: el seed ya se ejecutó. Nada que hacer.")
    return
  }

  // ---------- Tienda y canal de venta ----------
  logger.info("Configurando tienda Mandi'o...")
  const [store] = await storeService.listStores()

  let [salesChannel] = await salesChannelService.listSalesChannels({
    name: "Tienda online",
  })
  if (!salesChannel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [{ name: "Tienda online", description: "mandio.com.py" }],
      },
    })
    salesChannel = result[0]
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        name: "Mandi'o",
        supported_currencies: [
          { currency_code: "pyg", is_default: true, is_tax_inclusive: true },
        ],
        default_sales_channel_id: salesChannel.id,
      },
    },
  })

  // ---------- Región e impuestos ----------
  logger.info("Creando región Paraguay (PYG)...")
  const { result: regions } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Paraguay",
          currency_code: "pyg",
          countries: ["py"],
          payment_providers: ["pp_system_default"],
          is_tax_inclusive: true,
        },
      ],
    },
  })
  const region = regions[0]

  await createTaxRegionsWorkflow(container).run({
    input: [
      {
        country_code: "py",
        provider_id: "tp_system",
        default_tax_rate: { name: "IVA 10%", code: "IVA10", rate: 10 },
      },
    ],
  })

  // ---------- Depósito y envíos ----------
  logger.info("Creando depósito y opciones de envío...")
  const { result: locations } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: "Depósito Central",
          address: { city: "Asunción", country_code: "PY", address_1: "" },
        },
      ],
    },
  })
  const stockLocation = locations[0]

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: { default_location_id: stockLocation.id },
    },
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  })

  const profiles = await fulfillmentService.listShippingProfiles({ type: "default" })
  let shippingProfile = profiles[0]
  if (!shippingProfile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Perfil por defecto", type: "default" }] },
    })
    shippingProfile = result[0]
  }

  const fulfillmentSet = await fulfillmentService.createFulfillmentSets({
    name: "Envíos Paraguay",
    type: "shipping",
    service_zones: [
      { name: "Paraguay", geo_zones: [{ country_code: "py", type: "country" }] },
    ],
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
  })

  const storeRules = [
    { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
    { attribute: "is_return", value: "false", operator: "eq" as const },
  ]
  const shippingOption = (
    name: string,
    code: string,
    description: string,
    amount: number
  ) => ({
    name,
    price_type: "flat" as const,
    provider_id: "manual_manual",
    service_zone_id: fulfillmentSet.service_zones[0].id,
    shipping_profile_id: shippingProfile.id,
    type: { label: name, description, code },
    prices: [
      { currency_code: "pyg", amount },
      { region_id: region.id, amount },
    ],
    rules: storeRules,
  })

  // Tarifas provisorias: las reales se definen en la fase 2.
  await createShippingOptionsWorkflow(container).run({
    input: [
      shippingOption("Retiro en tienda", "retiro", "Retirá sin costo", 0),
      shippingOption(
        "Delivery Asunción y Gran Asunción",
        "delivery",
        "Entrega en 24 a 48 hs",
        20000
      ),
      shippingOption(
        "Encomienda al interior",
        "encomienda",
        "Envío por agencia de encomiendas",
        30000
      ),
    ],
  })

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: stockLocation.id, add: [salesChannel.id] },
  })

  // ---------- API key pública para el storefront ----------
  logger.info("Creando API key pública...")
  const { data: keys } = await query.graph({
    entity: "api_key",
    fields: ["id", "token"],
    filters: { type: "publishable" },
  })
  let apiKey = keys[0] as { id: string; token: string } | undefined
  if (!apiKey) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [{ title: "Storefront Mandi'o", type: "publishable", created_by: "" }],
      },
    })
    apiKey = result[0] as { id: string; token: string }
  }
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: apiKey.id, add: [salesChannel.id] },
  })

  // ---------- Categorías ----------
  logger.info("Creando árbol de categorías...")
  const categoryIds: Record<string, string> = {}
  const { result: parents } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: CATEGORY_TREE.map((c, i) => ({
        name: c.name,
        handle: c.handle,
        is_active: true,
        rank: i,
      })),
    },
  })
  parents.forEach((c) => (categoryIds[c.handle] = c.id))

  const children = CATEGORY_TREE.flatMap((parent) =>
    (parent.children ?? []).map((child, i) => ({
      name: child.name,
      handle: child.handle,
      is_active: true,
      rank: i,
      parent_category_id: categoryIds[parent.handle],
    }))
  )
  const { result: childResult } = await createProductCategoriesWorkflow(container).run({
    input: { product_categories: children },
  })
  childResult.forEach((c) => (categoryIds[c.handle] = c.id))

  // ---------- Productos de ejemplo ----------
  logger.info("Creando productos de ejemplo...")
  const base = {
    status: ProductStatus.PUBLISHED,
    shipping_profile_id: shippingProfile.id,
    sales_channels: [{ id: salesChannel.id }],
  }
  const price = (amount: number) => [{ currency_code: "pyg", amount }]
  const sized = (prefix: string, amount: number, values: string[]) =>
    values.map((v) => ({
      title: v,
      sku: `${prefix}-${v}`,
      options: { Talle: v },
      prices: price(amount),
    }))
  const single = (sku: string, amount: number) => [
    { title: "Único", sku, options: { Modelo: "Único" }, prices: price(amount) },
  ]

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          ...base,
          title: "Camisa blanca a rayas de hombre",
          handle: "camisa-blanca-a-rayas-hombre",
          description: "Camisa de algodón con rayas finas y cuello en contraste.",
          category_ids: [categoryIds["ropa-hombre-camisas"]],
          thumbnail: img("Camisa"),
          images: [{ url: img("Camisa") }],
          options: [{ title: "Talle", values: ["P", "M", "G"] }],
          variants: sized("MND-CAM-001", 180000, ["P", "M", "G"]),
        },
        {
          ...base,
          title: "Blusa cuadritos celeste con volados",
          handle: "blusa-cuadritos-celeste-volados",
          description: "Blusa liviana con estampado de cuadritos y volados en las mangas.",
          category_ids: [categoryIds["ropa-mujer-blusas"]],
          thumbnail: img("Blusa"),
          images: [{ url: img("Blusa") }],
          options: [{ title: "Talle", values: ["P", "M", "G"] }],
          variants: sized("MND-BLU-001", 119000, ["P", "M", "G"]),
        },
        {
          ...base,
          title: "Zapatilla urbana blanca",
          handle: "zapatilla-urbana-blanca",
          description: "Zapatilla cómoda para el día a día.",
          category_ids: [categoryIds["calzados-zapatillas"]],
          thumbnail: img("Zapatilla"),
          images: [{ url: img("Zapatilla") }],
          options: [{ title: "Talle", values: ["36", "37", "38", "39", "40"] }],
          variants: sized("MND-ZAP-001", 135000, ["36", "37", "38", "39", "40"]),
        },
        {
          ...base,
          title: "Pulsera de piedras ágata roja",
          handle: "pulsera-piedras-agata-roja",
          description: "Pulsera de piedras naturales ágata roja.",
          category_ids: [categoryIds["joyeria-pulseras"], categoryIds["ideas-para-regalar"]],
          thumbnail: img("Pulsera"),
          images: [{ url: img("Pulsera") }],
          options: [{ title: "Modelo", values: ["Único"] }],
          variants: single("MND-PUL-001", 65000),
        },
        {
          ...base,
          title: "Taza de cerámica gatito",
          handle: "taza-ceramica-gatito",
          description: "Taza de cerámica de 350 ml con diseño de gatito.",
          category_ids: [categoryIds["hogar-tazas"], categoryIds["ideas-para-regalar"]],
          thumbnail: img("Taza"),
          images: [{ url: img("Taza") }],
          options: [{ title: "Color", values: ["Rosa", "Celeste"] }],
          variants: ["Rosa", "Celeste"].map((c) => ({
            title: c,
            sku: `MND-TAZ-001-${c.toUpperCase()}`,
            options: { Color: c },
            prices: price(45000),
          })),
        },
        {
          ...base,
          title: "Soporte para celular plegable",
          handle: "soporte-celular-plegable",
          description: "Soporte de escritorio regulable para celular.",
          category_ids: [categoryIds["accesorios-celular"]],
          thumbnail: img("Soporte"),
          images: [{ url: img("Soporte") }],
          options: [{ title: "Modelo", values: ["Único"] }],
          variants: single("MND-SOP-001", 38000),
        },
      ],
    },
  })

  // ---------- Stock ----------
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  })
  const levels: CreateInventoryLevelInput[] = inventoryItems.map((item) => ({
    location_id: stockLocation.id,
    inventory_item_id: item.id,
    stocked_quantity: 20,
  }))
  await createInventoryLevelsWorkflow(container).run({
    input: { inventory_levels: levels },
  })

  logger.info("Seed de Mandi'o completo.")
  logger.info(`API key pública (NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY): ${apiKey.token}`)
}
