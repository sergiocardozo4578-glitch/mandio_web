import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const redisUrl = process.env.REDIS_URL

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
  // Con Redis disponible se usan event bus y workflow engine persistentes.
  // Sin REDIS_URL Medusa usa los módulos en memoria (solo para pruebas rápidas).
  modules: redisUrl
    ? [
        {
          resolve: "@medusajs/medusa/event-bus-redis",
          options: { redisUrl },
        },
        {
          resolve: "@medusajs/medusa/workflow-engine-redis",
          options: { redis: { redisUrl } },
        },
      ]
    : [],
})
