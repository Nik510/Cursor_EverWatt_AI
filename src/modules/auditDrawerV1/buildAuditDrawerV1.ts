import { AUDIT_DRAWER_V1_EXPLAINER_IDS, AUDIT_DRAWER_V1_LIMITS, auditDrawerV1VersionTag } from './constants';
import { AuditDrawerV1MissingInfoIds, AuditDrawerV1WarningIds } from './reasons';
import type { AuditDrawerV1, AuditLineItemV1, AuditSourceV1, MoneyExplainerV1 } from './types';

function safeStr(x: unknown): string {
  return String(x ?? '').trim();
}

function safeNumOrNull(x: unknown): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function uniqSortedStrings(xs: unknown[], max = AUDIT_DRAWER_V1_LIMITS.warningsMax): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of xs || []) {
    const s = safeStr(v);
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) break;
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function isSortedStrings(xs: string[]): boolean {
  for (let i = 1; i < xs.length; i++) if (xs[i - 1].localeCompare(xs[i]) > 0) return false;
  return true;
}

function stableSlice<T>(arr: T[], max: number): T[] {
  if (!Array.isArray(arr)) return [];
  if (arr.length <= max) return arr;
  return arr.slice(0, max);
}

function buildProjectLinkHints(projectId: string): Pick<NonNullable<AuditSourceV1['linkHints']>, 'intervalIntakeUrl' | 'billingIntakeUrl' | 'analysisUrl'> {
  const pid = safeStr(projectId);
  if (!pid) return {};
  const enc = encodeURIComponent(pid);
  return {
    intervalIntakeUrl: `/project-builder/${enc}/intake/intervals`,
    billingIntakeUrl: `/project-builder/${enc}/intake/billing`,
    analysisUrl: `/analysis/v1/${enc}`,
  };
}

function buildTariffBrowserUrl(args: { utility?: string | null; rateCode?: string | null; snapshotId?: string | null }): string | null {
  try {
    const utility = safeStr(args.utility).toUpperCase();
    const rate = safeStr(args.rateCode);
    const snapshot = safeStr(args.snapshotId);
    const qs = new URLSearchParams();
    if (utility) qs.set('utility', utility);
    if (rate) qs.set('rate', rate);
    if (snapshot) qs.set('snapshot', snapshot);
    const q = qs.toString();
    return `/utilities/tariffs-ca${q ? `?${q}` : ''}`;
  } catch {
    return null;
  }
}

function normalizeBatteryAuditLineItem(li: any): AuditLineItemV1 | null {
  const id = safeStr(li?.id);
  if (!id) return null;
  const label = safeStr(li?.label);
  const dollars = safeNumOrNull(li?.amountUsd);
  const sourceEngine = safeStr(li?.sourceEngine) || 'unknown';
  const sourcePath = safeStr(li?.sourcePath) || '';
  const snapshotId = li?.snapshotId === undefined ? undefined : (safeStr(li?.snapshotId) || null);

  const quantities = Array.isArray(li?.quantities) ? (li.quantities as any[]) : [];
  const q0 = quantities.length === 1 ? quantities[0] : null;
  const quantity = q0 ? safeNumOrNull(q0?.value) : undefined;
  const unit = q0 ? (safeStr(q0?.unit) || null) : undefined;

  const rateSource = li?.rateSource && typeof li.rateSource === 'object'
    ? {
        snapshotId: safeStr(li.rateSource.snapshotId) || null,
        rateCode: safeStr(li.rateSource.rateCode) || null,
        kind: li.rateSource.kind ? safeStr(li.rateSource.kind) : undefined,
      }
    : null;

  return {
    id,
    label,
    dollars,
    ...(q0 ? { quantity, unit } : {}),
    sourceEngine,
    sourcePath,
    ...(snapshotId !== undefined ? { snapshotId } : {}),
    ...(rateSource ? { rateSource } : {}),
  };
}

