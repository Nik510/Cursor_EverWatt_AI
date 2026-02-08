import { getDemandRateForCode } from '../../../utils/rates/demand-rate-lookup';
import { computeBillDeterministic } from '../billing/billingOracle';
import { PgeOptionS } from '../options/pge_option_s';
import type { BaselineSnapshot, BatterySpec, CandidateAssets, ProposalPack, RateScenario, TariffModel } from '../types';
import { optimizeDispatchLp } from '../optimizer/dispatchLp';

/**
 * Phase 1 minimal engine entrypoint.
 *
 * Locked requirements:
 * - Deterministic + reproducible
 * - Bounded + honest tariff inference (uncertainty → MissingInfoItems)
 * - Option S implemented ONLY as a TariffOption rule (no special engine)
 * - ProposalPack splits structural (no-dispatch) vs operational (dispatch) savings
 */
export async function runPhase1TariffEngine(args: {
  utility: 'PG&E';
  territory?: string;
  rateCodeFromUser?: string;
  intervals: Array<{ timestamp: string; kw: number }>;
  battery?: BatterySpec;
}): Promise<ProposalPack> {
  const now = new Date().toISOString();

  const normalized = args.intervals
    .map((r) => ({ timestamp: new Date(r.timestamp), kw: r.kw }))
    .filter((r) => r.timestamp instanceof Date && Number.isFinite(r.timestamp.getTime()) && Number.isFinite(r.kw))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const evidenceInterval = [{ kind: 'interval_data' as const }];

  const intervalMinutes = inferIntervalMinutes(normalized);
  const { gapsCount } = countGaps(normalized, intervalMinutes);
  const outliersCount = normalized.filter((r) => r.kw < 0).length;

  const coveragePct = computeCoveragePct(normalized);
  const dqConfidence = scoreDataQuality({ coveragePct, gapsCount, outliersCount });

  const peak12 = trailingPeakKw12mo(normalized);
  const avgKw = normalized.length ? normalized.reduce((s, r) => s + r.kw, 0) / normalized.length : 0;
  const loadFactor = peak12 > 0 ? avgKw / peak12 : undefined;

  const baselineSnapshot: BaselineSnapshot = {
    snapshotId: `baseline:${simpleHash(JSON.stringify({ t: args.territory, r: args.rateCodeFromUser, n: normalized.length, last: normalized.at(-1)?.timestamp.toISOString() }))}`,
    createdAt: now,
    timezone: 'America/Los_Angeles',
    territory: { utility: 'PG&E', territory: args.territory, rateCodeFromUser: args.rateCodeFromUser },
    intervals: normalized.map((r) => ({ timestamp: r.timestamp.toISOString(), kw: r.kw })),
    dataQuality: {
      intervalMinutes,
      coveragePct,
      gapsCount,
      outliersCount,
      notes: [],
      confidence: dqConfidence,
      evidenceUsed: evidenceInterval,
    },
    tariffInference: {
      confidence: 0,
      why: [],
      missingInfo: [],
      evidenceUsed: [],
    },
    assumptions: [],
    derived: { peakKw_12mo: peak12, avgKw, loadFactor },
  };

  const { tariff: baseTariff, inference } = inferPgeTariff({
    rateCodeFromUser: args.rateCodeFromUser,
    territory: args.territory,
  });
  baselineSnapshot.tariffInference = inference;

  // Bound discovery to PG&E base + Option S only (Phase 1).
  const candidateAssets: CandidateAssets = args.battery ? { battery: args.battery } : {};
  const scenarios = discoverPgeScenarios({ baseTariff, baseline: baselineSnapshot, assets: candidateAssets });

  const rejectedCandidates: ProposalPack['rejectedCandidates'] = [];
  const strategies: ProposalPack['strategiesRanked'] = [];
  const missingInfoAgg: ProposalPack['missingInfo'] = [...baselineSnapshot.tariffInference.missingInfo];

  const baselineBillOracle = computeBillDeterministic({ tariff: baseTariff, intervals: normalized });
  const baselineBill = baselineBillOracle.bill;

  for (const scenario of scenarios) {
    if (!scenario.eligibility.passed) {
      rejectedCandidates.push({
        scenarioId: scenario.scenarioId,
        reason: scenario.eligibility.reasons.join(' | ') || 'Scenario not eligible.',
        eligibility: scenario.eligibility,
      });
      missingInfoAgg.push(...scenario.eligibility.missingInfo);
      continue;
    }

    // No-dispatch structural: bill under scenario tariff with same load
    const scenarioNoDispatchBill = computeBillDeterministic({ tariff: scenario.tariff, intervals: normalized }).bill;
    const structuralSavings = baselineBill.totalUsd - scenarioNoDispatchBill.totalUsd;

    // Dispatch operational: optimize net load under scenario tariff (if battery provided)
    let optimizedBill = scenarioNoDispatchBill;
    let operationalSavings = 0;
    let dispatchOutputs: any = undefined;
    let solverStatusForAudit: string | undefined;

    if (candidateAssets.battery) {
      const opt = await optimizeDispatchLp({ tariff: scenario.tariff, intervals: normalized, battery: candidateAssets.battery });
      solverStatusForAudit = opt.solverStatus;
      const optimizedIntervals = normalized.map((r, idx) => ({ timestamp: r.timestamp, kw: opt.netLoadKwSeries[idx] ?? r.kw }));
      optimizedBill = computeBillDeterministic({ tariff: scenario.tariff, intervals: optimizedIntervals }).bill;
      operationalSavings = scenarioNoDispatchBill.totalUsd - optimizedBill.totalUsd;
      dispatchOutputs = {
        netLoadKwSeries: opt.netLoadKwSeries,
        socSeries: opt.socKwhSeries ? opt.socKwhSeries.map((kwh) => (candidateAssets.battery!.energyKwh > 0 ? kwh / candidateAssets.battery!.energyKwh : 0)) : undefined,
        chargeKwSeries: opt.chargeKwSeries,
        dischargeKwSeries: opt.dischargeKwSeries,
      };
    } else {
      missingInfoAgg.push({
        id: 'battery.missing',
        title: 'Battery inputs missing',
        whyNeeded: 'Dispatch evaluation requires a battery spec (kW/kWh/efficiency).',
        howToGet: 'Enter battery power (kW), energy (kWh), and round-trip efficiency.',
        severity: 'blocker',
      });
    }

    const overallConfidence = Math.min(
      baselineSnapshot.dataQuality.confidence,
      baselineSnapshot.tariffInference.confidence,
      scenario.eligibility.confidence
    );

    const totalSavings = baselineBill.totalUsd - optimizedBill.totalUsd;
    strategies.push({
      strategyId: `strategy:${scenario.scenarioId}`,
      title: scenario.appliedOptionIds.length ? `${scenario.appliedOptionIds.join('+')} strategy` : 'Status quo (baseline tariff)',
      summary: scenario.scenarioNotes.join(' '),
      scenario,
      candidateAssets,
      evaluation: {
        noDispatch: {
          baselineBill,
          scenarioBill: scenarioNoDispatchBill,
          structuralSavingsUsd: structuralSavings,
          operationalSavingsUsd: 0,
        },
        dispatch: {
          baselineBill,
          optimizedBill,
          structuralSavingsUsd: structuralSavings,
          operationalSavingsUsd: operationalSavings,
          dispatchOutputs,
        },
      },
      viability: {
        feasible: scenario.eligibility.passed,
        feasibilityNotes: [],
        requiredEvidence: [],
      },
      risks: [],
      confidence: {
        overall: overallConfidence,
        tariffInference: baselineSnapshot.tariffInference.confidence,
        dataQuality: baselineSnapshot.dataQuality.confidence,
        eligibility: scenario.eligibility.confidence,
        notes: [`Total savings (baseline → dispatch under scenario): $${totalSavings.toFixed(2)}`],
        missingInfo: [...baselineSnapshot.tariffInference.missingInfo, ...scenario.eligibility.missingInfo],
      },
      audit: {
        engineVersion: 'phase1-v1',
        tariffLibraryVersion: baseTariff.version,
        inputsHash: simpleHash(JSON.stringify({ baseTariff, scenario, battery: candidateAssets.battery, n: normalized.length })),
        solver: candidateAssets.battery ? { name: 'glpk.js', status: solverStatusForAudit } : undefined,
        steps: [
          {
            stepId: 'baseline_snapshot',
            title: 'Baseline snapshot + QA',
            inputs: { intervalsCount: normalized.length },
            outputs: { intervalMinutes, gapsCount, outliersCount, coveragePct, peak12 },
            evidenceUsed: evidenceInterval,
          },
          {
            stepId: 'tariff_inference',
            title: 'Tariff inference (bounded + honest)',
            inputs: { rateCodeFromUser: args.rateCodeFromUser, territory: args.territory },
            outputs: baselineSnapshot.tariffInference,
            evidenceUsed: [],
          },
          {
            stepId: 'scenario_evaluation',
            title: 'Scenario evaluation (no-dispatch + dispatch)',
            inputs: { scenarioId: scenario.scenarioId },
            outputs: { structuralSavings, operationalSavings },
            evidenceUsed: [],
          },
        ],
      },
    });
  }

  // Rank strategies by total savings (descending), deterministically.
  strategies.sort((a, b) => {
    const sa = a.evaluation.dispatch.baselineBill.totalUsd - a.evaluation.dispatch.optimizedBill.totalUsd;
    const sb = b.evaluation.dispatch.baselineBill.totalUsd - b.evaluation.dispatch.optimizedBill.totalUsd;
    return sb - sa;
  });

  return {
    packId: `phase1:${now}`,
    createdAt: now,
    baselineSnapshotId: baselineSnapshot.snapshotId,
    strategiesRanked: strategies,
    rejectedCandidates,
    missingInfo: dedupeMissingInfo(missingInfoAgg),
  };
}

