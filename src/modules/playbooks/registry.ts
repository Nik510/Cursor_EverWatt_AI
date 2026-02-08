import type { Project } from '../project/types';
import type { MeasureType } from '../measures/types';
import type { EverWattPlaybook, PlaybookAlignment, PlaybookMatch, PlaybookMeasureRule } from './types';

function normText(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 _/-]+/g, '')
    .trim();
}

function getProjectBuildingType(project: Project): string {
  const pb: any = (project as any)?.projectBuilder || {};
  return normText(pb?.building?.buildingType) || normText(pb?.customer?.facilityType) || 'unknown';
}

function getProjectSqft(project: Project): number | null {
  const pb: any = (project as any)?.projectBuilder || {};
  const raw = pb?.building?.sqft ?? pb?.customer?.sqft ?? null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function getProjectScheduleBucket(project: Project): '24_7' | 'business_hours' | 'mixed' | 'unknown' {
  const pb: any = (project as any)?.projectBuilder || {};
  const b = String(pb?.building?.operatingSchedule?.bucket || '').trim();
  if (b === '24_7' || b === 'business_hours' || b === 'mixed' || b === 'unknown') return b;
  return 'unknown';
}

function getProjectSystemTypes(project: Project): Set<string> {
  const pb: any = (project as any)?.projectBuilder || {};
  const graph: any = pb?.graph || {};
  const assets: any[] = Array.isArray(graph?.assets) ? graph.assets : [];
  return new Set(assets.map((a) => String(a?.type || '').trim()).filter(Boolean));
}

export function getPlaybooksV1(): EverWattPlaybook[] {
  const officePreferred: PlaybookMeasureRule[] = [
    { measureType: 'VFD_RETROFIT', rationale: 'Office/commercial loads often run part-load; VFDs are a common high-impact baseline.' },
    { measureType: 'EMS_TUNING', rationale: 'Controls tuning captures schedule drift and setpoint/sequence issues common in offices.' },
    { measureType: 'AHU_SCHEDULE_OPT', rationale: 'Schedule optimization is often the first operational win when after-hours runtime exists.' },
    { measureType: 'VAV_RESET', rationale: 'Static pressure / VAV resets reduce fan energy when zones are diverse and part-load dominates.' },
    { measureType: 'CHILLED_WATER_RESET', rationale: 'CHW reset improves plant efficiency when comfort allows.' },
    { measureType: 'LIGHTING_RETROFIT', rationale: 'LED retrofits remain a frequent baseline measure where fixtures are legacy.' },
    { measureType: 'OCCUPANCY_CONTROLS', rationale: 'Occupancy controls provide reliable savings in intermittently occupied spaces.' },
  ];

  const officeDiscouraged: PlaybookMeasureRule[] = [
    { measureType: 'STEAM_OPTIMIZATION', rationale: 'Not typically relevant unless a steam system is confirmed.' },
    { measureType: 'RADIATOR_TRV', rationale: 'Not typically relevant unless hydronic radiator distribution is confirmed.' },
  ];

  const healthcarePreferred: PlaybookMeasureRule[] = [
    { measureType: 'PUMP_VFD', rationale: 'Healthcare is often 24/7 with high pumping runtime; pump VFDs are frequently standard.' },
    { measureType: 'CHILLER_PLANT_OPT', rationale: 'Central plants are common; sequencing/optimization often delivers durable operational improvements.' },
    { measureType: 'CHILLED_WATER_RESET', rationale: 'CHW reset is a common, controllable plant lever when conditions permit.' },
    { measureType: 'HOT_WATER_RESET', rationale: 'HW reset is common where boilers serve reheat/DHW and control is available.' },
    { measureType: 'EMS_TUNING', rationale: 'Controls tuning is essential to keep 24/7 facilities from drifting operationally.' },
    { measureType: 'VAV_RESET', rationale: 'VAV/duct pressure resets are often applicable in large multi-zone healthcare buildings.' },
  ];

  const healthcareDiscouraged: PlaybookMeasureRule[] = [
    { measureType: 'OCCUPANCY_CONTROLS', rationale: 'Use selectively; many clinical areas require minimum lighting/occupancy assumptions.' },
  ];

  return [
    {
      playbookId: 'playbook_healthcare_baseline_v1',
      buildingType: 'healthcare',
      applicabilityConditions: {
        scheduleBucket: '24_7',
        systemAnyOf: ['chiller', 'pump', 'ahu', 'vav'],
      },
      preferredMeasures: healthcarePreferred,
      discouragedMeasures: healthcareDiscouraged,
      priority: 'HIGH',
      version: 'v1',
      authoredBy: 'EverWatt doctrine',
    },
    {
      playbookId: 'playbook_office_commercial_baseline_v1',
      buildingType: 'office',
      applicabilityConditions: {
        sqftMin: 20_000,
        systemAnyOf: ['ahu', 'vav', 'fan', 'lightingFixture'],
      },
      preferredMeasures: officePreferred,
      discouragedMeasures: officeDiscouraged,
      priority: 'MED',
      version: 'v1',
      authoredBy: 'EverWatt doctrine',
    },
    {
      playbookId: 'playbook_commercial_baseline_v1',
      buildingType: 'commercial',
      applicabilityConditions: {
        sqftMin: 20_000,
        systemAnyOf: ['ahu', 'vav', 'fan', 'lightingFixture'],
      },
      preferredMeasures: officePreferred,
      discouragedMeasures: officeDiscouraged,
      priority: 'MED',
      version: 'v1',
      authoredBy: 'EverWatt doctrine',
    },
  ];
}

export function matchPlaybooks(project: Project, playbooks: EverWattPlaybook[] = getPlaybooksV1()): PlaybookMatch[] {
  const bt = getProjectBuildingType(project);
  const sqft = getProjectSqft(project);
  const sched = getProjectScheduleBucket(project);
  const systems = getProjectSystemTypes(project);

  const out: PlaybookMatch[] = [];
  for (const pb of playbooks) {
    const because: string[] = [];
    if (normText(pb.buildingType) !== bt) continue;
    because.push(`buildingType=${bt}`);

    const conditions = pb.applicabilityConditions
      ? Array.isArray(pb.applicabilityConditions)
        ? pb.applicabilityConditions
        : [pb.applicabilityConditions]
      : [];

    const matchesCondition = (c: any): { ok: boolean; because: string[] } => {
      const b: string[] = [];

      if (typeof c?.sqftMin === 'number' && (sqft == null || sqft < c.sqftMin)) return { ok: false, because: [] };
      if (typeof c?.sqftMax === 'number' && (sqft == null || sqft > c.sqftMax)) return { ok: false, because: [] };
      if (typeof c?.sqftMin === 'number' || typeof c?.sqftMax === 'number') b.push(`sqft=${sqft ?? 'unknown'}`);

      if (c?.scheduleBucket && c.scheduleBucket !== 'unknown') {
        if (sched !== c.scheduleBucket) return { ok: false, because: [] };
        b.push(`schedule=${sched}`);
      }

      if (Array.isArray(c?.systemAnyOf) && c.systemAnyOf.length) {
        const ok = c.systemAnyOf.some((t: any) => systems.has(String(t).trim()));
        if (!ok) return { ok: false, because: [] };
        b.push(`systemAnyOf=${c.systemAnyOf.join(',')}`);
      }

      if (Array.isArray(c?.systemAllOf) && c.systemAllOf.length) {
        const ok = c.systemAllOf.every((t: any) => systems.has(String(t).trim()));
        if (!ok) return { ok: false, because: [] };
        b.push(`systemAllOf=${c.systemAllOf.join(',')}`);
      }

      return { ok: true, because: b };
    };

    if (conditions.length) {
      const okBecause = conditions.map(matchesCondition).find((x) => x.ok);
      if (!okBecause) continue;
      because.push(...okBecause.because);
    }

    out.push({ playbook: pb, matchedBecause: because });
  }

  // Priority order: HIGH > MED > LOW
  const rank = (p: string) => (p === 'HIGH' ? 3 : p === 'MED' ? 2 : 1);
  return out.sort((a, b) => rank(b.playbook.priority) - rank(a.playbook.priority));
}

export function playbookAlignmentForMeasure(args: {
  matches: PlaybookMatch[];
  measureType: MeasureType;
}): { alignment: PlaybookAlignment; rationale: string | null; playbookId: string | null } {
  for (const m of args.matches) {
    const pref = m.playbook.preferredMeasures.find((x) => x.measureType === args.measureType);
    if (pref) return { alignment: 'preferred', rationale: pref.rationale, playbookId: m.playbook.playbookId };
    const dis = (m.playbook.discouragedMeasures || []).find((x) => x.measureType === args.measureType);
    if (dis) return { alignment: 'discouraged', rationale: dis.rationale, playbookId: m.playbook.playbookId };
  }
  return { alignment: 'neutral', rationale: null, playbookId: null };
}

export function playbookScoreMultiplier(alignment: PlaybookAlignment): number {
  if (alignment === 'preferred') return 1.15;
  if (alignment === 'discouraged') return 0.85;
  return 1.0;
}