function buildExplainer(args: {
  id: string;
  title: string;
  summaryLines?: string[];
  lineItems?: AuditLineItemV1[];
  totals?: MoneyExplainerV1['totals'];
  sources?: AuditSourceV1[];
  missingInfo?: string[];
}): MoneyExplainerV1 {
  const summaryLines = stableSlice((args.summaryLines || []).map((s) => safeStr(s)).filter(Boolean), AUDIT_DRAWER_V1_LIMITS.summaryLinesMax);

  const lineItemsIn = Array.isArray(args.lineItems) ? args.lineItems : [];
  const lineItems = stableSlice(
    lineItemsIn
      .filter((li) => li && typeof li === 'object')
      .slice()
      .sort((a, b) => safeStr(a.id).localeCompare(safeStr(b.id))),
    AUDIT_DRAWER_V1_LIMITS.lineItemsMax,
  );

  const sourcesIn = Array.isArray(args.sources) ? args.sources : [];
  const sources = stableSlice(
    sourcesIn
      .filter((s) => s && typeof s === 'object')
      .map((s) => ({
        kind: s.kind,
        ...(s.snapshotId ? { snapshotId: safeStr(s.snapshotId) } : {}),
        ...(s.rateCode ? { rateCode: safeStr(s.rateCode) } : {}),
        ...(s.note ? { note: safeStr(s.note) } : {}),
        ...(s.linkHints ? { linkHints: s.linkHints } : {}),
      })) as AuditSourceV1[],
    AUDIT_DRAWER_V1_LIMITS.sourcesMax,
  );

  const missingInfo = uniqSortedStrings(args.missingInfo || [], AUDIT_DRAWER_V1_LIMITS.missingInfoMax);

  return {
    id: safeStr(args.id),
    title: safeStr(args.title),
    summaryLines,
    lineItems,
    totals: args.totals && typeof args.totals === 'object' ? args.totals : {},
    sources,
    missingInfo,
  };
}

/**
 * Deterministic, snapshot-only audit drawer payload builder v1.
 * Never recomputes economics; only packages already-computed snapshots from `reportJson`.
 */
