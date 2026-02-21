import crypto from 'node:crypto';
import { getJwtSecret } from '../../services/auth-service';

type PortalSessionHeaderV1 = { alg: 'HS256'; typ: 'EW_PORTAL_SESSION_V1' };
type PortalSessionPayloadV1 = { sessionId: string; userId: string; iat: number; exp: number };

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

export function signPortalSessionV1(args: { sessionId: string; userId: string; expiresInSeconds?: number }): string {
  const sessionId = String(args.sessionId || '').trim();
  const userId = String(args.userId || '').trim();
  if (!sessionId) throw new Error('sessionId is required');
  if (!userId) throw new Error('userId is required');

  const now = Math.floor(Date.now() / 1000);
  const expiresInSeconds = Math.max(60, Math.min(60 * 60 * 24 * 7, Math.trunc(Number(args.expiresInSeconds ?? 60 * 60 * 8))));

  const header: PortalSessionHeaderV1 = { alg: 'HS256', typ: 'EW_PORTAL_SESSION_V1' };
  const payload: PortalSessionPayloadV1 = { sessionId, userId, iat: now, exp: now + expiresInSeconds };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = signHs256(signingInput, getJwtSecret());
  return `${signingInput}.${signature}`;
}

export function verifyPortalSessionV1(token: string): { sessionId: string; userId: string } | null {
  try {
    const t = String(token || '').trim();
    if (!t) return null;
    const parts = t.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, signature] = parts;
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const expected = signHs256(signingInput, getJwtSecret());
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;

    const headerJson = base64UrlDecodeToString(encodedHeader);
    const header = JSON.parse(headerJson) as PortalSessionHeaderV1;
    if (header.alg !== 'HS256' || header.typ !== 'EW_PORTAL_SESSION_V1') return null;

    const payloadJson = base64UrlDecodeToString(encodedPayload);
    const payload = JSON.parse(payloadJson) as PortalSessionPayloadV1;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.sessionId) return null;
    if (!payload.userId) return null;
    if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
    return { sessionId: String(payload.sessionId).trim(), userId: String(payload.userId).trim() };
  } catch {
    return null;
  }
}

