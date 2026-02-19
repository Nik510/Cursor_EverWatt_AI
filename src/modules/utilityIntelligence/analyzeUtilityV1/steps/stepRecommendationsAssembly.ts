import type { UtilityInsights, UtilityRecommendation } from '../../types';

import { clamp01, normText, uniq } from '../internals';
import type { AnalyzeUtilityV1Delta, AnalyzeUtilityV1State, NormalizedInputsV1, StepContextV1 } from '../types';

export async function stepRecommendationsAssembly(args: {
  state: AnalyzeUtilityV1State;
  normalizedInputs: NormalizedInputsV1;
  ctx: StepContextV1;
}): Promise<AnalyzeUtilityV1Delta> {
  const { inputs, idFactory, warn, beginStep, endStep } = args.ctx as any;
  void warn;

  const engineWarnings = (args.state as any).engineWarnings || [];
  const proven = (args.state as any).proven;
  const annualEstimate = (args.state as any).annualEstimate;
  const programs = (args.state as any).programs;
  const programRecs = (args.state as any).programRecs;

  const loadShape = (args.state as any).loadShape;
  const schedule = (args.state as any).schedule;
  const loadShift = (args.state as any).loadShift;
  const weather = (args.state as any).weather;
  const rateFit = (args.state as any).rateFit;
  const optionS = (args.state as any).optionS;

  const supplyStructure = (args.state as any).supplyStructure;
  const effectiveRateContextV1 = (args.state as any).effectiveRateContextV1;
  const billPdfTariffTruth = (args.state as any).billPdfTariffTruth;
  const billPdfTariffLibraryMatch = (args.state as any).billPdfTariffLibraryMatch;
  const tariffLibrary = (args.state as any).tariffLibrary;
  const tariffApplicability = (args.state as any).tariffApplicability;
  const determinantsPack = (args.state as any).determinantsPack;
  const determinantsPackSummary = (args.state as any).determinantsPackSummary;

  const billSimV2 = (args.state as any).billSimV2;
  const billIntelligenceV1 = (args.state as any).billIntelligenceV1;
  const intervalIntelligenceV1 = (args.state as any).intervalIntelligenceV1;
  const storageOpportunityPackV1 = (args.state as any).storageOpportunityPackV1;
  const batteryEconomicsV1 = (args.state as any).batteryEconomicsV1;
  const batteryDecisionPackV1 = (args.state as any).batteryDecisionPackV1;
  const batteryDecisionPackV1_2 = (args.state as any).batteryDecisionPackV1_2;

  const weatherRegressionV1 = (args.state as any).weatherRegressionV1;
  const behaviorInsights = (args.state as any).behaviorInsights;
  const behaviorInsightsV2 = (args.state as any).behaviorInsightsV2;
  const behaviorInsightsV3 = (args.state as any).behaviorInsightsV3;
  const loadAttribution = (args.state as any).loadAttribution;

  // Recommendations: inbox-only suggestions (do not auto-apply).
  beginStep('recommendationsAssembly');
  const recos: UtilityRecommendation[] = [];

  // 1) Collect missing rate code if needed
  if (!inputs.currentRate?.rateCode) {
    recos.push({
      recommendationId: idFactory(),
      recommendationType: 'RATE_CHANGE',
      score: 0.9,
      confidence: 0.9,
      because: ['Current rate code is missing; rate fit cannot be evaluated without it.', 'Collect the exact tariff schedule code from the bill/portal.'],
      requiredInputsMissing: ['Current tariff/rate code required to evaluate rate fit.'],
      suggestedMeasure: {
        measureType: 'RATE_CHANGE' as any,
        label: 'Collect current utility rate code',
        tags: ['utility', 'rate_code'],
        parameters: {
          territory: inputs.utilityTerritory ?? null,
          utility: inputs.currentRate?.utility ?? inputs.utilityTerritory ?? null,
        },
      },
    });
  }

  // 2) Rate change alternatives (as evaluation suggestions)
  for (const alt of rateFit.alternatives.slice(0, 5)) {
    const because = [
      'Evaluate alternative rate schedule (inbox-only suggestion; no changes are applied automatically).',
      ...alt.because,
      ...(Number.isFinite(alt.estimatedDeltaDollars ?? NaN)
        ? [`Deterministic delta computed (demand-only model v1): estimatedDeltaDollars=${Number(alt.estimatedDeltaDollars).toFixed(2)}.`]
        : ['Potential improvement; needs additional inputs to compute deterministic savings.']),
    ];
    recos.push({
      recommendationId: idFactory(),
      recommendationType: 'RATE_CHANGE',
      score: clamp01(0.55 + 0.25 * (alt.status === 'candidate' ? 1 : 0)),
      confidence: clamp01(0.35 + 0.35 * (alt.estimatedDeltaConfidence ?? 0)),
      because,
      requiredInputsMissing: uniq([...(alt.requiredInputsMissing || []), ...(inputs.currentRate?.rateCode ? [] : ['Current tariff/rate code required to compare rates.'])]),
      suggestedMeasure: {
        measureType: 'RATE_CHANGE' as any,
        label: `Evaluate rate alternative: ${alt.rateCode}`,
        tags: ['utility', 'rate_change'],
        parameters: {
          territory: inputs.utilityTerritory ?? null,
          currentRate: inputs.currentRate?.rateCode ?? null,
          candidateRate: alt.rateCode,
          utility: alt.utility,
        },
      },
    });
  }

  // 3) Load shifting strategy suggestion when score is material
  if (loadShift.score >= 0.45) {
    recos.push({
      recommendationId: idFactory(),
      recommendationType: 'LOAD_SHIFTING',
      score: clamp01(loadShift.score),
      confidence: clamp01(0.45 + 0.4 * loadShift.score),
      because: [
        'Load shifting appears feasible based on repeatable peak windows (deterministic heuristic v1).',
        ...loadShift.reasons.slice(0, 4),
        ...(loadShift.candidateShiftWindows.length ? [`Candidate windows: ${loadShift.candidateShiftWindows.map((w: any) => `${w.name}(${w.startHour}-${w.endHour})`).join(', ')}`] : []),
      ],
      requiredInputsMissing: uniq(loadShift.requiredInputsMissing || []),
      suggestedMeasure: {
        measureType: 'LOAD_SHIFTING_STRATEGY' as any,
        label: 'Evaluate load shifting opportunities',
        tags: ['utility', 'load_shifting'],
        parameters: {
          territory: inputs.utilityTerritory ?? null,
          score: loadShift.score,
        },
      },
    });
  }

  // 4) Option S evaluation suggestion when relevant
  if (optionS.status === 'relevant') {
    recos.push({
      recommendationId: idFactory(),
      recommendationType: 'OPTION_S',
      score: 0.65,
      confidence: clamp01(optionS.confidence),
      because: ['Option S / storage rider appears relevant to evaluate (v1 relevance only).', ...optionS.because],
      requiredInputsMissing: uniq(optionS.requiredInputsMissing || []),
      suggestedMeasure: {
        measureType: 'OPTION_S_EVALUATION' as any,
        label: 'Evaluate Option S / storage rider relevance',
        tags: ['utility', 'option_s', 'storage'],
        parameters: {
          territory: inputs.utilityTerritory ?? null,
          currentRate: inputs.currentRate?.rateCode ?? null,
        },
      },
    });
  } else if (optionS.status === 'unknown' && optionS.requiredInputsMissing.length) {
    recos.push({
      recommendationId: idFactory(),
      recommendationType: 'OPTION_S',
      score: 0.35,
      confidence: clamp01(optionS.confidence),
      because: ['Option S relevance cannot be determined with current inputs.', ...optionS.because],
      requiredInputsMissing: uniq(optionS.requiredInputsMissing || []),
      suggestedMeasure: {
        measureType: 'OPTION_S_EVALUATION' as any,
        label: 'Collect inputs to evaluate Option S',
        tags: ['utility', 'option_s', 'missing_inputs'],
        parameters: { territory: inputs.utilityTerritory ?? null },
      },
    });
  }

  // 5) Program/DR recommendations
  for (const pr of programRecs.slice(0, 5)) {
    recos.push(pr);
  }

  const insights: UtilityInsights = {
    inferredLoadShape: loadShape.metrics,
    ...(engineWarnings.length ? { engineWarnings } : {}),
    ...(Number.isFinite(proven.provenPeakKw ?? NaN) ? { provenPeakKw: proven.provenPeakKw } : {}),
    ...(Number.isFinite(proven.provenMonthlyKwh ?? NaN) ? { provenMonthlyKwh: proven.provenMonthlyKwh } : {}),
    ...(annualEstimate ? { provenAnnualKwhEstimate: annualEstimate } : {}),
    ...(proven.provenTouExposureSummary ? { provenTouExposureSummary: proven.provenTouExposureSummary } : {}),
    operatingPatternInference: schedule,
    loadShiftingFeasibility: {
      score: loadShift.score,
      candidateShiftWindows: loadShift.candidateShiftWindows,
      constraintsDetected: loadShift.constraintsDetected,
    },
    weatherSensitivity: {
      available: weather.available,
      coolingSlope: weather.coolingSlope,
      heatingSlope: weather.heatingSlope,
      r2: weather.r2,
      method: 'regression_v1',
      reasons: weather.reasons,
    },
    rateFit,
    optionSRelevance: optionS,
    programs,
    ...(supplyStructure ? { supplyStructure } : {}),
    ...(effectiveRateContextV1 ? { effectiveRateContextV1 } : {}),
    ...(billPdfTariffTruth ? { billPdfTariffTruth } : {}),
    ...(billPdfTariffLibraryMatch ? { billPdfTariffLibraryMatch } : {}),
    ...(tariffLibrary ? { tariffLibrary } : {}),
    ...(tariffApplicability ? { tariffApplicability } : {}),
    ...(determinantsPackSummary ? { determinantsPackSummary } : {}),
    ...(billSimV2 ? { billSimV2 } : {}),
    ...(billIntelligenceV1 ? { billIntelligenceV1 } : {}),
    ...(intervalIntelligenceV1 ? { intervalIntelligenceV1 } : {}),
    storageOpportunityPackV1,
    batteryEconomicsV1,
    batteryDecisionPackV1,
    batteryDecisionPackV1_2,
    ...(weatherRegressionV1 ? { weatherRegressionV1 } : {}),
    ...(behaviorInsights ? { behaviorInsights } : {}),
    ...(behaviorInsightsV2 ? { behaviorInsightsV2 } : {}),
    ...(behaviorInsightsV3 ? { behaviorInsightsV3 } : {}),
    ...(loadAttribution ? { loadAttribution } : {}),
    versionTags: {
      determinantsVersionTag: String((determinantsPack as any)?.determinantsVersionTag || (determinantsPack as any)?.rulesVersionTag || 'determinants_v1'),
      touLabelerVersionTag: String((determinantsPack as any)?.touLabelerVersionTag || 'tou_v1'),
      loadAttributionVersionTag: String((loadAttribution as any)?.loadAttributionVersionTag || 'cp_v0'),
    },
  };

  // Ensure every recommendation has requiredInputsMissing + because (non-empty)
  const recommendations = recos
    .map((r) => ({
      ...r,
      score: clamp01(r.score),
      confidence: clamp01(r.confidence),
      because: Array.isArray(r.because) && r.because.length ? r.because : ['No explanation provided (unexpected).'],
      requiredInputsMissing: Array.isArray(r.requiredInputsMissing) ? uniq(r.requiredInputsMissing) : [],
    }))
    // stable ordering
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.confidence - a.confidence ||
        normText(a.recommendationType).localeCompare(normText(b.recommendationType)) ||
        String(a.recommendationId || '').localeCompare(String(b.recommendationId || '')),
    );
  endStep('recommendationsAssembly');

  return { insights, recommendations };
}

