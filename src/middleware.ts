import { defineMiddleware } from 'astro:middleware';
import { getAuthConfig, SESSION_COOKIE, verifySessionToken } from './domain/auth';

const protectedPrefixes = ['/album', '/api/download-tickets'];

export const onRequest = defineMiddleware(async (context, next) => {
  const protectedRoute = protectedPrefixes.some((prefix) => context.url.pathname === prefix || context.url.pathname.startsWith(`${prefix}/`));
  if (!protectedRoute) return next();

  const { sessionSecret, configured } = getAuthConfig();
  const valid = configured && (await verifySessionToken(context.cookies.get(SESSION_COOKIE)?.value, sessionSecret));
  if (!valid) {
    if (context.url.pathname.startsWith('/api/')) return Response.json({ error: 'Sesión no válida.' }, { status: 401 });
    const redirectTo = encodeURIComponent(`${context.url.pathname}${context.url.search}`);
    return context.redirect(`/acceso?returnTo=${redirectTo}`, 303);
  }

  const response = await next();
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return response;
});

