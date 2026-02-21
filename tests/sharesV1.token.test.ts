import { describe, expect, it } from 'vitest';

describe('sharesV1 tokenV1', () => {
  it('generates a base64url token and hashes to sha256 hex', async () => {
    const { generateShareTokenPlainV1, sha256TokenPlainV1, isLikelyShareTokenPlainV1 } = await import('../src/modules/sharesV1/tokenV1');

    const token = generateShareTokenPlainV1();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(token.length).toBeLessThanOrEqual(70);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(isLikelyShareTokenPlainV1(token)).toBe(true);

    const hash = sha256TokenPlainV1(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);

    // Deterministic
    expect(sha256TokenPlainV1(token)).toBe(hash);
  });

  it('token generator is non-deterministic', async () => {
    const { generateShareTokenPlainV1 } = await import('../src/modules/sharesV1/tokenV1');
    const a = generateShareTokenPlainV1();
    const b = generateShareTokenPlainV1();
    expect(a).not.toBe(b);
  });
});

