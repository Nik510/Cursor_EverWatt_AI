import { describe, expect, it, vi } from 'vitest';

describe('P0 hardening: JWT secret fail-fast', () => {
  it('when NODE_ENV=production and no secret is configured, getJwtSecret throws', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevJwt = process.env.JWT_SECRET;
    const prevAuth = process.env.AUTH_SECRET;

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      delete process.env.AUTH_SECRET;

      const { getJwtSecret } = await import('../src/services/auth-service');
      expect(() => getJwtSecret()).toThrow(/JWT_SECRET/i);
    } finally {
      warn.mockRestore();
      process.env.NODE_ENV = prevNodeEnv;
      process.env.JWT_SECRET = prevJwt;
      process.env.AUTH_SECRET = prevAuth;
    }
  });
});

