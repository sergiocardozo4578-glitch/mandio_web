import type { NextConfig } from "next"

const backend = new URL(
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
)

const nextConfig: NextConfig = {
  devIndicators: false,
  cacheComponents: true,
  // Desarrollo: permite abrir la tienda y el panel desde el celular en la misma red Wi-Fi
  // (http://IP-DE-LA-PC:8000/panel). Agregar más con DEV_LAN_ORIGINS="ip1,ip2".
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
    ...(process.env.DEV_LAN_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? []),
  ],
  partialPrefetching: true,
  images: {
    // En desarrollo las fotos que se suben desde el panel quedan en el backend local
    // (http://localhost:9000/static/...). Next 16 bloquea por defecto optimizar imágenes
    // de IPs locales (protección SSRF): se permite solo fuera de producción.
    // En producción las fotos van a Cloudflare R2 y esto queda desactivado.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
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
