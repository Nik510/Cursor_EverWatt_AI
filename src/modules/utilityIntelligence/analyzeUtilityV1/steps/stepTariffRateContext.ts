import { isSnapshotStale } from '../../../tariffLibrary';
import { loadLatestSnapshot } from '../../../tariffLibrary/storage';
import { loadLatestGasSnapshot } from '../../../tariffLibraryGas/storage';
import { BillTariffLibraryMatchWarningCodesV1, matchBillTariffToLibraryV1 } from '../../../tariffLibrary/matching/matchBillTariffToLibraryV1';
import { applyTariffBusinessCanonV1 } from '../../../tariffLibrary/businessCanonV1';
import { applyTariffEffectiveStatusV1 } from '../../../tariffLibrary/effectiveStatusV1';
import { applyTariffReadinessVNext } from '../../../tariffLibrary/readinessVNext';
import { applyTariffSegmentV1 } from '../../../tariffLibrary/segmentV1';

import { SupplyStructureAnalyzerReasonCodesV1 } from '../../../supplyStructureAnalyzerV1/reasons';

import { buildGenerationTouEnergySignalsV0, getCcaGenerationSnapshotV0 } from '../../../ccaTariffLibraryV0/getCcaGenerationSnapshotV0';
import { matchCcaFromSsaV0 } from '../../../ccaTariffLibraryV0/matchCcaFromSsaV0';
import { CcaTariffLibraryReasonCodesV0 } from '../../../ccaTariffLibraryV0/reasons';
import { getCcaAddersSnapshotV0 } from '../../../ccaAddersLibraryV0/getCcaAddersSnapshotV0';
import { CcaAddersLibraryReasonCodesV0 } from '../../../ccaAddersLibraryV0/reasons';
import { computeAddersPerKwhTotal } from '../../../ccaAddersLibraryV0/computeAddersPerKwhTotal';
import { getExitFeesSnapshotV0 } from '../../../exitFeesLibraryV0/getExitFeesSnapshotV0';

import type { TariffPriceSignalsV1 } from '../../../batteryEngineV1/types';

import { asCaIouUtility, exceptionName, mapBillUtilityHintToLibraryUtility, normRateCode } from '../internals';
import type { AnalyzeUtilityV1Delta, AnalyzeUtilityV1State, NormalizedInputsV1, StepContextV1 } from '../types';

