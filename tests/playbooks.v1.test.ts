import { describe, expect, test } from 'vitest';
import type { ProjectRecord } from '../src/types/change-order';
import type { CompletedProjectRecord, Project } from '../src/modules/project/types';
import { matchPlaybooks } from '../src/modules/playbooks/registry';
import { buildMemoryIndexV1 } from '../src/modules/memory/buildMemoryIndex';
import { generateRecommendationsV1 } from '../src/modules/recommendations/generateRecommendations';

function mkProject(args: { orgId: string; projectId: string; projectBuilder: ProjectRecord }): Project {
  return { orgId: args.orgId, projectId: args.projectId, status: 'active', projectBuilder: args.projectBuilder };
}

describe('EverWatt Playbooks v1', () => {
  test('matches the correct playbook for healthcare vs office', () => {
    const healthcareTarget: ProjectRecord = {
      id: 'p_hc',
      driveFolderLink: '',
      building: { buildingType: 'healthcare', sqft: 325000, operatingSchedule: { bucket: '24_7' } as any } as any,
      customer: { projectNumber: 'HC-1', companyName: 'ACME', facilityType: 'healthcare' } as any,
      graph: {
        assets: [
          { kind: 'asset', id: 'a1', assetTag: 'CH-1', type: 'chiller' as any, baseline: { properties: {} } },
          { kind: 'asset', id: 'a2', assetTag: 'PMP-1', type: 'pump' as any, baseline: { properties: {} } },
          { kind: 'asset', id: 'a3', assetTag: 'AHU-1', type: 'ahu' as any, baseline: { properties: {} } },
        ] as any,
        measures: [],
        inbox: [],
      } as any,
    };

    const officeTarget: ProjectRecord = {
      id: 'p_office',
      driveFolderLink: '',
      building: { buildingType: 'office', sqft: 100000, operatingSchedule: { bucket: 'business_hours' } as any } as any,
      customer: { projectNumber: 'OFF-1', companyName: 'ACME', facilityType: 'office' } as any,
      graph: {
        assets: [
          { kind: 'asset', id: 'a1', assetTag: 'AHU-1', type: 'ahu' as any, baseline: { properties: {} } },
          { kind: 'asset', id: 'a2', assetTag: 'VAV-1', type: 'vav' as any, baseline: { properties: {} } },
          { kind: 'asset', id: 'a3', assetTag: 'LTG-1', type: 'lightingFixture' as any, baseline: { properties: {} } },
        ] as any,
        measures: [],
        inbox: [],
      } as any,
    };

    const hcMatches = matchPlaybooks(mkProject({ orgId: 'org', projectId: 'p_hc', projectBuilder: healthcareTarget }));
    expect(hcMatches.length).toBeGreaterThan(0);
    expect(hcMatches[0].playbook.playbookId).toContain('healthcare');

    const officeMatches = matchPlaybooks(mkProject({ orgId: 'org', projectId: 'p_office', projectBuilder: officeTarget }));
    expect(officeMatches.length).toBeGreaterThan(0);
    expect(officeMatches[0].playbook.playbookId).toContain('office');
  });

  test('overlays score via playbook alignment (preferred boosts, discouraged dampens)', () => {
    const completed: CompletedProjectRecord[] = [
      {
        completedProjectId: 'cp_1',
        orgId: 'org',
        createdAt: '2025-01-01T00:00:00.000Z',
        importedAt: '2026-01-01T00:00:00.000Z',
        building: { buildingType: 'office', sqft: 100_000, climateZone: 'CA-3', territory: 'PG&E', operatingSchedule: { bucket: 'business_hours' } },
        assetsBefore: { ahuCount: 2, vavCount: 20, fanCount: 6, lightingFixtureCount: 1500 },
        measuresImplemented: [{ measureType: 'VFD_RETROFIT', label: 'VFD retrofit', tags: ['vfd'], parameters: {} }],
        evidenceRefs: [{ refId: 'e1', url: 'https://example.com/p1' }],
      },
      {
        completedProjectId: 'cp_2',
        orgId: 'org',
        createdAt: '2025-02-01T00:00:00.000Z',
        importedAt: '2026-01-01T00:00:00.000Z',
        building: { buildingType: 'office', sqft: 110_000, climateZone: 'CA-3', territory: 'PG&E', operatingSchedule: { bucket: 'business_hours' } },
        assetsBefore: { ahuCount: 2, vavCount: 22, fanCount: 5, lightingFixtureCount: 1600 },
        measuresImplemented: [{ measureType: 'STEAM_OPTIMIZATION', label: 'Steam traps', tags: ['steam'], parameters: {} }],
        evidenceRefs: [{ refId: 'e2', url: 'https://example.com/p2' }],
      },
    ];

    const index = buildMemoryIndexV1({ orgId: 'org', projects: completed, generatedAtIso: '2026-01-02T00:00:00.000Z' });

    const target: ProjectRecord = {
      id: 'p1',
      driveFolderLink: '',
      building: { buildingType: 'office', sqft: 105_000, operatingSchedule: { bucket: 'business_hours' } as any } as any,
      customer: { projectNumber: 'P-1', companyName: 'ACME', facilityType: 'office' } as any,
      graph: {
        assets: [{ kind: 'asset', id: 'a1', assetTag: 'AHU-1', type: 'ahu' as any, baseline: { properties: { motorHp: '10' } } }] as any,
        measures: [],
        inbox: [],
      } as any,
    };

    const { suggestions } = generateRecommendationsV1({
      orgId: 'org',
      projectId: 'p1',
      stateId: 'baseline',
      targetProject: target,
      memoryIndex: index,
      completedProjects: completed,
      topN: 2,
      nowIso: '2026-01-03T00:00:00.000Z',
      idFactory: () => 's1',
      inboxIdFactory: () => 'i1',
    });

    const vfd = suggestions.find((s) => s.suggestedMeasure.measureType === 'VFD_RETROFIT');
    const steam = suggestions.find((s) => s.suggestedMeasure.measureType === 'STEAM_OPTIMIZATION');
    expect(vfd).toBeTruthy();
    expect(steam).toBeTruthy();
    if (!vfd || !steam) return;

    // With 2 equally similar projects, baseScore should be ~0.5 for a measure seen in 1/2.
    expect(vfd.playbookAlignment).toBe('preferred');
    expect(vfd.explain.scoreOverlay?.baseScore).toBeCloseTo(0.5, 3);
    expect(vfd.explain.scoreOverlay?.multiplier).toBeCloseTo(1.15, 3);
    expect(vfd.score).toBeCloseTo(0.575, 3);

    expect(steam.playbookAlignment).toBe('discouraged');
    expect(steam.explain.scoreOverlay?.baseScore).toBeCloseTo(0.5, 3);
    expect(steam.explain.scoreOverlay?.multiplier).toBeCloseTo(0.85, 3);
    expect(steam.score).toBeCloseTo(0.425, 3);
  });
});

