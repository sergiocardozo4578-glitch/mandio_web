import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { configureProductsIndex, syncProducts } from "../../../../lib/search-index"

/** POST /admin/search/reindex: reindexado manual desde el panel o la API. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  await configureProductsIndex()
  const result = await syncProducts(req.scope)
  res.json(result)
}
