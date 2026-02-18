import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';
import { SupplyStructureAnalyzerReasonCodesV1, uniqSorted } from './reasons';
import type { CaIouUtilityV1, SupplyStructureAnalyzerBillHintsV1, SupplyStructureAnalyzerOutputV1, SupplyServiceTypeV1 } from './types';

import caLseRegistryJson from './caLseRegistryV1.json';

type RegistryPayload = {
  ccaProviders: Array<{ canonicalName: string; aliases: string[] }>;
  directAccessMarkers: string[];
};

const REGISTRY = caLseRegistryJson as unknown as RegistryPayload;

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

function hasDaMarker(textNorm: string): boolean {
  const hay = ` ${textNorm} `;
  for (const m0 of REGISTRY.directAccessMarkers || []) {
    const m = normText(m0);
    if (!m) continue;
    // keep some markers as exact tokens ("esp") by requiring spaces
    if (m === 'esp') {
      if (hay.includes(' esp ')) return true;
      continue;
    }
    if (hay.includes(` ${m} `)) return true;
  }
  return false;
}

export function detectSupplyStructureV1(args: {
  billPdfText: string | null;
  billHints?: SupplyStructureAnalyzerBillHintsV1 | null;
}): SupplyStructureAnalyzerOutputV1 {
  const warnings: string[] = [];
  const missingInfo: MissingInfoItemV0[] = [];

  const textNorm = normText(args.billPdfText || '');

  const iouUtility = iouFromHint(args.billHints?.utilityHint);
  if (iouUtility === 'UNKNOWN') warnings.push(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_UTILITY_UNKNOWN);

  const lseHits = textNorm ? matchLseNames(textNorm) : [];
  const da = textNorm ? hasDaMarker(textNorm) : false;
  const ccaKeyword =
    Boolean(textNorm) &&
    (textNorm.includes('community choice') || textNorm.includes('community choice aggregation') || /\bcca\b/.test(textNorm));

  let serviceType: SupplyServiceTypeV1 = 'UNKNOWN';
  let lseName: string | null = null;
  let confidence = 0.15;

  // Rule order (deterministic):
  // 1) DA markers trump CCA names
  // 2) Single CCA match => CCA
  // 3) Multiple matches => ambiguous
  // 4) Otherwise IOU_ONLY when utility known; else UNKNOWN
  if (da) {
    serviceType = 'DA';
    confidence = 0.8;
    lseName = null;
  } else if (lseHits.length === 1) {
    serviceType = 'CCA';
    confidence = 0.87;
    lseName = lseHits[0].canonicalName || null;
  } else if (lseHits.length > 1) {
    serviceType = 'CCA';
    confidence = 0.55;
    lseName = null;
    warnings.push(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LSE_AMBIGUOUS);
    missingInfo.push(mkMissing(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LSE_AMBIGUOUS, 'Multiple CCA/LSE names matched bill text; cannot select a single provider deterministically.', 'warning'));
  } else if (ccaKeyword) {
    serviceType = 'CCA';
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
      confidence = 0.6;
      lseName = null;
    } else {
      serviceType = 'UNKNOWN';
      confidence = 0.2;
      lseName = null;
    }
    // If bill text exists but no LSE detected, surface as missing (only meaningful when not DA).
    if (textNorm) {
      warnings.push(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LSE_UNDETECTED);
      missingInfo.push(mkMissing(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LSE_UNDETECTED, 'LSE (CCA/DA provider) could not be detected from bill text.', 'info'));
    }
  }

  if (confidence < 0.5) warnings.push(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_CONFIDENCE_LOW);

  return {
    serviceType,
    iouUtility,
    lseName,
    confidence: clamp01(confidence),
    warnings: uniqSorted(warnings),
    missingInfo: (missingInfo || []).slice().sort((a, b) => String(a.id).localeCompare(String(b.id))),
  };
}

