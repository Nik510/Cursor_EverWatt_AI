import { describe, expect, test } from 'vitest';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { TariffSnapshot } from '../src/modules/tariffLibrary/types';
import { dedupeRateMetadata } from '../src/modules/tariffLibrary/ingest/ingestCaTariffs';
import { getLatestRateMetadata, searchRates } from '../src/modules/tariffLibrary';
import { saveSnapshot } from '../src/modules/tariffLibrary/storage';

describe('tariffLibrary: dedup + query', () => {
  test('dedup prefers more specific link/title', () => {
    const out = dedupeRateMetadata([
      {
        utility: 'PGE',
        rateCode: 'B-19',
        sourceUrl: 'https://example.com/index',
        lastVerifiedAt: '2026-02-05T00:00:00.000Z',
      },
      {
        utility: 'PGE',
        rateCode: 'B19',
        sourceUrl: 'https://example.com/tariffs/schedule-b-19',
        sourceTitle: 'Schedule B-19',
        lastVerifiedAt: '2026-02-05T00:00:00.000Z',
      },
    ]);

    expect(out.length).toBe(1);
    expect(out[0].rateCode).toBe('B-19');
    expect(out[0].sourceTitle).toBe('Schedule B-19');
    expect(out[0].sourceUrl).toContain('schedule-b-19');
  });

  test('getLatestRateMetadata returns expected record (and search works)', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'everwatt-tariffs-'));
    const prev = process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
    process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = tmp;

    try {
      const snap: TariffSnapshot = {
        utility: 'PGE',
        capturedAt: '2026-02-05T12:00:00.000Z',
        versionTag: '2026-02-05T1200Z',
        rates: [
          {
            utility: 'PGE',
            rateCode: 'B-19',
            sourceUrl: 'https://example.com/b-19',
            sourceTitle: 'Schedule B-19',
            lastVerifiedAt: '2026-02-05T12:00:00.000Z',
          },
          {
            utility: 'PGE',
            rateCode: 'B-20',
            sourceUrl: 'https://example.com/b-20',
            sourceTitle: 'Schedule B-20',
            lastVerifiedAt: '2026-02-05T12:00:00.000Z',
          },
        ],
        sourceFingerprints: [{ url: 'https://example.com/pge-index', contentHash: 'hash1' }],
      };
      await saveSnapshot(snap);

      const md = await getLatestRateMetadata({ utility: 'PGE', rateCode: 'b19' });
      expect(md?.rateCode).toBe('B-19');
      expect(md?.sourceUrl).toContain('/b-19');

      const results = await searchRates({ utility: 'PGE', queryText: 'B-2' });
      expect(results.map((r) => r.rateCode)).toEqual(['B-20']);
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = prev;
      else delete process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
    }
  });
});

