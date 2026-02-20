import type { WizardStepStatusV1 } from './types';

type MissingInfoLike = { id?: unknown; severity?: unknown };

function uniqSorted(items: string[], max: number): string[] {
  const set = new Set<string>();
  for (const it of items) {
    const s = String(it || '').trim();
    if (!s) continue;
    set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, max);
}

function isRequiredMissingInfoV1(mi: MissingInfoLike): boolean {
  // v0 missing-info uses severity: 'blocking' | 'warning' | 'info'
  const sev = String(mi?.severity ?? '').trim().toLowerCase();
  return sev === 'blocking';
}

export type WizardGatingV1 = {
  blocked: boolean;
  blockedReasons: string[]; // stable, sorted
  partialRunAllowed: boolean;
  runStepStatus: WizardStepStatusV1;
};

/**
 * Deterministic gating:
 * - If required inputs are missing OR missingInfo contains REQUIRED items, the run step is BLOCKED
 *   unless `runAnywayChosen` is true.
 * - No heuristics; only organizes existing workflow outputs.
 */
export function computeWizardGatingV1(args: {
  requiredInputsMissing?: unknown;
  missingInfo?: unknown;
  runAnywayChosen?: boolean;
}): WizardGatingV1 {
  const requiredInputsMissing = Array.isArray(args.requiredInputsMissing) ? (args.requiredInputsMissing as any[]) : [];
  const requiredInputsMissingNorm = requiredInputsMissing.map((x) => String(x ?? '').trim()).filter(Boolean);

  const missingInfo = Array.isArray(args.missingInfo) ? (args.missingInfo as any[]) : [];
  const requiredMissingInfoIds = missingInfo
    .filter((m) => m && typeof m === 'object' && isRequiredMissingInfoV1(m as any))
    .map((m) => String((m as any)?.id ?? '').trim())
    .filter(Boolean);

  const hasRequiredMissing = requiredInputsMissingNorm.length > 0 || requiredMissingInfoIds.length > 0;
  const runAnywayChosen = Boolean(args.runAnywayChosen === true);

  const blocked = hasRequiredMissing && !runAnywayChosen;
  const blockedReasons = blocked ? uniqSorted([...requiredInputsMissingNorm, ...requiredMissingInfoIds.map((id) => `missingInfo:${id}`)], 60) : [];
  const partialRunAllowed = hasRequiredMissing && runAnywayChosen;

  const runStepStatus: WizardStepStatusV1 = blocked ? 'BLOCKED' : 'DONE';
  return { blocked, blockedReasons, partialRunAllowed, runStepStatus };
}

