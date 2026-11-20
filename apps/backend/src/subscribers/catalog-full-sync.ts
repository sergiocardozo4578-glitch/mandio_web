import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { syncProducts } from "../lib/search-index"
import { revalidateStorefront } from "../lib/storefront"

/**
 * Cambios que afectan a muchos productos a la vez (ofertas, categorías, stock):
 * se reindexa todo el catálogo. Para unos miles de productos tarda segundos.
 */
export default async function catalogFullSync({ event: { name }, container }: SubscriberArgs) {
  await syncProducts(container)
  const tags = name.startsWith("product-category.") ? ["categories", "products"] : ["products"]
  await revalidateStorefront(tags)
}

export const config: SubscriberConfig = {
  event: [
    "price-list.created",
    "price-list.updated",
    "price-list.deleted",
    "price-list.prices_added",
    "price-list.prices_updated",
    "price-list.prices_removed",
    "product-category.created",
    "product-category.updated",
    "product-category.deleted",
    "inventory-item.updated",
  ],
}
