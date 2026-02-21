import type { BlockedScenarioV1, ScenarioResultV1 } from './types';

function safeString(x: unknown, max = 220): string {
  const s = String(x ?? '').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, Math.max(0, max - 14)) + ' …(truncated)' : s;
}

function uniqSorted(items: string[], max: number): string[] {
  const set = new Set<string>();
  for (const it of items) {
    const s = safeString(it, 200);
    if (!s) continue;
    set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, max);
}

export function buildBlockedScenariosV1(args: { scenarios: ScenarioResultV1[]; max?: number }): BlockedScenarioV1[] {
  const max = Number.isFinite(Number(args.max)) ? Math.max(0, Math.trunc(Number(args.max))) : 25;
  const blocked = args.scenarios
    .filter((s) => s.status === 'BLOCKED')
    .map((s) => ({
      scenarioId: safeString(s.scenarioId, 80) || 'scenario',
      title: safeString(s.title, 140) || 'Scenario',
      category: s.category,
      blockedReasons: uniqSorted(s.gating.blockedReasons || [], 40),
      requiredNextData: uniqSorted(s.gating.requiredNextData || [], 40),
    }));
  blocked.sort((a, b) => a.category.localeCompare(b.category) || a.scenarioId.localeCompare(b.scenarioId));
  return blocked.slice(0, max);
}

