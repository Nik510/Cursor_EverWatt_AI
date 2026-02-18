import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, readFileSync } from 'node:fs';

import { vi } from 'vitest';

import { extractBillPdfTariffHintsV1 } from '../../src/modules/utilityIntelligence/billPdf/extractBillPdfTariffHintsV1';
import { matchBillTariffToLibraryV1 } from '../../src/modules/tariffLibrary/matching/matchBillTariffToLibraryV1';
import { detectSupplyStructureV1 } from '../../src/modules/supplyStructureAnalyzerV1/detectSupplyStructureV1';
import { analyzeUtility } from '../../src/modules/utilityIntelligence/analyzeUtility';
import { buildInternalEngineeringReportJsonV1 } from '../../src/modules/reports/internalEngineering/v1/buildInternalEngineeringReportJsonV1';
import { renderInternalEngineeringReportHtmlV1 } from '../../src/modules/reports/internalEngineering/v1/renderInternalEngineeringReportHtml';

type SupplyProviderTypeExpectation = 'NONE' | 'CCA' | 'DA';
type RateSourceKindExpectation =
  | 'DELIVERY'
  | 'CCA_GEN_V0_ENERGY_ONLY'
  | 'CCA_GEN_V0_ALL_IN'
  | 'CCA_GEN_V0_ALL_IN_WITH_EXIT_FEES'
  | 'CCA_DELIVERY_FALLBACK'
  | 'DA_DELIVERY_FALLBACK';

export type GoldenBillContextV1 = {
  projectId: string;
  utility: string;
  supplyType: 'electric' | 'gas' | 'both';
  billPeriodStartYmd?: string | null;
  intervalFixtureRef?: string | null;
  currentRateOverride?: { utility: string; rateCode: string } | null;
};

export type GoldenBillRunnerResultV1 = {
  utilityDetection: {
    utilityHintRaw: string | null;
    utilityId: string;
    rateScheduleText: string | null;
    warnings: string[];
    billTariffLibraryMatch: {
      resolvedRateCode: string | null;
      candidatesRateCodes: string[];
      warnings: string[];
    };
  };
  effectiveRateContextV1: {
    iou: { utility: string; rateCode: string | null; snapshotId: string | null };
    generation: {
      providerType: SupplyProviderTypeExpectation;
      lseName: string | null;
      rateCode: string | null;
      snapshotId: string | null;
      generationTouEnergyPricesCount: number;
      generationAllInTouEnergyPricesCount: number;
      generationAddersPerKwhTotal: number | null;
      generationAddersSnapshotId: string | null;
    };
    warnings: string[];
    missingInfoIds: string[];
  } | null;
  insights: {
    missingInfoIds: string[];
  };
  determinantsPackSummary: any | null;
  billSimV2Summary:
    | null
    | {
        utility: string;
        rateCode: string;
        latestCycle: null | { cycleLabel: string; totals: { energyDollars: number | null; totalDollars: number | null; isPartial: boolean }; lineItemCount: number };
        missingInfoIds: string[];
      };
  batteryEconomics: null | {
    rateSourceKind: RateSourceKindExpectation;
    annualSavingsUsd: number | null;
    auditSavings: null | {
      totalRounded: number | null;
      lineItems: Array<{ id: string; amountRounded: number | null }>;
    };
  };
  auditReconcile: { ok: boolean; deltaAbs: number | null };
  topLineNumbers: {
    totalEnergyCharge: number | null;
    billingDemandKw: number | null;
    totalEstimatedMonthlyBill: number | null;
    batteryAnnualSavingsUsd: number | null;
  };
  report: { engineVersionsLine: string | null; html: string; auditDrawerV1: any | null };
};