function inferIntervalMinutes(rows: Array<{ timestamp: Date }>): number {
  if (rows.length < 2) return 15;
  const diffs: number[] = [];
  for (let i = 1; i < Math.min(rows.length, 2000); i++) {
    const dtMin = (rows[i].timestamp.getTime() - rows[i - 1].timestamp.getTime()) / (1000 * 60);
    if (dtMin > 0) diffs.push(dtMin);
  }
  diffs.sort((a, b) => a - b);
  if (!diffs.length) return 15;
  const mid = Math.floor(diffs.length / 2);
  return diffs.length % 2 ? diffs[mid] : (diffs[mid - 1] + diffs[mid]) / 2;
}

function countGaps(rows: Array<{ timestamp: Date }>, intervalMinutes: number): { gapsCount: number } {
  if (rows.length < 2) return { gapsCount: 0 };
  const eps = 0.01;
  let gaps = 0;
  for (let i = 1; i < rows.length; i++) {
    const dt = (rows[i].timestamp.getTime() - rows[i - 1].timestamp.getTime()) / (1000 * 60);
    if (Math.abs(dt - intervalMinutes) > eps) gaps++;
  }
  return { gapsCount: gaps };
}

function computeCoveragePct(rows: Array<{ timestamp: Date }>): number {
  if (rows.length < 2) return 0;
  const start = rows[0].timestamp.getTime();
  const end = rows[rows.length - 1].timestamp.getTime();
  const days = (end - start) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.min(1, days / 365));
}

