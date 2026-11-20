import Medusa from "@medusajs/js-sdk"

/** Cliente de la API para las extensiones del admin (usa la sesión del usuario logueado). */
export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: { type: "session" },
})
