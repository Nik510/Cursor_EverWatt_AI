import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';

export type SupplyServiceTypeV1 = 'IOU_ONLY' | 'CCA' | 'DA' | 'UNKNOWN';
export type CaIouUtilityV1 = 'PGE' | 'SCE' | 'SDGE' | 'UNKNOWN';

export type SupplyStructureAnalyzerBillHintsV1 = {
  utilityHint?: string | null;
  rateScheduleText?: string | null;
};

export type SupplyStructureAnalyzerOutputV1 = {
  serviceType: SupplyServiceTypeV1;
  iouUtility: CaIouUtilityV1;
  lseName: string | null;
  confidence: number; // 0..1
  warnings: string[];
  missingInfo: MissingInfoItemV0[];
};

export type EffectiveRateContextV1 = {
  iou: { utility: string; rateCode: string | null; snapshotId: string | null };
  generation: {
    providerType: 'CCA' | 'DA' | null;
    lseName: string | null;
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
  };
  method: 'ssa_v1';
  warnings: string[];
  missingInfo: MissingInfoItemV0[];
};

