import type { ClaimsPolicyAllowedClaimsV1, ClaimsPolicyRequiredNextDataItemV1, ClaimsPolicyStatusV1, ClaimsPolicyV1 } from './types';

type MissingInfoLike = { id?: string; severity?: string; description?: string; category?: string };
type EngineWarningLike = { code?: string };

function safeString(x: unknown, max = 240): string {
  const s = String(x ?? '').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, Math.max(0, max - 14)) + ' …(truncated)' : s;
}

function uniqSorted(items: string[], max: number): string[] {
  const set = new Set<string>();
  for (const it of items) {
    const s = safeString(it, 220);
    if (!s) continue;
    set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, max);
}

function normalizeMissingInfo(list: unknown): MissingInfoLike[] {
  const arr: any[] = Array.isArray(list) ? list : [];
  const out: MissingInfoLike[] = [];
  for (const it of arr) {
    if (!it || typeof it !== 'object') continue;
    const id = safeString((it as any).id, 200);
    const sev = safeString((it as any).severity, 40).toLowerCase();
    const desc = safeString((it as any).description, 500);
    const cat = safeString((it as any).category, 60);
    if (!id && !desc) continue;
    out.push({ id, severity: sev, description: desc, category: cat || undefined });
  }
  // Deterministic ordering: required-ish first, then by id.
  const rank = (s: string | undefined) => (s === 'blocking' || s === 'required' ? 0 : s === 'warning' ? 1 : 2);
  out.sort((a, b) => rank(a.severity) - rank(b.severity) || safeString(a.id).localeCompare(safeString(b.id)) || safeString(a.description).localeCompare(safeString(b.description)));
  return out;
}

function normalizeEngineWarnings(list: unknown): EngineWarningLike[] {
  const arr: any[] = Array.isArray(list) ? list : [];
  const out: EngineWarningLike[] = [];
  for (const it of arr) {
    if (!it || typeof it !== 'object') continue;
    const code = safeString((it as any).code || (it as any).id, 180);
    if (!code) continue;
    out.push({ code });
  }
  out.sort((a, b) => safeString(a.code).localeCompare(safeString(b.code)));
  return out;
}

function isRequiredMissingInfo(mi: MissingInfoLike): boolean {
  const sev = safeString(mi.severity, 40).toLowerCase();
  return sev === 'blocking' || sev === 'required';
}

function tariffMatchStatusUpper(analysisTraceV1: any): string {
  const s = safeString(analysisTraceV1?.coverage?.tariffMatchStatus, 60).toUpperCase();
  return s || 'UNKNOWN';
}

function hasRatchetHistoryFlag(analysisTraceV1: any): boolean | null {
  const v = analysisTraceV1?.coverage?.hasRatchetHistory;
  if (v === null || v === undefined) return null;
  return Boolean(v);
}

function normalizeRequiredInputsMissing(list: unknown): string[] {
  const arr: any[] = Array.isArray(list) ? list : [];
  const out: string[] = [];
  for (const it of arr) {
    const s = safeString(it, 320);
    if (s) out.push(s);
  }
  return uniqSorted(out, 80);
}

function toAllowedClaims(all: boolean): ClaimsPolicyAllowedClaimsV1 {
  return {
    canClaimAnnualUsdSavings: all,
    canClaimDemandSavings: all,
    canRecommendTariffSwitch: all,
    canRecommendBatterySizing: all,
    canClaimEmissionsAvoided: all,
  };
}

