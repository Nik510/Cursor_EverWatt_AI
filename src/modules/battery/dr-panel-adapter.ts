import type { DrFitResult, FitLabel } from '../../modules/battery/dr-fit-score';
import type { LoadInterval } from './types';
import type { DrPanel as DrPanelV1 } from '../../data/dr-programs/types';

export type PaymentUnit = 'per_kw_event' | 'per_kwh';

export type DRWindow = {
  startHour: number;
  endHour: number;
  weekdaysOnly: boolean;
  months: number[];
  timezone?: string;
};

export type DRAssumptions = {
  method: 'all_summer_weekdays' | 'top_n_hottest_days';
  topNHottestDays?: number;
  firmPercentile: number;
  eventDurationHours: number;
  socCarryInPolicy: 'fixed_50pct' | 'from_bill_optimized_dispatch';
  noExport: boolean;
  performanceFactor?: number;
  dtMinutesDetected: number;
};

export type DRDeliverable = {
  opsKw: number;
  batteryKw: number;
  totalKw: number;
  firmPercentile: number;
  evaluationDays: number;
  notes?: string[];
};

export type DREligibility = {
  eligible: boolean;
  reasons: string[];
  missingInputs?: string[];
};

export type DRMoney = {
  committedKw: number;
  capacityPaymentPerKwMonth?: number;
  eventPayment: number;
  paymentUnit: PaymentUnit;
  estimatedEventsPerYear: number;
  capacityGross: number;
  eventGross: number;
  customerGross: number;
  everwattFeeModel: 'hybrid_floor_or_pct';
  feePct: number;
  feePerKwYear: number;
  everwattFeeFloor: number;
  everwattFeePct: number;
  everwattFee: number;
  customerNet: number;
  avgCurtailKwhPerEvent?: number;
};

export type DRProgramResult = {
  programId: string;
  programName: string;
  utility: string;
  market: 'utility' | 'aggregator' | 'caiso';
  description?: string;
  eventWindow: DRWindow;
  minimumCommitmentKw: number;
  eligibility: DREligibility;
  deliverable: {
    committedBasis: 'total_kw';
    deliverableTotalKw: number;
  };
  money?: DRMoney;
  whatIfAtMinimum?: DRMoney;
  fit?: DrFitResult;
  fitScore?: number;
  fitLabel?: FitLabel;
  fitReasons?: string[];
};

export type DRPanelV2 = {
  enabled: boolean;
  detectedRateCode?: string;
  tariffTerritory?: string;
  intervalCoverage: {
    start: string;
    end: string;
    days: number;
    dtMinutesDetected: number;
    hasTemperature: boolean;
  };
  assumptions: DRAssumptions;
  deliverable: DRDeliverable;
  fitScore: number;
  fit?: DrFitResult;
  fitLabel?: FitLabel;
  fitReasons?: string[];
  riskFlags: string[];
  programs: DRProgramResult[];
};

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

