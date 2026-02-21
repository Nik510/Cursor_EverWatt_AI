import type { BaselineFitTierV1 } from './baselineV1';

export type TruthConfidenceTierV1 = 'A' | 'B' | 'C';

export function computeTruthConfidenceV1(args: {
  hasInterval: boolean;
  intervalDays: number | null;
  granularityMinutes: number | null;
  hasWeatherDaily: boolean;
  weatherDays: number | null;
  hasBillText: boolean;
  baselineTier: BaselineFitTierV1;
  baselineR2: number | null;
  baselineWarnings: string[];
}): { tier: TruthConfidenceTierV1; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const intervalDays = args.intervalDays ?? null;
  const weatherDays = args.weatherDays ?? null;
  const r2 = args.baselineR2;

  reasons.push(`baselineTier=${args.baselineTier}`);
  if (intervalDays !== null) reasons.push(`intervalDays=${String(intervalDays)}`);
  if (args.granularityMinutes !== null) reasons.push(`granularityMinutes=${String(args.granularityMinutes)}`);
  reasons.push(`hasWeatherDaily=${String(args.hasWeatherDaily)}`);
  if (weatherDays !== null) reasons.push(`weatherDays=${String(weatherDays)}`);
  reasons.push(`hasBillText=${String(args.hasBillText)}`);
  if (r2 !== null) reasons.push(`baselineR2=${String(r2)}`);

  for (const w of args.baselineWarnings || []) warnings.push(String(w));

  const tier = (() => {
    if (!args.hasInterval) {
      if (args.hasBillText) return 'C';
      return 'C';
    }
    const days = intervalDays ?? 0;
    if (days >= 28 && args.baselineTier === 'A') return 'A';
    if (days >= 14 && (args.baselineTier === 'A' || args.baselineTier === 'B')) return 'B';
    return 'C';
  })();

  if (!args.hasInterval) warnings.push('truth.confidence.no_interval');
  if (args.hasInterval && intervalDays !== null && intervalDays < 14) warnings.push('truth.confidence.short_interval_coverage');
  if (args.hasWeatherDaily && weatherDays !== null && weatherDays < 10) warnings.push('truth.confidence.short_weather_coverage');

  const uniqSorted = (xs: string[], max: number): string[] => {
    const set = new Set<string>();
    for (const x of xs) {
      const s = String(x || '').trim();
      if (!s) continue;
      set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, max);
  };

  return { tier, reasons: uniqSorted(reasons, 120), warnings: uniqSorted(warnings, 120) };
}

