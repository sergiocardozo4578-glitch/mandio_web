import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

/**
 * GET /store/pedidos/:id
 * La Store API de Medusa no expone `metadata` del pedido. La página de confirmación
 * necesita saber el método de pago elegido para mostrar las instrucciones.
 * Devuelve solo eso (sin datos personales). Mismo modelo de acceso que
 * GET /store/orders/:id: el id del pedido es largo e impredecible.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "metadata"],
    filters: { id: req.params.id },
  })
  const order = data[0]
  if (!order) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Pedido no encontrado")

  const metadata = (order.metadata ?? {}) as Record<string, unknown>
  res.json({
    pedido: {
      id: order.id,
      display_id: order.display_id,
      payment_method: typeof metadata.payment_method === "string" ? metadata.payment_method : null,
    },
  })
}
