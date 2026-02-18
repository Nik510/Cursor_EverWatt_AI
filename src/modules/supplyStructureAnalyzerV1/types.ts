import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';

export type SupplyServiceTypeV1 = 'IOU_ONLY' | 'CCA' | 'DA' | 'UNKNOWN';
export type SupplyProviderTypeV1 = 'NONE' | 'CCA' | 'DA';
export type CaIouUtilityV1 = 'PGE' | 'SCE' | 'SDGE' | 'UNKNOWN';

export type SupplyStructureAnalyzerBillHintsV1 = {
  utilityHint?: string | null;
  rateScheduleText?: string | null;
};

export type SupplyStructureEvidenceV1 = {
  matchedPhrases: string[];
};

export type SupplyStructureAnalyzerOutputV1 = {
  /** Back-compat service type tag (v1). Prefer `providerType`. */
  serviceType: SupplyServiceTypeV1;
  /** First-class supply provider type (v1.2): NONE | CCA | DA. */
  providerType: SupplyProviderTypeV1;
  iouUtility: CaIouUtilityV1;
  /** CCA only. */
  lseName: string | null;
  /** DA only. */
  daProviderName: string | null;
  confidence: number; // 0..1
  evidence: SupplyStructureEvidenceV1;
  warnings: string[];
  missingInfo: MissingInfoItemV0[];
};

export type EffectiveRateContextV1 = {
  iou: { utility: string; rateCode: string | null; snapshotId: string | null };
  generation: {
    providerType: 'CCA' | 'DA' | null;
    lseName: string | null;
    daProviderName?: string | null;
    /** SSA confidence + evidence (deterministic, bounded). */
    confidence?: number | null;
    evidence?: SupplyStructureEvidenceV1 | null;
    /** Optional composed generation rate code (e.g. ccaId@effectiveStartYmd). */
    rateCode: string | null;
    /** Optional generation snapshot id for audit/provenance. */
    snapshotId: string | null;
    /** Optional generation TOU energy windows (energy only) when available. */
    generationTouEnergyPrices?: Array<{
      periodId: string;
      startHourLocal: number;
      endHourLocalExclusive: number;
      days: 'all' | 'weekday' | 'weekend';
      pricePerKwh: number;
    }> | null;
    /**
     * Alias for `generationTouEnergyPrices` (naming clarity: energy-only component).
     * Kept additive for backward compatibility.
     */
    generationEnergyTouPrices?: Array<{
      periodId: string;
      startHourLocal: number;
      endHourLocalExclusive: number;
      days: 'all' | 'weekday' | 'weekend';
      pricePerKwh: number;
    }> | null;
    /** Optional blended $/kWh adders (PCIA/NBC/other riders). */
    generationAddersPerKwhTotal?: number | null;
    /** Optional adders snapshot id/version tag for audit trail. */
    generationAddersSnapshotId?: string | null;
    /** Optional method tag for adders acquisition (v0 only). */
    generationAddersAcquisitionMethodUsed?: 'MANUAL_SEED_V0' | null;
    /** Optional derived all-in generation TOU energy windows (energy + adders). */
    generationAllInTouEnergyPrices?: Array<{
      periodId: string;
      startHourLocal: number;
      endHourLocalExclusive: number;
      days: 'all' | 'weekday' | 'weekend';
      pricePerKwh: number;
    }> | null;
    /** Optional exit fees snapshot id for audit/provenance (PCIA/NBC/other). */
    exitFeesSnapshotId?: string | null;
    /** Optional flat NBC total ($/kWh) applied to derive all-in-with-exit-fees prices (v0). */
    nbcPerKwhTotal?: number | null;
    /** Optional flat PCIA ($/kWh) applied (v0 applies default when vintage is unknown). */
    pciaPerKwhApplied?: number | null;
    /** Optional other exiting/departing-load fees total ($/kWh) applied (v0). */
    otherExitFeesPerKwhTotal?: number | null;
    /** Optional derived all-in generation TOU windows including exit fees (flat adder in v0). */
    generationAllInWithExitFeesTouPrices?: Array<{
      periodId: string;
      startHourLocal: number;
      endHourLocalExclusive: number;
      days: 'all' | 'weekday' | 'weekend';
      pricePerKwh: number;
    }> | null;
    /** Exit fees warnings/reason codes (warnings-first). */
    exitFeesWarnings?: string[] | null;
  };
  method: 'ssa_v1';
  warnings: string[];
  missingInfo: MissingInfoItemV0[];
};

