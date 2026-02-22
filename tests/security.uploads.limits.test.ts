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

describe('security: upload limits', () => {
  it('rejects path traversal-ish filenames on /api/analyze', async () => {
    await withEnv({ NODE_ENV: 'development', JWT_SECRET: 'test-secret' }, async () => {
      const app = await importFreshServer();

      const fd = new FormData();
      fd.set('intervalFile', new File(['x'], '../evil.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      fd.set('monthlyBillFile', new File(['x'], 'ok.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));

      const res = await app.request('/api/analyze', { method: 'POST', body: fd as any });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json?.code).toBe('INVALID_FILENAME');
    });
  });

  it('rejects oversized files deterministically on /api/analyze', async () => {
    await withEnv({ NODE_ENV: 'development', JWT_SECRET: 'test-secret', EVERWATT_MAX_UPLOAD_FILE_BYTES: '10' }, async () => {
      const app = await importFreshServer();

      const fd = new FormData();
      fd.set('intervalFile', new File(['01234567890'], 'interval.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      fd.set('monthlyBillFile', new File(['01234567890'], 'bills.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));

      const res = await app.request('/api/analyze', { method: 'POST', body: fd as any });
      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json?.code).toBe('PAYLOAD_TOO_LARGE');
    });
  });

  it('rejects oversized JSON requests deterministically (best-effort Content-Length)', async () => {
    await withEnv({ NODE_ENV: 'production', JWT_SECRET: 'test-secret', EVERWATT_MAX_JSON_BYTES: '20' }, async () => {
      const app = await importFreshServer();

      const body = JSON.stringify({ email: 'admin@everwatt.com', password: 'x', padding: '01234567890123456789' });
      const res = await app.request('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(Buffer.byteLength(body)),
        },
        body,
      });
      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json?.code).toBe('PAYLOAD_TOO_LARGE');
    });
  });
});

