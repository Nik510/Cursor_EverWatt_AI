import { normalizeIntervalInputsV1 } from '../../intervalNormalizationV1/normalizeIntervalInputsV1';
import type { NormalizedIntervalV1 } from '../../intervalNormalizationV1/types';
import { intervalKwFromProjectTelemetry, tryLoadIntervalKwFromProject, tryLoadProjectTelemetry } from '../internals';
import type { AnalyzeUtilityV1Delta, AnalyzeUtilityV1State, NormalizedInputsV1, StepContextV1 } from '../types';

export async function stepNormalize(args: {
  state: AnalyzeUtilityV1State;
  normalizedInputs: NormalizedInputsV1;
  ctx: StepContextV1;
}): Promise<AnalyzeUtilityV1Delta> {
  const { inputs, deps, warn, beginStep, endStep } = args.ctx as any;

  const depsHasIntervalKwSeries = Array.isArray(deps?.intervalKwSeries) ? deps?.intervalKwSeries : null;
  const depsHasEconomicsOverrides = deps && Object.prototype.hasOwnProperty.call(deps, 'storageEconomicsOverridesV1');
  const depsHasBatteryDecisionConstraints = deps && Object.prototype.hasOwnProperty.call(deps, 'batteryDecisionConstraintsV1');

  const intervalResolutionMinutesHint =
    inputs.intervalDataRef?.resolution === '15min'
      ? 15
      : inputs.intervalDataRef?.resolution === 'hourly'
        ? 60
        : inputs.intervalDataRef?.resolution === 'daily'
          ? 1440
          : null;

  beginStep('normalizeIntervalInputsV1');
  const normalizedFromCanonicalPoints: NormalizedIntervalV1 | null = normalizeIntervalInputsV1({
    intervalPointsV1: Array.isArray(deps?.intervalPointsV1) ? deps?.intervalPointsV1 : null,
    resolutionMinutesHint: intervalResolutionMinutesHint,
  });

  const needProjectTelemetry =
    Boolean((!normalizedFromCanonicalPoints || !normalizedFromCanonicalPoints.seriesKw.length) && !depsHasIntervalKwSeries) ||
    !depsHasEconomicsOverrides ||
    !depsHasBatteryDecisionConstraints;
  const projectTelemetry = needProjectTelemetry ? await tryLoadProjectTelemetry(inputs, warn) : null;

  const intervalKwRaw: any[] | null =
    (normalizedFromCanonicalPoints && normalizedFromCanonicalPoints.seriesKw.length
      ? normalizedFromCanonicalPoints.seriesKw.map((p) => ({ timestampIso: p.tsIso, kw: p.kw }))
      : null) ??
    (depsHasIntervalKwSeries ?? intervalKwFromProjectTelemetry(projectTelemetry, warn) ?? (projectTelemetry ? null : await tryLoadIntervalKwFromProject(inputs, warn)));

  const normalizedInterval: NormalizedIntervalV1 | null =
    normalizedFromCanonicalPoints ??
    normalizeIntervalInputsV1({
      intervalKwSeries: Array.isArray(intervalKwRaw) ? (intervalKwRaw as any) : null,
      resolutionMinutesHint: intervalResolutionMinutesHint,
    });

  const intervalKwSeries: Array<{ timestampIso: string; kw: number }> = normalizedInterval ? normalizedInterval.seriesKw.map((p) => ({ timestampIso: p.tsIso, kw: p.kw })) : [];
  endStep('normalizeIntervalInputsV1');

  const storageEconomicsOverridesV1 = depsHasEconomicsOverrides ? (deps as any).storageEconomicsOverridesV1 || null : (projectTelemetry as any)?.storageEconomicsOverridesV1 || null;
  const batteryDecisionConstraintsV1 = depsHasBatteryDecisionConstraints
    ? ((deps as any).batteryDecisionConstraintsV1 || null)
    : ((projectTelemetry as any)?.batteryDecisionConstraintsV1 || null);

  const nextNormalizedInputs: NormalizedInputsV1 = {
    ...args.normalizedInputs,
    normalizedIntervalV1: normalizedInterval,
    hasInterval: Boolean(normalizedInterval && normalizedInterval.seriesKw && normalizedInterval.seriesKw.length),
    intervalDays:
      normalizedInterval && (normalizedInterval as any)?.coverage && Number.isFinite(Number((normalizedInterval as any).coverage.days))
        ? Number((normalizedInterval as any).coverage.days)
        : args.normalizedInputs.intervalDays ?? null,
    granularityMinutes:
      normalizedInterval && Number.isFinite(Number((normalizedInterval as any).granularityMinutes)) ? Number((normalizedInterval as any).granularityMinutes) : args.normalizedInputs.granularityMinutes ?? null,
  };

  return {
    normalizedInputs: nextNormalizedInputs,
    normalizedFromCanonicalPoints,
    projectTelemetry,
    intervalKwRaw,
    normalizedInterval,
    intervalKwSeries,
    storageEconomicsOverridesV1,
    batteryDecisionConstraintsV1,
    intervalResolutionMinutesHint,
  };
}

