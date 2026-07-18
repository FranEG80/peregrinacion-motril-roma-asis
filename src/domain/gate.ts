import type { AuthConfig } from './auth';

export type GateDecision = 'allow-public' | 'allow-session' | 'redirect-login';

const protectedPrefixes = ['/album'];

export function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function decideGate(
  pathname: string,
  config: Pick<AuthConfig, 'mode' | 'configured'>,
  hasValidSession: boolean,
): GateDecision {
  if (!isProtectedPath(pathname) || config.mode === 'public') return 'allow-public';
  if (config.configured && hasValidSession) return 'allow-session';
  return 'redirect-login';
}
