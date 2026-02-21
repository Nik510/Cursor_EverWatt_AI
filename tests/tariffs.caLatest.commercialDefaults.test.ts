import { describe, it, expect, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, writeFileSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';
import type { TariffSnapshot } from '../src/modules/tariffLibrary/types';

describe('tariffs endpoint: /api/tariffs/ca/latest (commercial-first defaults)', () => {
  it('API returns unfiltered decorated rates by default (UI-only default filtering), but supports server-side filtering when query params are provided', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'everwatt-tariffs-'));
    const tmpCuration = mkdtempSync(path.join(os.tmpdir(), 'everwatt-curation-'));
    const curationPath = path.join(tmpCuration, 'ca-tariffs-curation.json');
    writeFileSync(
      curationPath,
      JSON.stringify(
        {
          version: 1,
          capturedAtIso: '2026-02-08T00:00:00.000Z',
          items: [
            { utilityKey: 'PGE', rateCode: 'B-19*', tier: 'featured', hidden: false, preferredForEverWatt: true },
            { utilityKey: 'PGE', rateCode: 'A-*', tier: 'all', hidden: true },
          ],
        },
        null,
        2,
      ),
      'utf-8',
    );

    const prevBase = process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
    const prevCur = process.env.EVERWATT_TARIFF_CURATION_PATH;
    process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = tmp;
    process.env.EVERWATT_TARIFF_CURATION_PATH = curationPath;

    try {
      vi.resetModules();
      const snap: TariffSnapshot = {
        utility: 'PGE',
        capturedAt: '2026-02-05T12:00:00.000Z',
        versionTag: '2026-02-05T1200Z',
        rates: [
          { utility: 'PGE', rateCode: 'A-10', sourceUrl: 'https://example.com/pge/a-10.pdf', sourceTitle: 'Schedule A-10', lastVerifiedAt: '2026-02-05T12:00:00.000Z' } as any,
          { utility: 'PGE', rateCode: 'B-19', sourceUrl: 'https://example.com/pge/b-19.pdf', sourceTitle: 'Schedule B-19', lastVerifiedAt: '2026-02-05T12:00:00.000Z' } as any,
          { utility: 'PGE', rateCode: 'B-6', sourceUrl: 'https://example.com/pge/b-6.pdf', sourceTitle: 'Schedule B-6 (non-canon example)', lastVerifiedAt: '2026-02-05T12:00:00.000Z' } as any,
        ],
        sourceFingerprints: [{ url: 'https://example.com/pge-index', contentHash: 'hash1' }],
      };
      const { saveSnapshot } = await import('../src/modules/tariffLibrary/storage');
      await saveSnapshot(snap);

      // default: UI-only default filtering => API should return all decorated rates by default
      const { default: app } = await import('../src/server');
      const res = await app.request('/api/tariffs/ca/latest');
      const json: any = await res.json();
      expect(json?.curationStatus?.tariffCuration?.loadedFromPath).toBeTruthy();
      const pge = (json.utilities || []).find((u: any) => u.utility === 'PGE');
      const codes = (pge?.rates || []).map((r: any) => String(r.rateCode));
      expect(codes.sort()).toEqual(['A-10', 'B-19', 'B-6']);

      // server-side filtering: featured tier triggers filtering mode; should include only curated featured business rates (canon + segment filters apply)
      const resFeatured = await app.request('/api/tariffs/ca/latest?tier=featured&includeNonCanon=1');
      const jsonFeatured: any = await resFeatured.json();
      const pgeF = (jsonFeatured.utilities || []).find((u: any) => u.utility === 'PGE');
      expect((pgeF?.rates || []).map((r: any) => String(r.rateCode))).toEqual(['B-19']);

      // includeResidential + includeHidden can include hidden residential (filter mode)
      const resInc = await app.request('/api/tariffs/ca/latest?includeResidential=1&includeHidden=1&includeNonCanon=1&tier=all');
      const jsonInc: any = await resInc.json();
      const pgeInc = (jsonInc.utilities || []).find((u: any) => u.utility === 'PGE');
      const codesInc = (pgeInc?.rates || []).map((r: any) => String(r.rateCode)).sort();
      expect(codesInc).toEqual(['A-10', 'B-19', 'B-6']);

      // sector filtering: explicit sector param should activate filter mode and constrain to that segment set
      const resSector = await app.request('/api/tariffs/ca/latest?sector=COMMERCIAL&includeNonCanon=1&tier=all');
      const jsonSector: any = await resSector.json();
      const pgeS = (jsonSector.utilities || []).find((u: any) => u.utility === 'PGE');
      expect((pgeS?.rates || []).every((r: any) => String(r.customerSegment || '').toLowerCase() === 'commercial')).toBe(true);
    } finally {
      if (typeof prevBase === 'string') process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = prevBase;
      else delete process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
      if (typeof prevCur === 'string') process.env.EVERWATT_TARIFF_CURATION_PATH = prevCur;
      else delete process.env.EVERWATT_TARIFF_CURATION_PATH;
    }
  });
});

