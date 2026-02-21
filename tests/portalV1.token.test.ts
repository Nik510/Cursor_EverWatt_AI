import { describe, expect, it } from 'vitest';

describe('portalV1 tokenV1', () => {
  it('generates a base64url token and hashes to sha256 hex', async () => {
    const { generatePortalLoginTokenPlainV1, sha256TokenPlainV1, isLikelyPortalLoginTokenPlainV1 } = await import('../src/modules/portalV1/tokenV1');

    const token = generatePortalLoginTokenPlainV1();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(token.length).toBeLessThanOrEqual(70);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(isLikelyPortalLoginTokenPlainV1(token)).toBe(true);

    const hash = sha256TokenPlainV1(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256TokenPlainV1(token)).toBe(hash);
  });

  it('token generator is non-deterministic', async () => {
    const { generatePortalLoginTokenPlainV1 } = await import('../src/modules/portalV1/tokenV1');
    const a = generatePortalLoginTokenPlainV1();
    const b = generatePortalLoginTokenPlainV1();
    expect(a).not.toBe(b);
  });
});

