# Peregrinación Motril · Roma

Álbum privado de cinco días construido con Astro SSR, Preact y Tailwind CSS. Incluye portada pública, acceso por contraseña, cronología general y diaria, fichas editoriales de cada lugar, galería accesible, selección persistente y descargas ZIP mediante Cloudflare Workers + R2 + Images.

## Puesta en marcha

1. Instala dependencias con `pnpm install`.
2. Copia `.env.example` a `.env` y sustituye todos los secretos.
3. Arranca Astro en segundo plano con `pnpm dev`.
4. Consulta el estado con `pnpm dev:status`, los registros con `pnpm dev:logs` y detenlo con `pnpm dev:stop`.

La contraseña local incluida en `.env` es solo para desarrollo. `.env` está ignorado por Git; `.env.example` documenta las variables sin contener secretos reales.

## Comprobaciones

- `pnpm check`: tipos y componentes Astro.
- `pnpm test`: dominio, sesiones, tickets y contenido.
- `pnpm build`: build SSR de producción para Vercel.

## Medios y Cloudflare

El frontend y la autenticación se despliegan en Vercel. El Worker de `workers/media` sirve originales privados desde R2, genera variantes WebP con Cloudflare Images y construye ZIP en streaming. La descarga predefinida es WebP de alta calidad sin reducir las dimensiones; el original queda como opción explícita.

Para configurar Cloudflare:

1. Crea el bucket R2 indicado en `workers/media/wrangler.jsonc`.
2. Sustituye el identificador de la cuenta y configura `MEDIA_TICKET_SECRET` como secreto de Wrangler.
3. Ajusta `ALLOWED_ORIGIN` al dominio definitivo.
4. Despliega con `pnpm worker:deploy` y copia su URL a `MEDIA_WORKER_URL`.

Las URLs fotográficas actuales son contenido provisional WebP de Unsplash para poder revisar la interfaz. Al cargar el material real, conserva las claves `roma/...` descritas en `src/data/pilgrimage.ts`. No se usan ilustraciones SVG: los únicos SVG permitidos son los iconos de Lucide.
