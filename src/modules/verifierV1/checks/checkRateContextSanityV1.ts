import type { VerifierCheckResultV1 } from '../types';

function safeString(x: unknown, max = 220): string {
  const s = String(x ?? '').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, Math.max(0, max - 12)) + '…(truncated)' : s;
}

function findRateSourceKindFromAuditLineItems(reportJson: any): string | null {
  const candidates: any[] = [];
  try {
    const econ = reportJson?.batteryEconomicsV1;
    const lineItems = Array.isArray(econ?.audit?.lineItems) ? econ.audit.lineItems : [];
    candidates.push(...lineItems);
  } catch {
    // ignore
  }
  try {
    const pack = reportJson?.batteryDecisionPackV1_2;
    const lineItems = Array.isArray(pack?.audit?.lineItems) ? pack.audit.lineItems : [];
    candidates.push(...lineItems);
  } catch {
    // ignore
  }

  for (const li of candidates) {
    const id = safeString(li?.id, 120);
    if (id !== 'savings.energyAnnual') continue;
    const kind = safeString(li?.rateSource?.kind, 140);
    if (kind) return kind;
  }
  return null;
}

export function checkRateContextSanityV1(args: { reportJson: any }): VerifierCheckResultV1[] {
  const reportJson = args.reportJson && typeof args.reportJson === 'object' ? args.reportJson : {};
  const trace: any = reportJson?.analysisTraceV1 ?? null;
  const coverage: any = trace?.coverage ?? null;
  const prov: any = trace?.provenance ?? null;

  const supplyProviderType = safeString(coverage?.supplyProviderType, 40).toUpperCase() || '';
  const addersSnapshotId = safeString(prov?.addersSnapshotId, 120) || null;
  const exitFeesSnapshotId = safeString(prov?.exitFeesSnapshotId, 120) || null;

  // Only enforce this check when we have enough context to assert the dedup behavior.
  if (supplyProviderType !== 'CCA') return [];
  if (!addersSnapshotId || !exitFeesSnapshotId) return [];

  const kindObserved = findRateSourceKindFromAuditLineItems(reportJson);
  const expected = 'CCA_GEN_V0_ALL_IN_WITH_EXIT_FEES_DEDUPED';
  const ok = kindObserved === expected;

  if (ok) {
    return [
      {
        code: 'verifier.rate.adders_exitfees_doublecount',
        status: 'PASS',
        message: 'CCA adders + exit fees appear deduped (no double-count).',
        details: { supplyProviderType, kindObserved, addersSnapshotId, exitFeesSnapshotId },
        paths: ['reportJson.analysisTraceV1.coverage.supplyProviderType', 'reportJson.analysisTraceV1.provenance'],
      },
    ];
  }

  return [
    {
      code: 'verifier.rate.adders_exitfees_doublecount',
      status: 'FAIL',
      message: 'CCA adders + exit fees appear to be double-counted (dedup not applied).',
      details: { supplyProviderType, kindObserved, expectedKind: expected, addersSnapshotId, exitFeesSnapshotId },
      paths: [
        'reportJson.analysisTraceV1.coverage.supplyProviderType',
        'reportJson.analysisTraceV1.provenance.addersSnapshotId',
        'reportJson.analysisTraceV1.provenance.exitFeesSnapshotId',
        'reportJson.batteryEconomicsV1.audit.lineItems[savings.energyAnnual].rateSource.kind',
      ],
    },
  ];
}

