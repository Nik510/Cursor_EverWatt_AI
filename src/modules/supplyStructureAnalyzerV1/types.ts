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
  generation: { providerType: 'CCA' | 'DA' | null; lseName: string | null; rateCode: string | null; snapshotId: string | null };
  method: 'ssa_v1';
  warnings: string[];
  missingInfo: MissingInfoItemV0[];
};

