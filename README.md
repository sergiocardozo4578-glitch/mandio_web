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
