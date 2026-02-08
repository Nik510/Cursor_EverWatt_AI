import crypto from 'node:crypto';

import type { CaGasTariffSourceV0 } from '../ca/sources';
import { CA_GAS_TARIFF_SOURCES_V0 } from '../ca/sources';
import type { GasTariffRateMetadata, GasTariffSnapshot } from '../types';
import { loadLatestGasSnapshot, saveGasSnapshot } from '../storage';
import { computeGasTariffMetadataCompletenessV0 } from '../completeness';
import { applyGasTariffSegmentV0 } from '../segmentV0';

import { computeContentHashV0, computeRateCodeDiff, extractRatesFromHtml } from '../../tariffLibrary/ingest/ingestCaTariffs';
import { applyTariffEffectiveStatusV1 } from '../../tariffLibrary/effectiveStatusV1';

function nowIso(): string {
  return new Date().toISOString();
}

function makeVersionTag(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}${min}Z`;
}

function cleanText(s: unknown): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

function normRateCode(raw: string): string {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
}

function stableFingerprintList(x: Array<{ url: string; contentHash: string }>): Array<{ url: string; contentHash: string }> {
  return (x || []).slice().sort((a, b) => String(a.url).localeCompare(String(b.url)));
}

function fingerprintsEqual(a: Array<{ url: string; contentHash: string }>, b: Array<{ url: string; contentHash: string }>): boolean {
  const aa = stableFingerprintList(a);
  const bb = stableFingerprintList(b);
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) {
    if (String(aa[i].url) !== String(bb[i].url)) return false;
    if (String(aa[i].contentHash) !== String(bb[i].contentHash)) return false;
  }
  return true;
}

function specificityScore(r: { rateCode: string; sourceUrl: string; sourceTitle?: string }): number {
  const url = String(r.sourceUrl || '');
  const title = String(r.sourceTitle || '');
  let score = 0;
  if (title) score += 5;
  if (url.length > 30) score += 2;
  if (url.toLowerCase().includes(String(r.rateCode || '').toLowerCase().replace('-', ''))) score += 3;
  if (url.toLowerCase().includes('schedule') || url.toLowerCase().includes('tariff')) score += 1;
  return score;
}

function dedupeGasRateMetadata(items: GasTariffRateMetadata[]): GasTariffRateMetadata[] {
  const byKey = new Map<string, GasTariffRateMetadata>();
  for (const it of items || []) {
    const key = `${String(it.utility || '').toUpperCase()}:${normRateCode(it.rateCode)}`;
    const cur = byKey.get(key);
    if (!cur) {
      byKey.set(key, { ...(it as any), rateCode: normRateCode(it.rateCode) });
      continue;
    }
    const curScore = specificityScore({ rateCode: cur.rateCode, sourceUrl: cur.sourceUrl, sourceTitle: cur.sourceTitle });
    const itScore = specificityScore({ rateCode: it.rateCode, sourceUrl: it.sourceUrl, sourceTitle: it.sourceTitle });
    if (itScore > curScore) byKey.set(key, { ...(it as any), rateCode: normRateCode(it.rateCode) });
  }
  return Array.from(byKey.values()).sort((a, b) => a.rateCode.localeCompare(b.rateCode));
}

function hasMetadataChanges(prevRates: GasTariffRateMetadata[] | undefined, nextRates: GasTariffRateMetadata[]): boolean {
  if (!prevRates || !prevRates.length) return true;
  const prevByCode = new Map(prevRates.map((r) => [normRateCode(r.rateCode), r]));
  for (const r of nextRates) {
    const prev = prevByCode.get(normRateCode(r.rateCode));
    if (!prev) return true;
    const fields: Array<keyof GasTariffRateMetadata> = [
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

function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(String(s || ''), 'utf-8').digest('hex');
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'EverWattGasTariffIngestV0/1.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.9,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
  return await res.text();
}

function isLikelyGasLink(url: string): boolean {
  const u = String(url || '').toLowerCase();
  // PG&E index contains both electric and gas PDFs; filter conservatively for gas.
  return u.includes('gas_sched') || u.includes('gas_sche') || u.includes('/gas_') || u.includes('bookid=gas') || u.includes('sectid=g-');
}

function seedRatesForUtility(utility: GasTariffSnapshot['utility'], capturedAt: string): GasTariffRateMetadata[] {
  const lastVerifiedAt = capturedAt;
  if (utility === 'SOCALGAS') {
    return [
      { utility, rateCode: 'GR', sourceUrl: 'https://tariff.socalgas.com/regulatory/tariffs/tariff-Book.shtml', sourceTitle: 'Residential Service', lastVerifiedAt },
      { utility, rateCode: 'G-NR1', sourceUrl: 'https://tariff.socalgas.com/regulatory/tariffs/tariff-Book.shtml', sourceTitle: 'Non-Residential Service', lastVerifiedAt },
    ] as any;
  }
  if (utility === 'SDGE') {
    return [
      { utility, rateCode: 'GR', sourceUrl: 'https://www.sdge.com/rates-and-regulations/current-and-effective-tariffs', sourceTitle: 'Residential Natural Gas Service', lastVerifiedAt },
      { utility, rateCode: 'GNR', sourceUrl: 'https://www.sdge.com/rates-and-regulations/current-and-effective-tariffs', sourceTitle: 'General Service (Non-Residential)', lastVerifiedAt },
    ] as any;
  }
  // PGE
  return [
    { utility, rateCode: 'G-1', sourceUrl: 'https://www.pge.com/tariffs/en.html', sourceTitle: 'Residential Gas Service', lastVerifiedAt },
    { utility, rateCode: 'G-NR1', sourceUrl: 'https://www.pge.com/tariffs/en.html', sourceTitle: 'Non-Residential Gas Service', lastVerifiedAt },
  ] as any;
}

export type IngestGasUtilityResultV0 = {
  utility: GasTariffSnapshot['utility'];
  action: 'wrote' | 'skipped' | 'fetch_failed' | 'seeded';
  versionTag?: string;
  capturedAt: string;
  added: number;
  removed: number;
  unchanged: number;
};

export async function ingestCaGasTariffsV0(args?: {
  sources?: CaGasTariffSourceV0[];
  baseDir?: string;
  now?: string;
  /** If true, write a small seed snapshot when fetch fails and no prior snapshot exists. */
  seedOnFailure?: boolean;
}): Promise<{
  snapshots: GasTariffSnapshot[];
  results: IngestGasUtilityResultV0[];
  warnings: string[];
}> {
  const sources = args?.sources || CA_GAS_TARIFF_SOURCES_V0;
  const capturedAt = args?.now || nowIso();
  const versionTag = makeVersionTag(capturedAt);
  const warnings: string[] = [];
  const seedOnFailure = args?.seedOnFailure !== false;

  const utilitiesInScope = Array.from(new Set(sources.map((s) => s.utility)));
  const byUtility = new Map<
    GasTariffSnapshot['utility'],
    Array<{ source: CaGasTariffSourceV0; html: string; contentHash: string; fingerprintsEntry: { url: string; contentHash: string } }>
  >();

  for (const s of sources) {
    try {
      const html = await fetchText(s.url);
      const contentHash = computeContentHashV0(html);
      const fingerprintsEntry = { url: s.url, contentHash };
      const arr = byUtility.get(s.utility) || [];
      arr.push({ source: s, html, contentHash, fingerprintsEntry });
      byUtility.set(s.utility, arr);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      warnings.push(`[gas:${s.utility}] fetch_failed ${s.url} (${reason})`);
      const arr = byUtility.get(s.utility) || [];
      arr.push({ source: s, html: '', contentHash: '', fingerprintsEntry: { url: s.url, contentHash: `FETCH_FAILED:${sha256Hex(reason)}` } });
      byUtility.set(s.utility, arr);
    }
  }

  const snapshots: GasTariffSnapshot[] = [];
  const results: IngestGasUtilityResultV0[] = [];

  for (const utility of utilitiesInScope) {
    const items = byUtility.get(utility) || [];
    const fetchFailedAll = items.length > 0 && items.every((x) => !String(x.html || '').trim());
    const fingerprints = items.map((x) => x.fingerprintsEntry);

    const prev = await loadLatestGasSnapshot(utility, args?.baseDir ? { baseDir: args.baseDir } : undefined);
    const prevFingerprints = prev?.sourceFingerprints || [];

    if (fetchFailedAll) {
      if (seedOnFailure && !prev) {
        const seededRates = seedRatesForUtility(utility, capturedAt).map((r) =>
          applyTariffEffectiveStatusV1(applyGasTariffSegmentV0({ ...(r as any), lastVerifiedAt: capturedAt } as any) as any) as any,
        ) as any as GasTariffRateMetadata[];
        const snap: GasTariffSnapshot = {
          utility,
          capturedAt,
          versionTag,
          rates: seededRates,
          metadataCompleteness: computeGasTariffMetadataCompletenessV0(seededRates),
          sourceFingerprints: fingerprints,
        };
        await saveGasSnapshot(snap, args?.baseDir ? { baseDir: args.baseDir } : undefined);
        snapshots.push(snap);
        results.push({ utility, action: 'seeded', versionTag, capturedAt, added: seededRates.length, removed: 0, unchanged: 0 });
      } else {
        results.push({ utility, action: 'fetch_failed', capturedAt, added: 0, removed: 0, unchanged: 0 });
      }
      continue;
    }

    // Extract rates
    const extracted: GasTariffRateMetadata[] = [];
    for (const it of items) {
      if (!String(it.html || '').trim()) continue;
      const rows = extractRatesFromHtml({ html: it.html, baseUrl: it.source.url });
      for (const row of rows) {
        const url = String((row as any).sourceUrl || '').trim();
        if (utility === 'PGE' && url && !isLikelyGasLink(url)) continue;
        const rateCode = normRateCode(String((row as any).rateCode || '').trim());
        if (!rateCode) continue;

        const evidence: any[] = [];
        evidence.push({ kind: 'url', value: url || it.source.url, sourceUrl: url || it.source.url });
        const metaLines = Array.isArray((row as any).evidenceMeta) ? (row as any).evidenceMeta : [];
        if (metaLines.length) {
          evidence.push({ kind: 'text', value: `meta:${metaLines.join('; ')}`, sourceUrl: it.source.url, snippetHash: sha256Hex(metaLines.join('|')).slice(0, 16) });
        }

        // Only accept parsed fields when we have an explicit source classification.
        const customerClass = (row as any).customerClassSource ? cleanText((row as any).customerClass) : undefined;
        const customerClassSource = (row as any).customerClassSource ? (row as any).customerClassSource : undefined;
        const voltage = (row as any).voltageSource ? cleanText((row as any).voltage) : undefined;
        const voltageSource = (row as any).voltageSource ? (row as any).voltageSource : undefined;
        const eligibilityNotes = (row as any).eligibilitySource ? cleanText((row as any).eligibilityNotes) : undefined;
        const eligibilitySource = (row as any).eligibilitySource ? (row as any).eligibilitySource : undefined;
        const effectiveStart = (row as any).effectiveSource ? ((row as any).effectiveStart ?? null) : undefined;
        const effectiveEnd = (row as any).effectiveSource ? ((row as any).effectiveEnd ?? null) : undefined;
        const effectiveSource = (row as any).effectiveSource ? (row as any).effectiveSource : undefined;

        extracted.push({
          utility,
          rateCode,
          name: cleanText((row as any).name) || undefined,
          ...(customerClass ? { customerClass, customerClassSource } : {}),
          ...(voltage ? { voltage, voltageSource } : {}),
          ...(eligibilityNotes ? { eligibilityNotes, eligibilitySource } : {}),
          ...(typeof effectiveStart !== 'undefined' ? { effectiveStart, effectiveEnd: effectiveEnd ?? null, effectiveSource } : {}),
          sourceUrl: url || it.source.url,
          sourceTitle: cleanText((row as any).sourceTitle) || undefined,
          lastVerifiedAt: capturedAt,
          evidence,
        });
      }
    }

    const deduped = dedupeGasRateMetadata(extracted)
      .map((r) => applyTariffEffectiveStatusV1(applyGasTariffSegmentV0(r) as any) as any)
      .map((r) => ({ ...(r as any), rateCode: normRateCode((r as any).rateCode) })) as any as GasTariffRateMetadata[];

    const completeness = computeGasTariffMetadataCompletenessV0(deduped);

    // Change detection vs previous snapshot
    if (prev && fingerprintsEqual(prevFingerprints, fingerprints) && !hasMetadataChanges(prev.rates, deduped)) {
      results.push({ utility, action: 'skipped', versionTag: prev.versionTag, capturedAt, added: 0, removed: 0, unchanged: deduped.length });
      continue;
    }

    const diff = computeRateCodeDiff({
      previousRateCodes: prev?.rates?.map((r) => r.rateCode) || [],
      currentRateCodes: deduped.map((r) => r.rateCode),
    });

    const snap: GasTariffSnapshot = {
      utility,
      capturedAt,
      versionTag,
      rates: deduped,
      metadataCompleteness: completeness,
      sourceFingerprints: fingerprints,
      ...(prev ? { diffFromPrevious: { previousVersionTag: prev.versionTag, ...diff } } : {}),
    };

    await saveGasSnapshot(snap, args?.baseDir ? { baseDir: args.baseDir } : undefined);
    snapshots.push(snap);
    results.push({
      utility,
      action: 'wrote',
      versionTag,
      capturedAt,
      added: diff.addedRateCodes.length,
      removed: diff.removedRateCodes.length,
      unchanged: diff.unchangedRateCodes.length,
    });
  }

  return { snapshots, results, warnings };
}

