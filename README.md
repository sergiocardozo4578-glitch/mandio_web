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

## Compras (fase 2)

- **Carrito** (`/carrito`): agregar desde la ficha, cambiar cantidades, quitar, cupones de descuento (Admin → Promotions). El id del carrito va en una cookie httpOnly; Medusa valida el stock.
- **Checkout** (`/checkout`): datos con CI o RUC + razón social (factura), entrega (retiro, delivery o encomienda con departamento/ciudad/barrio/dirección/referencia) y pago: **transferencia, contra entrega o coordinar por WhatsApp**. Bancard se agrega más adelante como otro proveedor de pago.
- **Confirmación** (`/pedido/[id]`): número de pedido, instrucciones de pago y botón de WhatsApp. Los datos bancarios se configuran en `apps/storefront/.env.local` (`BANCO_NOMBRE`, `BANCO_TITULAR`, `BANCO_CUENTA`, `BANCO_DOCUMENTO`, `BANCO_ALIAS`).
- **En el admin**: los pedidos aparecen en Orders como "pago autorizado". El método de pago elegido, el documento y la referencia de entrega están en la metadata del pedido. Cuando llega la transferencia (o se cobra la entrega), se marca el pago como capturado.

## Cargar productos

- **Desde el celular (lo más simple): http://localhost:8000/panel** — se ingresa con la cuenta de admin. Flujo de una prenda por vez: *Sacar foto* o *Elegir de la galería* → precio → nombre → categoría → talles (tocar los disponibles) → cantidad → *Guardar producto*. Recuerda la última categoría y talles para cargar prendas seguidas. Para probarlo en el teléfono durante el desarrollo, con el celular en el mismo Wi-Fi abrir `http://IP-DE-LA-PC:8000/panel` (si Windows pregunta, permitir Node.js en el firewall).

- **Carga rápida por foto** (Admin → menú lateral → *Carga rápida*): subís o sacás fotos de las prendas, cada foto se convierte en una tarjeta con nombre, precio en ₲, categoría, talles y stock por talle. Hay una barra "Aplicar a todas" para cargar el mismo precio, categoría o talles de una vez. Las fotos se achican a 1600 px en WebP antes de subirse. Por detrás usa `POST /admin/uploads` y `POST /admin/carga-rapida` (`apps/backend/src/api/admin/carga-rapida`).
- **En cantidad desde planilla**: Admin → Products → Import (CSV; el admin ofrece la plantilla).
- **Uno por uno con todas las opciones**: Admin → Products → Create.

## Deploy en Railway

Un proyecto con 5 servicios: **Postgres**, **Redis**, **Meilisearch**, **backend** y **storefront**. Los dos servicios de apps se construyen desde la raíz del repo (lo necesita el workspace de pnpm) con Railpack:

| Servicio | Root Directory | Config file path |
|---|---|---|
| backend | `/` (raíz del repo) | `/apps/backend/railway.json` |
| storefront | `/` (raíz del repo) | `/apps/storefront/railway.json` |

Cada `railway.json` define build, start, watch patterns (solo se redeploya si cambia su app o el lockfile/workspace) y política de reinicio. El backend corre las migraciones como *pre-deploy* y arranca desde `.medusa/server` (la salida de `medusa build`, con el admin incluido); healthcheck en `/health`. Ambos escuchan en el `PORT` que asigna Railway (local: 9000 y 8000).

**Variables del backend:** `NODE_ENV=production`, `DATABASE_URL`, `REDIS_URL`, `MEDUSA_BACKEND_URL` (URL pública del backend; también se usa al compilar el admin), `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`, `JWT_SECRET`, `COOKIE_SECRET`, `REVALIDATE_SECRET`, `STOREFRONT_URL`, `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` y, para imágenes en R2, `S3_FILE_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_BUCKET`, `S3_ENDPOINT` (sin S3 las fotos van al disco del contenedor y se pierden en cada deploy).

**Variables del storefront:** `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WHATSAPP`, `MEILISEARCH_HOST`, `MEILISEARCH_SEARCH_KEY`, `REVALIDATE_SECRET` (el mismo que en el backend) y, si se usan, `BANCO_*`.

- El storefront tiene que usar las URLs **públicas** del backend y de Meilisearch: `next build` consulta la API y la red privada de Railway no existe durante el build.
- Las `NEXT_PUBLIC_*` se incrustan al compilar: cambiarlas requiere un redeploy.
- En Railway el storefront arranca con `next start` sin `--port`, así toma el `PORT` que asigna Railway; en local `pnpm start` sigue usando el 8000.

## Problemas conocidos (y cómo evitarlos)

- **No dejar carpetas vacías en `apps/backend/src/api/store` o `src/api/admin`.** Medusa deja de registrar sus rutas core de ese grupo y todo `/store/*` responde 404.
- **La API key pública debe estar ligada a un solo canal de venta.** Con dos, Medusa no puede calcular el stock y las fichas de producto fallan. El seed ya desliga el "Default Sales Channel".
- Al probar la API desde Git Bash en Windows, los acentos enviados con `curl -d` se corrompen. Usar el admin o `node` (fetch) para datos con tildes.
