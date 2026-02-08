import { describe, expect, test } from 'vitest';
import { readFile } from 'fs/promises';
import path from 'path';
import { importCompletedProjectFromJson } from '../src/modules/project/importCompletedProject';
import { buildMemoryIndexV1 } from '../src/modules/memory/buildMemoryIndex';
import { generateRecommendationsV1 } from '../src/modules/recommendations/generateRecommendations';
import type { ProjectRecord } from '../src/types/change-order';

async function readJson(fp: string): Promise<any> {
  const raw = await readFile(fp, 'utf-8');
  return JSON.parse(raw);
}

describe('Golden path: completed project memory + recommendations (measures)', () => {
  test('imports fixtures, normalizes measureType, builds index, and generates explainable inbox-only suggestions', async () => {
    const importedAtIso = '2026-01-05T00:00:00.000Z';
    const healthcare = await readJson(path.join(process.cwd(), 'samples', 'completed_project_healthcare.json'));
    const commercial = await readJson(path.join(process.cwd(), 'samples', 'completed_project_commercial.json'));

    const a = importCompletedProjectFromJson({ input: healthcare, importedAtIso });
    const b = importCompletedProjectFromJson({ input: commercial, importedAtIso });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) return;

    // Measure normalization assertions
    const aTypes = a.record.measuresImplemented.map((m) => m.measureType);
    const bTypes = b.record.measuresImplemented.map((m) => m.measureType);
    expect(aTypes.filter((t) => t === 'PUMP_VFD').length).toBeGreaterThanOrEqual(3);
    expect(bTypes.filter((t) => t === 'VFD_RETROFIT').length).toBeGreaterThanOrEqual(3);

    const orgId = 'demo-org';
    const index = buildMemoryIndexV1({ orgId, projects: [a.record, b.record], generatedAtIso: importedAtIso });

    const target: ProjectRecord = {
      id: 'p_target',
      driveFolderLink: '',
      customer: { projectNumber: 'P-TARGET', companyName: 'ACME', facilityType: 'commercial' },
      graph: {
        assets: [
          { kind: 'asset', id: 'fan-1', assetTag: 'FAN-1', type: 'fan' as any, baseline: { properties: { motorHp: '10' } } },
          { kind: 'asset', id: 'ahu-1', assetTag: 'AHU-1', type: 'ahu' as any, baseline: { properties: { motorHp: '15' } } },
          // Present lighting fixtures but omit fixtureWatts to force missing-input detection
          { kind: 'asset', id: 'ltg-1', assetTag: 'LTG-1', type: 'lightingFixture' as any, baseline: { properties: {} } },
        ] as any,
        measures: [],
        inbox: [],
      } as any,
    };

    let sid = 0;
    let iid = 0;
    const { suggestions, inboxItems } = generateRecommendationsV1({
      orgId,
      projectId: 'p_target',
      targetProject: target,
      memoryIndex: index,
      completedProjects: [a.record, b.record],
      topN: 2,
      nowIso: importedAtIso,
      idFactory: () => `s_${++sid}`,
      inboxIdFactory: () => `i_${++iid}`,
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(inboxItems.length).toBe(suggestions.length);

    // Grouping by measureType: no duplicates in suggestion list
    const seen = new Set<string>();
    for (const s of suggestions) {
      const mt = s.suggestedMeasure.measureType;
      expect(seen.has(mt)).toBe(false);
      seen.add(mt);
    }

    const ems = suggestions.find((s) => s.suggestedMeasure.measureType === 'EMS_TUNING');
    const lighting = suggestions.find((s) => s.suggestedMeasure.measureType === 'LIGHTING_RETROFIT');
    expect(ems).toBeTruthy();
    expect(lighting).toBeTruthy();

    expect(ems?.requiredInputsMissing || []).toEqual(
      expect.arrayContaining(['utility interval electricity data (15-min or hourly)', 'building or AHU operating schedule (needed to validate schedule changes)'])
    );
    expect(lighting?.requiredInputsMissing || []).toEqual(expect.arrayContaining(['existing fixture wattage (per fixture or per lamp)']));

    // Explainability checks
    for (const s of suggestions) {
      expect(s.explain.topContributors.length).toBeGreaterThan(0);
      expect(s.explain.topContributors.length).toBeLessThanOrEqual(3);
      expect(s.explain.frequency.seenInCount).toBeGreaterThan(0);
      expect(s.explain.frequency.sampleSizeTopN).toBeGreaterThan(0);
      expect(s.explain.frequency.seenInCount).toBeLessThanOrEqual(s.explain.frequency.sampleSizeTopN);
      expect(s.explain.frequency.text).toContain(`seen in ${s.explain.frequency.seenInCount}/${s.explain.frequency.sampleSizeTopN}`);
      expect(s.explain.matchingFeaturesUsed).toEqual(expect.arrayContaining(['buildingType', 'assetInventory', 'territory']));
    }
  });
});

