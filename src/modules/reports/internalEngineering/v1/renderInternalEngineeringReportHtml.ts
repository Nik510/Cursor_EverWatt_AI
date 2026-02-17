type StableJson = any;

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stableNormalize(value: StableJson): StableJson {
  const seen = new WeakSet<object>();
  const norm = (v: any): any => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map(norm);
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) out[k] = norm(v[k]);
    return out;
  };
  return norm(value);
}

function safeNumber(x: unknown): number | null {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return n;
}

function fmtMaybe(n: number | null | undefined, digits = 2): string {
  if (!Number.isFinite(Number(n))) return '—';
  const x = Number(n);
  // integers: keep clean
  if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
  return x.toFixed(digits);
}

function tryParseIsoMs(s: unknown): number | null {
  const t = String(s ?? '').trim();
  if (!t) return null;
  const ms = Date.parse(t);
  return Number.isFinite(ms) ? ms : null;
}

function isLikelyIanaTimezone(tz: unknown): boolean {
  const s = String(tz ?? '').trim();
  // Conservative: IANA zones are typically Region/City.
  return Boolean(s && s.includes('/') && !s.includes(' '));
}

function sortMissingInfo(a: any, b: any): number {
  const sevRank = (s: any): number => {
    const x = String(s ?? '').toLowerCase();
    if (x === 'blocking') return 0;
    if (x === 'warning') return 1;
    return 2;
  };
  const ra = sevRank(a?.severity);
  const rb = sevRank(b?.severity);
  if (ra !== rb) return ra - rb;
  const ida = String(a?.id ?? '');
  const idb = String(b?.id ?? '');
  if (ida !== idb) return ida.localeCompare(idb);
  return String(a?.description ?? '').localeCompare(String(b?.description ?? ''));
}

function buildTariffBrowserHref(args: { workflow: any }): string {
  try {
    const utility = String(args.workflow?.utility?.inputs?.currentRate?.utility || '').trim().toUpperCase();
    const rate = String(args.workflow?.utility?.inputs?.currentRate?.rateCode || '').trim();
    const snapshot = String(args.workflow?.utility?.inputs?.currentRate?.capturedAt || '').trim();
    const qs = new URLSearchParams();
    if (utility) qs.set('utility', utility);
    if (rate) qs.set('rate', rate);
    // capturedAt is not the same as snapshot tag, but keeping it as a hint is deterministic and harmless.
    if (snapshot) qs.set('snapshot', snapshot);
    const q = qs.toString();
    return `/utilities/tariffs-ca${q ? `?${q}` : ''}`;
  } catch {
    return '/utilities/tariffs-ca';
  }
}

function renderKvTable(rows: Array<{ k: string; v: string }>): string {
  return [
    `<table class="kv">`,
    `<tbody>`,
    ...rows.map((r) => `<tr><td class="k">${escapeHtml(r.k)}</td><td class="v">${escapeHtml(r.v)}</td></tr>`),
    `</tbody>`,
    `</table>`,
  ].join('\n');
}

function renderActionButton(args: { label: string; href: string; enabled: boolean }): string {
  if (args.enabled) return `<a class="btn" href="${escapeHtml(args.href)}">${escapeHtml(args.label)}</a>`;
  return `<span class="btn disabled" aria-disabled="true">${escapeHtml(args.label)}</span>`;
}

function renderInlineLink(args: { label: string; href: string; enabled: boolean }): string {
  if (args.enabled) return `<a href="${escapeHtml(args.href)}">${escapeHtml(args.label)}</a>`;
  return `<span class="noLink">${escapeHtml(args.label)}</span>`;
}

