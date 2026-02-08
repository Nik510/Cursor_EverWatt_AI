import { describe, it, expect } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';

import app from '../src/server';
import { saveSnapshot } from '../src/modules/tariffLibrary/storage';
import type { TariffSnapshot } from '../src/modules/tariffLibrary/types';

describe('tariffs endpoint: /api/tariffs/ca/latest', () => {
  it('returns utilities with empty rates when snapshots missing', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'everwatt-tariffs-'));
    const prev = process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
    process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = tmp;

    try {
      const res = await app.request('/api/tariffs/ca/latest');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json?.success).toBe(true);
      expect(Array.isArray(json?.utilities)).toBe(true);
      expect(json.utilities.length).toBe(3);
      for (const u of json.utilities) {
        expect(Array.isArray(u.rates)).toBe(true);
        expect(u.rates.length).toBe(0);
        expect(u.latestSnapshot).toBeNull();
      }
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = prev;
      else delete process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
    }
  });

  it('returns snapshot info + rates when a snapshot exists', async () => {
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
            sourceUrl: 'https://example.com/pge/b-19',
            sourceTitle: 'Schedule B-19',
            lastVerifiedAt: '2026-02-05T12:00:00.000Z',
          },
        ],
        sourceFingerprints: [{ url: 'https://example.com/pge-index', contentHash: 'hash1' }],
      };
      await saveSnapshot(snap);

      const res = await app.request('/api/tariffs/ca/latest');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json?.success).toBe(true);
      const pge = (json.utilities || []).find((u: any) => u.utility === 'PGE');
      expect(pge).toBeTruthy();
      expect(pge.latestSnapshot?.versionTag).toBe('2026-02-05T1200Z');
      expect(pge.latestSnapshot?.rateCount).toBe(1);
      expect(Array.isArray(pge.rates)).toBe(true);
      expect(pge.rates[0]?.rateCode).toBe('B-19');
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = prev;
      else delete process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
    }
  });
});

