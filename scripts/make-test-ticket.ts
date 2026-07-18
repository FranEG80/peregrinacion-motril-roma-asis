import { signDownloadTicket, type DownloadTicketPayload } from '../src/domain/download-ticket';

const secret = process.env.MEDIA_TICKET_SECRET?.trim();
const keys = process.argv.slice(2);

if (!secret) throw new Error('Define MEDIA_TICKET_SECRET antes de crear el ticket.');
if (!keys.length) throw new Error('Indica al menos una clave de R2.');

const payload: DownloadTicketPayload = {
  version: 2,
  quality: 'stored',
  expiresAt: Date.now() + 15 * 60 * 1000,
  archiveName: 'prueba-zip-local.zip',
  keys,
};

process.stdout.write(await signDownloadTicket(payload, secret));
