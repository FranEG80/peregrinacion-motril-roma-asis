import { describe, expect, it } from 'vitest';
import type { GalleryDay, GalleryMedia } from '../data/gallery';
import { buildZipTicket, InvalidZipRequestError } from './zip-request';

function media(id: string, key = `07julio2026/${id}.webp`): GalleryMedia {
  return {
    id,
    key,
    mediaType: key.endsWith('.mp4') ? 'video' : 'image',
    capturedAt: '2026-07-07T10:00:00',
    title: id,
    caption: id,
    keywords: [],
    src: `https://media.test/${key}`,
    thumbnailSrc: `https://media.test/thumbnail/${key}`,
  };
}

const day: GalleryDay = {
  id: 'day-1',
  number: 1,
  slug: 'primer-dia-en-roma',
  date: '2026-07-07',
  city: 'Roma',
  title: 'Llegada a Roma',
  summary: 'Resumen',
  cover: 'cover.webp',
  blocks: [
    { id: 'primer-dia-en-roma-1', title: 'Basílica de San Pedro', summary: 'Resumen', description: 'Descripción', media: [media('a'), media('b', '07julio2026/b.mp4')] },
    { id: 'primer-dia-en-roma-2', title: 'Otra parada', summary: 'Resumen', description: 'Descripción', media: [media('a')] },
  ],
};

describe('peticiones ZIP', () => {
  it('construye el ZIP completo y elimina duplicados por id', () => {
    const result = buildZipTicket(day, undefined, 1_000);
    expect(result.archiveName).toBe('dia-1-primer-dia-en-roma.zip');
    expect(result.fileCount).toBe(2);
    expect(result.expiresAt).toBe(901_000);
    expect(result.payload.keys).toEqual(['07julio2026/a.webp', '07julio2026/b.mp4']);
  });

  it('construye un ZIP para una parada concreta', () => {
    const result = buildZipTicket(day, 'primer-dia-en-roma-1', 1_000);
    expect(result.archiveName).toBe('dia-1-basilica-de-san-pedro.zip');
    expect(result.fileCount).toBe(2);
  });

  it('rechaza una parada inexistente o vacía', () => {
    expect(() => buildZipTicket(day, 'desconocida')).toThrow(InvalidZipRequestError);
    const emptyDay = { ...day, blocks: [{ ...day.blocks[0], media: [] }] };
    expect(() => buildZipTicket(emptyDay, emptyDay.blocks[0].id)).toThrow('La selección no contiene archivos.');
  });
});
