import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

type ParsedHashV1 = { saltHex: string; keyHex: string; cost: number; blockSize: number; parallelization: number };

function assertPasswordInputV1(passwordRaw: unknown): string {
  const password = String(passwordRaw ?? '');
  if (!password) throw new Error('password is required');
  const trimmed = password.trim();
  // Keep intentionally simple; this is a customer-facing "second factor", not a user account password.
  if (trimmed.length < 4) throw new Error('password too short');
  if (trimmed.length > 128) throw new Error('password too long');
  return trimmed;
}

function parseScryptHashV1(encodedRaw: unknown): ParsedHashV1 | null {
  const encoded = String(encodedRaw ?? '').trim();
  // Format: scrypt$1$<cost>$<blockSize>$<parallelization>$<saltHex>$<keyHex>
  const parts = encoded.split('$');
  if (parts.length !== 7) return null;
  if (parts[0] !== 'scrypt') return null;
  if (parts[1] !== '1') return null;
  const cost = Number(parts[2]);
  const blockSize = Number(parts[3]);
  const parallelization = Number(parts[4]);
  const saltHex = String(parts[5] || '').trim().toLowerCase();
  const keyHex = String(parts[6] || '').trim().toLowerCase();
  if (!Number.isFinite(cost) || cost < 1) return null;
  if (!Number.isFinite(blockSize) || blockSize < 1) return null;
  if (!Number.isFinite(parallelization) || parallelization < 1) return null;
  if (!/^[0-9a-f]{16,128}$/.test(saltHex)) return null;
  if (!/^[0-9a-f]{32,256}$/.test(keyHex)) return null;
  return { saltHex, keyHex, cost: Math.trunc(cost), blockSize: Math.trunc(blockSize), parallelization: Math.trunc(parallelization) };
}

export function hashSharePasswordV1(passwordRaw: unknown): string {
  const password = assertPasswordInputV1(passwordRaw);
  const salt = randomBytes(16);
  const cost = 16384;
  const blockSize = 8;
  const parallelization = 1;
  const keyLen = 32;
  const key = scryptSync(password, salt, keyLen, { cost, blockSize, parallelization });
  return ['scrypt', '1', String(cost), String(blockSize), String(parallelization), salt.toString('hex'), key.toString('hex')].join('$');
}

export function verifySharePasswordV1(args: { password: unknown; passwordHash: unknown }): boolean {
  const parsed = parseScryptHashV1(args.passwordHash);
  if (!parsed) return false;
  let password: string;
  try {
    password = assertPasswordInputV1(args.password);
  } catch {
    return false;
  }

  try {
    const salt = Buffer.from(parsed.saltHex, 'hex');
    const expected = Buffer.from(parsed.keyHex, 'hex');
    const actual = scryptSync(password, salt, expected.length, {
      cost: parsed.cost,
      blockSize: parsed.blockSize,
      parallelization: parsed.parallelization,
    });
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