export function renderInternalEngineeringReportHtmlV1(args: {
  project: { id: string; name?: string };
  revision: { id: string; createdAt: string; title?: string; reportJson: unknown; reportHash?: string };
}): string {
  const projectName = String(args.project?.name || '').trim();
  const title = String(args.revision?.title || '').trim() || 'Internal Engineering Report (v1)';
  const createdAt = String(args.revision?.createdAt || '').trim();
  const revId = String(args.revision?.id || '').trim();
  const hash = String((args.revision as any)?.reportHash || '').trim();

  const jsonPretty = JSON.stringify(stableNormalize(args.revision?.reportJson), null, 2);

  const report: any = (args.revision?.reportJson && typeof args.revision.reportJson === 'object' ? args.revision.reportJson : {}) as any;
  const projectId = String(args.project?.id || report?.projectId || '').trim();
  const projectIdAvailable = Boolean(projectId);

  const telemetry = report?.telemetry || {};
  const intervalMeta = telemetry?.intervalElectricMetaV1 || null;
  const intervalSummary = telemetry?.intervalElectricV1 || null;
  const workflow = report?.workflow || {};
  const intervalInsightsV1 = (report as any)?.intervalInsightsV1 || null;
  const weatherRegressionV1 = (report as any)?.weatherRegressionV1 || null;
  const storageOpportunityPackV1 = (report as any)?.storageOpportunityPackV1 || null;
  const batteryEconomicsV1 = (report as any)?.batteryEconomicsV1 || null;
  const engineVersions = (report as any)?.engineVersions || null;
  const engineVersionsLine = (() => {
    const ev = engineVersions && typeof engineVersions === 'object' ? engineVersions : {};
    const intervalIntake = String((ev as any)?.intervalIntake || '').trim() || '—';
    const determinants = String((ev as any)?.determinants || '').trim() || '—';
    const tariffEngine = String((ev as any)?.tariffEngine || '').trim() || '—';
    const billingEngineV1 = String((ev as any)?.billingEngineV1 || '').trim() || '—';
    const storageEconomics = String((ev as any)?.storageEconomics || '').trim() || '—';
    const incentivesStub = String((ev as any)?.incentivesStub || '').trim() || '—';
    const batteryEconomics = String((ev as any)?.batteryEconomics || '').trim() || '—';
    return `Engine Versions: intervalIntake=${intervalIntake} • determinants=${determinants} • tariffEngine=${tariffEngine} • billingEngineV1=${billingEngineV1} • storageEconomics=${storageEconomics} • incentivesStub=${incentivesStub} • batteryEconomics=${batteryEconomics}`;
  })();

  // ---- Data Quality (deterministic; snapshot-only) ----
  const pointsReturnedCount = safeNumber(intervalSummary?.pointCount);
  const granularityMinutes = safeNumber((intervalMeta as any)?.inferredIntervalMinutes) ?? safeNumber((intervalMeta as any)?.inferredIntervalMins);
  const timezoneUsed = String((intervalMeta as any)?.timezoneUsed || '').trim();
  const timezoneKnown = isLikelyIanaTimezone(timezoneUsed);

  const startIso = String((intervalMeta as any)?.range?.startIso || '').trim();
  const endIso = String((intervalMeta as any)?.range?.endIso || '').trim();
  const startMs = tryParseIsoMs(startIso);
  const endMs = tryParseIsoMs(endIso);
  const coverageDays = startMs !== null && endMs !== null && endMs >= startMs ? (endMs - startMs) / 86_400_000 : null;

  const warningsArr = Array.isArray((intervalMeta as any)?.warnings) ? ((intervalMeta as any).warnings as any[]) : [];
  const gapWarn = warningsArr.find((w: any) => String(w?.code || '') === 'interval.points.large_gaps') || null;
  const gapCount = safeNumber(gapWarn?.details?.gapsCount) ?? null;
  const maxGapMinutes = safeNumber(gapWarn?.details?.largestGapMinutes) ?? null;

  const dataQualityRows: Array<{ k: string; v: string }> = [
    { k: 'timezoneKnown', v: timezoneKnown ? 'true' : 'false' },
    { k: 'timezoneUsed', v: timezoneUsed || '—' },
    { k: 'granularityMinutes', v: fmtMaybe(granularityMinutes, 0) },
    { k: 'pointsReturnedCount', v: fmtMaybe(pointsReturnedCount, 0) },
    { k: 'coverageDays', v: fmtMaybe(coverageDays, 3) },
    { k: 'gapCount', v: fmtMaybe(gapCount, 0) },
    { k: 'maxGapMinutes', v: fmtMaybe(maxGapMinutes, 0) },
  ];

  // ---- Interval Insights (deterministic; snapshot-only) ----
  const intervalInsightsRows: Array<{ k: string; v: string }> = (() => {
    const ii: any = intervalInsightsV1 && typeof intervalInsightsV1 === 'object' ? intervalInsightsV1 : null;
    if (!ii) return [{ k: 'available', v: 'false' }];
    const warnList = Array.isArray(ii.warnings) ? (ii.warnings as any[]).map((x) => String(x || '').trim()).filter(Boolean) : [];
    const warn = warnList.length ? warnList.slice(0, 6).join(', ') : '(none)';
    return [
      { k: 'available', v: String(Boolean(ii.available)) },
      { k: 'coverageDays', v: fmtMaybe(safeNumber(ii.coverageDays), 0) },
      { k: 'granularityMinutes', v: fmtMaybe(safeNumber(ii.granularityMinutes), 0) },
      { k: 'avgDailyKwh', v: fmtMaybe(safeNumber(ii.avgDailyKwh), 3) },
      { k: 'avgKw', v: fmtMaybe(safeNumber(ii.avgKw), 3) },
      { k: 'baseloadKw', v: fmtMaybe(safeNumber(ii.baseloadKw), 3) },
      { k: 'baseloadMethod', v: String(ii.baseloadMethod || '—') },
      { k: 'baseloadConfidence', v: String(ii.baseloadConfidence || '—') },
      { k: 'peakKw', v: fmtMaybe(safeNumber(ii.peakKw), 3) },
      { k: 'peakTimestampIso', v: String(ii.peakTimestampIso || '—') },
      { k: 'weekdayAvgKw', v: fmtMaybe(safeNumber(ii.weekdayAvgKw), 3) },
      { k: 'weekendAvgKw', v: fmtMaybe(safeNumber(ii.weekendAvgKw), 3) },
      { k: 'weekdayWeekendDeltaPct', v: fmtMaybe(safeNumber(ii.weekdayWeekendDeltaPct), 3) },
      { k: 'warnings', v: warn },
    ];
  })();

  // ---- Weather Regression (deterministic; snapshot-only) ----
  const weatherRegressionRows: Array<{ k: string; v: string }> = (() => {
    const wr: any = weatherRegressionV1 && typeof weatherRegressionV1 === 'object' ? weatherRegressionV1 : null;
    if (!wr) return [{ k: 'present', v: 'false' }];
    const warnList = Array.isArray(wr.warnings) ? (wr.warnings as any[]).map((x) => String(x || '').trim()).filter(Boolean) : [];
    const warn = warnList.length ? warnList.slice(0, 6).join(', ') : '(none)';
    return [
      { k: 'present', v: 'true' },
      { k: 'modelType', v: String(wr.modelType || '—') },
      { k: 'coverageDays', v: fmtMaybe(safeNumber(wr.coverageDays), 0) },
      { k: 'overlapDays', v: fmtMaybe(safeNumber(wr.overlapDays), 0) },
      { k: 'hddBaseF', v: fmtMaybe(safeNumber(wr.hddBaseF), 0) },
      { k: 'cddBaseF', v: fmtMaybe(safeNumber(wr.cddBaseF), 0) },
      { k: 'intercept', v: fmtMaybe(safeNumber(wr.intercept), 3) },
      { k: 'slopeHdd', v: fmtMaybe(safeNumber(wr.slopeHdd), 3) },
      { k: 'slopeCdd', v: fmtMaybe(safeNumber(wr.slopeCdd), 3) },
      { k: 'r2', v: fmtMaybe(safeNumber(wr.r2), 4) },
      { k: 'confidenceTier', v: String(wr.confidenceTier || '—') },
      { k: 'annualizeMethod', v: String(wr.annualization?.method || '—') },
      { k: 'annualKwhEstimate', v: fmtMaybe(safeNumber(wr.annualization?.annualKwhEstimate), 0) },
      { k: 'annualConfidenceTier', v: String(wr.annualization?.confidenceTier || '—') },
      { k: 'warnings', v: warn },
    ];
  })();

  // ---- Storage Opportunity Pack v1 (snapshot-only) ----
  const batteryOpportunityRows: Array<{ k: string; v: string }> = (() => {
    const pack: any = storageOpportunityPackV1 && typeof storageOpportunityPackV1 === 'object' ? storageOpportunityPackV1 : null;
    const bo: any = pack?.batteryOpportunityV1 || null;
    if (!bo) return [{ k: 'present', v: 'false' }];

    const power = Array.isArray(bo.recommendedPowerKwRange) ? bo.recommendedPowerKwRange : [];
    const energy = Array.isArray(bo.recommendedEnergyKwhRange) ? bo.recommendedEnergyKwhRange : [];
    const drivers = Array.isArray(bo.valueDrivers) ? (bo.valueDrivers as any[]).map((x) => String(x || '').trim()).filter(Boolean).join(', ') : '—';
    const warn = Array.isArray(bo.warnings) ? (bo.warnings as any[]).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10).join(', ') : '(none)';
    const miss = Array.isArray(bo.missingInfo) ? (bo.missingInfo as any[]).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10).join(', ') : '(none)';
    const configs = Array.isArray(bo.recommendedBatteryConfigs)
      ? (bo.recommendedBatteryConfigs as any[])
          .slice(0, 3)
          .map((c) => `${fmtMaybe(safeNumber(c?.powerKw), 0)}kW/${fmtMaybe(safeNumber(c?.energyKwh), 0)}kWh@${fmtMaybe(safeNumber(c?.durationHours), 0)}h`)
          .join(' • ')
      : '—';

    const total = bo?.savingsEstimateAnnual?.total || null;
    const totalText =
      total && typeof total === 'object'
        ? `${fmtMaybe(safeNumber(total.min), 0)}..${fmtMaybe(safeNumber(total.max), 0)} (method=${String(total.method || '—')})`
        : '—';

    return [
      { k: 'present', v: 'true' },
      { k: 'confidenceTier', v: String(bo.confidenceTier || '—') },
      { k: 'engineVersion', v: String(bo.engineVersion || '—') },
      { k: 'recommendedPowerKwRange', v: `${fmtMaybe(safeNumber(power[0]), 0)}..${fmtMaybe(safeNumber(power[1]), 0)}` },
      { k: 'recommendedEnergyKwhRange', v: `${fmtMaybe(safeNumber(energy[0]), 0)}..${fmtMaybe(safeNumber(energy[1]), 0)}` },
      { k: 'recommendedBatteryConfigsTop3', v: configs || '—' },
      { k: 'savingsEstimateAnnual.total', v: totalText },
      { k: 'valueDrivers', v: drivers || '—' },
      { k: 'warnings', v: warn || '(none)' },
      { k: 'missingInfo', v: miss || '(none)' },
    ];
  })();

  const dispatchSimulationRows: Array<{ k: string; v: string }> = (() => {
    const pack: any = storageOpportunityPackV1 && typeof storageOpportunityPackV1 === 'object' ? storageOpportunityPackV1 : null;
    const sim: any = pack?.dispatchSimulationV1 || null;
    if (!sim) return [{ k: 'present', v: 'false' }];
    const a = sim.assumptions || {};
    const warn = Array.isArray(sim.warnings) ? (sim.warnings as any[]).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10).join(', ') : '(none)';
    const results = Array.isArray(sim.strategyResults) ? (sim.strategyResults as any[]) : [];
    const summary = results
      .slice(0, 3)
      .map((r) => {
        const id = String(r?.strategyId || '—');
        const peak = r?.estimatedPeakKwReduction ? `${fmtMaybe(safeNumber(r.estimatedPeakKwReduction.min), 2)}kW` : '—';
        const kwh = r?.estimatedShiftedKwhAnnual ? `${fmtMaybe(safeNumber(r.estimatedShiftedKwhAnnual.value), 0)}kWh/yr` : '—';
        const e = r?.estimatedEnergySavingsAnnual ? `${fmtMaybe(safeNumber(r.estimatedEnergySavingsAnnual.min), 0)}` : '—';
        const d = r?.estimatedDemandSavingsAnnual ? `${fmtMaybe(safeNumber(r.estimatedDemandSavingsAnnual.min), 0)}` : '—';
        return `${id}: peakRed≈${peak}, shifted≈${kwh}, energy$≈${e}, demand$≈${d}`;
      })
      .join(' | ');

    return [
      { k: 'present', v: 'true' },
      { k: 'assumptions.strategyId', v: String(a.strategyId || '—') },
      { k: 'assumptions.rte', v: fmtMaybe(safeNumber(a.rte), 3) },
      { k: 'assumptions.maxCyclesPerDay', v: fmtMaybe(safeNumber(a.maxCyclesPerDay), 0) },
      { k: 'assumptions.dispatchDaysPerYear', v: fmtMaybe(safeNumber(a.dispatchDaysPerYear), 0) },
      { k: 'strategyResults.summary', v: summary || '—' },
      { k: 'warnings', v: warn || '(none)' },
    ];
  })();

  const drReadinessRows: Array<{ k: string; v: string }> = (() => {
    const pack: any = storageOpportunityPackV1 && typeof storageOpportunityPackV1 === 'object' ? storageOpportunityPackV1 : null;
    const dr: any = pack?.drReadinessV1 || null;
    if (!dr) return [{ k: 'present', v: 'false' }];
    const warn = Array.isArray(dr.warnings) ? (dr.warnings as any[]).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10).join(', ') : '(none)';
    const miss = Array.isArray(dr.missingInfo) ? (dr.missingInfo as any[]).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10).join(', ') : '(none)';
    const top = Array.isArray(dr.topEventWindows) ? (dr.topEventWindows as any[]) : [];
    const t0 = top[0] || null;
    const typical = Array.isArray(dr.typicalShedPotentialKwRange) ? dr.typicalShedPotentialKwRange : [];
    const variability = dr.variabilityScore || {};
    return [
      { k: 'present', v: 'true' },
      { k: 'confidenceTier', v: String(dr.confidenceTier || '—') },
      { k: 'typicalShedPotentialKwRange', v: `${fmtMaybe(safeNumber(typical[0]), 2)}..${fmtMaybe(safeNumber(typical[1]), 2)}` },
      { k: 'variabilityScore', v: `${fmtMaybe(safeNumber(variability.value), 3)} (method=${String(variability.method || '—')})` },
      { k: 'topEventWindows.count', v: String(top.length) },
      { k: 'topEventWindows.top1', v: t0 ? `${String(t0.dateIso || '—')} @${fmtMaybe(safeNumber(t0.startHourLocal), 0)}h` : '—' },
      { k: 'warnings', v: warn || '(none)' },
      { k: 'missingInfo', v: miss || '(none)' },
    ];
  })();

  const storageEconomicsRows: Array<{ k: string; v: string }> = (() => {
    const pack: any = storageOpportunityPackV1 && typeof storageOpportunityPackV1 === 'object' ? storageOpportunityPackV1 : null;
    const econ: any = pack?.storageEconomicsV1 || null;
    if (!econ) return [{ k: 'present', v: 'false' }];
    const capex = econ.capexEstimate || {};
    const cash = econ.cashflow || {};
    const payback = econ.payback || {};
    const npv = econ.npvLite || {};
    const warn = Array.isArray(econ.warnings) ? (econ.warnings as any[]).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10).join(', ') : '(none)';
    const miss = Array.isArray(econ.missingInfo) ? (econ.missingInfo as any[]).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10).join(', ') : '(none)';
    const capexR = Array.isArray(capex.totalCapexUsdRange) ? capex.totalCapexUsdRange : [];
    const gross = Array.isArray(cash.annualGrossSavingsUsdRange) ? cash.annualGrossSavingsUsdRange : [];
    const net = Array.isArray(cash.annualNetSavingsUsdRange) ? cash.annualNetSavingsUsdRange : [];
    const pb = Array.isArray(payback.simplePaybackYearsRange) ? payback.simplePaybackYearsRange : [];
    const npvR = Array.isArray(npv.npvUsdRange) ? npv.npvUsdRange : [];
    return [
      { k: 'present', v: 'true' },
      { k: 'confidenceTier', v: String(econ.confidenceTier || '—') },
      { k: 'engineVersion', v: String(econ.engineVersion || '—') },
      { k: 'capex.totalCapexUsdRange', v: `${fmtMaybe(safeNumber(capexR[0]), 0)}..${fmtMaybe(safeNumber(capexR[1]), 0)}` },
      { k: 'cashflow.annualGrossSavingsUsdRange', v: `${fmtMaybe(safeNumber(gross[0]), 0)}..${fmtMaybe(safeNumber(gross[1]), 0)}` },
      { k: 'cashflow.annualNetSavingsUsdRange', v: `${fmtMaybe(safeNumber(net[0]), 0)}..${fmtMaybe(safeNumber(net[1]), 0)}` },
      { k: 'payback.simplePaybackYearsRange', v: `${fmtMaybe(safeNumber(pb[0]), 2)}..${fmtMaybe(safeNumber(pb[1]), 2)}` },
      { k: 'npvLite.npvUsdRange', v: `${fmtMaybe(safeNumber(npvR[0]), 0)}..${fmtMaybe(safeNumber(npvR[1]), 0)}` },
      { k: 'warnings', v: warn || '(none)' },
      { k: 'missingInfo', v: miss || '(none)' },
    ];
  })();

  const incentivesRows: Array<{ k: string; v: string }> = (() => {
    const pack: any = storageOpportunityPackV1 && typeof storageOpportunityPackV1 === 'object' ? storageOpportunityPackV1 : null;
    const inc: any = pack?.incentivesStubV1 || null;
    if (!inc) return [{ k: 'present', v: 'false' }];
    const warn = Array.isArray(inc.warnings) ? (inc.warnings as any[]).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10).join(', ') : '(none)';
    const miss = Array.isArray(inc.missingInfo) ? (inc.missingInfo as any[]).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10).join(', ') : '(none)';
    return [
      { k: 'present', v: 'true' },
      { k: 'confidenceTier', v: String(inc.confidenceTier || '—') },
      { k: 'engineVersion', v: String(inc.engineVersion || '—') },
      { k: 'estimatedIncentiveUsdRange', v: '—' },
      { k: 'warnings', v: warn || '(none)' },
      { k: 'missingInfo', v: miss || '(none)' },
    ];
  })();

  const batteryEconomicsRows: Array<{ k: string; v: string }> = (() => {
    const econ: any = batteryEconomicsV1 && typeof batteryEconomicsV1 === 'object' ? batteryEconomicsV1 : null;
    if (!econ) return [{ k: 'present', v: 'false' }];
    const capex = econ.capex || {};
    const savings = econ.savingsAnnual || {};
    const cf = econ.cashflow || {};
    const warn = Array.isArray(econ.warnings) ? (econ.warnings as any[]).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10).join(', ') : '(none)';
    return [
      { k: 'present', v: 'true' },
      { k: 'confidenceTier', v: String(econ.confidenceTier || '—') },
      { k: 'engineVersion', v: String(econ.engineVersion || '—') },
      { k: 'capex.totalUsd', v: fmtMaybe(safeNumber(capex.totalUsd), 0) },
      { k: 'savingsAnnual.totalUsd', v: fmtMaybe(safeNumber(savings.totalUsd), 0) },
      { k: 'cashflow.simplePaybackYears', v: fmtMaybe(safeNumber(cf.simplePaybackYears), 2) },
      { k: 'cashflow.npvUsd', v: fmtMaybe(safeNumber(cf.npvUsd), 0) },
      { k: 'warnings', v: warn || '(none)' },
    ];
  })();

  const batteryEconomicsAuditHtml = (() => {
    const econ: any = batteryEconomicsV1 && typeof batteryEconomicsV1 === 'object' ? batteryEconomicsV1 : null;
    const items: any[] = econ && econ.audit && Array.isArray(econ.audit.lineItems) ? (econ.audit.lineItems as any[]) : [];
    if (!items.length) return `<div class="muted">(audit unavailable)</div>`;
    const top10 = items.slice(0, 10);
    return [
      `<details style="margin-top:10px;">`,
      `<summary style="cursor:pointer;font-weight:700;">Audit (top 10 line items)</summary>`,
      `<ul style="margin:10px 0 0 18px;padding:0;">`,
      ...top10.map((it) => {
        const id = String(it?.id || '').trim() || '(id)';
        const label = String(it?.label || '').trim();
        const amt = fmtMaybe(safeNumber(it?.amountUsd), 0);
        const basis = String(it?.basis || '').trim();
        return `<li><span style="font-family: var(--mono);">${escapeHtml(id)}</span>${label ? ` — ${escapeHtml(label)}` : ''} — <span style="font-family: var(--mono);">$${escapeHtml(amt)}</span>${basis ? ` <span class="muted">(${escapeHtml(basis)})</span>` : ''}</li>`;
      }),
      `</ul>`,
      `</details>`,
    ].join('\n');
  })();

  // ---- Missing Evidence / Next Actions (deterministic) ----
  const missingFromInterval = Array.isArray((intervalMeta as any)?.missingInfo) ? ((intervalMeta as any).missingInfo as any[]) : [];
  const missingFromInsights = Array.isArray(workflow?.utility?.insights?.missingInfo) ? (workflow.utility.insights.missingInfo as any[]) : [];
  const missingFromTariffApplicability = Array.isArray(workflow?.utility?.insights?.rateFit?.tariffApplicability?.missingInfo)
    ? (workflow.utility.insights.rateFit.tariffApplicability.missingInfo as any[])
    : [];

  const missingAll = [...missingFromInterval, ...missingFromInsights, ...missingFromTariffApplicability]
    .filter((it: any) => it && typeof it === 'object')
    .map((it: any) => ({
      id: String(it?.id || '').trim(),
      category: String(it?.category || '').trim(),
      severity: String(it?.severity || '').trim(),
      description: String(it?.description || '').trim(),
    }))
    .filter((it) => Boolean(it.id || it.description))
    .sort(sortMissingInfo);

  const intervalIntakeHref = projectIdAvailable ? `/project-builder/${encodeURIComponent(projectId)}/intake/intervals` : '';
  const billingIntakeHref = projectIdAvailable ? `/project-builder/${encodeURIComponent(projectId)}/intake/billing` : '';
  const analysisHref = projectIdAvailable ? `/analysis/v1/${encodeURIComponent(projectId)}` : '';
  const tariffBrowserHref = buildTariffBrowserHref({ workflow });

  const missingSectionHtml =
    missingAll.length === 0
      ? `<div class="muted">(none)</div>`
      : [
          `<div class="actions">`,
          renderActionButton({ label: 'Open interval intake', href: intervalIntakeHref, enabled: projectIdAvailable }),
          renderActionButton({ label: 'Open billing intake', href: billingIntakeHref, enabled: projectIdAvailable }),
          renderActionButton({ label: 'Open tariff browser', href: tariffBrowserHref, enabled: true }),
          renderActionButton({ label: 'Open analysis results', href: analysisHref, enabled: projectIdAvailable }),
          projectIdAvailable ? '' : `<div class="muted">Project ID unavailable</div>`,
          `</div>`,
          `<ul class="missing">`,
          ...missingAll.map((it) => {
            const idLower = it.id.toLowerCase();
            const descLower = it.description.toLowerCase();
            const showInterval = idLower.includes('interval') || idLower.startsWith('pge.interval') || descLower.includes('interval');
            const showBilling = it.category.toLowerCase() === 'billing' || idLower.includes('bill') || descLower.includes('bill');
            const showTariff = it.category.toLowerCase() === 'tariff' || idLower.includes('tariff') || idLower.includes('rate') || descLower.includes('tariff');

            const links: string[] = [];
            if (showInterval) links.push(renderInlineLink({ label: 'interval intake', href: intervalIntakeHref, enabled: projectIdAvailable }));
            if (showBilling) links.push(renderInlineLink({ label: 'billing intake', href: billingIntakeHref, enabled: projectIdAvailable }));
            if (showTariff) links.push(renderInlineLink({ label: 'tariff browser', href: tariffBrowserHref, enabled: true }));
            links.push(renderInlineLink({ label: 'analysis results', href: analysisHref, enabled: projectIdAvailable }));

            const label = [
              it.severity ? `[${it.severity}]` : '',
              it.category ? `(${it.category})` : '',
              it.id ? it.id : '(missingInfo)',
            ]
              .filter(Boolean)
              .join(' ');

            return [
              `<li>`,
              `<div class="miTitle">${escapeHtml(label)}</div>`,
              `<div class="miDesc">${escapeHtml(it.description || '—')}</div>`,
              `<div class="miLinks">Next: ${links.join(' • ')}</div>`,
              `</li>`,
            ].join('\n');
          }),
          `</ul>`,
        ].join('\n');

  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `<meta charset="utf-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `<title>${escapeHtml(title)}</title>`,
    `<style>`,
    `  :root { --bg:#0b1020; --panel:#0f172a; --text:#e2e8f0; --muted:#94a3b8; --border:#1f2a44; --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; --sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }`,
    `  body { margin:0; font-family: var(--sans); background: #ffffff; color: #0f172a; }`,
    `  .wrap { max-width: 980px; margin: 0 auto; padding: 28px 20px; }`,
    `  .hdr { display:flex; justify-content: space-between; gap: 16px; align-items: flex-start; }`,
    `  h1 { font-size: 20px; margin:0; }`,
    `  .meta { font-family: var(--mono); font-size: 12px; color: #334155; }`,
    `  .pill { display:inline-block; padding: 2px 8px; border-radius: 999px; border: 1px solid #e2e8f0; background: #f8fafc; font-family: var(--mono); font-size: 11px; color:#334155; }`,
    `  .card { margin-top: 16px; border: 1px solid #e2e8f0; border-radius: 12px; overflow:hidden; }`,
    `  .cardTitle { padding: 10px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color:#0f172a; }`,
    `  .cardBody { padding: 12px; }`,
    `  .muted { color:#64748b; font-size: 12px; }`,
    `  table.kv { width:100%; border-collapse: collapse; }`,
    `  table.kv td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }`,
    `  table.kv td.k { width: 240px; color:#334155; font-family: var(--mono); }`,
    `  table.kv td.v { color:#0f172a; font-family: var(--mono); }`,
    `  .actions { display:flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }`,
    `  .btn { display:inline-flex; align-items:center; gap:6px; padding: 6px 10px; border:1px solid #e2e8f0; border-radius: 10px; background:#ffffff; color:#1d4ed8; text-decoration:none; font-size: 12px; font-weight: 700; }`,
    `  .btn:hover { background:#eff6ff; }`,
    `  .btn.disabled { color:#94a3b8; background:#f8fafc; cursor:not-allowed; }`,
    `  ul.missing { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }`,
    `  ul.missing > li { border:1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; background:#ffffff; }`,
    `  .miTitle { font-family: var(--mono); font-size: 12px; font-weight: 800; color:#0f172a; }`,
    `  .miDesc { margin-top: 4px; font-size: 12px; color:#334155; }`,
    `  .miLinks { margin-top: 6px; font-size: 12px; color:#475569; }`,
    `  .miLinks a { color:#1d4ed8; text-decoration:none; font-weight: 700; }`,
    `  .miLinks a:hover { text-decoration: underline; }`,
    `  .noLink { font-weight: 700; color:#64748b; }`,
    `  pre { margin:0; padding: 12px; font-family: var(--mono); font-size: 12px; line-height: 1.45; overflow:auto; background: #0b1020; color: var(--text); }`,
    `  .footer { margin-top: 14px; font-size: 11px; color: #64748b; }`,
    `</style>`,
    `</head>`,
    `<body>`,
    `<div class="wrap">`,
    `<div class="hdr">`,
    `<div>`,
    `<h1>${escapeHtml(title)}</h1>`,
    `<div class="meta">projectId=${escapeHtml(String(args.project?.id || ''))}${projectName ? ` • projectName=${escapeHtml(projectName)}` : ''}</div>`,
    `<div class="meta">createdAt=${escapeHtml(createdAt)} • revisionId=${escapeHtml(revId)}${hash ? ` • hash=${escapeHtml(hash.slice(0, 12))}…` : ''}</div>`,
    `</div>`,
    `<div class="pill">append-only • deterministic renderer</div>`,
    `</div>`,

    `<div class="card">`,
    `<div class="cardTitle">Data Quality</div>`,
    `<div class="cardBody">`,
    `${renderKvTable(dataQualityRows)}`,
    `<div class="muted" style="margin-top:10px;">Computed strictly from the stored snapshot in this report revision (no AI, no guessing).</div>`,
    `<div class="muted" style="margin-top:8px;font-family: var(--mono);">${escapeHtml(engineVersionsLine)}</div>`,
    `</div>`,
    `</div>`,

    `<div class="card">`,
    `<div class="cardTitle">Interval Insights</div>`,
    `<div class="cardBody">`,
    `${renderKvTable(intervalInsightsRows)}`,
    `<div class="muted" style="margin-top:10px;">Rendered strictly from reportJson.intervalInsightsV1 (no live recompute).</div>`,
    `</div>`,
    `</div>`,

    `<div class="card">`,
    `<div class="cardTitle">Weather Regression</div>`,
    `<div class="cardBody">`,
    `${renderKvTable(weatherRegressionRows)}`,
    `<div class="muted" style="margin-top:10px;">Rendered strictly from reportJson.weatherRegressionV1 (no live recompute).</div>`,
    `</div>`,
    `</div>`,

    `<div class="card">`,
    `<div class="cardTitle">Battery Opportunity</div>`,
    `<div class="cardBody">`,
    `${renderKvTable(batteryOpportunityRows)}`,
    `<div class="muted" style="margin-top:10px;">Rendered strictly from reportJson.storageOpportunityPackV1.batteryOpportunityV1 (no live recompute).</div>`,
    `</div>`,
    `</div>`,

    `<div class="card">`,
    `<div class="cardTitle">Dispatch Simulation</div>`,
    `<div class="cardBody">`,
    `${renderKvTable(dispatchSimulationRows)}`,
    `<div class="muted" style="margin-top:10px;">Rendered strictly from reportJson.storageOpportunityPackV1.dispatchSimulationV1 (no live recompute).</div>`,
    `</div>`,
    `</div>`,

    `<div class="card">`,
    `<div class="cardTitle">DR Readiness</div>`,
    `<div class="cardBody">`,
    `${renderKvTable(drReadinessRows)}`,
    `<div class="muted" style="margin-top:10px;">Rendered strictly from reportJson.storageOpportunityPackV1.drReadinessV1 (no live recompute).</div>`,
    `</div>`,
    `</div>`,

    `<div class="card">`,
    `<div class="cardTitle">Storage Economics</div>`,
    `<div class="cardBody">`,
    `${renderKvTable(storageEconomicsRows)}`,
    `<div class="muted" style="margin-top:10px;">Rendered strictly from reportJson.storageOpportunityPackV1.storageEconomicsV1 (no live recompute).</div>`,
    `</div>`,
    `</div>`,

    `<div class="card">`,
    `<div class="cardTitle">Incentives</div>`,
    `<div class="cardBody">`,
    `${renderKvTable(incentivesRows)}`,
    `<div class="muted" style="margin-top:10px;">Rendered strictly from reportJson.storageOpportunityPackV1.incentivesStubV1 (no live recompute).</div>`,
    `</div>`,
    `</div>`,

    `<div class="card">`,
    `<div class="cardTitle">Battery Economics</div>`,
    `<div class="cardBody">`,
    `${renderKvTable(batteryEconomicsRows)}`,
    `${batteryEconomicsAuditHtml}`,
    `<div class="muted" style="margin-top:10px;">Rendered strictly from reportJson.batteryEconomicsV1 (no live recompute).</div>`,
    `</div>`,
    `</div>`,

    `<div class="card">`,
    `<div class="cardTitle">Missing Evidence / Next Actions</div>`,
    `<div class="cardBody">`,
    `${missingSectionHtml}`,
    `</div>`,
    `</div>`,

    `<div class="card">`,
    `<div class="cardTitle">Report JSON (stable key ordering)</div>`,
    `<pre>${escapeHtml(jsonPretty)}</pre>`,
    `</div>`,
    `<div class="footer">EverWatt • Internal Engineering Report v1</div>`,
    `</div>`,
    `</body>`,
    `</html>`,
    ``,
  ].join('\n');
}

