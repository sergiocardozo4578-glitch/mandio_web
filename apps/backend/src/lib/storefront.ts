/**
 * Avisa al storefront que invalide su caché (revalidateTag) cuando cambia el catálogo.
 * Silencioso si STOREFRONT_URL o REVALIDATE_SECRET no están configurados.
 */
export async function revalidateStorefront(tags: string[]) {
  const url = process.env.STOREFRONT_URL
  const secret = process.env.REVALIDATE_SECRET
  if (!url || !secret || !tags.length) return
  try {
    await fetch(`${url}/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // El storefront puede no estar levantado en desarrollo; la caché expira sola en minutos.
  }
}
