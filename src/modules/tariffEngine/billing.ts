import type { BillingPeriod, IntervalRow, TariffModel } from './schema';
import type { CycleAssignmentRow } from './join';

export type BillingDeterminant = {
  determinantId: string;
  name: string;
  kind: string;
  beforeKw: number;
  afterKw: number;
  bindingTimestampsBefore: string[];
  bindingTimestampsAfter: string[];
  ratchetApplied: boolean;
  ratchetFloorKw?: number;
};

export type BillLineItem = {
  kind: 'fixed' | 'energy' | 'demand' | 'other';
  label: string;
  amount: number;
  meta?: Record<string, unknown>;
};

export type CycleBill = {
  cycleId: string;
  billStartDate: string;
  billEndDate: string;
  statedTotalBill?: number;
  determinants: BillingDeterminant[];
  lineItems: BillLineItem[];
  total: number;
  reconcile?: {
    ok: boolean;
    delta: number;
    deltaPct: number;
    notes: string[];
  };
};

export type TariffRunOutput = {
  tariffId: string;
  tariffVersion: string;
  timezone: string;
  cycles: CycleBill[];
  summary: {
    cyclesCount: number;
    totalBefore: number;
    totalAfter: number;
    totalSavings: number;
    missingComponentsNotes: string[];
  };
};

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function tieredDemandCharge(kw: number, tiers: Array<{ upToKw?: number; pricePerKw: number }>): number {
  let remaining = Math.max(0, kw);
  let prevCap = 0;
  let cost = 0;
  for (const t of tiers) {
    const cap = typeof t.upToKw === 'number' ? t.upToKw : Infinity;
    const width = Math.max(0, cap - prevCap);
    const inTier = Math.min(remaining, width);
    cost += inTier * t.pricePerKw;
    remaining -= inTier;
    prevCap = cap;
    if (remaining <= 0) break;
  }
  return cost;
}

function maxWithTimestamps(rows: Array<{ timestamp: Date; kw: number }>): { maxKw: number; timestamps: string[] } {
  let maxKw = -Infinity;
  for (const r of rows) maxKw = Math.max(maxKw, r.kw);
  if (!Number.isFinite(maxKw)) return { maxKw: 0, timestamps: [] };
  const eps = 1e-6;
  const timestamps = rows
    .filter((r) => Math.abs(r.kw - maxKw) <= eps)
    .map((r) => r.timestamp.toISOString());
  return { maxKw, timestamps };
}

