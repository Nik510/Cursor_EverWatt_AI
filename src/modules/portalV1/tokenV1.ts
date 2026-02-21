import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/**
 * Login token (magic link style) plaintext.
 * - Shown once to staff and copy/pasteable.
 * - Stored only as a hash in the portal store.
 */
export function generatePortalLoginTokenPlainV1(): string {
  // 32 bytes -> base64url (no padding)
  return base64UrlEncode(randomBytes(32));
}

export function sha256TokenPlainV1(tokenPlain: string): string {
  return createHash('sha256').update(String(tokenPlain || ''), 'utf-8').digest('hex');
}

export function isLikelyPortalLoginTokenPlainV1(tokenPlain: string): boolean {
  const t = String(tokenPlain || '').trim();
  if (!t) return false;
  // base64url chars only; 32 bytes typically yields 43 chars (unpadded)
  if (t.length < 40 || t.length > 70) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(t)) return false;
  return true;
}

export function timingSafeEqualHexV1(aHex: string, bHex: string): boolean {
  const a = String(aHex || '').trim().toLowerCase();
  const b = String(bHex || '').trim().toLowerCase();
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  if (!/^[0-9a-f]+$/.test(a) || !/^[0-9a-f]+$/.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

