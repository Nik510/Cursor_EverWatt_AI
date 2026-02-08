import type { BillingPeriod, TariffModel } from './schema';
import type { CycleJoinQa, CycleAssignmentRow } from './join';

export type BillingCycleAnalysis = {
  cycle_id: string;
  bill_start_date: string;
  bill_end_date: string;

  tariff_code: string | null;
  demand_structure: {
    type: 'flat' | 'tiered' | 'ratcheted';
    tiers?: Array<{ threshold_kw: number; price: number }>;
    ratchet_percent?: number;
  };

  measured: {
    max_kw: number;
    max_kw_timestamp: string;
    total_kwh: number;
  };

  economic_targets: {
    next_tier_threshold_kw?: number;
    avoidable_kw?: number;
    marginal_demand_cost_per_kw?: number;
  };

  recommendation_context: {
    peak_shaving_value_high: boolean;
    rate_switch_candidate: boolean;
  };
};

function median(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

function inferIntervalMinutes(rows: Array<{ timestamp: Date }>): number {
  if (rows.length < 2) return 15;
  const sorted = [...rows].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const diffs: number[] = [];
  for (let i = 1; i < Math.min(sorted.length, 2000); i++) {
    const dtMs = sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime();
    if (dtMs > 0) diffs.push(dtMs / (1000 * 60));
  }
  const m = median(diffs);
  return m && m > 0 ? m : 15;
}

function demandStructureFromTariff(tariff: TariffModel): BillingCycleAnalysis['demand_structure'] {
  const det = tariff.demandDeterminants?.[0];
  const tiers = (det?.tiers || [])
    .filter((t) => typeof t.upToKw === 'number' && Number.isFinite(t.upToKw))
    .map((t) => ({ threshold_kw: Number(t.upToKw), price: Number(t.pricePerKw) }));

  const hasRatchet = (tariff.ratchets || []).length > 0;
  const hasTiers = (det?.tiers || []).length > 1;
  const type: 'flat' | 'tiered' | 'ratcheted' = hasRatchet ? 'ratcheted' : hasTiers ? 'tiered' : 'flat';

  const ratchet_percent = hasRatchet ? Number((tariff.ratchets || [])[0]?.percent ?? 0) : undefined;
  return {
    type,
    ...(tiers.length ? { tiers } : {}),
    ...(ratchet_percent != null ? { ratchet_percent } : {}),
  };
}

function marginalDemandPricePerKw(tariff: TariffModel, kw: number): number | undefined {
  const det = tariff.demandDeterminants?.[0];
  if (!det?.tiers?.length) return undefined;
  const tiers = det.tiers;
  let prevCap = 0;
  for (const t of tiers) {
    const cap = typeof t.upToKw === 'number' ? t.upToKw : Infinity;
    if (kw <= cap && kw >= prevCap) return Number(t.pricePerKw);
    prevCap = cap;
  }
  return Number(tiers[tiers.length - 1].pricePerKw);
}

function nextTierThreshold(tariff: TariffModel, kw: number): number | undefined {
  const det = tariff.demandDeterminants?.[0];
  if (!det?.tiers?.length) return undefined;
  const caps = det.tiers
    .map((t) => (typeof t.upToKw === 'number' ? Number(t.upToKw) : null))
    .filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
    .sort((a, b) => a - b);
  for (const c of caps) {
    if (c > kw) return c;
  }
  return undefined;
}

export function buildBillingCycleAnalyses(args: {
  billingPeriods: BillingPeriod[];
  usageRateCode: string | null;
  tariff: TariffModel;
  joinQa: CycleJoinQa;
  intervalsByCycle: Record<string, CycleAssignmentRow[]>;
  selectedCapKw?: number;
}): BillingCycleAnalysis[] {
  const { billingPeriods, tariff, joinQa, intervalsByCycle, selectedCapKw } = args;
  const demand_structure = demandStructureFromTariff(tariff);
  const eps = 0.1;

  return billingPeriods.map((p) => {
    const maxMeta = joinQa.maxKwTimestampByCycle[p.cycleId] || { kw: 0, timestamp: p.billEndDate.toISOString() };
    const rows = intervalsByCycle[p.cycleId] || [];
    const intervalMinutes = inferIntervalMinutes(rows);
    const hoursPerInterval = intervalMinutes / 60;
    const total_kwh = rows.reduce((s, r) => s + r.kw * hoursPerInterval, 0);

    const max_kw = Number(maxMeta.kw) || 0;
    const max_kw_timestamp = String(maxMeta.timestamp || p.billEndDate.toISOString());

    const marginal = marginalDemandPricePerKw(tariff, max_kw);
    const nextTier = nextTierThreshold(tariff, max_kw);
    const target = nextTier != null ? Math.max(0, nextTier - eps) : (selectedCapKw != null ? selectedCapKw : undefined);
    const avoidable_kw = target != null ? Math.max(0, max_kw - target) : undefined;

    const peak_shaving_value_high = (marginal ?? 0) >= 20;

    return {
      cycle_id: p.cycleId,
      bill_start_date: p.billStartDate.toISOString().slice(0, 10),
      bill_end_date: p.billEndDate.toISOString().slice(0, 10),
      tariff_code: p.rateCode || null,
      demand_structure,
      measured: {
        max_kw,
        max_kw_timestamp,
        total_kwh: Number.isFinite(total_kwh) ? total_kwh : 0,
      },
      economic_targets: {
        ...(nextTier != null ? { next_tier_threshold_kw: nextTier } : {}),
        ...(avoidable_kw != null ? { avoidable_kw } : {}),
        ...(marginal != null ? { marginal_demand_cost_per_kw: marginal } : {}),
      },
      recommendation_context: {
        peak_shaving_value_high,
        rate_switch_candidate: false,
      },
    };
  });
}

