import { describe, it, expect, vi } from 'vitest';
import './helpers/mockHeavyServerDeps';

describe('gas tariffs endpoint: /api/tariffs/ca/gas/latest (warnings-first)', () => {
  it('returns success:true with structured errors when snapshot load throws', async () => {
    vi.resetModules();
    vi.doMock('../src/modules/tariffLibraryGas/storage', async () => {
      const actual: any = await vi.importActual('../src/modules/tariffLibraryGas/storage');
      return {
        ...actual,
        loadLatestGasSnapshot: async () => {
          throw new Error('boom');
        },
      };
    });
    const mod = await import('../src/server');
    const app = (mod as any).default;

    const res = await app.request('/api/tariffs/ca/gas/latest');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json?.success).toBe(true);
    expect(Array.isArray(json?.utilities)).toBe(true);
    expect(Array.isArray(json?.errors)).toBe(true);
    expect(json.errors[0]?.reason).toContain('boom');
  });
});

