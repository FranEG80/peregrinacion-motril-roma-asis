import type { GalleryDay, GalleryMedia } from '../data/gallery';
import { safeFilename, type DownloadTicketPayload } from './download-ticket';

export class InvalidZipRequestError extends Error {}

export interface BuiltZipTicket {
  payload: DownloadTicketPayload;
  archiveName: string;
  fileCount: number;
  expiresAt: number;
}

function deduplicateMedia(media: GalleryMedia[]) {
  const seen = new Set<string>();
  return media.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function buildZipTicket(day: GalleryDay, blockId?: string, now = Date.now()): BuiltZipTicket {
  const block = blockId ? day.blocks.find((item) => item.id === blockId) : undefined;
  if (blockId && !block) throw new InvalidZipRequestError('No se ha encontrado la parada solicitada.');

  const media = deduplicateMedia(block ? block.media : day.blocks.flatMap((item) => item.media));
  if (!media.length) throw new InvalidZipRequestError('La selección no contiene archivos.');
  if (media.length > 300) throw new InvalidZipRequestError('La selección supera el límite de 300 archivos.');

  const stem = block
    ? `dia-${day.number}-${safeFilename(block.title)}`
    : `dia-${day.number}-${safeFilename(day.slug)}`;
  const archiveName = `${stem || `dia-${day.number}`}.zip`;
  const expiresAt = now + 15 * 60 * 1000;
  const payload: DownloadTicketPayload = {
    version: 2,
    quality: 'stored',
    expiresAt,
    archiveName,
    keys: media.map((item) => item.key),
  };

  return { payload, archiveName, fileCount: payload.keys.length, expiresAt };
}