function scoreDataQuality(args: { coveragePct: number; gapsCount: number; outliersCount: number }): number {
  let c = 1;
  if (args.coveragePct < 0.9) c -= 0.3;
  if (args.gapsCount > 0) c -= Math.min(0.5, args.gapsCount / 2000);
  if (args.outliersCount > 0) c -= 0.2;
  return Math.max(0, Math.min(1, c));
}

function trailingPeakKw12mo(rows: Array<{ timestamp: Date; kw: number }>): number {
  if (!rows.length) return 0;
  const latest = rows[rows.length - 1].timestamp.getTime();
  const cutoff = latest - 365 * 24 * 60 * 60 * 1000;
  let peak = 0;
  for (const r of rows) {
    if (r.timestamp.getTime() >= cutoff) peak = Math.max(peak, r.kw);
  }
  return peak;
}

function simpleHash(input: string): string {
  // djb2 (deterministic, cheap; not cryptographic)
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return `h${(h >>> 0).toString(16)}`;
}

function inferPgeTariff(args: {
  rateCodeFromUser?: string;
  territory?: string;
}): { tariff: TariffModel; inference: BaselineSnapshot['tariffInference'] } {
  const why: string[] = [];
  const missingInfo: BaselineSnapshot['tariffInference']['missingInfo'] = [];

  const rateCode = (args.rateCodeFromUser || '').trim();
  if (!rateCode) {
    missingInfo.push({
      id: 'tariff.rateCode',
      title: 'Rate code missing',
      whyNeeded: 'Tariff inference cannot be high-confidence without a rate code from the bill/utility portal.',
      howToGet: 'Enter the PG&E rate schedule code from the bill (e.g. B-19, B-20).',
      severity: 'blocker',
    });
  }

  const demandRate = rateCode ? getDemandRateForCode(rateCode, 'PG&E') : null;
  if (rateCode && demandRate) {
    why.push(`Matched demand rate for ${demandRate.rateCode} from internal rate library (${demandRate.description}).`);
  } else if (rateCode) {
    missingInfo.push({
      id: 'tariff.demandRate',
      title: 'Demand rate not found in library for provided rate code',
      whyNeeded: 'Phase 1 baseline tariff requires a demand rate to compute deterministic bills.',
      howToGet: 'Provide the demand $/kW-month from the tariff/bill or choose a supported rate code.',
      severity: 'important',
    });
  }

  const demandRatePerKwMonth = demandRate?.rate ?? 20; // deterministic fallback (low confidence)
  if (!demandRate) why.push(`Using fallback demand rate $${demandRatePerKwMonth.toFixed(2)}/kW-month (low confidence).`);

  const confidence = rateCode && demandRate ? 0.8 : rateCode ? 0.3 : 0.1;

  const tariff: TariffModel = {
    version: 'phase1-pge-demand-v1',
    tariffId: `pge:${rateCode || 'UNKNOWN'}:phase1-demand-v1`,
    rateCode: rateCode || 'UNKNOWN',
    timezone: 'America/Los_Angeles',
    fixedMonthlyChargeUsd: 0,
    energyCharges: [],
    demandDeterminants: [
      {
        id: 'baseline.monthlyAllHours',
        name: 'Baseline monthly max demand (all hours)',
        kind: 'monthlyMax',
        tiers: [{ pricePerKw: demandRatePerKwMonth }],
      },
    ],
    meta: { utility: 'PG&E', territory: args.territory },
  };

  return {
    tariff,
    inference: {
      detectedRateCode: rateCode || undefined,
      detectedTariffId: tariff.tariffId,
      confidence,
      why,
      missingInfo,
      evidenceUsed: [],
    },
  };
}

