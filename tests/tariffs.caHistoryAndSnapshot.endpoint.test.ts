import { describe, it, expect, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';
import type { TariffSnapshot } from '../src/modules/tariffLibrary/types';

describe('tariffs endpoints: /api/tariffs/ca/history and /api/tariffs/ca/snapshot', () => {
  it('history returns empty with warnings when snapshots missing', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'everwatt-tariffs-'));
    const prev = process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
    process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = tmp;

    try {
      vi.resetModules();
      const { default: app } = await import('../src/server');
      const res = await app.request('/api/tariffs/ca/history?utility=PGE');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json?.success).toBe(true);
      expect(json?.utility).toBe('PGE');
      expect(Array.isArray(json?.snapshots)).toBe(true);
      expect(json.snapshots.length).toBe(0);
      expect(Array.isArray(json?.warnings)).toBe(true);
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = prev;
      else delete process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
    }
  });

  it('history includes snapshot headers and snapshot endpoint returns full snapshot', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'everwatt-tariffs-'));
    const prev = process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
    process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = tmp;

    try {
      vi.resetModules();
      const s1: TariffSnapshot = {
        utility: 'PGE',
        capturedAt: '2026-02-01T00:00:00.000Z',
        versionTag: '2026-02-01T0000Z',
        rates: [
          { utility: 'PGE', rateCode: 'A-10', sourceUrl: 'https://example.com/a-10', sourceTitle: 'A-10', lastVerifiedAt: '2026-02-01T00:00:00.000Z' },
        ],
        sourceFingerprints: [{ url: 'https://example.com/index', contentHash: 'h1' }],
      };
      const s2: TariffSnapshot = {
        utility: 'PGE',
        capturedAt: '2026-02-05T12:00:00.000Z',
        versionTag: '2026-02-05T1200Z',
        rates: [
          { utility: 'PGE', rateCode: 'B-19', sourceUrl: 'https://example.com/b-19', sourceTitle: 'B-19', lastVerifiedAt: '2026-02-05T12:00:00.000Z' },
        ],
        sourceFingerprints: [{ url: 'https://example.com/index', contentHash: 'h2' }],
        diffFromPrevious: { previousVersionTag: '2026-02-01T0000Z', addedRateCodes: ['B-19'], removedRateCodes: ['A-10'], unchangedRateCodes: [] },
      };
      const { saveSnapshot } = await import('../src/modules/tariffLibrary/storage');
      await saveSnapshot(s1);
      await saveSnapshot(s2);

      const { default: app } = await import('../src/server');
      const histRes = await app.request('/api/tariffs/ca/history?utility=PGE');
      expect(histRes.status).toBe(200);
      const hist = await histRes.json();
      expect(hist?.success).toBe(true);
      expect(hist.snapshots.length).toBe(2);
      expect(hist.snapshots[0].versionTag).toBe('2026-02-01T0000Z');
      expect(hist.snapshots[1].versionTag).toBe('2026-02-05T1200Z');
      expect(hist.snapshots[1].diffSummary?.addedRateCodes).toBe(1);
      expect(Array.isArray(hist.snapshots[1].sourceFingerprints)).toBe(true);

      const snapRes = await app.request('/api/tariffs/ca/snapshot/PGE/2026-02-05T1200Z');
      expect(snapRes.status).toBe(200);
      const snapJson = await snapRes.json();
      expect(snapJson?.success).toBe(true);
      expect(snapJson?.snapshot?.versionTag).toBe('2026-02-05T1200Z');
      expect(snapJson?.snapshot?.rates?.[0]?.rateCode).toBe('B-19');
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = prev;
      else delete process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
    }
  });
});

