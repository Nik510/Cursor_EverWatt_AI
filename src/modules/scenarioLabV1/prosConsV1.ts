import type { ScenarioResultV1 } from './types';

function safeString(x: unknown, max = 180): string {
  const s = String(x ?? '').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, Math.max(0, max - 14)) + ' …(truncated)' : s;
}

function uniqBound(items: string[], max: number): string[] {
  const set = new Set<string>();
  for (const it of items) {
    const s = safeString(it, 180);
    if (!s) continue;
    set.add(s);
  }
  return Array.from(set).slice(0, max);
}

export function deriveProsConsV1(s: ScenarioResultV1): { pros: string[]; cons: string[] } {
  const pros: string[] = [];
  const cons: string[] = [];

  if (s.status === 'BLOCKED') {
    cons.push('Blocked until required inputs are provided.');
    if (s.gating.requiredNextData.length) cons.push(`Needs: ${s.gating.requiredNextData.slice(0, 4).join(', ')}`);
  }

  if (s.category === 'BATTERY') {
    pros.push('Leverages deterministic battery decision pack outputs (snapshot-only).');
    cons.push('Savings are gated by verifier + claims policy.');
  }
  if (s.category === 'TARIFF') {
    pros.push('Highlights tariff match confidence and risk flags without recompute.');
    cons.push('No tariff optimizer in v1; no switch savings computed.');
  }
  if (s.category === 'RELIABILITY') {
    pros.push('Captures resilience-oriented scenarios (backup-only).');
    cons.push('Resilience value is not monetized in v1 templates.');
  }
  if (s.category === 'OPS') {
    pros.push('Operational readiness scenario to de-risk deployment.');
    cons.push('Program/DR value is not monetized in v1 templates.');
  }

  if (s.kpis.annualUsd === null && s.status === 'RAN') cons.push('Annual savings claim suppressed (gating/claims policy).');
  if (s.kpis.capexUsd === null) cons.push('Capex not available in stored snapshot for this scenario.');

  return { pros: uniqBound(pros, 5), cons: uniqBound(cons, 5) };
}

