import { describe, expect, it } from 'vitest';
import { safeFilename, signDownloadTicket, verifyDownloadTicket } from './download-ticket';

describe('tickets de descarga', () => {
  it('firma y verifica una selección temporal', async () => {
    const payload = { version: 2 as const, quality: 'stored' as const, expiresAt: Date.now() + 60_000, archiveName: 'roma.zip', keys: ['07julio2026/foto.webp', '07julio2026/video.mp4'] };
    const token = await signDownloadTicket(payload, 'secreto-de-descarga');
    expect(await verifyDownloadTicket(token, 'secreto-de-descarga')).toEqual(payload);
    expect(await verifyDownloadTicket(token, 'otro-secreto')).toBeNull();
  });

  it('rechaza versiones, límites y claves no permitidas', async () => {
    const common = { version: 2 as const, quality: 'stored' as const, expiresAt: Date.now() + 60_000, archiveName: 'roma.zip' };
    const invalidKeys = [
      ['roma/foto.webp'],
      ['thumbnail/07julio2026/foto.webp'],
      ['07julio2026/carpeta/foto.webp'],
      ['07julio2026/../foto.webp'],
      [],
      Array.from({ length: 301 }, (_, index) => `07julio2026/foto-${index}.webp`),
    ];

    for (const keys of invalidKeys) {
      const token = await signDownloadTicket({ ...common, keys }, 'secreto-de-descarga');
      expect(await verifyDownloadTicket(token, 'secreto-de-descarga')).toBeNull();
    }
  });

  it('normaliza nombres seguros para el ZIP', () => {
    expect(safeFilename('Basílica de San Pedro / Roma')).toBe('basilica-de-san-pedro-roma');
  });
});
