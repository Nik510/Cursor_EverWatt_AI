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

describe('security: CORS lockdown', () => {
  it('in production does not allow wildcard origins', async () => {
    await withEnv(
      {
        NODE_ENV: 'production',
        JWT_SECRET: 'test-secret',
        EVERWATT_CORS_ORIGINS: 'https://app.everwatt.ai',
      },
      async () => {
        const app = await importFreshServer();
        const res = await app.request('/health', {
          headers: { Origin: 'https://evil.example' },
        });
        expect(res.status).toBe(200);
        const acao = res.headers.get('access-control-allow-origin');
        expect(acao === '*' || acao === 'https://evil.example').toBe(false);
      },
    );
  });
});

