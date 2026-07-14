import type { APIRoute } from 'astro';
import { pilgrimage } from '../../data/pilgrimage';
import { safeFilename, signDownloadTicket, type DownloadTicketPayload } from '../../domain/download-ticket';

interface RequestBody { dayId?: string; photoIds?: string[]; quality?: 'webp' | 'original'; }

export const POST: APIRoute = async ({ request }) => {
  const secret = import.meta.env.MEDIA_TICKET_SECRET;
  const workerUrl = import.meta.env.MEDIA_WORKER_URL?.replace(/\/$/, '');
  if (!secret || !workerUrl) return Response.json({ error: 'La descarga todavía no está conectada con Cloudflare. Revisa MEDIA_TICKET_SECRET y MEDIA_WORKER_URL.' }, { status: 503 });

  let body: RequestBody;
  try { body = await request.json(); } catch { return Response.json({ error: 'La selección enviada no es válida.' }, { status: 400 }); }
  const day = pilgrimage.days.find((candidate) => candidate.id === body.dayId);
  if (!day) return Response.json({ error: 'No se ha encontrado la jornada.' }, { status: 404 });
  const quality = body.quality === 'original' ? 'original' : 'webp';
  const requested = new Set(Array.isArray(body.photoIds) ? body.photoIds : []);
  const available = day.places.flatMap((place) => place.photos.map((photo) => ({ photo, place }))).filter(({ photo }) => requested.has(photo.id));
  if (!available.length) return Response.json({ error: 'Selecciona al menos una fotografía.' }, { status: 400 });
  if (available.length !== requested.size) return Response.json({ error: 'La selección contiene fotografías que no pertenecen a esta jornada.' }, { status: 400 });

  const maxCount = quality === 'webp' ? 100 : 50;
  const maxBytes = 500_000_000;
  const groups: typeof available[] = [];
  let current: typeof available = [];
  let currentBytes = 0;
  for (const item of available) {
    const size = quality === 'webp' ? item.photo.webpBytes : item.photo.originalBytes;
    if (current.length && (current.length >= maxCount || currentBytes + size > maxBytes)) { groups.push(current); current = []; currentBytes = 0; }
    current.push(item); currentBytes += size;
  }
  if (current.length) groups.push(current);

  const batches = await Promise.all(groups.map(async (group, index) => {
    const payload: DownloadTicketPayload = {
      version: 1,
      quality,
      expiresAt: Date.now() + 5 * 60 * 1000,
      archiveName: `roma-dia-${day.number}-${index + 1}-de-${groups.length}.zip`,
      items: group.map(({ photo, place }, photoIndex) => ({
        key: photo.objectKey,
        name: `dia-${String(day.number).padStart(2, '0')}/${safeFilename(place.name)}/${String(photoIndex + 1).padStart(3, '0')}-${safeFilename((photo.objectKey.split('/').pop() || photo.id).replace(/\.[^.]+$/, ''))}.${quality === 'webp' ? 'webp' : photo.objectKey.split('.').pop() || 'jpg'}`,
      })),
    };
    const estimatedBytes = group.reduce((total, { photo }) => total + (quality === 'webp' ? photo.webpBytes : photo.originalBytes), 0);
    return { label: `Parte ${index + 1} de ${groups.length}`, count: group.length, estimatedBytes, url: `${workerUrl}/zip?ticket=${encodeURIComponent(await signDownloadTicket(payload, secret))}` };
  }));

  return Response.json({ batches }, { headers: { 'Cache-Control': 'no-store' } });
};
