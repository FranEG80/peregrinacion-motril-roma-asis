import { describe, expect, it } from 'vitest';
import { createSessionToken, safeEqual, verifySessionToken } from './auth';

describe('sesiones de acceso', () => {
  it('acepta un token firmado y rechaza uno manipulado', async () => {
    const token = await createSessionToken('un-secreto-suficientemente-largo');
    expect(await verifySessionToken(token, 'un-secreto-suficientemente-largo')).toBe(true);
    expect(await verifySessionToken(`${token}x`, 'un-secreto-suficientemente-largo')).toBe(false);
  });

  it('compara contraseñas sin depender de su longitud', async () => {
    expect(await safeEqual('roma', 'roma')).toBe(true);
    expect(await safeEqual('roma', 'motril')).toBe(false);
  });
});
