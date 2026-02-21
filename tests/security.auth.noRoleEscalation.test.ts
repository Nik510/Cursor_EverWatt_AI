import { describe, expect, it, vi } from 'vitest';

import './helpers/mockHeavyServerDeps';

function setEnv(next: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(next)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

async function withEnv<T>(next: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(next)) prev[k] = process.env[k];
  setEnv(next);
  try {
    return await fn();
  } finally {
    setEnv(prev);
  }
}

async function importFreshServer() {
  vi.resetModules();
  const { default: app } = await import('../src/server');
  return app;
}

describe('security: auth login is non-escalatable', () => {
  it('demo login ignores requested role (always viewer)', async () => {
    await withEnv(
      {
        NODE_ENV: 'development',
        JWT_SECRET: 'test-secret',
        EVERWATT_DEMO_AUTH: '1',
      },
      async () => {
        const app = await importFreshServer();
        const res = await app.request('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com', role: 'admin' }),
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json?.success).toBe(true);
        expect(json?.user?.role).toBe('viewer');

        const token = String(json?.token || '');
        expect(token).toBeTruthy();

        const me = await app.request('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(me.status).toBe(200);
        const meJson = await me.json();
        expect(meJson?.success).toBe(true);
        expect(meJson?.user?.role).toBe('viewer');
      },
    );
  });

  it('is disabled in production (404)', async () => {
    await withEnv(
      {
        NODE_ENV: 'production',
        JWT_SECRET: 'test-secret',
        EVERWATT_DEMO_AUTH: '1',
      },
      async () => {
        const app = await importFreshServer();
        const res = await app.request('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com', role: 'admin' }),
        });
        expect(res.status).toBe(404);
      },
    );
  });
});

