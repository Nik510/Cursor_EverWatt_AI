import type { BillPdfTariffHintsV1 } from './extractBillPdfTariffHintsV1';
import {
  BillIntelligenceWarningCodesV1,
  type BillIntelligenceV1,
  type BillIntelligenceBillingPeriodFact,
  type BillIntelligenceNumberFact,
  type BillIntelligenceStringFact,
  type BillIntelligenceDerivedMetric,
} from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function normSpace(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
}

function snippetAround(raw: string, index: number, len: number): string {
  if (!raw) return '';
  const start = Math.max(0, index - 32);
  const end = Math.min(raw.length, index + len + 32);
  return normSpace(raw.slice(start, end));
}

function parseDateUsGuarded(args: { raw: string; matchedText: string; utilityHint?: string | null; warnings: BillIntelligenceV1['warnings'] }): string | null {
  const parts = String(args.raw || '')
    .trim()
    .split(/[\/\-]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length !== 3) return null;
  const [p1, p2, yRaw] = parts;
  const a = Number(p1);
  const b = Number(p2);
  const year = yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw);
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(year)) return null;
  if (year < 1900 || year > 2200) return null;

  const usUtility = ['PGE', 'PG&E', 'SCE', 'SDGE', 'SDG&E'].includes(String(args.utilityHint || '').toUpperCase().replace(/[^A-Z&]/g, ''));
  const explicitUsHint = /mm[\/\-]dd[\/\-]yyyy/i.test(args.matchedText || '');
  const ambiguous = a <= 12 && b <= 12 && a !== b && !explicitUsHint && !usUtility;
  if (ambiguous) {
    addWarning(
      args.warnings,
      BillIntelligenceWarningCodesV1.BILL_INTEL_BILLING_PERIOD_AMBIGUOUS_DATE_FORMAT,
      `Ambiguous date format: ${args.raw} | snippet=${snippetAround(args.matchedText || args.raw, 0, args.raw.length)}`
    );
    return null;
  }

  const month = a;
  const day = b;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function parseNumber(raw: string): number | null {
  const s = String(raw || '').replace(/[,]/g, '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function addWarning(
  arr: BillIntelligenceV1['warnings'],
  code: BillIntelligenceV1['warnings'][number]['code'],
  reason: string
): void {
  const key = `${code}|${reason}`.toLowerCase();
  if (arr.some((w) => `${w.code}|${w.reason}`.toLowerCase() === key)) return;
  arr.push({ code, reason });
}

function deriveMetric(args: {
  value: number;
  unit: string;
  inputsUsed: string[];
}): BillIntelligenceDerivedMetric {
  return {
    value: args.value,
    unit: args.unit,
    source: 'derived_math',
    confidence: 'derived',
    inputsUsed: args.inputsUsed,
  };
}

export function analyzeBillIntelligenceV1(args: {
  billPdfText?: string | null;
  billPdfTariffTruth?: BillPdfTariffHintsV1 | null;
}): BillIntelligenceV1 {
  const rawText = String(args.billPdfText || '').trim();
  const warnings: BillIntelligenceV1['warnings'] = [];

  const extractedFacts: BillIntelligenceV1['extractedFacts'] = {};
  const derivedMetrics: BillIntelligenceV1['derivedMetrics'] = {};

  // Reuse bill tariff truth when available (do not re-extract).
  if (args.billPdfTariffTruth?.utilityHint) {
    const matched = String(args.billPdfTariffTruth.evidence?.matchedText?.[0] || args.billPdfTariffTruth.utilityHint || '').trim();
    extractedFacts.utilityHint = {
      value: String(args.billPdfTariffTruth.utilityHint),
      source: 'bill_pdf',
      evidence: { ruleId: 'bill_tariff_truth.utility_hint', matchedText: matched, source: 'bill_pdf' },
    };
  }
  if (args.billPdfTariffTruth?.rateScheduleText) {
    const matched = String(args.billPdfTariffTruth.evidence?.matchedText?.[0] || args.billPdfTariffTruth.rateScheduleText || '').trim();
    extractedFacts.rateScheduleText = {
      value: String(args.billPdfTariffTruth.rateScheduleText),
      source: 'bill_pdf',
      evidence: { ruleId: 'bill_tariff_truth.rate_schedule_text', matchedText: matched, source: 'bill_pdf' },
    };
  }

  if (rawText) {
    const billingPeriodRe =
      /billing\s*(?:period|cycle)\s*[:\-]\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})\s*(?:to|\-|–|—)\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i;

    const kwhRe =
      /(total\s+kwh(?:\s+used)?|usage\s*\(kwh\)|total\s+usage)[\s:–-]*([0-9][0-9,\.]*)/i;

    const dollarsLabelRes: Array<{ label: string; re: RegExp; priority: number }> = [
      { label: 'Amount Due', re: /(amount\s+due)[\s:–-]*\$?\s*([0-9][0-9,]*\.?[0-9]{0,2})/i, priority: 1 },
      { label: 'Total Current Charges', re: /(total\s+current\s+charges)[\s:–-]*\$?\s*([0-9][0-9,]*\.?[0-9]{0,2})/i, priority: 2 },
      { label: 'Total Charges', re: /(total\s+charges)[\s:–-]*\$?\s*([0-9][0-9,]*\.?[0-9]{0,2})/i, priority: 3 },
    ];

    const peakLabelRes: Array<{ label: string; re: RegExp; priority: number }> = [
      { label: 'Billed Demand', re: /(billed\s+demand[^\n\r]*?kW)[\s:–-]*([0-9][0-9,\.]*)/i, priority: 1 },
      { label: 'Peak Demand', re: /(peak\s+demand[^\n\r]*?kW)[\s:–-]*([0-9][0-9,\.]*)/i, priority: 2 },
    ];

    const billingMatch = billingPeriodRe.exec(rawText);
    if (billingMatch) {
      const matchedSnippet = snippetAround(rawText, billingMatch.index, billingMatch[0].length);
      const startIso = parseDateUsGuarded({
        raw: billingMatch[1],
        matchedText: matchedSnippet,
        utilityHint: args.billPdfTariffTruth?.utilityHint,
        warnings,
      });
      const endIso = parseDateUsGuarded({
        raw: billingMatch[2],
        matchedText: matchedSnippet,
        utilityHint: args.billPdfTariffTruth?.utilityHint,
        warnings,
      });
      if (startIso && endIso) {
        const startMs = new Date(`${startIso}T00:00:00.000Z`).getTime();
        const endMs = new Date(`${endIso}T00:00:00.000Z`).getTime();
        if (endMs >= startMs) {
          const days = Math.floor((endMs - startMs) / MS_PER_DAY) + 1;
          extractedFacts.billingPeriod = {
            startDateIso: startIso,
            endDateIso: endIso,
            days: Number.isFinite(days) ? days : undefined,
            source: 'bill_pdf',
            evidence: {
              ruleId: 'billing_period_label',
              matchedText: matchedSnippet,
              source: 'bill_pdf',
            },
          };
        } else {
          addWarning(
            warnings,
            BillIntelligenceWarningCodesV1.BILL_INTEL_BILLING_PERIOD_INVALID_RANGE,
            `Billing period end before start | snippet=${matchedSnippet}`
          );
        }
      }
    }

    const kwhMatch = kwhRe.exec(rawText);
    if (kwhMatch) {
      const val = parseNumber(kwhMatch[2]);
      if (Number.isFinite(val)) {
        extractedFacts.totalKwh = {
          value: val as number,
          unit: 'kWh',
          source: 'bill_pdf',
          evidence: {
            ruleId: 'total_kwh_label',
            matchedText: snippetAround(rawText, kwhMatch.index, kwhMatch[0].length),
            source: 'bill_pdf',
          },
        };
      }
    }

    const dollarCandidates: Array<{ priority: number; value: number; snippet: string }> = [];
    for (const cand of dollarsLabelRes) {
      let m;
      const re = new RegExp(cand.re.source, cand.re.flags);
      while ((m = re.exec(rawText)) !== null) {
        const val = parseNumber(m[2]);
        if (!Number.isFinite(val)) continue;
        dollarCandidates.push({ priority: cand.priority, value: val as number, snippet: snippetAround(rawText, m.index, m[0].length) });
      }
    }
    if (dollarCandidates.length) {
      dollarCandidates.sort((a, b) => a.priority - b.priority);
      const chosen = dollarCandidates[0];
      extractedFacts.totalDollars = {
        value: chosen.value,
        unit: 'USD',
        source: 'bill_pdf',
        evidence: { ruleId: 'total_dollars_label', matchedText: chosen.snippet, source: 'bill_pdf' },
      };
      if (dollarCandidates.length > 1) {
        addWarning(
          warnings,
          BillIntelligenceWarningCodesV1.BILL_INTEL_MULTIPLE_DOLLARS_CANDIDATES,
          `Multiple dollar labels found: ${dollarCandidates.slice(0, 3).map((c) => c.snippet).join(' | ')}`
        );
      }
    }

    const peakCandidates: Array<{ priority: number; value: number; snippet: string }> = [];
    for (const cand of peakLabelRes) {
      let m;
      const re = new RegExp(cand.re.source, cand.re.flags);
      while ((m = re.exec(rawText)) !== null) {
        const val = parseNumber(m[2]);
        if (!Number.isFinite(val)) continue;
        peakCandidates.push({ priority: cand.priority, value: val as number, snippet: snippetAround(rawText, m.index, m[0].length) });
      }
    }
    if (peakCandidates.length) {
      peakCandidates.sort((a, b) => a.priority - b.priority);
      const chosen = peakCandidates[0];
      extractedFacts.peakKw = {
        value: chosen.value,
        unit: 'kW',
        source: 'bill_pdf',
        evidence: { ruleId: 'peak_kw_label', matchedText: chosen.snippet, source: 'bill_pdf' },
      };
      if (peakCandidates.length > 1) {
        addWarning(
          warnings,
          BillIntelligenceWarningCodesV1.BILL_INTEL_MULTIPLE_PEAK_KW_CANDIDATES,
          `Multiple peak kW labels found: ${peakCandidates.slice(0, 3).map((c) => c.snippet).join(' | ')}`
        );
      }
    }
  }

  const totalKwh = extractedFacts.totalKwh?.value;
  const totalDollars = extractedFacts.totalDollars?.value;
  const billingDays = extractedFacts.billingPeriod?.days;
  const peakKw = extractedFacts.peakKw?.value;

  if (Number.isFinite(totalDollars) && Number.isFinite(totalKwh) && totalKwh !== 0) {
    derivedMetrics.blendedRate = deriveMetric({
      value: (totalDollars as number) / (totalKwh as number),
      unit: 'USD_per_kWh',
      inputsUsed: ['totalDollars', 'totalKwh'],
    });
  }

  if (Number.isFinite(totalKwh) && Number.isFinite(billingDays) && (billingDays as number) > 0) {
    derivedMetrics.avgDailyKwh = deriveMetric({
      value: (totalKwh as number) / (billingDays as number),
      unit: 'kWh_per_day',
      inputsUsed: ['totalKwh', 'billingPeriod'],
    });
    derivedMetrics.avgKw = deriveMetric({
      value: (totalKwh as number) / ((billingDays as number) * 24),
      unit: 'kW',
      inputsUsed: ['totalKwh', 'billingPeriod'],
    });
  }

  if (Number.isFinite(peakKw) && (peakKw as number) > 0 && Number.isFinite(derivedMetrics.avgKw?.value) && (derivedMetrics.avgKw?.value as number) >= 0) {
    derivedMetrics.demandFactorApprox = deriveMetric({
      value: (derivedMetrics.avgKw?.value as number) / (peakKw as number),
      unit: 'ratio',
      inputsUsed: ['avgKw', 'peakKw'],
    });
  }

  // Missing fact warnings
  if (!Number.isFinite(totalKwh)) {
    addWarning(warnings, BillIntelligenceWarningCodesV1.BILL_INTEL_MISSING_TOTAL_KWH, 'Total kWh not found (requires explicit "Total kWh" label).');
  }
  if (!Number.isFinite(totalDollars)) {
    addWarning(
      warnings,
      BillIntelligenceWarningCodesV1.BILL_INTEL_MISSING_TOTAL_DOLLARS,
      'Total dollars / Amount Due not found (requires explicit Amount Due/Total Charges label).'
    );
  }
  if (!extractedFacts.billingPeriod) {
    addWarning(
      warnings,
      BillIntelligenceWarningCodesV1.BILL_INTEL_MISSING_BILLING_PERIOD_DATES,
      'Billing period dates not found (requires explicit "Billing Period" label).'
    );
  }
  if (!Number.isFinite(peakKw)) {
    addWarning(
      warnings,
      BillIntelligenceWarningCodesV1.BILL_INTEL_MISSING_PEAK_KW,
      'Peak kW / billed demand not found (requires explicit kW label).'
    );
  }

  // Sanity checks (do not alter values).
  if (Number.isFinite(derivedMetrics.blendedRate?.value) && (derivedMetrics.blendedRate?.value as number) > 2) {
    addWarning(
      warnings,
      BillIntelligenceWarningCodesV1.BILL_INTEL_SANITY_OUTLIER,
      `blendedRate high=${(derivedMetrics.blendedRate?.value as number).toFixed(3)} | inputs=${(derivedMetrics.blendedRate?.inputsUsed || []).join(',')}`
    );
  }
  if (
    Number.isFinite(derivedMetrics.demandFactorApprox?.value) &&
    (derivedMetrics.demandFactorApprox?.value as number) > 1.2
  ) {
    addWarning(
      warnings,
      BillIntelligenceWarningCodesV1.BILL_INTEL_SANITY_OUTLIER,
      `demandFactorApprox high=${(derivedMetrics.demandFactorApprox?.value as number).toFixed(3)} | inputs=${(derivedMetrics.demandFactorApprox?.inputsUsed || []).join(',')}`
    );
  }
  if (
    Number.isFinite(derivedMetrics.avgKw?.value) &&
    Number.isFinite(peakKw) &&
    (derivedMetrics.avgKw?.value as number) > (peakKw as number)
  ) {
    addWarning(
      warnings,
      BillIntelligenceWarningCodesV1.BILL_INTEL_SANITY_OUTLIER,
      `avgKw>${peakKw} | avgKw=${(derivedMetrics.avgKw?.value as number).toFixed(3)}`
    );
  }

  // Always include prerequisites for deeper analysis.
  addWarning(
    warnings,
    BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_REQUIRED,
    'Interval data required to validate bill-derived usage and demand.'
  );
  addWarning(
    warnings,
    BillIntelligenceWarningCodesV1.BILL_INTEL_WEATHER_DATA_REQUIRED,
    'Weather data required to contextualize usage vs. temperature.'
  );

  return {
    extractedFacts,
    derivedMetrics,
    warnings,
  };
}
