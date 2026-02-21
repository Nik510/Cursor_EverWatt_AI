import { describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';

describe('sharesV1 management endpoints (staff-only, no token leakage)', () => {
  it('lists/reads/extends/sets-scope without returning tokenPlain/hash', async () => {
    const sharesDir = mkdtempSync(path.join(os.tmpdir(), 'ew-shares-admin-'));
    const prevShares = process.env.EVERWATT_SHARES_BASEDIR;
    const prevJwt = process.env.JWT_SECRET;

    process.env.EVERWATT_SHARES_BASEDIR = sharesDir;
    process.env.JWT_SECRET = 'test-jwt-secret';

    try {
      vi.resetModules();
      const { signJwt } = await import('../src/services/auth-service');
      const jwt = signJwt({ userId: 'u_staff', role: 'editor' }, 60 * 60);
      const authz = { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' };

      const { createSharesStoreFsV1 } = await import('../src/modules/sharesV1/storeFsV1');
      const { sha256TokenPlainV1 } = await import('../src/modules/sharesV1/tokenV1');
      const store = createSharesStoreFsV1({ baseDir: sharesDir });

      const tokenPlain = 'plain_token_for_leak_test_aaaaaaaaaaaaaaaaaaaaaaaa'.replace(/[^A-Za-z0-9_-]/g, '_');
      const tokenHash = sha256TokenPlainV1(tokenPlain);
      const created = await store.createShareLink({
        tokenHash,
        projectId: 'p_admin',
        revisionId: 'r_admin',
        reportType: 'EXECUTIVE_PACK_V1',
        scope: 'VIEW',
        expiresAtIso: new Date('2026-01-02T00:00:00.000Z').toISOString(),
        createdAtIso: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        createdBy: 'u_staff',
        shareId: 's_admin',
        note: 'hello',
      });
      expect(created.shareId).toBe('s_admin');

      const { default: app } = await import('../src/server');

      const listRes = await app.request('/api/shares-v1?limit=100&q=p_admin', { headers: authz });
      expect(listRes.status).toBe(200);
      const listJson: any = await listRes.json();
      expect(listJson?.success).toBe(true);
      const listStr = JSON.stringify(listJson);
      expect(listStr).not.toContain(tokenPlain);
      expect(listStr).not.toContain(tokenHash);
      expect(listStr).not.toContain('tokenHash');

      const readRes = await app.request('/api/shares-v1/s_admin', { headers: authz });
      expect(readRes.status).toBe(200);
      const readJson: any = await readRes.json();
      expect(readJson?.success).toBe(true);
      const readStr = JSON.stringify(readJson);
      expect(readStr).not.toContain(tokenPlain);
      expect(readStr).not.toContain(tokenHash);
      expect(readStr).not.toContain('tokenHash');
      expect(Array.isArray(readJson?.share?.events)).toBe(true);
      expect(readJson.share.events[0]?.type).toBe('CREATED');

      const extendRes = await app.request('/api/shares-v1/s_admin/extend-expiry', {
        method: 'POST',
        headers: authz,
        body: JSON.stringify({ extendHours: 24 }),
      });
      expect(extendRes.status).toBe(200);
      const extendJson: any = await extendRes.json();
      expect(extendJson?.success).toBe(true);
      expect(String(extendJson?.share?.expiresAtIso || '')).toBe(new Date('2026-01-03T00:00:00.000Z').toISOString());
      expect(JSON.stringify(extendJson)).not.toContain(tokenHash);

      const scopeRes = await app.request('/api/shares-v1/s_admin/set-scope', {
        method: 'POST',
        headers: authz,
        body: JSON.stringify({ scope: 'BOTH' }),
      });
      expect(scopeRes.status).toBe(200);
      const scopeJson: any = await scopeRes.json();
      expect(scopeJson?.success).toBe(true);
      expect(scopeJson?.share?.scope).toBe('BOTH');
      expect(JSON.stringify(scopeJson)).not.toContain(tokenHash);
    } finally {
      rmSync(sharesDir, { recursive: true, force: true });
      if (typeof prevShares === 'string') process.env.EVERWATT_SHARES_BASEDIR = prevShares;
      else delete process.env.EVERWATT_SHARES_BASEDIR;
      if (typeof prevJwt === 'string') process.env.JWT_SECRET = prevJwt;
      else delete process.env.JWT_SECRET;
    }
  });
});

