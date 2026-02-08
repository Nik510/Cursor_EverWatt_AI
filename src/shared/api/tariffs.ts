import { apiRequest } from './client';

export type CaTariffUtility = 'PGE' | 'SCE' | 'SDGE';
export type CaGasTariffUtility = 'PGE' | 'SDGE' | 'SOCALGAS';

export type TariffRateMetadataApi = {
  utility: CaTariffUtility;
  rateCode: string;
  sourceUrl: string;
  sourceTitle?: string;
  lastVerifiedAt: string;
  [k: string]: any;
};

export type GasTariffRateMetadataApi = {
  utility: CaGasTariffUtility;
  rateCode: string;
  sourceUrl: string;
  sourceTitle?: string;
  lastVerifiedAt: string;
  [k: string]: any;
};

export type CaTariffsLatestResponse = {
  success: true;
  utilities: Array<{
    utility: CaTariffUtility;
    latestSnapshot: null | {
      versionTag: string;
      capturedAt: string;
      rateCount: number;
      isStale: boolean;
      diffSummary: null | { addedRateCodes: number; removedRateCodes: number };
      previousVersionTag?: string | null;
      lastChangeDetected?: 'NO_CHANGES_VS_PREVIOUS' | 'CHANGED_VS_PREVIOUS' | 'UNKNOWN';
      metadataCompleteness?: null | {
        customerClassPct: number;
        voltagePct: number;
        effectiveDatePct: number;
        eligibilityNotesPct: number;
      };
      sourceMixByField?: {
        customerClass: Record<string, number>;
        voltage: Record<string, number>;
        eligibility: Record<string, number>;
        effective: Record<string, number>;
      };
      segmentSummaryTotal?: Record<string, number>;
      segmentSummaryShown?: Record<string, number>;
      hiddenByCurationCount?: number;
      canonicalBusinessCount?: number;
      businessRelevantShownCount?: number;
      totalRateCount?: number;
    };
    rates: TariffRateMetadataApi[];
    warning?: string;
    error?: { message: string };
  }>;
  warnings?: string[];
  errors?: Array<{ utility: string; endpoint: string; reason: string }>;
};

export async function getLatestCaTariffs(args?: {
  includeResidential?: boolean;
  includeUnknownSegment?: boolean;
  includeHidden?: boolean;
  includeNonCanon?: boolean;
  tier?: 'featured' | 'common' | 'all';
  sector?: string[]; // e.g. ["COMMERCIAL","INDUSTRIAL"]
}) {
  const qs = new URLSearchParams();
  if (args?.includeResidential) qs.set('includeResidential', '1');
  if (args?.includeUnknownSegment) qs.set('includeUnknownSegment', '1');
  if (args?.includeHidden) qs.set('includeHidden', '1');
  if (args?.includeNonCanon) qs.set('includeNonCanon', '1');
  if (args?.tier) qs.set('tier', String(args.tier));
  for (const s of args?.sector || []) qs.append('sector', String(s));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequest<CaTariffsLatestResponse>({ url: `/api/tariffs/ca/latest${suffix}` });
}

export type CaGasTariffsLatestResponse = {
  success: true;
  utilities: Array<{
    utility: CaGasTariffUtility;
    latestSnapshot: null | {
      versionTag: string;
      capturedAt: string;
      rateCount: number;
      isStale: boolean;
      diffSummary: null | { addedRateCodes: number; removedRateCodes: number };
      previousVersionTag?: string | null;
      lastChangeDetected?: 'NO_CHANGES_VS_PREVIOUS' | 'CHANGED_VS_PREVIOUS' | 'UNKNOWN';
      metadataCompleteness?: null | {
        customerClassPct: number;
        voltagePct: number;
        effectiveDatePct: number;
        eligibilityNotesPct: number;
      };
      sourceMixByField?: {
        customerClass: Record<string, number>;
        voltage: Record<string, number>;
        eligibility: Record<string, number>;
        effective: Record<string, number>;
      };
      segmentSummaryTotal?: Record<string, number>;
      segmentSummaryShown?: Record<string, number>;
      hiddenByCurationCount?: number;
      businessRelevantShownCount?: number;
      totalRateCount?: number;
    };
    rates: GasTariffRateMetadataApi[];
    warning?: string;
    error?: { message: string };
  }>;
  warnings?: string[];
  errors?: Array<{ utility: string; endpoint: string; reason: string }>;
};

