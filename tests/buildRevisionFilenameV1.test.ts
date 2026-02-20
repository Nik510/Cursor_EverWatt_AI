import { describe, expect, it } from 'vitest';

import { buildRevisionFilenameV1 } from '../src/utils/buildRevisionFilenameV1';

describe('buildRevisionFilenameV1', () => {
  it('builds deterministic engineering pack PDF filenames', () => {
    const filename = buildRevisionFilenameV1({
      reportType: 'ENGINEERING_PACK_V1',
      projectOrReportId: 'proj_123',
      revisionId: 'rev_456',
      createdAtIso: '2026-02-20T12:34:56.000Z',
      ext: 'pdf',
    });
    expect(filename).toBe('EverWatt_EngineeringPack_proj_123_Revrev_456_20260220.pdf');
  });

  it('sanitizes unsafe parts and falls back for bad dates', () => {
    const filename = buildRevisionFilenameV1({
      reportType: 'EXECUTIVE_PACK_V1',
      projectOrReportId: 'ACME / West (HQ)',
      revisionId: 'rev:789',
      createdAtIso: 'not-a-date',
      ext: 'json',
    });
    expect(filename).toBe('EverWatt_ExecutivePack_ACME_West_HQ_Revrev_789_00000000.json');
  });
});