export function buildCalculationAuditDrawerV1(reportJson: any, _analysisJson?: any): AuditDrawerV1 {
  const report = reportJson && typeof reportJson === 'object' ? reportJson : {};
  const projectId = safeStr(report?.projectId);
  const generatedAtIso = safeStr(report?.savedAtIso) || safeStr(report?.generatedAtIso) || safeStr(report?.revision?.createdAt);

  const engineVersions = report?.engineVersions && typeof report.engineVersions === 'object' ? (report.engineVersions as Record<string, unknown>) : null;

  const workflow = report?.workflow && typeof report.workflow === 'object' ? report.workflow : {};
  const insights = workflow?.utility?.insights && typeof workflow.utility.insights === 'object' ? workflow.utility.insights : {};
  const effectiveRateContextV1 = insights?.effectiveRateContextV1 && typeof insights.effectiveRateContextV1 === 'object' ? insights.effectiveRateContextV1 : null;

  const ercIou = effectiveRateContextV1?.iou || null;
  const ercGen = effectiveRateContextV1?.generation || null;
  const deliverySnapshotId = safeStr(ercIou?.snapshotId) || undefined;
  const generationSnapshotId = safeStr(ercGen?.snapshotId) || safeStr(ercGen?.generationSnapshotId) || undefined;
  const acquisitionMethodUsed = effectiveRateContextV1
    ? `delivery${generationSnapshotId ? '+generation' : ''}`
    : undefined;

  const telemetry = report?.telemetry && typeof report.telemetry === 'object' ? report.telemetry : {};
  const intervalMeta = telemetry?.intervalElectricMetaV1 && typeof telemetry.intervalElectricMetaV1 === 'object' ? telemetry.intervalElectricMetaV1 : null;
  const intervalSummary = telemetry?.intervalElectricV1 && typeof telemetry.intervalElectricV1 === 'object' ? telemetry.intervalElectricV1 : null;

  const evidenceInterval = (() => {
    if (!intervalMeta) return undefined;
    const src = intervalMeta?.source && typeof intervalMeta.source === 'object' ? intervalMeta.source : null;
    const vaultFileId = safeStr(src?.vaultFileId) || undefined;
    const storageKey = safeStr(src?.storageKey) || undefined;
    const pointCount = Number.isFinite(Number(intervalMeta?.pointCount)) ? Number(intervalMeta.pointCount) : (Number.isFinite(Number(intervalSummary?.pointCount)) ? Number(intervalSummary.pointCount) : undefined);
    const warningCount = Array.isArray(intervalMeta?.warnings) ? intervalMeta.warnings.length : (Number.isFinite(Number(intervalSummary?.warningCount)) ? Number(intervalSummary.warningCount) : undefined);
    return { ...(vaultFileId ? { vaultFileId } : {}), ...(storageKey ? { storageKey } : {}), ...(pointCount !== undefined ? { pointCount } : {}), ...(warningCount !== undefined ? { warningCount } : {}) };
  })();

  const billingEvidence = (() => {
    const inputs = workflow?.utility?.inputs && typeof workflow.utility.inputs === 'object' ? workflow.utility.inputs : {};
    const hasBillingSummary = Array.isArray(inputs?.billingSummary?.monthly) && inputs.billingSummary.monthly.length > 0;
    const hasBillingRecords = Array.isArray(inputs?.billingRecords) && inputs.billingRecords.length > 0;
    const hasBillPdfText = Boolean(safeStr(inputs?.billPdfText));
    const out: Record<string, unknown> = {};
    if (hasBillingSummary) out.billingSummaryMonthlyCount = inputs.billingSummary.monthly.length;
    if (hasBillingRecords) out.billingRecordsCount = inputs.billingRecords.length;
    if (hasBillPdfText) out.billPdfTextPresent = true;
    return Object.keys(out).length ? out : undefined;
  })();

  const batteryEconomicsV1 = report?.batteryEconomicsV1 && typeof report.batteryEconomicsV1 === 'object' ? report.batteryEconomicsV1 : null;
  const storageOpportunityPackV1 = report?.storageOpportunityPackV1 && typeof report.storageOpportunityPackV1 === 'object' ? report.storageOpportunityPackV1 : null;

  const warnings: string[] = [];
  if (!engineVersions) warnings.push(AuditDrawerV1WarningIds.MISSING_ENGINE_VERSIONS);
  if (!effectiveRateContextV1) warnings.push(AuditDrawerV1WarningIds.MISSING_EFFECTIVE_RATE_CONTEXT);
  if (!batteryEconomicsV1) warnings.push(AuditDrawerV1WarningIds.MISSING_BATTERY_ECONOMICS);
  if (!storageOpportunityPackV1) warnings.push(AuditDrawerV1WarningIds.MISSING_STORAGE_OPPORTUNITY_PACK);
  if (!intervalMeta && !evidenceInterval) warnings.push(AuditDrawerV1WarningIds.MISSING_INTERVAL_EVIDENCE);

  const intervalWarnCodes = Array.isArray(intervalMeta?.warnings) ? intervalMeta!.warnings.map((w: any) => `interval.${safeStr(w?.code)}`) : [];
  warnings.push(...intervalWarnCodes.filter(Boolean));
  warnings.push(...(Array.isArray(batteryEconomicsV1?.warnings) ? batteryEconomicsV1!.warnings : []));
  warnings.push(...(Array.isArray(storageOpportunityPackV1?.dispatchSimulationV1?.warnings) ? storageOpportunityPackV1!.dispatchSimulationV1.warnings : []));
  warnings.push(...(Array.isArray(effectiveRateContextV1?.warnings) ? effectiveRateContextV1.warnings : []));

  const upstreamMissingInfoIds = Array.isArray(insights?.missingInfo) ? insights.missingInfo.map((it: any) => safeStr(it?.id)).filter(Boolean) : [];

  // ---- Explainers ----
  const projectLinkHints = buildProjectLinkHints(projectId);
  const tariffBrowserUrl = buildTariffBrowserUrl({
    utility: safeStr(ercIou?.utility) || safeStr(workflow?.utility?.inputs?.currentRate?.utility) || null,
    rateCode: safeStr(ercIou?.rateCode) || safeStr(workflow?.utility?.inputs?.currentRate?.rateCode) || null,
    snapshotId: safeStr(ercIou?.snapshotId) || null,
  });

  const batteryAuditLineItemsRaw = Array.isArray(batteryEconomicsV1?.audit?.lineItems) ? (batteryEconomicsV1!.audit.lineItems as any[]) : [];
  const batteryAuditLineItems = batteryAuditLineItemsRaw.map(normalizeBatteryAuditLineItem).filter(Boolean) as AuditLineItemV1[];

  const byId = new Map<string, AuditLineItemV1>();
  for (const li of batteryAuditLineItems) if (!byId.has(li.id)) byId.set(li.id, li);

  const savingsTotal = safeNumOrNull(batteryEconomicsV1?.savingsAnnual?.totalUsd);
  const savingsEnergy = safeNumOrNull(batteryEconomicsV1?.savingsAnnual?.energyUsd);
  const savingsDemand = safeNumOrNull(batteryEconomicsV1?.savingsAnnual?.demandUsd);

  const dispatchLineItems: AuditLineItemV1[] = (() => {
    const sim = storageOpportunityPackV1?.dispatchSimulationV1 || null;
    const results: any[] = Array.isArray(sim?.strategyResults) ? sim.strategyResults : [];
    const sorted = results
      .slice()
      .sort((a, b) => safeStr(a?.strategyId).localeCompare(safeStr(b?.strategyId)));
    const out: AuditLineItemV1[] = [];
    for (const r of sorted) {
      const sid = safeStr(r?.strategyId);
      if (!sid) continue;
      const eMin = safeNumOrNull(r?.estimatedEnergySavingsAnnual?.min);
      const dMin = safeNumOrNull(r?.estimatedDemandSavingsAnnual?.min);
      const kwh = safeNumOrNull(r?.estimatedShiftedKwhAnnual?.value);
      out.push({
        id: `dispatch.${sid}.energySavingsAnnual.min`,
        label: `Dispatch ${sid} energy savings (min)`,
        dollars: eMin,
        sourceEngine: 'batteryEngineV1',
        sourcePath: `storageOpportunityPackV1.dispatchSimulationV1.strategyResults[strategyId=${sid}].estimatedEnergySavingsAnnual.min`,
      });
      out.push({
        id: `dispatch.${sid}.demandSavingsAnnual.min`,
        label: `Dispatch ${sid} demand savings (min)`,
        dollars: dMin,
        sourceEngine: 'batteryEngineV1',
        sourcePath: `storageOpportunityPackV1.dispatchSimulationV1.strategyResults[strategyId=${sid}].estimatedDemandSavingsAnnual.min`,
      });
      out.push({
        id: `dispatch.${sid}.shiftedKwhAnnual.value`,
        label: `Dispatch ${sid} shifted energy (annual)`,
        dollars: null,
        quantity: kwh,
        unit: 'kWh/yr',
        sourceEngine: 'batteryEngineV1',
        sourcePath: `storageOpportunityPackV1.dispatchSimulationV1.strategyResults[strategyId=${sid}].estimatedShiftedKwhAnnual.value`,
      });
    }
    return out;
  })();

  const batteryEconomicsTotalExplainer = buildExplainer({
    id: AUDIT_DRAWER_V1_EXPLAINER_IDS.batteryEconomicsTotal,
    title: 'Battery economics (total)',
    summaryLines: [
      ...(savingsTotal !== null ? [`Annual savings (total): $${savingsTotal}`] : []),
      ...(batteryEconomicsV1?.engineVersion ? [`Engine: batteryEconomicsV1@${safeStr(batteryEconomicsV1.engineVersion)}`] : []),
      ...(batteryAuditLineItems.length ? [`Audit line items: ${batteryAuditLineItems.length}`] : [`Audit line items: (missing)`]),
    ],
    lineItems: batteryAuditLineItems,
    totals: { ...(savingsTotal !== null ? { dollars: savingsTotal } : {}) },
    sources: [
      {
        kind: 'ENGINE_RULE',
        note: 'Snapshot-only: reportJson.batteryEconomicsV1.audit.lineItems',
        linkHints: { ...projectLinkHints },
      },
    ],
    missingInfo: [
      ...(batteryEconomicsV1 ? [] : [AuditDrawerV1MissingInfoIds.BATTERY_ECONOMICS_MISSING]),
    ],
  });

  const energyRateKind = safeStr((byId.get('savings.energyAnnual') as any)?.rateSource?.kind) || safeStr((byId.get('savings.energyAnnual') as any)?.rateSource?.kind);
  const energyArbitrageExplainer = buildExplainer({
    id: AUDIT_DRAWER_V1_EXPLAINER_IDS.energyArbitrageSavings,
    title: 'Energy arbitrage savings',
    summaryLines: [
      ...(savingsEnergy !== null ? [`Annual energy savings: $${savingsEnergy}`] : []),
      ...(energyRateKind ? [`Rate source: ${energyRateKind}`] : []),
    ],
    lineItems: [
      ...(byId.get('savings.energyAnnual') ? [byId.get('savings.energyAnnual')!] : []),
      ...dispatchLineItems.filter((li) => li.id.includes('.energySavingsAnnual.') || li.id.includes('.shiftedKwhAnnual.')),
    ],
    totals: { ...(savingsEnergy !== null ? { dollars: savingsEnergy } : {}) },
    sources: [
      ...(tariffBrowserUrl
        ? [
            {
              kind: 'TARIFF_SNAPSHOT' as const,
              snapshotId: deliverySnapshotId,
              rateCode: safeStr(ercIou?.rateCode) || undefined,
              note: 'Tariff browser hint (delivery context)',
              linkHints: { tariffBrowserUrl, ...projectLinkHints },
            },
          ]
        : [{ kind: 'ENGINE_RULE' as const, note: 'Tariff browser hint unavailable', linkHints: { ...projectLinkHints } }]),
    ],
    missingInfo: [
      ...(batteryEconomicsV1 ? [] : [AuditDrawerV1MissingInfoIds.BATTERY_ECONOMICS_MISSING]),
      ...(tariffBrowserUrl ? [] : ['tariffBrowserUrl.missing']),
    ],
  });

  const demandSavingsExplainer = buildExplainer({
    id: AUDIT_DRAWER_V1_EXPLAINER_IDS.demandSavings,
    title: 'Demand savings',
    summaryLines: [
      ...(savingsDemand !== null ? [`Annual demand savings: $${savingsDemand}`] : []),
    ],
    lineItems: [
      ...(byId.get('savings.demandAnnual') ? [byId.get('savings.demandAnnual')!] : []),
      ...dispatchLineItems.filter((li) => li.id.includes('.demandSavingsAnnual.')),
    ],
    totals: { ...(savingsDemand !== null ? { dollars: savingsDemand } : {}) },
    sources: [
      { kind: 'ENGINE_RULE', note: 'Snapshot-only: reportJson.batteryEconomicsV1.audit + dispatchSimulationV1', linkHints: { ...projectLinkHints } },
    ],
    missingInfo: [
      ...(batteryEconomicsV1 ? [] : [AuditDrawerV1MissingInfoIds.BATTERY_ECONOMICS_MISSING]),
      ...(storageOpportunityPackV1 ? [] : [AuditDrawerV1MissingInfoIds.STORAGE_OPPORTUNITY_PACK_MISSING]),
    ],
  });

  const genProviderType = safeStr(ercGen?.providerType).toUpperCase();
  const generationExplainerId =
    genProviderType === 'DA' ? AUDIT_DRAWER_V1_EXPLAINER_IDS.daGenerationMissing : AUDIT_DRAWER_V1_EXPLAINER_IDS.ccaGenerationPricing;

  const generationMissing = (() => {
    if (!effectiveRateContextV1) return true;
    if (genProviderType === 'CCA') return false;
    if (genProviderType === 'DA') return true;
    return false;
  })();

  if (genProviderType === 'DA') warnings.push(AuditDrawerV1WarningIds.DA_GENERATION_MISSING);
  if (genProviderType === 'CCA' && !generationSnapshotId) warnings.push(AuditDrawerV1WarningIds.CCA_GENERATION_MISSING);

  // Pull through any upstream "DA rates missing" ids to make contract assertions easy.
  const daMissingIds = upstreamMissingInfoIds.filter((id) => id.includes('da_detected_generation_rates_missing'));
  warnings.push(...daMissingIds);

  const ccaPricingExplainer = buildExplainer({
    id: generationExplainerId,
    title: genProviderType === 'DA' ? 'DA generation pricing (missing)' : 'CCA generation pricing',
    summaryLines: [
      ...(genProviderType ? [`Provider type: ${genProviderType}`] : []),
      ...(safeStr(ercGen?.lseName) ? [`LSE: ${safeStr(ercGen?.lseName)}`] : []),
      ...(generationSnapshotId ? [`Generation snapshot: ${generationSnapshotId}`] : []),
    ],
    lineItems: [],
    totals: {},
    sources: [
      ...(generationSnapshotId
        ? [
            {
              kind: genProviderType === 'CCA' ? ('CCA_TOU_V0' as const) : ('ENGINE_RULE' as const),
              snapshotId: generationSnapshotId,
              rateCode: safeStr(ercGen?.rateCode) || undefined,
              note: genProviderType === 'CCA' ? 'Generation TOU snapshot (CCA)' : 'Generation snapshot (DA)',
              linkHints: { ...projectLinkHints },
            },
          ]
        : [
            {
              kind: 'ENGINE_RULE',
              note: 'Generation snapshot unavailable',
              linkHints: { ...projectLinkHints },
            },
          ]),
      ...(safeStr(ercGen?.generationAddersSnapshotId)
        ? [
            {
              kind: 'CCA_ADDERS_V0',
              snapshotId: safeStr(ercGen.generationAddersSnapshotId),
              note: 'Generation adders snapshot',
              linkHints: { ...projectLinkHints },
            },
          ]
        : []),
    ],
    missingInfo: [
      ...(effectiveRateContextV1 ? [] : [AuditDrawerV1MissingInfoIds.EFFECTIVE_RATE_CONTEXT_MISSING]),
      ...(generationMissing ? [AuditDrawerV1MissingInfoIds.GENERATION_RATES_MISSING] : []),
    ],
  });

  const tariffMatchExplainer = buildExplainer({
    id: AUDIT_DRAWER_V1_EXPLAINER_IDS.tariffMatchAndRateFit,
    title: 'Tariff match and rate fit',
    summaryLines: [
      ...(safeStr(ercIou?.utility) ? [`Utility: ${safeStr(ercIou.utility)}`] : []),
      ...(safeStr(ercIou?.rateCode) ? [`Rate code: ${safeStr(ercIou.rateCode)}`] : []),
      ...(deliverySnapshotId ? [`Tariff snapshot: ${deliverySnapshotId}`] : []),
      ...(safeStr(insights?.rateFit?.status) ? [`Rate fit: ${safeStr(insights.rateFit.status)}`] : []),
    ],
    lineItems: [],
    totals: {},
    sources: [
      {
        kind: 'TARIFF_SNAPSHOT',
        snapshotId: deliverySnapshotId,
        rateCode: safeStr(ercIou?.rateCode) || undefined,
        note: 'IOU delivery tariff snapshot hint',
        linkHints: { ...(tariffBrowserUrl ? { tariffBrowserUrl } : {}), ...projectLinkHints },
      },
    ],
    missingInfo: [
      ...(effectiveRateContextV1 ? [] : [AuditDrawerV1MissingInfoIds.EFFECTIVE_RATE_CONTEXT_MISSING]),
      ...(deliverySnapshotId ? [] : ['deliverySnapshotId.missing']),
    ],
  });

  const intervalDataQualityExplainer = buildExplainer({
    id: AUDIT_DRAWER_V1_EXPLAINER_IDS.intervalDataQuality,
    title: 'Interval data quality',
    summaryLines: [
      ...(evidenceInterval?.pointCount !== undefined ? [`Points: ${evidenceInterval.pointCount}`] : []),
      ...(evidenceInterval?.warningCount !== undefined ? [`Warnings: ${evidenceInterval.warningCount}`] : []),
      ...(safeStr(intervalMeta?.timezoneUsed) ? [`Timezone: ${safeStr(intervalMeta.timezoneUsed)}`] : []),
    ],
    lineItems: [],
    totals: {},
    sources: [
      {
        kind: 'INTERVAL_EVIDENCE',
        note: 'Interval evidence pointers (vault file id / storage key when available)',
        linkHints: { ...projectLinkHints },
      },
    ],
    missingInfo: [
      ...(intervalMeta ? [] : [AuditDrawerV1MissingInfoIds.INTERVAL_META_MISSING]),
      ...uniqSortedStrings(Array.isArray(intervalMeta?.missingInfo) ? intervalMeta!.missingInfo.map((it: any) => it?.id) : [], 50),
    ],
  });

  const moneyExplainers: Record<string, MoneyExplainerV1> = {};
  for (const ex of [
    batteryEconomicsTotalExplainer,
    energyArbitrageExplainer,
    demandSavingsExplainer,
    ccaPricingExplainer,
    tariffMatchExplainer,
    intervalDataQualityExplainer,
  ]) {
    moneyExplainers[ex.id] = ex;
  }

  const warningsOut = uniqSortedStrings(warnings, AUDIT_DRAWER_V1_LIMITS.warningsMax);
  // Safety: if upstream code ever supplies sorted list already, keep it stable.
  const warningsStable = isSortedStrings(warningsOut) ? warningsOut : warningsOut.slice().sort((a, b) => a.localeCompare(b));

  return {
    version: auditDrawerV1VersionTag,
    projectId,
    generatedAtIso,
    engineVersions,
    provenance: {
      ...(deliverySnapshotId ? { deliverySnapshotId } : {}),
      ...(generationSnapshotId ? { generationSnapshotId } : {}),
      ...(acquisitionMethodUsed ? { acquisitionMethodUsed } : {}),
      evidencePointers: {
        ...(evidenceInterval ? { interval: evidenceInterval } : {}),
        ...(billingEvidence ? { billing: billingEvidence } : {}),
      },
    },
    moneyExplainers,
    warnings: warningsStable,
  };
}

