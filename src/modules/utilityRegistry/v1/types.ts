export type UtilityTypeV1 = 'IOU' | 'POU' | 'CCA';
export type UtilityStateV1 = 'CA';
export type UtilityConfidenceLevelV1 = 'authoritative' | 'partial' | 'stub';
export type UtilityCadenceV1 = 'daily' | 'weekly' | 'monthly' | 'manual';
export type TariffAcquisitionMethodV1 =
  | 'AUTOMATED_HTML'
  | 'AUTOMATED_JSON'
  | 'MANUAL_PDF'
  | 'MANUAL_LINKS'
  | 'MANUAL_GAS_V0'
  | 'UNKNOWN';
export type UtilityCommodityV1 = 'ELECTRIC' | 'GAS';

export type UtilityV1 = {
  utilityKey: string;
  displayName: string;
  /** Primary classification used by UI and APIs. */
  utilityType: UtilityTypeV1;
  /** Backwards-compatible alias (deprecated). */
  type?: UtilityTypeV1;
  state: UtilityStateV1;
  /** Supported commodities for this utility key (multi-commodity allowed). */
  commodities: UtilityCommodityV1[];
  territoryNotes?: string;
  /**
   * Optional commodity-specific acquisition method mapping (preferred when present).
   * This avoids “single method per org” ambiguity when electric vs gas differ.
   */
  tariffAcquisitionByCommodity?: Partial<Record<UtilityCommodityV1, TariffAcquisitionMethodV1>>;
  /**
   * Optional commodity-specific primary sources (preferred when present).
   * Use this when a utility has different tariff indices/portals per commodity.
   */
  primaryTariffSourceUrlsByCommodity?: Partial<Record<UtilityCommodityV1, string[]>>;
  tariffAcquisitionMethod: TariffAcquisitionMethodV1;
  primaryTariffSourceUrls: string[];
  sources?: { tariffs?: string[]; programs?: string[] };
  confidenceLevel: UtilityConfidenceLevelV1;
  cadence?: UtilityCadenceV1;
  tags?: string[];
};

