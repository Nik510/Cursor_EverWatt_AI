import crypto from 'node:crypto';

export type PdfHeaderHintsV1 = {
  sourceTitle?: string;
  effectiveStart?: string | null;
  customerClass?: string;
  voltage?: string;
  eligibilityNotes?: string;
  evidenceSnippetsByField: Record<string, string>;
};

function clean(s: unknown): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

export function snippetHashV1(snippet: string): string {
  return crypto.createHash('sha1').update(String(snippet || ''), 'utf-8').digest('hex');
}

function windowSnippet(text: string, idx: number, window = 140): string {
  const start = Math.max(0, idx - Math.floor(window / 2));
  const end = Math.min(text.length, idx + Math.floor(window / 2));
  return clean(text.slice(start, end));
}

function findFirst(text: string, re: RegExp): { match: string; index: number } | null {
  const m = re.exec(text);
  if (!m) return null;
  return { match: String(m[0] || ''), index: typeof (m as any).index === 'number' ? (m as any).index : text.indexOf(String(m[0] || '')) };
}

function parseEffectiveDate(text: string): string | null {
  const t = String(text || '');
  const m =
    /effective\s*(?:date)?\s*[:\-]?\s*([a-z]{3,9}\s+\d{1,2},\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i.exec(t);
  if (!m) return null;
  const d = new Date(m[1]);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null;
}

function detectVoltage(text: string): string | null {
  const t = text.toLowerCase();
  if (/\btransmission\b/.test(t)) return 'transmission';
  if (/\bprimary\b/.test(t)) return 'primary';
  if (/\bsecondary\b/.test(t)) return 'secondary';
  return null;
}

/**
 * Best-effort deterministic extraction from the first chunk of a PDF byte-to-text dump.
 * This does not attempt full PDF parsing; it simply looks for keyword-adjacent text.
 */
export function extractPdfHeaderHintsV1(textRaw: string): PdfHeaderHintsV1 | null {
  const text = clean(textRaw);
  if (!text) return null;

  const evidenceSnippetsByField: Record<string, string> = {};

  // Schedule / title-like signal
  const sched = findFirst(text, /\bschedule\b[^A-Z0-9]{0,20}([A-Z]{1,3}-?\d{1,3}[A-Z]?)?/i);
  if (sched) {
    evidenceSnippetsByField.sourceTitle = windowSnippet(text, sched.index);
  }

  const applicable = findFirst(text, /\bapplicable\s+to\b/i);
  const customers = findFirst(text, /\bcustomers?\b/i);
  const service = findFirst(text, /\bservice\b/i);
  const tou = findFirst(text, /\btime[\s\-]?of[\s\-]?use\b/i);

  const eligibilitySnip = applicable
    ? windowSnippet(text, applicable.index)
    : customers
      ? windowSnippet(text, customers.index)
      : service
        ? windowSnippet(text, service.index)
        : tou
          ? windowSnippet(text, tou.index)
          : '';
  if (eligibilitySnip) evidenceSnippetsByField.eligibilityNotes = eligibilitySnip;

  const voltageHit = findFirst(text, /\bvoltage\b/i);
  const voltageSnip = voltageHit ? windowSnippet(text, voltageHit.index) : '';
  const voltage = detectVoltage(voltageSnip || text);
  if (voltage) evidenceSnippetsByField.voltage = voltageSnip || `voltage:${voltage}`;

  const eff = parseEffectiveDate(text);
  if (eff) {
    const effHit = findFirst(text, /\beffective\b/i);
    evidenceSnippetsByField.effectiveStart = effHit ? windowSnippet(text, effHit.index) : `effective:${eff}`;
  }

  const out: PdfHeaderHintsV1 = {
    ...(evidenceSnippetsByField.sourceTitle ? { sourceTitle: evidenceSnippetsByField.sourceTitle } : {}),
    ...(eff ? { effectiveStart: eff } : {}),
    ...(voltage ? { voltage } : {}),
    ...(eligibilitySnip ? { eligibilityNotes: eligibilitySnip } : {}),
    evidenceSnippetsByField,
  };

  return Object.keys(out).length ? out : null;
}

