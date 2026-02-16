import { getZonedParts } from '../../billingEngineV1/time/zonedTime';

type CanonTouKey = 'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak';

function normSpace(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
}

function snippetAround(raw: string, index: number, len: number): string {
  if (!raw) return '';
  const start = Math.max(0, index - 36);
  const end = Math.min(raw.length, index + len + 36);
  return normSpace(raw.slice(start, end));
}

function parseNumberLoose(raw: string): number | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  const cleaned = s.replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function findLabeledNumber(args: { raw: string; labelRe: RegExp; unitRe?: RegExp }): { value: number; snippet: string } | null {
  const m = args.labelRe.exec(args.raw);
  if (!m) return null;
  // Look for a number token near the label match (same line-ish).
  const tail = args.raw.slice(m.index, Math.min(args.raw.length, m.index + 180));
  if (args.unitRe && !args.unitRe.test(tail)) return null;
  const num = /(-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?)/.exec(tail);
  if (!num) return null;
  const v = parseNumberLoose(num[1]);
  if (v === null) return null;
  return { value: v, snippet: snippetAround(args.raw, m.index, m[0].length) };
}

function parseExplicitDateToken(token: string): { y: number; m: number; d: number } | null {
  const s = String(token || '').trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) };
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (us) {
    const mm = Number(us[1]);
    const dd = Number(us[2]);
    const yyRaw = Number(us[3]);
    const yy = yyRaw < 100 ? 2000 + yyRaw : yyRaw;
    return { y: yy, m: mm, d: dd };
  }
  return null;
}

function toUtcNoonDate(parts: { y: number; m: number; d: number }): Date | null {
  const y = Number(parts.y);
  const m = Number(parts.m);
  const d = Number(parts.d);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (y < 1970 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  // Noon UTC avoids date-shift when converting to America/Los_Angeles, etc.
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

function extractBillEndDate(raw: string): { end: Date; snippet: string } | null {
  // Require explicit labels; no guessing.
  const patterns: RegExp[] = [
    /(?:^|[\n\r])\s*bill(?:ing)?\s*end\s*date\s*[:\-]\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}|\d{4}-\d{2}-\d{2})/i,
    /(?:^|[\n\r])\s*statement\s*date\s*[:\-]\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}|\d{4}-\d{2}-\d{2})/i,
    /(?:^|[\n\r])\s*bill(?:ing)?\s*period\s*[:\-]\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}|\d{4}-\d{2}-\d{2})\s*(?:to|\-)\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}|\d{4}-\d{2}-\d{2})/i,
  ];
  for (const re of patterns) {
    const m = re.exec(raw);
    if (!m) continue;
    const token = String(m[2] || m[1] || '').trim(); // billingPeriod uses group2 as end
    const parsed = parseExplicitDateToken(token);
    if (!parsed) continue;
    const end = toUtcNoonDate(parsed);
    if (!end) continue;
    return { end, snippet: snippetAround(raw, m.index, m[0].length) };
  }
  return null;
}

function monthLabelFromEnd(end: Date, tz: string): string | null {
  const p = getZonedParts(end, tz);
  if (!p) return null;
  return `${p.year}-${String(p.month).padStart(2, '0')}`;
}

