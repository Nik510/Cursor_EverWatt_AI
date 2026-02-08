import type { UtilityInputs } from './types';

export function addMissing(list: string[], key: string, message: string): void {
  const k = String(key || '').trim();
  const msg = String(message || '').trim();
  const line = msg || k || 'missing input';
  if (!line) return;
  if (!list.includes(line)) list.push(line);
}

/**
 * Conservative missing-input detection.
 * Unknown or not-provided inputs are treated as missing when needed.
 */
export function getUtilityMissingInputs(inputs: UtilityInputs): string[] {
  const missing: string[] = [];

  if (!String(inputs.orgId || '').trim()) addMissing(missing, 'orgId', 'Organization id required');
  if (!String(inputs.projectId || '').trim()) addMissing(missing, 'projectId', 'Project id required');
  if (!inputs.serviceType) addMissing(missing, 'serviceType', 'Service type required (electric/gas/both)');

  // Territory is needed for almost everything we want to recommend safely.
  if (!String(inputs.utilityTerritory || '').trim()) {
    addMissing(missing, 'utilityTerritory', 'Utility territory required to match rates and programs (e.g., PGE)');
  }

  // Rate fit requires current rate code, otherwise we can only suggest collecting it.
  if (!inputs.currentRate?.rateCode) {
    addMissing(missing, 'currentRate.rateCode', 'Current tariff/rate code required to evaluate rate fit');
  }

  // Interval analytics (load shape, shifting, DR) require interval data reference or a provided series via adapter.
  if (!inputs.intervalDataRef?.telemetrySeriesId) {
    addMissing(missing, 'intervalDataRef', 'Interval data reference required for load shape, load shifting, and demand response eligibility');
  }

  // Programs often need NAICS or customer type.
  if (!String(inputs.naicsCode || '').trim()) {
    addMissing(missing, 'naicsCode', 'NAICS code required to match many utility/ISO programs');
  }
  if (!String(inputs.customerType || '').trim()) {
    addMissing(missing, 'customerType', 'Customer segment/type required to match many utility/ISO programs');
  }

  return missing;
}

