export const BillPdfTariffHintWarningCodesV1 = {
  BILL_TEXT_INSUFFICIENT: 'BILL_TEXT_INSUFFICIENT',
  BILL_UTILITY_MISSING: 'BILL_UTILITY_MISSING',
  BILL_UTILITY_CONFLICT: 'BILL_UTILITY_CONFLICT',
  BILL_UTILITY_UNSUPPORTED: 'BILL_UTILITY_UNSUPPORTED',
  BILL_RATE_SCHEDULE_MISSING: 'BILL_RATE_SCHEDULE_MISSING',
} as const;

export type BillPdfTariffHintWarningCodeV1 =
  (typeof BillPdfTariffHintWarningCodesV1)[keyof typeof BillPdfTariffHintWarningCodesV1];

export type BillPdfTariffHintsV1 = {
  utilityHint?: string;
  rateScheduleText?: string;
  evidence: { source: 'bill_pdf'; matchedText: string[] };
  warnings: Array<{ code: BillPdfTariffHintWarningCodeV1; hint: string }>;
};

function normSpace(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
}

function uniqStrings(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of arr) {
    const s = String(v || '').trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function pushWarning(
  warnings: BillPdfTariffHintsV1['warnings'],
  code: BillPdfTariffHintWarningCodeV1,
  hint: string
): void {
  warnings.push({ code, hint });
}

function snippetAround(raw: string, index: number, len: number): string {
  if (!raw) return '';
  const start = Math.max(0, index - 28);
  const end = Math.min(raw.length, index + len + 28);
  return normSpace(raw.slice(start, end));
}

function extractUtilityHint(raw: string): { utilityHint?: string; matchedText?: string; multiple?: string[] } {
  const candidates: Array<{ label: string; re: RegExp }> = [
    // CA IOUs + SoCalGas (supported)
    { label: 'PG&E', re: /\b(pg&e|pge|pacific gas(?:\s+(?:and|&))?\s+electric)\b/i },
    { label: 'SCE', re: /\b(sce|southern california edison)\b/i },
    { label: 'SDG&E', re: /\b(sdg&e|sdge|san diego gas(?:\s+(?:and|&))?\s+electric)\b/i },
    { label: 'SoCalGas', re: /\b(socalgas|southern california gas)\b/i },
    // Municipal/other CA (detected, but not tariff-library supported in v1 match fixtures)
    { label: 'LADWP', re: /\b(ladwp|los angeles (?:department|dept)\s+of water and power)\b/i },
    { label: 'SMUD', re: /\b(smud|sacramento municipal utility district|sacramento mud)\b/i },
    { label: 'Palo Alto Utilities', re: /\b(city of palo alto|palo alto utilities)\b/i },
    { label: 'Silicon Valley Power', re: /\b(silicon valley power|svp\b|city of santa clara)\b/i },
    { label: 'Alameda Municipal Power', re: /\b(alameda municipal power)\b/i },
    { label: 'Burbank Water and Power', re: /\b(burbank water and power)\b/i },
    { label: 'Glendale Water & Power', re: /\b(glendale water\s*&\s*power|glendale water and power)\b/i },
    { label: 'Pasadena Water and Power', re: /\b(pasadena water\s*&\s*power|pasadena water and power)\b/i },
    { label: 'Anaheim Public Utilities', re: /\b(anaheim public utilities)\b/i },
    { label: 'Riverside Public Utilities', re: /\b(riverside public utilities)\b/i },
    { label: 'Roseville Electric', re: /\b(roseville electric)\b/i },
    { label: 'Modesto Irrigation District', re: /\b(modesto irrigation district|\bmid\b)\b/i },
    { label: 'Turlock Irrigation District', re: /\b(turlock irrigation district|\btid\b)\b/i },
  ];

  const hits: Array<{ label: string; index: number; len: number }> = [];
  for (const c of candidates) {
    const m = c.re.exec(raw);
    if (!m) continue;
    hits.push({ label: c.label, index: m.index, len: m[0].length });
  }

  if (!hits.length) return {};
  const uniq = Array.from(new Set(hits.map((h) => h.label)));
  if (uniq.length > 1) return { multiple: uniq.sort() };
  const first = hits.sort((a, b) => a.index - b.index)[0];
  return { utilityHint: first.label, matchedText: snippetAround(raw, first.index, first.len) };
}

function extractRateSchedule(raw: string): { rateScheduleText?: string; matchedText?: string } {
  // Accept explicit bill labels only. Capture the first code-like token after the label.
  // Examples: "Rate Schedule: B-19", "Schedule: TOU-GS-3", "Tariff: E-19"
  const labelRes: RegExp[] = [
    /(?:^|[\n\r])\s*rate\s*schedule\s*(?:code)?\s*[:\-]\s*([^\n\r]{1,80})/i,
    /(?:^|[\n\r])\s*rate\s*[:\-]\s*([^\n\r]{1,80})/i,
    /(?:^|[\n\r])\s*schedule\s*[:\-]\s*([^\n\r]{1,80})/i,
    /(?:^|[\n\r])\s*tariff\s*[:\-]\s*([^\n\r]{1,80})/i,
  ];

  const codeTokenRe =
    /\b([A-Z]{1,6}(?:-[A-Z0-9]{1,10}){1,4}|[A-Z]{1,3}-?\d{1,3}[A-Z0-9]{0,6})\b/;

  for (const re of labelRes) {
    const m = re.exec(raw);
    if (!m) continue;
    const tail = String(m[1] || '').trim();
    // Normalize common bill formatting variants before extracting a code-like token.
    //
    // Rule:
    // - If the first word already contains digits or dashes (e.g. "B-10 Secondary"), extract from the
    //   space-preserved form to avoid swallowing trailing descriptors.
    // - Otherwise (e.g. "TOU D Prime", "E 20", "G NR1"), extract from the dash-normalized form to
    //   keep multi-part codes intact.
    const tailUpper = tail.toUpperCase().replace(/_/g, '-').replace(/\s+/g, ' ').trim();
    const firstWord = tailUpper.split(' ')[0] || '';
    const usePreserveSpaces = /[\d-]/.test(firstWord);
    const token = codeTokenRe.exec(usePreserveSpaces ? tailUpper : tailUpper.replace(/\s+/g, '-'));

    if (!token) {
      // Alpha-only fallback: only accept when the entire tail is just a short alpha code (e.g. "GR").
      const alphaOnly = tailUpper.replace(/[^A-Z]/g, '');
      if (alphaOnly.length >= 2 && alphaOnly.length <= 4 && alphaOnly === tailUpper.replace(/[^A-Z]/g, '')) {
        return {
          rateScheduleText: alphaOnly,
          matchedText: snippetAround(raw, m.index, m[0].length),
        };
      }
      return { matchedText: snippetAround(raw, m.index, m[0].length) };
    }
    return {
      rateScheduleText: token[1],
      matchedText: snippetAround(raw, m.index, m[0].length),
    };
  }
  return {};
}

export function extractBillPdfTariffHintsV1(billPdfText: unknown): BillPdfTariffHintsV1 | null {
  const raw = String(billPdfText || '').trim();
  if (!raw) return null;

  const warnings: BillPdfTariffHintsV1['warnings'] = [];
  const matchedText: string[] = [];

  const tooShort = raw.length < 60;

  const u = extractUtilityHint(raw);
  if ((u as any).multiple && Array.isArray((u as any).multiple) && (u as any).multiple.length) {
    matchedText.push(String((u as any).multiple.join(', ')));
    pushWarning(
      warnings,
      BillPdfTariffHintWarningCodesV1.BILL_UTILITY_CONFLICT,
      `Multiple utility tokens found in bill text (conflict): ${(u as any).multiple.join(', ')}.`
    );
  } else if (u.matchedText) {
    matchedText.push(u.matchedText);
  }

  const r = extractRateSchedule(raw);
  if (r.matchedText) matchedText.push(r.matchedText);

  if (tooShort) {
    pushWarning(
      warnings,
      BillPdfTariffHintWarningCodesV1.BILL_TEXT_INSUFFICIENT,
      'Bill text is present but too short to deterministically extract utility or rate schedule.'
    );
  }

  if (!u.utilityHint) {
    pushWarning(warnings, BillPdfTariffHintWarningCodesV1.BILL_UTILITY_MISSING, 'No explicit utility token found in bill text.');
  } else if (!['PG&E', 'SCE', 'SDG&E', 'SoCalGas'].includes(String(u.utilityHint))) {
    pushWarning(
      warnings,
      BillPdfTariffHintWarningCodesV1.BILL_UTILITY_UNSUPPORTED,
      `Utility "${String(u.utilityHint)}" detected, but is not supported for CA tariff-library matching in v1 fixtures.`
    );
  }
  if (!r.rateScheduleText) {
    pushWarning(
      warnings,
      BillPdfTariffHintWarningCodesV1.BILL_RATE_SCHEDULE_MISSING,
      'No explicit Rate Schedule / Schedule / Tariff label found in bill text.'
    );
  }

  return {
    ...(u.utilityHint ? { utilityHint: u.utilityHint } : {}),
    ...(r.rateScheduleText ? { rateScheduleText: r.rateScheduleText } : {}),
    evidence: { source: 'bill_pdf', matchedText: uniqStrings(matchedText) },
    warnings,
  };
}

