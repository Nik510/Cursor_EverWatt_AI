import { apiRequest } from './client';

export type UtilityRegistryItemV1 = {
  utilityKey: string;
  displayName: string;
  utilityType: 'IOU' | 'POU' | 'CCA';
  type?: 'IOU' | 'POU' | 'CCA';
  state: 'CA';
  commodities?: Array<'ELECTRIC' | 'GAS'>;
  territoryNotes?: string;
  tariffAcquisitionByCommodity?: Partial<
    Record<'ELECTRIC' | 'GAS', 'AUTOMATED_HTML' | 'AUTOMATED_JSON' | 'MANUAL_PDF' | 'MANUAL_LINKS' | 'MANUAL_GAS_V0' | 'UNKNOWN'>
  >;
  primaryTariffSourceUrlsByCommodity?: Partial<Record<'ELECTRIC' | 'GAS', string[]>>;
  tariffAcquisitionMethod: 'AUTOMATED_HTML' | 'AUTOMATED_JSON' | 'MANUAL_PDF' | 'MANUAL_LINKS' | 'MANUAL_GAS_V0' | 'UNKNOWN';
  primaryTariffSourceUrls: string[];
  sources?: { tariffs?: string[]; programs?: string[] };
  confidenceLevel: 'authoritative' | 'partial' | 'stub';
  cadence?: 'daily' | 'weekly' | 'monthly' | 'manual';
  tags?: string[];
};

export type UtilitiesCaRegistryResponse = {
  success: true;
  utilities: UtilityRegistryItemV1[];
  warnings?: string[];
  errors?: any[];
};

export async function getUtilitiesCaRegistry() {
  return apiRequest<UtilitiesCaRegistryResponse>({ url: '/api/utilities/ca/registry' });
}

