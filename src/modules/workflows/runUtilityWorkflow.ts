import type { UtilityInputs } from '../utilityIntelligence/types';
import type { BatteryLibraryItemV1 } from '../batteryLibrary/types';

import { analyzeUtility } from '../utilityIntelligence/analyzeUtility';
import { toInboxSuggestions } from '../utilityIntelligence/toInboxSuggestions';

import { shouldEvaluateBattery } from '../batteryIntelligence/shouldEvaluateBattery';
import { selectBatteryCandidatesV1 } from '../batteryIntelligence/selectCandidates';
import { toBatteryRecommendationsV1 } from '../batteryIntelligence/toBatteryRecommendations';

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
  utility: Awaited<ReturnType<typeof analyzeUtility>>;
  battery: {
    gate: ReturnType<typeof shouldEvaluateBattery>;
    selection: ReturnType<typeof selectBatteryCandidatesV1>;
  };
  inbox: {
    utility: ReturnType<typeof toInboxSuggestions>;
    battery: ReturnType<typeof toBatteryRecommendationsV1>;
    suggestions: Array<any>;
    inboxItems: Array<any>;
  };
  requiredInputsMissing: string[];
}> {
  const nowIso = args.nowIso || new Date('2026-01-01T00:00:00.000Z').toISOString();
  const idFactory = args.idFactory;

  const utility = await analyzeUtility(args.inputs, {
    intervalKwSeries: args.intervalKwSeries || undefined,
    intervalPointsV1: args.intervalPointsV1 || undefined,
    nowIso,
    idFactory,
  });

  const utilityInbox = toInboxSuggestions({
    inputs: args.inputs,
    recommendations: utility.recommendations,
    nowIso,
    suggestionIdFactory: args.suggestionIdFactory,
    inboxIdFactory: args.inboxIdFactory,
  });

  const gate = shouldEvaluateBattery({ insights: utility.insights, constraints: args.inputs.constraints });
  const selection = selectBatteryCandidatesV1({ insights: utility.insights, library: args.batteryLibrary });
  const batteryInbox = toBatteryRecommendationsV1({
    inputs: args.inputs,
    insights: utility.insights,
    gate,
    selection,
    meterId: args.meterId,
    nowIso,
    suggestionIdFactory: args.suggestionIdFactory,
    inboxIdFactory: args.inboxIdFactory,
  });

  const requiredInputsMissing = uniq([
    ...(utility.insights.requiredInputsMissing || []),
    ...(gate.requiredInputsMissing || []),
    ...(selection.requiredInputsMissing || []),
  ]);

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
  };
}

