import { spawn } from 'child_process';
import path from 'path';
import type { LoadInterval } from './types';
import { pgeDrPrograms } from '../../data/dr-programs/pge';
import type { DrPanel, DrProgramEvaluation, DrProgram, DrDeliverables, DrMoneyResult, DrPaymentUnit } from '../../data/dr-programs/types';
import { computeDrFitScore, fitScoreLabel } from './dr-fit-score';

export type ApiDemandResponseParams = {
  enabled: boolean;
  capacityPaymentPerKwMonth: number;
  /** Explicit unit for event payments */
  paymentUnit: DrPaymentUnit;
  /** Event payment (interpreted by paymentUnit) */
  eventPayment: number;
  estimatedEventsPerYear: number;
  minimumCommitmentKw: number;
  /** Hybrid fee defaults */
  everwattFeePerKwYear?: number; // default 30
  everwattFeePct?: number; // default 0.20
  /** If per_kwh, optional override for average event duration hours (default window length) */
  eventDurationHoursOverride?: number;
  /** For per_kwh event gross estimation (default 0.85) */
  performanceFactor?: number;
};

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function roundDownCommittedKw(x: number, step: number): number {
  const s = Math.max(1, step);
  return Math.max(0, Math.floor(Math.max(0, x) / s) * s);
}

function normalizeRateBase(raw: string | undefined | null): string {
  const r = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '');
  // Option S typically appends S; remove for base matching
  const base = r.endsWith('S') ? r.slice(0, -1) : r;
  return base.replace(/[^A-Z0-9]/g, '');
}

function computeMoney(params: {
  committedKw: number;
  capacityPaymentPerKwMonth: number;
  paymentUnit: DrPaymentUnit;
  eventPayment: number;
  estimatedEventsPerYear: number;
  /** required if per_kwh */
  avgCurtailKwhPerEvent?: number;
  feePerKwYear: number;
  feePct: number;
}): DrMoneyResult {
  // Enrollment realism: round down (5kW step for smaller sites, 10kW for larger)
  const step = params.committedKw >= 100 ? 10 : 5;
  const committedKwRounded = roundDownCommittedKw(params.committedKw, step);
  const committedKw = Math.max(0, committedKwRounded);
  const capacityGrossAnnualUsd = params.capacityPaymentPerKwMonth * committedKw * 12.0;

  let eventGrossAnnualUsd = 0;
  if (params.paymentUnit === 'per_kw_event') {
    eventGrossAnnualUsd = params.eventPayment * committedKw * params.estimatedEventsPerYear;
  } else {
    if (params.avgCurtailKwhPerEvent == null) {
      throw new Error('avgCurtailKwhPerEvent required for per_kwh');
    }
    eventGrossAnnualUsd = params.eventPayment * params.avgCurtailKwhPerEvent * params.estimatedEventsPerYear;
  }

  const customerGrossAnnualUsd = capacityGrossAnnualUsd + eventGrossAnnualUsd;
  const everwattFeeFloorAnnualUsd = params.feePerKwYear * committedKw;
  const everwattFeePctAnnualUsd = params.feePct * customerGrossAnnualUsd;
  const everwattFeeAnnualUsd = Math.max(everwattFeeFloorAnnualUsd, everwattFeePctAnnualUsd);
  const customerNetAnnualUsd = customerGrossAnnualUsd - everwattFeeAnnualUsd;

  return {
    committedKw,
    committedKwRounded,
    capacityPaymentPerKwMonth: params.capacityPaymentPerKwMonth,
    eventPayment: params.eventPayment,
    paymentUnit: params.paymentUnit,
    estimatedEventsPerYear: params.estimatedEventsPerYear,
    capacityGrossAnnualUsd,
    eventGrossAnnualUsd,
    customerGrossAnnualUsd,
    everwattFeeModel: 'hybrid_floor_or_pct',
    feePct: params.feePct,
    feePerKwYear: params.feePerKwYear,
    everwattFeeFloorAnnualUsd,
    everwattFeePctAnnualUsd,
    everwattFeeAnnualUsd,
    customerNetAnnualUsd,
    avgCurtailKwhPerEvent: params.avgCurtailKwhPerEvent,
  };
}

