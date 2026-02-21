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

describe('security: no spoofable identity headers', () => {
  it('rejects user-scoped routes without verified identity (x-user-id ignored)', async () => {
    await withEnv(
      {
        NODE_ENV: 'production',
        JWT_SECRET: 'test-secret',
        EVERWATT_DEMO_AUTH: undefined,
      },
      async () => {
        const app = await importFreshServer();
        const res = await app.request('/api/files/upload', {
          method: 'POST',
          headers: {
            'x-user-id': 'attacker-user',
          },
        });
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json?.success).toBe(false);
        expect(String(json?.error || '')).toMatch(/unauthorized/i);
      },
    );
  });
});

