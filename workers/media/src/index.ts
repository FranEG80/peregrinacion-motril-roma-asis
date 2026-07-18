const allowedVariants = new Map<string, { width?: number; quality: number }>([
  ['thumb', { width: 480, quality: 84 }],
  ['gallery', { width: 960, quality: 86 }],
  ['lightbox', { width: 1920, quality: 88 }],
  ['download-webp', { quality: 88 }],
]);
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
    if (url.pathname.startsWith('/media/')) return mediaResponse(url, env);
    return new Response('No encontrado.', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
