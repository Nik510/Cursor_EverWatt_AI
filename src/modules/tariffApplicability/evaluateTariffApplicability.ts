import type { ComprehensiveBillRecord } from '../../utils/utility-data-types';
import type { TariffRateMetadata } from '../tariffLibrary/types';
import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';
import { extractMaxDemandKw } from './demand';
import { inferCustomerClass, inferVoltage } from './infer';
import type { ApplicabilityResult } from './types';
import { evaluatePgeApplicabilityV1 } from './rules/pge';

export type EvaluateTariffApplicabilityInputV1 = {
  utility?: string | null;
  rateCode?: string | null;
  billingRecords?: ComprehensiveBillRecord[] | null;
  billPdfText?: string | null;
  meterVoltageText?: string | null;
  tariffMetadata?: TariffRateMetadata | null;
  supplyType?: 'bundled' | 'CCA' | 'DA' | 'unknown';
  territoryId?: string | null;
  intervalKwSeries?: Array<{ timestampIso: string; kw: number }> | null;
  // For future: kWh intervals with resolution
  intervalKwhSeries?: Array<{ timestampIso: string; kwh: number; resolutionMinutes?: number }> | null;
  intervalResolutionMinutes?: number;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeUtility(u: string): 'PGE' | 'SCE' | 'SDGE' | null {
  const x = String(u || '').trim().toUpperCase();
  if (x === 'PGE' || x === 'PG&E' || x === 'PACIFIC GAS & ELECTRIC') return 'PGE';
  if (x === 'SCE' || x === 'SOUTHERN CALIFORNIA EDISON') return 'SCE';
  if (x === 'SDGE' || x === 'SDG&E' || x === 'SAN DIEGO GAS & ELECTRIC') return 'SDGE';
  return null;
}

export function evaluateTariffApplicabilityV1(input: EvaluateTariffApplicabilityInputV1): ApplicabilityResult {
  const because: string[] = [];
  const warnings: string[] = [];
  const missingInfo: MissingInfoItemV0[] = [];

  const utility = normalizeUtility(String(input.utility || ''));
  const rateCode = String(input.rateCode || '').trim();

  if (!utility) {
    missingInfo.push({
      id: 'tariff.applicability.utility.missing',
      category: 'tariff',
      severity: 'blocking',
      description: 'Utility is missing or unsupported for applicability evaluation (supported: PGE, SCE, SDGE).',
    });
    return {
      status: 'unknown',
      confidence: 0.2,
      because: ['Utility is missing/unsupported; cannot evaluate tariff applicability.'],
      determinants: {
        utility: input.utility || undefined,
        rateCode: rateCode || undefined,
        supplyType: input.supplyType,
        territoryId: input.territoryId ?? null,
        hasIntervalData: Array.isArray(input.intervalKwSeries) ? input.intervalKwSeries.length > 0 : false,
      },
      missingInfo,
      warnings,
    };
  }

  if (!rateCode) {
    missingInfo.push({
      id: 'tariff.applicability.rateCode.missing',
      category: 'tariff',
      severity: 'blocking',
      description: 'Current rate code is missing; cannot evaluate tariff applicability.',
    });
    return {
      status: 'unknown',
      confidence: 0.25,
      because: ['Rate code is missing; cannot evaluate applicability.'],
      determinants: {
        utility,
        supplyType: input.supplyType,
        territoryId: input.territoryId ?? null,
        hasIntervalData: Array.isArray(input.intervalKwSeries) ? input.intervalKwSeries.length > 0 : false,
      },
      missingInfo,
      warnings,
    };
  }

  because.push(`Applicability evaluation v1 (deterministic rules) for utility=${utility}, rateCode=${rateCode}.`);

  const demand = extractMaxDemandKw(input.billingRecords, {
    intervalKw: input.intervalKwSeries || null,
    intervalKwh: input.intervalKwhSeries || null,
    intervalResolutionMinutes: input.intervalResolutionMinutes,
  });
  const voltage = inferVoltage({
    billingRecords: input.billingRecords,
    billPdfText: input.billPdfText,
    meterVoltageText: input.meterVoltageText,
    tariffMetadata: input.tariffMetadata || null,
  });
  const customerClass = inferCustomerClass({
    rateCode,
    billingRecords: input.billingRecords,
    tariffMetadata: input.tariffMetadata || null,
  });

  because.push(...demand.because);
  because.push(...voltage.because);
  because.push(...customerClass.because);

  missingInfo.push(...demand.missingInfo);
  missingInfo.push(...voltage.missingInfo);
  missingInfo.push(...customerClass.missingInfo);

  // Supply is not a blocker for delivery-tariff applicability, but it is context we should surface.
  if (input.supplyType && input.supplyType !== 'bundled') {
    warnings.push('Customer supply structure is not bundled; generation charges may differ even if the delivery tariff is applicable.');
  }

  if (utility === 'PGE') {
    const out = evaluatePgeApplicabilityV1({
      utility: 'PGE',
      rateCode,
      tariffMetadata: input.tariffMetadata || null,
      maxDemandKwObserved: demand.valueKw,
      demandSource: demand.source,
      voltage: voltage.value,
      customerClass: String(customerClass.value || 'unknown'),
      supplyType: input.supplyType,
    });
    // Combine upstream inference context with rule result, without duplicating everything.
    return {
      ...out,
      confidence: clamp01(out.confidence * clamp01(0.6 + 0.4 * demand.confidence)),
      because: [...because, ...out.because],
      determinants: {
        ...out.determinants,
        utility,
        rateCode,
        customerClass: String(customerClass.value || 'unknown'),
        voltage: voltage.value,
        maxDemandKwObserved: demand.valueKw,
        demandSource: demand.source,
        hasIntervalData: Array.isArray(input.intervalKwSeries) ? input.intervalKwSeries.length > 0 : false,
        supplyType: input.supplyType,
        territoryId: input.territoryId ?? null,
      },
      missingInfo: [...missingInfo, ...(out.missingInfo || [])],
      warnings: [...warnings, ...(out.warnings || [])],
    };
  }

  // SCE/SDGE scaffolding
  missingInfo.push({
    id: `tariff.applicability.rules.missing.${utility}`,
    category: 'tariff',
    severity: 'info',
    description: `Applicability rules are not implemented yet for utility ${utility} (v1 supports PG&E B-19/B-20 scaffolding).`,
  });

  return {
    status: 'unknown',
    confidence: 0.3,
    because: [...because, `No rules implemented yet for utility=${utility}.`],
    determinants: {
      utility,
      rateCode,
      customerClass: String(customerClass.value || 'unknown'),
      voltage: voltage.value,
      maxDemandKwObserved: demand.valueKw,
      demandSource: demand.source,
      hasIntervalData: Array.isArray(input.intervalKwSeries) ? input.intervalKwSeries.length > 0 : false,
      supplyType: input.supplyType,
      territoryId: input.territoryId ?? null,
    },
    missingInfo,
    warnings,
  };
}