async function runPythonDeliverables(params: {
  intervals: Array<{ ts: string; kw: number; temp?: number }>;
  battery: { power_kw: number; energy_kwh: number; round_trip_efficiency: number };
  window: { startHour: number; endHour: number; weekdaysOnly: boolean; months?: number[] };
  options: { topHotDaysN: number; noExport: boolean; soc0Frac: number };
}): Promise<DrDeliverables> {
  const script = path.join(process.cwd(), 'python', 'run_dr_deliverable.py');
  const payload = JSON.stringify(params);

  const out = await new Promise<string>((resolve, reject) => {
    const child = spawn('python', [script], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`DR deliverable python failed (code=${code}). ${stderr}`.trim()));
      }
      resolve(stdout);
    });
    child.stdin.write(payload);
    child.stdin.end();
  });

  const parsed = JSON.parse(out || '{}');
  return {
    deliverableOpsKw: Number(parsed.deliverableOpsKw) || 0,
    deliverableTotalKw: Number(parsed.deliverableTotalKw) || 0,
    deliverableBatteryKw: Number(parsed.deliverableBatteryKw) || 0,
    daysEvaluated: Number(parsed.daysEvaluated) || 0,
    notes: Array.isArray(parsed.notes) ? parsed.notes.map(String) : [],
  };
}

