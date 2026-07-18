import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getGalleryDay } from '../../data/gallery';
import { pilgrimage } from '../../data/pilgrimage';
import { signDownloadTicket } from '../../domain/download-ticket';
import { buildZipTicket, InvalidZipRequestError } from '../../domain/zip-request';

const requestSchema = z.object({
  dayId: z.string().min(1),
  blockId: z.string().min(1).optional(),
});

export const POST: APIRoute = async ({ request }) => {
  const secret = import.meta.env.MEDIA_TICKET_SECRET?.trim();
  const workerUrl = import.meta.env.MEDIA_WORKER_URL?.trim().replace(/\/+$/, '');
  if (!secret || !workerUrl) {
    return Response.json(
      { error: 'Las descargas ZIP todavía no están configuradas.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  let unknownBody: unknown;
  try {
    unknownBody = await request.json();
  } catch {
    return Response.json({ error: 'La solicitud no es válida.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const parsed = requestSchema.safeParse(unknownBody);
  if (!parsed.success) {
    return Response.json({ error: 'La jornada o la parada no son válidas.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const sourceDay = pilgrimage.days.find((day) => day.id === parsed.data.dayId);
  if (!sourceDay) {
    return Response.json({ error: 'No se ha encontrado la jornada.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  const day = await getGalleryDay(sourceDay.slug);
  if (!day) {
    return Response.json({ error: 'No se ha encontrado el archivo de la jornada.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const ticket = buildZipTicket(day, parsed.data.blockId);
    const signed = await signDownloadTicket(ticket.payload, secret);
    const url = `${workerUrl}/zip?ticket=${encodeURIComponent(signed)}`;
    return Response.json(
      {
        url,
        archiveName: ticket.archiveName,
        fileCount: ticket.fileCount,
        expiresAt: ticket.expiresAt,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof InvalidZipRequestError) {
      return Response.json({ error: error.message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    throw error;
  }
};
