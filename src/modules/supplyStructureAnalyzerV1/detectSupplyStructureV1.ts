import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';
import { SupplyStructureAnalyzerReasonCodesV1, uniqSorted } from './reasons';
import type {
  CaIouUtilityV1,
  SupplyProviderTypeV1,
  SupplyStructureAnalyzerBillHintsV1,
  SupplyStructureAnalyzerOutputV1,
  SupplyServiceTypeV1,
  SupplyStructureEvidenceV1,
} from './types';

import caLseRegistryJson from './caLseRegistryV1.json';
import caDaProvidersJson from '../../../data/supply/caDaProvidersV1.json';

type RegistryPayload = {
  ccaProviders: Array<{ canonicalName: string; aliases: string[] }>;
  directAccessMarkers: string[];
};

const REGISTRY = caLseRegistryJson as unknown as RegistryPayload;

type DaRegistryPayload = {
  providers: Array<{ canonicalName: string; aliases: string[] }>;
};

const DA_REGISTRY = caDaProvidersJson as unknown as DaRegistryPayload;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normText(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-') // hyphen variants
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function iouFromHint(raw: unknown): CaIouUtilityV1 {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (!s) return 'UNKNOWN';
  if (s.includes('PGE') || s.includes('PACIFICGAS')) return 'PGE';
  if (s.includes('SCE') || s.includes('SOUTHERNCALIFORNIAEDISON')) return 'SCE';
  if (s.includes('SDGE') || s.includes('SANDIEGOGAS')) return 'SDGE';
  return 'UNKNOWN';
}

function mkMissing(id: string, description: string, severity: MissingInfoItemV0['severity']): MissingInfoItemV0 {
  return { id, category: 'tariff', severity, description };
}

function matchLseNames(textNorm: string): Array<{ canonicalName: string; aliasMatched: string }> {
  const hits: Array<{ canonicalName: string; aliasMatched: string }> = [];
  const hay = ` ${textNorm} `;
  for (const p of REGISTRY.ccaProviders || []) {
    const canonical = String(p.canonicalName || '').trim();
    const aliases = Array.isArray(p.aliases) ? p.aliases : [];
    for (const a0 of aliases) {
      const a = normText(a0);
      if (!a) continue;
      // Word-boundary-ish substring match in normalized space.
      if (hay.includes(` ${a} `)) {
        hits.push({ canonicalName: canonical, aliasMatched: a0 });
        break;
      }
    }
  }
  // Stable ordering
  return hits.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
}

function matchDaMarkers(textNorm: string): string[] {
  const hay = ` ${textNorm} `;
  const hits: string[] = [];
  for (const m0 of REGISTRY.directAccessMarkers || []) {
    const m = normText(m0);
    if (!m) continue;
    // keep some markers as exact tokens ("esp") by requiring spaces
    if (m === 'esp') {
      if (hay.includes(' esp ')) hits.push(m0);
      continue;
    }
    if (hay.includes(` ${m} `)) hits.push(m0);
  }
  return hits;
}

const DA_LANGUAGE_MARKERS_V1 = [
  'direct access',
  'electricity provider',
  'electric service provider',
  'electricity service provider',
  'energy service provider',
  'your electricity provider',
  'your electric provider',
  'esp charges',
  'esp charge',
] as const;

function matchDaLanguageMarkers(textNorm: string): string[] {
  const hay = ` ${textNorm} `;
  const hits: string[] = [];
  for (const m0 of DA_LANGUAGE_MARKERS_V1) {
    const m = normText(m0);
    if (!m) continue;
    if (m === 'esp') {
      if (hay.includes(' esp ')) hits.push(m0);
      continue;
    }
    if (hay.includes(` ${m} `)) hits.push(m0);
  }
  return hits;
}

function matchDaProviderNames(textNorm: string): Array<{ canonicalName: string; aliasMatched: string }> {
  const hits: Array<{ canonicalName: string; aliasMatched: string }> = [];
  const hay = ` ${textNorm} `;
  for (const p of DA_REGISTRY.providers || []) {
    const canonical = String(p.canonicalName || '').trim();
    const aliases = Array.isArray(p.aliases) ? p.aliases : [];
    for (const a0 of aliases) {
      const a = normText(a0);
      if (!a) continue;
      if (hay.includes(` ${a} `)) {
        hits.push({ canonicalName: canonical, aliasMatched: a0 });
        break;
      }
    }
  }
  return hits.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
}

function uniqSortedPhrases(arr: unknown[], max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of arr || []) {
    const s = String(v ?? '').trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out.sort((a, b) => a.localeCompare(b)).slice(0, Math.max(0, Math.floor(max)));
}

export function detectSupplyStructureV1(args: {
  billPdfText: string | null;
  billHints?: SupplyStructureAnalyzerBillHintsV1 | null;
}): SupplyStructureAnalyzerOutputV1 {
  const warnings: string[] = [];
  const missingInfo: MissingInfoItemV0[] = [];

  const combinedText = `${String(args.billPdfText || '')}\n${String(args.billHints?.rateScheduleText || '')}`;
  const textNorm = normText(combinedText);

  const iouUtility = iouFromHint(args.billHints?.utilityHint);
  if (iouUtility === 'UNKNOWN') warnings.push(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_UTILITY_UNKNOWN);

  const lseHits = textNorm ? matchLseNames(textNorm) : [];
  const daMarkerHits = textNorm ? [...matchDaMarkers(textNorm), ...matchDaLanguageMarkers(textNorm)] : [];
  const daProviderHits = textNorm ? matchDaProviderNames(textNorm) : [];
  const da = Boolean(textNorm) && (daMarkerHits.length > 0 || daProviderHits.length > 0);
  const ccaKeyword =
    Boolean(textNorm) &&
    (textNorm.includes('community choice') || textNorm.includes('community choice aggregation') || /\bcca\b/.test(textNorm));
  const conflict = Boolean(da) && Boolean(lseHits.length || ccaKeyword);

  let serviceType: SupplyServiceTypeV1 = 'UNKNOWN';
  let providerType: SupplyProviderTypeV1 = 'NONE';
  let lseName: string | null = null;
  let daProviderName: string | null = null;
  let confidence = 0.15;
  let evidence: SupplyStructureEvidenceV1 = { matchedPhrases: [] };

  // Rule order (deterministic):
  // 1) DA markers trump CCA names
  // 2) Single CCA match => CCA
  // 3) Multiple matches => ambiguous
  // 4) Otherwise IOU_ONLY when utility known; else UNKNOWN
  if (da) {
    serviceType = 'DA';
    providerType = 'DA';
    daProviderName = daProviderHits.length === 1 ? daProviderHits[0].canonicalName : null;
    confidence = (() => {
      let c = 0.75;
      if (daProviderHits.length) c += 0.15;
      if (daMarkerHits.length) c += 0.1;
      if (daMarkerHits.some((m) => normText(m) === 'direct access')) c += 0.05;
      if (daProviderHits.length > 1) c -= 0.15;
      return clamp01(c);
    })();
    lseName = null;
  } else if (lseHits.length === 1) {
    serviceType = 'CCA';
    providerType = 'CCA';
    confidence = 0.87;
    lseName = lseHits[0].canonicalName || null;
  } else if (lseHits.length > 1) {
    serviceType = 'CCA';
    providerType = 'CCA';
    confidence = 0.55;
    lseName = null;
    warnings.push(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LSE_AMBIGUOUS);
    missingInfo.push(mkMissing(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LSE_AMBIGUOUS, 'Multiple CCA/LSE names matched bill text; cannot select a single provider deterministically.', 'warning'));
  } else if (ccaKeyword) {
    serviceType = 'CCA';
    providerType = 'CCA';
    confidence = 0.7;
    lseName = null;
    warnings.push(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LSE_UNSUPPORTED);
    missingInfo.push(
      mkMissing(
        SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LSE_UNSUPPORTED,
        'CCA supply appears present (CCA/community choice keyword), but the LSE could not be mapped to a supported registry entry.',
        'warning',
      ),
    );
    warnings.push(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LSE_UNDETECTED);
    missingInfo.push(mkMissing(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LSE_UNDETECTED, 'LSE (CCA/DA provider) could not be detected from bill text.', 'info'));
  } else {
    if (iouUtility !== 'UNKNOWN') {
      serviceType = 'IOU_ONLY';
      providerType = 'NONE';
      confidence = 0.6;
      lseName = null;
    } else {
      serviceType = 'UNKNOWN';
      providerType = 'NONE';
      confidence = 0.2;
      lseName = null;
    }
    // If bill text exists but no LSE detected, surface as missing (only meaningful when not DA).
    if (textNorm) {
      warnings.push(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LSE_UNDETECTED);
      missingInfo.push(mkMissing(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LSE_UNDETECTED, 'LSE (CCA/DA provider) could not be detected from bill text.', 'info'));
    }
  }

  if (conflict) {
    warnings.push(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_CONFLICT_MARKERS);
    missingInfo.push(
      mkMissing(
        SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_CONFLICT_MARKERS,
        'Bill text contains both CCA and Direct Access (DA/ESP) markers. Detection chooses a single provider type deterministically, but the document may be inconsistent.',
        'warning',
      ),
    );
  }

  if (confidence < 0.5) warnings.push(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_CONFIDENCE_LOW);

  evidence = {
    matchedPhrases: uniqSortedPhrases(
      [
        ...(providerType === 'CCA' ? lseHits.map((h) => h.aliasMatched) : []),
        ...(providerType === 'DA' && conflict ? lseHits.map((h) => h.aliasMatched) : []),
        ...(providerType === 'DA' ? daProviderHits.map((h) => h.aliasMatched) : []),
        ...daMarkerHits,
        ...(ccaKeyword ? ['cca'] : []),
      ],
      5,
    ),
  };

  return {
    serviceType,
    providerType,
    iouUtility,
    lseName,
    daProviderName,
    confidence: clamp01(confidence),
    evidence,
    warnings: uniqSorted(warnings),
    missingInfo: (missingInfo || []).slice().sort((a, b) => String(a.id).localeCompare(String(b.id))),
  };
}

