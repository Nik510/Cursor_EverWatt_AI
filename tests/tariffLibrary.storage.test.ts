import { describe, expect, test } from 'vitest';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { TariffSnapshot } from '../src/modules/tariffLibrary/types';
import { loadLatestSnapshot, loadSnapshot, listSnapshots, saveSnapshot } from '../src/modules/tariffLibrary/storage';

describe('tariffLibrary: storage', () => {
  test('save + load + list + loadLatest works', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'everwatt-tariffs-'));
    const prev = process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
    process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = tmp;

    try {
      const snap1: TariffSnapshot = {
        utility: 'PGE',
        capturedAt: new Date('2026-02-05T12:00:00.000Z').toISOString(),
        versionTag: '2026-02-05T1200Z',
        rates: [
          {
            utility: 'PGE',
            rateCode: 'B-19',
            sourceUrl: 'https://example.com/b-19',
            sourceTitle: 'Schedule B-19',
            lastVerifiedAt: new Date('2026-02-05T12:00:00.000Z').toISOString(),
          },
        ],
        sourceFingerprints: [{ url: 'https://example.com/pge-index', contentHash: 'hash1' }],
      };
      const snap2: TariffSnapshot = { ...snap1, versionTag: '2026-02-05T1300Z' };

      await saveSnapshot(snap1);
      await saveSnapshot(snap2);

      const tags = await listSnapshots('PGE');
      expect(tags).toEqual(['2026-02-05T1200Z', '2026-02-05T1300Z']);

      const loaded = await loadSnapshot('PGE', '2026-02-05T1200Z');
      expect(loaded?.rates?.[0]?.rateCode).toBe('B-19');

      const latest = await loadLatestSnapshot('PGE');
      expect(latest?.versionTag).toBe('2026-02-05T1300Z');
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = prev;
      else delete process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
    }
  });
});

