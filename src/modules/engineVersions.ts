/**
 * Deterministic engine version tags.
 *
 * Intent:
 * - Provide traceability for deterministic outputs over time.
 * - Keep version strings centralized and hard-coded (no env, no git hashes).
 *
 * Version bump policy (adopt now; avoid debates later):
 *
 * PATCH (v1.0 → v1.0.1):
 * - Bug fix that does not change outputs for existing fixtures (rare)
 *
 * MINOR (v1.0 → v1.1):
 * - Adds fields / new warnings / broader parsing support
 * - Outputs may expand, but core math unchanged
 *
 * MAJOR (v1.0 → v2.0):
 * - Changes math, bucketing, determinants, charge computation, or interpretation rules
 * - Numeric results can change for the same inputs
 */

export const intervalIntakeVersion = 'interval_csv_v1' as const;
export const determinantsVersion = 'determinants_pack_v1.0' as const;
export const tariffEngineVersion = 'tariff_engine_v1.0' as const;
export const billingEngineV1Version = 'billing_v1.0' as const;

export const engineVersions = {
  intervalIntake: intervalIntakeVersion,
  determinants: determinantsVersion,
  tariffEngine: tariffEngineVersion,
  billingEngineV1: billingEngineV1Version,
} as const;

export type EngineVersionsV1 = typeof engineVersions;

