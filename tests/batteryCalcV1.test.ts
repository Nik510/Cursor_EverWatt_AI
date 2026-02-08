import { describe, expect, test } from 'vitest';
import path from 'path';
import type { ProjectRecord } from '../src/types/change-order';
import type { Project } from '../src/modules/project/types';
import { loadBatteryLibraryV1 } from '../src/modules/batteryLibrary/loadLibrary';
import { selectBatteryCandidatesV1 } from '../src/modules/batteryCalcV1/selectCandidates';
import { generateBatteryRecommendationsV1 } from '../src/modules/batteryCalcV1/generateBatteryRecommendations';

function mkProject(args: { orgId: string; projectId: string; projectBuilder: ProjectRecord }): Project {
  return { orgId: args.orgId, projectId: args.projectId, status: 'active', projectBuilder: args.projectBuilder };
}

describe('Battery Calc v1', () => {
  test('loads fixture battery library', async () => {
    const fp = path.join(process.cwd(), 'samples', 'battery_library_fixture.json');
    const { library, warnings } = await loadBatteryLibraryV1(fp);
    expect(library.version).toBe('v1');
    expect(library.items.length).toBeGreaterThanOrEqual(3);
    expect(warnings.length).toBeGreaterThanOrEqual(0);
    expect(library.items[0]).toHaveProperty('sku');
    expect(library.items[0]).toHaveProperty('kw');
    expect(library.items[0]).toHaveProperty('kwh');
  });

  test('missing telemetry scenario populates requiredInputsMissing', async () => {
    const fp = path.join(process.cwd(), 'samples', 'battery_library_fixture.json');
    const { library } = await loadBatteryLibraryV1(fp);

    const target: ProjectRecord = {
      id: 'p1',
      driveFolderLink: '',
      customer: { projectNumber: 'P-1', companyName: 'ACME', facilityType: 'office' },
      graph: { assets: [], measures: [], inbox: [] } as any,
    };

    const res = selectBatteryCandidatesV1({
      project: mkProject({ orgId: 'org', projectId: 'p1', projectBuilder: target }),
      libraryItems: library.items,
      telemetry: {}, // no interval series
    });

    expect(res.requiredInputsMissing).toEqual(expect.arrayContaining(['utility interval electricity data (15-min or hourly)']));
    expect(res.rankedCandidates.length).toBeGreaterThan(0);
  });

  test('valid minimal telemetry scenario yields stable top-3 ranking', async () => {
    const fp = path.join(process.cwd(), 'samples', 'battery_library_fixture.json');
    const { library } = await loadBatteryLibraryV1(fp);

    const target: ProjectRecord = {
      id: 'p1',
      driveFolderLink: '',
      building: { buildingType: 'office', sqft: 105_000, operatingSchedule: { bucket: 'business_hours' } as any } as any,
      customer: { projectNumber: 'P-1', companyName: 'ACME', facilityType: 'office', utilityCompany: 'PG&E' },
      graph: { assets: [{ kind: 'asset', id: 'a1', assetTag: 'PNL-1', type: 'panel' as any, baseline: { properties: {} } }], measures: [], inbox: [] } as any,
    };

    const series = [
      // Craft a deterministic demand profile with p95≈300kW -> targetKw≈105kW, targetKwh≈210kWh
      ...Array.from({ length: 95 }, (_, i) => ({ timestampIso: `2026-01-01T00:${String(i).padStart(2, '0')}:00.000Z`, kw: 300 })),
      ...Array.from({ length: 5 }, (_, i) => ({ timestampIso: `2026-01-01T02:${String(i).padStart(2, '0')}:00.000Z`, kw: 320 })),
    ];

    const res = selectBatteryCandidatesV1({
      project: mkProject({ orgId: 'org', projectId: 'p1', projectBuilder: target }),
      libraryItems: library.items,
      telemetry: { intervalKwSeries: series },
    });

    expect(res.requiredInputsMissing.length).toBe(0);
    const top3 = res.rankedCandidates.slice(0, 3).map((r) => r.candidate.sku);
    expect(top3).toEqual(['ACME-LFP-100-215', 'ACME-LFP-200-430', 'BETA-NMC-60-120']);
  });

  test('generated recommendation payload is deterministic and inbox-only', async () => {
    const fp = path.join(process.cwd(), 'samples', 'battery_library_fixture.json');
    const { library } = await loadBatteryLibraryV1(fp);

    const target: ProjectRecord = {
      id: 'p1',
      driveFolderLink: '',
      building: { buildingType: 'office', sqft: 105_000, operatingSchedule: { bucket: 'business_hours' } as any } as any,
      customer: { projectNumber: 'P-1', companyName: 'ACME', facilityType: 'office', utilityCompany: 'PG&E' },
      graph: {
        assets: [{ kind: 'asset', id: 'ahu-1', assetTag: 'AHU-1', type: 'ahu' as any, baseline: { properties: {} } }],
        measures: [],
        inbox: [],
      } as any,
    };

    const series = [
      ...Array.from({ length: 95 }, (_, i) => ({ timestampIso: `2026-01-01T00:${String(i).padStart(2, '0')}:00.000Z`, kw: 300 })),
      ...Array.from({ length: 5 }, (_, i) => ({ timestampIso: `2026-01-01T02:${String(i).padStart(2, '0')}:00.000Z`, kw: 320 })),
    ];

    const out = generateBatteryRecommendationsV1({
      orgId: 'org',
      projectId: 'p1',
      targetProject: target,
      libraryItems: library.items,
      meter: { meterId: 'm1', intervalKwSeries: series },
      nowIso: '2026-01-05T00:00:00.000Z',
      idFactory: () => 's_battery_1',
      inboxIdFactory: () => 'i_battery_1',
    });

    expect(out.suggestions.length).toBe(1);
    expect(out.inboxItems.length).toBe(1);
    expect(out.inboxItems[0].kind).toBe('suggestedMeasure');
    expect(out.suggestions[0].suggestedMeasure.measureType).toBe('BATTERY_PEAK_SHAVE');
    expect(out.suggestions[0].requiredInputsMissing.length).toBe(0);

    // Snapshot with stable rounding (avoid float drift).
    const round = (x: any): any => {
      if (typeof x === 'number') return Math.round(x * 1000) / 1000;
      if (Array.isArray(x)) return x.map(round);
      if (!x || typeof x !== 'object') return x;
      const out: any = {};
      for (const k of Object.keys(x).sort()) out[k] = round((x as any)[k]);
      return out;
    };

    expect(round(out.suggestions[0])).toMatchInlineSnapshot(`
      {
        "confidence": 0.863,
        "createdAt": "2026-01-05T00:00:00.000Z",
        "explain": {
          "because": [
            {
              "completedProjectId": "batteryCalcV1",
              "matchedFeatures": [
                "batteryLibraryFit",
                "telemetryPresent",
              ],
              "measuresInProject": [
                "BATTERY_PEAK_SHAVE",
              ],
              "similarityScore": 0.943,
            },
          ],
          "frequency": {
            "sampleSizeTopN": 1,
            "seenInCount": 1,
            "text": "selection: best-fit battery candidate from library",
          },
          "matchedFeatureSummary": [
            "batteryCalcV1: peakKw=320.0 p95Kw=300.0 avgKw=301.0 n=100",
            "batteryCalcV1: demand screening uses interval kW determinants (not kWh totals).",
            "batteryCalcV1: targetKw≈105 targetDurationHr=2 targetKwh≈210",
            "playbook: alignment=neutral",
          ],
          "matchingFeaturesUsed": [
            "buildingType",
            "assetInventory",
            "territory",
          ],
          "playbooksApplied": [
            {
              "matchedBecause": [
                "buildingType=office",
                "sqft=105000",
                "systemAnyOf=ahu,vav,fan,lightingFixture",
              ],
              "playbookId": "playbook_office_commercial_baseline_v1",
              "priority": "MED",
            },
          ],
          "scoreOverlay": {
            "adjustedScore": 0.943,
            "baseScore": 0.943,
            "multiplier": 1,
          },
          "topContributors": [
            {
              "completedProjectId": "batteryCalcV1",
              "matchedFeatures": [
                "batteryLibraryFit",
                "telemetryPresent",
              ],
              "similarityScore": 0.943,
              "summary": "Best-fit candidate: ACME ACME-LFP-100-215 (100kW/215kWh)",
            },
          ],
        },
        "orgId": "org",
        "playbookAlignment": "neutral",
        "playbookId": null,
        "playbookRationale": null,
        "projectId": "p1",
        "requiredInputsMissing": [],
        "score": 0.943,
        "stateId": "baseline",
        "status": "proposed",
        "suggestedMeasure": {
          "label": "Battery peak shaving (ACME ACME-LFP-100-215)",
          "measureType": "BATTERY_PEAK_SHAVE",
          "parameters": {
            "candidateSku": "ACME-LFP-100-215",
            "candidateVendor": "ACME",
            "kw": 100,
            "kwh": 215,
            "roundTripEfficiency": 0.9,
          },
          "tags": [
            "battery",
            "peak_shaving",
          ],
        },
        "suggestionId": "s_battery_1",
      }
    `);
  });
});