export function evaluateClaimsPolicyV1(args: {
  analysisTraceV1: any;
  requiredInputsMissing?: unknown;
  missingInfo?: unknown;
  engineWarnings?: unknown;
  verifierResultV1?: { status?: string } | null;
}): ClaimsPolicyV1 {
  const analysisTraceV1 = args.analysisTraceV1 && typeof args.analysisTraceV1 === 'object' ? args.analysisTraceV1 : {};
  const requiredInputsMissing = normalizeRequiredInputsMissing(args.requiredInputsMissing);
  const missingInfo = normalizeMissingInfo(args.missingInfo);
  const engineWarnings = normalizeEngineWarnings(args.engineWarnings);

  const verifierStatus = safeString(args.verifierResultV1?.status, 10).toUpperCase() || 'PASS';
  const tariffStatus = tariffMatchStatusUpper(analysisTraceV1);
  const ratchetHist = hasRatchetHistoryFlag(analysisTraceV1);

  const blockedReasons: string[] = [];
  const requiredNextData: ClaimsPolicyRequiredNextDataItemV1[] = [];

  const anyRequiredMissingInfo = missingInfo.some(isRequiredMissingInfo);
  const hasRequiredInputsMissing = requiredInputsMissing.length > 0;

  // Baseline: allow everything unless gated.
  let allowed = toAllowedClaims(true);

  // Rule: verifier FAIL blocks all financial claims.
  if (verifierStatus === 'FAIL') {
    blockedReasons.push('verifier:FAIL');
    allowed = toAllowedClaims(false);
  }

  // Rule: missing required inputs/info blocks financial savings claims (but still allows “data needed” outputs).
  if (hasRequiredInputsMissing) {
    for (const s of requiredInputsMissing.slice(0, 20)) blockedReasons.push(`requiredInputsMissing:${safeString(s, 200)}`);
    allowed.canClaimAnnualUsdSavings = false;
    allowed.canClaimDemandSavings = false;
  }
  if (anyRequiredMissingInfo) {
    const req = missingInfo.filter(isRequiredMissingInfo).slice(0, 30);
    for (const mi of req) blockedReasons.push(`missingInfo:REQUIRED:${safeString(mi.id || mi.description, 200)}`);
    allowed.canClaimAnnualUsdSavings = false;
    allowed.canClaimDemandSavings = false;
  }

  // Rule: ratchet history missing blocks demand savings claim.
  if (ratchetHist === false) {
    blockedReasons.push('ratchetHistory:MISSING');
    allowed.canClaimDemandSavings = false;
  }

  // Rule: tariff ambiguous blocks tariff optimization recommendations.
  if (tariffStatus === 'AMBIGUOUS') {
    blockedReasons.push('tariffMatchStatus:AMBIGUOUS');
    allowed.canRecommendTariffSwitch = false;
  }

  // Also gate tariff-switch recommendations when no tariff match.
  if (tariffStatus === 'NOT_FOUND' || tariffStatus === 'UNSUPPORTED' || tariffStatus === 'UNKNOWN') {
    blockedReasons.push(`tariffMatchStatus:${tariffStatus}`);
    allowed.canRecommendTariffSwitch = false;
  }

  // If we can’t claim annual savings, don’t recommend sizing as a “savings-backed” claim.
  if (!allowed.canClaimAnnualUsdSavings) allowed.canRecommendBatterySizing = false;

  // Populate requiredNextData deterministically (bounded).
  const requiredMissing = missingInfo.filter(isRequiredMissingInfo);
  for (const mi of requiredMissing.slice(0, 24)) {
    const code = safeString(mi.id || '', 140) || safeString(mi.description || '', 140);
    const label = safeString(mi.description || mi.id || '', 200) || code;
    if (!code) continue;
    requiredNextData.push({ code, label });
  }
  for (const s of requiredInputsMissing.slice(0, 24)) {
    const code = safeString(s, 140);
    if (!code) continue;
    requiredNextData.push({ code: `required:${code}`, label: code });
  }

  // Deterministic uniq + ordering.
  const reqUniq = new Map<string, ClaimsPolicyRequiredNextDataItemV1>();
  for (const it of requiredNextData) {
    const k = safeString(it.code, 160);
    if (!k) continue;
    if (!reqUniq.has(k)) reqUniq.set(k, { code: k, label: safeString(it.label, 220) || k });
  }
  const requiredNextDataOut = Array.from(reqUniq.values())
    .sort((a, b) => a.code.localeCompare(b.code) || a.label.localeCompare(b.label))
    .slice(0, 30);

  const blockedReasonsOut = uniqSorted(blockedReasons, 50);

  const status: ClaimsPolicyStatusV1 = (() => {
    const allAllowed = Object.values(allowed).every(Boolean);
    const anyBlocked = Object.values(allowed).some((v) => v === false);
    if (allAllowed) return 'ALLOW';
    if (anyBlocked && blockedReasonsOut.length) {
      // If financial claims are blocked due to verifier fail, treat as BLOCK.
      if (verifierStatus === 'FAIL') return 'BLOCK';
      return 'LIMITED';
    }
    return 'LIMITED';
  })();

  // Engine warnings don’t directly block claims in v1, but we surface them if present (deterministically).
  if (engineWarnings.length) {
    // Only add a single summary reason to keep bounded/noisy lists down.
    blockedReasonsOut.push(`engineWarnings:${String(engineWarnings.length)}`);
    blockedReasonsOut.sort((a, b) => a.localeCompare(b));
    while (blockedReasonsOut.length > 50) blockedReasonsOut.pop();
  }

  return {
    status,
    blockedReasons: blockedReasonsOut,
    allowedClaims: allowed,
    requiredNextData: requiredNextDataOut,
  };
}

