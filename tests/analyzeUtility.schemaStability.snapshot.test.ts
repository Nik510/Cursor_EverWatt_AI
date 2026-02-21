import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

import { analyzeUtility } from '../src/modules/utilityIntelligence/analyzeUtility';
import { parseIntervalElectricCsvV1 } from '../src/modules/utilityIntelligence/intake/intervalElectricV1/parseIntervalElectricCsvV1';

type StableJson = any;

function stableNormalize(value: StableJson): StableJson {
  const seen = new WeakSet<object>();
  const norm = (v: any): any => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map(norm);
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) out[k] = norm(v[k]);
    return out;
  };
  return norm(value);
}

describe('analyzeUtility: schema stability (trimmed snapshot)', () => {
  it('keeps stable output subtrees (sorted)', async () => {
    const billText = readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'bill_text_small.txt'), 'utf-8');
    const csvText = readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'pge_interval_small_v1.csv'), 'utf-8');
    const parsed = parseIntervalElectricCsvV1({ csvText, timezoneHint: 'America/Los_Angeles' });
    expect(parsed.ok).toBe(true);

    const out = await analyzeUtility(
      {
        orgId: 'o_test',
        projectId: 'p_schema_stability',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        currentRate: { utility: 'PGE', rateCode: 'E-19' },
        billPdfText: billText,
      } as any,
      {
        intervalPointsV1: parsed.points as any,
        nowIso: '2026-02-10T00:00:00.000Z',
        idFactory: () => 'id_fixed',
      },
    );

    const missingInfoRaw: any[] = Array.isArray((out.insights as any)?.missingInfo) ? (((out.insights as any).missingInfo as any[]) || []) : [];
    const missingInfo = missingInfoRaw
      .map((it) => ({ id: String(it?.id || ''), category: String(it?.category || ''), severity: String(it?.severity || '') }))
      .filter((it) => it.id)
      .sort((a, b) => a.id.localeCompare(b.id));

    const top3 = ((out.insights as any)?.rateFit?.alternatives || [])
      .slice(0, 3)
      .map((a: any) => ({ rateCode: String(a?.rateCode || ''), status: String(a?.status || '') }));

    const trimmed = stableNormalize({
      workflow: {
        utility: {
          inputs: {
            serviceType: 'electric',
            utilityTerritory: 'PGE',
            currentRate: { utility: 'PGE', rateCode: 'E-19' },
            hasBillPdfText: Boolean(String(billText || '').trim()),
          },
          intervalEvidenceSummary: {
            pointsCount: Number(parsed.points.length),
            inferredIntervalMinutes: Number((parsed.meta as any)?.inferredIntervalMinutes),
            timezoneUsed: String((parsed.meta as any)?.timezoneUsed || ''),
          },
          missingInfo,
          rateFitTop3: top3,
        },
      },
    });

    expect(trimmed).toMatchInlineSnapshot(`
      {
        "workflow": {
          "utility": {
            "inputs": {
              "currentRate": {
                "rateCode": "E-19",
                "utility": "PGE",
              },
              "hasBillPdfText": true,
              "serviceType": "electric",
              "utilityTerritory": "PGE",
            },
            "intervalEvidenceSummary": {
              "inferredIntervalMinutes": 15,
              "pointsCount": 4,
              "timezoneUsed": "America/Los_Angeles",
            },
            "missingInfo": [
              {
                "category": "tariff",
                "id": "behaviorV2.baseLoadDrift.unavailable",
                "severity": "info",
              },
              {
                "category": "tariff",
                "id": "behaviorV2.insufficientCycles",
                "severity": "info",
              },
              {
                "category": "tariff",
                "id": "behaviorV2.peaks.missing",
                "severity": "info",
              },
              {
                "category": "tariff",
                "id": "behaviorV2.weekendShare.insufficientMonths",
                "severity": "info",
              },
              {
                "category": "tariff",
                "id": "behaviorV3.electric.insufficientMonths",
                "severity": "info",
              },
              {
                "category": "billing",
                "id": "billing.billPdfTouUsage.BILL_PDF_CYCLE_LABEL_MISSING",
                "severity": "warning",
              },
              {
                "category": "billing",
                "id": "billing.billPdfTouUsage.BILL_PDF_TOU_DEMAND_NOT_EXPLICIT",
                "severity": "info",
              },
              {
                "category": "billing",
                "id": "billing.billPdfTouUsage.BILL_PDF_TOU_ENERGY_NOT_EXPLICIT",
                "severity": "info",
              },
              {
                "category": "tariff",
                "id": "determinants.demandRules.pge.ratchet.DETERMINANT_RATCHET_UNSUPPORTED",
                "severity": "info",
              },
              {
                "category": "tariff",
                "id": "determinants.reconcile.billingRecords.missing",
                "severity": "info",
              },
              {
                "category": "tariff",
                "id": "determinants.reconcile.coverageLow.2026-01",
                "severity": "warning",
              },
              {
                "category": "tariff",
                "id": "determinants.reconcile.reconcilable.count",
                "severity": "info",
              },
              {
                "category": "billing",
                "id": "determinants.tou.energy.coverage.low.2026-01",
                "severity": "warning",
              },
              {
                "category": "tariff",
                "id": "loadAttribution.insufficientData",
                "severity": "info",
              },
              {
                "category": "tariff",
                "id": "supply.v1.lse_undetected",
                "severity": "info",
              },
              {
                "category": "tariff",
                "id": "tariff.applicability.rules.missing",
                "severity": "info",
              },
              {
                "category": "tariff",
                "id": "tariff.applicability.unknown",
                "severity": "info",
              },
            ],
            "rateFitTop3": [
              {
                "rateCode": "B-19S",
                "status": "needs_eval",
              },
              {
                "rateCode": "E-19S",
                "status": "needs_eval",
              },
              {
                "rateCode": "A-10",
                "status": "needs_eval",
              },
            ],
          },
        },
      }
    `);
  });
});

