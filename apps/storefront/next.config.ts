import type { NextConfig } from "next"

const backend = new URL(
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
)

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Desarrollo: permite abrir la tienda y el panel desde el celular en la misma red Wi-Fi
  // (http://IP-DE-LA-PC:8000/panel). Agregar más con DEV_LAN_ORIGINS="ip1,ip2".
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    ...(process.env.DEV_LAN_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? []),
  ],
  partialPrefetching: true,
  images: {
    remotePatterns: [
      {
        protocol: backend.protocol.replace(":", "") as "http" | "https",
        hostname: backend.hostname,
        port: backend.port,
      },
      // Imágenes de ejemplo del seed. Se reemplazan por Cloudflare R2 en la fase 1.
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
