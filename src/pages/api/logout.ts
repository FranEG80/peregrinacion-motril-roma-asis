import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../domain/auth';

export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return redirect('/', 303);
};

