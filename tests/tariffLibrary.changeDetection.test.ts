import { describe, expect, test } from 'vitest';

import { computeContentHashV0, computeRateCodeDiff } from '../src/modules/tariffLibrary/ingest/ingestCaTariffs';
import { isSnapshotStale } from '../src/modules/tariffLibrary';

describe('tariffLibrary: change detection + freshness', () => {
  test('hashing is stable: same HTML => same contentHash', () => {
    const html = '<html>\r\n<body><a href="/B-19">B-19</a></body>\r\n</html>';
    const a = computeContentHashV0(html);
    const b = computeContentHashV0(html);
    expect(a).toBe(b);
  });

  test('diff summary: prev [A,B], current [B,C] => added [C], removed [A], unchanged [B]', () => {
    const diff = computeRateCodeDiff({ previousRateCodes: ['A', 'B'], currentRateCodes: ['B', 'C'] });
    expect(diff.addedRateCodes).toEqual(['C']);
    expect(diff.removedRateCodes).toEqual(['A']);
    expect(diff.unchangedRateCodes).toEqual(['B']);
  });

  test('isStale true when capturedAt older than 14 days', () => {
    const capturedAt = '2026-01-01T00:00:00.000Z';
    const now = '2026-01-20T00:00:00.000Z';
    expect(isSnapshotStale(capturedAt, now, 14)).toBe(true);
    expect(isSnapshotStale(capturedAt, '2026-01-10T00:00:00.000Z', 14)).toBe(false);
  });
});

