import { defineMiddleware } from 'astro:middleware';
import { getAuthConfig, SESSION_COOKIE, verifySessionToken } from './domain/auth';
import { decideGate, isProtectedPath } from './domain/gate';

function protectPeople(response: Response, privateContent = false) {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  if (privateContent) response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const config = getAuthConfig();
  const protectedRoute = isProtectedPath(context.url.pathname);
  const valid = config.mode === 'private'
    && config.configured
    && await verifySessionToken(context.cookies.get(SESSION_COOKIE)?.value, config.sessionSecret);
  const decision = decideGate(context.url.pathname, config, valid);

  if (decision === 'reject-api') {
    return protectPeople(Response.json({ error: 'Sesión no válida.' }, { status: 401 }), true);
  }

  if (decision === 'redirect-login') {
    const redirectTo = encodeURIComponent(`${context.url.pathname}${context.url.search}`);
    return protectPeople(context.redirect(`/acceso?returnTo=${redirectTo}`, 303), true);
  }

  return protectPeople(await next(), protectedRoute && config.mode === 'private');
});
