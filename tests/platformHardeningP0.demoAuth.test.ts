import { describe, expect, it } from 'vitest';

describe('P0 hardening: demo admin auth gating', () => {
  it('when EVERWATT_DEMO_AUTH is not set, demo admin login fails', async () => {
    const prev = process.env.EVERWATT_DEMO_AUTH;
    try {
      delete process.env.EVERWATT_DEMO_AUTH;
      const { login } = await import('../src/backend/admin/auth');
      const session = await login('admin@everwatt.com', 'any-password');
      expect(session).toBeNull();
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_DEMO_AUTH = prev;
      else delete process.env.EVERWATT_DEMO_AUTH;
    }
  });

  it('when EVERWATT_DEMO_AUTH=1, demo admin login works and token is crypto-strong', async () => {
    const prev = process.env.EVERWATT_DEMO_AUTH;
    try {
      process.env.EVERWATT_DEMO_AUTH = '1';
      const { login, verifySession, logout } = await import('../src/backend/admin/auth');
      const session = await login('admin@everwatt.com', 'pw');
      expect(session).not.toBeNull();
      expect(session?.token).toMatch(/^adm_[0-9a-f]{64}$/);

      const verified = session?.token ? verifySession(session.token) : null;
      expect(verified?.email).toBe('admin@everwatt.com');

      if (session?.token) logout(session.token);
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_DEMO_AUTH = prev;
      else delete process.env.EVERWATT_DEMO_AUTH;
    }
  });
});

