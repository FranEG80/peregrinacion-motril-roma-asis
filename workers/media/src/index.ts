import { strToU8, Zip, ZipPassThrough } from 'fflate';
import { verifyDownloadTicket, type DownloadTicketPayload } from '../../../src/domain/download-ticket';

interface R2Body {
  body: ReadableStream<Uint8Array>;
  size: number;
  httpEtag: string;
  httpMetadata?: { contentType?: string; cacheControl?: string };
}

interface R2BucketBinding { get(key: string, options?: unknown): Promise<R2Body | null>; }
interface ImageOutput { response(): Response; }
interface ImageInput { transform(options: Record<string, unknown>): ImageInput; output(options: Record<string, unknown>): ImageOutput; }
interface ImagesBinding { input(stream: ReadableStream<Uint8Array>): ImageInput; }
interface Env {
  MEDIA: R2BucketBinding;
  IMAGES: ImagesBinding;
  MEDIA_TICKET_SECRET: string;
  ALLOWED_ORIGIN: string;
}

const allowedVariants = new Map<string, { width?: number; quality: number }>([
  ['thumb', { width: 480, quality: 84 }],
  ['gallery', { width: 960, quality: 86 }],
  ['lightbox', { width: 1920, quality: 88 }],
  ['download-webp', { quality: 88 }],
]);

function securityHeaders(env: Env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
}

function addTextFile(zip: Zip, name: string, content: string) {
  const entry = new ZipPassThrough(name);
  zip.add(entry);
  entry.push(strToU8(content), true);
}

async function addStream(zip: Zip, name: string, stream: ReadableStream<Uint8Array>) {
  const entry = new ZipPassThrough(name);
  zip.add(entry);
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) entry.push(value, false);
  }
  entry.push(new Uint8Array(), true);
}

async function buildArchive(controller: ReadableStreamDefaultController<Uint8Array>, payload: DownloadTicketPayload, env: Env) {
  const errors: string[] = [];
  const zip = new Zip((error, chunk, final) => {
    if (error) return controller.error(error);
    controller.enqueue(chunk);
    if (final) controller.close();
  });

  addTextFile(zip, 'LEEME.txt', [
    'Peregrinación a Roma',
    '',
    payload.quality === 'webp'
      ? 'Estas fotografías están en WebP de alta calidad (88) y conservan la resolución completa. Se han retirado los metadatos privados, como la ubicación GPS.'
      : 'Estas fotografías son los archivos originales y pueden conservar metadatos de la cámara y ubicación.',
    '',
    'Este álbum es privado. No publiques fotografías de otras personas sin su permiso.',
  ].join('\n'));

  for (const item of payload.items) {
    if (!item.key.startsWith('roma/') || item.key.includes('..')) { errors.push(`${item.name}: ruta no permitida`); continue; }
    try {
      const object = await env.MEDIA.get(item.key);
      if (!object) { errors.push(`${item.name}: no encontrado`); continue; }
      if (payload.quality === 'webp') {
        const response = env.IMAGES.input(object.body).output({ format: 'image/webp', quality: 88 }).response();
        if (!response.ok || !response.body) { errors.push(`${item.name}: no se pudo convertir a WebP`); continue; }
        await addStream(zip, item.name, response.body);
      } else {
        await addStream(zip, item.name, object.body);
      }
    } catch (error) {
      errors.push(`${item.name}: ${error instanceof Error ? error.message : 'error desconocido'}`);
    }
  }

  if (errors.length) addTextFile(zip, 'ERRORES.txt', `No se han podido incluir estos archivos:\n\n${errors.join('\n')}`);
  zip.end();
}

async function zipResponse(url: URL, env: Env) {
  const token = url.searchParams.get('ticket');
  if (!token || !env.MEDIA_TICKET_SECRET) return new Response('Ticket no válido.', { status: 401 });
  const payload = await verifyDownloadTicket(token, env.MEDIA_TICKET_SECRET);
  if (!payload || payload.items.length > (payload.quality === 'webp' ? 100 : 50)) return new Response('Ticket caducado o no válido.', { status: 401 });
  const stream = new ReadableStream<Uint8Array>({ start(controller) { void buildArchive(controller, payload, env); } });
  return new Response(stream, {
    headers: {
      ...securityHeaders(env),
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${payload.archiveName.replace(/[^a-zA-Z0-9._-]/g, '-')}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

async function mediaResponse(url: URL, env: Env) {
  const key = decodeURIComponent(url.pathname.slice('/media/'.length));
  if (!key.startsWith('roma/') || key.includes('..')) return new Response('Ruta no permitida.', { status: 400 });
  const object = await env.MEDIA.get(key);
  if (!object) return new Response('No encontrado.', { status: 404 });
  const variantName = url.searchParams.get('variant');
  const variant = variantName ? allowedVariants.get(variantName) : undefined;
  if (variantName && !variant) return new Response('Variante no permitida.', { status: 400 });
  if (variant) {
    let input = env.IMAGES.input(object.body);
    if (variant.width) input = input.transform({ width: variant.width, fit: 'scale-down' });
    const response = input.output({ format: 'image/webp', quality: variant.quality }).response();
    const headers = new Headers(response.headers);
    Object.entries(securityHeaders(env)).forEach(([key, value]) => headers.set(key, value));
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return new Response(response.body, { status: response.status, headers });
  }
  const headers = new Headers({ ...securityHeaders(env), 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream', ETag: object.httpEtag, 'Cache-Control': 'public, max-age=86400' });
  return new Response(object.body, { headers });
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: securityHeaders(env) });
    if (request.method !== 'GET') return new Response('Método no permitido.', { status: 405 });
    if (url.pathname === '/health') return Response.json({ ok: true });
    if (url.pathname === '/zip') return zipResponse(url, env);
    if (url.pathname.startsWith('/media/')) return mediaResponse(url, env);
    return new Response('No encontrado.', { status: 404 });
  },
};
