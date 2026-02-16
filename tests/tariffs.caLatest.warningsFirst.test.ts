import { describe, it, expect, vi } from 'vitest';
import './helpers/mockHeavyServerDeps';

describe('tariffs endpoint: /api/tariffs/ca/latest (warnings-first)', () => {
  it('returns success:true with structured errors when snapshot load throws', async () => {
    vi.resetModules();
    vi.doMock('../src/modules/tariffLibrary/storage', async () => {
      const actual: any = await vi.importActual('../src/modules/tariffLibrary/storage');
      return {
        ...actual,
        loadLatestSnapshot: async () => {
          throw new Error('boom');
        },
      };
    });
    const mod = await import('../src/server');
    const app = (mod as any).default;

    const res = await app.request('/api/tariffs/ca/latest');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json?.success).toBe(true);
    expect(Array.isArray(json?.utilities)).toBe(true);
    expect(Array.isArray(json?.errors)).toBe(true);
    expect(json.errors[0]?.reason).toContain('boom');
  });
});

