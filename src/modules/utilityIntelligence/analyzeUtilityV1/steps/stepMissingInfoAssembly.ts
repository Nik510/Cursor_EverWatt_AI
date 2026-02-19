import type { MissingInfoItemV0 } from '../../missingInfo/types';
import { BillTariffLibraryMatchWarningCodesV1 } from '../../../tariffLibrary/matching/matchBillTariffToLibraryV1';

import { asCaIouUtility, uniq } from '../internals';
import type { AnalyzeUtilityV1Delta, AnalyzeUtilityV1State, NormalizedInputsV1, StepContextV1 } from '../types';

export async function stepMissingInfoAssembly(args: {
  state: AnalyzeUtilityV1State;
  normalizedInputs: NormalizedInputsV1;
  ctx: StepContextV1;
}): Promise<AnalyzeUtilityV1Delta> {
  const { inputs, deps, beginStep, endStep } = args.ctx as any;

  const missingGlobal = (args.state as any).missingGlobal || [];

  const billTou = (args.state as any).billTou;
  const billPdfTariffTruth = (args.state as any).billPdfTariffTruth;
  const billPdfTariffLibraryMatchRaw = (args.state as any).billPdfTariffLibraryMatchRaw;
  const tariffLibrary = (args.state as any).tariffLibrary;
  const tariffApplicability = (args.state as any).tariffApplicability;
  const supplyStructure = (args.state as any).supplyStructure;
  const intervalKwSeries = (args.state as any).intervalKwSeries || [];
  const intervalKwRaw = (args.state as any).intervalKwRaw;

  const effectiveRateContextV1 = (args.state as any).effectiveRateContextV1;
  const determinantsPack = (args.state as any).determinantsPack;
  const loadAttribution = (args.state as any).loadAttribution;
  const behaviorInsightsV2 = (args.state as any).behaviorInsightsV2;
  const behaviorInsightsV3 = (args.state as any).behaviorInsightsV3;

  const loadShape = (args.state as any).loadShape;
  const loadShift = (args.state as any).loadShift;
  const weather = (args.state as any).weather;
  const rateFit = (args.state as any).rateFit;
  const optionS = (args.state as any).optionS;
  const matches = (args.state as any).matches || [];

  beginStep('missingInfoAssembly');
  const missingInfo: MissingInfoItemV0[] = (() => {
    const sortMissingInfo = (a: any, b: any): number => {
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
    };

    const items: MissingInfoItemV0[] = [];

    const currentRateCode = String(inputs.currentRate?.rateCode || '').trim();
    const currentUtility = asCaIouUtility(inputs.currentRate?.utility ?? inputs.utilityTerritory);

    if (!String(inputs.billPdfText || '').trim()) {
      items.push({
        id: 'billing.billPdfText.missing',
        category: 'tariff',
        severity: 'info',
        description: 'Bill PDF text is missing; bill-based tariff extraction and TOU usage hints are unavailable.',
      });
    } else if (billTou && Array.isArray((billTou as any).warnings) && (billTou as any).warnings.length) {
      const snips = Array.isArray((billTou as any).evidenceSnippets) ? ((billTou as any).evidenceSnippets as any[]) : [];
      const evidence = snips
        .map((s) => String(s || '').trim())
        .filter(Boolean)
        .slice(0, 4)
        .map((s) => ({ kind: 'bill_pdf_snippet', value: s }));
      for (const w of ((billTou as any).warnings as any[]).slice(0, 8)) {
        const code = String((w as any)?.code || '').trim();
        const hint = String((w as any)?.hint || '').trim() || 'Bill PDF TOU extraction warning.';
        if (!code) continue;
        const severity: MissingInfoItemV0['severity'] =
          code === 'BILL_PDF_CYCLE_LABEL_MISSING' || code === 'BILL_PDF_TOU_ENERGY_INCONSISTENT_WITH_TOTAL' ? 'warning' : 'info';
        items.push({
          id: `billing.billPdfTouUsage.${code}`,
          category: 'billing',
          severity,
          description: hint,
          ...(evidence.length ? { evidence } : {}),
          details: { reasonCode: code, source: 'bill_pdf' },
        });
      }
    }

    // Bill->tariff library match ambiguity (operator action required)
    {
      const warnings = Array.isArray((billPdfTariffLibraryMatchRaw as any)?.warnings) ? ((billPdfTariffLibraryMatchRaw as any).warnings as any[]) : [];
      const isAmbiguous = warnings.some((w) => String(w || '') === BillTariffLibraryMatchWarningCodesV1.BILL_TARIFF_AMBIGUOUS);
      if (isAmbiguous) {
        const wanted = String((billPdfTariffTruth as any)?.rateScheduleText || '').trim() || 'Unknown';
        const cands = Array.isArray((billPdfTariffLibraryMatchRaw as any)?.candidates) ? (((billPdfTariffLibraryMatchRaw as any).candidates as any[]) || []) : [];
        const top = cands
          .map((c) => String((c as any)?.rateCode || '').trim())
          .filter(Boolean)
          .slice(0, 3);
        const candidatesText = top.length ? ` Candidates: ${top.join(', ')}.` : '';
        items.push({
          id: `tariff.billPdfTariffLibraryMatch.${BillTariffLibraryMatchWarningCodesV1.BILL_TARIFF_AMBIGUOUS}`,
          category: 'tariff',
          severity: 'warning',
          description: `Bill rate label "${wanted}" matches multiple tariff candidates (ambiguous). Select the correct tariff in the tariff browser or apply an override.${candidatesText}`,
          details: {
            reasonCode: BillTariffLibraryMatchWarningCodesV1.BILL_TARIFF_AMBIGUOUS,
            wantedRateScheduleText: wanted,
            candidates: top,
          },
        });
      }
    }

    const hasIntervals = Boolean((deps?.intervalPointsV1 && deps.intervalPointsV1.length) || intervalKwSeries.length);
    if (!hasIntervals) {
      items.push({
        id: 'interval.intervalElectricV1.missing',
        category: 'billing',
        severity: 'info',
        description: 'Interval electricity data is missing; interval-derived insights (and some deterministic audit signals) will be unavailable.',
      });
    }

    if (!currentRateCode) {
      items.push({
        id: 'tariff.currentRateCode.missing',
        category: 'tariff',
        severity: 'blocking',
        description: 'Current tariff/rate code is missing; tariff metadata and rate-fit comparisons cannot be audited without it.',
      });
    }

    if (currentUtility && currentRateCode) {
      if (!tariffLibrary || !String((tariffLibrary as any).snapshotVersionTag || '').trim()) {
        items.push({
          id: 'tariff.snapshot.missing',
          category: 'tariff',
          severity: 'warning',
          description: 'Tariff snapshots are not loaded for this utility. Run ingestion to restore versioned tariff metadata.',
        });
      } else {
        if (tariffLibrary?.isStale) {
          items.push({
            id: 'tariff.snapshot.stale',
            category: 'tariff',
            severity: 'warning',
            description: 'Tariff snapshot may be stale (>14 days). Refresh snapshots to ensure current metadata and provenance.',
          });
        }
        if (tariffLibrary?.rateMetadata === null) {
          items.push({
            id: 'tariff.rateMetadata.notFound',
            category: 'tariff',
            severity: 'warning',
            description: `Rate code ${currentRateCode} was not found in the latest tariff snapshot (metadata-only). Verify rate code or refresh snapshots.`,
          });
        }
        if (!tariffApplicability) {
          items.push({
            id: 'tariff.applicability.missing',
            category: 'tariff',
            severity: 'info',
            description: 'Tariff applicability was not evaluated (missing inputs or unsupported utility/rate).',
          });
        } else if (tariffApplicability?.status === 'unknown') {
          items.push({
            id: 'tariff.applicability.unknown',
            category: 'tariff',
            severity: 'info',
            description: 'Tariff applicability is unknown with current inputs; see applicability panel for required missing determinants.',
          });
        }
      }
    }

    if (!supplyStructure) {
      items.push({
        id: 'supply.structure.unknown',
        category: 'supply',
        severity: 'info',
        description: 'Supply structure (bundled vs CCA vs Direct Access) is unknown; tariff interpretation may be incomplete.',
      });
    }

    // If intervals exist but temperature is absent, surface a decision-safety note.
    if ((deps?.intervalPointsV1 && deps.intervalPointsV1.length) || (Array.isArray(intervalKwRaw) && intervalKwRaw.length)) {
      const anyTemp = (Array.isArray(deps?.intervalPointsV1) ? deps?.intervalPointsV1 : (intervalKwRaw as any[])).some((p: any) =>
        Number.isFinite(Number(p?.temperatureF)),
      );
      if (!anyTemp) {
        items.push({
          id: 'weather.interval.temperature.missing',
          category: 'tariff',
          severity: 'info',
          description: 'Weather data missing in interval export; load attribution unavailable. Include Avg. Temperature in interval export when available.',
        });
      }
    }

    // Bubble up applicability missingInfo into the global decision-safety list (dedup by id).
    if (tariffApplicability && Array.isArray(tariffApplicability.missingInfo) && tariffApplicability.missingInfo.length) {
      const seen = new Set(items.map((x) => String(x.id || '')));
      for (const it of tariffApplicability.missingInfo) {
        const id = String((it as any)?.id || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        items.push(it);
      }
    }

    // Bubble up determinants missingInfo into the global decision-safety list (dedup by id).
    if (determinantsPack && Array.isArray(determinantsPack.missingInfo) && determinantsPack.missingInfo.length) {
      const seen = new Set(items.map((x) => String(x.id || '')));
      for (const it of determinantsPack.missingInfo) {
        const id = String((it as any)?.id || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        items.push(it);
      }
    }

    if (loadAttribution && Array.isArray((loadAttribution as any).missingInfo) && (loadAttribution as any).missingInfo.length) {
      const seen = new Set(items.map((x) => String(x.id || '')));
      for (const it of (loadAttribution as any).missingInfo) {
        const id = String((it as any)?.id || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        items.push(it);
      }
    }

    if (behaviorInsightsV2 && Array.isArray((behaviorInsightsV2 as any).missingInfo) && (behaviorInsightsV2 as any).missingInfo.length) {
      const seen = new Set(items.map((x) => String(x.id || '')));
      for (const it of (behaviorInsightsV2 as any).missingInfo) {
        const id = String((it as any)?.id || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        items.push(it);
      }
    }

    if (behaviorInsightsV3) {
      const seen = new Set(items.map((x) => String(x.id || '')));
      const all = [
        ...((behaviorInsightsV3 as any)?.electric?.missingInfo || []),
        ...((behaviorInsightsV3 as any)?.gas?.missingInfo || []),
      ];
      for (const it of all) {
        const id = String((it as any)?.id || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        items.push(it);
      }
    }

    // Supply Structure Analyzer v1 missingInfo (additive)
    if (effectiveRateContextV1 && Array.isArray((effectiveRateContextV1 as any).missingInfo) && (effectiveRateContextV1 as any).missingInfo.length) {
      const seen = new Set(items.map((x) => String(x.id || '')));
      for (const it of (effectiveRateContextV1 as any).missingInfo) {
        const id = String((it as any)?.id || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        items.push(it as any);
      }
    }

    // Deterministic ordering to reduce snapshot noise (content is unchanged).
    return items.slice().sort(sortMissingInfo);
  })();

  const requiredInputsMissing = uniq([
    ...missingGlobal,
    ...(loadShape.requiredInputsMissing || []),
    ...(loadShift.requiredInputsMissing || []),
    ...(weather.requiredInputsMissing || []),
    ...(rateFit.alternatives.flatMap((a: any) => a.requiredInputsMissing || []) || []),
    ...(optionS.requiredInputsMissing || []),
    ...(matches.flatMap((m: any) => m.requiredInputsMissing || []) || []),
  ]);
  endStep('missingInfoAssembly');

  // Append in the same relative order as the original insights literal.
  const insights: any = (args.state as any).insights;
  if (insights && typeof insights === 'object') {
    if (missingInfo.length) insights.missingInfo = missingInfo;
    insights.requiredInputsMissing = requiredInputsMissing;
  }

  return { missingInfo, requiredInputsMissing };
}

