import { strToU8, Zip, ZipPassThrough } from 'fflate';
import { verifyDownloadTicket, type DownloadTicketPayload } from '../../../src/domain/download-ticket';

const allowedVariants = new Map<string, { width?: number; quality: number }>([
  ['thumb', { width: 480, quality: 84 }],
  ['gallery', { width: 960, quality: 86 }],
  ['lightbox', { width: 1920, quality: 88 }],
  ['download-webp', { quality: 88 }],
]);
const storedMediaKeyPattern = /^\d{2}julio2026\/[^/]+$/;
const servedMediaKeyPattern = /^(?:thumbnail\/)?\d{2}julio2026\/[^/]+$/;
const imageExtensionPattern = /\.(?:avif|jpe?g|png|webp)$/i;

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
    'Este ZIP contiene las fotografías y los vídeos tal como están guardados en el álbum (WebP y MP4).',
    '',
    'Este álbum es privado. No publiques fotografías de otras personas sin su permiso.',
  ].join('\n'));

  for (const key of payload.keys) {
    const name = key.split('/').pop() || 'archivo';
    if (key.includes('..') || !storedMediaKeyPattern.test(key)) { errors.push(`${name}: ruta no permitida`); continue; }
    try {
      const object = await env.MEDIA.get(key);
      if (!object) { errors.push(`${name}: no encontrado`); continue; }
      await addStream(zip, name, object.body);
    } catch (error) {
      errors.push(`${name}: ${error instanceof Error ? error.message : 'error desconocido'}`);
    }
  }

  if (errors.length) addTextFile(zip, 'ERRORES.txt', `No se han podido incluir estos archivos:\n\n${errors.join('\n')}`);
  zip.end();
}

async function zipResponse(url: URL, env: Env) {
  const token = url.searchParams.get('ticket');
  if (!token || !env.MEDIA_TICKET_SECRET) return new Response('Ticket no válido.', { status: 401 });
  const payload = await verifyDownloadTicket(token, env.MEDIA_TICKET_SECRET);
  if (!payload || payload.keys.length > 300) return new Response('Ticket caducado o no válido.', { status: 401 });
  const stream = new ReadableStream<Uint8Array>({ start(controller) { return buildArchive(controller, payload, env); } });
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
  if (key.includes('..') || !servedMediaKeyPattern.test(key)) return new Response('Ruta no permitida.', { status: 400 });
  const object = await env.MEDIA.get(key);
  if (!object) return new Response('No encontrado.', { status: 404 });
  const variantName = url.searchParams.get('variant');
  const variant = variantName ? allowedVariants.get(variantName) : undefined;
  if (variantName && !variant) return new Response('Variante no permitida.', { status: 400 });
  if (variant && !imageExtensionPattern.test(key)) return new Response('La variante solo admite imágenes.', { status: 400 });
  if (variant) {
    let input = env.IMAGES.input(object.body);
    if (variant.width) input = input.transform({ width: variant.width, fit: 'scale-down' });
    const output = await input.output({ format: 'image/webp', quality: variant.quality });
    const response = output.response();
    const headers = new Headers(response.headers);
    Object.entries(securityHeaders(env)).forEach(([key, value]) => headers.set(key, value));
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return new Response(response.body, { status: response.status, headers });
  }
  const headers = new Headers({ ...securityHeaders(env), 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream', ETag: object.httpEtag, 'Cache-Control': 'public, max-age=86400' });
  return new Response(object.body, { headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: securityHeaders(env) });
    if (request.method !== 'GET') return new Response('Método no permitido.', { status: 405 });
    if (url.pathname === '/health') return Response.json({ ok: true });
    if (url.pathname === '/zip') return zipResponse(url, env);
    if (url.pathname.startsWith('/media/')) return mediaResponse(url, env);
    return new Response('No encontrado.', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
