export type BatteryAnalysisManifest = {
  apiVersion?: string;
  analysisId: string;
  runId?: string;
  createdAt?: string;
  mode?: string;
  intervalSha256?: string | null;
  usageSha256?: string | null;
  rateCode?: string | null;
  demandRatePerKwMonth?: number | null;
  thresholdKw?: number | null;
  catalogSha256?: string | null;
  gitCommit?: string | null;
  nodeVersion?: string | null;
  // passthrough for future fields
  [k: string]: unknown;
};

export type BatteryAnalysisResultEnvelope = {
  apiVersion?: string;
  analysisId: string;
  runId?: string;
  createdAt?: string;
  customerInfo?: any;
  usageData?: any;
  batteryMeta?: any;
  result: any; // raw responseBody persisted from /api/batteries/analyze
};

export type ReportHeadline = {
  baselineKw: number;
  spikeCount: number;
  bestConfigLabel: string;
  annualSavings: number;
  systemCost: number;
  paybackYears: number;
  npv10yr: number;
};

export type BatteryReportViewModel = {
  analysisId: string;
  runId: string;
  createdAt: string;
  rateCode: string;
  demandRatePerKwMonth: number;
  batteryLabel: string;
  totalKwh: number;
  totalKw: number;
  annualSavings: number;
  systemCost: number;
  paybackYears: number;
  npv10yr: number;
  spikeCount: number;
  baselineKw: number;
  manifestFooter: string[];
  raw: {
    manifest: BatteryAnalysisManifest;
    envelope: BatteryAnalysisResultEnvelope;
  };
};

function toNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[$,]/g, ''));
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function computeNpv10yr(systemCost: number, annualSavings: number, discountRate = 0.05): number {
  let npv = -systemCost;
  for (let year = 1; year <= 10; year++) {
    const degradation = Math.pow(0.98, year);
    const yearSavings = annualSavings * degradation;
    npv += yearSavings / Math.pow(1 + discountRate, year);
  }
  return npv;
}

