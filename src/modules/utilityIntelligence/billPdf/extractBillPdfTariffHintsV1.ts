export const BillPdfTariffHintWarningCodesV1 = {
  BILL_TEXT_INSUFFICIENT: 'BILL_TEXT_INSUFFICIENT',
  BILL_UTILITY_MISSING: 'BILL_UTILITY_MISSING',
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

function extractUtilityHint(raw: string): { utilityHint?: string; matchedText?: string } {
  const candidates: Array<{ label: string; re: RegExp }> = [
    { label: 'PG&E', re: /\b(pg&e|pge|pacific gas(?:\s+and)?\s+electric)\b/i },
    { label: 'SCE', re: /\b(sce|southern california edison)\b/i },
    { label: 'SDG&E', re: /\b(sdg&e|sdge|san diego gas(?:\s+and)?\s+electric)\b/i },
    { label: 'SoCalGas', re: /\b(socalgas|southern california gas)\b/i },
  ];

  for (const c of candidates) {
    const m = c.re.exec(raw);
    if (!m) continue;
    return { utilityHint: c.label, matchedText: snippetAround(raw, m.index, m[0].length) };
  }
  return {};
}

function extractRateSchedule(raw: string): { rateScheduleText?: string; matchedText?: string } {
  // Accept explicit bill labels only. Capture the first code-like token after the label.
  // Examples: "Rate Schedule: B-19", "Schedule: TOU-GS-3", "Tariff: E-19"
  const labelRes: RegExp[] = [
    /(?:^|[\n\r])\s*rate\s*schedule\s*(?:code)?\s*[:\-]\s*([^\n\r]{1,80})/i,
    /(?:^|[\n\r])\s*schedule\s*[:\-]\s*([^\n\r]{1,80})/i,
    /(?:^|[\n\r])\s*tariff\s*[:\-]\s*([^\n\r]{1,80})/i,
  ];

  const codeTokenRe =
    /\b([A-Z]{1,6}(?:-[A-Z0-9]{1,10}){1,4}|[A-Z]{1,3}-?\d{1,3}[A-Z0-9]{0,6})\b/;

  for (const re of labelRes) {
    const m = re.exec(raw);
    if (!m) continue;
    const tail = String(m[1] || '').trim();
    const token = codeTokenRe.exec(tail.toUpperCase());
    if (!token) {
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
  if (u.matchedText) matchedText.push(u.matchedText);

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

