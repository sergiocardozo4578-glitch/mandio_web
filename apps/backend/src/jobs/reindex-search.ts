import type { MedusaContainer } from "@medusajs/framework/types"
import { configureProductsIndex, syncProducts } from "../lib/search-index"

/** Red de seguridad: reindexa el catálogo cada 30 minutos (stock vendido, ofertas que vencen, etc.). */
export default async function reindexSearchJob(container: MedusaContainer) {
  await configureProductsIndex()
  await syncProducts(container)
}

export const config = {
  name: "reindex-search",
  schedule: "*/30 * * * *",
}