function safeYmd(s: unknown): string | null {
  const x = String(s ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return null;
  return x;
}

function addDaysYmd(startYmd: string, days: number): string {
  const d = new Date(`${startYmd}T00:00:00.000Z`);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return startYmd;
  const out = new Date(ms + days * 24 * 60 * 60 * 1000);
  return out.toISOString().slice(0, 10);
}

function uniqSortedStrings(arr: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of arr || []) {
    const s = String(v ?? '').trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function canonicalUtilityIdFromHint(raw: string | null): string {
  const s = String(raw || '').trim();
  if (!s) return 'UNKNOWN';
  if (s === 'PG&E') return 'PGE';
  if (s === 'SCE') return 'SCE';
  if (s === 'SDG&E') return 'SDGE';
  return s;
}

function toSupplyProviderTypeExpectation(raw: unknown): SupplyProviderTypeExpectation {
  const s = String(raw ?? '').trim().toUpperCase();
  if (s === 'CCA') return 'CCA';
  if (s === 'DA') return 'DA';
  return 'NONE';
}

function toRateSourceKindExpectation(raw: unknown): RateSourceKindExpectation {
  const s = String(raw ?? '').trim();
  if (s === 'CCA_GEN_V0_ALL_IN_WITH_EXIT_FEES') return 'CCA_GEN_V0_ALL_IN_WITH_EXIT_FEES';
  if (s === 'CCA_GEN_V0_ALL_IN') return 'CCA_GEN_V0_ALL_IN';
  if (s === 'CCA_GEN_V0_ENERGY_ONLY') return 'CCA_GEN_V0_ENERGY_ONLY';
  if (s === 'CCA_DELIVERY_FALLBACK') return 'CCA_DELIVERY_FALLBACK';
  if (s === 'DA_DELIVERY_FALLBACK') return 'DA_DELIVERY_FALLBACK';
  return 'DELIVERY';
}

function loadJson(fp: string): any {
  return JSON.parse(readFileSync(fp, 'utf-8'));
}

function loadText(fp: string): string {
  return readFileSync(fp, 'utf-8');
}

function resolveIntervalFixturePath(ref: string): string {
  const r = String(ref || '').trim();
  if (!r) return '';
  if (r.startsWith('tests/')) return path.join(process.cwd(), r);
  return path.join(process.cwd(), 'tests', 'fixtures', r);
}

function pickLatestBillSimCycle(sim: any): any | null {
  try {
    const m0 = Array.isArray(sim?.meters) ? sim.meters[0] : null;
    const cycles = Array.isArray(m0?.cycles) ? m0.cycles : [];
    if (!cycles.length) return null;
    const sorted = cycles
      .slice()
      .sort((a: any, b: any) => String(a?.cycleLabel || '').localeCompare(String(b?.cycleLabel || '')));
    return sorted[sorted.length - 1] || null;
  } catch {
    return null;
  }
}

function batteryAuditReconcileFromLineItems(lineItems: any[]): { auditSavings: GoldenBillRunnerResultV1['batteryEconomics'] extends infer X ? any : any; ok: boolean; deltaAbs: number | null; kind: RateSourceKindExpectation; annualSavingsUsd: number | null } {
  const byId = new Map<string, any>();
  for (const li of Array.isArray(lineItems) ? lineItems : []) {
    const id = String(li?.id || '').trim();
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, li);
  }

  const componentIds = ['savings.demandAnnual', 'savings.energyAnnual', 'savings.ratchetAvoidedAnnual', 'savings.drAnnual', 'savings.otherAnnual'];
  const totalId = 'savings.totalAnnual';
  const total = byId.get(totalId) || null;

  const toRounded = (x: any): number | null => {
    const n = Number(x);
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100) / 100;
  };

  const lineItemsOut = componentIds.map((id) => ({ id, amountRounded: toRounded(byId.get(id)?.amountUsd) }));
  const totalRounded = toRounded(total?.amountUsd);

  const sumRounded = (() => {
    let sum = 0;
    let any = false;
    for (const li of lineItemsOut) {
      if (li.amountRounded === null) return null;
      any = true;
      sum += li.amountRounded;
    }
    return any ? Math.round(sum * 100) / 100 : null;
  })();

  const deltaAbs = sumRounded === null || totalRounded === null ? null : Math.round(Math.abs(sumRounded - totalRounded) * 100) / 100;
  const ok = deltaAbs !== null && deltaAbs <= 0.01;

  const kind = toRateSourceKindExpectation(byId.get('savings.energyAnnual')?.rateSource?.kind);
  const annualSavingsUsd = (() => {
    const n = Number(total?.amountUsd);
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100) / 100;
  })();

  return {
    auditSavings: { totalRounded, lineItems: lineItemsOut },
    ok,
    deltaAbs,
    kind,
    annualSavingsUsd,
  };
}

