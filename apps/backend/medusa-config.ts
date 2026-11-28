import { loadEnv, defineConfig } from "@medusajs/framework/utils"
import { nexusAdminBranding } from "./branding/admin-branding"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const isProduction = process.env.NODE_ENV === "production"
const databaseUrl = process.env.DATABASE_URL
const redisUrl = process.env.REDIS_URL

// Sin DATABASE_URL Medusa usa en silencio postgres://localhost/medusa-starter-default:
// en Railway eso termina en ECONNREFUSED. En producción se corta con un error claro.
if (isProduction && !databaseUrl) {
  throw new Error(
    "[config] Falta DATABASE_URL. En Railway: Variables del backend → DATABASE_URL=${{Postgres.DATABASE_URL}}"
  )
}
if (databaseUrl) {
  // Se muestra destino sin usuario ni contraseña, para diagnosticar desde los logs.
  try {
    const u = new URL(databaseUrl)
    console.log(`[config] Postgres: ${u.hostname}:${u.port || 5432}${u.pathname}`)
  } catch {
    throw new Error("[config] DATABASE_URL no es una URL válida (postgresql://usuario:clave@host:puerto/base)")
  }
}
if (isProduction && !redisUrl) {
  console.warn("[config] Falta REDIS_URL: se usan event bus y workflows en memoria (no recomendado en producción)")
}

const useS3 = Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID)

const modules: { resolve: string; options?: Record<string, unknown> }[] = []

// Con Redis se usan event bus y workflow engine persistentes.
// Sin REDIS_URL Medusa usa los módulos en memoria (solo para pruebas rápidas).
if (redisUrl) {
  modules.push(
    { resolve: "@medusajs/medusa/event-bus-redis", options: { redisUrl } },
    { resolve: "@medusajs/medusa/workflow-engine-redis", options: { redis: { redisUrl } } }
  )
}

// Imágenes y archivos: Cloudflare R2 (compatible con S3) en staging/producción,
// disco local (./static, servido en /static) en desarrollo.
modules.push({
  resolve: "@medusajs/medusa/file",
  options: {
    providers: [
      useS3
        ? {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION || "auto",
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              prefix: "productos/",
              cache_control: "public, max-age=31536000, immutable",
              // R2 no soporta ACLs por objeto: el bucket se publica con un dominio propio.
              acl: false,
            },
          }
        : {
            resolve: "@medusajs/medusa/file-local",
            id: "local",
            options: {
              backend_url: `${process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"}/static`,
            },
          },
    ],
  },
})

module.exports = defineConfig({
  projectConfig: {
    databaseUrl,
    redisUrl,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
    // Logo, ícono y título de Nexus en el panel (ver branding/admin-branding.ts).
    // Medusa combina esta config con la suya (mergeConfig): solo se agrega el plugin.
    vite: () => ({ plugins: [nexusAdminBranding()] }),
  },
  modules,
})
