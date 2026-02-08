import { describe, expect, test } from 'vitest';

import { getUtilityRegistryCA } from '../src/modules/utilityRegistry/v1/registry';
import { applyProgramCurationV1, loadCurationBundleV1 } from '../src/modules/policy/curation/loadCuration';

describe('utilityRegistry v1', () => {
  test('CA registry includes required utilities', () => {
    const keys = new Set(getUtilityRegistryCA().map((u) => u.utilityKey));
    for (const k of ['PGE', 'SCE', 'SDGE', 'SOCALGAS', 'SMUD', 'LADWP', 'EAST_BAY_COMMUNITY_ENERGY']) {
      expect(keys.has(k)).toBe(true);
    }
  });
});

describe('curation policy v1', () => {
  test('loadCuration is warnings-first and safe when missing', () => {
    const { curation, warnings } = loadCurationBundleV1({ env: { EVERWATT_CURATION_PATH: 'C:/does/not/exist.json' } });
    expect(Array.isArray(warnings)).toBe(true);
    expect(curation).toEqual({ utilities: {}, programs: {}, implementers: {} });
  });

  test('default policy excludes residential-only programs', () => {
    const programs = [
      { programId: 'p1', customerClassTags: ['residential'] },
      { programId: 'p2', customerClassTags: ['nonresidential'] },
      { programId: 'p3', customerClassTags: ['mixed', 'residential', 'nonresidential'] },
    ];
    const out = applyProgramCurationV1({ programs: programs as any[], curation: {} });
    const ids = out.map((p) => p.programId);
    expect(ids).toEqual(['p2', 'p3']);
  });

  test('hidden flags remove programs deterministically', () => {
    const programs = [{ programId: 'p1', customerClassTags: ['nonresidential'] }];
    const out = applyProgramCurationV1({ programs: programs as any[], curation: { p1: { hidden: true } } });
    expect(out.length).toBe(0);
  });
});

