import crypto from 'node:crypto';

import type { CaTariffUtility, CaTariffSourceV0 } from '../ca/sources';
import { CA_TARIFF_SOURCES_V0 } from '../ca/sources';
import type { TariffRateMetadata, TariffSnapshot } from '../types';
import { loadLatestSnapshot, saveSnapshot } from '../storage';
import { computeTariffMetadataCompletenessV0 } from '../completeness';
import { enrichTariffRateV1 } from '../enrichment/enrichTariffRateV1';
import { extractPdfHeaderHintsV1 } from '../enrichment/pdfHeaderSniffV1';

function nowIso(): string {
  return new Date().toISOString();
}

function makeVersionTag(iso: string): string {
  // "2026-02-05T12:00:00.000Z" -> "2026-02-05T1200Z"
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}${min}Z`;
}

export function normalizeHtmlForHashV0(html: string): string {
  // Minimal normalization for stable hashing across platforms.
  return String(html || '').replace(/\r\n/g, '\n');
}

export function computeContentHashV0(html: string): string {
  const norm = normalizeHtmlForHashV0(html);
  return crypto.createHash('sha256').update(norm, 'utf-8').digest('hex');
}

function normRateCode(raw: string): string {
  const s = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  // Normalize common forms: B19 -> B-19, E19S -> E-19S, A10 -> A-10
  const m = /^([A-Z]{1,3})-?(\d{1,3})([A-Z]?)$/.exec(s);
  if (m) return `${m[1]}-${m[2]}${m[3] || ''}`;
  return s;
}

export type ExtractedRateV0 = {
  rateCode: string;
  sourceUrl: string;
  sourceTitle?: string;
  evidenceText?: string;
  name?: string;
  customerClass?: string;
  voltage?: string;
  eligibilityNotes?: string;
  effectiveStart?: string | null;
  effectiveEnd?: string | null;
  evidenceMeta?: string[];
  customerClassSource?: TariffRateMetadata['customerClassSource'];
  voltageSource?: TariffRateMetadata['voltageSource'];
  eligibilitySource?: TariffRateMetadata['eligibilitySource'];
  effectiveSource?: TariffRateMetadata['effectiveSource'];
};

function cleanText(s: string): string {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function inferCustomerClass(text: string, rateCode: string): string | undefined {
  const t = text.toLowerCase();
  if (/(residential|domestic|home|homeowner)/i.test(t)) return 'residential';
  if (/(agricultural|irrigation|ag-)/i.test(t)) return 'agricultural';
  if (/(industrial|manufacturing|heavy|refinery)/i.test(t)) return 'industrial';
  if (/(public|municipal|street|school|government)/i.test(t)) return 'public_sector';
  if (/(commercial|general service|business)/i.test(t)) return 'commercial';
  const rc = String(rateCode || '').toUpperCase();
  if (rc.startsWith('A-')) return 'residential';
  if (rc.startsWith('B-') || rc.startsWith('E-') || rc.startsWith('C-')) return 'commercial';
  return undefined;
}

function inferVoltage(text: string): TariffRateMetadata['voltage'] | undefined {
  const t = text.toLowerCase();
  if (/transmission/.test(t)) return 'transmission';
  if (/primary/.test(t)) return 'primary';
  if (/secondary/.test(t)) return 'secondary';
  return undefined;
}

function parseEffectiveDate(text: string): string | null {
  const t = String(text || '');
  const m =
    /effective\s*(?:date)?\s*[:\-]?\s*([a-z]{3,9}\s+\d{1,2},\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i.exec(t);
  if (!m) return null;
  const d = new Date(m[1]);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null;
}

function inferEligibilityNotes(text: string, rateCode: string): string | undefined {
  const t = cleanText(text);
  if (!t || t.toLowerCase() === 'pdf') return undefined;
  const rc = String(rateCode || '').toUpperCase();
  const cleaned = t.replace(new RegExp(`\\b${rc}\\b`, 'i'), '').replace(/\bSchedule\b/i, '').trim();
  if (!cleaned || cleaned.length < 6) return undefined;
  return cleaned;
}

async function sniffPdfHeaderMeta(url: string): Promise<
  | (ReturnType<typeof extractPdfHeaderHintsV1> & {
      snippet?: string;
    })
  | null
> {
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'EverWattTariffIngestV0/1.0', Range: 'bytes=0-120000' } });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const text = Buffer.from(buf).toString('latin1');
    if (!text.startsWith('%PDF')) return null;
    const hints = extractPdfHeaderHintsV1(text);
    const titleMatch = /\/Title\s*\(([^)]+)\)/i.exec(text);
    const title = titleMatch ? cleanText(titleMatch[1]) : '';
    return {
      ...(hints || {}),
      ...(title ? { sourceTitle: (hints as any)?.sourceTitle || title } : {}),
      snippet: cleanText((hints as any)?.sourceTitle || title || '').slice(0, 180),
    } as any;
  } catch {
    return null;
  }
}

export function extractRatesFromHtml(args: { html: string; baseUrl: string }): ExtractedRateV0[] {
  const html = String(args.html || '');
  const out: ExtractedRateV0[] = [];

  const trimmed = html.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const data = JSON.parse(trimmed);
      const items = Array.isArray(data) ? data : [data];
      for (const row of items) {
        if (!row || typeof row !== 'object') continue;
        const rateRaw = String((row as { TARF_ID?: string; rateCode?: string }).TARF_ID || (row as { rateCode?: string }).rateCode || '')
          .trim();
        if (!rateRaw) continue;
        const name = (row as { TARF_NAME?: string }).TARF_NAME;
        const group = (row as { TARF_RATEGROUP?: string }).TARF_RATEGROUP;
        const title = [name, group].filter(Boolean).join(' — ') || undefined;
        const metaText = cleanText(title || '');
        const metaEvidence: string[] = [];
        const customerClass = inferCustomerClass(metaText, rateRaw);
        if (customerClass) metaEvidence.push(`customerClass:${customerClass} (json.title)`);
        const voltage = inferVoltage(metaText);
        if (voltage) metaEvidence.push(`voltage:${voltage} (json.title)`);
        const eligibilityNotes = group ? cleanText(String(group)) : inferEligibilityNotes(metaText, rateRaw);
        if (eligibilityNotes) metaEvidence.push(`eligibilityNotes:json.group`);
        const effectiveStart = parseEffectiveDate(metaText);
        if (effectiveStart) metaEvidence.push(`effectiveStart:${effectiveStart} (json.title)`);
        out.push({
          rateCode: normRateCode(rateRaw),
          sourceUrl: args.baseUrl,
          sourceTitle: title,
          evidenceText: `json:${rateRaw}`,
          name: name ? cleanText(String(name)) : undefined,
          customerClass,
          customerClassSource: customerClass ? 'parsed' : undefined,
          voltage,
          voltageSource: voltage ? 'parsed' : undefined,
          eligibilityNotes,
          eligibilitySource: eligibilityNotes ? 'parsed' : undefined,
          effectiveStart,
          effectiveSource: effectiveStart ? 'parsed' : undefined,
          evidenceMeta: metaEvidence.length ? metaEvidence : undefined,
        });
      }
    } catch {
      // Fall through to HTML parsing.
    }
  }

  const schedulePdfRe = /\b(?:ELEC|GAS)[A-Z_-]*SCHEDS?_([A-Z0-9-]+)\.pdf\b/i;
  const scheduleTextRe = /\bSchedule\s+([A-Z0-9-]{2,12})\b/gi;
  const hyphenatedRateRe = /\b([A-Z]{1,4}(?:-[A-Z0-9]{1,5}){1,3})\b/g;

  // 1) Anchor parsing (best signal)
  const anchorRe = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html))) {
    const href = String(m[1] || '').trim();
    const text = String(m[2] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const candidates = `${href} ${text}`;

    const schedulePdfMatch = schedulePdfRe.exec(href);
    if (schedulePdfMatch) {
      const rateCode = normRateCode(schedulePdfMatch[1]);
      let url: string;
      try {
        url = new URL(href, args.baseUrl).toString();
      } catch {
        url = href;
      }
      const metaText = cleanText(text || '');
      // NOTE: For HTML anchor text, any metadata derived from heuristics is treated as INFERRED
      // and is applied later by TariffRateEnrichmentV1 (rulebook + patterns) with explicit rule IDs.
      const customerClass = inferCustomerClass(metaText, rateCode);
      const voltage = inferVoltage(metaText);
      const eligibilityNotes = inferEligibilityNotes(metaText, rateCode);
      const effectiveStart = parseEffectiveDate(metaText);
      const evidenceMeta: string[] = [];
      if (customerClass) evidenceMeta.push(`customerClass:${customerClass} (anchor.text)`);
      if (voltage) evidenceMeta.push(`voltage:${voltage} (anchor.text)`);
      if (eligibilityNotes) evidenceMeta.push(`eligibilityNotes:anchor.text`);
      if (effectiveStart) evidenceMeta.push(`effectiveStart:${effectiveStart} (anchor.text)`);
      out.push({
        rateCode,
        sourceUrl: url,
        sourceTitle: metaText || undefined,
        evidenceText: `pdf:${schedulePdfMatch[0]}`,
        customerClass,
        customerClassSource: undefined,
        voltage,
        voltageSource: undefined,
        eligibilityNotes,
        eligibilitySource: undefined,
        effectiveStart,
        effectiveSource: undefined,
        evidenceMeta: evidenceMeta.length ? evidenceMeta : undefined,
      });
    }

    scheduleTextRe.lastIndex = 0;
    let sm: RegExpExecArray | null;
    while ((sm = scheduleTextRe.exec(text))) {
      const rateCode = normRateCode(sm[1]);
      let url: string;
      try {
        url = new URL(href, args.baseUrl).toString();
      } catch {
        url = href;
      }
      const metaText = cleanText(text || '');
      const customerClass = inferCustomerClass(metaText, rateCode);
      const voltage = inferVoltage(metaText);
      const eligibilityNotes = inferEligibilityNotes(metaText, rateCode);
      const effectiveStart = parseEffectiveDate(metaText);
      const evidenceMeta: string[] = [];
      if (customerClass) evidenceMeta.push(`customerClass:${customerClass} (anchor.text)`);
      if (voltage) evidenceMeta.push(`voltage:${voltage} (anchor.text)`);
      if (eligibilityNotes) evidenceMeta.push(`eligibilityNotes:anchor.text`);
      if (effectiveStart) evidenceMeta.push(`effectiveStart:${effectiveStart} (anchor.text)`);
      out.push({
        rateCode,
        sourceUrl: url,
        sourceTitle: metaText || undefined,
        evidenceText: `schedule:${sm[1]}`,
        customerClass,
        customerClassSource: undefined,
        voltage,
        voltageSource: undefined,
        eligibilityNotes,
        eligibilitySource: undefined,
        effectiveStart,
        effectiveSource: undefined,
        evidenceMeta: evidenceMeta.length ? evidenceMeta : undefined,
      });
    }

    hyphenatedRateRe.lastIndex = 0;
    let hm: RegExpExecArray | null;
    while ((hm = hyphenatedRateRe.exec(candidates))) {
      const rateCode = normRateCode(hm[1]);
      let url: string;
      try {
        url = new URL(href, args.baseUrl).toString();
      } catch {
        url = href;
      }
      const metaText = cleanText(text || '');
      const customerClass = inferCustomerClass(metaText, rateCode);
      const voltage = inferVoltage(metaText);
      const eligibilityNotes = inferEligibilityNotes(metaText, rateCode);
      const effectiveStart = parseEffectiveDate(metaText);
      const evidenceMeta: string[] = [];
      if (customerClass) evidenceMeta.push(`customerClass:${customerClass} (anchor.text)`);
      if (voltage) evidenceMeta.push(`voltage:${voltage} (anchor.text)`);
      if (eligibilityNotes) evidenceMeta.push(`eligibilityNotes:anchor.text`);
      if (effectiveStart) evidenceMeta.push(`effectiveStart:${effectiveStart} (anchor.text)`);
      out.push({
        rateCode,
        sourceUrl: url,
        sourceTitle: metaText || undefined,
        evidenceText: `hyphen:${hm[1]}`,
        customerClass,
        customerClassSource: undefined,
        voltage,
        voltageSource: undefined,
        eligibilityNotes,
        eligibilitySource: undefined,
        effectiveStart,
        effectiveSource: undefined,
        evidenceMeta: evidenceMeta.length ? evidenceMeta : undefined,
      });
    }

    // Rate codes: B-19, B19, E-19, A-10, etc. Keep simple and stable.
    const rateRe = /\b([A-Z]{1,3})-?(\d{1,3})([A-Z])?\b/g;
    let rm: RegExpExecArray | null;
    while ((rm = rateRe.exec(candidates))) {
      const rateCode = normRateCode(`${rm[1]}-${rm[2]}${rm[3] || ''}`);
      // Resolve relative URL
      let url: string;
      try {
        url = new URL(href, args.baseUrl).toString();
      } catch {
        url = href;
      }
      const metaText = cleanText(text || '');
      const customerClass = inferCustomerClass(metaText, rateCode);
      const voltage = inferVoltage(metaText);
      const eligibilityNotes = inferEligibilityNotes(metaText, rateCode);
      const effectiveStart = parseEffectiveDate(metaText);
      const evidenceMeta: string[] = [];
      if (customerClass) evidenceMeta.push(`customerClass:${customerClass} (anchor.text)`);
      if (voltage) evidenceMeta.push(`voltage:${voltage} (anchor.text)`);
      if (eligibilityNotes) evidenceMeta.push(`eligibilityNotes:anchor.text`);
      if (effectiveStart) evidenceMeta.push(`effectiveStart:${effectiveStart} (anchor.text)`);
      out.push({
        rateCode,
        sourceUrl: url,
        sourceTitle: metaText || undefined,
        evidenceText: candidates.slice(0, 180),
        customerClass,
        customerClassSource: undefined,
        voltage,
        voltageSource: undefined,
        eligibilityNotes,
        eligibilitySource: undefined,
        effectiveStart,
        effectiveSource: undefined,
        evidenceMeta: evidenceMeta.length ? evidenceMeta : undefined,
      });
    }
  }

  // 2) Fallback: text scan for rate codes (no URL)
  const textOnly = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
  const rateRe2 = /\b([A-Z]{1,3})-?(\d{1,3})([A-Z])?\b/g;
  let rm2: RegExpExecArray | null;
  while ((rm2 = rateRe2.exec(textOnly))) {
    const rateCode = normRateCode(`${rm2[1]}-${rm2[2]}${rm2[3] || ''}`);
    out.push({ rateCode, sourceUrl: args.baseUrl, sourceTitle: undefined, evidenceText: `text-scan:${rateCode}` });
  }

  return out;
}

function specificityScore(r: ExtractedRateV0): number {
  const url = String(r.sourceUrl || '');
  const title = String(r.sourceTitle || '');
  let score = 0;
  if (title) score += 5;
  if (url.length > 30) score += 2;
  if (url.toLowerCase().includes(String(r.rateCode || '').toLowerCase().replace('-', ''))) score += 3;
  if (url.toLowerCase().includes('schedule') || url.toLowerCase().includes('tariff')) score += 1;
  return score;
}

export function dedupeRateMetadata(items: TariffRateMetadata[]): TariffRateMetadata[] {
  const byKey = new Map<string, TariffRateMetadata>();
  for (const it of items) {
    const key = `${it.utility}:${normRateCode(it.rateCode)}`;
    const cur = byKey.get(key);
    if (!cur) {
      byKey.set(key, { ...it, rateCode: normRateCode(it.rateCode) });
      continue;
    }
    const curScore = specificityScore({ rateCode: cur.rateCode, sourceUrl: cur.sourceUrl, sourceTitle: cur.sourceTitle });
    const itScore = specificityScore({ rateCode: it.rateCode, sourceUrl: it.sourceUrl, sourceTitle: it.sourceTitle });
    if (itScore > curScore) byKey.set(key, { ...it, rateCode: normRateCode(it.rateCode) });
  }
  return Array.from(byKey.values()).sort((a, b) => a.rateCode.localeCompare(b.rateCode));
}

function hasMetadataChanges(prevRates: TariffRateMetadata[] | undefined, nextRates: TariffRateMetadata[]): boolean {
  if (!prevRates || !prevRates.length) return true;
  const prevByCode = new Map(prevRates.map((r) => [normRateCode(r.rateCode), r]));
  for (const r of nextRates) {
    const prev = prevByCode.get(normRateCode(r.rateCode));
    if (!prev) return true;
    const fields: Array<keyof TariffRateMetadata> = [
      'name',
      'customerClass',
      'customerClassSource',
      'voltage',
      'voltageSource',
      'eligibilityNotes',
      'eligibilitySource',
      'effectiveStart',
      'effectiveEnd',
      'effectiveSource',
      'sourceTitle',
      'sourceUrl',
    ];
    for (const f of fields) {
      const a = String((prev as any)[f] ?? '');
      const b = String((r as any)[f] ?? '');
      if (a !== b) return true;
    }
  }
  return false;
}

export function computeRateCodeDiff(args: {
  previousRateCodes: string[];
  currentRateCodes: string[];
}): { addedRateCodes: string[]; removedRateCodes: string[]; unchangedRateCodes: string[] } {
  const prev = new Set(args.previousRateCodes.map((c) => normRateCode(c)));
  const cur = new Set(args.currentRateCodes.map((c) => normRateCode(c)));

  const added: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];

  for (const c of cur) {
    if (prev.has(c)) unchanged.push(c);
    else added.push(c);
  }
  for (const c of prev) {
    if (!cur.has(c)) removed.push(c);
  }

  added.sort((a, b) => a.localeCompare(b));
  removed.sort((a, b) => a.localeCompare(b));
  unchanged.sort((a, b) => a.localeCompare(b));
  return { addedRateCodes: added, removedRateCodes: removed, unchangedRateCodes: unchanged };
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'EverWattTariffIngestV0/1.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
  return await res.text();
}

function stableFingerprintList(x: Array<{ url: string; contentHash: string }>): Array<{ url: string; contentHash: string }> {
  return (x || []).slice().sort((a, b) => String(a.url).localeCompare(String(b.url)));
}

function fingerprintsEqual(
  a: Array<{ url: string; contentHash: string }>,
  b: Array<{ url: string; contentHash: string }>,
): boolean {
  const aa = stableFingerprintList(a);
  const bb = stableFingerprintList(b);
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) {
    if (String(aa[i].url) !== String(bb[i].url)) return false;
    if (String(aa[i].contentHash) !== String(bb[i].contentHash)) return false;
  }
  return true;
}

export type IngestUtilityResultV0 = {
  utility: CaTariffUtility;
  action: 'wrote' | 'skipped' | 'fetch_failed';
  versionTag?: string;
  capturedAt: string;
  added: number;
  removed: number;
  unchanged: number;
};

export async function ingestCaTariffsV0(args?: {
  sources?: CaTariffSourceV0[];
  baseDir?: string;
  now?: string;
}): Promise<{
  snapshots: TariffSnapshot[];
  results: IngestUtilityResultV0[];
  warnings: string[];
}> {
  const sources = args?.sources || CA_TARIFF_SOURCES_V0;
  const capturedAt = args?.now || nowIso();
  const versionTag = makeVersionTag(capturedAt);
  const warnings: string[] = [];

  const utilitiesInScope = Array.from(new Set(sources.map((s) => s.utility)));
  const byUtility = new Map<
    CaTariffUtility,
    Array<{ source: CaTariffSourceV0; html: string; contentHash: string; fingerprintsEntry: { url: string; contentHash: string } }>
  >();

  for (const s of sources) {
    try {
      const html = await fetchText(s.url);
      const contentHash = computeContentHashV0(html);
      const arr = byUtility.get(s.utility) || [];
      arr.push({ source: s, html, contentHash, fingerprintsEntry: { url: s.url, contentHash } });
      byUtility.set(s.utility, arr);
      // eslint-disable-next-line no-console
      console.log(`[tariffLibrary:v0] fetched ${s.utility} ${s.sourceType} ${s.url} bytes=${html.length}`);
    } catch (e) {
      warnings.push(`[tariffLibrary:v0] failed to fetch ${s.utility} ${s.url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const snapshots: TariffSnapshot[] = [];
  const results: IngestUtilityResultV0[] = [];

  for (const utility of utilitiesInScope) {
    const fetched = byUtility.get(utility) || [];
    if (!fetched.length) {
      results.push({ utility, action: 'fetch_failed', capturedAt, added: 0, removed: 0, unchanged: 0 });
      continue;
    }

    const previous = await loadLatestSnapshot(utility, { baseDir: args?.baseDir });

    const items: TariffRateMetadata[] = [];
    type PdfMetaV1 = {
      sourceTitle?: string;
      effectiveStart?: string | null;
      customerClass?: string;
      voltage?: string;
      eligibilityNotes?: string;
      evidenceSnippetsByField?: Record<string, string>;
      snippet?: string;
    };
    const pdfSniffCache = new Map<string, PdfMetaV1 | null>();
    let pdfSniffBudget = 10;
    for (const f of fetched) {
      const extracted = extractRatesFromHtml({ html: f.html, baseUrl: f.source.url });
      for (const r of extracted) {
        let pdfMeta: PdfMetaV1 | null = null;
        const isPdf = String(r.sourceUrl || '').toLowerCase().endsWith('.pdf');
        if (isPdf && (!r.sourceTitle || !r.effectiveStart) && pdfSniffBudget > 0) {
          if (pdfSniffCache.has(r.sourceUrl)) {
            pdfMeta = pdfSniffCache.get(r.sourceUrl) || null;
          } else {
            pdfSniffBudget -= 1;
            pdfMeta = (await sniffPdfHeaderMeta(r.sourceUrl)) as any;
            pdfSniffCache.set(r.sourceUrl, pdfMeta);
          }
        }
        const pdfEvidence = pdfMeta?.evidenceSnippetsByField
          ? Object.entries(pdfMeta.evidenceSnippetsByField).map(([fieldName, snippet]) => ({ fieldName, snippet: cleanText(snippet) }))
          : [];

        const baseRate: TariffRateMetadata = {
          utility,
          rateCode: normRateCode(r.rateCode),
          sourceUrl: r.sourceUrl,
          sourceTitle: r.sourceTitle || pdfMeta?.sourceTitle,
          name: r.name,
          customerClass: r.customerClass,
          customerClassSource: r.customerClassSource,
          voltage: r.voltage,
          voltageSource: r.voltageSource,
          eligibilityNotes: r.eligibilityNotes,
          eligibilitySource: r.eligibilitySource,
          effectiveStart: r.effectiveStart ?? pdfMeta?.effectiveStart ?? null,
          effectiveEnd: r.effectiveEnd ?? null,
          effectiveSource: r.effectiveStart ? (r.effectiveSource as any) : pdfMeta?.effectiveStart ? 'pdf' : undefined,
          lastVerifiedAt: capturedAt,
          evidence: [
            { kind: 'url', value: f.source.url },
            ...(r.evidenceText ? [{ kind: 'text' as const, value: r.evidenceText }] : []),
            ...(Array.isArray(r.evidenceMeta) ? r.evidenceMeta.map((v) => ({ kind: 'meta' as const, value: v })) : []),
            ...(pdfEvidence.length ? pdfEvidence.map((v) => ({ kind: 'pdf' as const, value: `${v.fieldName}:${v.snippet}` })) : []),
          ],
        };

        items.push(
          enrichTariffRateV1({
            base: baseRate,
            previous: previous?.rates?.find((pr) => normRateCode(pr.rateCode) === normRateCode(baseRate.rateCode)) || null,
            parsedHints: {
              sourceTitle: r.sourceTitle,
              customerClass: r.customerClassSource === 'parsed' ? r.customerClass : undefined,
              voltage: r.voltageSource === 'parsed' ? r.voltage : undefined,
              eligibilityNotes: r.eligibilitySource === 'parsed' ? r.eligibilityNotes : undefined,
              effectiveStart: r.effectiveSource === 'parsed' ? (r.effectiveStart ?? null) : null,
              effectiveEnd: r.effectiveSource === 'parsed' ? (r.effectiveEnd ?? null) : null,
            },
            parsedEvidence: r.evidenceMeta?.map((x) => ({ fieldName: 'parsed', snippet: x })) || [],
            pdfHints: {
              sourceTitle: pdfMeta?.sourceTitle,
              effectiveStart: pdfMeta?.effectiveStart ?? null,
              customerClass: pdfMeta?.customerClass,
              voltage: pdfMeta?.voltage,
              eligibilityNotes: pdfMeta?.eligibilityNotes,
            },
            pdfEvidence,
          }),
        );
      }
    }

    const deduped = dedupeRateMetadata(items);
    // eslint-disable-next-line no-console
    console.log(`[tariffLibrary:v0] ${utility} extracted rates=${items.length} deduped=${deduped.length}`);

    // Ensure explicit "unknown" markers for decision-safe defaults.
    for (const r of deduped) {
      if (!String((r as any).customerClass || '').trim()) (r as any).customerClass = 'unknown';
      if (!String((r as any).customerClassSource || '').trim()) (r as any).customerClassSource = 'unknown';
      if (!String((r as any).voltage || '').trim()) (r as any).voltage = 'unknown';
      if (!String((r as any).voltageSource || '').trim()) (r as any).voltageSource = 'unknown';
      if (!('eligibilityNotes' in (r as any))) (r as any).eligibilityNotes = '';
      if (!String((r as any).eligibilitySource || '').trim()) (r as any).eligibilitySource = String((r as any).eligibilityNotes || '').trim() ? 'parsed' : 'unknown';
      if (!('effectiveStart' in (r as any))) (r as any).effectiveStart = null;
      if (!('effectiveEnd' in (r as any))) (r as any).effectiveEnd = null;
      if (!String((r as any).effectiveSource || '').trim()) (r as any).effectiveSource = (r as any).effectiveStart || (r as any).effectiveEnd ? 'parsed' : 'unknown';
    }

    const metadataCompleteness = computeTariffMetadataCompletenessV0(deduped);

    const sourceFingerprints = stableFingerprintList(fetched.map((f) => f.fingerprintsEntry));
    const prevFingerprints = previous?.sourceFingerprints || previous?.raw || [];

    const diff =
      previous && Array.isArray(previous.rates)
        ? computeRateCodeDiff({
            previousRateCodes: previous.rates.map((r) => r.rateCode),
            currentRateCodes: deduped.map((r) => r.rateCode),
          })
        : null;

    const noRateCodeChanges = Boolean(diff && diff.addedRateCodes.length === 0 && diff.removedRateCodes.length === 0);
    const metadataChanged = hasMetadataChanges(previous?.rates, deduped);
    const sameFingerprints = previous ? fingerprintsEqual(sourceFingerprints, prevFingerprints) : false;

    if (previous && noRateCodeChanges && sameFingerprints && !metadataChanged) {
      // eslint-disable-next-line no-console
      console.log(`[tariffLibrary:v0] ${utility} no changes detected; skipping snapshot write`);
      results.push({
        utility,
        action: 'skipped',
        capturedAt,
        versionTag: previous.versionTag,
        added: 0,
        removed: 0,
        unchanged: diff?.unchangedRateCodes.length || deduped.length,
      });
      continue;
    }

    const snapshot: TariffSnapshot = {
      utility,
      capturedAt,
      versionTag,
      rates: deduped,
      metadataCompleteness,
      sourceFingerprints,
      ...(previous && diff
        ? { diffFromPrevious: { previousVersionTag: previous.versionTag, ...diff } }
        : {}),
      // Back-compat alias (v0 early snapshots)
      raw: sourceFingerprints,
    };
    await saveSnapshot(snapshot, { baseDir: args?.baseDir });
    snapshots.push(snapshot);
    results.push({
      utility,
      action: 'wrote',
      capturedAt,
      versionTag,
      added: diff?.addedRateCodes.length || 0,
      removed: diff?.removedRateCodes.length || 0,
      unchanged: diff?.unchangedRateCodes.length || 0,
    });
  }

  return { snapshots, results, warnings };
}

