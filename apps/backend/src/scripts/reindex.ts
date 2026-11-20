import type { ExecArgs } from "@medusajs/framework/types"
import { configureProductsIndex, syncProducts } from "../lib/search-index"

/** pnpm --filter @mandio/backend reindex */
export default async function reindex({ container }: ExecArgs) {
  await configureProductsIndex()
  await syncProducts(container)
}
