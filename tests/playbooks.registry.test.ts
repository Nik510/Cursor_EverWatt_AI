import { describe, expect, test } from 'vitest';
import { matchPlaybooks } from '../src/modules/playbooks/registry';
import type { Project } from '../src/modules/project/types';

describe('Playbooks v1 - registry matching', () => {
  test('matches healthcare playbook for 24/7 healthcare with plant systems', () => {
    const p: Project = {
      orgId: 'org',
      projectId: 'p1',
      status: 'active',
      projectBuilder: {
        id: 'p1',
        driveFolderLink: '',
        customer: { projectNumber: 'P1', companyName: 'X', facilityType: 'healthcare' },
        building: { buildingType: 'healthcare', operatingSchedule: { bucket: '24_7' }, sqft: 300000 },
        graph: { assets: [{ kind: 'asset', id: 'c1', assetTag: 'CH-1', type: 'chiller' } as any], measures: [], inbox: [] } as any,
      } as any,
    };
    const matches = matchPlaybooks(p);
    expect(matches[0]?.playbook?.playbookId).toContain('healthcare');
  });

  test('matches office/commercial playbook for office', () => {
    const p: Project = {
      orgId: 'org',
      projectId: 'p2',
      status: 'active',
      projectBuilder: {
        id: 'p2',
        driveFolderLink: '',
        customer: { projectNumber: 'P2', companyName: 'X', facilityType: 'office' },
        building: { buildingType: 'office', sqft: 120000 },
        graph: { assets: [{ kind: 'asset', id: 'a1', assetTag: 'AHU-1', type: 'ahu' } as any], measures: [], inbox: [] } as any,
      } as any,
    };
    const matches = matchPlaybooks(p);
    expect(matches[0]?.playbook?.playbookId).toContain('office');
  });
});

