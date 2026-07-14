const encoder = new TextEncoder();

export interface DownloadTicketPayload {
  version: 1;
  quality: 'webp' | 'original';
  expiresAt: number;
  archiveName: string;
  items: Array<{ key: string; name: string }>;
}

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function decodeBase64Url(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
}

async function signature(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

export async function signDownloadTicket(payload: DownloadTicketPayload, secret: string) {
  const encoded = base64Url(encoder.encode(JSON.stringify(payload)));
  return `${encoded}.${base64Url(await signature(encoded, secret))}`;
}

export async function verifyDownloadTicket(token: string, secret: string): Promise<DownloadTicketPayload | null> {
  const [encoded, provided] = token.split('.');
  if (!encoded || !provided) return null;
  const expected = await signature(encoded, secret);
  const actual = decodeBase64Url(provided);
  if (expected.length !== actual.length) return null;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected[index] ^ actual[index];
  if (difference !== 0) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded))) as DownloadTicketPayload;
    if (payload.version !== 1 || payload.expiresAt <= Date.now() || !['webp', 'original'].includes(payload.quality) || !Array.isArray(payload.items)) return null;
    return payload;
  } catch { return null; }
}

export function safeFilename(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