export async function getLatestCaGasTariffs(args?: {
  includeResidential?: boolean;
  includeUnknownSegment?: boolean;
  includeHidden?: boolean;
  tier?: 'featured' | 'common' | 'all';
  sector?: string[];
}) {
  const qs = new URLSearchParams();
  if (args?.includeResidential) qs.set('includeResidential', '1');
  if (args?.includeUnknownSegment) qs.set('includeUnknownSegment', '1');
  if (args?.includeHidden) qs.set('includeHidden', '1');
  if (args?.tier) qs.set('tier', String(args.tier));
  for (const s of args?.sector || []) qs.append('sector', String(s));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequest<CaGasTariffsLatestResponse>({ url: `/api/tariffs/ca/gas/latest${suffix}` });
}

export type CaTariffHistoryResponse = {
  success: true;
  utility: CaTariffUtility | null;
  snapshots: Array<{
    versionTag: string;
    capturedAt: string;
    rateCount: number;
    isStale: boolean;
    diffSummary: null | { addedRateCodes: number; removedRateCodes: number; unchangedRateCodes: number };
    sourceFingerprints: Array<{ url: string; contentHash: string }>;
    segmentSummaryTotal?: Record<string, number>;
  }>;
  warnings?: string[];
};

export async function getCaTariffHistory(args: { utility: CaTariffUtility }) {
  const qs = new URLSearchParams({ utility: args.utility }).toString();
  return apiRequest<CaTariffHistoryResponse>({ url: `/api/tariffs/ca/history?${qs}` });
}

export type CaGasTariffHistoryResponse = {
  success: true;
  utility: CaGasTariffUtility | null;
  snapshots: Array<{
    versionTag: string;
    capturedAt: string;
    rateCount: number;
    isStale: boolean;
    diffSummary: null | { addedRateCodes: number; removedRateCodes: number; unchangedRateCodes: number };
    sourceFingerprints: Array<{ url: string; contentHash: string }>;
    segmentSummaryTotal?: Record<string, number>;
  }>;
  warnings?: string[];
};

export async function getCaGasTariffHistory(args: { utility: CaGasTariffUtility }) {
  const qs = new URLSearchParams({ utility: args.utility }).toString();
  return apiRequest<CaGasTariffHistoryResponse>({ url: `/api/tariffs/ca/gas/history?${qs}` });
}

export type CaTariffSnapshotResponse = {
  success: true;
  snapshot: any | null;
  isStale: boolean;
  warnings?: string[];
};

export async function getCaTariffSnapshot(args: {
  utility: CaTariffUtility;
  versionTag: string;
  includeResidential?: boolean;
  includeUnknownSegment?: boolean;
  includeHidden?: boolean;
  includeNonCanon?: boolean;
  tier?: 'featured' | 'common' | 'all';
  sector?: string[];
}) {
  // Optional commercial-first filters (API defaults to business-only unless overridden).
  const qs = new URLSearchParams();
  if (args.includeResidential) qs.set('includeResidential', '1');
  if (args.includeUnknownSegment) qs.set('includeUnknownSegment', '1');
  if (args.includeHidden) qs.set('includeHidden', '1');
  if (args.includeNonCanon) qs.set('includeNonCanon', '1');
  if (args.tier) qs.set('tier', String(args.tier));
  for (const s of args?.sector || []) qs.append('sector', String(s));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequest<CaTariffSnapshotResponse>({
    url: `/api/tariffs/ca/snapshot/${encodeURIComponent(args.utility)}/${encodeURIComponent(args.versionTag)}${suffix}`,
  });
}

export type CaGasTariffSnapshotResponse = {
  success: true;
  snapshot: any | null;
  isStale: boolean;
  warnings?: string[];
};

export async function getCaGasTariffSnapshot(args: {
  utility: CaGasTariffUtility;
  versionTag: string;
  includeResidential?: boolean;
  includeUnknownSegment?: boolean;
  includeHidden?: boolean;
  tier?: 'featured' | 'common' | 'all';
  sector?: string[];
}) {
  const qs = new URLSearchParams();
  if (args.includeResidential) qs.set('includeResidential', '1');
  if (args.includeUnknownSegment) qs.set('includeUnknownSegment', '1');
  if (args.includeHidden) qs.set('includeHidden', '1');
  if (args.tier) qs.set('tier', String(args.tier));
  for (const s of args?.sector || []) qs.append('sector', String(s));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequest<CaGasTariffSnapshotResponse>({
    url: `/api/tariffs/ca/gas/snapshot/${encodeURIComponent(args.utility)}/${encodeURIComponent(args.versionTag)}${suffix}`,
  });
}