function summarizeDeterminantsPackSummary(raw: any): any | null {
  try {
    if (!raw || typeof raw !== 'object') return null;
    const meters = Array.isArray(raw?.meters) ? raw.meters : [];
    const m0 = meters[0] || null;
    const cycles = Array.isArray(m0?.last12Cycles) ? m0.last12Cycles : [];
    return {
      rulesVersionTag: String(raw?.rulesVersionTag || ''),
      determinantsVersionTag: String(raw?.determinantsVersionTag || ''),
      touLabelerVersionTag: String(raw?.touLabelerVersionTag || ''),
      meters: m0
        ? [
            {
              meterId: String(m0?.meterId || ''),
              last12Cycles: cycles.slice(0, 4).map((c: any) => ({
                cycleLabel: String(c?.cycleLabel || ''),
                kwhTotal: Number.isFinite(Number(c?.kwhTotal)) ? Number(c.kwhTotal) : null,
                kWMax: Number.isFinite(Number(c?.kWMax)) ? Number(c.kWMax) : null,
                billingDemandKw: Number.isFinite(Number(c?.billingDemandKw)) ? Number(c.billingDemandKw) : null,
                ratchetDemandKw: Number.isFinite(Number(c?.ratchetDemandKw)) ? Number(c.ratchetDemandKw) : null,
                ratchetHistoryMaxKw: Number.isFinite(Number(c?.ratchetHistoryMaxKw)) ? Number(c.ratchetHistoryMaxKw) : null,
                ratchetFloorPct: Number.isFinite(Number(c?.ratchetFloorPct)) ? Number(c.ratchetFloorPct) : null,
                billingDemandMethod: c?.billingDemandMethod ?? null,
                coveragePct: Number.isFinite(Number(c?.coveragePct)) ? Number(c.coveragePct) : null,
                intervalMinutes: Number.isFinite(Number(c?.intervalMinutes)) ? Number(c.intervalMinutes) : null,
              })),
              reconciliation: m0?.reconciliation ?? null,
            },
          ]
        : [],
      warnings: Array.isArray(raw?.warnings) ? raw.warnings.slice().sort((a: any, b: any) => String(a).localeCompare(String(b))) : [],
    };
  } catch {
    return null;
  }
}

function extractEngineVersionsLine(html: string): string | null {
  const m = /Engine Versions:[^\n<]*/.exec(String(html || ''));
  return m ? String(m[0]).trim() : null;
}

