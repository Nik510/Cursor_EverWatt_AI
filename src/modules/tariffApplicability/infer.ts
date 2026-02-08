import type { ComprehensiveBillRecord } from '../../utils/utility-data-types';
import type { TariffRateMetadata } from '../tariffLibrary/types';
import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';

export type VoltageLevelV1 = 'secondary' | 'primary' | 'transmission' | 'unknown';

export type InferenceResultV1<T> = {
  value: T;
  confidence: number; // 0..1
  because: string[];
  missingInfo: MissingInfoItemV0[];
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function containsAny(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n.toLowerCase()));
}

export function inferVoltage(opts: {
  billingRecords?: ComprehensiveBillRecord[] | null;
  billPdfText?: string | null;
  meterVoltageText?: string | null;
  tariffMetadata?: TariffRateMetadata | null;
}): InferenceResultV1<VoltageLevelV1> {
  const because: string[] = [];
  const missingInfo: MissingInfoItemV0[] = [];

  const meterV = String(opts.meterVoltageText || '').trim();
  if (meterV) {
    if (containsAny(meterV, ['transmission'])) {
      because.push(`Meter metadata indicates transmission voltage ("${meterV}").`);
      return { value: 'transmission', confidence: 0.75, because, missingInfo };
    }
    if (containsAny(meterV, ['primary'])) {
      because.push(`Meter metadata indicates primary voltage ("${meterV}").`);
      return { value: 'primary', confidence: 0.75, because, missingInfo };
    }
    if (containsAny(meterV, ['secondary'])) {
      because.push(`Meter metadata indicates secondary voltage ("${meterV}").`);
      return { value: 'secondary', confidence: 0.75, because, missingInfo };
    }
  }

  const metaV = opts.tariffMetadata?.voltage;
  if (metaV && metaV !== 'unknown') {
    because.push(`Tariff snapshot metadata includes voltage="${metaV}".`);
    return { value: metaV, confidence: 0.65, because, missingInfo };
  }

  const pdf = String(opts.billPdfText || '').trim();
  if (pdf) {
    const lowered = pdf.toLowerCase();
    if (lowered.includes('transmission')) {
      because.push('Bill PDF text contains keyword "Transmission".');
      return { value: 'transmission', confidence: 0.62, because, missingInfo };
    }
    if (lowered.includes('primary')) {
      because.push('Bill PDF text contains keyword "Primary".');
      return { value: 'primary', confidence: 0.62, because, missingInfo };
    }
    if (lowered.includes('secondary')) {
      because.push('Bill PDF text contains keyword "Secondary".');
      return { value: 'secondary', confidence: 0.62, because, missingInfo };
    }
  }

  because.push('Voltage level could not be inferred from meter metadata, tariff metadata, or bill text.');
  missingInfo.push({
    id: 'tariff.applicability.voltage.unknown',
    category: 'tariff',
    severity: 'info',
    description: 'Voltage level (secondary/primary/transmission) is unknown; provide meter metadata or bill text that indicates service voltage.',
  });

  return { value: 'unknown', confidence: 0.35, because, missingInfo };
}

export function inferCustomerClass(opts: {
  rateCode?: string | null;
  billingRecords?: ComprehensiveBillRecord[] | null;
  tariffMetadata?: TariffRateMetadata | null;
}): InferenceResultV1<string | 'unknown'> {
  const because: string[] = [];
  const missingInfo: MissingInfoItemV0[] = [];

  const metaClass = opts.tariffMetadata?.customerClass;
  if (metaClass && metaClass !== 'unknown') {
    because.push(`Tariff snapshot metadata includes customerClass="${metaClass}".`);
    return { value: metaClass, confidence: 0.7, because, missingInfo };
  }

  const rate = String(opts.rateCode || '').toUpperCase().trim();
  if (rate) {
    // Deterministic, small set of family heuristics (scalable later via utility rule tables).
    if (/^A-?\d+/.test(rate)) {
      because.push(`Rate family "${rate}" matches A-*; inferred residential.`);
      return { value: 'residential', confidence: 0.55, because, missingInfo };
    }
    if (/^E-?\d+/.test(rate)) {
      because.push(`Rate family "${rate}" matches E-*; inferred commercial/industrial.`);
      return { value: 'commercial', confidence: 0.5, because, missingInfo };
    }
    if (/^B-?\d+/.test(rate) || rate.includes('B19') || rate.includes('B20')) {
      because.push(`Rate family "${rate}" matches B-*; inferred commercial/industrial.`);
      return { value: 'commercial', confidence: 0.6, because, missingInfo };
    }
  }

  // We don't have a deterministic customerClass field in ComprehensiveBillRecord today.
  const billCount = Array.isArray(opts.billingRecords) ? opts.billingRecords.length : 0;
  because.push(`Customer class could not be inferred from tariff metadata or rate family. billingRecords=${billCount}.`);
  missingInfo.push({
    id: 'tariff.applicability.customerClass.unknown',
    category: 'tariff',
    severity: 'info',
    description: 'Customer class is unknown; provide a rate family (e.g., B-19/B-20) or enrich tariff metadata/customer classification.',
  });

  return { value: 'unknown', confidence: clamp01(0.35 - (billCount > 0 ? 0 : 0)), because, missingInfo };
}