export function buildReportViewModel(args: {
  manifest: BatteryAnalysisManifest;
  envelope: BatteryAnalysisResultEnvelope;
}): BatteryReportViewModel {
  const { manifest, envelope } = args;
  const analysisId = manifest.analysisId || envelope.analysisId;
  const runId = String(manifest.runId || envelope.runId || 'unknown-run');
  const createdAt = String(manifest.createdAt || envelope.createdAt || new Date().toISOString());
  const rateCode = String(manifest.rateCode || '').trim();
  const demandRatePerKwMonth = toNum(manifest.demandRatePerKwMonth, 0);

  // Extract “best” recommendation details
  // - multi-tier: bestRecommendation lives in envelope.result.bestRecommendation or envelope.result.tieredRecommendations
  // - single: battery meta comes from request-side batteryMeta when provided; otherwise fallback to batterySpec
  const r = envelope.result || {};
  // Prefer tariffEngine billing totals when available (billing-cycle is the unit of analysis)
  const tariffTotals = r?.tariffEngine?.success ? r.tariffEngine.totals : null;
  const singleSim = r.simulationResult || {};
  const baselineKw =
    toNum(r?.tieredRecommendations?.originalPeakKw, 0) ||
    toNum(singleSim.original_peak, 0) ||
    toNum(r?.bestRecommendation?.originalPeakKw, 0);

  const spikeCount = Array.isArray(r.peakEvents) ? r.peakEvents.length : 0;

  // Battery config label + totals
  const batteryMeta = envelope.batteryMeta || (manifest as any).batteryMeta || {};
  const batteryLabel =
    String(batteryMeta?.label || batteryMeta?.modelName || '') ||
    (Array.isArray(batteryMeta?.portfolio) && batteryMeta.portfolio.length
      ? `Portfolio ${batteryMeta.portfolio.map((u: any) => `${u.quantity || 0}×${u.modelName || u.model || ''}`).join(' + ')}`
      : 'Battery');

  const totalKwh =
    toNum(batteryMeta?.totalCapacityKwh, NaN) ||
    toNum(batteryMeta?.capacityKwh, NaN) ||
    toNum(batteryMeta?.capacity_kwh, NaN) ||
    toNum(batteryMeta?.batterySpec?.capacity_kwh, 0) ||
    toNum((r?.bestRecommendation?.recommendation?.batteryInfo?.totalCapacityKwh), 0);
  const totalKw =
    toNum(batteryMeta?.totalPowerKw, NaN) ||
    toNum(batteryMeta?.powerKw, NaN) ||
    toNum(batteryMeta?.max_power_kw, NaN) ||
    toNum(batteryMeta?.batterySpec?.max_power_kw, 0) ||
    toNum((r?.bestRecommendation?.recommendation?.batteryInfo?.totalPowerKw), 0);

  // Financials
  const annualSavings =
    (tariffTotals && typeof tariffTotals.totalSavings === 'number' ? tariffTotals.totalSavings : NaN) ||
    toNum(batteryMeta?.annualSavings, NaN) ||
    toNum(batteryMeta?.financials?.annualSavings, NaN) ||
    toNum(r?.bestRecommendation?.recommendation?.financials?.annualSavings, NaN) ||
    (() => {
      const mp = r?.simulationResult?.monthlyPeakReduction;
      const reductionKwMonthSum = toNum(mp?.reductionKwMonthSum, 0);
      const monthsCount = Math.max(1, toNum(mp?.monthsCount, 12));
      const annualizeFactor = 12 / monthsCount;
      return reductionKwMonthSum * annualizeFactor * demandRatePerKwMonth;
    })();

  const systemCost =
    toNum(batteryMeta?.systemCost, NaN) ||
    toNum(r?.bestRecommendation?.recommendation?.batteryInfo?.systemCost, NaN) ||
    toNum(r?.sizingRecommendation?.recommendedSizing?.optimalCapacityKwh, 0) * 0; // placeholder fallback to 0

  const paybackYears =
    toNum(batteryMeta?.paybackYears, NaN) ||
    toNum(r?.bestRecommendation?.recommendation?.financials?.paybackYears, NaN) ||
    (annualSavings > 0 ? systemCost / annualSavings : Number.POSITIVE_INFINITY);

  const npv10yr = computeNpv10yr(systemCost, annualSavings, 0.05);

  const manifestFooter = [
    `analysisId: ${analysisId}`,
    `runId: ${runId}`,
    `createdAt: ${createdAt}`,
    `intervalSha256: ${manifest.intervalSha256 || 'n/a'}`,
    `usageSha256: ${manifest.usageSha256 || 'n/a'}`,
    `rateCode: ${rateCode || 'n/a'} | demandRate: ${demandRatePerKwMonth || 0}/kW-month`,
    `thresholdKw: ${toNum(manifest.thresholdKw, 0).toFixed(1)}`,
    `catalogSha256: ${manifest.catalogSha256 || 'n/a'}`,
    `gitCommit: ${manifest.gitCommit || 'n/a'}`,
  ];

  return {
    analysisId,
    runId,
    createdAt,
    rateCode,
    demandRatePerKwMonth,
    batteryLabel,
    totalKwh,
    totalKw,
    annualSavings,
    systemCost,
    paybackYears,
    npv10yr,
    spikeCount,
    baselineKw,
    manifestFooter,
    raw: { manifest, envelope },
  };
}

export function diffHeadline(cur: BatteryReportViewModel, prev: BatteryReportViewModel) {
  const d = (label: string, a: number, b: number) => ({
    label,
    current: a,
    previous: b,
    delta: a - b,
  });
  return [
    d('baselineKw', cur.baselineKw, prev.baselineKw),
    d('spikeCount', cur.spikeCount, prev.spikeCount),
    d('annualSavings', cur.annualSavings, prev.annualSavings),
    d('systemCost', cur.systemCost, prev.systemCost),
    d('paybackYears', cur.paybackYears, prev.paybackYears),
    d('npv10yr', cur.npv10yr, prev.npv10yr),
  ];
}

