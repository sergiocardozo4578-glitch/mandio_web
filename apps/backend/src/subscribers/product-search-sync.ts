import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { syncProducts } from "../lib/search-index"
import { revalidateStorefront } from "../lib/storefront"

/** Mantiene Meilisearch y la caché del storefront al día cuando cambia un producto. */
export default async function productSearchSync({
  event: { name, data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  let productIds: string[] = []

  if (name.startsWith("product-variant.")) {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["product_id"],
      filters: { id: data.id },
      withDeleted: true,
    })
    productIds = variants.map((v) => v.product_id).filter(Boolean) as string[]
  } else {
    productIds = [data.id]
  }

  if (productIds.length) await syncProducts(container, productIds)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["handle"],
    filters: { id: productIds },
    withDeleted: true,
  })
  await revalidateStorefront(["products", ...products.map((p) => `product:${p.handle}`)])
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product-variant.created",
    "product-variant.updated",
    "product-variant.deleted",
  ],
}