export function calculateBillsPerCycle(args: {
  tariff: TariffModel;
  billingPeriods: BillingPeriod[];
  assignedBefore: CycleAssignmentRow[];
  assignedAfter: CycleAssignmentRow[];
  // For reconciliation: allow caller to pass stated totals by cycleId
  statedTotalsByCycleId?: Record<string, number | undefined>;
}): TariffRunOutput {
  const { tariff, billingPeriods, assignedBefore, assignedAfter, statedTotalsByCycleId } = args;

  const byCycleBefore = new Map<string, Array<{ timestamp: Date; kw: number }>>();
  const byCycleAfter = new Map<string, Array<{ timestamp: Date; kw: number }>>();
  for (const r of assignedBefore) {
    const arr = byCycleBefore.get(r.cycleId) || [];
    arr.push({ timestamp: r.timestamp, kw: r.kw });
    byCycleBefore.set(r.cycleId, arr);
  }
  for (const r of assignedAfter) {
    const arr = byCycleAfter.get(r.cycleId) || [];
    arr.push({ timestamp: r.timestamp, kw: r.kw });
    byCycleAfter.set(r.cycleId, arr);
  }

  const cyclesSorted = [...billingPeriods].sort((a, b) => a.billEndDate.getTime() - b.billEndDate.getTime());

  // Ratchet tracking by determinant id: keep history of post-ratchet “before” values by cycle
  const ratchetHistory: Record<string, number[]> = {};

  const cycles: CycleBill[] = [];
  const missingComponentsNotes: string[] = [];

  for (const cycle of cyclesSorted) {
    const beforeRows = byCycleBefore.get(cycle.cycleId) || [];
    const afterRows = byCycleAfter.get(cycle.cycleId) || [];

    const determinants: BillingDeterminant[] = [];
    const lineItems: BillLineItem[] = [];

    // Fixed monthly charge
    if (tariff.fixedMonthlyCharge > 0) {
      lineItems.push({ kind: 'fixed', label: 'Fixed monthly charge', amount: tariff.fixedMonthlyCharge });
    }

    // Energy charges (optional; v1 may omit)
    if (tariff.energyCharges.length === 0) {
      missingComponentsNotes.push('Energy charges are not modeled (tariff.energyCharges empty).');
    } else {
      // Placeholder: compute all kWh at a flat effective rate per charge window.
      const intervalHours = 0.25; // 15-min default
      const kwhBefore = sum(beforeRows.map((r) => r.kw * intervalHours));
      const kwhAfter = sum(afterRows.map((r) => r.kw * intervalHours));
      // Not itemizing TOU yet in v1
      const avgPrice = tariff.energyCharges.reduce((s, e) => s + e.pricePerKwh, 0) / Math.max(1, tariff.energyCharges.length);
      lineItems.push({ kind: 'energy', label: 'Energy charges (approx)', amount: kwhAfter * avgPrice, meta: { kwhBefore, kwhAfter } });
      missingComponentsNotes.push('Energy charges are approximated (no TOU window assignment yet).');
    }

    // Demand determinants
    for (const det of tariff.demandDeterminants) {
      const { maxKw: beforeKw, timestamps: beforeTs } = maxWithTimestamps(beforeRows);
      const { maxKw: afterKw, timestamps: afterTs } = maxWithTimestamps(afterRows);

      // Ratchet (optional)
      const ratchet = tariff.ratchets.find((r) => r.appliesToDeterminantId === det.id);
      let ratchetApplied = false;
      let ratchetFloorKw: number | undefined;
      let ratchetedBefore = beforeKw;
      let ratchetedAfter = afterKw;

      if (ratchet) {
        const history = ratchetHistory[det.id] || [];
        const lookback = history.slice(-ratchet.lookbackCycles);
        const prevMax = lookback.length ? Math.max(...lookback) : 0;
        ratchetFloorKw = ratchet.percent * prevMax;
        if (ratchetFloorKw > ratchetedBefore || ratchetFloorKw > ratchetedAfter) {
          ratchetApplied = true;
          ratchetedBefore = Math.max(ratchetedBefore, ratchetFloorKw);
          ratchetedAfter = Math.max(ratchetedAfter, ratchetFloorKw);
        }
      }

      // Demand charge based on AFTER determinant (billing engine “after” total)
      const demandCostAfter = tieredDemandCharge(ratchetedAfter, det.tiers);
      lineItems.push({
        kind: 'demand',
        label: `Demand: ${det.name}`,
        amount: demandCostAfter,
        meta: { determinantId: det.id, afterKw: ratchetedAfter },
      });

      determinants.push({
        determinantId: det.id,
        name: det.name,
        kind: det.kind,
        beforeKw: ratchetedBefore,
        afterKw: ratchetedAfter,
        bindingTimestampsBefore: beforeTs,
        bindingTimestampsAfter: afterTs,
        ratchetApplied,
        ratchetFloorKw,
      });

      // Update ratchet history with ratcheted BEFORE (utility ratchets are based on historical billing determinants)
      ratchetHistory[det.id] = [...(ratchetHistory[det.id] || []), ratchetedBefore];
    }

    const total = lineItems.reduce((s, li) => s + li.amount, 0);
    const statedTotal = statedTotalsByCycleId?.[cycle.cycleId] ?? cycle.statedTotalBill;
    const reconcileNotes: string[] = [];
    let reconcile: CycleBill['reconcile'] | undefined;
    if (typeof statedTotal === 'number' && statedTotal > 0) {
      const delta = total - statedTotal;
      const deltaPct = statedTotal > 0 ? delta / statedTotal : 0;
      const ok = Math.abs(delta) <= 50 || Math.abs(deltaPct) <= 0.1;
      if (!ok) {
        reconcileNotes.push('Computed bill does not reconcile; missing components likely (riders, taxes, energy TOU, minimums).');
      }
      reconcile = { ok, delta, deltaPct, notes: reconcileNotes };
    }

    cycles.push({
      cycleId: cycle.cycleId,
      billStartDate: cycle.billStartDate.toISOString(),
      billEndDate: cycle.billEndDate.toISOString(),
      statedTotalBill: statedTotal,
      determinants,
      lineItems,
      total,
      reconcile,
    });
  }

  const totalAfter = cycles.reduce((s, c) => s + c.total, 0);
  // totalBefore is computed by re-running with before as after (caller should run separately). For now caller provides both.
  // We keep in output but set to 0 here; integration computes both.
  return {
    tariffId: tariff.tariffId,
    tariffVersion: tariff.version,
    timezone: tariff.timezone,
    cycles,
    summary: {
      cyclesCount: cycles.length,
      totalBefore: 0,
      totalAfter,
      totalSavings: 0,
      missingComponentsNotes: [...new Set(missingComponentsNotes)].slice(0, 10),
    },
  };
}

