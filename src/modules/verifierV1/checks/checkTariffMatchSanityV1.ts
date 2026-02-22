import type { VerifierCheckResultV1 } from '../types';

function safeString(x: unknown, max = 220): string {
  const s = String(x ?? '').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, Math.max(0, max - 12)) + '…(truncated)' : s;
}

function hasTariffDependentEconomics(reportJson: any): boolean {
  if (!reportJson || typeof reportJson !== 'object') return false;
  if (reportJson?.batteryDecisionPackV1_2) return true;
  if (reportJson?.batteryDecisionPackV1) return true;
  if (reportJson?.batteryEconomicsV1) return true;
  if (reportJson?.storageOpportunityPackV1) return true;
  return false;
}

function packPublishesFinancialTotals(packJson: any): boolean {
  if (!packJson || typeof packJson !== 'object') return false;
  const savings = (packJson as any)?.savings ?? null; // executivePackV1
  if (!savings || typeof savings !== 'object') return false;
  const annualUsd = (savings as any)?.annualUsd;
  if (annualUsd && typeof annualUsd === 'object') {
    if ((annualUsd as any)?.value != null) return true;
    if ((annualUsd as any)?.min != null || (annualUsd as any)?.max != null) return true;
  }
  return false;
}

export function checkTariffMatchSanityV1(args: { reportJson: any; packJson: any }): VerifierCheckResultV1[] {
  const reportJson = args.reportJson && typeof args.reportJson === 'object' ? args.reportJson : {};
  const packJson = args.packJson && typeof args.packJson === 'object' ? args.packJson : null;

  const trace: any = reportJson?.analysisTraceV1 ?? null;
  const coverage: any = trace?.coverage ?? null;
  const tariffMatchStatus = safeString(coverage?.tariffMatchStatus, 60).toUpperCase() || 'UNKNOWN';

  const ambiguous =
    tariffMatchStatus === 'AMBIGUOUS' || tariffMatchStatus === 'NOT_FOUND' || tariffMatchStatus === 'UNSUPPORTED' || tariffMatchStatus === 'UNKNOWN';

  if (!ambiguous) return [];
  const hasEcon = hasTariffDependentEconomics(reportJson);
  if (!hasEcon) return [];

  const publishes = packPublishesFinancialTotals(packJson);
  const status: VerifierCheckResultV1['status'] = publishes ? 'FAIL' : 'WARN';

  return [
    {
      code: 'verifier.tariff.ambiguous_match',
      status,
      message: publishes
        ? 'Tariff match is not resolved, but the pack appears to publish tariff-dependent financial totals.'
        : 'Tariff match is not resolved; tariff-dependent economics should be treated as gated/limited.',
      details: { tariffMatchStatus, publishesFinancialTotals: publishes },
      paths: ['reportJson.analysisTraceV1.coverage.tariffMatchStatus'],
    },
  ];
}