export function extractBillPdfTouUsageV1(args: {
  billPdfText: unknown;
  timezone: string;
}): null | {
  cycleLabel: string;
  evidenceSnippets: string[];
  observedTouEnergy?: { values: Partial<Record<CanonTouKey, number>>; fields: Partial<Record<CanonTouKey, string>> };
  observedTouDemand?: { values: Partial<Record<CanonTouKey, number>>; fields: Partial<Record<CanonTouKey, string>> };
  warnings: Array<{ code: string; hint: string }>;
} {
  const raw = String(args.billPdfText || '').trim();
  if (!raw) return null;

  const warnings: Array<{ code: string; hint: string }> = [];
  const evidenceSnippets: string[] = [];

  const endDate = extractBillEndDate(raw);
  if (endDate?.snippet) evidenceSnippets.push(endDate.snippet);
  const cycleLabel = endDate ? monthLabelFromEnd(endDate.end, args.timezone) : null;
  if (!cycleLabel) {
    warnings.push({ code: 'BILL_PDF_CYCLE_LABEL_MISSING', hint: 'No explicit Bill End Date / Billing Period label found to map TOU usage to a billing cycle.' });
  }

  const kwhMatches: Array<{ key: CanonTouKey; label: string; labelRe: RegExp }> = [
    // Tighten: avoid matching "off peak" as generic "peak". Prefer line-start labels.
    { key: 'onPeak', label: 'billPdfText:onPeakKwh', labelRe: /(?:^|[\n\r])\s*(?:on[\s\-]?peak|peak)\s*kwh\b/i },
    { key: 'partialPeak', label: 'billPdfText:partialPeakKwh', labelRe: /(?:^|[\n\r])\s*partial[\s\-]?peak\s*kwh\b/i },
    { key: 'offPeak', label: 'billPdfText:offPeakKwh', labelRe: /(?:^|[\n\r])\s*off[\s\-]?peak\s*kwh\b/i },
    { key: 'superOffPeak', label: 'billPdfText:superOffPeakKwh', labelRe: /(?:^|[\n\r])\s*super[\s\-]?off[\s\-]?peak\s*kwh\b/i },
  ];
  const kwMatches: Array<{ key: CanonTouKey; label: string; labelRe: RegExp }> = [
    { key: 'onPeak', label: 'billPdfText:onPeakKw', labelRe: /(?:^|[\n\r])\s*(?:on[\s\-]?peak|peak)\s*kw\b/i },
    { key: 'partialPeak', label: 'billPdfText:partialPeakKw', labelRe: /(?:^|[\n\r])\s*partial[\s\-]?peak\s*kw\b/i },
    { key: 'offPeak', label: 'billPdfText:offPeakKw', labelRe: /(?:^|[\n\r])\s*off[\s\-]?peak\s*kw\b/i },
    { key: 'superOffPeak', label: 'billPdfText:superOffPeakKw', labelRe: /(?:^|[\n\r])\s*super[\s\-]?off[\s\-]?peak\s*kw\b/i },
  ];

  const totalKwh = findLabeledNumber({
    raw,
    labelRe: /\b(total\s*(?:usage\s*)?kwh|total\s*kwh)\b/i,
    unitRe: /\bkwh\b/i,
  });
  if (totalKwh?.snippet) evidenceSnippets.push(totalKwh.snippet);

  const energyValues: Partial<Record<CanonTouKey, number>> = {};
  const energyFields: Partial<Record<CanonTouKey, string>> = {};
  for (const m of kwhMatches) {
    const hit = findLabeledNumber({ raw, labelRe: m.labelRe, unitRe: /\bkwh\b/i });
    if (!hit) continue;
    energyValues[m.key] = hit.value;
    energyFields[m.key] = m.label;
    evidenceSnippets.push(hit.snippet);
  }

  const demandValues: Partial<Record<CanonTouKey, number>> = {};
  const demandFields: Partial<Record<CanonTouKey, string>> = {};
  for (const m of kwMatches) {
    const hit = findLabeledNumber({ raw, labelRe: m.labelRe, unitRe: /\bkw\b/i });
    if (!hit) continue;
    demandValues[m.key] = hit.value;
    demandFields[m.key] = m.label;
    evidenceSnippets.push(hit.snippet);
  }

  // Decide whether to publish observed energy: require at least 2 buckets, and (if total is present) require consistency.
  const energyKeys = Object.keys(energyValues) as CanonTouKey[];
  const observedTouEnergy = (() => {
    if (energyKeys.length < 2) {
      warnings.push({
        code: 'BILL_PDF_TOU_ENERGY_NOT_EXPLICIT',
        hint: 'TOU kWh buckets were not explicitly labeled (need at least two of: Peak/Off-Peak/Partial-Peak/Super-Off-Peak kWh).',
      });
      return undefined;
    }
    const sum = energyKeys.reduce((s, k) => s + Number(energyValues[k] || 0), 0);
    if (totalKwh && Number.isFinite(sum) && totalKwh.value > 0) {
      const deltaPct = Math.abs(sum - totalKwh.value) / totalKwh.value;
      if (deltaPct > 0.04) {
        warnings.push({
          code: 'BILL_PDF_TOU_ENERGY_INCONSISTENT_WITH_TOTAL',
          hint: 'TOU kWh buckets did not match explicitly labeled Total kWh closely enough; not using as observed truth.',
        });
        return undefined;
      }
    }
    return { values: energyValues, fields: energyFields };
  })();

  const demandKeys = Object.keys(demandValues) as CanonTouKey[];
  const observedTouDemand = (() => {
    if (demandKeys.length < 2) {
      warnings.push({
        code: 'BILL_PDF_TOU_DEMAND_NOT_EXPLICIT',
        hint: 'TOU kW buckets were not explicitly labeled (need at least two of: Peak/Off-Peak/Partial-Peak/Super-Off-Peak kW).',
      });
      return undefined;
    }
    return { values: demandValues, fields: demandFields };
  })();

  return {
    cycleLabel: cycleLabel || 'unknown',
    evidenceSnippets: Array.from(new Set(evidenceSnippets)).slice(0, 6),
    ...(observedTouEnergy ? { observedTouEnergy } : {}),
    ...(observedTouDemand ? { observedTouDemand } : {}),
    warnings,
  };
}

