import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const redisUrl = process.env.REDIS_URL
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
    databaseUrl: process.env.DATABASE_URL,
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
  },
  modules,
})