export async function stepTariffRateContext(args: {
  state: AnalyzeUtilityV1State;
  normalizedInputs: NormalizedInputsV1;
  ctx: StepContextV1;
}): Promise<AnalyzeUtilityV1Delta> {
  const { inputs, deps, nowIso, warn, beginStep, endStep } = args.ctx as any;
  const billPdfTariffTruth = (args.state as any).billPdfTariffTruth;
  const ssaV1 = (args.state as any).ssaV1;

  beginStep('tariffMatchAndRateContext');
  const billTariffCommodity: 'electric' | 'gas' =
    String(inputs.serviceType || '').toLowerCase() === 'gas' ? 'gas' : 'electric';

  const billTariffUtilityKey =
    mapBillUtilityHintToLibraryUtility({ utilityHint: (billPdfTariffTruth as any)?.utilityHint, commodity: billTariffCommodity }) ||
    asCaIouUtility(inputs.utilityTerritory) ||
    null;

  const billTariffSnapshot =
    billTariffUtilityKey && billTariffCommodity === 'electric'
      ? await loadLatestSnapshot(billTariffUtilityKey as any).catch((e) => {
          warn({
            code: 'UIE_TARIFF_SNAPSHOT_LOAD_FAILED',
            module: 'utilityIntelligence/analyzeUtility',
            operation: 'loadLatestSnapshot',
            exceptionName: exceptionName(e),
            contextKey: 'tariffLibrarySnapshot',
          });
          return null;
        })
      : billTariffUtilityKey && billTariffCommodity === 'gas'
        ? await loadLatestGasSnapshot(billTariffUtilityKey as any).catch((e) => {
            warn({
              code: 'UIE_GAS_TARIFF_SNAPSHOT_LOAD_FAILED',
              module: 'utilityIntelligence/analyzeUtility',
              operation: 'loadLatestGasSnapshot',
              exceptionName: exceptionName(e),
              contextKey: 'tariffLibrarySnapshot',
            });
            return null;
          })
        : null;

  const billPdfTariffLibraryMatchRaw = matchBillTariffToLibraryV1({
    utilityId: billTariffUtilityKey,
    commodity: billTariffCommodity,
    rateScheduleText: (billPdfTariffTruth as any)?.rateScheduleText || null,
    snapshot: billTariffSnapshot
      ? {
          versionTag: String((billTariffSnapshot as any).versionTag),
          capturedAt: String((billTariffSnapshot as any).capturedAt),
          rates: Array.isArray((billTariffSnapshot as any).rates) ? (billTariffSnapshot as any).rates : [],
        }
      : null,
  });

  const billPdfTariffLibraryMatch =
    billPdfTariffTruth && (billPdfTariffTruth as any)?.rateScheduleText
      ? {
          commodity: billTariffCommodity,
          utilityId: billTariffUtilityKey || undefined,
          snapshotVersionTag: billPdfTariffLibraryMatchRaw.snapshotId,
          snapshotCapturedAt: billPdfTariffLibraryMatchRaw.snapshotCapturedAt,
          ...(billPdfTariffLibraryMatchRaw.resolved
            ? { resolved: { rateCode: billPdfTariffLibraryMatchRaw.resolved.rateCode, matchType: billPdfTariffLibraryMatchRaw.resolved.matchType, sourceUrl: billPdfTariffLibraryMatchRaw.resolved.sourceUrl, sourceTitle: billPdfTariffLibraryMatchRaw.resolved.sourceTitle } }
            : {}),
          ...(Array.isArray(billPdfTariffLibraryMatchRaw.candidates) && billPdfTariffLibraryMatchRaw.candidates.length
            ? {
                candidates: billPdfTariffLibraryMatchRaw.candidates.map((c) => ({
                  rateCode: c.rateCode,
                  score: c.score,
                  reason: c.reason,
                  sourceUrl: c.sourceUrl,
                  sourceTitle: c.sourceTitle,
                })),
              }
            : {}),
          ...(Array.isArray(billPdfTariffLibraryMatchRaw.warnings) && billPdfTariffLibraryMatchRaw.warnings.length ? { warnings: billPdfTariffLibraryMatchRaw.warnings } : {}),
        }
      : null;

  // CA Tariff Library v0 (metadata only)
  const tariffLibrary = await (async () => {
    try {
      const rateCode = String(inputs.currentRate?.rateCode || '').trim();
      if (!rateCode) return undefined;
      const u = asCaIouUtility(inputs.currentRate?.utility ?? inputs.utilityTerritory);
      if (!u) return undefined;

      const snap = await loadLatestSnapshot(u);
      if (!snap) return undefined;

      const want = normRateCode(rateCode);
      const raw = (snap.rates || []).find((r) => normRateCode(r.rateCode) === want) || null;
      const md = raw ? applyTariffEffectiveStatusV1(applyTariffBusinessCanonV1(applyTariffReadinessVNext(applyTariffSegmentV1(raw as any)))) : null;
      const isStale = isSnapshotStale(snap.capturedAt, nowIso, 14);
      const changeSummary = snap.diffFromPrevious
        ? { addedRateCodes: snap.diffFromPrevious.addedRateCodes, removedRateCodes: snap.diffFromPrevious.removedRateCodes }
        : undefined;

      return {
        snapshotVersionTag: snap.versionTag,
        snapshotCapturedAt: snap.capturedAt,
        lastUpdatedAt: snap.capturedAt,
        isStale,
        ...(changeSummary ? { changeSummary } : {}),
        rateMetadata: md,
      };
    } catch (e) {
      warn({
        code: 'UIE_TARIFF_LIBRARY_METADATA_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'tariffLibraryMetadata',
        exceptionName: exceptionName(e),
        contextKey: 'tariffLibrary',
      });
      return undefined;
    }
  })();

  const effectiveRateContextV1 = (() => {
    try {
      const iouUtility = String(inputs.currentRate?.utility || inputs.utilityTerritory || '').trim() || 'unknown';
      const rateCode = String(inputs.currentRate?.rateCode || '').trim() || null;
      const snapshotId = String((tariffLibrary as any)?.snapshotVersionTag || '').trim() || null;
      const providerType = ssaV1?.providerType === 'CCA' ? ('CCA' as const) : ssaV1?.providerType === 'DA' ? ('DA' as const) : null;
      const lseName = ssaV1?.providerType === 'CCA' ? (ssaV1?.lseName ?? null) : null;
      const daProviderName = ssaV1?.providerType === 'DA' ? (ssaV1?.daProviderName ?? null) : null;
      const ssaConfidence = Number.isFinite(Number(ssaV1?.confidence)) ? Number(ssaV1?.confidence) : null;
      const ssaEvidence = (ssaV1 as any)?.evidence && typeof (ssaV1 as any).evidence === 'object' ? ((ssaV1 as any).evidence as any) : null;

      const extraMissing: any[] = [];
      const extraWarnings: string[] = [];

      const dedupMissingInfoById = (items: any[]): any[] => {
        const out: any[] = [];
        const seen = new Set<string>();
        for (const it of items || []) {
          const id = String(it?.id || '').trim();
          if (!id) continue;
          const k = id.toLowerCase();
          if (seen.has(k)) continue;
          seen.add(k);
          out.push(it);
        }
        return out;
      };

      const billPeriodStartYmd = (() => {
        try {
          const bills: any[] = Array.isArray(inputs.billingRecords) ? (inputs.billingRecords as any[]) : [];
          if (bills.length) {
            const sorted = bills
              .map((b) => ({ b, t: b?.billEndDate ? new Date(b.billEndDate as any).getTime() : 0 }))
              .sort((a, b) => a.t - b.t);
            const latest: any = sorted[sorted.length - 1]?.b || null;
            const start = latest?.billStartDate ? new Date(latest.billStartDate as any) : null;
            const iso = start && Number.isFinite(start.getTime()) ? start.toISOString() : '';
            return iso ? iso.slice(0, 10) : null;
          }
          const m = Array.isArray(inputs.billingSummary?.monthly) ? (inputs.billingSummary!.monthly as any[]) : [];
          if (m.length) {
            const sorted = m
              .map((r) => ({
                start: String((r as any)?.start || '').trim(),
                end: String((r as any)?.end || '').trim(),
              }))
              .filter((r) => r.start)
              .sort((a, b) => a.end.localeCompare(b.end) || a.start.localeCompare(b.start));
            const latest = sorted[sorted.length - 1];
            const s = String(latest?.start || '').trim();
            return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
          }
          return null;
        } catch (e) {
          warn({
            code: 'UIE_BILL_PERIOD_DERIVE_FAILED',
            module: 'utilityIntelligence/analyzeUtility',
            operation: 'deriveBillPeriodStartYmd',
            exceptionName: exceptionName(e),
            contextKey: 'billPeriod',
          });
          return null;
        }
      })();

      const iouForGen = (() => {
        const u = (ssaV1 as any)?.iouUtility;
        return asCaIouUtility(u) || asCaIouUtility(inputs.currentRate?.utility ?? inputs.utilityTerritory);
      })();

      const gen = (() => {
        if (providerType !== 'CCA' || !lseName) return null;
        const m = matchCcaFromSsaV0({ lseName });
        if (!m.ok) return null;
        if (!iouForGen) return null;
        const snap = getCcaGenerationSnapshotV0({ iouUtility: iouForGen, ccaId: m.ccaId, billPeriodStartYmd: billPeriodStartYmd ?? null });
        if (!snap.ok || !snap.snapshot) return null;
        const sig = buildGenerationTouEnergySignalsV0({ snapshot: snap.snapshot, upstreamWarnings: snap.warnings });

        const pciaVintageKey = String((deps as any)?.pciaVintageKey || '').trim() || null;

        const addersLookup = getCcaAddersSnapshotV0({
          iouUtility: iouForGen,
          ccaId: m.ccaId,
          billPeriodStartYmd: billPeriodStartYmd ?? null,
        });
        const addersSnap = addersLookup.ok ? addersLookup.snapshot : null;

        const exitFeesLookup = getExitFeesSnapshotV0({
          iou: iouForGen,
          effectiveYmd: billPeriodStartYmd ?? null,
          providerType,
          pciaVintageKey,
        });
        const exitFeesSnap = exitFeesLookup.ok ? exitFeesLookup.snapshot : null;
        const nbcPerKwhTotal = exitFeesLookup.selectedCharges.nbcPerKwhTotal;
        const pciaPerKwhApplied = exitFeesLookup.selectedCharges.pciaPerKwhApplied;
        const otherExitFeesPerKwhTotal = exitFeesLookup.selectedCharges.otherExitFeesPerKwhTotal;
        const exitFeesPerKwhTotal = exitFeesLookup.selectedCharges.exitFeesPerKwhTotal;

        const addersUsed = (() => {
          if (!addersSnap) return { addersPerKwhTotal: null as number | null, warnings: [] as string[] };
          const charges: any = (addersSnap as any)?.charges || null;
          const computed = computeAddersPerKwhTotal({ snapshot: { charges }, pciaVintageKey });
          const hasExitFees = Boolean(exitFeesSnap && String((exitFeesSnap as any)?.snapshotId || '').trim());

          // If exit fees exist, treat exitFees as authoritative for NBC/PCIA; only apply non-overlapping CCA adders.
          if (hasExitFees) {
            const other = Number((charges as any)?.otherPerKwhTotal);
            const otherOk = Number.isFinite(other) ? other : 0;
            const indiff = Number((charges as any)?.indifferenceAdjustmentPerKwh);
            const indiffOk = Number.isFinite(indiff) ? indiff : 0;
            const isCompleteBundle = (addersSnap as any)?.isCompleteBundle === true;

            // v0.1 rule: default to "other only"; if explicitly flagged complete bundle, include indifference adjustment too.
            const addersNonExitFees = Math.round((otherOk + (isCompleteBundle ? indiffOk : 0)) * 1e9) / 1e9;

            const overlapDetected = Boolean(
              Number.isFinite(Number((charges as any)?.nbcPerKwhTotal)) ||
                Number.isFinite(Number((charges as any)?.pciaPerKwhDefault)) ||
                ((charges as any)?.pciaPerKwhByVintageKey && typeof (charges as any).pciaPerKwhByVintageKey === 'object' && Object.keys((charges as any).pciaPerKwhByVintageKey).length) ||
                (Array.isArray((addersSnap as any)?.addersBreakdown) &&
                  (addersSnap as any).addersBreakdown.some((it: any) => String(it?.id || '').toLowerCase().includes('pcia') || String(it?.id || '').toLowerCase().includes('nbc'))),
            );

            const warnings = [
              ...(computed.warnings || []),
              ...(overlapDetected ? (['generation.v1.adders_overlap_deduped'] as string[]) : []),
            ];

            return { addersPerKwhTotal: addersNonExitFees, warnings };
          }

          return { addersPerKwhTotal: computed.addersPerKwhTotal, warnings: computed.warnings || [] };
        })();

        const generationAllInTouEnergyPrices =
          addersUsed.addersPerKwhTotal !== null
            ? (sig.generationTouEnergyPrices || []).map((w) => ({
                periodId: String((w as any)?.periodId || '').trim(),
                startHourLocal: Number((w as any)?.startHourLocal),
                endHourLocalExclusive: Number((w as any)?.endHourLocalExclusive),
                days: (w as any)?.days === 'weekday' || (w as any)?.days === 'weekend' ? (w as any).days : 'all',
                pricePerKwh: Math.round((Number((w as any)?.pricePerKwh) + Number(addersUsed.addersPerKwhTotal || 0)) * 1e9) / 1e9,
              }))
            : null;

        const generationAllInWithExitFeesTouPrices =
          exitFeesPerKwhTotal !== null && generationAllInTouEnergyPrices && generationAllInTouEnergyPrices.length
            ? generationAllInTouEnergyPrices.map((w) => ({
                periodId: String((w as any)?.periodId || '').trim(),
                startHourLocal: Number((w as any)?.startHourLocal),
                endHourLocalExclusive: Number((w as any)?.endHourLocalExclusive),
                days: (w as any)?.days === 'weekday' || (w as any)?.days === 'weekend' ? (w as any).days : 'all',
                pricePerKwh: Math.round((Number((w as any)?.pricePerKwh) + exitFeesPerKwhTotal) * 1e9) / 1e9,
              }))
            : null;

        const warnings = (() => {
          const base = [
            ...(sig.warnings || []),
            ...(addersLookup.warnings || []),
            ...(addersUsed.warnings || []),
            ...(exitFeesLookup.warnings || []),
          ];
          if (addersUsed.addersPerKwhTotal !== null && generationAllInTouEnergyPrices && generationAllInTouEnergyPrices.length) return base;
          return [CcaTariffLibraryReasonCodesV0.CCA_V0_ENERGY_ONLY_NO_EXIT_FEES, ...base, CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_MISSING];
        })();

        return {
          generation: {
            providerType,
            lseName,
            daProviderName: null,
            confidence: ssaConfidence,
            evidence: ssaEvidence,
            rateCode: sig.generationRateCode,
            snapshotId: sig.generationSnapshotId,
            generationTouEnergyPrices: sig.generationTouEnergyPrices,
            generationEnergyTouPrices: sig.generationTouEnergyPrices,
            generationAddersPerKwhTotal: addersUsed.addersPerKwhTotal,
            generationAddersSnapshotId: addersSnap ? String((addersSnap as any)?.snapshotId || '').trim() || null : null,
            generationAddersAcquisitionMethodUsed: addersSnap ? (String((addersSnap as any)?.acquisitionMethodUsed || '').trim() === 'MANUAL_SEED_V0' ? 'MANUAL_SEED_V0' : null) : null,
            generationAllInTouEnergyPrices: generationAllInTouEnergyPrices,
            exitFeesSnapshotId: exitFeesSnap ? String((exitFeesSnap as any)?.snapshotId || '').trim() || null : null,
            nbcPerKwhTotal,
            pciaPerKwhApplied,
            otherExitFeesPerKwhTotal,
            generationAllInWithExitFeesTouPrices,
            exitFeesWarnings: exitFeesLookup.warnings || [],
          },
          warnings,
        };
      })();

      // Exit fees warnings-first: if supply is CCA/DA and IOU is known, surface selector warnings even when generation rates are missing.
      if ((providerType === 'DA' || providerType === 'CCA') && iouForGen && (providerType === 'DA' || !gen)) {
        const pciaVintageKey = String((deps as any)?.pciaVintageKey || '').trim() || null;
        const exitFeesLookup = getExitFeesSnapshotV0({
          iou: iouForGen,
          effectiveYmd: billPeriodStartYmd ?? null,
          providerType: providerType as any,
          pciaVintageKey,
        });
        extraWarnings.push(...(exitFeesLookup.warnings || []));
      }

      if (providerType === 'DA') {
        extraWarnings.push(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_DA_DETECTED_GENERATION_RATES_MISSING);
        extraMissing.push({
          id: SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_DA_DETECTED_GENERATION_RATES_MISSING,
          category: 'tariff',
          severity: 'warning',
          description: 'Direct Access (DA) supply detected, but generation tariff/rates are not yet available in this repository; using IOU delivery context only.',
        });
      }

      if (providerType === 'DA' && ssaConfidence !== null && ssaConfidence < 0.95) {
        extraWarnings.push(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LOW_CONFIDENCE);
        extraMissing.push({
          id: SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LOW_CONFIDENCE,
          category: 'tariff',
          severity: 'warning',
          description: `Supply provider detection confidence is below threshold (confidence=${ssaConfidence.toFixed(3)} < 0.95).`,
        });
      }

      // If CCA is detected but generation rates are missing, surface missingInfo deterministically.
      if (providerType === 'CCA' && lseName && !gen) {
        extraWarnings.push(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LSE_SUPPORTED_BUT_GENERATION_RATES_MISSING);
        extraMissing.push({
          id: SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LSE_SUPPORTED_BUT_GENERATION_RATES_MISSING,
          category: 'tariff',
          severity: 'warning',
          description: 'CCA detected, but generation tariff/rates are not available in this repository; using IOU delivery context only.',
        });
      }

      return {
        iou: { utility: iouUtility, rateCode, snapshotId },
        generation: gen
          ? (gen.generation as any)
          : (() => {
              const baseGen: any = {
                providerType,
                lseName,
                daProviderName,
                confidence: ssaConfidence,
                evidence: ssaEvidence,
                rateCode: null,
                snapshotId: null,
              };
              // v0: even when DA generation rates are missing, attach deterministic exit fees when possible.
              if ((providerType === 'DA' || providerType === 'CCA') && iouForGen) {
                const pciaVintageKey = String((deps as any)?.pciaVintageKey || '').trim() || null;
                const exitFeesLookup = getExitFeesSnapshotV0({
                  iou: iouForGen,
                  effectiveYmd: billPeriodStartYmd ?? null,
                  providerType: providerType as any,
                  pciaVintageKey,
                });
                const exitFeesSnap = exitFeesLookup.ok ? exitFeesLookup.snapshot : null;
                baseGen.exitFeesSnapshotId = exitFeesSnap ? String((exitFeesSnap as any)?.snapshotId || '').trim() || null : null;
                baseGen.nbcPerKwhTotal = exitFeesLookup.selectedCharges.nbcPerKwhTotal;
                baseGen.pciaPerKwhApplied = exitFeesLookup.selectedCharges.pciaPerKwhApplied;
                baseGen.otherExitFeesPerKwhTotal = exitFeesLookup.selectedCharges.otherExitFeesPerKwhTotal;
                baseGen.exitFeesWarnings = exitFeesLookup.warnings || [];
              }
              return baseGen;
            })(),
        method: 'ssa_v1' as const,
        warnings: Array.from(
          new Set([...(Array.isArray(ssaV1?.warnings) ? ssaV1!.warnings : []), ...extraWarnings, ...(gen ? gen.warnings : [])]),
        ).sort((a, b) => a.localeCompare(b)),
        missingInfo: dedupMissingInfoById([...(Array.isArray(ssaV1?.missingInfo) ? ssaV1!.missingInfo : []), ...extraMissing]).sort(
          (a: any, b: any) => String(a?.id || '').localeCompare(String(b?.id || '')),
        ),
      };
    } catch (e) {
      warn({
        code: 'UIE_EFFECTIVE_RATE_CONTEXT_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'effectiveRateContextV1',
        exceptionName: exceptionName(e),
        contextKey: 'effectiveRateContextV1',
      });
      return undefined;
    }
  })();

  const composedTariffPriceSignalsV1: TariffPriceSignalsV1 | null = (() => {
    try {
      const base = (deps?.tariffPriceSignalsV1 as any) || null;
      if (!base || typeof base !== 'object') return null;
      const gen = (effectiveRateContextV1 as any)?.generation || null;
      const genWins = Array.isArray(gen?.generationTouEnergyPrices) ? (gen.generationTouEnergyPrices as any[]) : [];
      const merged: any = {
        ...(base as any),
        // Always carry supply context for downstream engines (even when generation rates are missing).
        supplyProviderType: gen?.providerType === 'CCA' || gen?.providerType === 'DA' ? gen.providerType : null,
        supplyLseName: String(gen?.lseName || '').trim() || null,
        generationSnapshotId: String(gen?.snapshotId || '').trim() || null,
        generationRateCode: String(gen?.rateCode || '').trim() || null,
        // Generation price windows are additive when present; otherwise downstream engines can emit "fallback used" warnings.
        generationTouEnergyPrices: genWins.length ? genWins : ((base as any)?.generationTouEnergyPrices ?? null),
        generationAllInTouEnergyPrices: Array.isArray(gen?.generationAllInTouEnergyPrices)
          ? ((gen.generationAllInTouEnergyPrices as any[]) || [])
          : ((base as any)?.generationAllInTouEnergyPrices ?? null),
        generationAllInWithExitFeesTouPrices: Array.isArray(gen?.generationAllInWithExitFeesTouPrices)
          ? ((gen.generationAllInWithExitFeesTouPrices as any[]) || [])
          : ((base as any)?.generationAllInWithExitFeesTouPrices ?? null),
        generationAddersPerKwhTotal: Number.isFinite(Number((gen as any)?.generationAddersPerKwhTotal)) ? Number((gen as any).generationAddersPerKwhTotal) : null,
        generationAddersSnapshotId: String((gen as any)?.generationAddersSnapshotId || '').trim() || null,
        exitFeesSnapshotId: String((gen as any)?.exitFeesSnapshotId || '').trim() || null,
        nbcPerKwhTotal: Number.isFinite(Number((gen as any)?.nbcPerKwhTotal)) ? Number((gen as any).nbcPerKwhTotal) : null,
        pciaPerKwhApplied: Number.isFinite(Number((gen as any)?.pciaPerKwhApplied)) ? Number((gen as any).pciaPerKwhApplied) : null,
        otherExitFeesPerKwhTotal: Number.isFinite(Number((gen as any)?.otherExitFeesPerKwhTotal)) ? Number((gen as any).otherExitFeesPerKwhTotal) : null,
        exitFeesPerKwhTotal:
          Number.isFinite(Number((gen as any)?.nbcPerKwhTotal)) &&
          Number.isFinite(Number((gen as any)?.pciaPerKwhApplied)) &&
          Number.isFinite(Number((gen as any)?.otherExitFeesPerKwhTotal))
            ? Number((gen as any).nbcPerKwhTotal) + Number((gen as any).pciaPerKwhApplied) + Number((gen as any).otherExitFeesPerKwhTotal)
            : null,
      };
      return merged as any;
    } catch (e) {
      warn({
        code: 'UIE_TARIFF_PRICE_SIGNALS_COMPOSE_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'composeTariffPriceSignalsV1',
        exceptionName: exceptionName(e),
        contextKey: 'tariffPriceSignalsV1',
      });
      return (deps?.tariffPriceSignalsV1 as any) || null;
    }
  })();
  endStep('tariffMatchAndRateContext');

  return {
    billTariffCommodity,
    billTariffUtilityKey,
    billPdfTariffLibraryMatchRaw,
    billPdfTariffLibraryMatch,
    tariffLibrary,
    effectiveRateContextV1,
    composedTariffPriceSignalsV1,
    BillTariffLibraryMatchWarningCodesV1,
  };
}

