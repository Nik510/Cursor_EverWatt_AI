import { describe, it, expect, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';
import type { GasTariffSnapshot } from '../src/modules/tariffLibraryGas/types';

describe('gas tariffs endpoints: /api/tariffs/ca/gas/history and /api/tariffs/ca/gas/snapshot', () => {
  it('history returns empty with warnings when snapshots missing', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'everwatt-tariffs-gas-'));
    const prev = process.env.EVERWATT_TARIFF_LIBRARY_GAS_BASEDIR;
    process.env.EVERWATT_TARIFF_LIBRARY_GAS_BASEDIR = tmp;

    try {
      vi.resetModules();
      const { default: app } = await import('../src/server');
      const res = await app.request('/api/tariffs/ca/gas/history?utility=SOCALGAS');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json?.success).toBe(true);
      expect(json?.utility).toBe('SOCALGAS');
      expect(Array.isArray(json?.snapshots)).toBe(true);
      expect(json.snapshots.length).toBe(0);
      expect(Array.isArray(json?.warnings)).toBe(true);
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_TARIFF_LIBRARY_GAS_BASEDIR = prev;
      else delete process.env.EVERWATT_TARIFF_LIBRARY_GAS_BASEDIR;
    }
  });

  it('history includes snapshot headers and snapshot endpoint returns full snapshot', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'everwatt-tariffs-gas-'));
    const prev = process.env.EVERWATT_TARIFF_LIBRARY_GAS_BASEDIR;
    process.env.EVERWATT_TARIFF_LIBRARY_GAS_BASEDIR = tmp;

    try {
      vi.resetModules();
      const s1: GasTariffSnapshot = {
        utility: 'SOCALGAS',
        capturedAt: '2026-02-01T00:00:00.000Z',
        versionTag: '2026-02-01T0000Z',
        rates: [{ utility: 'SOCALGAS', rateCode: 'GR', sourceUrl: 'https://example.com/gr', sourceTitle: 'GR', lastVerifiedAt: '2026-02-01T00:00:00.000Z' } as any],
        sourceFingerprints: [{ url: 'https://example.com/index', contentHash: 'h1' }],
      };
      const s2: GasTariffSnapshot = {
        utility: 'SOCALGAS',
        capturedAt: '2026-02-05T12:00:00.000Z',
        versionTag: '2026-02-05T1200Z',
        rates: [{ utility: 'SOCALGAS', rateCode: 'G-NR1', sourceUrl: 'https://example.com/g-nr1', sourceTitle: 'G-NR1', lastVerifiedAt: '2026-02-05T12:00:00.000Z' } as any],
        sourceFingerprints: [{ url: 'https://example.com/index', contentHash: 'h2' }],
        diffFromPrevious: { previousVersionTag: '2026-02-01T0000Z', addedRateCodes: ['G-NR1'], removedRateCodes: ['GR'], unchangedRateCodes: [] },
      };
      const { saveGasSnapshot } = await import('../src/modules/tariffLibraryGas/storage');
      await saveGasSnapshot(s1);
      await saveGasSnapshot(s2);

      const { default: app } = await import('../src/server');
      const histRes = await app.request('/api/tariffs/ca/gas/history?utility=SOCALGAS');
      expect(histRes.status).toBe(200);
      const hist = await histRes.json();
      expect(hist?.success).toBe(true);
      expect(hist.snapshots.length).toBe(2);
      expect(hist.snapshots[0].versionTag).toBe('2026-02-01T0000Z');
      expect(hist.snapshots[1].versionTag).toBe('2026-02-05T1200Z');
      expect(hist.snapshots[1].diffSummary?.addedRateCodes).toBe(1);
      expect(Array.isArray(hist.snapshots[1].sourceFingerprints)).toBe(true);

      const snapRes = await app.request('/api/tariffs/ca/gas/snapshot/SOCALGAS/2026-02-05T1200Z');
      expect(snapRes.status).toBe(200);
      const snapJson = await snapRes.json();
      expect(snapJson?.success).toBe(true);
      expect(snapJson?.snapshot?.versionTag).toBe('2026-02-05T1200Z');
      expect(snapJson?.snapshot?.rates?.[0]?.rateCode).toBe('G-NR1');
      expect(snapJson?.curationStatus?.tariffCuration?.loadedFromPath).toBeTruthy();
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_TARIFF_LIBRARY_GAS_BASEDIR = prev;
      else delete process.env.EVERWATT_TARIFF_LIBRARY_GAS_BASEDIR;
    }
  });
});

