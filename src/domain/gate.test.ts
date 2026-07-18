import { describe, expect, it } from 'vitest';
import { decideGate, isProtectedPath } from './gate';

describe('puerta de acceso', () => {
  it('reconoce las páginas protegidas del álbum', () => {
    expect(isProtectedPath('/album')).toBe(true);
    expect(isProtectedPath('/album/dia/primer-dia-en-roma')).toBe(true);
    expect(isProtectedPath('/api/download-tickets')).toBe(false);
    expect(isProtectedPath('/api/access')).toBe(false);
  });

  it('permite el álbum sin sesión en modo público', () => {
    expect(decideGate('/album', { mode: 'public', configured: true }, false)).toBe('allow-public');
  });

  it('acepta una sesión válida en modo privado', () => {
    expect(decideGate('/album', { mode: 'private', configured: true }, true)).toBe('allow-session');
  });

  it('redirige las páginas privadas sin sesión', () => {
    const config = { mode: 'private' as const, configured: true };
    expect(decideGate('/album', config, false)).toBe('redirect-login');
  });
});
