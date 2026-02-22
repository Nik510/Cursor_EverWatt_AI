import type { VerifierCheckResultV1 } from '../types';

function numOrNull(x: unknown): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

export function checkEconomicsReconcileV1(args: { reportJson: any }): VerifierCheckResultV1[] {
  const reportJson = args.reportJson && typeof args.reportJson === 'object' ? args.reportJson : {};

  const reconcile = reportJson?.batteryDecisionPackV1_2?.audit?.reconcile ?? null;
  if (!reconcile || typeof reconcile !== 'object') return [];

  const total = numOrNull((reconcile as any)?.total);
  const sumLineItems = numOrNull((reconcile as any)?.sumLineItems);
  const delta = numOrNull((reconcile as any)?.delta);

  const tolerance = 0.01;
  const beyondTol = delta !== null && delta > tolerance;

  if (!beyondTol) {
    return [
      {
        code: 'verifier.econ.sum_mismatch',
        status: 'PASS',
        message: 'Battery economics reconcile within tolerance.',
        tolerance,
        details: { total, sumLineItems, delta },
        paths: ['reportJson.batteryDecisionPackV1_2.audit.reconcile'],
      },
    ];
  }

  return [
    {
      code: 'verifier.econ.sum_mismatch',
      status: 'FAIL',
      message: 'Battery economics do not reconcile to audit line items beyond tolerance.',
      tolerance,
      details: { total, sumLineItems, delta },
      paths: ['reportJson.batteryDecisionPackV1_2.audit.reconcile'],
    },
  ];
}

