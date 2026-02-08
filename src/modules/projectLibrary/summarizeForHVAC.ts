import type { ProjectRecord } from './projectRecord';

export type HVACProjectSummary = {
  project_id: string;
  project_slug: string;
  building_type: string;
  project_year?: number;
  systems: Array<{
    system_type: string;
    description?: string;
  }>;
  measures: Array<{
    title: string;
    description?: string;
  }>;
  calc_outputs: {
    annual_kwh_savings?: number;
    annual_therm_savings?: number;
    kw_reduction?: number;
    annual_cost_savings_usd?: number;
  };
  assumptions_summary: string;
  implementation_notes: string;
};

function truncate(s: string | undefined, maxChars: number): string {
  const v = String(s || '').trim();
  if (!v) return '';
  if (v.length <= maxChars) return v;
  return `${v.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function assumptionsSummary(project: ProjectRecord): string {
  const notes = truncate(project.assumptions.notes, 240);

  const kv = project.assumptions.kv || {};
  const keys = Object.keys(kv).sort((a, b) => a.localeCompare(b));
  const pairs = keys.slice(0, 12).map((k) => `${k}=${String(kv[k])}`);
  const kvPart = pairs.length ? `kv: ${pairs.join(', ')}${keys.length > pairs.length ? ', …' : ''}` : '';

  return [notes, kvPart].filter(Boolean).join(' | ');
}

/**
 * Deterministic, read-only HVAC-focused summary for retrieval consumers.
 * No ingestion/parsing logic is added here.
 */
export function summarizeForHVAC(project: ProjectRecord): HVACProjectSummary {
  return {
    project_id: project.project_id,
    project_slug: project.project_slug,
    building_type: project.building_type,
    project_year: project.project_year,
    systems: project.systems.map((s) => ({
      system_type: s.system_type,
      description: truncate(s.description, 140) || undefined,
    })),
    measures: project.measures.map((m) => ({
      title: m.name,
      description: truncate(m.description || m.notes, 160) || undefined,
    })),
    calc_outputs: {
      annual_kwh_savings: project.calc_outputs.annual_kwh_savings,
      annual_therm_savings: project.calc_outputs.annual_therm_savings,
      kw_reduction: project.calc_outputs.kw_reduction,
      annual_cost_savings_usd: project.calc_outputs.annual_cost_savings_usd,
    },
    assumptions_summary: assumptionsSummary(project),
    implementation_notes: truncate(project.implementation_notes, 500),
  };
}

