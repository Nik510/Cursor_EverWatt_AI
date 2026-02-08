import type { EvidenceItemV1 } from '../determinants/types';
import type { CostLineItemV1, NormalizedProjectCostModelV1, ProjectCostModelV1, ReplacementScheduleItemV1 } from './types';

function sumAmounts(items: Array<{ amount: number }> | null | undefined): number {
  const xs = Array.isArray(items) ? items : [];
  return xs.map((x) => Number(x.amount)).filter((n) => Number.isFinite(n)).reduce((s, x) => s + x, 0);
}

function normalizeCategory(c: unknown): string {
  const s = String(c ?? '').trim();
  if (!s) return 'uncategorized';
  return s.toLowerCase().replace(/\s+/g, '_');
}

function normalizeLineItem(it: CostLineItemV1, bucket: 'hard' | 'soft'): CostLineItemV1 {
  return {
    category: normalizeCategory(it.category || `${bucket}_uncategorized`),
    amount: Number(it.amount),
    ...(String(it.notes || '').trim() ? { notes: String(it.notes).trim() } : {}),
    ...(Array.isArray(it.evidence) && it.evidence.length ? { evidence: it.evidence } : {}),
  };
}

function normalizeReplacement(it: ReplacementScheduleItemV1): ReplacementScheduleItemV1 | null {
  const year = Math.floor(Number(it.year));
  const amount = Number(it.amount);
  if (!Number.isFinite(year) || year < 0) return null;
  if (!Number.isFinite(amount)) return null;
  return {
    year,
    amount,
    ...(String(it.category || '').trim() ? { category: normalizeCategory(it.category) } : {}),
    ...(Array.isArray(it.evidence) && it.evidence.length ? { evidence: it.evidence } : {}),
  };
}

export function normalizeCostsV1(input: ProjectCostModelV1): NormalizedProjectCostModelV1 {
  const warnings: string[] = [];
  const evidence: EvidenceItemV1[] = [];
  const because: string[] = [];

  const hard = (Array.isArray(input?.hardCosts) ? input.hardCosts : []).map((x) => normalizeLineItem(x, 'hard'));
  const soft = (Array.isArray(input?.softCosts) ? input.softCosts : []).map((x) => normalizeLineItem(x, 'soft'));
  const replacements = (Array.isArray(input?.replacementSchedule) ? input.replacementSchedule : [])
    .map(normalizeReplacement)
    .filter((x): x is ReplacementScheduleItemV1 => Boolean(x));

  if (!hard.length && !soft.length) warnings.push('No hardCosts/softCosts provided.');
  if (hard.some((x) => !Number.isFinite(x.amount))) warnings.push('Some hardCost line items have non-finite amounts.');
  if (soft.some((x) => !Number.isFinite(x.amount))) warnings.push('Some softCost line items have non-finite amounts.');

  const hardCostTotal = sumAmounts(hard);
  const softCostTotal = sumAmounts(soft);
  const capexTotal = hardCostTotal + softCostTotal;
  const replacementTotal = sumAmounts(replacements);
  const oAndMAnnual = Number.isFinite(Number(input?.oAndMAnnual)) ? Number(input.oAndMAnnual) : null;

  because.push(`Computed hardCostTotal=${hardCostTotal.toFixed(2)}, softCostTotal=${softCostTotal.toFixed(2)}, capexTotal=${capexTotal.toFixed(2)}.`);
  because.push(`Computed replacementTotal=${replacementTotal.toFixed(2)} across ${replacements.length} scheduled replacement item(s).`);
  if (oAndMAnnual !== null) because.push(`Recorded oAndMAnnual=${oAndMAnnual.toFixed(2)}.`); else warnings.push('O&M annual cost not provided.');

  evidence.push({ kind: 'assumption', pointer: { source: 'costModel:normalizeCostsV1', key: 'categoryNormalization', value: 'lowercase_with_underscores' } });

  return {
    hardCosts: hard,
    softCosts: soft,
    ...(oAndMAnnual !== null ? { oAndMAnnual } : {}),
    ...(replacements.length ? { replacementSchedule: replacements } : {}),
    ...(input.escalationAssumptions ? { escalationAssumptions: input.escalationAssumptions } : {}),
    ...(input.financingAssumptions ? { financingAssumptions: input.financingAssumptions } : {}),
    ...(String(input.notes || '').trim() ? { notes: String(input.notes).trim() } : {}),
    totals: {
      hardCostTotal,
      softCostTotal,
      capexTotal,
      replacementTotal,
      oAndMAnnual,
    },
    warnings,
    evidence,
    because,
  };
}

