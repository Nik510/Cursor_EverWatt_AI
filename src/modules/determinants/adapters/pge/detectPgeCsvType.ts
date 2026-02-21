import Papa from 'papaparse';

export type PgeCsvDetectedTypeV1 = 'interval' | 'usage' | 'unknown';

export type DetectPgeCsvTypeResultV1 = {
  type: PgeCsvDetectedTypeV1;
  confidence: number; // 0..1
  because: string[];
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normHeader(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function hasAny(headers: string[], needles: string[]): boolean {
  const set = new Set(headers.map(normHeader));
  return needles.some((n) => set.has(normHeader(n)));
}

export function detectPgeCsvTypeV1(csvTextOrBuffer: string | Buffer): DetectPgeCsvTypeResultV1 {
  // NOTE: This module is used in both Node and browser bundles.
  // Avoid referencing Buffer when it is not available (browser).
  const isBuf = typeof Buffer !== 'undefined' && Buffer.isBuffer(csvTextOrBuffer as any);
  const text = isBuf ? (csvTextOrBuffer as any).toString('utf-8') : String(csvTextOrBuffer || '');
  const parsed = Papa.parse(text, { header: true, preview: 1, skipEmptyLines: true });
  const headers = Array.isArray(parsed?.meta?.fields) ? parsed.meta.fields : [];

  const because: string[] = [];
  if (!headers.length) {
    return { type: 'unknown', confidence: 0.1, because: ['No CSV headers detected.'] };
  }

  // Interval export signature
  const intervalSignals = [
    hasAny(headers, ['Service Agreement']),
    hasAny(headers, ['Start Date Time', 'Interval Start']),
    hasAny(headers, ['End Date Time', 'Interval End']),
    hasAny(headers, ['Usage', 'Usage (kWh)']),
  ].filter(Boolean).length;

  // Usage export signature
  const usageSignals = [
    hasAny(headers, ['SA ID']),
    hasAny(headers, ['Bill End Date']),
    hasAny(headers, ['Rate']),
    hasAny(headers, ['Total Usage (kWh)', 'Total Usage']),
  ].filter(Boolean).length;

  because.push(`Header signals: interval=${intervalSignals}, usage=${usageSignals}.`);

  if (intervalSignals >= 3 && intervalSignals > usageSignals) {
    return { type: 'interval', confidence: clamp01(0.55 + 0.15 * intervalSignals), because: [...because, 'Detected PG&E interval export header pattern.'] };
  }
  if (usageSignals >= 2 && usageSignals >= intervalSignals) {
    return { type: 'usage', confidence: clamp01(0.5 + 0.18 * usageSignals), because: [...because, 'Detected PG&E usage export header pattern.'] };
  }

  return { type: 'unknown', confidence: 0.25, because: [...because, 'CSV header did not strongly match interval or usage patterns.'] };
}

