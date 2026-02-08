import type { ComprehensiveBillRecord } from '../../utils/utility-data-types';
import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';
import type { BillingCycleDeterminantsV1, EvidenceItemV1, ReconciliationMatchV1, ReconciliationSummaryV1 } from './types';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function pctDelta(computed: number, stated: number): number | null {
  if (!Number.isFinite(computed) || !Number.isFinite(stated) || stated === 0) return null;
  return (computed - stated) / stated;
}

function parseMs(d: Date | null | undefined): number | null {
  if (!d) return null;
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function parseIsoMs(s: string): number | null {
  const ms = new Date(String(s || '').trim()).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function findBillingRecordForCycle(args: {
  billingRecords: ComprehensiveBillRecord[];
  startIso: string;
  endIso: string;
}): ComprehensiveBillRecord | null {
  const startMs = new Date(args.startIso).getTime();
  const endMs = new Date(args.endIso).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;

  // Prefer exact start/end match.
  for (const r of args.billingRecords) {
    const s = parseMs(r.billStartDate);
    const e = parseMs(r.billEndDate);
    if (s === null || e === null) continue;
    if (s === startMs && e === endMs) return r;
  }

  // Fallback: match by end date only (some exports omit exact start date).
  for (const r of args.billingRecords) {
    const e = parseMs(r.billEndDate);
    if (e === null) continue;
    if (e === endMs) return r;
  }

  return null;
}

export function reconcileBillingRecordsV1(args: {
  billingRecords: ComprehensiveBillRecord[] | null | undefined;
  computedCycles: BillingCycleDeterminantsV1[];
  meterKey?: string;
  /** mismatch threshold in pct (e.g., 0.12 = 12%) */
  mismatchThresholdPct?: number;
}): ReconciliationSummaryV1 {
  const billingRecords = Array.isArray(args.billingRecords) ? args.billingRecords : [];
  const threshold = Number.isFinite(args.mismatchThresholdPct ?? NaN) ? Number(args.mismatchThresholdPct) : 0.12;

  const matches: ReconciliationMatchV1[] = [];
  const missingInfo: MissingInfoItemV0[] = [];
  const warnings: string[] = [];

  let demandMismatchCount = 0;
  let kwhMismatchCount = 0;

  const billingRecordsMissing = !billingRecords.length;

  const intervalStartMs = args.intervalWindow?.intervalStartIso ? new Date(args.intervalWindow.intervalStartIso).getTime() : null;
  const intervalEndMs = args.intervalWindow?.intervalEndIso ? new Date(args.intervalWindow.intervalEndIso).getTime() : null;
  const cycleStartMsList = (args.computedCycles || [])
    .map((c) => new Date(c.cycle.startIso).getTime())
    .filter((n) => Number.isFinite(n)) as number[];
  const cycleEndMsList = (args.computedCycles || [])
    .map((c) => new Date(c.cycle.endIso).getTime())
    .filter((n) => Number.isFinite(n)) as number[];
  const usageStartMs = cycleStartMsList.length ? Math.min(...cycleStartMsList) : null;
  const usageEndMs = cycleEndMsList.length ? Math.max(...cycleEndMsList) : null;
  const overlapStartMs =
    Number.isFinite(intervalStartMs ?? NaN) && Number.isFinite(usageStartMs ?? NaN)
      ? Math.max(intervalStartMs as number, usageStartMs as number)
      : null;
  const overlapEndMs =
    Number.isFinite(intervalEndMs ?? NaN) && Number.isFinite(usageEndMs ?? NaN) ? Math.min(intervalEndMs as number, usageEndMs as number) : null;
  const overlapStartIso = overlapStartMs !== null ? new Date(overlapStartMs).toISOString() : null;
  const overlapEndExclusiveIso = overlapEndMs !== null ? new Date(overlapEndMs).toISOString() : null;

  const skipCounts = { no_usage: 0, out_of_overlap_window: 0, low_interval_coverage: 0 };
  const cycleInfos: Array<{
    cyc: BillingCycleDeterminantsV1;
    evidence: EvidenceItemV1[];
    notes: string[];
    billDemandKw: number | null;
    billKwh: number | null;
    computedDemandKw: number | null;
    computedKwh: number | null;
    expectedIntervals: number | null;
    observedIntervals: number | null;
    coveragePct: number | null;
    missingPointCount: number | null;
    firstIntervalTs: string | null;
    lastIntervalTs: string | null;
    isInOverlapWindow: boolean;
    isReconcilable: boolean;
    reconcileSkipReason: 'no_usage' | 'out_of_overlap_window' | 'low_interval_coverage' | null;
    endMs: number | null;
  }> = [];

  let anyNoUsage = billingRecordsMissing;
  for (const cyc of args.computedCycles || []) {
    const evidence: EvidenceItemV1[] = [];
    const notes: string[] = [];
    const br = billingRecords.length
      ? findBillingRecordForCycle({ billingRecords, startIso: cyc.cycle.startIso, endIso: cyc.cycle.endIso })
      : null;

    const billDemandKw = br ? Number((br as any).maxMaxDemandKw) : null;
    const billKwh = br ? Number((br as any).totalUsageKwh) : null;
    const computedDemandKw = cyc.demand.kWMax;
    const computedKwh = cyc.energy.kwhTotal;

    if (br) {
      evidence.push({ kind: 'billingRecordField', pointer: { source: 'billingRecords', key: 'maxMaxDemandKw', value: billDemandKw } });
      evidence.push({ kind: 'billingRecordField', pointer: { source: 'billingRecords', key: 'totalUsageKwh', value: billKwh } });
    } else if (billingRecords.length) {
      notes.push('No matching billing record found for this cycle range; reconciliation skipped.');
    }

    const expectedIntervals = Number((cyc as any)?.demand?.expectedIntervalCount);
    const observedIntervals = Number((cyc as any)?.demand?.intervalCount);
    const coveragePct = Number((cyc as any)?.demand?.coveragePct);
    const firstIntervalTs = (cyc as any)?.demand?.firstIntervalTs ?? null;
    const lastIntervalTs = (cyc as any)?.demand?.lastIntervalTs ?? null;
    const missingPointCount =
      Number.isFinite(expectedIntervals) && Number.isFinite(observedIntervals) ? Math.max(0, expectedIntervals - observedIntervals) : null;

    const startMs = parseIsoMs(cyc.cycle.startIso);
    const endMs = parseIsoMs(cyc.cycle.endIso);
    const isInOverlapWindow =
      overlapStartMs !== null && overlapEndMs !== null && startMs !== null && endMs !== null
        ? endMs > overlapStartMs && startMs < overlapEndMs
        : true;
    const coverageIsLow = Number.isFinite(coveragePct) && coveragePct < 0.9;
    const hasUsage = Boolean(br);
    const isReconcilable = isInOverlapWindow && !coverageIsLow && hasUsage;
    const reconcileSkipReason: 'no_usage' | 'out_of_overlap_window' | 'low_interval_coverage' | null = !hasUsage
      ? 'no_usage'
      : !isInOverlapWindow
        ? 'out_of_overlap_window'
        : coverageIsLow
          ? 'low_interval_coverage'
          : null;

    if (!isReconcilable && reconcileSkipReason) {
      skipCounts[reconcileSkipReason] += 1;
    }
    if (!hasUsage) anyNoUsage = true;
    if (coverageIsLow) {
      notes.push('Reconciliation skipped due to incomplete interval coverage (<90%).');
      missingInfo.push({
        id: `determinants.reconcile.coverageLow.${cyc.cycle.label}`,
        category: 'tariff',
        severity: 'warning',
        description: 'Insufficient interval coverage to reconcile against billing record.',
        meterKey: String(args.meterKey || ''),
        billingCycleLabel: String(cyc.cycle.label || ''),
        details: {
          expectedIntervals: Number.isFinite(expectedIntervals) ? expectedIntervals : null,
          observedIntervals: Number.isFinite(observedIntervals) ? observedIntervals : null,
          coveragePct: Number.isFinite(coveragePct) ? coveragePct : null,
          firstIntervalTs,
          lastIntervalTs,
          billedKwh: Number.isFinite(billKwh as any) ? Number(billKwh) : null,
          billedKwMax: Number.isFinite(billDemandKw as any) ? Number(billDemandKw) : null,
          missingPointCount,
        },
        evidence: [
          { kind: 'coverage', value: `coveragePct=${Number.isFinite(coveragePct) ? Number(coveragePct).toFixed(3) : 'n/a'}` },
          { kind: 'billing', value: `totalUsageKwh=${Number.isFinite(billKwh as any) ? Number(billKwh).toFixed(1) : 'n/a'}` },
        ],
      });
    }

    cycleInfos.push({
      cyc,
      evidence,
      notes,
      billDemandKw,
      billKwh,
      computedDemandKw,
      computedKwh,
      expectedIntervals: Number.isFinite(expectedIntervals) ? expectedIntervals : null,
      observedIntervals: Number.isFinite(observedIntervals) ? observedIntervals : null,
      coveragePct: Number.isFinite(coveragePct) ? coveragePct : null,
      missingPointCount,
      firstIntervalTs,
      lastIntervalTs,
      isInOverlapWindow,
      isReconcilable,
      reconcileSkipReason,
      endMs: endMs,
    });
  }

  if (anyNoUsage) {
    missingInfo.push({
      id: 'determinants.reconcile.billingRecords.missing',
      category: 'tariff',
      severity: 'info',
      description: 'Billing records missing for reconciliation.',
      meterKey: String(args.meterKey || ''),
    });
  }

  const candidateCycles = cycleInfos
    .filter((c) => c.isReconcilable && c.endMs !== null)
    .sort((a, b) => (b.endMs as number) - (a.endMs as number));
  const reconciledCyclesToUse = candidateCycles.slice(0, 12);
  const reconciledSet = new Set(reconciledCyclesToUse.map((c) => c.cyc.cycle.label));
  if (candidateCycles.length < 12) {
    missingInfo.push({
      id: 'determinants.reconcile.reconcilable.count',
      category: 'tariff',
      severity: 'info',
      description: `Only ${candidateCycles.length} cycles were reconcilable due to limited overlap/coverage.`,
      meterKey: String(args.meterKey || ''),
      details: { reconciledCycleCount: candidateCycles.length },
    });
  }

  for (const info of cycleInfos) {
    const { cyc, evidence, notes, billDemandKw, billKwh, computedDemandKw, computedKwh } = info;
    let ok = true;
    let deltaDemandPct: number | null = null;
    let deltaKwhPct: number | null = null;
    let mismatchPct: number | null = null;

    if (info.isReconcilable && reconciledSet.has(cyc.cycle.label)) {
      deltaDemandPct =
        billDemandKw !== null && Number.isFinite(billDemandKw) && computedDemandKw !== null ? pctDelta(computedDemandKw, billDemandKw) : null;
      deltaKwhPct = billKwh !== null && Number.isFinite(billKwh) && computedKwh !== null ? pctDelta(computedKwh, billKwh) : null;
      mismatchPct =
        deltaDemandPct !== null
          ? deltaDemandPct
          : deltaKwhPct !== null
            ? deltaKwhPct
            : null;

      if (deltaDemandPct !== null && Math.abs(deltaDemandPct) > threshold) {
        ok = false;
        demandMismatchCount++;
        notes.push(`Demand mismatch: computed=${computedDemandKw?.toFixed(2)}kW vs stated=${billDemandKw?.toFixed(2)}kW (deltaPct=${(deltaDemandPct * 100).toFixed(1)}%).`);
        missingInfo.push({
          id: `determinants.reconcile.demandMismatch.${cyc.cycle.label}`,
          category: 'tariff',
          severity: 'warning',
          description: 'Demand mismatch between computed intervals and billing record. Verify interval alignment, meter mapping, and demand window definition.',
          meterKey: String(args.meterKey || ''),
          billingCycleLabel: String(cyc.cycle.label || ''),
          details: {
            computedKwMax: Number.isFinite(computedDemandKw as any) ? Number(computedDemandKw) : null,
            billedKwMax: Number.isFinite(billDemandKw as any) ? Number(billDemandKw) : null,
            demandMismatchPct: deltaDemandPct,
            mismatchPct,
            missingPointCount: info.missingPointCount,
          },
          evidence: [
            { kind: 'computed', value: `kWMax=${Number.isFinite(computedDemandKw as any) ? Number(computedDemandKw).toFixed(2) : 'n/a'}` },
            { kind: 'billing', value: `maxMaxDemandKw=${Number.isFinite(billDemandKw as any) ? Number(billDemandKw).toFixed(2) : 'n/a'}` },
          ],
        });
      }

      if (deltaKwhPct !== null && Math.abs(deltaKwhPct) > threshold) {
        ok = false;
        kwhMismatchCount++;
        notes.push(`kWh mismatch: computed=${computedKwh?.toFixed(1)}kWh vs stated=${billKwh?.toFixed(1)}kWh (deltaPct=${(deltaKwhPct * 100).toFixed(1)}%).`);
        missingInfo.push({
          id: `determinants.reconcile.kwhMismatch.${cyc.cycle.label}`,
          category: 'tariff',
          severity: 'warning',
          description: 'Energy mismatch between computed intervals and billing record. Verify interval alignment and billing-cycle boundaries.',
          meterKey: String(args.meterKey || ''),
          billingCycleLabel: String(cyc.cycle.label || ''),
          details: {
            computedKwh: Number.isFinite(computedKwh as any) ? Number(computedKwh) : null,
            billedKwh: Number.isFinite(billKwh as any) ? Number(billKwh) : null,
            kwhMismatchPct: deltaKwhPct,
            mismatchPct,
            missingPointCount: info.missingPointCount,
          },
          evidence: [
            { kind: 'computed', value: `kWhTotal=${Number.isFinite(computedKwh as any) ? Number(computedKwh).toFixed(1) : 'n/a'}` },
            { kind: 'billing', value: `totalUsageKwh=${Number.isFinite(billKwh as any) ? Number(billKwh).toFixed(1) : 'n/a'}` },
          ],
        });
      }
    }

    matches.push({
      cycleLabel: cyc.cycle.label,
      startIso: cyc.cycle.startIso,
      endIso: cyc.cycle.endIso,
      billDemandKw: Number.isFinite(billDemandKw as any) ? Number(billDemandKw) : null,
      computedDemandKw: computedDemandKw,
      billKwh: Number.isFinite(billKwh as any) ? Number(billKwh) : null,
      computedKwh: computedKwh,
      deltaDemandPct,
      deltaKwhPct,
      isInOverlapWindow: info.isInOverlapWindow,
      isReconcilable: info.isReconcilable,
      reconcileSkipReason: info.reconcileSkipReason || undefined,
      ok,
      notes,
      evidence,
    });
  }

  if (demandMismatchCount || kwhMismatchCount) {
    warnings.push(`Reconciliation mismatches detected (demand=${demandMismatchCount}, kWh=${kwhMismatchCount}).`);
  }

  const confidenceImpact = clamp01(1 - 0.12 * (demandMismatchCount > 0 ? 1 : 0) - 0.08 * (kwhMismatchCount > 0 ? 1 : 0));
  const latestReconcilableBillEndDate = reconciledCyclesToUse.length ? new Date(reconciledCyclesToUse[0].endMs as number).toISOString() : null;
  const earliestReconcilableBillEndDate = reconciledCyclesToUse.length
    ? new Date(reconciledCyclesToUse[reconciledCyclesToUse.length - 1].endMs as number).toISOString()
    : null;

  return {
    matches,
    demandMismatchCount,
    kwhMismatchCount,
    overlapStartIso,
    overlapEndExclusiveIso,
    reconciledCycleCount: reconciledCyclesToUse.length,
    skippedCycleCountByReason: skipCounts,
    latestReconcilableBillEndDate,
    earliestReconcilableBillEndDate,
    missingInfo,
    warnings,
    confidenceImpact,
  };
}