async function seedTariffSnapshotsForCase(args: { baseDir: string; caseId: string; utilityId: string }): Promise<{ tariffSnapshotIdByUtility: Record<string, string> }> {
  const baseDir = String(args.baseDir || '').trim();
  const caseId = String(args.caseId || '').trim();
  const utilityId = String(args.utilityId || '').trim().toUpperCase();

  const capturedAt = '2026-03-01T00:00:00.000Z';
  const versionTag = '2026-03-01T0000Z';
  const isAmbiguousTariffCase = caseId.includes('ambiguous_tariff');

  const mkRates = (utility: string): any[] => {
    if (utility === 'PGE') {
      const base = [
        { utility: 'PGE', rateCode: 'E-19', sourceUrl: 'https://example.com/pge/e-19', sourceTitle: 'Schedule E-19', lastVerifiedAt: capturedAt },
        { utility: 'PGE', rateCode: 'B-19', sourceUrl: 'https://example.com/pge/b-19', sourceTitle: 'Schedule B-19', lastVerifiedAt: capturedAt },
      ];
      if (isAmbiguousTariffCase) {
        base.push({ utility: 'PGE', rateCode: 'E_19', sourceUrl: 'https://example.com/pge/e_19', sourceTitle: 'Schedule E_19', lastVerifiedAt: capturedAt });
      }
      return base;
    }
    if (utility === 'SCE') {
      return [{ utility: 'SCE', rateCode: 'TOU-GS-3', sourceUrl: 'https://example.com/sce/tou-gs-3', sourceTitle: 'Schedule TOU-GS-3', lastVerifiedAt: capturedAt }];
    }
    if (utility === 'SDGE') {
      return [{ utility: 'SDGE', rateCode: 'AL-TOU', sourceUrl: 'https://example.com/sdge/al-tou', sourceTitle: 'Schedule AL-TOU', lastVerifiedAt: capturedAt }];
    }
    return [];
  };

  const prev = process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
  process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = baseDir;
  try {
    // Ensure storage module reads the env var deterministically.
    vi.resetModules();
    const storage = await import('../../src/modules/tariffLibrary/storage');

    const utilitiesToSeed = uniqSortedStrings([utilityId, 'PGE', 'SCE', 'SDGE']).filter((u) => u === 'PGE' || u === 'SCE' || u === 'SDGE');
    for (const u of utilitiesToSeed) {
      await storage.saveSnapshot({
        utility: u,
        capturedAt,
        versionTag,
        rates: mkRates(u),
        sourceFingerprints: [{ url: `https://example.com/${u.toLowerCase()}-index`, contentHash: 'hash1' }],
      } as any);
    }

    return { tariffSnapshotIdByUtility: { PGE: versionTag, SCE: versionTag, SDGE: versionTag } };
  } finally {
    if (typeof prev === 'string') process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = prev;
    else delete process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
  }
}

