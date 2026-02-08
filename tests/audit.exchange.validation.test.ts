import { describe, expect, test } from 'vitest';
import { validateAuditExport } from '../src/modules/audit/exchange/validateAuditExport';

describe('EverWattAuditExport v1 - validateAuditExport', () => {
  test('collects missing required fields (does not throw)', () => {
    const res = validateAuditExport({
      apiVersion: 'everwatt_audit_export/v1',
      provenance: { exportedAt: '2026-02-01T00:00:00.000Z' },
      building: { sqft: 1000 }, // missing buildingType
      artifacts: [],
      assets: [],
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    const text = res.errors.map((e) => `${e.jsonPath}: ${e.message}`).join('\n');
    expect(text).toContain('building.buildingType');
    expect(text).toContain('assets');
  });

  test('collects type mismatches with jsonPath', () => {
    const res = validateAuditExport({
      apiVersion: 'everwatt_audit_export/v1',
      provenance: { exportedAt: '2026-02-01T00:00:00.000Z' },
      building: { buildingType: 'office', sqft: 'not-a-number' },
      artifacts: [{ artifactId: 'a1', kind: 'photo', filename: 'x.jpg', uriOrPath: 'file:///x.jpg', confidence: 0.5 }],
      assets: [
        {
          auditAssetId: 'AA1',
          assetType: 'AHU',
          label: 'AHU-1',
          fields: { airflowCfm: '12000' },
          evidence: [{ artifactId: 'a1', fieldKey: 'airflowCfm', confidence: 'high' }],
        },
      ],
    } as any);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    const paths = res.errors.map((e) => e.jsonPath);
    expect(paths).toEqual(expect.arrayContaining(['building.sqft', 'assets[0].evidence[0].confidence']));
  });
});

