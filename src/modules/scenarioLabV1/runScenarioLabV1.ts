import type { ClaimsPolicyV1 } from '../claimsPolicyV1/types';
import type { VerifierResultV1 } from '../verifierV1/types';
import type { TruthSnapshotV1 } from '../truthEngineV1/types';
import { buildBlockedScenariosV1 } from './blockedByDataV1';
import { buildFrontierV1 } from './frontierV1';
import { deriveProsConsV1 } from './prosConsV1';
import { scenarioTemplatesV1 } from './scenarioTemplatesV1';
import type { ScenarioLabResultV1, ScenarioResultV1 } from './types';

type StoredRunSnapshotLike = any;

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

function truthTier(truthSnapshotV1: TruthSnapshotV1 | null): 'A' | 'B' | 'C' | 'UNKNOWN' {
  const t = safeString(truthSnapshotV1?.truthConfidence?.tier, 10).toUpperCase();
  return t === 'A' || t === 'B' || t === 'C' ? (t as any) : 'UNKNOWN';
}

function coverageFromStored(storedRunSnapshot: StoredRunSnapshotLike): any {
  const trace: any = storedRunSnapshot?.analysisTraceV1 ?? storedRunSnapshot?.workflow?.analysisTraceV1 ?? null;
  return trace?.coverage ?? {};
}

export function runScenarioLabV1(args: {
  storedRunSnapshot: StoredRunSnapshotLike;
  truthSnapshotV1: TruthSnapshotV1 | null;
  verifierResultV1: VerifierResultV1 | null;
  claimsPolicyV1: ClaimsPolicyV1 | null;
  constraints?: { maxScenarios?: number; maxFrontierPoints?: number } | null;
}): ScenarioLabResultV1 {
  const nowIso =
    safeString(args.storedRunSnapshot?.nowIso, 60) ||
    safeString(args.truthSnapshotV1?.generatedAtIso, 60) ||
    safeString(args.verifierResultV1?.generatedAtIso, 60) ||
    new Date().toISOString();

  const cov = coverageFromStored(args.storedRunSnapshot);
  const tariffMatchStatus = safeString(cov?.tariffMatchStatus, 40).toUpperCase() || 'UNKNOWN';
  const providerType = safeString(cov?.supplyProviderType, 40).toUpperCase() || 'UNKNOWN';

  const verifierStatus = safeString(args.verifierResultV1?.status, 10).toUpperCase() || 'UNKNOWN';
  const claimsStatus = safeString(args.claimsPolicyV1?.status, 10).toUpperCase() || 'UNKNOWN';

  const maxScenarios = Number.isFinite(Number(args.constraints?.maxScenarios)) ? Math.max(1, Math.trunc(Number(args.constraints!.maxScenarios))) : 25;
  const maxFrontierPoints = Number.isFinite(Number(args.constraints?.maxFrontierPoints))
    ? Math.max(1, Math.trunc(Number(args.constraints!.maxFrontierPoints)))
    : 15;

  const scenarios: ScenarioResultV1[] = [];
  const labWarnings: string[] = [];

  for (const t of scenarioTemplatesV1.slice(0, Math.min(25, scenarioTemplatesV1.length))) {
    if (scenarios.length >= maxScenarios) break;
    const out = t.evaluate({
      storedRunSnapshot: args.storedRunSnapshot,
      truthSnapshotV1: args.truthSnapshotV1,
      verifierResultV1: args.verifierResultV1,
      claimsPolicyV1: args.claimsPolicyV1,
    });

    const base: ScenarioResultV1 = {
      ...(out as any),
      pros: [],
      cons: [],
    } satisfies ScenarioResultV1;

    const pc = deriveProsConsV1(base);
    const s: ScenarioResultV1 = { ...base, pros: pc.pros, cons: pc.cons };
    scenarios.push(s);

    const w = (out as any)?.notes?.warnings;
    if (Array.isArray(w)) labWarnings.push(...w.map(String));
  }

  // Deterministic ordering for scenarios
  scenarios.sort((a, b) => a.category.localeCompare(b.category) || a.scenarioId.localeCompare(b.scenarioId));

  // Frontier (bounded, deterministic)
  const frontier = buildFrontierV1({ scenarios, maxPoints: maxFrontierPoints });

  // Blocked scenarios (bounded, deterministic)
  const blockedScenarios = buildBlockedScenariosV1({ scenarios, max: Math.min(25, maxScenarios) });

  // Aggregate lab warnings deterministically (include template gating signals)
  const gatingWarnings = scenarios
    .flatMap((s) => (Array.isArray(s.gating.blockedReasons) ? s.gating.blockedReasons : []))
    .filter((x) => String(x).includes('LIMITED_BY_CLAIMS_POLICY') || String(x).includes('verifier:FAIL'));

  const labWarningsOut = uniqSorted([...labWarnings, ...gatingWarnings], 80);

  return {
    schemaVersion: 'scenarioLabV1',
    generatedAtIso: nowIso,
    inputsSummary: {
      hasInterval: Boolean(cov?.hasInterval),
      intervalDays: cov?.intervalDays ?? null,
      tariffMatchStatus,
      providerType,
      truthConfidenceTier: truthTier(args.truthSnapshotV1),
      verifierStatus,
      claimsStatus,
    },
    scenarios: scenarios.slice(0, maxScenarios),
    frontier: { ...frontier, points: frontier.points.slice(0, maxFrontierPoints) },
    blockedScenarios,
    labWarnings: labWarningsOut,
  };
}