export async function runGoldenBillCaseV1(args: { caseDir: string; tariffLibraryBaseDir?: string | null }): Promise<GoldenBillRunnerResultV1> {
  const caseDir = String(args.caseDir || '').trim();
  const caseId = path.basename(caseDir);

  const billText = loadText(path.join(caseDir, 'billText.txt'));
  const context = loadJson(path.join(caseDir, 'context.json')) as GoldenBillContextV1;

  const nowIso = '2026-03-01T00:00:00.000Z';
  const generatedAtIso = nowIso;

  const hints = extractBillPdfTariffHintsV1(billText);
  const utilityHintRaw = hints?.utilityHint ? String(hints.utilityHint) : null;
  const utilityIdFromHint = canonicalUtilityIdFromHint(utilityHintRaw);
  const rateScheduleText = hints?.rateScheduleText ? String(hints.rateScheduleText) : null;
  const hintWarnings = uniqSortedStrings((hints as any)?.warnings?.map((w: any) => w?.code) || []);

  const utilityId = String(context?.utility || '').trim().toUpperCase() || utilityIdFromHint;

  const baseDir =
    args.tariffLibraryBaseDir && String(args.tariffLibraryBaseDir).trim()
      ? String(args.tariffLibraryBaseDir).trim()
      : mkdtempSync(path.join(os.tmpdir(), 'everwatt-golden-bills-tariffs-'));

  const seeded = await seedTariffSnapshotsForCase({ baseDir, caseId, utilityId });

  const prevTariffs = process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
  process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = baseDir;
  try {
    vi.resetModules();
    const storage = await import('../../src/modules/tariffLibrary/storage');
    const snap = (utilityId === 'PGE' || utilityId === 'SCE' || utilityId === 'SDGE') ? await storage.loadLatestSnapshot(utilityId as any) : null;
    const snapLite = snap
      ? {
          versionTag: String((snap as any).versionTag || ''),
          capturedAt: String((snap as any).capturedAt || ''),
          rates: ((snap as any).rates || []).map((r: any) => ({ rateCode: String(r?.rateCode || ''), sourceUrl: String(r?.sourceUrl || ''), sourceTitle: r?.sourceTitle ? String(r.sourceTitle) : undefined })),
        }
      : null;

    const tariffMatch = matchBillTariffToLibraryV1({
      utilityId: utilityId === 'PGE' || utilityId === 'SCE' || utilityId === 'SDGE' ? utilityId : null,
      commodity: 'electric',
      rateScheduleText,
      snapshot: snapLite as any,
    });

    const supply = detectSupplyStructureV1({
      billPdfText: billText,
      billHints: { utilityHint: hints?.utilityHint ?? null, rateScheduleText: hints?.rateScheduleText ?? null } as any,
    });

    const billPeriodStartYmd = safeYmd(context?.billPeriodStartYmd) ?? null;
    const billingSummaryMonthly =
      billPeriodStartYmd && context?.supplyType === 'electric'
        ? [
            {
              start: billPeriodStartYmd,
              end: addDaysYmd(billPeriodStartYmd, 30),
              kWh: 1000,
              kW: 100,
              dollars: 1000,
            },
          ]
        : [];

    const intervalPointsV1 = (() => {
      const ref = String(context?.intervalFixtureRef || '').trim();
      if (!ref) return null;
      const fp = resolveIntervalFixturePath(ref);
      const raw = loadJson(fp);
      return Array.isArray(raw) ? raw : null;
    })();

    const tariffPriceSignalsV1 = context?.supplyType === 'electric'
      ? {
          timezone: 'America/Los_Angeles',
          touEnergyPrices: [
            { periodId: 'OFF', startHourLocal: 0, endHourLocalExclusive: 16, days: 'all' as const, pricePerKwh: 0.12 },
            { periodId: 'ON', startHourLocal: 16, endHourLocalExclusive: 21, days: 'all' as const, pricePerKwh: 0.32 },
            { periodId: 'OFF2', startHourLocal: 21, endHourLocalExclusive: 24, days: 'all' as const, pricePerKwh: 0.14 },
          ],
          demandChargePerKw: 20,
        }
      : null;

    const currentRate =
      context?.currentRateOverride && context.currentRateOverride.utility && context.currentRateOverride.rateCode
        ? { utility: String(context.currentRateOverride.utility), rateCode: String(context.currentRateOverride.rateCode) }
        : rateScheduleText
          ? { utility: utilityId, rateCode: rateScheduleText }
          : null;

    const analysis = await analyzeUtility(
      {
        orgId: 'o_golden',
        projectId: String(context?.projectId || caseId),
        serviceType: String(context?.supplyType || 'electric'),
        utilityTerritory: utilityId,
        ...(currentRate ? { currentRate } : {}),
        billPdfText: billText,
        ...(billingSummaryMonthly.length ? { billingSummary: { monthly: billingSummaryMonthly } } : {}),
      } as any,
      {
        ...(intervalPointsV1 ? { intervalPointsV1: intervalPointsV1 as any } : {}),
        nowIso,
        idFactory: () => 'id_fixed',
        ...(tariffPriceSignalsV1 ? { tariffPriceSignalsV1: tariffPriceSignalsV1 as any } : {}),
        tariffSnapshotId: seeded.tariffSnapshotIdByUtility[utilityId] ?? null,
      } as any,
    );

    const reportJson = buildInternalEngineeringReportJsonV1({
      projectId: String(context?.projectId || caseId),
      generatedAtIso,
      analysisResults: {
        project: { id: String(context?.projectId || caseId) },
        workflow: { utility: { insights: analysis.insights, inputs: { ...(currentRate ? { currentRate } : {}) } } },
        summary: { markdown: '', json: {} },
      },
      telemetry: {
        intervalElectricPointsV1: intervalPointsV1 as any,
        intervalElectricMetaV1: intervalPointsV1 ? { parserVersion: 'fixture', timezoneUsed: 'America/Los_Angeles', warnings: [], missingInfo: [] } : null,
      },
    });

    const auditDrawerV1 = (reportJson as any)?.auditDrawerV1 ?? null;

    const html = renderInternalEngineeringReportHtmlV1({
      project: { id: String(context?.projectId || caseId), name: `Golden ${caseId}` },
      revision: { id: `rev_${caseId}`, createdAt: generatedAtIso, title: `Golden ${caseId}`, reportJson, reportHash: 'h' },
    });

    const insightsMissing = Array.isArray((analysis.insights as any)?.missingInfo) ? ((analysis.insights as any).missingInfo as any[]) : [];
    const missingInfoIdsAll = uniqSortedStrings([
      ...insightsMissing.map((it: any) => it?.id),
      ...hintWarnings.map((c) => `billPdfTariffHints.${c}`),
      ...(Array.isArray((tariffMatch as any)?.warnings) ? (tariffMatch as any).warnings.map((w: any) => `billTariffLibraryMatch.${w}`) : []),
      ...(Array.isArray((supply as any)?.warnings) ? (supply as any).warnings.map((w: any) => `supplyStructure.${w}`) : []),
    ]);
    const keep = (id: string): boolean =>
      id.startsWith('interval.') ||
      id.startsWith('tariff.') ||
      id.startsWith('determinants.') ||
      id.startsWith('supply.') ||
      id.startsWith('billing.') ||
      id.startsWith('billPdfTariffHints.') ||
      id.startsWith('billTariffLibraryMatch.') ||
      id.startsWith('supplyStructure.');
    const missingInfoIds = missingInfoIdsAll.filter(keep);

    const erc = (analysis.insights as any)?.effectiveRateContextV1 ?? null;
    const ercTrim = erc
      ? {
          iou: {
            utility: String(erc?.iou?.utility || ''),
            rateCode: erc?.iou?.rateCode ? String(erc.iou.rateCode) : null,
            snapshotId: erc?.iou?.snapshotId ? String(erc.iou.snapshotId) : null,
          },
          generation: {
            providerType: toSupplyProviderTypeExpectation(erc?.generation?.providerType),
            lseName: erc?.generation?.lseName ? String(erc.generation.lseName) : null,
            rateCode: erc?.generation?.rateCode ? String(erc.generation.rateCode) : null,
            snapshotId: erc?.generation?.snapshotId ? String(erc.generation.snapshotId) : null,
            generationTouEnergyPricesCount: Array.isArray(erc?.generation?.generationTouEnergyPrices) ? erc.generation.generationTouEnergyPrices.length : 0,
            generationAllInTouEnergyPricesCount: Array.isArray(erc?.generation?.generationAllInTouEnergyPrices) ? erc.generation.generationAllInTouEnergyPrices.length : 0,
            generationAddersPerKwhTotal: Number.isFinite(Number(erc?.generation?.generationAddersPerKwhTotal)) ? Number(erc.generation.generationAddersPerKwhTotal) : null,
            generationAddersSnapshotId: erc?.generation?.generationAddersSnapshotId ? String(erc.generation.generationAddersSnapshotId) : null,
          },
          warnings: uniqSortedStrings(erc?.warnings || []),
          missingInfoIds: uniqSortedStrings((erc?.missingInfo || []).map((it: any) => it?.id)),
        }
      : null;

    const detSummary = summarizeDeterminantsPackSummary((analysis.insights as any)?.determinantsPackSummary ?? null);

    const billSim = (analysis.insights as any)?.billSimV2 ?? null;
    const billSimLatest = pickLatestBillSimCycle(billSim);
    const billSimV2Summary = billSim
      ? {
          utility: String(billSim?.utility || ''),
          rateCode: String(billSim?.rateCode || ''),
          latestCycle: billSimLatest
            ? {
                cycleLabel: String(billSimLatest?.cycleLabel || ''),
                totals: {
                  energyDollars: Number.isFinite(Number(billSimLatest?.totals?.energyDollars)) ? Number(billSimLatest.totals.energyDollars) : null,
                  totalDollars: Number.isFinite(Number(billSimLatest?.totals?.totalDollars)) ? Number(billSimLatest.totals.totalDollars) : null,
                  isPartial: Boolean(billSimLatest?.totals?.isPartial),
                },
                lineItemCount: Array.isArray(billSimLatest?.lineItems) ? billSimLatest.lineItems.length : 0,
              }
            : null,
          missingInfoIds: uniqSortedStrings([...(billSim?.missingInfo || []).map((it: any) => it?.id), ...(billSimLatest?.missingInfo || []).map((it: any) => it?.id)]),
        }
      : null;

    const decision12 = (analysis.insights as any)?.batteryDecisionPackV1_2 ?? null;
    const top12: any[] = decision12 && Array.isArray(decision12.topCandidates) ? (decision12.topCandidates as any[]) : [];
    const selId12 = String(decision12?.selected?.candidateId || '').trim() || null;
    const selected12 = selId12 ? top12.find((c) => String(c?.id || '').trim() === selId12) || null : (top12[0] || null);

    const auditLineItems12 = decision12 && decision12.audit && Array.isArray(decision12.audit.lineItems) ? (decision12.audit.lineItems as any[]) : [];
    const batteryAudit12 = auditLineItems12.length ? batteryAuditReconcileFromLineItems(auditLineItems12) : null;
    const batteryEconomics =
      selected12 && batteryAudit12
        ? {
            rateSourceKind: toRateSourceKindExpectation(selected12?.economicsSummary?.rateSourceKind),
            annualSavingsUsd: batteryAudit12.annualSavingsUsd,
            auditSavings: batteryAudit12.auditSavings,
          }
        : null;

    const auditReconcile = batteryAudit12 ? { ok: batteryAudit12.ok, deltaAbs: batteryAudit12.deltaAbs } : { ok: false, deltaAbs: null };

    const billingDemandKw = (() => {
      const c0 = detSummary?.meters?.[0]?.last12Cycles?.[0] || null;
      const n = Number(c0?.billingDemandKw);
      if (!Number.isFinite(n)) return null;
      return n;
    })();

    const topLineNumbers = {
      totalEnergyCharge: billSimV2Summary?.latestCycle?.totals?.energyDollars ?? null,
      billingDemandKw,
      totalEstimatedMonthlyBill: billSimV2Summary?.latestCycle?.totals?.totalDollars ?? null,
      batteryAnnualSavingsUsd: batteryEconomics?.annualSavingsUsd ?? null,
    };

    return {
      utilityDetection: {
        utilityHintRaw,
        utilityId: utilityIdFromHint,
        rateScheduleText,
        warnings: hintWarnings,
        billTariffLibraryMatch: {
          resolvedRateCode: tariffMatch?.resolved?.rateCode ? String(tariffMatch.resolved.rateCode) : null,
          candidatesRateCodes: uniqSortedStrings((tariffMatch?.candidates || []).map((c: any) => c?.rateCode)),
          warnings: uniqSortedStrings(tariffMatch?.warnings || []),
        },
      },
      effectiveRateContextV1: ercTrim,
      insights: { missingInfoIds },
      determinantsPackSummary: detSummary,
      billSimV2Summary,
      batteryEconomics,
      auditReconcile,
      topLineNumbers,
      report: { engineVersionsLine: extractEngineVersionsLine(html), html, auditDrawerV1 },
    };
  } finally {
    if (typeof prevTariffs === 'string') process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = prevTariffs;
    else delete process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
  }
}

