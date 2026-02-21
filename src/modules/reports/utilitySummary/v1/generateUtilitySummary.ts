import type { UtilityInputs, UtilityInsights, UtilityRecommendation } from '../../../utilityIntelligence/types';
import type { BatteryFeasibilityGateResult } from '../../../batteryIntelligence/shouldEvaluateBattery';
import type { BatteryCandidateSelectionOutput } from '../../../batteryIntelligence/selectCandidates';

function fmt(n: number | undefined | null, digits = 1): string {
  if (!Number.isFinite(n ?? NaN)) return 'n/a';
  return Number(n).toFixed(digits);
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

export type UtilitySummaryV1 = {
  version: 'utility_summary_v1';
  generatedAt: string;
  building: {
    projectId: string;
    orgId: string;
    address?: UtilityInputs['address'];
    territory?: string;
    customerType?: string;
    naicsCode?: string;
    currentRateCode?: string;
  };
  loadShape: UtilityInsights['inferredLoadShape'];
  operatingPattern: UtilityInsights['operatingPatternInference'];
  rateFit: UtilityInsights['rateFit'];
  optionS: UtilityInsights['optionSRelevance'];
  programs: UtilityInsights['programs'];
  battery: {
    gate: BatteryFeasibilityGateResult;
    topCandidates: Array<{ vendor: string; sku: string; fitScore: number; disqualifiers: string[] }>;
    sizing: BatteryCandidateSelectionOutput['sizing'];
  };
  missingInputsChecklist: string[];
  notes: string[];
};

export function generateUtilitySummaryV1(args: {
  inputs: UtilityInputs;
  insights: UtilityInsights;
  utilityRecommendations: UtilityRecommendation[];
  batteryGate: BatteryFeasibilityGateResult;
  batterySelection: BatteryCandidateSelectionOutput;
  nowIso?: string;
}): { json: UtilitySummaryV1; markdown: string } {
  const nowIso = args.nowIso || new Date().toISOString();

  const missing = uniq([
    ...(args.insights.requiredInputsMissing || []),
    ...(args.batteryGate.requiredInputsMissing || []),
    ...(args.batterySelection.requiredInputsMissing || []),
  ]);

  const topCandidates = args.batterySelection.rankedCandidates.slice(0, 3).map((c) => ({
    vendor: c.vendor,
    sku: c.sku,
    fitScore: c.fitScore,
    disqualifiers: c.disqualifiers,
  }));

  const json: UtilitySummaryV1 = {
    version: 'utility_summary_v1',
    generatedAt: nowIso,
    building: {
      projectId: args.inputs.projectId,
      orgId: args.inputs.orgId,
      address: args.inputs.address,
      territory: args.inputs.utilityTerritory,
      customerType: args.inputs.customerType,
      naicsCode: args.inputs.naicsCode,
      currentRateCode: args.inputs.currentRate?.rateCode,
    },
    loadShape: args.insights.inferredLoadShape,
    operatingPattern: args.insights.operatingPatternInference,
    rateFit: args.insights.rateFit,
    optionS: args.insights.optionSRelevance,
    programs: args.insights.programs,
    battery: {
      gate: args.batteryGate,
      topCandidates,
      sizing: args.batterySelection.sizing,
    },
    missingInputsChecklist: missing,
    notes: [
      'Deterministic summary (v1).',
      'No savings claims are included unless a deterministic bill delta is computed and provided in insights.rateFit.alternatives[].estimatedDeltaDollars.',
    ],
  };

  const alternatives = args.insights.rateFit.alternatives.slice(0, 4);
  const altLines = alternatives.length
    ? alternatives.map((a) => {
        const delta = Number.isFinite(a.estimatedDeltaDollars ?? NaN)
          ? `estimatedDeltaDollars=${Number(a.estimatedDeltaDollars).toFixed(0)} (demand-only model v1)`
          : 'potential improvement; needs inputs for deterministic delta';
        return `- ${a.utility} ${a.rateCode} (${a.status}): ${delta}`;
      })
    : ['- (no alternatives generated)'];

  const progTop = args.insights.programs.matches.slice(0, 5).map((m) => `- ${m.programId} (${m.matchStatus}, score=${m.score.toFixed(2)})`);
  const progLines = progTop.length ? progTop : ['- (no matches)'];

  const battLines = topCandidates.length
    ? topCandidates.map((c, idx) => `- ${idx + 1}. ${c.vendor} ${c.sku} fitScore=${c.fitScore.toFixed(3)}${c.disqualifiers.length ? ` disq=[${c.disqualifiers.join('; ')}]` : ''}`)
    : ['- (no candidates)'];

  const missingLines = missing.length ? missing.map((m) => `- ${m}`) : ['- (none)'];

  const markdown = [
    `# Utility Summary Report v1`,
    ``,
    `Generated: ${nowIso}`,
    ``,
    `## Building metadata`,
    `- **projectId**: ${args.inputs.projectId}`,
    `- **territory**: ${args.inputs.utilityTerritory || 'n/a'}`,
    `- **customerType**: ${args.inputs.customerType || 'n/a'}`,
    `- **naicsCode**: ${args.inputs.naicsCode || 'n/a'}`,
    `- **currentRate**: ${args.inputs.currentRate?.rateCode || 'n/a'}`,
    ``,
    `## Key load shape metrics (deterministic)`,
    `- **baseloadKw**: ${fmt(args.insights.inferredLoadShape.baseloadKw)}`,
    `- **peakKw**: ${fmt(args.insights.inferredLoadShape.peakKw)}`,
    `- **loadFactor**: ${fmt(args.insights.inferredLoadShape.loadFactor, 2)}`,
    `- **peakinessIndex**: ${fmt(args.insights.inferredLoadShape.peakinessIndex, 2)}`,
    `- **operatingScheduleBucket**: ${args.insights.operatingPatternInference.scheduleBucket} (conf=${fmt(args.insights.operatingPatternInference.confidence, 2)})`,
    ``,
    `## Rate fit`,
    `- **status**: ${args.insights.rateFit.status} (conf=${fmt(args.insights.rateFit.confidence, 2)})`,
    `- **because**:`,
    ...(args.insights.rateFit.because.length ? args.insights.rateFit.because.map((b) => `  - ${b}`) : ['  - (none)']),
    `- **topAlternatives**:`,
    ...altLines,
    ``,
    `## Option S / storage relevance`,
    `- **status**: ${args.insights.optionSRelevance.status} (conf=${fmt(args.insights.optionSRelevance.confidence, 2)})`,
    `- **because**:`,
    ...(args.insights.optionSRelevance.because.length ? args.insights.optionSRelevance.because.map((b) => `  - ${b}`) : ['  - (none)']),
    ``,
    `## Demand response + utility/ISO programs`,
    `- **topMatches**:`,
    ...progLines,
    ``,
    `## Battery screening (v1)`,
    `- **gate**: ${args.batteryGate.status}`,
    `- **because**:`,
    ...(args.batteryGate.because.length ? args.batteryGate.because.map((b) => `  - ${b}`) : ['  - (none)']),
    `- **topCandidates**:`,
    ...battLines,
    ``,
    `## Missing inputs checklist (conservative)`,
    ...missingLines,
    ``,
  ].join('\n');

  return { json, markdown };
}

