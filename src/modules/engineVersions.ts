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
export const dispatchVersion = 'dispatch_v1_1' as const;
export const exitFeesVersion = 'exit_fees_v0' as const;
export const storageEconomicsVersion = 'storage_econ_v1.0' as const;
export const incentivesStubVersion = 'incentives_stub_v1.0' as const;
export const sgipVersion = 'sgip_v0' as const;
export const taxVersion = 'tax_v0' as const;
export const degradationVersion = 'degradation_v0' as const;
export const batteryEconomicsVersion = 'battery_econ_v1.3' as const;
export const batteryDecisionPackVersion = 'battery_decision_pack_v1.2' as const;

export const engineVersions = {
  intervalIntake: intervalIntakeVersion,
  determinants: determinantsVersion,
  tariffEngine: tariffEngineVersion,
  billingEngineV1: billingEngineV1Version,
  dispatch: dispatchVersion,
  exitFees: exitFeesVersion,
  storageEconomics: storageEconomicsVersion,
  incentivesStub: incentivesStubVersion,
  sgip: sgipVersion,
  tax: taxVersion,
  degradation: degradationVersion,
  batteryEconomics: batteryEconomicsVersion,
  batteryDecisionPack: batteryDecisionPackVersion,
} as const;

export type EngineVersionsV1 = typeof engineVersions;

