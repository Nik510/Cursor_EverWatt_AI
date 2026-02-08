import { describe, expect, test } from 'vitest';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { analyzeUtility } from '../src/modules/utilityIntelligence/analyzeUtility';
import type { TariffSnapshot } from '../src/modules/tariffLibrary/types';
import { saveSnapshot } from '../src/modules/tariffLibrary/storage';

describe('utilityIntelligence: tariffLibrary attachment', () => {
  test('analyzeUtility attaches tariffLibrary when snapshot exists for CA IOU', async () => {
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

      const out = await analyzeUtility(
        {
          orgId: 't',
          projectId: 'p',
          serviceType: 'electric',
          utilityTerritory: 'PGE',
          currentRate: { utility: 'PGE', rateCode: 'B-19' },
        },
        { nowIso: '2026-02-05T12:00:00.000Z', idFactory: () => 'id1', intervalKwSeries: [] },
      );

      expect(out.insights.tariffLibrary?.snapshotVersionTag).toBe('2026-02-05T1200Z');
      expect(out.insights.tariffLibrary?.snapshotCapturedAt).toBe('2026-02-05T12:00:00.000Z');
      expect(out.insights.tariffLibrary?.isStale).toBe(false);
      expect(out.insights.tariffLibrary?.rateMetadata?.rateCode).toBe('B-19');
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = prev;
      else delete process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
    }
  });

  test('analyzeUtility attaches isStale + changeSummary when snapshot has diffFromPrevious', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'everwatt-tariffs-'));
    const prev = process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
    process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = tmp;

    try {
      const snap: TariffSnapshot = {
        utility: 'PGE',
        capturedAt: '2026-01-01T00:00:00.000Z',
        versionTag: '2026-01-01T0000Z',
        rates: [
          {
            utility: 'PGE',
            rateCode: 'B-19',
            sourceUrl: 'https://example.com/pge/b-19',
            sourceTitle: 'Schedule B-19',
            lastVerifiedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        sourceFingerprints: [{ url: 'https://example.com/pge-index', contentHash: 'hash1' }],
        diffFromPrevious: {
          previousVersionTag: '2025-12-01T0000Z',
          addedRateCodes: ['B-19'],
          removedRateCodes: ['A-10'],
          unchangedRateCodes: [],
        },
      };
      await saveSnapshot(snap);

      const out = await analyzeUtility(
        {
          orgId: 't',
          projectId: 'p',
          serviceType: 'electric',
          utilityTerritory: 'PGE',
          currentRate: { utility: 'PGE', rateCode: 'B-19' },
        },
        { nowIso: '2026-02-01T00:00:00.000Z', idFactory: () => 'id2', intervalKwSeries: [] },
      );

      expect(out.insights.tariffLibrary?.isStale).toBe(true);
      expect(out.insights.tariffLibrary?.changeSummary).toEqual({ addedRateCodes: ['B-19'], removedRateCodes: ['A-10'] });
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = prev;
      else delete process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
    }
  });
});

