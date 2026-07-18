import type { APIRoute } from 'astro';
import { createSessionToken, getAuthConfig, safeEqual, SESSION_COOKIE } from '../../domain/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const wantsJson = request.headers.get('accept')?.includes('application/json');
  const config = getAuthConfig();

  if (config.mode === 'public') {
    return wantsJson ? Response.json({ ok: true, redirectTo: '/album' }) : redirect('/album', 303);
  }

  const form = await request.formData();
  const password = String(form.get('password') || '');
  const requestedReturn = String(form.get('returnTo') || '/album');
  const returnTo = requestedReturn.startsWith('/album') ? requestedReturn : '/album';

  if (!config.configured) {
    const message = 'El acceso privado todavía no está configurado.';
    return wantsJson ? Response.json({ error: message }, { status: 503 }) : redirect('/acceso?config=missing', 303);
  }

  if (!(await safeEqual(password, config.password))) {
    const message = 'La contraseña no es correcta. Revísala e inténtalo de nuevo.';
    return wantsJson ? Response.json({ error: message }, { status: 401 }) : redirect(`/acceso?error=1&returnTo=${encodeURIComponent(returnTo)}`, 303);
  }

  cookies.set(SESSION_COOKIE, await createSessionToken(config.sessionSecret), {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return wantsJson ? Response.json({ ok: true, redirectTo: returnTo }) : redirect(returnTo, 303);
};
