import type { UtilityInputs } from '../utilityIntelligence/types';
import type { BatteryLibraryItemV1 } from '../batteryLibrary/types';

import { analyzeUtility } from '../utilityIntelligence/analyzeUtility';
import { toInboxSuggestions } from '../utilityIntelligence/toInboxSuggestions';
import { buildAnalysisTraceV1 } from '../utilityIntelligence/analysisTraceV1/buildAnalysisTraceV1';
import type { AnalysisTraceV1 } from '../utilityIntelligence/analysisTraceV1/types';
import { normalizeIntervalInputsV1 } from '../utilityIntelligence/intervalNormalizationV1/normalizeIntervalInputsV1';

import { shouldEvaluateBattery } from '../batteryIntelligence/shouldEvaluateBattery';
import { selectBatteryCandidatesV1 } from '../batteryIntelligence/selectCandidates';
import { toBatteryRecommendationsV1 } from '../batteryIntelligence/toBatteryRecommendations';

function makeEphemeralIdFactory(args: { prefix: string; seed: string }): () => string {
  const prefix = String(args.prefix || 'id').trim() || 'id';
  const seed =
    String(args.seed || '')
      .trim()
      .replace(/[^0-9A-Za-z]/g, '')
      .slice(0, 24) || 'seed';
  let i = 0;
  return () => `${prefix}_${seed}_${++i}`;
}

function uniq(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of arr) {
    const s = String(v || '').trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

export async function runUtilityWorkflow(args: {
  inputs: UtilityInputs;
  meterId?: string;
  intervalKwSeries?: Array<{ timestampIso: string; kw: number }> | null;
  intervalPointsV1?: Array<{ timestampIso: string; intervalMinutes: number; kWh?: number; kW?: number; temperatureF?: number }> | null;
  batteryLibrary: BatteryLibraryItemV1[];
  nowIso?: string;
  idFactory?: () => string;
  suggestionIdFactory?: () => string;
  inboxIdFactory?: () => string;
}): Promise<{
  utility: { inputs: UtilityInputs } & Awaited<ReturnType<typeof analyzeUtility>>;
  battery: {
    gate: ReturnType<typeof shouldEvaluateBattery>;
    selection: ReturnType<typeof selectBatteryCandidatesV1>;
  };
  inbox: {
    utility: ReturnType<typeof toInboxSuggestions>;
    battery: ReturnType<typeof toBatteryRecommendationsV1>;
    suggestions: Array<ReturnType<typeof toInboxSuggestions>['suggestions'][number]>;
    inboxItems: Array<ReturnType<typeof toInboxSuggestions>['inboxItems'][number]>;
  };
  requiredInputsMissing: string[];
  analysisTraceV1: AnalysisTraceV1;
}> {
  const nowIso = args.nowIso || new Date().toISOString();
  const idFactory = args.idFactory || makeEphemeralIdFactory({ prefix: 'utilReco', seed: nowIso });
  const suggestionIdFactory = args.suggestionIdFactory || makeEphemeralIdFactory({ prefix: 'wfSug', seed: nowIso });
  const inboxIdFactory = args.inboxIdFactory || makeEphemeralIdFactory({ prefix: 'wfInbox', seed: nowIso });

  const normalizedIntervalV1 = normalizeIntervalInputsV1({
    intervalKwSeries: args.intervalKwSeries || null,
    intervalPointsV1: args.intervalPointsV1 || null,
  });

  const utilityAnalysis = await analyzeUtility(args.inputs, {
    intervalKwSeries: args.intervalKwSeries || undefined,
    intervalPointsV1: args.intervalPointsV1 || undefined,
    nowIso,
    idFactory,
  });

  const utility = { inputs: args.inputs, ...utilityAnalysis };

  const utilityInbox = toInboxSuggestions({
    inputs: args.inputs,
    recommendations: utilityAnalysis.recommendations,
    nowIso,
    suggestionIdFactory,
    inboxIdFactory,
  });

  const gate = shouldEvaluateBattery({ insights: utilityAnalysis.insights, constraints: args.inputs.constraints });
  const selection = selectBatteryCandidatesV1({ insights: utilityAnalysis.insights, library: args.batteryLibrary });
  const batteryInbox = toBatteryRecommendationsV1({
    inputs: args.inputs,
    insights: utilityAnalysis.insights,
    gate,
    selection,
    meterId: args.meterId,
    nowIso,
    suggestionIdFactory,
    inboxIdFactory,
  });

  const requiredInputsMissing = uniq([
    ...(utilityAnalysis.insights.requiredInputsMissing || []),
    ...(gate.requiredInputsMissing || []),
    ...(selection.requiredInputsMissing || []),
  ]);

  const analysisTraceV1 = buildAnalysisTraceV1({
    nowIso,
    inputs: args.inputs,
    intervalKwSeries: args.intervalKwSeries || null,
    intervalPointsV1: args.intervalPointsV1 || null,
    normalizedIntervalV1,
    insights: utilityAnalysis.insights as any,
  });

  return {
    utility,
    battery: { gate, selection },
    inbox: {
      utility: utilityInbox,
      battery: batteryInbox,
      suggestions: [...utilityInbox.suggestions, ...batteryInbox.suggestions],
      inboxItems: [...utilityInbox.inboxItems, ...batteryInbox.inboxItems],
    },
    requiredInputsMissing,
    analysisTraceV1,
  };
}

