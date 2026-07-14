const encoder = new TextEncoder();
export const SESSION_COOKIE = 'peregrinacion_session';

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64Url(value: string) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

export async function safeEqual(left: string, right: string) {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}

export async function createSessionToken(secret: string, maxAgeSeconds = 60 * 60 * 24 * 30) {
  const payload = toBase64Url(encoder.encode(JSON.stringify({ version: 1, expiresAt: Date.now() + maxAgeSeconds * 1000 })));
  const signature = toBase64Url(await hmac(payload, secret));
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined, secret: string) {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = await hmac(payload, secret);
  const actual = fromBase64Url(signature);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected[index] ^ actual[index];
  if (difference !== 0) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as { expiresAt?: number };
    return typeof data.expiresAt === 'number' && data.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function getAuthConfig() {
  const isProduction = import.meta.env.PROD;
  const password = import.meta.env.APP_PASSWORD || (isProduction ? '' : 'roma2026');
  const sessionSecret = import.meta.env.SESSION_SECRET || (isProduction ? '' : 'dev-session-secret-change-me');
  return { password, sessionSecret, configured: Boolean(password && sessionSecret) };
}

