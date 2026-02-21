import type { FrontierPointV1, ScenarioFrontierV1, ScenarioLabConfidenceTierV1, ScenarioResultV1 } from './types';

function safeString(x: unknown, max = 220): string {
  const s = String(x ?? '').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, Math.max(0, max - 14)) + ' …(truncated)' : s;
}

function tierRank(t: ScenarioLabConfidenceTierV1): number {
  return t === 'A' ? 3 : t === 'B' ? 2 : 1;
}

function numOrNull(x: unknown): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function dominates(a: FrontierPointV1, b: FrontierPointV1): boolean {
  // Maximize savings, minimize capex, maximize confidence, minimize payback.
  // Null handling: treat null as "unknown" and never dominating a known value on that axis.
  const aSav = numOrNull(a.annualUsd ?? a.annualKwh);
  const bSav = numOrNull(b.annualUsd ?? b.annualKwh);
  const aCap = numOrNull(a.capexUsd);
  const bCap = numOrNull(b.capexUsd);
  const aPb = numOrNull(a.paybackYears);
  const bPb = numOrNull(b.paybackYears);

  const aConf = tierRank(a.confidenceTier);
  const bConf = tierRank(b.confidenceTier);

  const ge = (x: number | null, y: number | null): boolean => (x === null || y === null ? false : x >= y);
  const le = (x: number | null, y: number | null): boolean => (x === null || y === null ? false : x <= y);

  const betterOrEqSavings = aSav === null || bSav === null ? aSav !== null && bSav === null : aSav >= bSav;
  const betterOrEqCapex = aCap === null || bCap === null ? aCap !== null && bCap === null : aCap <= bCap;
  const betterOrEqPayback = aPb === null || bPb === null ? aPb !== null && bPb === null : aPb <= bPb;
  const betterOrEqConf = aConf >= bConf;

  const strictlyBetter =
    (aSav !== null && bSav !== null && aSav > bSav) ||
    (aCap !== null && bCap !== null && aCap < bCap) ||
    (aPb !== null && bPb !== null && aPb < bPb) ||
    aConf > bConf;

  // If any comparable axis is worse, it can't dominate.
  const comparableWorse =
    (ge(bSav, aSav) && bSav !== null && aSav !== null && aSav < bSav) ||
    (le(bCap, aCap) && bCap !== null && aCap !== null && aCap > bCap) ||
    (le(bPb, aPb) && bPb !== null && aPb !== null && aPb > bPb) ||
    bConf > aConf;

  if (comparableWorse) return false;
  return betterOrEqSavings && betterOrEqCapex && betterOrEqPayback && betterOrEqConf && strictlyBetter;
}

function toPoint(s: ScenarioResultV1): FrontierPointV1 | null {
  const annualUsd = numOrNull(s.kpis.annualUsd);
  const annualKwh = numOrNull(s.kpis.annualKwh);
  if (annualUsd === null && annualKwh === null) return null;
  return {
    scenarioId: safeString(s.scenarioId, 80) || 'scenario',
    title: safeString(s.title, 140) || 'Scenario',
    confidenceTier: s.confidenceTier,
    annualUsd,
    annualKwh,
    capexUsd: numOrNull(s.kpis.capexUsd),
    paybackYears: numOrNull(s.kpis.paybackYears),
  };
}

export function buildFrontierV1(args: { scenarios: ScenarioResultV1[]; maxPoints?: number }): ScenarioFrontierV1 {
  const maxPoints = Number.isFinite(Number(args.maxPoints)) ? Math.max(1, Math.trunc(Number(args.maxPoints))) : 15;

  const candidates = args.scenarios
    .filter((s) => s.status === 'RAN')
    .map(toPoint)
    .filter(Boolean) as FrontierPointV1[];

  // Deterministic ordering baseline before Pareto filter.
  candidates.sort((a, b) => {
    const as = numOrNull(a.annualUsd ?? a.annualKwh) ?? -Infinity;
    const bs = numOrNull(b.annualUsd ?? b.annualKwh) ?? -Infinity;
    const ac = numOrNull(a.capexUsd) ?? Infinity;
    const bc = numOrNull(b.capexUsd) ?? Infinity;
    return (
      bs - as ||
      ac - bc ||
      tierRank(b.confidenceTier) - tierRank(a.confidenceTier) ||
      (numOrNull(a.paybackYears) ?? Infinity) - (numOrNull(b.paybackYears) ?? Infinity) ||
      a.scenarioId.localeCompare(b.scenarioId)
    );
  });

  // Pareto selection (deterministic).
  const frontier: FrontierPointV1[] = [];
  for (const p of candidates) {
    let dominatedByExisting = false;
    for (const q of frontier) {
      if (dominates(q, p)) {
        dominatedByExisting = true;
        break;
      }
    }
    if (dominatedByExisting) continue;

    // Remove points dominated by the new one.
    const kept: FrontierPointV1[] = [];
    for (const q of frontier) {
      if (!dominates(p, q)) kept.push(q);
    }
    kept.push(p);
    kept.sort((a, b) => a.scenarioId.localeCompare(b.scenarioId));
    frontier.length = 0;
    frontier.push(...kept);
  }

  // Bound + stable order for output: sort by savings desc, capex asc, then id.
  frontier.sort((a, b) => {
    const as = numOrNull(a.annualUsd ?? a.annualKwh) ?? -Infinity;
    const bs = numOrNull(b.annualUsd ?? b.annualKwh) ?? -Infinity;
    const ac = numOrNull(a.capexUsd) ?? Infinity;
    const bc = numOrNull(b.capexUsd) ?? Infinity;
    return bs - as || ac - bc || tierRank(b.confidenceTier) - tierRank(a.confidenceTier) || a.scenarioId.localeCompare(b.scenarioId);
  });

  // Add a tiny note for excluded axes ambiguity.
  const pointsOut = frontier.slice(0, maxPoints).map((p) => ({
    ...p,
    ...(p.annualUsd === null && p.annualKwh !== null ? { note: 'usd_unavailable_using_kwh' } : {}),
  }));

  const savingsAxis: 'annualUsd' | 'annualKwh' = pointsOut.some((p) => p.annualUsd !== null) ? 'annualUsd' : 'annualKwh';
  return {
    axes: { savingsAxis, capexAxis: 'capexUsd', confidenceAxis: 'confidenceTier', paybackAxis: 'paybackYears' },
    points: pointsOut,
  };
}

