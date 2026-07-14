import { describe, expect, it } from 'vitest';
import { safeFilename, signDownloadTicket, verifyDownloadTicket } from './download-ticket';

describe('tickets de descarga', () => {
  it('firma y verifica una selección temporal', async () => {
    const payload = { version: 1 as const, quality: 'webp' as const, expiresAt: Date.now() + 60_000, archiveName: 'roma.zip', items: [{ key: 'roma/foto.jpg', name: 'foto.webp' }] };
    const token = await signDownloadTicket(payload, 'secreto-de-descarga');
    expect(await verifyDownloadTicket(token, 'secreto-de-descarga')).toEqual(payload);
    expect(await verifyDownloadTicket(token, 'otro-secreto')).toBeNull();
  });

  it('normaliza nombres seguros para el ZIP', () => {
    expect(safeFilename('Basílica de San Pedro / Roma')).toBe('basilica-de-san-pedro-roma');
  });
});
