# Peregrinación Motril · Roma

Álbum privado de cinco días construido con Astro SSR, Preact y Tailwind CSS. Incluye portada pública, acceso por contraseña, cronología general y diaria, fichas editoriales de cada lugar, galería accesible, selección persistente y descargas ZIP mediante Cloudflare Workers + R2 + Images.

## Puesta en marcha

1. Instala dependencias con `pnpm install`.
2. Copia `.env.example` a `.env`. Deja `APP_PASSWORD` vacío si el álbum debe ser público; para el modo privado configura también `SESSION_SECRET`.
3. Arranca Astro en segundo plano con `pnpm dev`.
4. Consulta el estado con `pnpm dev:status`, los registros con `pnpm dev:logs` y detenlo con `pnpm dev:stop`.

La contraseña local incluida en `.env` es solo para desarrollo. `.env` está ignorado por Git; `.env.example` documenta las variables sin contener secretos reales.

## Comprobaciones

- `pnpm check`: tipos y componentes Astro.
- `pnpm test`: dominio, sesiones, tickets y contenido.
- `pnpm build`: build SSR de producción para Vercel.

## Medios y Cloudflare

El frontend y la autenticación se despliegan en Vercel. El Worker de `workers/media` sirve los archivos desde R2, genera variantes WebP con Cloudflare Images y construye ZIP en streaming. Los ZIP incluyen fotografías WebP y vídeos MP4 tal como están almacenados en R2.

Para configurar Cloudflare:

1. Crea el bucket R2 indicado en `workers/media/wrangler.jsonc`.
2. Configura `MEDIA_TICKET_SECRET` como secreto de Wrangler y usa exactamente el mismo valor en Vercel.
3. Ajusta `ALLOWED_ORIGIN` al dominio definitivo.
4. Despliega con `pnpm worker:deploy` y copia su URL, sin barra final, a `MEDIA_WORKER_URL` en Vercel.

Las claves de medios deben seguir el formato `07julio2026/archivo.webp` (o el día equivalente). No se usan ilustraciones SVG: los únicos SVG permitidos son los iconos de Lucide.