export function toDrPanelV2(params: {
  enabled: boolean;
  detectedRateCode?: string;
  tariffTerritory?: string;
  intervals: LoadInterval[];
  method: DRAssumptions['method'];
  topNHottestDays?: number;
  firmPercentile: number; // 20
  socCarryInPolicy: DRAssumptions['socCarryInPolicy'];
  noExport: boolean;
  performanceFactor?: number; // for per_kwh
  eventWindow: DRWindow;
  // v1 computed panel
  panelV1: DrPanelV1;
}): DRPanelV2 {
  const times = params.intervals
    .map((i) => (i.timestamp instanceof Date ? i.timestamp.getTime() : new Date(i.timestamp).getTime()))
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);

  const startMs = times[0] ?? Date.now();
  const endMs = times[times.length - 1] ?? startMs;

  const diffs: number[] = [];
  for (let i = 1; i < times.length; i++) diffs.push(times[i]! - times[i - 1]!);
  const dtMinutesDetected = Math.max(1, Math.round(median(diffs) / (60 * 1000)) || 15);

  const dayKeys = new Set(
    params.intervals.map((i) => {
      const d = i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    })
  );

  const hasTemperature = params.intervals.some((i: any) => typeof i.temperature === 'number');

  const eventDurationHours = Math.max(1, (params.eventWindow.endHour - params.eventWindow.startHour + 24) % 24 || (params.eventWindow.endHour - params.eventWindow.startHour));

  const deliverable: DRDeliverable = {
    opsKw: Number((params.panelV1 as any)?.deliverables?.deliverableOpsKw ?? 0) || 0,
    batteryKw: Number((params.panelV1 as any)?.deliverables?.deliverableBatteryKw ?? 0) || 0,
    totalKw: Number((params.panelV1 as any)?.deliverables?.deliverableTotalKw ?? 0) || 0,
    firmPercentile: params.firmPercentile,
    evaluationDays: Number((params.panelV1 as any)?.deliverables?.daysEvaluated ?? 0) || 0,
    notes: Array.isArray((params.panelV1 as any)?.deliverables?.notes) ? (params.panelV1 as any).deliverables.notes : [],
  };

  const programs: DRProgramResult[] = ((params.panelV1 as any)?.programs ?? []).map((p: any) => {
    const program = p.program ?? {};
    const money = p.money;
    const fit = p.fit as DrFitResult | undefined;

    const eligibility: DREligibility = {
      eligible: !!p.eligible,
      reasons: Array.isArray(p.eligibilityReasons) ? p.eligibilityReasons : [],
      missingInputs: [],
    };

    const minimumCommitmentKw = Number(program?.eligibility?.minimumCommitmentKw ?? 0) || 0;

    const eventWindow: DRWindow = {
      startHour: Number(program?.eventWindow?.startHour ?? params.eventWindow.startHour) || params.eventWindow.startHour,
      endHour: Number(program?.eventWindow?.endHour ?? params.eventWindow.endHour) || params.eventWindow.endHour,
      weekdaysOnly: Boolean(program?.eventWindow?.weekdaysOnly ?? params.eventWindow.weekdaysOnly),
      months: Array.isArray(program?.eventWindow?.months) ? program.eventWindow.months : params.eventWindow.months,
      timezone: params.eventWindow.timezone,
    };

    const out: DRProgramResult = {
      programId: String(program?.id ?? program?.name ?? 'program'),
      programName: String(program?.name ?? 'Program'),
      utility: String(program?.utility ?? 'PGE'),
      market: 'utility',
      description: String(program?.description ?? ''),
      eventWindow,
      minimumCommitmentKw,
      eligibility,
      deliverable: { committedBasis: 'total_kw', deliverableTotalKw: deliverable.totalKw },
    };

    if (fit) {
      out.fit = fit;
      out.fitScore = fit.score;
      out.fitLabel = fit.label;
      out.fitReasons = fit.reasons;
    }

    if (money) {
      out.money = {
        committedKw: Number(money.committedKwRounded ?? money.committedKw ?? deliverable.totalKw) || 0,
        capacityPaymentPerKwMonth: Number(money.capacityPaymentPerKwMonth ?? 0) || 0,
        eventPayment: Number(money.eventPayment ?? 0) || 0,
        paymentUnit: (money.paymentUnit as any) ?? 'per_kw_event',
        estimatedEventsPerYear: Number(money.estimatedEventsPerYear ?? 0) || 0,
        capacityGross: Number(money.capacityGrossAnnualUsd ?? 0) || 0,
        eventGross: Number(money.eventGrossAnnualUsd ?? 0) || 0,
        customerGross: Number(money.customerGrossAnnualUsd ?? 0) || 0,
        everwattFeeModel: 'hybrid_floor_or_pct',
        feePct: Number((params.panelV1 as any)?.feeModel?.feePct ?? 0.2) || 0.2,
        feePerKwYear: Number((params.panelV1 as any)?.feeModel?.feePerKwYear ?? 30) || 30,
        everwattFeeFloor: Number(money.everwattFeeFloorAnnualUsd ?? 0) || 0,
        everwattFeePct: Number(money.everwattFeePctAnnualUsd ?? 0) || 0,
        everwattFee: Number(money.everwattFeeAnnualUsd ?? 0) || 0,
        customerNet: Number(money.customerNetAnnualUsd ?? 0) || 0,
        avgCurtailKwhPerEvent: typeof money.avgCurtailKwhPerEvent === 'number' ? money.avgCurtailKwhPerEvent : undefined,
      };
    }

    return out;
  });

  // riskFlags: union program risk flags + missing temp/day count flags
  const riskFlags = new Set<string>();
  if (!hasTemperature) riskFlags.add('TEMP_MISSING');
  if (deliverable.evaluationDays < 5) riskFlags.add('LOW_DAY_COUNT');
  riskFlags.add(params.socCarryInPolicy === 'fixed_50pct' ? 'SOC_ASSUMED_50PCT' : 'SOC_FROM_DISPATCH');

  for (const p of (params.panelV1 as any)?.programs ?? []) {
    for (const rf of p?.riskFlags ?? []) riskFlags.add(String(rf));
  }

  return {
    enabled: params.enabled,
    detectedRateCode: params.detectedRateCode,
    tariffTerritory: params.tariffTerritory ?? 'PGE',
    intervalCoverage: {
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
      days: dayKeys.size,
      dtMinutesDetected,
      hasTemperature,
    },
    assumptions: {
      method: params.method,
      topNHottestDays: params.topNHottestDays,
      firmPercentile: params.firmPercentile,
      eventDurationHours,
      socCarryInPolicy: params.socCarryInPolicy,
      noExport: params.noExport,
      performanceFactor: params.performanceFactor,
      dtMinutesDetected,
    },
    deliverable,
    fitScore: Number((params.panelV1 as any)?.fitScore ?? 0) || 0,
    fit: (params.panelV1 as any)?.fit as DrFitResult | undefined,
    fitLabel: ((params.panelV1 as any)?.fit as DrFitResult | undefined)?.label,
    fitReasons: ((params.panelV1 as any)?.fit as DrFitResult | undefined)?.reasons,
    riskFlags: [...riskFlags],
    programs,
  };
}

