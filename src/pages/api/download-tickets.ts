import type { APIRoute } from 'astro';
import { getGalleryDay, r2Url } from '../../data/gallery';

interface RequestBody { dayId?: string; photoIds?: string[]; }

export const POST: APIRoute = async ({ request }) => {
  let body: RequestBody;
  try { body = await request.json(); } catch { return Response.json({ error: 'La selección enviada no es válida.' }, { status: 400 }); }
  const slug = { 'day-1': 'primer-dia-en-roma', 'day-2': 'el-corazon-del-vaticano', 'day-3': 'basilicas-y-roma-imperial', 'day-4': 'asis-y-catacumbas', 'day-5': 'rivotorto-y-regreso' }[body.dayId || ''];
  const day = slug ? await getGalleryDay(slug) : undefined;
  if (!day) return Response.json({ error: 'No se ha encontrado la jornada.' }, { status: 404 });
  const requested = new Set(Array.isArray(body.photoIds) ? body.photoIds : []);
  const available = day.blocks.flatMap((block) => block.media.filter((item) => item.mediaType === 'image').map((photo) => ({ photo, block }))).filter(({ photo }) => requested.has(photo.id));
  if (!available.length) return Response.json({ error: 'Selecciona al menos una fotografía.' }, { status: 400 });
  if (available.length !== requested.size) return Response.json({ error: 'La selección contiene fotografías que no pertenecen a esta jornada.' }, { status: 400 });

  const files = await Promise.all(available.map(async ({ photo }) => ({
    id: photo.id,
    name: photo.key.split('/').pop() || 'foto.webp',
    url: r2Url(photo.key),
  })));

  return Response.json({ files }, { headers: { 'Cache-Control': 'no-store' } });
};
