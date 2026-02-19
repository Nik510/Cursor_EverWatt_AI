import type { UtilityInputs } from '../types';
import type { ComprehensiveBillRecord } from '../../../utils/utility-data-types';

export type SupplyTypeV1 = 'bundled' | 'CCA' | 'DA' | 'unknown';

export type SupplyStructureInsightV1 = {
  supplyType: SupplyTypeV1;
  confidence: number; // 0..1
  because: string[];
  evidence?: {
    serviceProvider?: string;
    espTotalRevenueAmount?: number;
    pgeRevenueAmount?: number;
    totalBillAmount?: number;
    trueTotalUsed?: number;
    source?: 'bill_records' | 'bill_pdf' | 'rate_context';
  };
  recommendation?: {
    title: string;
    because: string[];
    confidence: number;
  };
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normText(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase();
}

function pickLatestBill(bills: ComprehensiveBillRecord[]): ComprehensiveBillRecord | null {
  if (!bills.length) return null;
  const sorted = [...bills].sort((a, b) => {
    const ta = a?.billEndDate ? new Date(a.billEndDate as any).getTime() : 0;
    const tb = b?.billEndDate ? new Date(b.billEndDate as any).getTime() : 0;
    return ta - tb;
  });
  return sorted[sorted.length - 1] || null;
}

function trueTotalFromBill(b: ComprehensiveBillRecord): number {
  const candidates = [
    Number(b.totalBillAmount),
    Number(b.totalBillAmountPge),
    Number(b.pgeRevenueAmount) + Number(b.espTotalRevenueAmount) + Number(b.taxAmount),
    Number(b.pgeRevenueAmount) + Number(b.espTotalRevenueAmount),
  ].filter((n) => Number.isFinite(n) && n > 0);
  if (!candidates.length) return 0;
  return Math.max(...candidates);
}

export function analyzeSupplyStructure(args: {
  inputs: UtilityInputs;
  billingRecords?: ComprehensiveBillRecord[] | null;
  billPdfText?: string | null;
}): SupplyStructureInsightV1 | null {
  const because: string[] = [];
  let supplyType: SupplyTypeV1 = 'unknown';
  let confidence = 0.1;
  const evidence: SupplyStructureInsightV1['evidence'] = {};

  const bills = Array.isArray(args.billingRecords) ? args.billingRecords : [];
  const bill = bills.length ? pickLatestBill(bills) : null;

  const pdfText = normText(args.billPdfText || '');
  const pdfHasDaKeywords =
    pdfText.includes('direct access') || pdfText.includes('electric service provider') || /\besp\b/.test(pdfText);
  const pdfHasCcaKeywords = pdfText.includes('community choice aggregation') || /\bcca\b/.test(pdfText);

  const iouMarkers = ['pg&e', 'pge', 'sce', 'sdg&e', 'sdge'];
  const isIouProvider = (providerNorm: string) => iouMarkers.some((m) => providerNorm.includes(m));

  const providerLooksCca = (providerNorm: string) => {
    if (!providerNorm) return false;
    if (providerNorm.includes('community choice') || providerNorm.includes('cca')) return true;
    if (providerNorm.includes('community energy')) return true;
    if (providerNorm.includes('clean energy')) return true;
    if (providerNorm.includes('choice energy')) return true;
    // Heuristic: non-IOU provider that looks like a generation provider name.
    if (!isIouProvider(providerNorm) && providerNorm.includes('energy')) return true;
    return false;
  };

  const providerHasEspToken = (providerNorm: string) => {
    if (!providerNorm) return false;
    if (providerNorm.includes('direct access')) return true;
    if (providerNorm.includes('energy service provider')) return true;
    if (/\besp\b/.test(providerNorm)) return true;
    return false;
  };

  if (bill) {
    const serviceProvider = String(bill.serviceProvider || '').trim();
    const providerNorm = normText(serviceProvider);
    const espTotal = Number(bill.espTotalRevenueAmount) || 0;
    const pgeRev = Number(bill.pgeRevenueAmount) || 0;
    const totalBill = Number(bill.totalBillAmount) || 0;
    const trueTotal = trueTotalFromBill(bill);

    evidence.serviceProvider = serviceProvider || undefined;
    evidence.espTotalRevenueAmount = Number.isFinite(espTotal) ? espTotal : undefined;
    evidence.pgeRevenueAmount = Number.isFinite(pgeRev) ? pgeRev : undefined;
    evidence.totalBillAmount = Number.isFinite(totalBill) ? totalBill : undefined;
    evidence.trueTotalUsed = Number.isFinite(trueTotal) ? trueTotal : undefined;
    evidence.source = 'bill_records';

    if (trueTotal > 0) {
      because.push(`Using highest total-dollar line as true total: $${trueTotal.toFixed(2)}.`);
    }

    const daByEspRevenue = espTotal > 0;
    const daByProvider = providerHasEspToken(providerNorm);
    const ccaByProvider = providerLooksCca(providerNorm);
    const bundledByProvider = isIouProvider(providerNorm) && espTotal === 0;

    // Rule order (required):
    // 1) DA if ESP revenue > 0 OR DA/ESP keywords in provider/PDF
    // 2) CCA if CCA keywords in PDF OR provider matches CCA patterns (no ESP revenue requirement)
    // 3) Bundled if IOU provider + no ESP revenue + no CCA/DA keywords
    if (daByEspRevenue) {
      supplyType = 'DA';
      confidence = Math.max(confidence, 0.85);
      because.push(`espTotalRevenueAmount > 0 ($${espTotal.toFixed(2)}) → Direct Access (DA).`);
      evidence.source = evidence.source || 'bill_records';
    } else if (pdfHasDaKeywords || daByProvider) {
      supplyType = 'DA';
      confidence = Math.max(confidence, 0.75);
      because.push(`${pdfHasDaKeywords ? 'PDF contains Direct Access/ESP keywords' : 'Service provider contains ESP/DA keywords'} → Direct Access (DA).`);
      evidence.source = evidence.source || (pdfHasDaKeywords ? 'bill_pdf' : 'bill_records');
    } else if (pdfHasCcaKeywords || ccaByProvider) {
      supplyType = 'CCA';
      confidence = Math.max(confidence, pdfHasCcaKeywords ? 0.9 : 0.75);
      because.push(`${pdfHasCcaKeywords ? 'PDF contains Community Choice Aggregation/CCA' : 'Service provider matches CCA patterns'} → CCA.`);
      evidence.source = evidence.source || (pdfHasCcaKeywords ? 'bill_pdf' : 'bill_records');
    } else if (bundledByProvider && !pdfHasDaKeywords && !pdfHasCcaKeywords && !daByProvider && !ccaByProvider) {
      supplyType = 'bundled';
      confidence = Math.max(confidence, 0.85);
      because.push('IOU service provider with espTotalRevenueAmount=0 and no CCA/DA keywords → bundled service.');
      evidence.source = evidence.source || 'bill_records';
    }
  }

  // If no bill record, fall back to PDF-only detection (rule order preserved).
  if (!bill && pdfText) {
    if (pdfHasDaKeywords) {
      supplyType = 'DA';
      confidence = Math.max(confidence, 0.8);
      because.push('PDF contains Direct Access / Electric Service Provider / ESP → Direct Access (DA).');
      evidence.source = 'bill_pdf';
    } else if (pdfHasCcaKeywords) {
      supplyType = 'CCA';
      confidence = Math.max(confidence, 0.85);
      because.push('PDF contains Community Choice Aggregation / CCA → CCA.');
      evidence.source = 'bill_pdf';
    }
  }

  const rateCode = normText(args.inputs.currentRate?.rateCode || '');
  if (rateCode) {
    if (rateCode.includes('da')) {
      supplyType = 'DA';
      confidence = Math.max(confidence, 0.6);
      because.push(`Rate code suggests Direct Access (contains 'DA'): ${args.inputs.currentRate?.rateCode}.`);
      evidence.source = evidence.source || 'rate_context';
    } else if (rateCode.includes('cca')) {
      supplyType = 'CCA';
      confidence = Math.max(confidence, 0.6);
      because.push(`Rate code suggests CCA supply (contains 'CCA'): ${args.inputs.currentRate?.rateCode}.`);
      evidence.source = evidence.source || 'rate_context';
    }
  }

  if (supplyType === 'unknown') {
    const hasInsufficient = because.some((b) => normText(b).includes('insufficient evidence'));
    return {
      supplyType,
      confidence,
      because: hasInsufficient
        ? because
        : [...because, ...(because.length ? ['Insufficient evidence to determine supply structure (bundled vs CCA vs DA).'] : ['Insufficient evidence to determine supply structure (bundled vs CCA vs DA).'])],
      evidence: Object.keys(evidence).length ? evidence : undefined,
    };
  }

  // Recommendation heuristic (deterministic + conservative)
  let recommendation: SupplyStructureInsightV1['recommendation'] | undefined;
  const espShare =
    bill && trueTotalFromBill(bill) > 0
      ? Number(bill.espTotalRevenueAmount || 0) / trueTotalFromBill(bill)
      : null;

  if (supplyType === 'bundled') {
    recommendation = {
      title: 'Evaluate alternative supply options (CCA/DA) for potential savings',
      because: ['Bundled PG&E service detected; supply alternatives may reduce generation costs depending on local CCA/DA offers.'],
      confidence: 0.35,
    };
  } else if (supplyType === 'CCA' || supplyType === 'DA') {
    if (espShare != null && espShare > 0.5) {
      recommendation = {
        title: 'Review supply provider pricing vs bundled PG&E generation',
        because: [
          `Supply portion appears material (ESP share ≈ ${(espShare * 100).toFixed(0)}% of true total).`,
          'Compare generation rates against bundled PG&E benchmarks before renewal.',
        ],
        confidence: clamp01(0.4 + espShare * 0.4),
      };
    } else {
      recommendation = {
        title: 'Benchmark current supply provider rates',
        because: ['CCA/DA supply detected; compare current supply rate with bundled PG&E to confirm cost impact.'],
        confidence: 0.3,
      };
    }
  }

  return {
    supplyType,
    confidence: clamp01(confidence),
    because,
    evidence: Object.keys(evidence).length ? evidence : undefined,
    ...(recommendation ? { recommendation } : {}),
  };
}

