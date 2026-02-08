import type { EvidenceItemV1 } from '../determinants/types';
import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';

export type LoadAttributionStatusV1 = 'ok' | 'insufficient_data' | 'no_weather';
export type LoadAttributionModelTypeV1 = 'change_point_v0';
export type LoadAttributionClassificationV1 = 'cooling_driven' | 'heating_driven' | 'mixed' | 'base_load';

export type LoadAttributionResultV1 = {
  hasWeather: boolean;
  status: LoadAttributionStatusV1;
  modelType: LoadAttributionModelTypeV1;
  loadAttributionVersionTag: string;
  balanceTempF?: number;
  baseLoadKw?: number;
  coolingSlopeKwPerF?: number;
  heatingSlopeKwPerF?: number;
  r2?: number;
  classification?: LoadAttributionClassificationV1;
  because: string[];
  evidence: EvidenceItemV1[];
  missingInfo: MissingInfoItemV0[];
  warnings?: string[];
};

