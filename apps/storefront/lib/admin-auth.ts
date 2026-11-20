import "server-only"
import { cookies } from "next/headers"
import { MEDUSA_BACKEND_URL } from "@/lib/medusa"

/**
 * Sesión del panel de carga (/panel): el token de admin de Medusa vive en una
 * cookie httpOnly. El navegador nunca lo ve y todas las llamadas al backend
 * salen desde el servidor de Next.
 */

export const ADMIN_COOKIE = "mandio_admin"
const MAX_AGE = 60 * 60 * 24 // 1 día, igual que el JWT de Medusa por defecto

export async function getAdminToken() {
  return (await cookies()).get(ADMIN_COOKIE)?.value ?? null
}

export async function setAdminToken(token: string) {
  ;(await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  })
}

export async function clearAdminToken() {
  ;(await cookies()).delete(ADMIN_COOKIE)
}

/** fetch al backend de Medusa con el token del admin logueado. */
export async function adminFetch(path: string, token: string, init: RequestInit = {}) {
  return fetch(`${MEDUSA_BACKEND_URL}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), authorization: `Bearer ${token}` },
    cache: "no-store",
  })
}

export type AdminUser = { id: string; email: string; first_name: string | null }

/** Devuelve el usuario si el token sigue siendo válido. */
export async function getAdminUser(token: string | null): Promise<AdminUser | null> {
  if (!token) return null
  try {
    const res = await adminFetch("/admin/users/me", token)
    if (!res.ok) return null
    const { user } = (await res.json()) as { user: AdminUser }
    return user
  } catch {
    return null
  }
}

/** Login con email y contraseña del admin de Medusa. Devuelve el token o un mensaje de error. */
export async function loginAdmin(email: string, password: string): Promise<{ token?: string; error?: string }> {
  try {
    const res = await fetch(`${MEDUSA_BACKEND_URL}/auth/user/emailpass`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      cache: "no-store",
    })
    if (res.status === 401) return { error: "Email o contraseña incorrectos." }
    if (!res.ok) return { error: "No se pudo iniciar sesión. Probá de nuevo." }
    const { token } = (await res.json()) as { token?: string }
    return token ? { token } : { error: "No se pudo iniciar sesión." }
  } catch {
    return { error: "No hay conexión con el servidor de la tienda." }
  }
}
