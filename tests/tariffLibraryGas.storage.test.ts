import { describe, expect, test } from 'vitest';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { GasTariffSnapshot } from '../src/modules/tariffLibraryGas/types';
import { loadGasSnapshot, loadLatestGasSnapshot, listGasSnapshots, saveGasSnapshot } from '../src/modules/tariffLibraryGas/storage';

describe('tariffLibraryGas: storage', () => {
  test('save + load + list + loadLatest works', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'everwatt-tariffs-gas-'));
    const prev = process.env.EVERWATT_TARIFF_LIBRARY_GAS_BASEDIR;
    process.env.EVERWATT_TARIFF_LIBRARY_GAS_BASEDIR = tmp;

    try {
      const snap1: GasTariffSnapshot = {
        utility: 'SOCALGAS',
        capturedAt: new Date('2026-02-05T12:00:00.000Z').toISOString(),
        versionTag: '2026-02-05T1200Z',
        rates: [
          {
            utility: 'SOCALGAS',
            rateCode: 'GR',
            sourceUrl: 'https://example.com/gr',
            sourceTitle: 'Residential Gas Service',
            lastVerifiedAt: new Date('2026-02-05T12:00:00.000Z').toISOString(),
          },
        ],
        sourceFingerprints: [{ url: 'https://example.com/scg-index', contentHash: 'hash1' }],
      };
      const snap2: GasTariffSnapshot = { ...snap1, versionTag: '2026-02-05T1300Z' };

      await saveGasSnapshot(snap1);
      await saveGasSnapshot(snap2);

      const tags = await listGasSnapshots('SOCALGAS');
      expect(tags).toEqual(['2026-02-05T1200Z', '2026-02-05T1300Z']);

      const loaded = await loadGasSnapshot('SOCALGAS', '2026-02-05T1200Z');
      expect(loaded?.rates?.[0]?.rateCode).toBe('GR');

      const latest = await loadLatestGasSnapshot('SOCALGAS');
      expect(latest?.versionTag).toBe('2026-02-05T1300Z');
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_TARIFF_LIBRARY_GAS_BASEDIR = prev;
      else delete process.env.EVERWATT_TARIFF_LIBRARY_GAS_BASEDIR;
    }
  });
});

