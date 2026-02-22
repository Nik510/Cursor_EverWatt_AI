import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

describe('sharesV1 audit ledger + mutations', () => {
  it('bounds events deterministically (last 200)', async () => {
    const sharesDir = mkdtempSync(path.join(os.tmpdir(), 'ew-shares-audit-'));
    try {
      const { createSharesStoreFsV1 } = await import('../src/modules/sharesV1/storeFsV1');
      const store = createSharesStoreFsV1({ baseDir: sharesDir });

      const createdAtIso = new Date('2026-01-01T00:00:00.000Z').toISOString();
      const share = await store.createShareLink({
        tokenHash: 'a'.repeat(64),
        projectId: 'p1',
        revisionId: 'r1',
        reportType: 'EXECUTIVE_PACK_V1',
        scope: 'BOTH',
        expiresAtIso: null,
        createdAtIso,
        shareId: 's1',
        note: 'note',
      });
      expect(share.events.length).toBe(1);
      expect(share.events[0].type).toBe('CREATED');

      const baseMs = Date.parse('2026-01-01T00:00:00.000Z');
      for (let i = 1; i <= 210; i += 1) {
        const nowIso = new Date(baseMs + i * 1000).toISOString();
        await store.recordAccess({ shareId: 's1', nowIso, userAgentHash: null, ipHash: null });
      }

      const after = await store.getShareById('s1');
      expect(after.accessCount).toBe(210);
      expect(after.events.length).toBe(200);
      expect(after.events[0].type).toBe('ACCESSED');
      // Total events would be 211 (1 created + 210 accesses). Keeping last 200 drops created + first 10 accesses.
      const firstKeptAt = (after.events[0] as any).atIso;
      expect(String(firstKeptAt)).toBe(new Date(baseMs + 11 * 1000).toISOString());
      const lastEv = after.events[after.events.length - 1] as any;
      expect(lastEv.type).toBe('ACCESSED');
      expect(String(lastEv.atIso)).toBe(new Date(baseMs + 210 * 1000).toISOString());
    } finally {
      rmSync(sharesDir, { recursive: true, force: true });
    }
  });

  it('extend expiry updates expiresAtIso and appends event', async () => {
    const sharesDir = mkdtempSync(path.join(os.tmpdir(), 'ew-shares-extend-'));
    try {
      const { createSharesStoreFsV1 } = await import('../src/modules/sharesV1/storeFsV1');
      const store = createSharesStoreFsV1({ baseDir: sharesDir });

      const createdAtIso = new Date('2026-01-01T00:00:00.000Z').toISOString();
      const expiresAtIso = new Date('2026-01-02T00:00:00.000Z').toISOString();
      await store.createShareLink({
        tokenHash: 'b'.repeat(64),
        projectId: 'p1',
        revisionId: 'r1',
        reportType: 'EXECUTIVE_PACK_V1',
        scope: 'VIEW',
        expiresAtIso,
        createdAtIso,
        shareId: 's2',
      });

      const extended = await store.extendExpiry({ shareId: 's2', extendHours: 24, nowIso: new Date('2026-01-01T12:00:00.000Z').toISOString() });
      expect(extended.expiresAtIso).toBe(new Date('2026-01-03T00:00:00.000Z').toISOString());
      expect(extended.events.some((e) => e.type === 'EXPIRY_EXTENDED')).toBe(true);
      const last = extended.events[extended.events.length - 1] as any;
      expect(last.type).toBe('EXPIRY_EXTENDED');
      expect(last.newExpiresAtIso).toBe(new Date('2026-01-03T00:00:00.000Z').toISOString());
    } finally {
      rmSync(sharesDir, { recursive: true, force: true });
    }
  });

  it('scope change updates scope and appends event', async () => {
    const sharesDir = mkdtempSync(path.join(os.tmpdir(), 'ew-shares-scope-'));
    try {
      const { createSharesStoreFsV1 } = await import('../src/modules/sharesV1/storeFsV1');
      const store = createSharesStoreFsV1({ baseDir: sharesDir });

      await store.createShareLink({
        tokenHash: 'c'.repeat(64),
        projectId: 'p1',
        revisionId: 'r1',
        reportType: 'EXECUTIVE_PACK_V1',
        scope: 'VIEW',
        expiresAtIso: null,
        createdAtIso: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        shareId: 's3',
      });

      const updated = await store.setScope({ shareId: 's3', scope: 'BOTH', nowIso: new Date('2026-01-01T00:05:00.000Z').toISOString() });
      expect(updated.scope).toBe('BOTH');
      const last = updated.events[updated.events.length - 1] as any;
      expect(last.type).toBe('SCOPE_CHANGED');
      expect(last.newScope).toBe('BOTH');
    } finally {
      rmSync(sharesDir, { recursive: true, force: true });
    }
  });

  it('list ordering is deterministic (createdAt desc, shareId asc)', async () => {
    const sharesDir = mkdtempSync(path.join(os.tmpdir(), 'ew-shares-order-'));
    try {
      const { createSharesStoreFsV1 } = await import('../src/modules/sharesV1/storeFsV1');
      const store = createSharesStoreFsV1({ baseDir: sharesDir });

      await store.createShareLink({
        tokenHash: 'd'.repeat(64),
        projectId: 'p1',
        revisionId: 'r1',
        reportType: 'EXECUTIVE_PACK_V1',
        scope: 'BOTH',
        expiresAtIso: null,
        createdAtIso: new Date('2026-01-02T00:00:00.000Z').toISOString(),
        shareId: 'b',
      });
      await store.createShareLink({
        tokenHash: 'e'.repeat(64),
        projectId: 'p1',
        revisionId: 'r1',
        reportType: 'EXECUTIVE_PACK_V1',
        scope: 'BOTH',
        expiresAtIso: null,
        createdAtIso: new Date('2026-01-02T00:00:00.000Z').toISOString(),
        shareId: 'a',
      });
      await store.createShareLink({
        tokenHash: 'f'.repeat(64),
        projectId: 'p1',
        revisionId: 'r1',
        reportType: 'EXECUTIVE_PACK_V1',
        scope: 'BOTH',
        expiresAtIso: null,
        createdAtIso: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        shareId: 'z',
      });

      const listed = await store.listShares({ limit: 10 });
      expect(listed.map((s) => s.shareId)).toEqual(['a', 'b', 'z']);
    } finally {
      rmSync(sharesDir, { recursive: true, force: true });
    }
  });
});

