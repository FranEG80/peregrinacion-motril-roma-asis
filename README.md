# Peregrinación Motril · Roma

Álbum digital de la peregrinación **Motril → Roma → Asís** (7–11 julio 2026): cinco días entre basílicas, memoria y camino.

Este proyecto es el recuerdo compartido del viaje. Reúne fotografías y vídeos de cada jornada, ordenados tal como ocurrieron, junto a fichas de cada lugar visitado — historia, contexto y lo que vivió el grupo allí. No es solo una galería: es un diario ilustrado del peregrinaje, pensado para revivirlo y para compartirlo con quienes no pudieron estar.

## Qué encontrarás

- **Cronología completa**, día a día, desde la salida hasta la vuelta.
- **Fichas de lugar**: cada basílica, plaza o parada tiene una breve explicación de su historia y su lugar en la peregrinación.
- **Ubicación de cada foto**: gracias al GPS de las propias imágenes, cada foto indica dónde se tomó — el lugar exacto o "cerca de..." cuando no coincide con un punto de interés conocido.
- **Galería accesible y con buscador**, para encontrar rápido un lugar, un día o un momento concreto.
- **Descargas en ZIP**, por día completo o por parada, con las fotos y vídeos tal como se guardaron.
- **Acceso público o privado**: el álbum puede abrirse a cualquiera o protegerse con contraseña, según se necesite en cada momento.

Las ubicaciones y algunas descripciones se han generado con ayuda de Inteligencia Artificial a partir de los metadatos de las fotos; si alguna identificación no es correcta, se agradece el aviso.

---

## Notas técnicas

Construido con Astro SSR, Preact y Tailwind CSS. Medios servidos desde Cloudflare R2 vía un Worker dedicado.

### Puesta en marcha

1. Instala dependencias con `pnpm install`.
2. Copia `.env.example` a `.env`. Deja `APP_PASSWORD` vacío si el álbum debe ser público; para el modo privado configura también `SESSION_SECRET`.
3. Arranca Astro en segundo plano con `pnpm dev`.
4. Consulta el estado con `pnpm dev:status`, los registros con `pnpm dev:logs` y detenlo con `pnpm dev:stop`.

La contraseña local incluida en `.env` es solo para desarrollo. `.env` está ignorado por Git; `.env.example` documenta las variables sin contener secretos reales.

### Comprobaciones

- `pnpm check`: tipos y componentes Astro.
- `pnpm test`: dominio, sesiones, archivos y contenido.
- `pnpm build`: build SSR de producción para Vercel.

### Medios y Cloudflare

El frontend y la autenticación se despliegan en Vercel. El Worker de `workers/media` sirve archivos desde R2 y genera variantes WebP con Cloudflare Images. Los ZIP se generan una sola vez, incluyen fotografías WebP y vídeos MP4 tal como están almacenados y se sirven directamente desde R2.

Para configurar Cloudflare:

1. Crea el bucket R2 indicado en `workers/media/wrangler.jsonc`.
2. Ajusta `ALLOWED_ORIGIN` al dominio definitivo.
3. Genera y sube los ZIP fijos con `pnpm archives:upload`.
4. Despliega el Worker de imágenes con `pnpm worker:deploy`.

Los ZIP quedan en `downloads/` dentro del bucket y los botones enlazan directamente a esos objetos; pulsarlos no ejecuta ningún proceso de generación. Las claves de medios deben seguir el formato `07julio2026/archivo.webp` (o el día equivalente). No se usan ilustraciones SVG: los únicos SVG permitidos son los iconos de Lucide.