function discoverPgeScenarios(args: {
  baseTariff: TariffModel;
  baseline: BaselineSnapshot;
  assets: CandidateAssets;
}): RateScenario[] {
  const base: RateScenario = {
    scenarioId: `scenario:${args.baseTariff.tariffId}`,
    version: 'phase1-v1',
    baseTariffId: args.baseTariff.tariffId,
    appliedOptionIds: [],
    tariff: args.baseTariff,
    scenarioNotes: ['Baseline tariff scenario.'],
    eligibility: { passed: true, confidence: 1, reasons: ['Baseline scenario'], missingInfo: [], evidenceUsed: [] },
  };

  const out: RateScenario[] = [base];

  // Option S candidate (bounded: only this one in Phase 1)
  if (PgeOptionS.trigger_conditions(args.baseline)) {
    const elig = PgeOptionS.eligibility_rules(args.baseline, args.assets);
    const { transformedTariff, transformNotes } = PgeOptionS.billing_transform(args.baseTariff, args.baseline, args.assets);
    out.push({
      scenarioId: `scenario:${args.baseTariff.tariffId}:${PgeOptionS.optionId}`,
      version: 'phase1-v1',
      baseTariffId: args.baseTariff.tariffId,
      appliedOptionIds: [PgeOptionS.optionId],
      tariff: transformedTariff,
      scenarioNotes: transformNotes,
      eligibility: elig,
    });
  }

  return out;
}

function dedupeMissingInfo(items: Array<BaselineSnapshot['tariffInference']['missingInfo'][number]>) {
  const seen = new Set<string>();
  const out: typeof items = [];
  for (const i of items) {
    const key = `${i.id}|${i.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(i);
  }
  return out;
}