export async function computeDrPanel(params: {
  loadIntervals: LoadInterval[];
  /** Battery totals for DR deliverable computations */
  battery: { powerKw: number; energyKwh: number; roundTripEfficiency: number };
  rateCode?: string;
  demandResponse: ApiDemandResponseParams;
}): Promise<DrPanel> {
  const feePerKwYear = Number(params.demandResponse.everwattFeePerKwYear ?? 30);
  const feePct = Number(params.demandResponse.everwattFeePct ?? 0.2);
  const baseRate = normalizeRateBase(params.rateCode);

  const intervals = params.loadIntervals.map((i: any) => ({
    ts: i.timestamp instanceof Date ? i.timestamp.toISOString() : String(i.timestamp),
    kw: Number(i.kw) || 0,
    temp: typeof (i as any).temperature === 'number' ? (i as any).temperature : undefined,
  }));

  // Use a default PG&E-ish window (v1): summer weekdays 16-21
  const window = { startHour: 16, endHour: 21, weekdaysOnly: true, months: [6, 7, 8, 9] };
  const windowDurationHours =
    window.endHour >= window.startHour ? window.endHour - window.startHour : 24 - window.startHour + window.endHour;
  const deliverables = await runPythonDeliverables({
    intervals,
    battery: {
      power_kw: params.battery.powerKw,
      energy_kwh: params.battery.energyKwh,
      round_trip_efficiency: params.battery.roundTripEfficiency,
    },
    window,
    options: { topHotDaysN: 10, noExport: true, soc0Frac: 0.5 },
  });

  const batteryDurationHours = params.battery.powerKw > 0 ? params.battery.energyKwh / params.battery.powerKw : 0;
  const hasTemperatureData = intervals.some((i) => typeof i.temp === 'number' && Number.isFinite(i.temp));
  let hasIntervalGaps = false;
  const tsMs: number[] = intervals
    .map((i) => Date.parse(i.ts))
    .filter((x) => Number.isFinite(x))
    .sort((a, b) => a - b);
  if (tsMs.length >= 3) {
    const deltas: number[] = [];
    for (let i = 1; i < tsMs.length; i++) deltas.push(tsMs[i] - tsMs[i - 1]);
    deltas.sort((a, b) => a - b);
    const medianDelta = deltas[Math.floor(deltas.length / 2)] || 0;
    hasIntervalGaps = medianDelta > 0 && deltas.some((d) => d > 1.8 * medianDelta);
  }
  const drReservePctOfBatteryKw =
    params.battery.powerKw > 0 ? clamp((Number(deliverables.deliverableBatteryKw) || 0) / params.battery.powerKw, 0, 1) : 0;
  const eventDayCount = Number(deliverables.daysEvaluated) || 0;

  const programList: DrProgram[] = pgeDrPrograms.map((p) => {
    // Apply UI overrides uniformly for v1 (simple scenario tuning)
    const minKw = Math.max(p.eligibility.minimumCommitmentKw, params.demandResponse.minimumCommitmentKw);
    return {
      ...p,
      eligibility: { ...p.eligibility, minimumCommitmentKw: minKw },
      payments: {
        ...p.payments,
        capacityPaymentPerKwMonth: params.demandResponse.capacityPaymentPerKwMonth,
        paymentUnit: params.demandResponse.paymentUnit,
        eventPayment: params.demandResponse.eventPayment,
        estimatedEventsPerYear: params.demandResponse.estimatedEventsPerYear,
      },
    };
  });

  const programs: DrProgramEvaluation[] = programList.map((program) => {
    const reasons: string[] = [];
    const risks: string[] = [];
    const eventWindowHours =
      program.eventWindow.endHour >= program.eventWindow.startHour
        ? program.eventWindow.endHour - program.eventWindow.startHour
        : 24 - program.eventWindow.startHour + program.eventWindow.endHour;

    if (program.eligibility.requiresIntervalData) reasons.push('Interval data present.');

    const allowed = program.eligibility.allowedRateBases;
    if (allowed?.length) {
      if (!baseRate) {
        risks.push('rate_unknown');
        reasons.push('Rate code not provided; eligibility may be incomplete.');
      } else if (!allowed.includes(baseRate)) {
        return {
          program,
          eligible: false,
          eligibilityReasons: [`Rate base ${baseRate} not in eligible set for this program.`],
          deliverables,
          money: undefined,
          riskFlags: ['rate_ineligible'],
        };
      } else {
        reasons.push(`Rate base ${baseRate} appears compatible.`);
      }
    }

    const minCommit = program.eligibility.minimumCommitmentKw;
    if (deliverables.deliverableTotalKw < minCommit) {
      return {
        program,
        eligible: false,
        eligibilityReasons: [
          ...reasons,
          `Firm deliverable ${deliverables.deliverableTotalKw.toFixed(1)} kW is below minimum commitment ${minCommit} kW.`,
        ],
        deliverables,
        money: undefined,
        riskFlags: ['insufficient_commitment'],
      };
    }

    const committedKw = deliverables.deliverableTotalKw;

    const durationHours =
      params.demandResponse.eventDurationHoursOverride ??
      Math.max(1, (program.eventWindow.endHour - program.eventWindow.startHour + 24) % 24 || (program.eventWindow.endHour - program.eventWindow.startHour));

    const performanceFactor = Number(params.demandResponse.performanceFactor ?? 0.85);
    let avgCurtailKwhPerEvent: number | undefined = undefined;
    if (program.payments.paymentUnit === 'per_kwh') {
      // Deterministic: committed kW * duration * performanceFactor
      avgCurtailKwhPerEvent = committedKw * durationHours * Math.max(0, Math.min(1, performanceFactor));
      risks.push('per_kwh_assumption');
    }

    const money = computeMoney({
      committedKw,
      capacityPaymentPerKwMonth: program.payments.capacityPaymentPerKwMonth ?? 0,
      paymentUnit: program.payments.paymentUnit,
      eventPayment: program.payments.eventPayment,
      estimatedEventsPerYear: program.payments.estimatedEventsPerYear,
      avgCurtailKwhPerEvent,
      feePerKwYear,
      feePct,
    });

    const minimumCommitmentKw = Math.max(
      1,
      Number(program.eligibility.minimumCommitmentKw) || 0,
      Number(params.demandResponse.minimumCommitmentKw) || 0
    );

    let fit: ReturnType<typeof computeDrFitScore> | undefined;
    if (money) {
      const reliabilityFactor = program.payments.paymentUnit === 'per_kwh' ? 0.6 : 0.9;
      fit = computeDrFitScore({
        deliverableKw: Math.max(0, Number(deliverables.deliverableTotalKw) || 0),
        minimumCommitmentKw,
        firmPercentile: 20,
        capacityRevenueAnnual: Number(money.capacityGrossAnnualUsd ?? 0) || 0,
        eventRevenueAnnual: Number(money.eventGrossAnnualUsd ?? 0) || 0,
        reliabilityFactor,
        overlapsPeakShaving: true,
        eventWindowHours: Math.max(0, eventWindowHours),
        batteryDurationHours: Math.max(0, batteryDurationHours),
        manualOpsRequired: false,
        drReservePctOfBatteryKw,
        hasTemperatureData,
        eventDayCount,
        hasIntervalGaps,
        socAssumed: true,
      });
    }

    return {
      program,
      eligible: true,
      eligibilityReasons: [...reasons, `Firm deliverable meets minimum commitment (${minCommit} kW).`],
      deliverables,
      money,
      riskFlags: risks,
      fit,
    };
  });

  const eligibleWithMoney = programs.filter((p) => p.eligible && p.money);
  const bestProgram = eligibleWithMoney.sort((a, b) => (b.money?.customerNetAnnualUsd ?? 0) - (a.money?.customerNetAnnualUsd ?? 0))[0];
  const bestMoney = bestProgram?.money;

  const baseFit = computeDrFitScore({
    deliverableKw: Math.max(0, Number(deliverables.deliverableTotalKw) || 0),
    minimumCommitmentKw: Math.max(
      1,
      Number(params.demandResponse.minimumCommitmentKw) || 0,
      Number(bestProgram?.program?.eligibility?.minimumCommitmentKw ?? 0) || 0
    ),
    firmPercentile: 20,
    capacityRevenueAnnual: Number(bestMoney?.capacityGrossAnnualUsd ?? 0) || 0,
    eventRevenueAnnual: Number(bestMoney?.eventGrossAnnualUsd ?? 0) || 0,
    reliabilityFactor: bestProgram?.program?.payments.paymentUnit === 'per_kwh' ? 0.6 : 0.9,
    overlapsPeakShaving: true,
    eventWindowHours: Math.max(0, windowDurationHours),
    batteryDurationHours: Math.max(0, batteryDurationHours),
    manualOpsRequired: false,
    drReservePctOfBatteryKw,
    hasTemperatureData,
    eventDayCount,
    hasIntervalGaps,
    socAssumed: true,
  });

  const bestFitProgram = programs
    .filter((p) => p.fit)
    .sort((a, b) => (b.fit?.score ?? 0) - (a.fit?.score ?? 0))[0];

  const panelFit = bestFitProgram?.fit ?? baseFit;
  const fitScore = panelFit.score;
  const why = panelFit.reasons.length ? panelFit.reasons : [fitScoreLabel(fitScore)];

  const eligible = programs.filter((p) => p.eligible && p.money);
  const bestByCustomerNet = eligible.sort((a, b) => (b.money?.customerNetAnnualUsd ?? 0) - (a.money?.customerNetAnnualUsd ?? 0))[0];
  const bestByEverwattFee = eligible.sort((a, b) => (b.money?.everwattFeeAnnualUsd ?? 0) - (a.money?.everwattFeeAnnualUsd ?? 0))[0];

  return {
    fit: panelFit,
    fitScore,
    why,
    deliverables,
    feeModel: { feePerKwYear, feePct },
    programs,
    bestByCustomerNet,
    bestByEverwattFee,
  };
}

