import crypto from 'node:crypto';
import { getJwtSecret } from '../../services/auth-service';

type ShareSessionHeaderV1 = { alg: 'HS256'; typ: 'EW_SHARE_SESSION_V1' };
type ShareSessionPayloadV1 = { shareId: string; tokenHash: string; iat: number; exp: number };

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

export function signShareSessionV1(args: { shareId: string; tokenHash: string; expiresInSeconds?: number }): string {
  const shareId = String(args.shareId || '').trim();
  const tokenHash = String(args.tokenHash || '').trim().toLowerCase();
  if (!shareId) throw new Error('shareId is required');
  if (!/^[0-9a-f]{64}$/.test(tokenHash)) throw new Error('tokenHash must be sha256 hex');
  const now = Math.floor(Date.now() / 1000);
  const expiresInSeconds = Math.max(60, Math.min(60 * 60 * 24 * 7, Math.trunc(Number(args.expiresInSeconds ?? 60 * 60 * 8))));
  const header: ShareSessionHeaderV1 = { alg: 'HS256', typ: 'EW_SHARE_SESSION_V1' };
  const payload: ShareSessionPayloadV1 = { shareId, tokenHash, iat: now, exp: now + expiresInSeconds };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = signHs256(signingInput, getJwtSecret());
  return `${signingInput}.${signature}`;
}

export function verifyShareSessionV1(token: string): { shareId: string; tokenHash: string } | null {
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
    const header = JSON.parse(headerJson) as ShareSessionHeaderV1;
    if (header.alg !== 'HS256' || header.typ !== 'EW_SHARE_SESSION_V1') return null;

    const payloadJson = base64UrlDecodeToString(encodedPayload);
    const payload = JSON.parse(payloadJson) as ShareSessionPayloadV1;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.shareId) return null;
    if (!/^[0-9a-f]{64}$/.test(String(payload.tokenHash || '').trim().toLowerCase())) return null;
    if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
    return { shareId: String(payload.shareId).trim(), tokenHash: String(payload.tokenHash).trim().toLowerCase() };
  } catch {
    return null;
  }
}

