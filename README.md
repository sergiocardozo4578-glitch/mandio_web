# Mandi'o

Tienda online multi-categoría para Paraguay. Monorepo con:

| App | Tecnología | Puerto local |
|---|---|---|
| `apps/storefront` | Next.js 16 (App Router, Cache Components) + Tailwind 4 | http://localhost:8000 |
| `apps/backend` | Medusa v2 (API + panel admin) | http://localhost:9000 · admin en `/app` |
| `infra/` | Docker: PostgreSQL 16 (5433), Redis 7 (6379), Meilisearch (7700) | |

La arquitectura completa está en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

## Requisitos

- Node.js 22 o superior, pnpm 10 (`npm i -g pnpm@10`), Docker Desktop.
- **La ruta del proyecto no puede tener apóstrofos** (`'`). Medusa no encuentra sus migraciones en rutas como `Mandi'o_web`. Usá una carpeta como `C:\dev\mandio` o mapeá una unidad: `subst M: "C:\ruta\Mandi'o_web"`.

## Primer arranque

```bash
pnpm install
pnpm infra:up                         # Postgres, Redis y Meilisearch
cp apps/backend/.env.template apps/backend/.env
pnpm --filter @mandio/backend db:migrate
pnpm seed                             # región Paraguay (PYG), IVA 10 %, categorías y productos de ejemplo
pnpm --filter @mandio/backend seed:demo    # opcional: 24 productos más y ofertas, para probar el catálogo
pnpm --filter @mandio/backend reindex      # configura e indexa Meilisearch
pnpm --filter @mandio/backend user:admin   # admin@mandio.com.py / mandio1234 (cambiar)
cp apps/storefront/.env.example apps/storefront/.env.local
# pegar en .env.local la API key pública que imprime el seed
pnpm dev                              # levanta backend y storefront
```

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Backend y storefront en modo desarrollo |
| `pnpm build` | Build de producción de todo |
| `pnpm lint` / `pnpm typecheck` | Calidad de código (también corre en CI) |
| `pnpm infra:up` / `pnpm infra:down` | Servicios de Docker |
| `pnpm seed` | Datos iniciales (no hace nada si ya existe la región Paraguay) |
| `pnpm --filter @mandio/backend reindex` | Reindexa la búsqueda (también corre solo cada 30 min y ante cada cambio del catálogo) |

## Cómo se mantiene al día la tienda

1. Se edita algo en el admin (producto, precio, oferta, categoría, stock).
2. Un subscriber de Medusa (`apps/backend/src/subscribers`) reindexa Meilisearch y llama a `POST /api/revalidate` del storefront.
3. Next.js invalida la caché (`revalidateTag`) y la próxima visita ve el cambio.

Importar productos en cantidad: **Admin → Products → Import** (CSV; el admin ofrece la plantilla).

## Problemas conocidos (y cómo evitarlos)

- **No dejar carpetas vacías en `apps/backend/src/api/store` o `src/api/admin`.** Medusa deja de registrar sus rutas core de ese grupo y todo `/store/*` responde 404.
- **La API key pública debe estar ligada a un solo canal de venta.** Con dos, Medusa no puede calcular el stock y las fichas de producto fallan. El seed ya desliga el "Default Sales Channel".
- Al probar la API desde Git Bash en Windows, los acentos enviados con `curl -d` se corrompen. Usar el admin o `node` (fetch) para datos con tildes.
