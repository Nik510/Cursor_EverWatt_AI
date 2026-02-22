import type { VerifierCheckResultV1, VerifierResultV1, VerifierSnapshotContextV1, VerifierStatusV1 } from './types';
import { checkEconomicsReconcileV1 } from './checks/checkEconomicsReconcileV1';
import { checkIntervalSanityV1 } from './checks/checkIntervalSanityV1';
import { checkProvenanceHeaderV1 } from './checks/checkProvenanceHeaderV1';
import { checkRateContextSanityV1 } from './checks/checkRateContextSanityV1';
import { checkTariffMatchSanityV1 } from './checks/checkTariffMatchSanityV1';

function safeString(x: unknown, max = 80): string {
  const s = String(x ?? '').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, Math.max(0, max - 12)) + '…(truncated)' : s;
}

function statusRank(s: VerifierStatusV1): number {
  if (s === 'FAIL') return 0;
  if (s === 'WARN') return 1;
  return 2;
}

function normalizeCheck(raw: VerifierCheckResultV1): VerifierCheckResultV1 | null {
  const code = safeString(raw?.code, 220);
  if (!code) return null;
  const statusRaw = safeString(raw?.status, 10).toUpperCase();
  const status: VerifierStatusV1 = statusRaw === 'FAIL' ? 'FAIL' : statusRaw === 'WARN' ? 'WARN' : 'PASS';
  const message = safeString(raw?.message, 900) || '(no message)';
  const tol = raw && typeof raw === 'object' && Object.prototype.hasOwnProperty.call(raw, 'tolerance') ? (raw as any).tolerance : undefined;
  const tolerance = Number.isFinite(Number(tol)) ? Number(tol) : undefined;
  const pathsRaw = (raw as any)?.paths;
  const paths =
    Array.isArray(pathsRaw) && pathsRaw.length
      ? Array.from(new Set(pathsRaw.map((p: any) => safeString(p, 360)).filter(Boolean))).sort((a, b) => a.localeCompare(b)).slice(0, 24)
      : undefined;
  const details = raw && typeof raw === 'object' && Object.prototype.hasOwnProperty.call(raw, 'details') ? (raw as any).details : undefined;
  return { code, status, message, ...(details !== undefined ? { details } : {}), ...(tolerance !== undefined ? { tolerance } : {}), ...(paths ? { paths } : {}) };
}

function sortChecksDeterministic(a: VerifierCheckResultV1, b: VerifierCheckResultV1): number {
  return a.code.localeCompare(b.code) || statusRank(a.status) - statusRank(b.status) || a.message.localeCompare(b.message);
}

export function runVerifierV1(ctx: VerifierSnapshotContextV1): VerifierResultV1 {
  const generatedAtIso = safeString(ctx?.generatedAtIso, 60) || new Date().toISOString();
  const reportJson: any = ctx?.reportJson && typeof ctx.reportJson === 'object' ? (ctx.reportJson as any) : {};
  const packJson: any = ctx?.packJson && typeof ctx.packJson === 'object' ? (ctx.packJson as any) : null;

  const rawChecks: VerifierCheckResultV1[] = [];

  rawChecks.push(...checkEconomicsReconcileV1({ reportJson }));
  rawChecks.push(...checkRateContextSanityV1({ reportJson }));
  rawChecks.push(...checkIntervalSanityV1({ reportJson }));
  rawChecks.push(...checkTariffMatchSanityV1({ reportJson, packJson }));

  // Pack-only provenance header check.
  if (packJson) rawChecks.push(...checkProvenanceHeaderV1({ packJson }));

  const normalized: VerifierCheckResultV1[] = [];
  for (const c of rawChecks) {
    const n = normalizeCheck(c);
    if (n) normalized.push(n);
  }

  normalized.sort(sortChecksDeterministic);

  // Deterministic summary counts
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;
  for (const c of normalized) {
    if (c.status === 'FAIL') failCount += 1;
    else if (c.status === 'WARN') warnCount += 1;
    else passCount += 1;
  }

  const status: VerifierStatusV1 = failCount ? 'FAIL' : warnCount ? 'WARN' : 'PASS';

  return {
    status,
    generatedAtIso,
    checks: normalized,
    summary: { passCount, warnCount, failCount },
  };
}

