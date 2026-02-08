/**
 * Auth Service (JWT)
 *
 * Minimal HS256 JWT implementation for EverWatt Engine.
 * - No external deps
 * - Intended for API auth + role checks
 */

import crypto from 'crypto';
import type { UserRole } from '../backend/admin/types';

export type AuthUser = {
  userId: string;
  email?: string;
  role?: UserRole;
};

type JwtHeader = {
  alg: 'HS256';
  typ: 'JWT';
};

type JwtPayload = {
  sub: string;
  email?: string;
  role?: UserRole;
  iat: number;
  exp: number;
};

function base64UrlEncode(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecodeToString(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64').toString('utf-8');
}

function signHs256(data: string, secret: string): string {
  return base64UrlEncode(crypto.createHmac('sha256', secret).update(data).digest());
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || process.env.AUTH_SECRET || 'dev-insecure-secret-change-me';
}

export function signJwt(user: AuthUser, expiresInSeconds: number = 60 * 60 * 24): string {
  const now = Math.floor(Date.now() / 1000);
  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
  const payload: JwtPayload = {
    sub: user.userId,
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = signHs256(signingInput, getJwtSecret());
  return `${signingInput}.${signature}`;
}

export function verifyJwt(token: string): AuthUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const expected = signHs256(signingInput, getJwtSecret());

    // Timing safe compare
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;

    const headerJson = base64UrlDecodeToString(encodedHeader);
    const header = JSON.parse(headerJson) as JwtHeader;
    if (header.alg !== 'HS256') return null;

    const payloadJson = base64UrlDecodeToString(encodedPayload);
    const payload = JSON.parse(payloadJson) as JwtPayload;

    const now = Math.floor(Date.now() / 1000);
    if (!payload.sub) return null;
    if (typeof payload.exp !== 'number' || payload.exp <= now) return null;

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function getBearerTokenFromAuthHeader(authHeader: string | undefined | null): string | null {
  if (!authHeader) return null;
  const trimmed = authHeader.trim();
  if (!/^bearer\s+/i.test(trimmed)) return null;
  return trimmed.replace(/^bearer\s+/i, '').trim() || null;
}
