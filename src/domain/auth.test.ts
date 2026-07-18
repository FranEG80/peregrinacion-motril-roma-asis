import { describe, expect, it } from 'vitest';
import { createSessionToken, resolveAuthConfig, safeEqual, verifySessionToken } from './auth';

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

  it('deja el álbum público cuando APP_PASSWORD está vacío', () => {
    expect(resolveAuthConfig({ APP_PASSWORD: '  ', SESSION_SECRET: '' })).toEqual({
      mode: 'public',
      password: '',
      sessionSecret: '',
      configured: true,
    });
  });

  it('activa el modo privado solo cuando hay contraseña', () => {
    expect(resolveAuthConfig({ APP_PASSWORD: 'roma', SESSION_SECRET: 'sesion' })).toEqual({
      mode: 'private',
      password: 'roma',
      sessionSecret: 'sesion',
      configured: true,
    });
  });

  it('detecta el modo privado incompleto si falta el secreto de sesión', () => {
    expect(resolveAuthConfig({ APP_PASSWORD: 'roma' })).toMatchObject({
      mode: 'private',
      configured: false,
    });
  });
});
