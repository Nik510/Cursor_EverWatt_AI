/**
 * EverWatt Engine API Server
 * High-performance API for battery storage analysis and recommendations
 */

import { getRequestListener } from '@hono/node-server';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { writeFile, mkdir, unlink, readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { createServer, type Server as HttpServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readIntervalData, readMonthlyBills } from './utils/excel-reader';
import { loadBatteryCatalog } from './utils/battery-catalog-loader';
import { simulatePeakShaving, detectPeakEvents, optimizeThresholdForValue } from './modules/battery/logic';
import type { BatterySpec, LoadProfile, SimulationResult } from './modules/battery/types';
import type { UtilityInputs } from './modules/utilityIntelligence/types';
import { analyzeBatteryEfficiency } from './modules/battery/efficiency-diagnostics';
import { classifyPeakPatterns, analyzeEventFrequency } from './modules/battery/peak-pattern-analysis';
import { buildUsageOptimization } from './modules/battery/usage-optimization';
import { recommendOptimalSizing } from './modules/battery/optimal-sizing';
import { generateBestRecommendation, type DemandResponseParams } from './modules/battery/multi-tier-analysis';
import { computeDrPanel, type ApiDemandResponseParams } from './modules/battery/dr-panel';
import { toDrPanelV2 } from './modules/battery/dr-panel-adapter';
// NEW: Physics-first optimal battery selection algorithm with Marginal Analysis
import { 
  computeCapDiscoveryAcrossMonths,
  selectOptimalBatteries, 
  ALGORITHM_CONFIG,
  type CatalogBattery,
  type SelectionResult
} from './modules/battery/optimal-selection';
import { checkSRateEligibility, isAlreadyOnOptionS } from './utils/rates/s-rate-eligibility';
import { calculateOptionSDemandCharges, DEFAULT_OPTION_S_RATES_2025_SECONDARY } from './utils/battery/s-rate-calculations';
import { runOptionSDispatch, runStandardPeakShavingDispatch } from './modules/battery/dispatch';
import { calculateFinancialAnalysis } from './modules/financials/calculations';
import type { FinancialParameters } from './core/types';
import { getCatalogPath } from './config';
// Comprehensive utility data reader for full data capture
import { 
  readComprehensiveUsageData, 
  createUtilityDataPackage 
} from './utils/utility-data-reader';
import { login as adminLogin, verifySession, logout as adminLogout, hasPermission } from './backend/admin/auth';
import type { AdminSession, UserRole } from './backend/admin/types';
import { signJwt, verifyJwt, getBearerTokenFromAuthHeader } from './services/auth-service';
import { authMiddleware, requireRole as requireJwtRole } from './middleware/auth';
import { ensureDatabaseSchema, isDatabaseEnabled } from './db/client';
import { isApiError } from './middleware/error-handler';
import { securityHeaders } from './middleware/security';
import { rateLimit } from './middleware/rate-limit';
import { parseGoogleSheetsUrl, toGoogleSheetsCsvExportUrl } from './utils/google-sheets';
import { BillingPeriodSchema, IntervalRowSchema } from './modules/tariffEngine/schema';
import { assignIntervalsToBillingCycles } from './modules/tariffEngine/join';
import { calculateBillsPerCycle } from './modules/tariffEngine/billing';
import { identifyTariff } from './modules/tariffEngine/identify';
import { generateCandidateCapsKw } from './modules/tariffEngine/scenarios';
import { buildBillingCycleAnalyses } from './modules/tariffEngine/cycle-analysis';
import { gradeBatteryEconomics } from './utils/economics/battery-economics';
import { isSnapshotStale } from './modules/tariffLibrary';
import { listSnapshots, loadLatestSnapshot, loadSnapshot } from './modules/tariffLibrary/storage';
import { isGasSnapshotStale } from './modules/tariffLibraryGas';
import { listGasSnapshots, loadGasSnapshot, loadLatestGasSnapshot } from './modules/tariffLibraryGas/storage';
import { applyGasTariffSegmentV0 } from './modules/tariffLibraryGas/segmentV0';
import { getUtilityRegistryCA } from './modules/utilityRegistry/v1/registry';
import { applyTariffSegmentV1 } from './modules/tariffLibrary/segmentV1';
import { applyTariffReadinessVNext } from './modules/tariffLibrary/readinessVNext';
import { applyTariffBusinessCanonV1 } from './modules/tariffLibrary/businessCanonV1';
import { applyTariffEffectiveStatusV1 } from './modules/tariffLibrary/effectiveStatusV1';
import { applyTariffCurationV1, loadTariffCurationV1 } from './modules/policy/curation/loadTariffCurationV1';
import { getLatestProgramsV1 } from './modules/programLibrary/v1';

const DEFAULT_UPLOADS_DIR = path.join(tmpdir(), 'everwatt-uploads');
const DEFAULT_SAMPLES_DIR = path.join(process.cwd(), 'samples');

function resolveAllowlistedPath(rawPath: string, allowRoots: string[]): string | null {
  const fp = String(rawPath || '').trim();
  if (!fp) return null;
  const abs = path.resolve(path.isAbsolute(fp) ? fp : path.join(process.cwd(), fp));
  for (const rootRaw of allowRoots) {
    const root = path.resolve(String(rootRaw || ''));
    if (!root) continue;
    if (abs === root) return abs;
    if (abs.startsWith(root + path.sep)) return abs;
  }
  return null;
}

function makeRequestScopedIdFactory(args: { prefix: string; runId: string }): () => string {
  const prefix = String(args.prefix || 'id').trim() || 'id';
  const runId = String(args.runId || '').trim() || 'run';
  let i = 0;
  return () => `${prefix}_${runId}_${++i}`;
}

const app = new Hono();

// Enable CORS for frontend
app.use('*', cors());
// Basic security headers
app.use('*', securityHeaders());
// Attach JWT user (if present) onto context
app.use('*', authMiddleware);
// Rate limit API routes (in-memory; tune via env)
app.use('/api/*', rateLimit());
// Stricter rate limit for AI routes (can be tuned independently)
app.use(
  '/api/ai/*',
  rateLimit({
    windowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.AI_RATE_LIMIT_MAX || 60),
  })
);

// Standardize "not found" responses
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404);
});

// Standardize unhandled errors
app.onError((err, c) => {
  const status = isApiError(err) ? err.status : 500;
  const message = err instanceof Error ? err.message : 'Internal server error';
  if (status >= 500) console.error('Unhandled API error:', err);
  return c.json(
    {
      success: false,
      error: message,
      ...(isApiError(err) && err.code ? { code: err.code } : {}),
      ...(isApiError(err) && err.details ? { details: err.details } : {}),
    },
    status as any
  );
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * ==========================================
 * UTILITY REGISTRY (CA) (v1)
 * ==========================================
 */
app.get('/api/utilities/ca/registry', async (c) => {
  try {
    const utilities = getUtilityRegistryCA();
    const warnings: string[] = [];
    for (const u of utilities) {
      const utilityKey = String((u as any).utilityKey);
      const by = (u as any)?.tariffAcquisitionByCommodity || null;
      const commodities = Array.isArray((u as any)?.commodities) ? ((u as any).commodities as string[]) : [];
      if (by && typeof by === 'object') {
        for (const c of commodities.length ? commodities : Object.keys(by)) {
          const method = String((by as any)?.[c] || '').toUpperCase();
          if (method && method.startsWith('MANUAL')) warnings.push(`${utilityKey} [${String(c).toUpperCase()}]: ${method} (manual ingest likely required)`);
          if (method === 'UNKNOWN') warnings.push(`${utilityKey} [${String(c).toUpperCase()}]: tariff acquisition method is unknown`);
        }
      } else {
        const method = String((u as any)?.tariffAcquisitionMethod || '').toUpperCase();
        if (method && method.startsWith('MANUAL')) warnings.push(`${utilityKey}: ${method} (manual ingest likely required)`);
        if (method === 'UNKNOWN') warnings.push(`${utilityKey}: tariff acquisition method is unknown`);
      }
    }
    return c.json({ success: true, utilities, warnings });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    return c.json({ success: true, utilities: [], warnings: [`registry failed: ${reason}`], errors: [{ endpoint: 'utilities.ca.registry', reason }] });
  }
});

/**
 * ==========================================
 * PROGRAM LIBRARY (CA) (v1) - COMMERCIAL ONLY (default)
 * ==========================================
 */
app.get('/api/programs/ca/latest', async (c) => {
  const utilityRaw = String(c.req.query('utility') || '').trim().toUpperCase();
  const allowResidential = String(c.req.query('allowResidential') || '').trim() === '1';
  const onlyParticipatedBefore = String(c.req.query('onlyParticipatedBefore') || '').trim() === '1';
  const utilities = utilityRaw ? [utilityRaw] : ['PGE', 'SCE', 'SDGE'];

  const warnings: string[] = [];
  const errors: Array<{ utility: string; endpoint: string; reason: string }> = [];
  const out: any[] = [];
  let programCurationMeta: any | null = null;

  for (const utilityKey of utilities) {
    try {
      const res = await getLatestProgramsV1({ utilityKey, allowResidential, onlyParticipatedBefore });
      warnings.push(...(res.warnings || []).map((w) => `[${utilityKey}] ${w}`));
      if (!programCurationMeta && (res as any).curationStatus) programCurationMeta = (res as any).curationStatus;
      out.push({
        utilityKey,
        latestSnapshot: res.versionTag
          ? { versionTag: res.versionTag, capturedAt: res.capturedAt, isStale: res.isStale, programCount: (res.programs || []).length }
          : null,
        programs: res.programs || [],
        ...(res.curationStatus ? { curationStatus: res.curationStatus } : {}),
      });
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      warnings.push(`${utilityKey}: failed to load latest programs (${reason})`);
      errors.push({ utility: utilityKey, endpoint: 'programs.ca.latest', reason });
      out.push({ utilityKey, latestSnapshot: null, programs: [], error: { message: reason } });
    }
  }

  return c.json({
    success: true,
    utilities: out,
    warnings,
    ...(programCurationMeta ? { curationStatus: { programCuration: programCurationMeta } } : {}),
    ...(errors.length ? { errors } : {}),
  });
});

/**
 * ==========================================
 * TARIFF LIBRARY (CA) - METADATA ONLY (v0)
 * ==========================================
 */
app.get('/api/tariffs/ca/latest', async (c) => {
  const nowIso = new Date().toISOString();
  const utilities = ['PGE', 'SCE', 'SDGE'] as const;

  const warnings: string[] = [];
  const errors: Array<{ utility: string; endpoint: string; reason: string }> = [];
  const out = [];

  function sourceMixByField(rates: any[], fieldSourceKey: string): Record<string, number> {
    const d: Record<string, number> = {};
    for (const r of rates || []) {
      const s = String(r?.[fieldSourceKey] || '').toLowerCase().trim() || 'unknown';
      d[s] = (d[s] || 0) + 1;
    }
    return d;
  }

  function segmentSummary(rates: any[]): Record<string, number> {
    const d: Record<string, number> = {};
    for (const r of rates || []) {
      const s = String((r as any)?.customerSegment || 'unknown');
      d[s] = (d[s] || 0) + 1;
    }
    return d;
  }

  function filterRates(args: {
    rates: any[];
    includeResidential: boolean;
    includeUnknownSegment: boolean;
    sectors?: string[];
    tier: 'top' | 'featured' | 'common' | 'all';
    includeHidden: boolean;
    includeNonCanon: boolean;
  }): any[] {
    // Non-residential-first filtering (used only when explicit query params are provided).
    const allowedSectorGroups = new Set<string>(['non_residential']);
    if (args.includeResidential) allowedSectorGroups.add('residential');
    if (args.includeUnknownSegment) allowedSectorGroups.add('unknown');

    return (args.rates || [])
      .filter((r) => (args.includeHidden ? true : !Boolean((r as any).curationHidden)))
      .filter((r) => (args.includeNonCanon ? true : Boolean((r as any).isEverWattCanonicalBusiness)))
      .filter((r) => {
        const t = String((r as any).popularityTier || 'all');
        if (args.tier === 'all') return true;
        if (args.tier === 'common') return t === 'top' || t === 'featured' || t === 'common';
        if (args.tier === 'featured') return t === 'top' || t === 'featured';
        return t === 'top';
      })
      .filter((r) => {
        const sg = String((r as any).sectorGroup || '').trim();
        if (sg) return allowedSectorGroups.has(sg);
        const seg = String((r as any).customerSegment || 'unknown');
        const derived = seg === 'residential' ? 'residential' : seg === 'unknown' ? 'unknown' : 'non_residential';
        return allowedSectorGroups.has(derived);
      })
      .filter((r) => {
        if (!Array.isArray(args.sectors) || args.sectors.length === 0) return true;
        const seg = String((r as any).customerSegment || 'unknown').trim().toLowerCase() || 'unknown';
        return args.sectors.includes(seg);
      });
  }

  // UI-only default filtering (v1.7): by default return ALL decorated rates.
  // Server-side filtering is supported only when any filter query param is explicitly provided.
  const qIncludeResidential = c.req.query('includeResidential');
  const qIncludeUnknownSegment = c.req.query('includeUnknownSegment');
  const qIncludeHidden = c.req.query('includeHidden');
  const qIncludeNonCanon = c.req.query('includeNonCanon');
  const qTier = c.req.query('tier');
  const sp = new URL(c.req.url).searchParams;
  const sectorTokens = sp
    .getAll('sector')
    .flatMap((s) => String(s || '').split(','))
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  const sectorMap: Record<string, string> = {
    RESIDENTIAL: 'residential',
    COMMERCIAL: 'commercial',
    INDUSTRIAL: 'industrial',
    AGRICULTURAL: 'agricultural',
    INSTITUTIONAL: 'institutional',
    GOVERNMENT: 'government',
    OTHER: 'other',
    UNKNOWN: 'unknown',
  };
  const sectors = sectorTokens
    .map((t) => sectorMap[String(t).toUpperCase()] || '')
    .filter(Boolean);
  const invalidSectors = sectorTokens.filter((t) => !sectorMap[String(t).toUpperCase()]);
  if (invalidSectors.length) warnings.push(`invalid sector values ignored: ${invalidSectors.join(', ')}`);
  const anyFilterParamProvided =
    qIncludeResidential !== undefined ||
    qIncludeUnknownSegment !== undefined ||
    qIncludeHidden !== undefined ||
    qIncludeNonCanon !== undefined ||
    qTier !== undefined ||
    sp.has('sector');

  const includeResidential = String(qIncludeResidential || '').trim() === '1';
  const includeUnknownSegment = String(qIncludeUnknownSegment || '').trim() === '1';
  const includeHidden = String(qIncludeHidden || '').trim() === '1';
  const includeNonCanon = String(qIncludeNonCanon || '').trim() === '1';
  const tierRaw = String(qTier || '').trim().toLowerCase();
  const tier: 'top' | 'featured' | 'common' | 'all' =
    tierRaw === 'top' || tierRaw === 'featured' || tierRaw === 'common' || tierRaw === 'all' ? (tierRaw as any) : 'all';

  const { items: tariffCurationItems, warnings: curWarnings, loadedFromPath: tariffCurationPath, capturedAtIso: tariffCurationCapturedAtIso, version: tariffCurationVersion } =
    loadTariffCurationV1();
  warnings.push(...curWarnings.map((w) => `[tariffCuration] ${w}`));
  const tariffCurationStatus = {
    loadedFromPath: tariffCurationPath,
    capturedAtIso: tariffCurationCapturedAtIso ?? null,
    version: tariffCurationVersion ?? null,
    itemCount: Array.isArray(tariffCurationItems) ? tariffCurationItems.length : 0,
    hiddenRuleCount: (tariffCurationItems || []).filter((x: any) => x && typeof x === 'object' && Boolean((x as any).hidden)).length,
    topRuleCount: (tariffCurationItems || []).filter((x: any) => String((x as any).tier || '').toLowerCase() === 'top').length,
    featuredRuleCount: (tariffCurationItems || []).filter((x: any) => String((x as any).tier || '').toLowerCase() === 'featured').length,
  };

  for (const utility of utilities) {
    let snap: any | null = null;
    try {
      snap = await loadLatestSnapshot(utility);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      warnings.push(`${utility}: failed to load latest snapshot (${reason})`);
      errors.push({ utility, endpoint: 'tariffs.ca.latest', reason });
      out.push({
        utility,
        latestSnapshot: null,
        rates: [],
        warning: 'Tariff snapshots failed to load (see errors).',
        error: { message: reason },
      });
      continue;
    }
    if (!snap) {
      warnings.push(`${utility}: no snapshots found on disk`);
      out.push({
        utility,
        latestSnapshot: null,
        rates: [],
        warning: 'Tariff snapshots not loaded. Run: npm run tariffs:ingest:ca',
      });
      continue;
    }
    const rateCount = Array.isArray(snap.rates) ? snap.rates.length : 0;
    const added = snap.diffFromPrevious?.addedRateCodes?.length || 0;
    const removed = snap.diffFromPrevious?.removedRateCodes?.length || 0;
    const prevTag = snap.diffFromPrevious?.previousVersionTag || null;
    const rawRates = Array.isArray(snap.rates) ? snap.rates : [];

    // Decorate + curate (commercial-first truth is derived at response time; snapshots stay raw).
    const decorated = applyTariffCurationV1({
      rates: rawRates.map((r: any) => applyTariffEffectiveStatusV1(applyTariffBusinessCanonV1(applyTariffReadinessVNext(applyTariffSegmentV1(r))))),
      items: tariffCurationItems,
    });
    const shownRates = anyFilterParamProvided
      ? filterRates({ rates: decorated, includeResidential, includeUnknownSegment, sectors, tier, includeHidden, includeNonCanon })
      : decorated;
    const hiddenByCurationCount = decorated.filter((r: any) => Boolean(r.curationHidden)).length;
    const businessRelevantShownCount = shownRates.filter((r: any) => Boolean(r.isBusinessRelevant)).length;
    const totalRateCount = decorated.length;
    const canonicalBusinessCount = decorated.filter((r: any) => Boolean(r.isEverWattCanonicalBusiness) && Boolean(r.isBusinessRelevant)).length;
    const filterSummary =
      anyFilterParamProvided
        ? (() => {
            const allowedSectorGroups = new Set<string>(['non_residential']);
            if (includeResidential) allowedSectorGroups.add('residential');
            if (includeUnknownSegment) allowedSectorGroups.add('unknown');
            const sectorsSet = new Set((sectors || []).map((s) => String(s).toLowerCase()));
            function sectorGroupOf(r: any): string {
              const sg = String((r as any).sectorGroup || '').trim();
              if (sg) return sg;
              const seg = String((r as any).customerSegment || 'unknown');
              return seg === 'residential' ? 'residential' : seg === 'unknown' ? 'unknown' : 'non_residential';
            }
            function tierAllows(tRaw: any): boolean {
              const t = String(tRaw || 'all');
              if (tier === 'all') return true;
              if (tier === 'common') return t === 'top' || t === 'featured' || t === 'common';
              if (tier === 'featured') return t === 'top' || t === 'featured';
              return t === 'top';
            }
            const candidatesForSector = decorated.filter((r: any) => allowedSectorGroups.has(sectorGroupOf(r)));
            return {
              filtersApplied: {
                includeResidential,
                includeUnknownSegment,
                includeHidden,
                includeNonCanon,
                tier,
                sectors: Array.from(sectorsSet),
              },
              excludedCounts: {
                hiddenByCuration: includeHidden ? 0 : decorated.filter((r: any) => Boolean(r.curationHidden)).length,
                residential: includeResidential ? 0 : decorated.filter((r: any) => sectorGroupOf(r) === 'residential').length,
                unknownSegment: includeUnknownSegment ? 0 : decorated.filter((r: any) => sectorGroupOf(r) === 'unknown').length,
                nonCanon: includeNonCanon
                  ? 0
                  : decorated.filter((r: any) => Boolean((r as any).isBusinessRelevant) && !Boolean((r as any).isEverWattCanonicalBusiness)).length,
                tier: tier === 'all' ? 0 : decorated.filter((r: any) => !tierAllows((r as any).popularityTier)).length,
                sector: sectorsSet.size
                  ? candidatesForSector.filter((r: any) => {
                      const seg = String((r as any).customerSegment || 'unknown').trim().toLowerCase() || 'unknown';
                      return !sectorsSet.has(seg);
                    }).length
                  : 0,
              },
            };
          })()
        : null;

    function tierAllows(tRaw: any): boolean {
      const t = String(tRaw || 'all');
      if (tier === 'all') return true;
      if (tier === 'common') return t === 'top' || t === 'featured' || t === 'common';
      if (tier === 'featured') return t === 'top' || t === 'featured';
      return t === 'top';
    }
    const tierCounts = {
      top: decorated.filter((r: any) => String(r.popularityTier || 'all') === 'top').length,
      featured: decorated.filter((r: any) => String(r.popularityTier || 'all') === 'top' || String(r.popularityTier || 'all') === 'featured').length,
      common: decorated.filter((r: any) => {
        const t = String(r.popularityTier || 'all');
        return t === 'top' || t === 'featured' || t === 'common';
      }).length,
      all: decorated.length,
    };

    out.push({
      utility,
      latestSnapshot: {
        versionTag: snap.versionTag,
        capturedAt: snap.capturedAt,
        rateCount,
        isStale: isSnapshotStale(snap.capturedAt, nowIso, 14),
        diffSummary: snap.diffFromPrevious ? { addedRateCodes: added, removedRateCodes: removed } : null,
        previousVersionTag: prevTag,
        lastChangeDetected: snap.diffFromPrevious
          ? added === 0 && removed === 0
            ? 'NO_CHANGES_VS_PREVIOUS'
            : 'CHANGED_VS_PREVIOUS'
          : 'UNKNOWN',
        metadataCompleteness: (snap as any).metadataCompleteness || null,
        sourceMixByField: {
          customerClass: sourceMixByField(decorated, 'customerClassSource'),
          voltage: sourceMixByField(decorated, 'voltageSource'),
          eligibility: sourceMixByField(decorated, 'eligibilitySource'),
          effective: sourceMixByField(decorated, 'effectiveSource'),
        },
        segmentSummaryTotal: segmentSummary(decorated),
        segmentSummaryShown: segmentSummary(shownRates),
        hiddenByCurationCount,
        canonicalBusinessCount,
        businessRelevantShownCount,
        totalRateCount,
        tierCounts,
        ...(filterSummary ? { filterSummary } : {}),
      },
      rates: shownRates,
    });
  }

  return c.json({
    success: true,
    utilities: out,
    warnings,
    curationStatus: { tariffCuration: tariffCurationStatus },
    ...(errors.length ? { errors } : {}),
  });
});

app.get('/api/tariffs/ca/history', async (c) => {
  const nowIso = new Date().toISOString();
  const utilityRaw = String(c.req.query('utility') || '').trim().toUpperCase();
  const utility = utilityRaw === 'PGE' || utilityRaw === 'SCE' || utilityRaw === 'SDGE' ? (utilityRaw as 'PGE' | 'SCE' | 'SDGE') : null;

  const warnings: string[] = [];
  if (!utility) {
    warnings.push('utility query param is required: PGE|SCE|SDGE');
    return c.json({ success: true, utility: null, snapshots: [], warnings });
  }

  let tags: string[] = [];
  try {
    tags = await listSnapshots(utility);
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    warnings.push(`${utility}: failed to list snapshots (${reason})`);
    return c.json({ success: true, utility, snapshots: [], warnings, errors: [{ utility, endpoint: 'tariffs.ca.history', reason }] });
  }
  if (!tags.length) {
    warnings.push(`${utility}: no snapshots found on disk`);
    return c.json({ success: true, utility, snapshots: [], warnings });
  }

  const snapshots = [];
  for (const versionTag of tags) {
    let snap: any | null = null;
    try {
      snap = await loadSnapshot(utility, versionTag);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      warnings.push(`${utility}: failed to load snapshot ${versionTag} (${reason})`);
      continue;
    }
    if (!snap) {
      warnings.push(`${utility}: failed to load snapshot ${versionTag}`);
      continue;
    }
    const rateCount = Array.isArray(snap.rates) ? snap.rates.length : 0;
    const decorated = Array.isArray(snap.rates) ? snap.rates.map((r: any) => applyTariffSegmentV1(r)) : [];
    const seg: Record<string, number> = {};
    for (const r of decorated) {
      const s = String((r as any)?.customerSegment || 'unknown');
      seg[s] = (seg[s] || 0) + 1;
    }
    const added = snap.diffFromPrevious?.addedRateCodes?.length || 0;
    const removed = snap.diffFromPrevious?.removedRateCodes?.length || 0;
    snapshots.push({
      versionTag: snap.versionTag,
      capturedAt: snap.capturedAt,
      rateCount,
      isStale: isSnapshotStale(snap.capturedAt, nowIso, 14),
      diffSummary: snap.diffFromPrevious ? { addedRateCodes: added, removedRateCodes: removed, unchangedRateCodes: snap.diffFromPrevious.unchangedRateCodes?.length || 0 } : null,
      sourceFingerprints: Array.isArray(snap.sourceFingerprints) ? snap.sourceFingerprints : [],
      segmentSummaryTotal: seg,
    });
  }

  // chronological (oldest -> newest) because listSnapshots sorts ascending
  return c.json({ success: true, utility, snapshots, warnings });
});

app.get('/api/tariffs/ca/snapshot/:utility/:versionTag', async (c) => {
  const nowIso = new Date().toISOString();
  const utilityRaw = String(c.req.param('utility') || '').trim().toUpperCase();
  const versionTag = String(c.req.param('versionTag') || '').trim();
  const utility = utilityRaw === 'PGE' || utilityRaw === 'SCE' || utilityRaw === 'SDGE' ? (utilityRaw as 'PGE' | 'SCE' | 'SDGE') : null;

  const warnings: string[] = [];
  if (!utility) warnings.push(`invalid utility: ${utilityRaw || '(missing)'}`);
  if (!versionTag) warnings.push('versionTag is required');
  if (!utility || !versionTag) {
    return c.json({ success: true, snapshot: null, isStale: true, warnings });
  }

  let snap: any | null = null;
  try {
    snap = await loadSnapshot(utility, versionTag);
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    warnings.push(`${utility}: failed to load snapshot ${versionTag} (${reason})`);
    return c.json({ success: true, snapshot: null, isStale: true, warnings, errors: [{ utility, endpoint: 'tariffs.ca.snapshot', reason }] });
  }
  if (!snap) {
    warnings.push(`${utility}: snapshot not found: ${versionTag}`);
    return c.json({ success: true, snapshot: null, isStale: true, warnings });
  }

  // UI-only default filtering: return ALL decorated rates unless filter params are explicitly provided.
  const qIncludeResidential = c.req.query('includeResidential');
  const qIncludeUnknownSegment = c.req.query('includeUnknownSegment');
  const qIncludeHidden = c.req.query('includeHidden');
  const qIncludeNonCanon = c.req.query('includeNonCanon');
  const qTier = c.req.query('tier');
  const sp = new URL(c.req.url).searchParams;
  const sectorTokens = sp
    .getAll('sector')
    .flatMap((s) => String(s || '').split(','))
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  const sectorMap: Record<string, string> = {
    RESIDENTIAL: 'residential',
    COMMERCIAL: 'commercial',
    INDUSTRIAL: 'industrial',
    AGRICULTURAL: 'agricultural',
    INSTITUTIONAL: 'institutional',
    GOVERNMENT: 'government',
    OTHER: 'other',
    UNKNOWN: 'unknown',
  };
  const sectors = sectorTokens
    .map((t) => sectorMap[String(t).toUpperCase()] || '')
    .filter(Boolean);
  const invalidSectors = sectorTokens.filter((t) => !sectorMap[String(t).toUpperCase()]);
  if (invalidSectors.length) warnings.push(`invalid sector values ignored: ${invalidSectors.join(', ')}`);
  const anyFilterParamProvided =
    qIncludeResidential !== undefined ||
    qIncludeUnknownSegment !== undefined ||
    qIncludeHidden !== undefined ||
    qIncludeNonCanon !== undefined ||
    qTier !== undefined ||
    sp.has('sector');

  const includeResidential = String(qIncludeResidential || '').trim() === '1';
  const includeUnknownSegment = String(qIncludeUnknownSegment || '').trim() === '1';
  const includeHidden = String(qIncludeHidden || '').trim() === '1';
  const includeNonCanon = String(qIncludeNonCanon || '').trim() === '1';
  const tierRaw = String(qTier || '').trim().toLowerCase();
  const tier: 'top' | 'featured' | 'common' | 'all' =
    tierRaw === 'top' || tierRaw === 'featured' || tierRaw === 'common' || tierRaw === 'all' ? (tierRaw as any) : 'all';
  const { items: tariffCurationItems, warnings: curWarnings, loadedFromPath: tariffCurationPath, capturedAtIso: tariffCurationCapturedAtIso, version: tariffCurationVersion } =
    loadTariffCurationV1();
  warnings.push(...curWarnings.map((w) => `[tariffCuration] ${w}`));
  const tariffCurationStatus = {
    loadedFromPath: tariffCurationPath,
    capturedAtIso: tariffCurationCapturedAtIso ?? null,
    version: tariffCurationVersion ?? null,
    itemCount: Array.isArray(tariffCurationItems) ? tariffCurationItems.length : 0,
    hiddenRuleCount: (tariffCurationItems || []).filter((x: any) => x && typeof x === 'object' && Boolean((x as any).hidden)).length,
    topRuleCount: (tariffCurationItems || []).filter((x: any) => String((x as any).tier || '').toLowerCase() === 'top').length,
    featuredRuleCount: (tariffCurationItems || []).filter((x: any) => String((x as any).tier || '').toLowerCase() === 'featured').length,
  };

  const rawRates = Array.isArray(snap.rates) ? snap.rates : [];
  const decorated = applyTariffCurationV1({
    rates: rawRates.map((r: any) => applyTariffEffectiveStatusV1(applyTariffBusinessCanonV1(applyTariffReadinessVNext(applyTariffSegmentV1(r))))),
    items: tariffCurationItems,
  });

  const allowedSectorGroups = new Set<string>(['non_residential']);
  if (includeResidential) allowedSectorGroups.add('residential');
  if (includeUnknownSegment) allowedSectorGroups.add('unknown');
  const shownRates = decorated
    .filter((r: any) => (anyFilterParamProvided ? (includeHidden ? true : !Boolean(r.curationHidden)) : true))
    .filter((r: any) => (anyFilterParamProvided ? (includeNonCanon ? true : Boolean(r.isEverWattCanonicalBusiness)) : true))
    .filter((r: any) => {
      if (!anyFilterParamProvided) return true;
      const t = String(r.popularityTier || 'all');
      if (tier === 'all') return true;
      if (tier === 'common') return t === 'top' || t === 'featured' || t === 'common';
      if (tier === 'featured') return t === 'top' || t === 'featured';
      return t === 'top';
    })
    .filter((r: any) => {
      if (!anyFilterParamProvided) return true;
      const sg = String((r as any).sectorGroup || '').trim();
      if (sg) return allowedSectorGroups.has(sg);
      const seg = String((r as any).customerSegment || 'unknown');
      const derived = seg === 'residential' ? 'residential' : seg === 'unknown' ? 'unknown' : 'non_residential';
      return allowedSectorGroups.has(derived);
    })
    .filter((r: any) => {
      if (!anyFilterParamProvided) return true;
      if (!Array.isArray(sectors) || sectors.length === 0) return true;
      const seg = String((r as any).customerSegment || 'unknown').trim().toLowerCase() || 'unknown';
      return sectors.includes(seg);
    });

  const segTotal: Record<string, number> = {};
  const segShown: Record<string, number> = {};
  for (const r of decorated) segTotal[String((r as any).customerSegment || 'unknown')] = (segTotal[String((r as any).customerSegment || 'unknown')] || 0) + 1;
  for (const r of shownRates) segShown[String((r as any).customerSegment || 'unknown')] = (segShown[String((r as any).customerSegment || 'unknown')] || 0) + 1;
  const tierCounts = {
    top: decorated.filter((r: any) => String(r.popularityTier || 'all') === 'top').length,
    featured: decorated.filter((r: any) => {
      const t = String(r.popularityTier || 'all');
      return t === 'top' || t === 'featured';
    }).length,
    common: decorated.filter((r: any) => {
      const t = String(r.popularityTier || 'all');
      return t === 'top' || t === 'featured' || t === 'common';
    }).length,
    all: decorated.length,
  };
  const filterSummary =
    anyFilterParamProvided
      ? (() => {
          const sectorsSet = new Set((sectors || []).map((s) => String(s).toLowerCase()));
          function sectorGroupOf(r: any): string {
            const sg = String((r as any).sectorGroup || '').trim();
            if (sg) return sg;
            const seg = String((r as any).customerSegment || 'unknown');
            return seg === 'residential' ? 'residential' : seg === 'unknown' ? 'unknown' : 'non_residential';
          }
          function tierAllows(tRaw: any): boolean {
            const t = String(tRaw || 'all');
            if (tier === 'all') return true;
            if (tier === 'common') return t === 'top' || t === 'featured' || t === 'common';
            if (tier === 'featured') return t === 'top' || t === 'featured';
            return t === 'top';
          }
          const candidatesForSector = decorated.filter((r: any) => allowedSectorGroups.has(sectorGroupOf(r)));
          return {
            filtersApplied: {
              includeResidential,
              includeUnknownSegment,
              includeHidden,
              includeNonCanon,
              tier,
              sectors: Array.from(sectorsSet),
            },
            excludedCounts: {
              hiddenByCuration: includeHidden ? 0 : decorated.filter((r: any) => Boolean(r.curationHidden)).length,
              residential: includeResidential ? 0 : decorated.filter((r: any) => sectorGroupOf(r) === 'residential').length,
              unknownSegment: includeUnknownSegment ? 0 : decorated.filter((r: any) => sectorGroupOf(r) === 'unknown').length,
              nonCanon: includeNonCanon
                ? 0
                : decorated.filter((r: any) => Boolean((r as any).isBusinessRelevant) && !Boolean((r as any).isEverWattCanonicalBusiness)).length,
              tier: tier === 'all' ? 0 : decorated.filter((r: any) => !tierAllows((r as any).popularityTier)).length,
              sector: sectorsSet.size
                ? candidatesForSector.filter((r: any) => {
                    const seg = String((r as any).customerSegment || 'unknown').trim().toLowerCase() || 'unknown';
                    return !sectorsSet.has(seg);
                  }).length
                : 0,
            },
          };
        })()
      : null;

  return c.json({
    success: true,
    snapshot: {
      ...(snap as any),
      rates: shownRates,
      segmentSummaryTotal: segTotal,
      segmentSummaryShown: segShown,
      tierCounts,
      ...(filterSummary ? { filterSummary } : {}),
    },
    isStale: isSnapshotStale(snap.capturedAt, nowIso, 14),
    warnings,
    curationStatus: { tariffCuration: tariffCurationStatus },
  });
});

/**
 * ==========================================
 * GAS TARIFF LIBRARY (CA) - METADATA ONLY (v0)
 * ==========================================
 */
app.get('/api/tariffs/ca/gas/latest', async (c) => {
  const nowIso = new Date().toISOString();
  const utilities = ['PGE', 'SDGE', 'SOCALGAS'] as const;

  const warnings: string[] = [];
  const errors: Array<{ utility: string; endpoint: string; reason: string }> = [];
  const out: any[] = [];

  function sourceMixByField(rates: any[], fieldSourceKey: string): Record<string, number> {
    const d: Record<string, number> = {};
    for (const r of rates || []) {
      const s = String(r?.[fieldSourceKey] || '').toLowerCase().trim() || 'unknown';
      d[s] = (d[s] || 0) + 1;
    }
    return d;
  }

  function segmentSummary(rates: any[]): Record<string, number> {
    const d: Record<string, number> = {};
    for (const r of rates || []) {
      const s = String((r as any)?.customerSegment || 'unknown');
      d[s] = (d[s] || 0) + 1;
    }
    return d;
  }

  function filterRates(args: {
    rates: any[];
    includeResidential: boolean;
    includeUnknownSegment: boolean;
    sectors?: string[];
    tier: 'top' | 'featured' | 'common' | 'all';
    includeHidden: boolean;
  }): any[] {
    const allowedSectorGroups = new Set<string>(['non_residential']);
    if (args.includeResidential) allowedSectorGroups.add('residential');
    if (args.includeUnknownSegment) allowedSectorGroups.add('unknown');

    return (args.rates || [])
      .filter((r) => (args.includeHidden ? true : !Boolean((r as any).curationHidden)))
      .filter((r) => {
        const t = String((r as any).popularityTier || 'all');
        if (args.tier === 'all') return true;
        if (args.tier === 'common') return t === 'top' || t === 'featured' || t === 'common';
        if (args.tier === 'featured') return t === 'top' || t === 'featured';
        return t === 'top';
      })
      .filter((r) => {
        const sg = String((r as any).sectorGroup || '').trim();
        if (sg) return allowedSectorGroups.has(sg);
        const seg = String((r as any).customerSegment || 'unknown');
        const derived = seg === 'residential' ? 'residential' : seg === 'unknown' ? 'unknown' : 'non_residential';
        return allowedSectorGroups.has(derived);
      })
      .filter((r) => {
        if (!Array.isArray(args.sectors) || args.sectors.length === 0) return true;
        const seg = String((r as any).customerSegment || 'unknown').trim().toLowerCase() || 'unknown';
        return args.sectors.includes(seg);
      });
  }

  // UI-only default filtering: by default return ALL decorated rates.
  // Server-side filtering is supported only when any filter query param is explicitly provided.
  const qIncludeResidential = c.req.query('includeResidential');
  const qIncludeUnknownSegment = c.req.query('includeUnknownSegment');
  const qIncludeHidden = c.req.query('includeHidden');
  const qTier = c.req.query('tier');
  const sp = new URL(c.req.url).searchParams;
  const sectorTokens = sp
    .getAll('sector')
    .flatMap((s) => String(s || '').split(','))
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  const sectorMap: Record<string, string> = {
    RESIDENTIAL: 'residential',
    COMMERCIAL: 'commercial',
    INDUSTRIAL: 'industrial',
    AGRICULTURAL: 'agricultural',
    INSTITUTIONAL: 'institutional',
    GOVERNMENT: 'government',
    OTHER: 'other',
    UNKNOWN: 'unknown',
  };
  const sectors = sectorTokens
    .map((t) => sectorMap[String(t).toUpperCase()] || '')
    .filter(Boolean);
  const invalidSectors = sectorTokens.filter((t) => !sectorMap[String(t).toUpperCase()]);
  if (invalidSectors.length) warnings.push(`invalid sector values ignored: ${invalidSectors.join(', ')}`);
  const anyFilterParamProvided =
    qIncludeResidential !== undefined || qIncludeUnknownSegment !== undefined || qIncludeHidden !== undefined || qTier !== undefined || sp.has('sector');

  const includeResidential = String(qIncludeResidential || '').trim() === '1';
  const includeUnknownSegment = String(qIncludeUnknownSegment || '').trim() === '1';
  const includeHidden = String(qIncludeHidden || '').trim() === '1';
  const tierRaw = String(qTier || '').trim().toLowerCase();
  const tier: 'top' | 'featured' | 'common' | 'all' =
    tierRaw === 'top' || tierRaw === 'featured' || tierRaw === 'common' || tierRaw === 'all' ? (tierRaw as any) : 'all';

  const { items: tariffCurationItems, warnings: curWarnings, loadedFromPath: tariffCurationPath, capturedAtIso: tariffCurationCapturedAtIso, version: tariffCurationVersion } =
    loadTariffCurationV1();
  warnings.push(...curWarnings.map((w) => `[tariffCuration] ${w}`));
  const tariffCurationStatus = {
    loadedFromPath: tariffCurationPath,
    capturedAtIso: tariffCurationCapturedAtIso ?? null,
    version: tariffCurationVersion ?? null,
    itemCount: Array.isArray(tariffCurationItems) ? tariffCurationItems.length : 0,
    hiddenRuleCount: (tariffCurationItems || []).filter((x: any) => x && typeof x === 'object' && Boolean((x as any).hidden)).length,
    featuredRuleCount: (tariffCurationItems || []).filter((x: any) => String((x as any).tier || '').toLowerCase() === 'featured').length,
  };

  for (const utility of utilities) {
    let snap: any | null = null;
    try {
      snap = await loadLatestGasSnapshot(utility as any);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      warnings.push(`${utility}: failed to load latest gas snapshot (${reason})`);
      errors.push({ utility, endpoint: 'tariffs.ca.gas.latest', reason });
      out.push({
        utility,
        latestSnapshot: null,
        rates: [],
        warning: 'Gas tariff snapshots failed to load (see errors).',
        error: { message: reason },
      });
      continue;
    }
    if (!snap) {
      warnings.push(`${utility}: no gas snapshots found on disk`);
      out.push({
        utility,
        latestSnapshot: null,
        rates: [],
        warning: 'Gas tariff snapshots not loaded. Run: npm run tariffs:ingest:ca:gas',
      });
      continue;
    }

    const rateCount = Array.isArray(snap.rates) ? snap.rates.length : 0;
    const added = snap.diffFromPrevious?.addedRateCodes?.length || 0;
    const removed = snap.diffFromPrevious?.removedRateCodes?.length || 0;
    const prevTag = snap.diffFromPrevious?.previousVersionTag || null;
    const rawRates = Array.isArray(snap.rates) ? snap.rates : [];

    const decorated = applyTariffCurationV1({
      rates: rawRates.map((r: any) => applyTariffEffectiveStatusV1(applyGasTariffSegmentV0(r))),
      items: tariffCurationItems,
    });
    const shownRates = anyFilterParamProvided ? filterRates({ rates: decorated, includeResidential, includeUnknownSegment, sectors, tier, includeHidden }) : decorated;

    const hiddenByCurationCount = decorated.filter((r: any) => Boolean(r.curationHidden)).length;
    const nonResidentialShownCount = shownRates.filter((r: any) => String((r as any).sectorGroup || '') === 'non_residential').length;
    const totalRateCount = decorated.length;
    const tierCounts = {
      top: decorated.filter((r: any) => String(r.popularityTier || 'all') === 'top').length,
      featured: decorated.filter((r: any) => {
        const t = String(r.popularityTier || 'all');
        return t === 'top' || t === 'featured';
      }).length,
      common: decorated.filter((r: any) => {
        const t = String(r.popularityTier || 'all');
        return t === 'top' || t === 'featured' || t === 'common';
      }).length,
      all: decorated.length,
    };
    const filterSummary =
      anyFilterParamProvided
        ? (() => {
            const allowedSectorGroups = new Set<string>(['non_residential']);
            if (includeResidential) allowedSectorGroups.add('residential');
            if (includeUnknownSegment) allowedSectorGroups.add('unknown');
            const sectorsSet = new Set((sectors || []).map((s) => String(s).toLowerCase()));
            function sectorGroupOf(r: any): string {
              const sg = String((r as any).sectorGroup || '').trim();
              if (sg) return sg;
              const seg = String((r as any).customerSegment || 'unknown');
              return seg === 'residential' ? 'residential' : seg === 'unknown' ? 'unknown' : 'non_residential';
            }
            function tierAllows(tRaw: any): boolean {
              const t = String(tRaw || 'all');
              if (tier === 'all') return true;
              if (tier === 'common') return t === 'top' || t === 'featured' || t === 'common';
              if (tier === 'featured') return t === 'top' || t === 'featured';
              return t === 'top';
            }
            const candidatesForSector = decorated.filter((r: any) => allowedSectorGroups.has(sectorGroupOf(r)));
            return {
              filtersApplied: {
                includeResidential,
                includeUnknownSegment,
                includeHidden,
                tier,
                sectors: Array.from(sectorsSet),
              },
              excludedCounts: {
                hiddenByCuration: includeHidden ? 0 : decorated.filter((r: any) => Boolean(r.curationHidden)).length,
                residential: includeResidential ? 0 : decorated.filter((r: any) => sectorGroupOf(r) === 'residential').length,
                unknownSegment: includeUnknownSegment ? 0 : decorated.filter((r: any) => sectorGroupOf(r) === 'unknown').length,
                tier: tier === 'all' ? 0 : decorated.filter((r: any) => !tierAllows((r as any).popularityTier)).length,
                sector: sectorsSet.size
                  ? candidatesForSector.filter((r: any) => {
                      const seg = String((r as any).customerSegment || 'unknown').trim().toLowerCase() || 'unknown';
                      return !sectorsSet.has(seg);
                    }).length
                  : 0,
              },
            };
          })()
        : null;

    out.push({
      utility,
      latestSnapshot: {
        versionTag: snap.versionTag,
        capturedAt: snap.capturedAt,
        rateCount,
        isStale: isGasSnapshotStale(snap.capturedAt, nowIso, 14),
        diffSummary: snap.diffFromPrevious ? { addedRateCodes: added, removedRateCodes: removed } : null,
        previousVersionTag: prevTag,
        lastChangeDetected: snap.diffFromPrevious
          ? added === 0 && removed === 0
            ? 'NO_CHANGES_VS_PREVIOUS'
            : 'CHANGED_VS_PREVIOUS'
          : 'UNKNOWN',
        metadataCompleteness: (snap as any).metadataCompleteness || null,
        sourceMixByField: {
          customerClass: sourceMixByField(decorated, 'customerClassSource'),
          voltage: sourceMixByField(decorated, 'voltageSource'),
          eligibility: sourceMixByField(decorated, 'eligibilitySource'),
          effective: sourceMixByField(decorated, 'effectiveSource'),
        },
        segmentSummaryTotal: segmentSummary(decorated),
        segmentSummaryShown: segmentSummary(shownRates),
        hiddenByCurationCount,
        businessRelevantShownCount: nonResidentialShownCount,
        totalRateCount,
        tierCounts,
        ...(filterSummary ? { filterSummary } : {}),
      },
      rates: shownRates,
    });
  }

  return c.json({ success: true, utilities: out, warnings, curationStatus: { tariffCuration: tariffCurationStatus }, ...(errors.length ? { errors } : {}) });
});

app.get('/api/tariffs/ca/gas/history', async (c) => {
  const nowIso = new Date().toISOString();
  const utilityRaw = String(c.req.query('utility') || '').trim().toUpperCase();
  const utility = utilityRaw === 'PGE' || utilityRaw === 'SDGE' || utilityRaw === 'SOCALGAS' ? (utilityRaw as any) : null;

  const warnings: string[] = [];
  if (!utility) {
    warnings.push('utility query param is required: PGE|SDGE|SOCALGAS');
    return c.json({ success: true, utility: null, snapshots: [], warnings });
  }

  let tags: string[] = [];
  try {
    tags = await listGasSnapshots(utility as any);
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    warnings.push(`${utility}: failed to list gas snapshots (${reason})`);
    return c.json({ success: true, utility, snapshots: [], warnings, errors: [{ utility, endpoint: 'tariffs.ca.gas.history', reason }] });
  }
  if (!tags.length) {
    warnings.push(`${utility}: no gas snapshots found on disk`);
    return c.json({ success: true, utility, snapshots: [], warnings });
  }

  const snapshots: any[] = [];
  for (const versionTag of tags) {
    let snap: any | null = null;
    try {
      snap = await loadGasSnapshot(utility as any, versionTag);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      warnings.push(`${utility}: failed to load gas snapshot ${versionTag} (${reason})`);
      continue;
    }
    if (!snap) {
      warnings.push(`${utility}: failed to load gas snapshot ${versionTag}`);
      continue;
    }

    const rateCount = Array.isArray(snap.rates) ? snap.rates.length : 0;
    const decorated = Array.isArray(snap.rates) ? snap.rates.map((r: any) => applyGasTariffSegmentV0(r)) : [];
    const seg: Record<string, number> = {};
    for (const r of decorated) {
      const s = String((r as any)?.customerSegment || 'unknown');
      seg[s] = (seg[s] || 0) + 1;
    }
    const added = snap.diffFromPrevious?.addedRateCodes?.length || 0;
    const removed = snap.diffFromPrevious?.removedRateCodes?.length || 0;
    snapshots.push({
      versionTag: snap.versionTag,
      capturedAt: snap.capturedAt,
      rateCount,
      isStale: isGasSnapshotStale(snap.capturedAt, nowIso, 14),
      diffSummary: snap.diffFromPrevious ? { addedRateCodes: added, removedRateCodes: removed, unchangedRateCodes: snap.diffFromPrevious.unchangedRateCodes?.length || 0 } : null,
      sourceFingerprints: Array.isArray(snap.sourceFingerprints) ? snap.sourceFingerprints : [],
      segmentSummaryTotal: seg,
    });
  }

  return c.json({ success: true, utility, snapshots, warnings });
});

app.get('/api/tariffs/ca/gas/snapshot/:utility/:versionTag', async (c) => {
  const nowIso = new Date().toISOString();
  const utilityRaw = String(c.req.param('utility') || '').trim().toUpperCase();
  const versionTag = String(c.req.param('versionTag') || '').trim();
  const utility = utilityRaw === 'PGE' || utilityRaw === 'SDGE' || utilityRaw === 'SOCALGAS' ? (utilityRaw as any) : null;

  const warnings: string[] = [];
  if (!utility) warnings.push(`invalid utility: ${utilityRaw || '(missing)'}`);
  if (!versionTag) warnings.push('versionTag is required');
  if (!utility || !versionTag) {
    return c.json({ success: true, snapshot: null, isStale: true, warnings });
  }

  let snap: any | null = null;
  try {
    snap = await loadGasSnapshot(utility as any, versionTag);
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    warnings.push(`${utility}: failed to load gas snapshot ${versionTag} (${reason})`);
    return c.json({ success: true, snapshot: null, isStale: true, warnings, errors: [{ utility, endpoint: 'tariffs.ca.gas.snapshot', reason }] });
  }
  if (!snap) {
    warnings.push(`${utility}: gas snapshot not found: ${versionTag}`);
    return c.json({ success: true, snapshot: null, isStale: true, warnings });
  }

  const qIncludeResidential = c.req.query('includeResidential');
  const qIncludeUnknownSegment = c.req.query('includeUnknownSegment');
  const qIncludeHidden = c.req.query('includeHidden');
  const qTier = c.req.query('tier');
  const sp = new URL(c.req.url).searchParams;
  const sectorTokens = sp
    .getAll('sector')
    .flatMap((s) => String(s || '').split(','))
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  const sectorMap: Record<string, string> = {
    RESIDENTIAL: 'residential',
    COMMERCIAL: 'commercial',
    INDUSTRIAL: 'industrial',
    AGRICULTURAL: 'agricultural',
    INSTITUTIONAL: 'institutional',
    GOVERNMENT: 'government',
    OTHER: 'other',
    UNKNOWN: 'unknown',
  };
  const sectors = sectorTokens
    .map((t) => sectorMap[String(t).toUpperCase()] || '')
    .filter(Boolean);
  const invalidSectors = sectorTokens.filter((t) => !sectorMap[String(t).toUpperCase()]);
  if (invalidSectors.length) warnings.push(`invalid sector values ignored: ${invalidSectors.join(', ')}`);
  const anyFilterParamProvided =
    qIncludeResidential !== undefined || qIncludeUnknownSegment !== undefined || qIncludeHidden !== undefined || qTier !== undefined || sp.has('sector');

  const includeResidential = String(qIncludeResidential || '').trim() === '1';
  const includeUnknownSegment = String(qIncludeUnknownSegment || '').trim() === '1';
  const includeHidden = String(qIncludeHidden || '').trim() === '1';
  const tierRaw = String(qTier || '').trim().toLowerCase();
  const tier: 'top' | 'featured' | 'common' | 'all' =
    tierRaw === 'top' || tierRaw === 'featured' || tierRaw === 'common' || tierRaw === 'all' ? (tierRaw as any) : 'all';

  const { items: tariffCurationItems, warnings: curWarnings, loadedFromPath: tariffCurationPath, capturedAtIso: tariffCurationCapturedAtIso, version: tariffCurationVersion } =
    loadTariffCurationV1();
  warnings.push(...curWarnings.map((w) => `[tariffCuration] ${w}`));
  const tariffCurationStatus = {
    loadedFromPath: tariffCurationPath,
    capturedAtIso: tariffCurationCapturedAtIso ?? null,
    version: tariffCurationVersion ?? null,
    itemCount: Array.isArray(tariffCurationItems) ? tariffCurationItems.length : 0,
    hiddenRuleCount: (tariffCurationItems || []).filter((x: any) => x && typeof x === 'object' && Boolean((x as any).hidden)).length,
    topRuleCount: (tariffCurationItems || []).filter((x: any) => String((x as any).tier || '').toLowerCase() === 'top').length,
    featuredRuleCount: (tariffCurationItems || []).filter((x: any) => String((x as any).tier || '').toLowerCase() === 'featured').length,
  };

  const rawRates = Array.isArray(snap.rates) ? snap.rates : [];
  const decorated = applyTariffCurationV1({
    rates: rawRates.map((r: any) => applyTariffEffectiveStatusV1(applyGasTariffSegmentV0(r))),
    items: tariffCurationItems,
  });

  const allowedSectorGroups = new Set<string>(['non_residential']);
  if (includeResidential) allowedSectorGroups.add('residential');
  if (includeUnknownSegment) allowedSectorGroups.add('unknown');

  const shownRates = decorated
    .filter((r: any) => (anyFilterParamProvided ? (includeHidden ? true : !Boolean(r.curationHidden)) : true))
    .filter((r: any) => {
      if (!anyFilterParamProvided) return true;
      const t = String(r.popularityTier || 'all');
      if (tier === 'all') return true;
      if (tier === 'common') return t === 'top' || t === 'featured' || t === 'common';
      if (tier === 'featured') return t === 'top' || t === 'featured';
      return t === 'top';
    })
    .filter((r: any) => {
      if (!anyFilterParamProvided) return true;
      const sg = String((r as any).sectorGroup || '').trim();
      if (sg) return allowedSectorGroups.has(sg);
      const seg = String((r as any).customerSegment || 'unknown');
      const derived = seg === 'residential' ? 'residential' : seg === 'unknown' ? 'unknown' : 'non_residential';
      return allowedSectorGroups.has(derived);
    })
    .filter((r: any) => {
      if (!anyFilterParamProvided) return true;
      if (!Array.isArray(sectors) || sectors.length === 0) return true;
      const seg = String((r as any).customerSegment || 'unknown').trim().toLowerCase() || 'unknown';
      return sectors.includes(seg);
    });

  const segTotal: Record<string, number> = {};
  const segShown: Record<string, number> = {};
  for (const r of decorated) segTotal[String((r as any).customerSegment || 'unknown')] = (segTotal[String((r as any).customerSegment || 'unknown')] || 0) + 1;
  for (const r of shownRates) segShown[String((r as any).customerSegment || 'unknown')] = (segShown[String((r as any).customerSegment || 'unknown')] || 0) + 1;
  const filterSummary =
    anyFilterParamProvided
      ? (() => {
          const sectorsSet = new Set((sectors || []).map((s) => String(s).toLowerCase()));
          function sectorGroupOf(r: any): string {
            const sg = String((r as any).sectorGroup || '').trim();
            if (sg) return sg;
            const seg = String((r as any).customerSegment || 'unknown');
            return seg === 'residential' ? 'residential' : seg === 'unknown' ? 'unknown' : 'non_residential';
          }
          function tierAllows(tRaw: any): boolean {
            const t = String(tRaw || 'all');
            if (tier === 'all') return true;
            if (tier === 'common') return t === 'top' || t === 'featured' || t === 'common';
            if (tier === 'featured') return t === 'top' || t === 'featured';
            return t === 'top';
          }
          const candidatesForSector = decorated.filter((r: any) => allowedSectorGroups.has(sectorGroupOf(r)));
          return {
            filtersApplied: {
              includeResidential,
              includeUnknownSegment,
              includeHidden,
              tier,
              sectors: Array.from(sectorsSet),
            },
            excludedCounts: {
              hiddenByCuration: includeHidden ? 0 : decorated.filter((r: any) => Boolean(r.curationHidden)).length,
              residential: includeResidential ? 0 : decorated.filter((r: any) => sectorGroupOf(r) === 'residential').length,
              unknownSegment: includeUnknownSegment ? 0 : decorated.filter((r: any) => sectorGroupOf(r) === 'unknown').length,
              tier: tier === 'all' ? 0 : decorated.filter((r: any) => !tierAllows((r as any).popularityTier)).length,
              sector: sectorsSet.size
                ? candidatesForSector.filter((r: any) => {
                    const seg = String((r as any).customerSegment || 'unknown').trim().toLowerCase() || 'unknown';
                    return !sectorsSet.has(seg);
                  }).length
                : 0,
            },
          };
        })()
      : null;

  return c.json({
    success: true,
    snapshot: { ...(snap as any), rates: shownRates, segmentSummaryTotal: segTotal, segmentSummaryShown: segShown, ...(filterSummary ? { filterSummary } : {}) },
    isStale: isGasSnapshotStale(snap.capturedAt, nowIso, 14),
    warnings,
    curationStatus: { tariffCuration: tariffCurationStatus },
  });
});

/**
 * ==========================================
 * IMPORT HELPERS
 * ==========================================
 */

// Google Sheets (public/share links) -> CSV proxy (avoids browser CORS issues)
app.get('/api/import/google-sheets', async (c) => {
  try {
    const url = String(c.req.query('url') || '').trim();
    if (!url) return c.json({ success: false, error: 'url is required' }, 400);

    const info = parseGoogleSheetsUrl(url);
    if (!info) return c.json({ success: false, error: 'Invalid Google Sheets URL' }, 400);

    const exportUrl = toGoogleSheetsCsvExportUrl(info);
    const resp = await fetch(exportUrl, {
      method: 'GET',
      headers: {
        // Helps some environments return consistent CSV
        'Accept': 'text/csv,text/plain,*/*',
      },
    });

    const csv = await resp.text();
    if (!resp.ok) {
      return c.json(
        {
          success: false,
          error: `Google Sheets export failed (${resp.status}). Ensure the sheet is shared publicly (Anyone with the link can view).`,
        },
        400
      );
    }

    // Heuristic: private sheets often return an HTML login page
    if (csv.trim().startsWith('<!DOCTYPE html') || csv.toLowerCase().includes('accounts.google.com')) {
      return c.json(
        {
          success: false,
          error:
            'Google Sheets export returned HTML (likely a private sheet). Share the sheet as "Anyone with the link can view", or download as CSV/XLSX and upload it.',
        },
        400
      );
    }

    return c.json({ success: true, csv });
  } catch (error) {
    console.error('Google Sheets import error:', error);
    return c.json({ success: false, error: 'Failed to import Google Sheet' }, 500);
  }
});

/**
 * ==========================================
 * FILE STORAGE API
 * ==========================================
 */

app.post('/api/files/upload', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const body = await c.req.parseBody();
    const file = (body as any)?.file as File | undefined;
    if (!file) {
      return c.json({ success: false, error: 'file is required' }, 400);
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || 'application/octet-stream';

    const { putUserFile } = await import('./services/storage-service');
    const result = await putUserFile({
      userId,
      originalName: file.name || 'upload.bin',
      contentType,
      body: buf,
    });

    return c.json({ success: true, ...result });
  } catch (error) {
    console.error('File upload error:', error);
    return c.json({ success: false, error: 'Failed to upload file' }, 500);
  }
});

app.get('/api/files/*', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const key = c.req.param('*');
    if (!key) return c.json({ success: false, error: 'key is required' }, 400);

    const { getUserFile } = await import('./services/storage-service');
    const obj = await getUserFile({ userId, key });
    if (!obj) return c.json({ success: false, error: 'File not found' }, 404);

    c.header('Content-Type', obj.contentType);
    return c.body(new Uint8Array(obj.body));
  } catch (error) {
    console.error('File download error:', error);
    return c.json({ success: false, error: 'Failed to download file' }, 500);
  }
});

/**
 * ==========================================
 * USER AUTH API (JWT)
 * ==========================================
 */

app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const email = String(body?.email || '').trim();
    const userId = String(body?.userId || '').trim();
    const role = (String(body?.role || 'viewer') as UserRole) || 'viewer';

    // Minimal “dev login” (replace with DB + password later)
    const resolvedUserId = userId || (email ? `user:${email.toLowerCase()}` : `user:${randomUUID()}`);

    const token = signJwt(
      {
        userId: resolvedUserId,
        email: email || undefined,
        role,
      },
      60 * 60 * 24 * 7 // 7 days
    );

    return c.json({
      success: true,
      token,
      user: { userId: resolvedUserId, email: email || undefined, role },
    });
  } catch (error) {
    console.error('Auth login error:', error);
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

app.get('/api/auth/me', async (c) => {
  try {
    const token = getBearerTokenFromAuthHeader(c.req.header('Authorization'));
    if (!token) return c.json({ success: false, user: null }, 200);
    const user = verifyJwt(token);
    return c.json({ success: true, user });
  } catch (error) {
    console.error('Auth me error:', error);
    return c.json({ success: false, error: 'Failed to load user' }, 500);
  }
});

/**
 * ==========================================
 * ADMIN AUTH API (server-validated)
 * Uses the existing in-memory session store in src/backend/admin/auth.ts
 * ==========================================
 */

function getAdminTokenFromRequest(c: Context): string | null {
  const headerToken = c.req.header('x-admin-token') || c.req.header('x-admin');
  if (headerToken) return headerToken;
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

function getAdminSessionFromRequest(c: Context): AdminSession | null {
  const token = getAdminTokenFromRequest(c);
  if (!token) return null;
  return verifySession(token);
}

function requireRole(c: Context, role: UserRole): AdminSession | null {
  const session = getAdminSessionFromRequest(c);
  if (!hasPermission(session, role)) return null;
  return session;
}

app.post('/api/admin/login', async (c) => {
  try {
    const body = await c.req.json();
    const email = String(body?.email || '');
    const password = String(body?.password || '');

    const session = await adminLogin(email, password);
    if (!session) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    return c.json({ success: true, session });
  } catch (error) {
    console.error('Admin login error:', error);
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

app.post('/api/admin/logout', async (c) => {
  try {
    const token = getAdminTokenFromRequest(c);
    if (token) adminLogout(token);
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin logout error:', error);
    return c.json({ success: false, error: 'Logout failed' }, 500);
  }
});

app.get('/api/admin/session', async (c) => {
  try {
    const session = getAdminSessionFromRequest(c);
    if (!session) return c.json({ success: false, session: null }, 200);
    return c.json({ success: true, session });
  } catch (error) {
    console.error('Admin session error:', error);
    return c.json({ success: false, error: 'Session check failed' }, 500);
  }
});

/**
 * GET /api/knowledge-base/measures - Get all energy efficiency measures
 */
app.get('/api/knowledge-base/measures', (c) => {
  const { query } = c.req;
  const category = query('category') as any;
  const search = query('search') as string | undefined;
  const tags = query('tags')?.split(',');
  const limit = query('limit') ? parseInt(query('limit')!) : undefined;
  
  const { queryKnowledgeBase } = require('./data/knowledge-base');
  const result = queryKnowledgeBase({ category, search, tags, limit });
  
  return c.json({
    success: true,
    measures: result.measures || [],
    count: result.measures?.length || 0,
  });
});

/**
 * Data API Endpoints
 * Unified access to training data, measures, and content
 */

// Import data service
import * as dataService from './services/data-service';
import type { SearchOptions } from './types/data-service';

// Search across all data
app.get('/api/data/search', async (c) => {
  try {
    const query = c.req.query('q');
    if (!query) {
      return c.json({ error: 'Query parameter "q" is required' }, 400);
    }

    const options: SearchOptions = {
      categories: c.req.query('categories')?.split(','),
      types: c.req.query('types')?.split(',') as Array<'training' | 'measure'>,
      limit: c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50,
    };

    const results = await dataService.searchData(query, options);
    return c.json({ results, count: results.length });
  } catch (error) {
    console.error('Search error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get training content by ID
app.get('/api/data/training/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const content = await dataService.getTrainingContent(id);
    
    if (!content) {
      return c.json({ error: 'Training content not found' }, 404);
    }
    
    return c.json(content);
  } catch (error) {
    console.error('Get training content error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get training content by category
app.get('/api/data/training/category/:category', async (c) => {
  try {
    const category = c.req.param('category');
    const content = await dataService.getTrainingContentByCategory(category);
    return c.json({ content, count: content.length });
  } catch (error) {
    console.error('Get training by category error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get all categories
app.get('/api/data/categories', async (c) => {
  try {
    const categories = await dataService.getCategories();
    return c.json({ categories, count: categories.length });
  } catch (error) {
    console.error('Get categories error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get measure by ID
app.get('/api/data/measure/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const measure = await dataService.getMeasure(id);
    
    if (!measure) {
      return c.json({ error: 'Measure not found' }, 404);
    }
    
    return c.json(measure);
  } catch (error) {
    console.error('Get measure error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get measures by category
app.get('/api/data/measures/category/:category', async (c) => {
  try {
    const category = c.req.param('category');
    const measures = await dataService.getMeasuresByCategory(category);
    return c.json({ measures, count: measures.length });
  } catch (error) {
    console.error('Get measures by category error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get training for measure
app.get('/api/data/measure/:id/training', async (c) => {
  try {
    const id = c.req.param('id');
    const content = await dataService.getTrainingForMeasure(id);
    return c.json({ content, count: content.length });
  } catch (error) {
    console.error('Get training for measure error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get measures for training
app.get('/api/data/training/:id/measures', async (c) => {
  try {
    const id = c.req.param('id');
    const measures = await dataService.getMeasuresForTraining(id);
    return c.json({ measures, count: measures.length });
  } catch (error) {
    console.error('Get measures for training error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get all measures
app.get('/api/data/measures', async (c) => {
  try {
    const measures = await dataService.getAllMeasures();
    return c.json({ measures, count: measures.length });
  } catch (error) {
    console.error('Get all measures error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get all training content
app.get('/api/data/training', async (c) => {
  try {
    const content = await dataService.getAllTrainingContent();
    return c.json({ content, count: content.length });
  } catch (error) {
    console.error('Get all training error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/data/all-content - Get ALL extracted content (comprehensive)
 * Returns all files that have been extracted and stored
 */
app.get('/api/data/all-content', async (c) => {
  try {
    const allContentPath = path.join(process.cwd(), 'public', 'data', 'all-extracted-content.json');
    
    if (!existsSync(allContentPath)) {
      return c.json({ error: 'All content file not found' }, 404);
    }

    const allContent = JSON.parse(await readFile(allContentPath, 'utf-8'));
    
    // Get statistics
    const stats = {
      total: allContent.length,
      byType: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      totalTextLength: 0,
    };

    allContent.forEach((item: unknown) => {
      const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      const type = typeof o.type === 'string' ? o.type : 'unknown';
      const category = typeof o.category === 'string' ? o.category : 'other';
      const textLength = typeof o.textLength === 'number' ? o.textLength : 0;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      stats.totalTextLength += textLength;
    });

    return c.json({
      success: true,
      content: allContent,
      count: allContent.length,
      statistics: stats,
    });
  } catch (error) {
    console.error('Get all content error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/data/inventory - Get complete inventory of all stored data
 */
app.get('/api/data/inventory', async (c) => {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const publicDataDir = path.join(process.cwd(), 'public', 'data');

    const inventory = {
      extracted: {
        ashrae: existsSync(path.join(dataDir, 'extracted-ashrae-guidelines', 'ashrae-knowledge-architecture.json')),
        allDocx: existsSync(path.join(dataDir, 'extracted-all-docx', 'all-extracted.json')),
        allPdfs: existsSync(path.join(dataDir, 'extracted-pdfs-v2', 'all-pdfs-extracted.json')),
        allRemaining: existsSync(path.join(dataDir, 'extracted-all-remaining', 'all-remaining-content.json')),
        measures: existsSync(path.join(dataDir, 'extracted-measures.json')),
      },
      structured: {
        trainingContent: existsSync(path.join(dataDir, 'structured-training-content.json')),
        measureLinks: existsSync(path.join(dataDir, 'measure-training-links.json')),
        allExtracted: existsSync(path.join(dataDir, 'all-extracted-content.json')),
      },
      data: {
        interval: existsSync(path.join(dataDir, 'INTERVAL.csv')),
        usage: existsSync(path.join(dataDir, 'USAGE.csv')),
        batteryCatalog: existsSync(path.join(dataDir, 'battery-catalog.csv')),
      },
      public: {
        trainingContent: existsSync(path.join(publicDataDir, 'structured-training-content.json')),
        allExtracted: existsSync(path.join(publicDataDir, 'all-extracted-content.json')),
        allRemaining: existsSync(path.join(publicDataDir, 'all-remaining-content.json')),
        ashrae: existsSync(path.join(publicDataDir, 'ashrae-knowledge-architecture.json')),
        measures: existsSync(path.join(publicDataDir, 'extracted-measures.json')),
        measureLinks: existsSync(path.join(publicDataDir, 'measure-training-links.json')),
      },
    };

    return c.json({
      success: true,
      inventory,
      message: 'Complete inventory of all stored data files',
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * ==========================================
 * EVERWATT PROJECT LIBRARY API (Phase 1)
 * ==========================================
 */

/**
 * GET /api/project-library/search?q=...
 * Deterministic keyword-based retrieval over normalized project records.
 */
app.get('/api/project-library/search', async (c) => {
  try {
    const q = String(c.req.query('q') || '').trim();
    if (!q) return c.json({ success: false, error: 'Query parameter "q" is required' }, 400);

    const limitRaw = c.req.query('limit');
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 10;

    const { searchProjectLibrary } = await import('./modules/projectLibrary/search');
    const libraryRoot = path.join(process.cwd(), 'everwatt-project-library');

    const results = await searchProjectLibrary({ q, limit, libraryRoot });
    return c.json({ success: true, results, count: results.length });
  } catch (error) {
    console.error('Project library search error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/knowledge-base/equipment - Get equipment library
 */
app.get('/api/knowledge-base/equipment', (c) => {
  const { query } = c.req;
  const type = query('type') as any;
  const search = query('search') as string | undefined;
  const limit = query('limit') ? parseInt(query('limit')!) : undefined;
  
  const { queryKnowledgeBase } = require('./data/knowledge-base');
  const result = queryKnowledgeBase({ equipmentType: type, search, limit });
  
  return c.json({
    success: true,
    equipment: result.equipment || [],
    count: result.equipment?.length || 0,
  });
});

/**
 * ==========================================
 * MONITORING API
 * ==========================================
 */

app.get('/api/monitoring/buildings', async (c) => {
  try {
    const { listBuildings } = await import('./services/monitoring-service');
    return c.json({ success: true, buildings: listBuildings() });
  } catch (error) {
    console.error('Monitoring buildings error:', error);
    return c.json({ success: false, error: 'Failed to load buildings' }, 500);
  }
});

app.get('/api/monitoring/snapshot', async (c) => {
  try {
    const buildingId = c.req.query('buildingId') || 'building-1';
    const { getMonitoringSnapshot } = await import('./services/monitoring-service');
    const snapshot = getMonitoringSnapshot(buildingId);
    return c.json({ success: true, snapshot });
  } catch (error) {
    console.error('Monitoring snapshot error:', error);
    return c.json({ success: false, error: 'Failed to load monitoring snapshot' }, 500);
  }
});

/**
 * ==========================================
 * AI API (optional; requires OPENAI_API_KEY)
 * ==========================================
 */

app.get('/api/ai/health', async (c) => {
  const configured = !!process.env.OPENAI_API_KEY;
  const dbEnabled = isDatabaseEnabled();
  try {
    const { getRepoIndexStats } = await import('./services/ai-rag-service');
    const repo = await getRepoIndexStats();
    return c.json({ success: true, configured, dbEnabled, repo });
  } catch {
    return c.json({ success: true, configured, dbEnabled, repo: null });
  }
});

app.post('/api/ai/chat', async (c) => {
  try {
    // Restrict to staff (JWT editor/admin OR admin-session editor/admin)
    let staffUserId: string | undefined;
    try {
      const jwtUser = requireJwtRole(c, 'editor');
      staffUserId = jwtUser.userId;
    } catch {
      // ignore
    }
    if (!staffUserId) {
      const session = getAdminSessionFromRequest(c);
      if (hasPermission(session, 'editor')) staffUserId = session?.userId;
    }
    if (!staffUserId) {
      return c.json({ success: false, error: 'Unauthorized' }, 403);
    }

    const body = await c.req.json();
    const { chatWithRepoRag } = await import('./services/ai-rag-service');
    const result = await chatWithRepoRag(body, { userId: staffUserId });
    return c.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI request failed';
    const status = message.includes('OPENAI_API_KEY') ? 501 : 500;
    console.error('AI chat error:', error);
    return c.json({ success: false, error: message }, status as any);
  }
});

app.get('/api/ai/source', async (c) => {
  try {
    // Same staff restriction as chat
    let ok = false;
    try {
      requireJwtRole(c, 'editor');
      ok = true;
    } catch {
      const session = getAdminSessionFromRequest(c);
      ok = hasPermission(session, 'editor');
    }
    if (!ok) return c.json({ success: false, error: 'Unauthorized' }, 403);

    const pathParam = String(c.req.query('path') || '');
    const chunkIndex = Number(c.req.query('chunkIndex') || c.req.query('chunk') || NaN);
    if (!pathParam || !Number.isFinite(chunkIndex)) {
      return c.json({ success: false, error: 'path and chunkIndex are required' }, 400);
    }

    const { getRepoChunk } = await import('./services/ai-rag-service');
    const chunk = await getRepoChunk({ path: pathParam, chunkIndex: Number(chunkIndex) });
    if (!chunk) return c.json({ success: false, error: 'Not found' }, 404);
    return c.json({ success: true, ...chunk });
  } catch (error) {
    console.error('AI source error:', error);
    return c.json({ success: false, error: 'Failed to load source' }, 500);
  }
});

/**
 * GET /api/library/equipment - Comprehensive equipment database (for explorers)
 * Backed by src/data/equipment/comprehensive-equipment-database.ts
 */
app.get('/api/library/equipment', async (c) => {
  try {
    const category = c.req.query('category') || '';
    const subcategory = c.req.query('subcategory') || '';
    const search = c.req.query('search') || '';
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 250;

    const { comprehensiveEquipmentDatabase } = await import('./data/equipment/comprehensive-equipment-database');
    let results = Array.isArray(comprehensiveEquipmentDatabase) ? comprehensiveEquipmentDatabase : [];

    if (category) {
      const cLower = category.toLowerCase();
      results = results.filter((e) => {
        return String(e.category || '').toLowerCase() === cLower;
      });
    }

    if (subcategory) {
      const sLower = subcategory.toLowerCase();
      results = results.filter((e) => {
        return String(e.subcategory || '').toLowerCase() === sLower;
      });
    }

    if (search) {
      const q = search.toLowerCase();
      results = results.filter((e) => {
        const name = String(e.name || '').toLowerCase();
        const cat = String(e.category || '').toLowerCase();
        const sub = String(e.subcategory || '').toLowerCase();
        const manufacturers = Array.isArray(e?.identification?.typicalManufacturers)
          ? e.identification.typicalManufacturers.join(' ').toLowerCase()
          : '';
        return name.includes(q) || cat.includes(q) || sub.includes(q) || manufacturers.includes(q);
      });
    }

    const sliced = results.slice(0, Number.isFinite(limit) ? limit : 250);

    return c.json({
      success: true,
      equipment: sliced,
      count: results.length,
    });
  } catch (error) {
    console.error('Get library equipment error:', error);
    return c.json({ success: false, error: 'Failed to load equipment library' }, 500);
  }
});

/**
 * GET /api/knowledge-base/verticals - Get vertical market profiles
 */
app.get('/api/knowledge-base/verticals', (c) => {
  const { query } = c.req;
  const vertical = query('vertical') as any;
  const search = query('search') as string | undefined;
  
  const { queryKnowledgeBase } = require('./data/knowledge-base');
  const result = queryKnowledgeBase({ vertical, search });
  
  return c.json({
    success: true,
    verticals: result.verticals || [],
    count: result.verticals?.length || 0,
  });
});

/**
 * GET /api/knowledge-base/search - Unified search across all knowledge base
 */
app.get('/api/knowledge-base/search', (c) => {
  const { query } = c.req;
  const search = query('q') as string;
  const limit = query('limit') ? parseInt(query('limit')!) : 50;
  
  if (!search) {
    return c.json({ error: 'Search query required' }, 400);
  }
  
  const { queryKnowledgeBase } = require('./data/knowledge-base');
  const result = queryKnowledgeBase({ search, limit });
  
  return c.json({
    success: true,
    results: result,
    totalResults: 
      (result.measures?.length || 0) +
      (result.equipment?.length || 0) +
      (result.verticals?.length || 0),
  });
});

/**
 * GET /api/knowledge-base/related/:type/:id - Get related content
 */
app.get('/api/knowledge-base/related/:type/:id', (c) => {
  const type = c.req.param('type') as 'measure' | 'equipment';
  const id = c.req.param('id');
  
  const { getRelatedContent } = require('./data/knowledge-base');
  const related = getRelatedContent(type, id);
  
  if (!related) {
    return c.json({ error: 'Not found' }, 404);
  }
  
  return c.json({
    success: true,
    ...related,
  });
});

// Training Content Endpoints
app.get('/api/training-content', async (c) => {
  try {
    const category = c.req.query('category');
    const { loadStructuredTrainingContent } = await import('./data/knowledge-base/structured-training-content');
    const all = await loadStructuredTrainingContent();

    if (category) {
      const filtered = all.filter(content => content.category === category);
      return c.json({ success: true, content: filtered, count: filtered.length });
    }

    return c.json({ success: true, content: all, count: all.length });
  } catch (error) {
    console.error('Error loading training content:', error);
    return c.json({ error: 'Failed to load training content' }, 500);
  }
});

app.get('/api/training-content/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { getTrainingContentById } = await import('./data/knowledge-base/structured-training-content');
    const content = await getTrainingContentById(id);

    if (!content) {
      return c.json({ error: 'Training content not found' }, 404);
    }

    return c.json({ success: true, content });
  } catch (error) {
    console.error('Error loading training content:', error);
    return c.json({ error: 'Failed to load training content' }, 500);
  }
});

app.get('/api/training-content/search', async (c) => {
  try {
    const query = c.req.query('q');
    if (!query) {
      return c.json({ success: true, content: [], count: 0 });
    }

    const { searchTrainingContent } = await import('./data/knowledge-base/structured-training-content');
    const results = await searchTrainingContent(query);
    return c.json({ success: true, content: results, count: results.length });
  } catch (error) {
    console.error('Error searching training content:', error);
    return c.json({ error: 'Failed to search training content' }, 500);
  }
});

app.get('/api/training-content/category/:category', async (c) => {
  try {
    const category = c.req.param('category') as any;
    const { getTrainingContentByCategory } = await import('./data/knowledge-base/structured-training-content');
    const content = await getTrainingContentByCategory(category);
    return c.json({ success: true, content, count: content.length });
  } catch (error) {
    console.error('Error loading training content by category:', error);
    return c.json({ error: 'Failed to load training content' }, 500);
  }
});

// Battery catalog path - now configurable via environment
const CATALOG_FILE = getCatalogPath();

/**
 * PG&E Demand Rate Lookup Table
 * Based on actual 2025 PG&E tariff schedules
 * Rates in $/kW/month (effective monthly demand charge)
 * 
 * For TOU rates with multiple demand components:
 * - Maximum Demand applies to highest 15-min kW in billing period
 * - Peak Period Demand applies to highest kW during peak hours
 * 
 * We use the combined effective rate for peak shaving calculations
 * (Maximum + Peak Period demand in summer, Maximum in winter, averaged)
 */
const PGE_DEMAND_RATES: Record<string, { summer: number; winter: number; description: string }> = {
  // B-19 variants (Medium General Demand-Metered TOU) - Secondary voltage
  'B-19': { summer: 38.37, winter: 19.20, description: 'B-19 Secondary (Max $19.20 + Peak $19.17)' },
  'B19': { summer: 38.37, winter: 19.20, description: 'B-19 Secondary' },
  'B-19S': { summer: 38.37, winter: 19.20, description: 'B-19 Secondary voltage' },
  'B19S': { summer: 38.37, winter: 19.20, description: 'B-19 Secondary voltage' },
  'HB19S': { summer: 38.37, winter: 19.20, description: 'Hospital B-19 Secondary voltage' },
  'HB-19S': { summer: 38.37, winter: 19.20, description: 'Hospital B-19 Secondary voltage' },
  'B-19P': { summer: 30.66, winter: 15.00, description: 'B-19 Primary voltage' },
  'B19P': { summer: 30.66, winter: 15.00, description: 'B-19 Primary voltage' },
  'B-19T': { summer: 18.00, winter: 10.00, description: 'B-19 Transmission voltage' },
  'B19T': { summer: 18.00, winter: 10.00, description: 'B-19 Transmission voltage' },
  
  // B-20 (Large General Demand-Metered TOU)
  'B-20': { summer: 25.00, winter: 15.00, description: 'B-20 Secondary (>1000 kW)' },
  'B20': { summer: 25.00, winter: 15.00, description: 'B-20 Secondary' },
  'B-20S': { summer: 25.00, winter: 15.00, description: 'B-20 Secondary voltage' },
  'B-20P': { summer: 20.00, winter: 12.00, description: 'B-20 Primary voltage' },
  'B-20T': { summer: 15.00, winter: 9.00, description: 'B-20 Transmission voltage' },
  
  // A-10 (Medium General Demand-Metered TOU) - legacy
  'A-10': { summer: 30.00, winter: 15.00, description: 'A-10 Secondary' },
  'A10': { summer: 30.00, winter: 15.00, description: 'A-10 Secondary' },
  'A-10S': { summer: 30.00, winter: 15.00, description: 'A-10 Secondary voltage' },
  'A-10P': { summer: 24.00, winter: 12.00, description: 'A-10 Primary voltage' },
  'A-10T': { summer: 18.00, winter: 9.00, description: 'A-10 Transmission voltage' },
  
  // E-19 (Medium General Demand-Metered TOU - NEM/solar customers)
  'E-19': { summer: 25.00, winter: 12.00, description: 'E-19 Secondary' },
  'E19': { summer: 25.00, winter: 12.00, description: 'E-19 Secondary' },
  'E-19S': { summer: 25.00, winter: 12.00, description: 'E-19 Secondary voltage' },
  
  // E-20 (Large General Demand-Metered TOU - NEM/solar customers)
  'E-20': { summer: 20.00, winter: 10.00, description: 'E-20 Secondary' },
  'E20': { summer: 20.00, winter: 10.00, description: 'E-20 Secondary' },
  
  // B-1 and B-6 (Small General Service - typically no demand charges but may have some)
  'B-1': { summer: 0, winter: 0, description: 'B-1 No demand charges' },
  'B-6': { summer: 0, winter: 0, description: 'B-6 No demand charges' },
  
  // A-1 and A-6 (Small General Service)
  'A-1': { summer: 0, winter: 0, description: 'A-1 No demand charges' },
  'A-6': { summer: 0, winter: 0, description: 'A-6 No demand charges' },
};

/**
 * Get demand rate for a rate code
 * Returns effective monthly $/kW rate (weighted average of summer/winter)
 */
function getDemandRateForCode(rateCode: string): { rate: number; description: string } | null {
  if (!rateCode) return null;
  
  // Normalize the rate code
  const normalized = rateCode.toUpperCase().trim().replace(/\s+/g, '');
  
  const rateInfo = PGE_DEMAND_RATES[normalized];
  if (rateInfo) {
    // Weight summer more heavily (6 months summer, 6 months winter for PG&E)
    // But summer peaks are where the savings matter most, so we emphasize summer
    const effectiveRate = (rateInfo.summer * 0.6 + rateInfo.winter * 0.4);
    return { rate: effectiveRate, description: rateInfo.description };
  }
  
  // Try partial match (e.g., "B-19" from "B-19 TOU" or similar)
  for (const [code, info] of Object.entries(PGE_DEMAND_RATES)) {
    if (normalized.includes(code.replace('-', '')) || normalized.includes(code)) {
      const effectiveRate = (info.summer * 0.6 + info.winter * 0.4);
      return { rate: effectiveRate, description: info.description };
    }
  }
  
  return null;
}

/**
 * Calculate effective demand rate from monthly bills
 * Uses actual PG&E rate schedules when rate code is available
 */
function calculateDemandRate(bills: Array<{ peakDemandKw: number; totalCost: number; rateCode?: string }>): number {
  // First, try to get rate from rate code in bills
  const ratesFromBills = bills
    .map(b => b.rateCode)
    .filter((code): code is string => !!code);
  
  if (ratesFromBills.length > 0) {
    // Use the most common rate code
    const rateCounts = new Map<string, number>();
    ratesFromBills.forEach(code => {
      rateCounts.set(code, (rateCounts.get(code) || 0) + 1);
    });
    
    let mostCommonRate = '';
    let maxCount = 0;
    rateCounts.forEach((count, code) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonRate = code;
      }
    });
    
    const rateInfo = getDemandRateForCode(mostCommonRate);
    if (rateInfo && rateInfo.rate > 0) {
      console.log(`📊 Using actual PG&E rate: ${mostCommonRate} → $${rateInfo.rate.toFixed(2)}/kW/month (${rateInfo.description})`);
      return rateInfo.rate;
    }
  }
  
  // Fallback: Try to derive rate from billing data
  // Using the relationship: demand_charge ≈ portion of total bill
  // For B-19 type rates, demand is typically 30-50% of the total bill
  let estimatedRate = 0;
  let validBillCount = 0;
  
  for (const bill of bills) {
    if (bill.peakDemandKw > 50 && bill.totalCost > 1000) {
      // Estimate demand portion (more accurate for larger commercial accounts)
      // Based on typical C&I bill structure where demand is 35-45% of bill
      const estimatedDemandPortion = bill.totalCost * 0.40;
      const impliedRate = estimatedDemandPortion / bill.peakDemandKw;
      
      // Sanity check: PG&E demand rates are typically $15-55/kW
      if (impliedRate >= 15 && impliedRate <= 60) {
        estimatedRate += impliedRate;
        validBillCount++;
      }
    }
  }
  
  if (validBillCount > 0) {
    const derivedRate = estimatedRate / validBillCount;
    console.log(`📊 Derived demand rate from bills: $${derivedRate.toFixed(2)}/kW/month (estimated from ${validBillCount} bills)`);
    return derivedRate;
  }
  
  // Final fallback: Use B-19 secondary as default (most common commercial rate)
  const defaultRate = 30.0; // B-19 secondary weighted average
  console.log(`📊 Using default demand rate: $${defaultRate.toFixed(2)}/kW/month (B-19 Secondary assumed)`);
  return defaultRate;
}

/**
 * (Deprecated) Legacy “Sweet Spot” calculator removed.
 * The system now uses the physics-first selection algorithm in `src/modules/battery/optimal-selection.ts`.
 */

/**
 * POST /api/analyze - Analyze uploaded files and return battery recommendations
 */
app.post('/api/analyze', async (c) => {
  try {
    const body = await c.req.parseBody();
    const intervalFile = body.intervalFile as File | undefined;
    const monthlyBillFile = body.monthlyBillFile as File | undefined;

    if (!intervalFile || !monthlyBillFile) {
      return c.json(
        { error: 'Both intervalFile and monthlyBillFile are required' },
        400
      );
    }

    // Create temporary directory
    const tempDir = path.join(tmpdir(), 'everwatt-uploads');
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Generate unique filenames
    const intervalFilePath = path.join(tempDir, `interval_${Date.now()}_${intervalFile.name}`);
    const monthlyBillFilePath = path.join(tempDir, `bills_${Date.now()}_${monthlyBillFile.name}`);

    // Save uploaded files
    const intervalFileBuffer = Buffer.from(await intervalFile.arrayBuffer());
    const monthlyBillFileBuffer = Buffer.from(await monthlyBillFile.arrayBuffer());
    
    await writeFile(intervalFilePath, intervalFileBuffer);
    await writeFile(monthlyBillFilePath, monthlyBillFileBuffer);

    try {
      // Parse files
      const intervalData = readIntervalData(intervalFilePath);
      const monthlyBills = readMonthlyBills(monthlyBillFilePath);
      const catalogBatteries = loadBatteryCatalog(CATALOG_FILE);

      if (intervalData.length === 0) {
        return c.json({ error: 'No interval data found in uploaded file' }, 400);
      }

      if (monthlyBills.length === 0) {
        return c.json({ error: 'No monthly bill data found in uploaded file' }, 400);
      }

      // Calculate demand rate
      const demandRate = calculateDemandRate(monthlyBills);

      // Convert to LoadProfile for new algorithm
      const loadProfile: LoadProfile = {
        intervals: intervalData.map(d => ({
          timestamp: d.timestamp,
          kw: d.demand,
        })),
      };

      // Convert catalog for new algorithm
      const catalog: CatalogBattery[] = catalogBatteries.map(b => ({
        modelName: b.modelName,
        manufacturer: b.manufacturer,
        capacityKwh: b.capacityKwh,
        powerKw: b.powerKw,
        efficiency: b.efficiency,
        warrantyYears: b.warrantyYears,
        price1_10: b.price1_10,
        price11_20: b.price11_20,
        price21_50: b.price21_50,
        price50Plus: b.price50Plus,
      }));

      // ═══════════════════════════════════════════════════════════════════════
      // NEW: Use Physics-First Optimal Selection Algorithm
      // ═══════════════════════════════════════════════════════════════════════
      const selectionResult: SelectionResult = selectOptimalBatteries(
        loadProfile,
        catalog,
        demandRate,
        ALGORITHM_CONFIG.DEFAULT_TARGET_REDUCTION_PERCENT
      );

      // Log the algorithm execution
      console.log('\n' + selectionResult.log.join('\n'));

      // Convert to API format (portfolio-aware)
      const recommendations = selectionResult.candidates.map((c) => ({
        modelName: c.explanation.label,
        manufacturer: 'Portfolio',
        capacityKwh: c.totalCapacityKwh,
        maxPowerKw: c.totalPowerKw,
        peakReductionKw: c.peakReductionKw,
        annualSavings: c.annualSavings,
        systemCost: c.systemCost,
        paybackYears: c.paybackYears,
        quantity: c.totalUnits,
        pricingTier: c.pricingTier,
        objectiveValue: c.objectiveValue,
        thresholdKw: c.thresholdKw,
        portfolio: c.explanation.units,
        selectionReason: c.selectionReason,
        explanation: c.explanation,
      }));

      // Clean up temporary files
      await unlink(intervalFilePath).catch(() => {});
      await unlink(monthlyBillFilePath).catch(() => {});

      return c.json({
        success: selectionResult.success,
        demandRate,
        recommendations,
        summary: {
          batteriesAnalyzed: selectionResult.batteriesEvaluated,
          batteriesPassed: selectionResult.batteriesPassed,
          recommendationsCount: recommendations.length,
          originalPeakKw: selectionResult.peakProfile.originalPeakKw,
          targetReductionKw: selectionResult.requirements.targetReductionKw,
          bestPeakReductionKw: recommendations.length > 0 ? recommendations[0].peakReductionKw : 0,
          bestAnnualSavings: recommendations.length > 0 ? recommendations[0].annualSavings : 0,
        },
        // NEW: Include algorithm analysis
        analysis: {
          peakProfile: selectionResult.peakProfile,
          requirements: selectionResult.requirements,
        },
      });
    } catch (error) {
      // Clean up on error
      await unlink(intervalFilePath).catch(() => {});
      await unlink(monthlyBillFilePath).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error('Analysis error:', error);
    return c.json(
      {
        error: 'Failed to analyze files',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/simulate/battery - Simulate peak shaving for a specific battery
 */
app.post('/api/simulate/battery', async (c) => {
  try {
    const body = await c.req.json() as {
      load_profile?: LoadProfile;
      battery_spec: BatterySpec;
      threshold?: number;
    };

    if (!body.load_profile || !body.battery_spec) {
      return c.json(
        { error: 'load_profile and battery_spec are required' },
        400
      );
    }

    // Optimize threshold to maximize peak reduction per dollar if not provided
    let threshold: number = body.threshold ?? 0;
    if (!Number.isFinite(threshold) || threshold <= 0) {
      // Estimate system cost for optimization
      const estimatedSystemCost = (body.battery_spec.capacity_kwh * 500) + (body.battery_spec.max_power_kw * 300);
      const demandRate = 15; // Default if not provided
      
      const optimization = optimizeThresholdForValue(
        body.load_profile,
        body.battery_spec,
        demandRate,
        estimatedSystemCost,
        {
          minPaybackYears: 10,
          maxPaybackYears: 25,
          minThresholdPercent: 0.5,
        }
      );
      
      threshold = optimization.optimalThresholdKw;
    }

    // Run simulation (canonical dispatch wrapper for consistent series)
    const dispatchRun = runStandardPeakShavingDispatch({
      loadProfile: body.load_profile,
      batterySpec: body.battery_spec,
      thresholdKw: threshold,
    });
    const result = simulatePeakShaving(body.load_profile, body.battery_spec, threshold);

    return c.json({
      success: true,
      result,
      dispatch: dispatchRun,
    });
  } catch (error) {
    console.error('Simulation error:', error);
    return c.json(
      {
        error: 'Failed to simulate battery',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/process-usage - Process usage data file COMPREHENSIVELY
 * Captures ALL data, no skimming - full understanding of utility data
 */
app.post('/api/process-usage', async (c) => {
  try {
    const body = await c.req.parseBody();
    const usageFile = body.usageFile as File | undefined;

    if (!usageFile) {
      return c.json(
        { error: 'usageFile is required' },
        400
      );
    }

    // Guardrail: avoid crashing the server on very large uploads (we currently buffer the file in memory).
    const MAX_USAGE_BYTES = 25 * 1024 * 1024; // 25 MB
    if (typeof usageFile.size === 'number' && usageFile.size > MAX_USAGE_BYTES) {
      return c.json(
        {
          error: 'Usage file too large',
          message: `Please upload a usage file under ${Math.round(MAX_USAGE_BYTES / (1024 * 1024))}MB (received ${(usageFile.size / (1024 * 1024)).toFixed(1)}MB).`,
        },
        413
      );
    }

    // Create temporary directory
    const tempDir = path.join(tmpdir(), 'everwatt-uploads');
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Generate unique filename
    const usageFilePath = path.join(tempDir, `usage_${Date.now()}_${usageFile.name}`);

    // Save uploaded file
    const usageFileBuffer = Buffer.from(await usageFile.arrayBuffer());
    await writeFile(usageFilePath, usageFileBuffer);

    try {
      // Use COMPREHENSIVE reader - captures ALL fields, no skimming
      console.log('📊 Processing usage file comprehensively...');
      const usageSummary = readComprehensiveUsageData(usageFilePath);
      
      // All bills captured - no grouping, no loss
      const totalRows = usageSummary.allBills.length;
      const validRows = usageSummary.allBills.filter(bill => 
        bill.totalUsageKwh > 0 || bill.totalBillAmount > 0
      ).length;
      const invalidRows = totalRows - validRows;
      const percentageAbsorbed = totalRows > 0 ? (validRows / totalRows) * 100 : 0;

      if (validRows === 0) {
        return c.json({ 
          error: 'No valid monthly bill data found in uploaded file',
          statistics: {
            totalRows,
            validRows: 0,
            invalidRows,
            percentageAbsorbed: 0,
          }
        }, 400);
      }

      // Calculate demand rate using actual PG&E rate lookup
      const demandRate = calculateDemandRate(usageSummary.allBills.map(b => ({
        peakDemandKw: b.maxMaxDemandKw,
        totalCost: b.totalBillAmount,
        rateCode: b.rateCode,
      })));

      console.log(`✅ Processed ${validRows} bills, Rate: ${usageSummary.rateCode}, SAID: ${usageSummary.saId}`);

      // Clean up temporary file
      await unlink(usageFilePath).catch(() => {});

      return c.json({
        success: true,
        // Full data summary for frontend - includes TOU breakdown
        monthlyBills: usageSummary.allBills.map(b => ({
          // Back-compat: keep `date` as billEndDate
          date: b.billEndDate,
          billStartDate: b.billStartDate,
          billEndDate: b.billEndDate,
          totalUsageKwh: b.totalUsageKwh,
          peakDemandKw: b.maxMaxDemandKw,
          totalCost: b.totalBillAmount,
          rateCode: b.rateCode,
          // TOU breakdown for each bill
          onPeakKwh: b.onPeakKwh,
          partialPeakKwh: b.partialPeakKwh,
          offPeakKwh: b.offPeakKwh,
          superOffPeakKwh: b.superOffPeakKwh,
          // Demand breakdown
          onPeakDemandKw: b.onPeakDemandKw,
          partialPeakDemandKw: b.partialPeakDemandKw,
          offPeakDemandKw: b.offPeakDemandKw,
        })),
        // Extracted identifiers for verification
        identifiers: {
          saId: usageSummary.saId,
          accountNumber: usageSummary.accountNumber,
          meterNumber: usageSummary.meterNumber,
          rateCode: usageSummary.rateCode,
          serviceProvider: usageSummary.serviceProvider,
          billingName: usageSummary.billingName,
          siteAddress: usageSummary.siteAddress,
        },
        demandRate,
        baseline: {
          averageMonthlyCost: usageSummary.statistics.avgMonthlyCost,
          averageMonthlyUsage: usageSummary.statistics.avgMonthlyUsageKwh,
          averagePeakDemand: usageSummary.statistics.avgMonthlyDemandKw,
          totalMonths: validRows,
          peakDemandKw: usageSummary.statistics.peakDemandKw,
          dateRange: {
            start: usageSummary.statistics.dateRange.start,
            end: usageSummary.statistics.dateRange.end,
          },
          // TOU breakdown for analysis
          touBreakdown: usageSummary.statistics.touBreakdown,
        },
        statistics: {
          totalRows,
          validRows,
          invalidRows,
          percentageAbsorbed: Math.round(percentageAbsorbed * 100) / 100,
        },
        // Full summary for backend storage
        fullSummary: usageSummary,
      });
    } catch (error) {
      // Clean up on error
      await unlink(usageFilePath).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error('Usage processing error:', error);
    return c.json(
      {
        error: 'Failed to process usage file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/process-interval - Process interval data file and return load profile
 */
app.post('/api/process-interval', async (c) => {
  try {
    const body = await c.req.parseBody();
    const intervalFile = body.intervalFile as File | undefined;

    if (!intervalFile) {
      return c.json(
        { error: 'intervalFile is required' },
        400
      );
    }

    // Guardrail: avoid crashing the server on very large uploads (we currently buffer the file in memory).
    const MAX_INTERVAL_BYTES = 50 * 1024 * 1024; // 50 MB
    if (typeof intervalFile.size === 'number' && intervalFile.size > MAX_INTERVAL_BYTES) {
      return c.json(
        {
          error: 'Interval file too large',
          message: `Please upload an interval file under ${Math.round(MAX_INTERVAL_BYTES / (1024 * 1024))}MB (received ${(intervalFile.size / (1024 * 1024)).toFixed(1)}MB).`,
        },
        413
      );
    }

    // Create temporary directory
    const tempDir = path.join(tmpdir(), 'everwatt-uploads');
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Generate unique filename
    const intervalFilePath = path.join(tempDir, `interval_${Date.now()}_${intervalFile.name}`);

    // Save uploaded file
    const intervalFileBuffer = Buffer.from(await intervalFile.arrayBuffer());
    await writeFile(intervalFilePath, intervalFileBuffer);

    try {
      // Parse file
      const intervalData = readIntervalData(intervalFilePath);
      
      // Calculate statistics (keep zero/negative values — many sites idle at 0 kW)
      const isValidDemand = (d: (typeof intervalData)[number]) => Number.isFinite(d.demand);
      const totalRows = intervalData.length;
      const validRows = intervalData.filter(isValidDemand).length;
      const invalidRows = totalRows - validRows;
      const percentageAbsorbed = totalRows > 0 ? (validRows / totalRows) * 100 : 0;

      if (validRows === 0) {
        return c.json({ 
          error: 'No valid interval data found in uploaded file',
          statistics: {
            totalRows,
            validRows: 0,
            invalidRows,
            percentageAbsorbed: 0,
          }
        }, 400);
      }

      // Convert to intervals format (only valid rows; retain 0 kW readings)
      const intervals = intervalData
        .filter(isValidDemand)
        .map(item => ({
          timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : item.timestamp,
          kw: item.demand,
          temperature: item.temperature,
        }));

      const peakKw = intervals.length > 0 ? Math.max(...intervals.map(i => i.kw)) : 0;

      // Clean up temporary file
      await unlink(intervalFilePath).catch(() => {});

      return c.json({
        success: true,
        intervals,
        peakKw,
        statistics: {
          totalRows,
          validRows,
          invalidRows,
          percentageAbsorbed: Math.round(percentageAbsorbed * 100) / 100,
        },
      });
    } catch (error) {
      // Clean up on error
      await unlink(intervalFilePath).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error('Interval processing error:', error);
    return c.json(
      {
        error: 'Failed to process interval file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/verify-data - Perform 3-Tier Data Verification
 * 
 * Tier 1: User Input vs File Data (rate code, SAID)
 * Tier 2: Cross-File Validation (usage vs interval SAID match)
 * Tier 3: Rate Intelligence (file rate vs system rate library)
 */
app.post('/api/verify-data', async (c) => {
  try {
    const body = await c.req.parseBody();
    const usageFile = body.usageFile as File | undefined;
    const intervalFile = body.intervalFile as File | undefined;
    const userSelectedRate = body.userSelectedRate as string | undefined;
    const userSaId = body.userSaId as string | undefined;

    // Create temporary directory
    const tempDir = path.join(tmpdir(), 'everwatt-uploads');
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    let usageFilePath: string | null = null;
    let intervalFilePath: string | null = null;

    try {
      // Save usage file if provided
      if (usageFile) {
        usageFilePath = path.join(tempDir, `usage_${Date.now()}_${usageFile.name}`);
        const usageFileBuffer = Buffer.from(await usageFile.arrayBuffer());
        await writeFile(usageFilePath, usageFileBuffer);
      }

      // Save interval file if provided
      if (intervalFile) {
        intervalFilePath = path.join(tempDir, `interval_${Date.now()}_${intervalFile.name}`);
        const intervalFileBuffer = Buffer.from(await intervalFile.arrayBuffer());
        await writeFile(intervalFilePath, intervalFileBuffer);
      }

      // Create comprehensive utility data package with 3-tier verification
      const dataPackage = createUtilityDataPackage(
        usageFilePath,
        intervalFilePath,
        userSelectedRate || null,
        userSaId || null
      );

      // Clean up temporary files
      if (usageFilePath) await unlink(usageFilePath).catch(() => {});
      if (intervalFilePath) await unlink(intervalFilePath).catch(() => {});

      console.log(`🔍 3-Tier Verification Complete: ${dataPackage.verification.overallStatus} (${dataPackage.verification.confidenceScore}% confidence)`);

      return c.json({
        success: true,
        verification: dataPackage.verification,
        identifiers: {
          usage: dataPackage.usageData ? {
            saId: dataPackage.usageData.saId,
            rateCode: dataPackage.usageData.rateCode,
            accountNumber: dataPackage.usageData.accountNumber,
            meterNumber: dataPackage.usageData.meterNumber,
            billingName: dataPackage.usageData.billingName,
            siteAddress: dataPackage.usageData.siteAddress,
          } : null,
          interval: dataPackage.intervalData ? {
            serviceAgreement: dataPackage.intervalData.serviceAgreement,
          } : null,
        },
        statistics: {
          usage: dataPackage.usageData?.statistics || null,
          interval: dataPackage.intervalData?.statistics || null,
        },
      });
    } catch (error) {
      // Clean up on error
      if (usageFilePath) await unlink(usageFilePath).catch(() => {});
      if (intervalFilePath) await unlink(intervalFilePath).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error('Verification error:', error);
    return c.json(
      {
        error: 'Failed to verify data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/batteries/recommend - Get AI battery recommendations based on interval data
 * 
 * NOW USING: Physics-First Optimal Selection Algorithm (src/modules/battery/optimal-selection.ts)
 * 
 * This endpoint uses the new 3-stage algorithm:
 *   Stage 1: Analyze load profile → determine minimum physical requirements
 *   Stage 2: Simulate each candidate → validate ≥80% target achievement
 *   Stage 3: Score validated candidates by value delivered
 */
app.post('/api/batteries/recommend', async (c) => {
  try {
    const body = await c.req.json() as {
      intervals: Array<{ timestamp: string; kw: number }>;
      demandRate?: number;
      targetReductionPercent?: number; // NEW: Target reduction as percentage (e.g., 10 = 10%)
      targetThreshold?: number; // Legacy: absolute threshold in kW
      // Optional context for S-Rate decisioning
      rateCode?: string;
      serviceProvider?: string;
    };

    if (!body.intervals || body.intervals.length === 0) {
      return c.json(
        { error: 'Intervals are required' },
        400
      );
    }

    // Convert intervals to LoadProfile format
    const loadProfile: LoadProfile = {
      intervals: body.intervals.map(item => ({
        timestamp: new Date(item.timestamp),
        kw: item.kw,
      })),
    };

    // Use provided demand rate or default
    const demandRate = body.demandRate || 15; // Default $15/kW/month

    // Load battery catalog (prefer persisted library so admin-added batteries participate)
    let catalogBatteries: ReturnType<typeof loadBatteryCatalog> = [];
    try {
      const libraryFile = path.join(process.cwd(), 'data', 'library', 'batteries.json');
      if (existsSync(libraryFile)) {
        const raw = await readFile(libraryFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          catalogBatteries = parsed as ReturnType<typeof loadBatteryCatalog>;
        }
      }
      if (catalogBatteries.length === 0) {
        catalogBatteries = loadBatteryCatalog(CATALOG_FILE);
      }
    } catch (err) {
      console.error('Failed to load battery catalog:', err);
      return c.json({ error: 'Failed to load battery catalog' }, 500);
    }

    if (catalogBatteries.length === 0) {
      return c.json(
        { error: 'Battery catalog is empty' },
        404
      );
    }

    // Convert catalog to CatalogBattery format for the new algorithm
    const catalog: CatalogBattery[] = catalogBatteries.map(b => ({
      modelName: b.modelName,
      manufacturer: b.manufacturer,
      capacityKwh: b.capacityKwh,
      powerKw: b.powerKw,
      efficiency: b.efficiency,
      warrantyYears: b.warrantyYears,
      price1_10: b.price1_10,
      price11_20: b.price11_20,
      price21_50: b.price21_50,
      price50Plus: b.price50Plus,
    }));

    // Calculate target reduction percentage
    let targetReductionPercent = ALGORITHM_CONFIG.DEFAULT_TARGET_REDUCTION_PERCENT;
    
    if (body.targetReductionPercent !== undefined) {
      targetReductionPercent = body.targetReductionPercent;
    } else if (body.targetThreshold !== undefined) {
      // Convert legacy absolute threshold to percentage
      const originalPeak = Math.max(...body.intervals.map(i => i.kw));
      if (originalPeak > 0) {
        targetReductionPercent = ((originalPeak - body.targetThreshold) / originalPeak) * 100;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NEW: Use Physics-First Optimal Selection Algorithm
    // ═══════════════════════════════════════════════════════════════════════
    const selectionResult: SelectionResult = selectOptimalBatteries(
      loadProfile,
      catalog,
      demandRate,
      targetReductionPercent
    );

    // Log the algorithm execution for debugging
    console.log('\n' + selectionResult.log.join('\n'));

    // Convert to legacy response format for backward compatibility (and enrich with cap + S-Rate economics)
    const rateCode = String(body.rateCode || '').trim();
    const serviceProvider = String(body.serviceProvider || '').trim();
    const isPge = /pg\s*&\s*e|pg&e|pge/i.test(serviceProvider) || serviceProvider.toLowerCase() === 'pge';
    const alreadyOnOptionS = isAlreadyOnOptionS(rateCode);

    // Precompute baseline monthly peaks (for S-Rate savings comparison)
    const monthlyPeaksBefore = new Map<string, number>();
    for (const i of loadProfile.intervals) {
      const d = i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyPeaksBefore.set(mk, Math.max(monthlyPeaksBefore.get(mk) || 0, i.kw));
    }
    const monthsCount = monthlyPeaksBefore.size;
    const annualizeMonths = monthsCount > 0 ? 12 / monthsCount : 1;
    const baselineAnnualDemandCharge = Array.from(monthlyPeaksBefore.values()).reduce((sum, v) => sum + v, 0) * annualizeMonths * demandRate;

    // Distinct days for annualizing Option S daily charges
    const dayKeys = new Set<string>();
    for (const i of loadProfile.intervals) {
      const d = i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp);
      dayKeys.add(d.toISOString().slice(0, 10));
    }
    const daysCount = dayKeys.size;
    const annualizeDays = daysCount > 0 ? 365 / daysCount : 1;

    let warnings: string[] = [];
    if (isPge && alreadyOnOptionS) {
      warnings.push(
        `Rate code ${rateCode} indicates the customer is already on an Option S schedule. “Add S-Rate” comparison is disabled; savings should be evaluated under the current Option S schedule.`
      );
    }

    const econAssumptions = {
      paybackCapYears: 10,
      preferredMargin: 0.5,
      discountRate: 0.06,
      analysisYears: 10,
      degradationRate: 0.02,
    } as const;

    let recommendations = await Promise.all(selectionResult.candidates.map(async (c) => {
      const batterySpec: BatterySpec = {
        capacity_kwh: c.totalCapacityKwh,
        max_power_kw: c.totalPowerKw,
        round_trip_efficiency: c.roundTripEfficiency,
        degradation_rate: 0.02,
        min_soc: 0.10,
        max_soc: 0.90,
        depth_of_discharge: 0.80,
      };

      // Cap discovery summary (billing-max correct). This is the dispatch basis for “never exceed cap”.
      const capDiscovery = computeCapDiscoveryAcrossMonths(loadProfile, batterySpec, demandRate);

      // S-Rate exception path: compute S-Rate demand-charge economics (demand portion only).
      let sRate = {
        isEligible: false,
        annualDemandCharge: 0,
        annualSavings: 0,
        paybackYears: Infinity as number,
      };

      if (isPge && rateCode && !alreadyOnOptionS) {
        const peakDemandKw = Math.max(...loadProfile.intervals.map(i => i.kw));
        const avgDemandKw =
          loadProfile.intervals.length > 0
            ? loadProfile.intervals.reduce((sum, i) => sum + i.kw, 0) / loadProfile.intervals.length
            : 0;
        const loadFactor = peakDemandKw > 0 ? avgDemandKw / peakDemandKw : 0;

        const eligibility = checkSRateEligibility(
          rateCode,
          peakDemandKw,
          c.totalCapacityKwh,
          c.totalPowerKw,
          loadFactor,
          loadProfile.intervals
        );

        if (eligibility.isEligible) {
          const threshold = capDiscovery.guaranteedCapKw || peakDemandKw; // use cap-discovered ceiling as dispatch target
          const sRateDispatch = await runOptionSDispatch({
            intervals: loadProfile.intervals as any,
            batteryCapacityKwh: c.totalCapacityKwh,
            batteryPowerKw: c.totalPowerKw,
            roundTripEfficiency: c.roundTripEfficiency,
            thresholdKw: threshold,
            rates: DEFAULT_OPTION_S_RATES_2025_SECONDARY,
            mode: 'auto',
          });

          // Schedule-aware Option S demand charges over the dataset (dollars), annualized
          const optionSCost = calculateOptionSDemandCharges(sRateDispatch.netLoadIntervals, DEFAULT_OPTION_S_RATES_2025_SECONDARY);
          const annualDemandCharge = optionSCost.totalInData * annualizeDays;
          const annualSavings = baselineAnnualDemandCharge - annualDemandCharge;
          const econForSRate = gradeBatteryEconomics({
            materialCost: c.systemCost,
            annualSavings,
            assumptions: econAssumptions,
          });
          const paybackYears = econForSRate.financial.adjustedPayback;

          sRate = {
            isEligible: true,
            annualDemandCharge,
            annualSavings,
            paybackYears,
          };
        }
      }

      const econStandard = gradeBatteryEconomics({
        materialCost: c.systemCost,
        annualSavings: c.annualSavings,
        assumptions: econAssumptions,
      });
      const econSRate = sRate.isEligible
        ? gradeBatteryEconomics({
            materialCost: c.systemCost,
            annualSavings: sRate.annualSavings,
            assumptions: econAssumptions,
          })
        : null;

      const best =
        econSRate && econSRate.economicScore > econStandard.economicScore
          ? { mode: 'S_RATE' as const, annualSavings: sRate.annualSavings, economics: econSRate }
          : { mode: 'STANDARD' as const, annualSavings: c.annualSavings, economics: econStandard };

      return {
        modelName: c.explanation.label,
        manufacturer: 'Portfolio',
        capacityKwh: c.totalCapacityKwh,
        maxPowerKw: c.totalPowerKw,
        peakReductionKw: c.peakReductionKw,
        annualSavings: c.annualSavings,
        systemCost: c.systemCost,
        paybackYears: c.paybackYears,
        // Portfolio details (new)
        quantity: c.totalUnits,
        pricingTier: c.pricingTier,
        thresholdKw: c.thresholdKw,
        annualizedCapex: c.annualizedCapex,
        objectiveValue: c.objectiveValue,
        portfolio: c.explanation.units,
        selectionReason: c.selectionReason,
        roundTripEfficiency: c.roundTripEfficiency,
        // NEW: Cap enforcement results (billing-max correct)
        capDiscovery: {
          guaranteedCapKw: capDiscovery.guaranteedCapKw,
          perMonth: capDiscovery.perMonth,
        },
        // NEW: S-Rate exception economics (demand portion only)
        sRate,
        // NEW: Economics-aware scoring (installed-cost proxy + 10y cap + 50% margin)
        economics: econStandard,
        economicsSRate: econSRate,
        best: {
          mode: best.mode,
          annualSavings: best.annualSavings,
          paybackYears: best.economics.financial.adjustedPayback,
          economicScore: best.economics.economicScore,
          effectiveInstalledCost: best.economics.effectiveInstalledCost,
          npv10: best.economics.financial.netPresentValue,
        },
      };
    }));

    // Best-effort fallback: if nothing passed strict validation gates, return marginal-analysis sizing.
    if (recommendations.length === 0 && selectionResult.marginalAnalysis && selectionResult.marginalAnalysis.length > 0) {
      warnings = [
        'No batteries passed strict validation gates. Showing best-effort recommendations from marginal analysis.',
      ];

      recommendations = await Promise.all(selectionResult.marginalAnalysis
        .filter(m => m.optimalQuantity > 0)
        .map(async (m) => {
          const batterySpec: BatterySpec = {
            capacity_kwh: m.totalCapacityKwh,
            max_power_kw: m.totalPowerKw,
            round_trip_efficiency: m.battery.efficiency,
            degradation_rate: 0.02,
            min_soc: 0.10,
            max_soc: 0.90,
            depth_of_discharge: 0.80,
          };

          const capDiscovery = computeCapDiscoveryAcrossMonths(loadProfile, batterySpec, demandRate);

          let sRate = {
            isEligible: false,
            annualDemandCharge: 0,
            annualSavings: 0,
            paybackYears: Infinity as number,
          };

          if (isPge && rateCode && !alreadyOnOptionS) {
            const peakDemandKw = Math.max(...loadProfile.intervals.map(i => i.kw));
            const avgDemandKw =
              loadProfile.intervals.length > 0
                ? loadProfile.intervals.reduce((sum, i) => sum + i.kw, 0) / loadProfile.intervals.length
                : 0;
            const loadFactor = peakDemandKw > 0 ? avgDemandKw / peakDemandKw : 0;

            const eligibility = checkSRateEligibility(
              rateCode,
              peakDemandKw,
              m.totalCapacityKwh,
              m.totalPowerKw,
              loadFactor,
              loadProfile.intervals
            );

            if (eligibility.isEligible) {
              const threshold = capDiscovery.guaranteedCapKw || peakDemandKw;
              const sRateDispatch = await runOptionSDispatch({
                intervals: loadProfile.intervals as any,
                batteryCapacityKwh: m.totalCapacityKwh,
                batteryPowerKw: m.totalPowerKw,
                roundTripEfficiency: m.battery.efficiency,
                thresholdKw: threshold,
                rates: DEFAULT_OPTION_S_RATES_2025_SECONDARY,
                mode: 'auto',
              });

              const optionSCost = calculateOptionSDemandCharges(sRateDispatch.netLoadIntervals, DEFAULT_OPTION_S_RATES_2025_SECONDARY);
              const annualDemandCharge = optionSCost.totalInData * annualizeDays;
              const annualSavings = baselineAnnualDemandCharge - annualDemandCharge;
              const econForSRate = gradeBatteryEconomics({
                materialCost: m.totalSystemCost,
                annualSavings,
                assumptions: econAssumptions,
              });
              const paybackYears = econForSRate.financial.adjustedPayback;

              sRate = {
                isEligible: true,
                annualDemandCharge,
                annualSavings,
                paybackYears,
              };
            }
          }

          const econStandard = gradeBatteryEconomics({
            materialCost: m.totalSystemCost,
            annualSavings: m.totalAnnualSavings,
            assumptions: econAssumptions,
          });
          const econSRate = sRate.isEligible
            ? gradeBatteryEconomics({
                materialCost: m.totalSystemCost,
                annualSavings: sRate.annualSavings,
                assumptions: econAssumptions,
              })
            : null;

          const best =
            econSRate && econSRate.economicScore > econStandard.economicScore
              ? { mode: 'S_RATE' as const, annualSavings: sRate.annualSavings, economics: econSRate }
              : { mode: 'STANDARD' as const, annualSavings: m.totalAnnualSavings, economics: econStandard };

          return {
            modelName: m.battery.modelName,
            manufacturer: m.battery.manufacturer,
            capacityKwh: m.totalCapacityKwh,
            maxPowerKw: m.totalPowerKw,
            peakReductionKw: m.totalPeakReductionKw,
            annualSavings: m.totalAnnualSavings,
            systemCost: m.totalSystemCost,
            paybackYears: m.averagePayback,
            quantity: m.optimalQuantity,
            unitCapacityKwh: m.battery.capacityKwh,
            unitPowerKw: m.battery.powerKw,
            achievementPercent: m.totalPeakReductionPercent,
            valueScore: m.valueScore,
            scoreBreakdown: { achievementScore: 0, efficiencyScore: 0, durabilityScore: 0 },
            selectionReason: m.stopReason || 'Best-effort (marginal analysis)',
            roundTripEfficiency: m.battery.efficiency,
            warranty: `${m.battery.warrantyYears} years`,
            capDiscovery: {
              guaranteedCapKw: capDiscovery.guaranteedCapKw,
              perMonth: capDiscovery.perMonth,
            },
            sRate,
            best: {
              mode: best.mode,
              annualSavings: best.annualSavings,
              paybackYears: best.economics.financial.adjustedPayback,
              economicScore: best.economics.economicScore,
              effectiveInstalledCost: best.economics.effectiveInstalledCost,
              npv10: best.economics.financial.netPresentValue,
            },
            economics: econStandard,
            economicsSRate: econSRate,
          };
        }));
    }

    // Sort by economics-aware score first (installed-cost proxy + payback cap), then objectiveValue
    recommendations.sort((a, b) => {
      const as = Number((a as any)?.best?.economicScore ?? (a as any)?.economics?.economicScore ?? 0) || 0;
      const bs = Number((b as any)?.best?.economicScore ?? (b as any)?.economics?.economicScore ?? 0) || 0;
      if (bs !== as) return bs - as;
      return (Number((b as any).objectiveValue) || 0) - (Number((a as any).objectiveValue) || 0);
    });

    // Backward compatibility: keep "bestRecommendation" consistent with the ordering
    const bestRecommendation = recommendations.length > 0 ? recommendations[0] : null;

    // Build marginal analysis response if available
    const marginalAnalysisResponse = selectionResult.marginalAnalysis?.map(m => ({
      battery: {
        modelName: m.battery.modelName,
        manufacturer: m.battery.manufacturer,
        capacityKwh: m.battery.capacityKwh,
        powerKw: m.battery.powerKw,
      },
      optimalQuantity: m.optimalQuantity,
      totalPeakReductionKw: m.totalPeakReductionKw,
      totalPeakReductionPercent: m.totalPeakReductionPercent,
      // New monthly-billing-peak scoring fields
      baselineKw: m.baselineKw,
      annualPeakReductionKwMonthSum: m.annualPeakReductionKwMonthSum,
      originalMonthlyPeakSumKw: m.originalMonthlyPeakSumKw,
      totalAnnualSavings: m.totalAnnualSavings,
      totalSystemCost: m.totalSystemCost,
      averagePayback: m.averagePayback,
      totalPowerKw: m.totalPowerKw,
      totalCapacityKwh: m.totalCapacityKwh,
      valueScore: m.valueScore,
      stopReason: m.stopReason,
      firstBatteryPeakReductionKwMonthSum: m.firstBatteryPeakReductionKwMonthSum,
      // Include step-by-step iteration history
      steps: m.steps.map(s => ({
        quantity: s.quantity,
        peakReductionKw: s.totalPeakReductionKw,
        peakReductionKwMonthSum: s.totalPeakReductionKwMonthSum,
        peakReductionPercent: s.peakReductionPercent,
        totalSavings: s.totalAnnualSavings,
        incrementalSavings: s.incrementalSavings,
        incrementalPeakReductionKwMonthSum: s.incrementalPeakReductionKwMonthSum,
        incrementalPayback: s.incrementalPayback,
        decision: s.decision,
        reason: s.reason,
      })),
    }));

    return c.json({
      success: selectionResult.success,
      recommendations,
      bestRecommendation,
      warnings,
      // Algorithm analysis for transparency
      analysis: {
        mode: 'PORTFOLIO',
        peakProfile: selectionResult.peakProfile,
        requirements: selectionResult.requirements,
        batteriesEvaluated: selectionResult.batteriesEvaluated,
        batteriesPassed: selectionResult.batteriesPassed,
        // Configuration used
        config: {
          paybackTargetYears: 10,
          paybackCapYears: econAssumptions.paybackCapYears,
          preferredMargin: econAssumptions.preferredMargin,
          minPowerFraction: 0.5,
          candidatePoolTopK: 6,
          oversizeCapMultiplier: 2.0,
        },
      },
      // NEW: Full marginal analysis with iteration history
      marginalAnalysis: marginalAnalysisResponse,
    });
  } catch (error) {
    console.error('Battery recommendation error:', error);
    return c.json(
      {
        error: 'Failed to generate battery recommendations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/batteries/diagnostics
 * Returns explainable diagnostics for a specific battery + threshold over an interval series.
 */
app.post('/api/batteries/diagnostics', async (c) => {
  try {
    const body = await c.req.json() as {
      intervals: Array<{ timestamp: string; kw: number }>;
      batterySpec: BatterySpec;
      thresholdKw: number;
      demandRatePerKwMonth?: number;
    };
    if (!Array.isArray(body.intervals) || body.intervals.length === 0) {
      return c.json({ success: false, error: 'intervals are required' }, 400);
    }
    if (!body.batterySpec) return c.json({ success: false, error: 'batterySpec is required' }, 400);
    if (!Number.isFinite(body.thresholdKw)) return c.json({ success: false, error: 'thresholdKw is required' }, 400);

    const loadProfile: LoadProfile = {
      intervals: body.intervals.map((i) => ({
        timestamp: new Date(i.timestamp),
        kw: Number(i.kw) || 0,
        temperature: typeof i.temperature === 'number' ? i.temperature : undefined,
      })),
    };
    const sim = simulatePeakShaving(loadProfile, body.batterySpec, body.thresholdKw);
    const diagnostic = analyzeBatteryEfficiency({
      loadProfile,
      battery: body.batterySpec,
      simulationResult: sim,
      thresholdKw: body.thresholdKw,
      demandRatePerKwMonth: body.demandRatePerKwMonth,
    });
    return c.json({ success: true, diagnostic, simulationResult: sim });
  } catch (error) {
    console.error('Diagnostics error:', error);
    return c.json({ success: false, error: 'Failed to compute diagnostics' }, 500);
  }
});

/**
 * POST /api/batteries/analyze
 * Comprehensive analysis endpoint: runs all calculations on backend and returns
 * pre-computed, downsampled results for frontend rendering.
 * This prevents the frontend from processing large datasets and freezing the browser.
 */
app.post('/api/batteries/analyze', async (c) => {
  try {
    const body = await c.req.json() as {
      analysisId?: string; // Optional: persist snapshot under this analysisId
      intervals: Array<{ timestamp: string; kw: number; temperature?: number }>;
      usageData?: unknown; // Optional: persisted inputs/hash only
      customerInfo?: unknown; // Optional: persisted inputs only
      batteryMeta?: unknown; // Optional: persisted display metadata (portfolio/tier/etc)
      batterySpec?: BatterySpec; // Optional if using multi-tier
      thresholdKw?: number;
      demandRatePerKwMonth?: number;
      maxChartPoints?: number; // Default 2000
      rateCode?: string; // Rate code for S-rate and threshold benefit calculations
      // Multi-tier and demand response options
      analysisMode?: 'single' | 'multi-tier';
      demandResponse?: (DemandResponseParams & Partial<ApiDemandResponseParams>);
    };
    if (!Array.isArray(body.intervals) || body.intervals.length === 0) {
      return c.json({ success: false, error: 'intervals are required' }, 400);
    }

    const analysisMode = body.analysisMode ?? 'single';
    const demandRate = body.demandRatePerKwMonth ?? 15;
    const userId = getCurrentUserId(c);
    const catalogFileForHash = path.join(process.cwd(), 'data', 'library', 'batteries.json');
    let catalogHash: string | null = null;
    try {
      if (existsSync(catalogFileForHash)) {
        catalogHash = createHash('sha256').update(await readFile(catalogFileForHash, 'utf-8')).digest('hex');
      }
    } catch {
      catalogHash = null;
    }

    // Multi-tier analysis path
    if (analysisMode === 'multi-tier') {
      // Load catalog for multi-tier analysis
      let catalogBatteries: ReturnType<typeof loadBatteryCatalog> = [];
      const libraryFile = path.join(process.cwd(), 'data', 'library', 'batteries.json');
      if (existsSync(libraryFile)) {
        try {
          const raw = await readFile(libraryFile, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) catalogBatteries = parsed as ReturnType<typeof loadBatteryCatalog>;
        } catch {
          // ignore
        }
      }
      if (catalogBatteries.length === 0) catalogBatteries = loadBatteryCatalog(CATALOG_FILE);
      const catalog: CatalogBattery[] = catalogBatteries.map((b) => ({
        modelName: b.modelName,
        manufacturer: b.manufacturer,
        capacityKwh: b.capacityKwh,
        powerKw: b.powerKw,
        efficiency: b.efficiency,
        warrantyYears: b.warrantyYears,
        price1_10: b.price1_10,
        price11_20: b.price11_20,
        price21_50: b.price21_50,
        price50Plus: b.price50Plus,
      }));

      const loadProfile: LoadProfile = {
        intervals: body.intervals.map((i) => ({
          timestamp: new Date(i.timestamp),
          kw: Number(i.kw) || 0,
          temperature: typeof i.temperature === 'number' ? i.temperature : undefined,
        })),
      };

      const rateCode = String(body.rateCode || '').trim();
      const bestRecommendationResult = generateBestRecommendation(
        loadProfile,
        catalog,
        demandRate,
        rateCode || undefined,
        // Do not bake DR into tier scoring; compute dedicated DR panel separately.
        undefined
      );

      // Downsample chart data for each tier (helper function)
      const maxPoints = body.maxChartPoints ?? 2000;
      const downsampleTier = (sim: SimulationResult) => {
        const sampleRate = loadProfile.intervals.length > maxPoints ? Math.ceil(loadProfile.intervals.length / maxPoints) : 1;
        const downsampledIntervals: Array<{ timestamp: string; kw: number }> = [];
        const downsampledAfterKw: number[] = [];
        const downsampledSocHistory: number[] = [];
        
        const newIntervalsKw = sim.new_intervals_kw ?? sim.final_load_profile?.intervals?.map((i: any) => i.kw) ?? [];
        const socHistory = sim.battery_soc_history ?? [];

        const toIsoString = (ts: Date | string): string => {
          if (ts instanceof Date) return ts.toISOString();
          if (typeof ts === 'string') return ts;
          return new Date(ts).toISOString();
        };

        if (loadProfile.intervals.length > 0) {
          downsampledIntervals.push({
            timestamp: toIsoString(loadProfile.intervals[0].timestamp),
            kw: loadProfile.intervals[0].kw,
          });
          downsampledAfterKw.push(newIntervalsKw[0] ?? loadProfile.intervals[0].kw);
          downsampledSocHistory.push(socHistory[0] ?? 0);
        }

        for (let idx = sampleRate; idx < loadProfile.intervals.length - 1; idx += sampleRate) {
          downsampledIntervals.push({
            timestamp: toIsoString(loadProfile.intervals[idx].timestamp),
            kw: loadProfile.intervals[idx].kw,
          });
          downsampledAfterKw.push(newIntervalsKw[idx] ?? loadProfile.intervals[idx].kw);
          downsampledSocHistory.push(socHistory[idx] ?? 0);
        }

        if (loadProfile.intervals.length > 1) {
          const lastIdx = loadProfile.intervals.length - 1;
          downsampledIntervals.push({
            timestamp: toIsoString(loadProfile.intervals[lastIdx].timestamp),
            kw: loadProfile.intervals[lastIdx].kw,
          });
          downsampledAfterKw.push(newIntervalsKw[lastIdx] ?? loadProfile.intervals[lastIdx].kw);
          downsampledSocHistory.push(socHistory[lastIdx] ?? 0);
        }

        return {
          intervals: downsampledIntervals,
          afterKw: downsampledAfterKw,
          socHistory: downsampledSocHistory,
        };
      };

      // Optional deterministic DR panel using the recommended tier (single best)
      let demandResponsePanel: any = undefined;
      let demandResponsePanelV2: any = undefined;
      try {
        const dr = body.demandResponse as any;
        if (dr?.enabled) {
          const recommended = bestRecommendationResult.options.find((o: any) => o.isRecommended) ?? bestRecommendationResult.options[0];
          demandResponsePanel = await computeDrPanel({
            loadIntervals: loadProfile.intervals,
            battery: {
              powerKw: Number(recommended?.batteryInfo?.totalPowerKw) || 0,
              energyKwh: Number(recommended?.batteryInfo?.totalCapacityKwh) || 0,
              roundTripEfficiency: Number(recommended?.batterySpec?.round_trip_efficiency) || 0.9,
            },
            rateCode: rateCode || undefined,
            demandResponse: {
              enabled: true,
              capacityPaymentPerKwMonth: Number(dr.capacityPaymentPerKwMonth ?? 10),
              paymentUnit: (dr.paymentUnit as any) ?? 'per_kw_event',
              eventPayment: Number(dr.eventPayment ?? dr.eventPaymentPerKw ?? 1.0),
              estimatedEventsPerYear: Number(dr.estimatedEventsPerYear ?? 12),
              minimumCommitmentKw: Number(dr.minimumCommitmentKw ?? 50),
              everwattFeePerKwYear: Number(dr.everwattFeePerKwYear ?? 30),
              everwattFeePct: Number(dr.everwattFeePct ?? 0.2),
            },
          });
          if (demandResponsePanel) {
            demandResponsePanelV2 = toDrPanelV2({
              enabled: true,
              detectedRateCode: rateCode || undefined,
              tariffTerritory: 'PGE',
              intervals: loadProfile.intervals as any,
              method: 'top_n_hottest_days',
              topNHottestDays: 10,
              firmPercentile: 20,
              socCarryInPolicy: 'fixed_50pct',
              noExport: true,
              performanceFactor: 0.85,
              eventWindow: { startHour: 16, endHour: 21, weekdaysOnly: true, months: [6, 7, 8, 9], timezone: 'America/Los_Angeles' },
              panelV1: demandResponsePanel,
            });
          }
        }
      } catch (e) {
        console.warn('DR panel compute failed (multi-tier):', e);
      }

      const responseBody = {
        success: true,
        analysisMode: 'multi-tier',
        tieredRecommendations: {
          originalPeakKw: bestRecommendationResult.originalPeakKw,
          options: bestRecommendationResult.options.map((option: any) => ({
            ...option,
            simulationResult: {
              ...option.simulationResult,
              chartData: downsampleTier(option.simulationResult),
            },
          })),
        },
        // v2 is now the primary API field; keep legacy for safety
        demandResponse: demandResponsePanelV2,
        demandResponseLegacy: demandResponsePanel,
      };

      // Persist snapshot if requested
      if (typeof body.analysisId === 'string' && body.analysisId.trim()) {
        const analysisId = body.analysisId.trim();
        const intervalHash = sha256OfJson(body.intervals);
        const usageHash = body.usageData ? sha256OfJson(body.usageData) : null;
        const manifest = {
          kind: 'battery-analysis',
          apiVersion: 'battery-analysis-v1',
          analysisId,
          runId: randomUUID(),
          createdAt: new Date().toISOString(),
          userId,
          mode: 'multi-tier',
          intervalSha256: intervalHash,
          usageSha256: usageHash,
          rateCode: String(body.rateCode || '').trim() || null,
          demandRatePerKwMonth: demandRate,
          catalogSha256: catalogHash,
          gitCommit: process.env.GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || null,
          nodeVersion: process.version,
        } as Record<string, unknown>;

        const inputs = {
          analysisId,
          analysisMode,
          rateCode: body.rateCode,
          demandRatePerKwMonth: body.demandRatePerKwMonth,
          maxChartPoints: body.maxChartPoints ?? 2000,
          demandResponse: body.demandResponse,
          customerInfo: body.customerInfo,
          usageData: body.usageData,
          intervals: body.intervals,
          batteryMeta: body.batteryMeta,
        };

        const result = {
          apiVersion: 'battery-analysis-v1',
          analysisId,
          runId: manifest.runId,
          createdAt: manifest.createdAt,
          customerInfo: body.customerInfo ?? null,
          usageData: body.usageData ?? null,
          batteryMeta: body.batteryMeta ?? null,
          result: responseBody,
        };

        await persistBatteryAnalysisRun({ analysisId, userId, inputs, result, manifest });
      }

      return c.json(responseBody);
    }

    // Single battery analysis path (existing logic)
    if (!body.batterySpec) return c.json({ success: false, error: 'batterySpec is required for single analysis' }, 400);

    const loadProfile: LoadProfile = {
      intervals: body.intervals.map((i) => ({
        timestamp: new Date(i.timestamp),
        kw: Number(i.kw) || 0,
        temperature: typeof i.temperature === 'number' ? i.temperature : undefined,
      })),
    };

    // Optimize threshold to maximize peak reduction per dollar if not provided
    let thresholdKw: number = body.thresholdKw ?? 0;
    if (!Number.isFinite(thresholdKw) || thresholdKw <= 0) {
      // Estimate system cost - in real scenario this would come from battery catalog
      // For now, use a rough estimate based on capacity and power
      const estimatedSystemCost = (body.batterySpec.capacity_kwh * 500) + (body.batterySpec.max_power_kw * 300);
      const demandRate = body.demandRatePerKwMonth || 15;
      
      const optimization = optimizeThresholdForValue(
        loadProfile,
        body.batterySpec,
        demandRate,
        estimatedSystemCost,
        {
          minPaybackYears: 10,
          maxPaybackYears: 25,
          minThresholdPercent: 0.5,
        }
      );
      
      thresholdKw = optimization.optimalThresholdKw;
      console.log(`Optimized threshold: ${thresholdKw.toFixed(1)} kW (${optimization.peakReductionPercent.toFixed(1)}% reduction, ${optimization.paybackYears.toFixed(1)} yr payback)`);
    }

    // Run all calculations on backend
    const simulationResult = simulatePeakShaving(loadProfile, body.batterySpec, thresholdKw);
    const peakEvents = detectPeakEvents(loadProfile, thresholdKw);
    const diagnostic = analyzeBatteryEfficiency({
      loadProfile,
      battery: body.batterySpec,
      simulationResult,
      thresholdKw: thresholdKw,
      demandRatePerKwMonth: body.demandRatePerKwMonth,
    });

    // Downsample chart data to prevent frontend freezing
    const maxPoints = body.maxChartPoints ?? 2000;
    const sampleRate = loadProfile.intervals.length > maxPoints ? Math.ceil(loadProfile.intervals.length / maxPoints) : 1;
    
    const downsampledIntervals: Array<{ timestamp: string; kw: number }> = [];
    const downsampledAfterKw: number[] = [];
    const downsampledSocHistory: number[] = [];
    
    const newIntervalsKw = simulationResult.new_intervals_kw ?? simulationResult.final_load_profile?.intervals?.map(i => i.kw) ?? [];
    const socHistory = simulationResult.battery_soc_history ?? [];

    // Helper to safely convert timestamp to ISO string
    const toIsoString = (ts: Date | string): string => {
      if (ts instanceof Date) return ts.toISOString();
      if (typeof ts === 'string') return ts;
      return new Date(ts).toISOString();
    };

    // Always include first and last points, then sample evenly
    if (loadProfile.intervals.length > 0) {
      downsampledIntervals.push({
        timestamp: toIsoString(loadProfile.intervals[0].timestamp),
        kw: loadProfile.intervals[0].kw,
      });
      downsampledAfterKw.push(newIntervalsKw[0] ?? loadProfile.intervals[0].kw);
      downsampledSocHistory.push(socHistory[0] ?? 0);
    }

    for (let idx = sampleRate; idx < loadProfile.intervals.length - 1; idx += sampleRate) {
      downsampledIntervals.push({
        timestamp: toIsoString(loadProfile.intervals[idx].timestamp),
        kw: loadProfile.intervals[idx].kw,
      });
      downsampledAfterKw.push(newIntervalsKw[idx] ?? loadProfile.intervals[idx].kw);
      downsampledSocHistory.push(socHistory[idx] ?? 0);
    }

    // Always include last point
    if (loadProfile.intervals.length > 1) {
      const lastIdx = loadProfile.intervals.length - 1;
      downsampledIntervals.push({
        timestamp: toIsoString(loadProfile.intervals[lastIdx].timestamp),
        kw: loadProfile.intervals[lastIdx].kw,
      });
      downsampledAfterKw.push(newIntervalsKw[lastIdx] ?? loadProfile.intervals[lastIdx].kw);
      downsampledSocHistory.push(socHistory[lastIdx] ?? 0);
    }

    // Get full arrays for monthly calculations (but don't send to frontend - too large)
    const fullNewIntervalsKw = simulationResult.new_intervals_kw ?? simulationResult.final_load_profile?.intervals?.map(i => i.kw) ?? [];

    // Helper to safely convert timestamp to Date
    const toDate = (ts: Date | string): Date => {
      if (ts instanceof Date) return ts;
      return new Date(ts);
    };

    // Compute all additional analysis results (for Phase2ResultsPage)
    const peakPatterns = classifyPeakPatterns(peakEvents);
    const peakFrequency = analyzeEventFrequency(peakEvents);
    const usageOptimization = buildUsageOptimization(loadProfile, peakEvents, {
      thresholdKw: body.thresholdKw,
      demandRatePerKwMonth: body.demandRatePerKwMonth,
    });

    // Load catalog for sizing recommendations
    let catalogBatteries: ReturnType<typeof loadBatteryCatalog> = [];
    const libraryFile = path.join(process.cwd(), 'data', 'library', 'batteries.json');
    if (existsSync(libraryFile)) {
      try {
        const raw = await readFile(libraryFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) catalogBatteries = parsed as ReturnType<typeof loadBatteryCatalog>;
      } catch {
        // ignore
      }
    }
    if (catalogBatteries.length === 0) catalogBatteries = loadBatteryCatalog(CATALOG_FILE);
    const catalog: CatalogBattery[] = catalogBatteries.map((b) => ({
      modelName: b.modelName,
      manufacturer: b.manufacturer,
      capacityKwh: b.capacityKwh,
      powerKw: b.powerKw,
      efficiency: b.efficiency,
      warrantyYears: b.warrantyYears,
      price1_10: b.price1_10,
      price11_20: b.price11_20,
      price21_50: b.price21_50,
      price50Plus: b.price50Plus,
    }));

    const sizingRecommendation = recommendOptimalSizing({
      loadProfile,
      demandRatePerKwMonth: body.demandRatePerKwMonth ?? 15,
      catalog,
    });

    // Optional deterministic DR panel (single analysis)
    let demandResponsePanel: any = undefined;
    let demandResponsePanelV2: any = undefined;
    try {
      const dr = body.demandResponse as any;
      if (dr?.enabled) {
        demandResponsePanel = await computeDrPanel({
          loadIntervals: loadProfile.intervals,
          battery: {
            powerKw: Number(body.batterySpec.max_power_kw) || 0,
            energyKwh: Number(body.batterySpec.capacity_kwh) || 0,
            roundTripEfficiency: Number(body.batterySpec.round_trip_efficiency) || 0.9,
          },
          rateCode: String(body.rateCode || '').trim() || undefined,
          demandResponse: {
            enabled: true,
            capacityPaymentPerKwMonth: Number(dr.capacityPaymentPerKwMonth ?? 10),
            paymentUnit: (dr.paymentUnit as any) ?? 'per_kw_event',
            eventPayment: Number(dr.eventPayment ?? dr.eventPaymentPerKw ?? 1.0),
            estimatedEventsPerYear: Number(dr.estimatedEventsPerYear ?? 12),
            minimumCommitmentKw: Number(dr.minimumCommitmentKw ?? 50),
            everwattFeePerKwYear: Number(dr.everwattFeePerKwYear ?? 30),
            everwattFeePct: Number(dr.everwattFeePct ?? 0.2),
          },
        });
        if (demandResponsePanel) {
          demandResponsePanelV2 = toDrPanelV2({
            enabled: true,
            detectedRateCode: String(body.rateCode || '').trim() || undefined,
            tariffTerritory: 'PGE',
            intervals: loadProfile.intervals as any,
            method: 'top_n_hottest_days',
            topNHottestDays: 10,
            firmPercentile: 20,
            socCarryInPolicy: 'fixed_50pct',
            noExport: true,
            performanceFactor: 0.85,
            eventWindow: { startHour: 16, endHour: 21, weekdaysOnly: true, months: [6, 7, 8, 9], timezone: 'America/Los_Angeles' },
            panelV1: demandResponsePanel,
          });
        }
      }
    } catch (e) {
      console.warn('DR panel compute failed (single):', e);
    }

    // ============================
    // Tariff Engine (billing-cycle correct)
    // ============================
    const tariffEngine = (() => {
      // Require usage data (billing periods) to produce billing-correct savings
      const usageRows = Array.isArray(body.usageData) ? (body.usageData as any[]) : [];
      if (usageRows.length === 0) {
        return {
          success: false,
          error: 'Tariff analysis requires usage data with billing periods.',
        };
      }

      // Build billing periods from usage rows
      const accountId = String((body.customerInfo as any)?.accountNumber || (body.customerInfo as any)?.saId || 'site');
      const periods = usageRows
        .map((r) => {
          const billEnd = r.billEndDate ?? r.date ?? r.bill_end_date ?? r.billEnd;
          const billStart = r.billStartDate ?? r.bill_start_date ?? r.billStart;
          const billEndDate = new Date(billEnd);
          const billStartDate = billStart ? new Date(billStart) : null;
          const cycleId = `${accountId}:${billEndDate.toISOString().slice(0, 10)}`;
          return {
            cycleId,
            accountId,
            billStartDate: billStartDate ?? new Date(billEndDate.getTime() - Math.max(1, Number(r.billingDays || 30)) * 24 * 60 * 60 * 1000),
            billEndDate,
            rateCode: r.rateCode ? String(r.rateCode) : undefined,
            statedTotalBill: typeof r.totalCost === 'number' ? r.totalCost : typeof r.totalBillAmount === 'number' ? r.totalBillAmount : undefined,
          };
        })
        .filter((p) => Number.isFinite(p.billEndDate.getTime()) && Number.isFinite(p.billStartDate.getTime()));

      const parsedPeriods = periods
        .map((p) => BillingPeriodSchema.safeParse(p))
        .filter((x) => x.success)
        .map((x) => (x as any).data);

      if (parsedPeriods.length === 0) {
        return { success: false, error: 'No valid billing periods found in usage data.' };
      }

      // Normalize interval rows
      const intervalRows = body.intervals
        .map((i) => IntervalRowSchema.safeParse({ timestamp: i.timestamp, kw: Number(i.kw) || 0 }))
        .filter((x) => x.success)
        .map((x) => (x as any).data);

      const afterRows = intervalRows.map((i, idx) => ({
        timestamp: i.timestamp,
        kw: Number(fullNewIntervalsKw[idx] ?? i.kw),
      }));

      const beforeAssign = assignIntervalsToBillingCycles({ intervals: intervalRows, billingPeriods: parsedPeriods });
      const afterAssign = assignIntervalsToBillingCycles({ intervals: afterRows, billingPeriods: parsedPeriods });

      const joinQa = {
        before: beforeAssign.qa,
        after: afterAssign.qa,
      };

      if (beforeAssign.qa.unassignedIntervals > 0 || afterAssign.qa.unassignedIntervals > 0) {
        return {
          success: false,
          error: 'Some intervals could not be assigned to a billing cycle.',
          joinQa,
        };
      }

      // Tariff identification (deterministic v1)
      const detection = identifyTariff({
        usagePeriods: parsedPeriods,
        fallbackRateCode: String(body.rateCode || '').trim() || undefined,
        utility: 'PGE',
        demandRatePerKwMonth: demandRate,
        timezone: 'America/Los_Angeles',
      });
      if (!detection.tariff) {
        return {
          success: false,
          error: 'Unable to identify tariff (missing rate code).',
          detectedTariff: detection.detectedTariff,
          joinQa,
        };
      }
      const tariff = detection.tariff;

      const baselinePeakKw = Math.max(...intervalRows.map((r) => r.kw));

      // Scenario generation (bounded)
      const caps = generateCandidateCapsKw({ baselinePeakKw, tariff });

      const evalScenario = (capKw: number) => {
        const sim = simulatePeakShaving(loadProfile, body.batterySpec!, capKw);
        const afterKwArr = sim.new_intervals_kw ?? sim.final_load_profile?.intervals?.map((x: any) => x.kw) ?? [];
        const afterRows2 = intervalRows.map((i, idx) => ({ timestamp: i.timestamp, kw: Number(afterKwArr[idx] ?? i.kw) }));
        const afterAssign2 = assignIntervalsToBillingCycles({ intervals: afterRows2, billingPeriods: parsedPeriods });
        if (afterAssign2.qa.unassignedIntervals > 0) return null;

        const baselineBills = calculateBillsPerCycle({
          tariff,
          billingPeriods: parsedPeriods,
          assignedBefore: beforeAssign.assigned,
          assignedAfter: beforeAssign.assigned,
        });
        const afterBills = calculateBillsPerCycle({
          tariff,
          billingPeriods: parsedPeriods,
          assignedBefore: beforeAssign.assigned,
          assignedAfter: afterAssign2.assigned,
        });

        const totalBefore = baselineBills.cycles.reduce((s, c) => s + c.total, 0);
        const totalAfter = afterBills.cycles.reduce((s, c) => s + c.total, 0);
        const annualSavings = totalBefore - totalAfter;
        // NPV proxy (10yr, 5%) for selection (systemCost provided by batteryMeta when present)
        const systemCost = typeof (body.batteryMeta as any)?.systemCost === 'number' ? Number((body.batteryMeta as any).systemCost) : 0;
        let npv10 = -systemCost;
        for (let year = 1; year <= 10; year++) {
          const degradation = Math.pow(0.98, year);
          const yearSavings = annualSavings * degradation;
          npv10 += yearSavings / Math.pow(1 + 0.05, year);
        }
        const paybackYears = annualSavings > 0 ? systemCost / annualSavings : Infinity;
        return {
          capKw,
          annualSavings,
          npv10,
          paybackYears,
          simulation: sim,
          afterBills,
          baselineBills,
        };
      };

      // Always include the actual threshold used, plus bounded candidate caps
      const capsToEval = Array.from(new Set([thresholdKw, ...caps])).filter((x) => Number.isFinite(x) && x > 0);
      const scenarios = capsToEval.map(evalScenario).filter(Boolean) as any[];
      scenarios.sort((a, b) => b.npv10 - a.npv10);
      const top3 = scenarios.slice(0, 3);
      const chosen = top3[0] || null;

      const baselineBills = chosen?.baselineBills || calculateBillsPerCycle({
        tariff,
        billingPeriods: parsedPeriods,
        assignedBefore: beforeAssign.assigned,
        assignedAfter: beforeAssign.assigned,
      });
      const afterBills = chosen?.afterBills || calculateBillsPerCycle({
        tariff,
        billingPeriods: parsedPeriods,
        assignedBefore: beforeAssign.assigned,
        assignedAfter: afterAssign.assigned,
      });

      const baselineById = new Map(baselineBills.cycles.map((c) => [c.cycleId, c]));
      const mergedCycles = afterBills.cycles.map((c) => {
        const b = baselineById.get(c.cycleId);
        const baselineTotal = b?.total ?? 0;
        return {
          ...c,
          baselineTotal,
          savings: baselineTotal - c.total,
        };
      });
      const totalBefore = baselineBills.cycles.reduce((s, c) => s + c.total, 0);
      const totalAfter = afterBills.cycles.reduce((s, c) => s + c.total, 0);

      const intervalsByCycle: Record<string, any[]> = {};
      for (const r of beforeAssign.assigned) {
        (intervalsByCycle[r.cycleId] ||= []).push(r);
      }
      const billingCycleAnalysis = buildBillingCycleAnalyses({
        billingPeriods: parsedPeriods,
        usageRateCode: detection.detectedTariff.rateCode,
        tariff,
        joinQa: beforeAssign.qa,
        intervalsByCycle,
        selectedCapKw: chosen?.capKw,
      });

      return {
        success: true,
        detectedTariff: detection.detectedTariff,
        joinQa,
        billingCycleAnalysis,
        cycles: mergedCycles,
        scenarios: top3.map((s) => ({
          capKw: s.capKw,
          annualSavings: s.annualSavings,
          npv10: s.npv10,
          paybackYears: s.paybackYears,
          why: [
            `Evaluated using true bill delta per billing cycle (demand determinant only in v1).`,
          ],
        })),
        selectedScenario: chosen
          ? { capKw: chosen.capKw, annualSavings: chosen.annualSavings, npv10: chosen.npv10, paybackYears: chosen.paybackYears }
          : null,
        totals: {
          totalBefore,
          totalAfter,
          totalSavings: totalBefore - totalAfter,
          cyclesCount: mergedCycles.length,
        },
        missingComponentsNotes: afterBills.summary.missingComponentsNotes,
      };
    })();

    // Hard constraint: block optimization if tariff analysis fails
    if (!tariffEngine.success) {
      return c.json({ success: false, error: (tariffEngine as any).error || 'Tariff analysis failed', tariffEngine }, 400);
    }

    const responseBody = {
      success: true,
      diagnostic,
      peakEvents,
      peakPatterns,
      peakFrequency,
      usageOptimization,
      sizingRecommendation,
      demandResponse: demandResponsePanelV2,
      demandResponseLegacy: demandResponsePanel,
      tariffEngine,
      simulationResult: {
        original_peak: simulationResult.original_peak,
        new_peak: simulationResult.new_peak,
        savings_kwh: simulationResult.savings_kwh,
        energy_discharged: simulationResult.energy_discharged,
        energy_charged: simulationResult.energy_charged,
        // Only send downsampled data for charts (prevents frontend freezing)
        chartData: {
          intervals: downsampledIntervals,
          afterKw: downsampledAfterKw,
          socHistory: downsampledSocHistory,
        },
        // Send monthly peak reduction summary (pre-computed on backend)
        monthlyPeakReduction: (() => {
          const monthlyPeaksBefore = new Map<string, number>();
          const monthlyPeaksAfter = new Map<string, number>();
          for (let idx = 0; idx < loadProfile.intervals.length; idx++) {
            const d = toDate(loadProfile.intervals[idx].timestamp);
            const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyPeaksBefore.set(mk, Math.max(monthlyPeaksBefore.get(mk) || 0, loadProfile.intervals[idx].kw));
            monthlyPeaksAfter.set(mk, Math.max(monthlyPeaksAfter.get(mk) || 0, fullNewIntervalsKw[idx] ?? loadProfile.intervals[idx].kw));
          }
          let reductionKwMonthSum = 0;
          for (const [month, before] of monthlyPeaksBefore.entries()) {
            const after = monthlyPeaksAfter.get(month) ?? before;
            reductionKwMonthSum += Math.max(0, before - after);
          }
          return {
            reductionKwMonthSum,
            monthsCount: monthlyPeaksBefore.size,
          };
        })(),
      },
      thresholdKw, // include actual threshold used
    };

    // Persist snapshot if requested
    if (typeof body.analysisId === 'string' && body.analysisId.trim()) {
      const analysisId = body.analysisId.trim();
      const intervalHash = sha256OfJson(body.intervals);
      const usageHash = body.usageData ? sha256OfJson(body.usageData) : null;
      const manifest = {
        kind: 'battery-analysis',
        apiVersion: 'battery-analysis-v1',
        analysisId,
        runId: randomUUID(),
        createdAt: new Date().toISOString(),
        userId,
        mode: 'single',
        intervalSha256: intervalHash,
        usageSha256: usageHash,
        rateCode: String(body.rateCode || '').trim() || null,
        demandRatePerKwMonth: demandRate,
        thresholdKw,
        batterySpec: body.batterySpec,
        batteryMeta: body.batteryMeta ?? null,
        catalogSha256: catalogHash,
        gitCommit: process.env.GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || null,
        nodeVersion: process.version,
      } as Record<string, unknown>;

      const inputs = {
        analysisId,
        analysisMode,
        rateCode: body.rateCode,
        demandRatePerKwMonth: body.demandRatePerKwMonth,
        maxChartPoints: body.maxChartPoints ?? 2000,
        thresholdKw: body.thresholdKw,
        demandResponse: body.demandResponse,
        customerInfo: body.customerInfo,
        usageData: body.usageData,
        intervals: body.intervals,
        batterySpec: body.batterySpec,
        batteryMeta: body.batteryMeta,
      };

      const result = {
        apiVersion: 'battery-analysis-v1',
        analysisId,
        runId: manifest.runId,
        createdAt: manifest.createdAt,
        customerInfo: body.customerInfo ?? null,
        usageData: body.usageData ?? null,
        batteryMeta: body.batteryMeta ?? null,
        result: responseBody,
      };

      await persistBatteryAnalysisRun({ analysisId, userId, inputs, result, manifest });
    }

    return c.json(responseBody);
  } catch (error) {
    console.error('Analysis error:', error);
    return c.json({ success: false, error: 'Failed to compute analysis' }, 500);
  }
});

/**
 * POST /api/training/calculate-energy-savings
 * Calculate energy savings for training module (backend computation)
 */
app.post('/api/training/calculate-energy-savings', async (c) => {
  try {
    const body = await c.req.json() as {
      baselineKwh: number;
      improvedKwh: number;
      ratePerKwh: number;
      saveToDatabase?: boolean;
      name?: string;
    };
    const savedKwh = Math.max(0, body.baselineKwh - body.improvedKwh);
    const savedPct = body.baselineKwh > 0 ? (savedKwh / body.baselineKwh) * 100 : 0;
    const savedCost = savedKwh * body.ratePerKwh;
    const result = {
      savedKwh,
      savedPct,
      savedCost,
      baselineKwh: body.baselineKwh,
      improvedKwh: body.improvedKwh,
      ratePerKwh: body.ratePerKwh,
    };

    // Save to database if requested
    let calculationId: string | undefined;
    if (body.saveToDatabase) {
      const userId = getCurrentUserId(c);
      if (isDatabaseEnabled()) {
        const { createCalculation } = await import('./services/db-service');
        calculationId = await createCalculation(
          userId,
          'energy-savings',
          { inputs: body, result },
          body.name || `Energy Savings - ${new Date().toLocaleDateString()}`
        );
      }
    }

    return c.json({
      success: true,
      result,
      calculationId,
    });
  } catch (error) {
    console.error('Energy savings calculation error:', error);
    return c.json({ success: false, error: 'Failed to calculate energy savings' }, 500);
  }
});

/**
 * POST /api/training/calculate-hvac-optimization
 * Calculate HVAC optimization savings for training module (backend computation)
 */
app.post('/api/training/calculate-hvac-optimization', async (c) => {
  try {
    const body = await c.req.json() as {
      baselineAnnualKwh: number;
      ratePerKwh: number;
      savingsPercent: number;
      projectCost: number;
      saveToDatabase?: boolean;
      name?: string;
    };
    const savedKwh = body.baselineAnnualKwh * (Math.min(100, Math.max(0, body.savingsPercent)) / 100);
    const savedCost = savedKwh * body.ratePerKwh;
    const paybackYears = savedCost > 0 ? body.projectCost / savedCost : Infinity;
    const result = {
      savedKwh,
      savedCost,
      paybackYears: Number.isFinite(paybackYears) ? paybackYears : null,
    };

    // Save to database if requested
    let calculationId: string | undefined;
    if (body.saveToDatabase) {
      const userId = getCurrentUserId(c);
      if (isDatabaseEnabled()) {
        const { createCalculation } = await import('./services/db-service');
        calculationId = await createCalculation(
          userId,
          'hvac-optimization',
          { inputs: body, result },
          body.name || `HVAC Optimization - ${new Date().toLocaleDateString()}`
        );
      }
    }

    return c.json({
      success: true,
      result,
      calculationId,
    });
  } catch (error) {
    console.error('HVAC optimization calculation error:', error);
    return c.json({ success: false, error: 'Failed to calculate HVAC optimization' }, 500);
  }
});

/**
 * POST /api/training/calculate-roi
 * Calculate ROI/NPV/IRR for training module (backend computation)
 */
app.post('/api/training/calculate-roi', async (c) => {
  try {
    const body = await c.req.json() as {
      initialCost: number;
      annualSavings: number;
      years: number;
      discountRate: number;
      saveToDatabase?: boolean;
      name?: string;
    };
    const params: FinancialParameters = {
      discountRate: body.discountRate,
      analysisPeriod: body.years,
    };
    const yearlySavings = Array.from({ length: body.years }, () => body.annualSavings);
    const analysis = calculateFinancialAnalysis(body.initialCost, yearlySavings, params);

    // Save to database if requested
    let calculationId: string | undefined;
    if (body.saveToDatabase) {
      const userId = getCurrentUserId(c);
      if (isDatabaseEnabled()) {
        const { createCalculation } = await import('./services/db-service');
        calculationId = await createCalculation(
          userId,
          'roi',
          { inputs: body, analysis },
          body.name || `ROI Analysis - ${new Date().toLocaleDateString()}`
        );
      }
    }

    return c.json({
      success: true,
      analysis,
      calculationId,
    });
  } catch (error) {
    console.error('ROI calculation error:', error);
    return c.json({ success: false, error: 'Failed to calculate ROI' }, 500);
  }
});

/**
 * GET /api/calculations - List all saved calculations for the current user
 */
app.get('/api/calculations', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const calculationType = c.req.query('type') as string | undefined;
    
    if (isDatabaseEnabled()) {
      const { listCalculations } = await import('./services/db-service');
      const calculations = await listCalculations(userId, calculationType as any);
      return c.json({ success: true, calculations });
    } else {
      return c.json({ success: true, calculations: [] });
    }
  } catch (error) {
    console.error('List calculations error:', error);
    return c.json({ success: false, error: 'Failed to list calculations' }, 500);
  }
});

/**
 * GET /api/calculations/:id - Get a specific calculation by ID
 */
app.get('/api/calculations/:id', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const calculationId = c.req.param('id');
    
    if (isDatabaseEnabled()) {
      const { getCalculation } = await import('./services/db-service');
      const calculation = await getCalculation(userId, calculationId);
      if (!calculation) {
        return c.json({ success: false, error: 'Calculation not found' }, 404);
      }
      return c.json({ success: true, calculation });
    } else {
      return c.json({ success: false, error: 'Database not enabled' }, 404);
    }
  } catch (error) {
    console.error('Get calculation error:', error);
    return c.json({ success: false, error: 'Failed to get calculation' }, 500);
  }
});

/**
 * DELETE /api/calculations/:id - Delete a calculation
 */
app.delete('/api/calculations/:id', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const calculationId = c.req.param('id');
    
    if (isDatabaseEnabled()) {
      const { deleteCalculation } = await import('./services/db-service');
      await deleteCalculation(userId, calculationId);
      return c.json({ success: true });
    } else {
      return c.json({ success: false, error: 'Database not enabled' }, 400);
    }
  } catch (error) {
    console.error('Delete calculation error:', error);
    return c.json({ success: false, error: 'Failed to delete calculation' }, 500);
  }
});

/**
 * POST /api/batteries/peak-patterns
 * Returns peak events + pattern clustering for explainability.
 */
app.post('/api/batteries/peak-patterns', async (c) => {
  try {
    const body = await c.req.json() as {
      intervals: Array<{ timestamp: string; kw: number }>;
      thresholdKw: number;
    };
    if (!Array.isArray(body.intervals) || body.intervals.length === 0) {
      return c.json({ success: false, error: 'intervals are required' }, 400);
    }
    if (!Number.isFinite(body.thresholdKw)) return c.json({ success: false, error: 'thresholdKw is required' }, 400);
    const loadProfile: LoadProfile = {
      intervals: body.intervals.map((i) => ({ timestamp: new Date(i.timestamp), kw: Number(i.kw) || 0 })),
    };
    const events = detectPeakEvents(loadProfile, body.thresholdKw);
    const patterns = classifyPeakPatterns(events);
    const frequency = analyzeEventFrequency(events);
    return c.json({ success: true, events, patterns, frequency });
  } catch (error) {
    console.error('Peak pattern error:', error);
    return c.json({ success: false, error: 'Failed to compute peak patterns' }, 500);
  }
});

/**
 * POST /api/batteries/usage-optimization
 * Returns operational levers that increase storage effectiveness.
 */
app.post('/api/batteries/usage-optimization', async (c) => {
  try {
    const body = await c.req.json() as {
      intervals: Array<{ timestamp: string; kw: number }>;
      thresholdKw: number;
      demandRatePerKwMonth?: number;
    };
    if (!Array.isArray(body.intervals) || body.intervals.length === 0) {
      return c.json({ success: false, error: 'intervals are required' }, 400);
    }
    if (!Number.isFinite(body.thresholdKw)) return c.json({ success: false, error: 'thresholdKw is required' }, 400);
    const loadProfile: LoadProfile = {
      intervals: body.intervals.map((i) => ({ timestamp: new Date(i.timestamp), kw: Number(i.kw) || 0 })),
    };
    const events = detectPeakEvents(loadProfile, body.thresholdKw);
    const optimization = buildUsageOptimization(loadProfile, events, {
      thresholdKw: body.thresholdKw,
      demandRatePerKwMonth: body.demandRatePerKwMonth,
    });
    return c.json({ success: true, optimization, events });
  } catch (error) {
    console.error('Usage optimization error:', error);
    return c.json({ success: false, error: 'Failed to compute usage optimization' }, 500);
  }
});

/**
 * POST /api/batteries/optimal-sizing
 * Returns minimum + recommended sizing guidance. Uses catalog when available.
 */
app.post('/api/batteries/optimal-sizing', async (c) => {
  try {
    const body = await c.req.json() as {
      intervals: Array<{ timestamp: string; kw: number }>;
      demandRatePerKwMonth: number;
      targetReductionPercent?: number;
    };
    if (!Array.isArray(body.intervals) || body.intervals.length === 0) {
      return c.json({ success: false, error: 'intervals are required' }, 400);
    }
    const loadProfile: LoadProfile = {
      intervals: body.intervals.map((i) => ({ timestamp: new Date(i.timestamp), kw: Number(i.kw) || 0 })),
    };

    // Load catalog (persisted library preferred)
    let catalogBatteries: ReturnType<typeof loadBatteryCatalog> = [];
    const libraryFile = path.join(process.cwd(), 'data', 'library', 'batteries.json');
    if (existsSync(libraryFile)) {
      try {
        const raw = await readFile(libraryFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) catalogBatteries = parsed as ReturnType<typeof loadBatteryCatalog>;
      } catch {
        // ignore
      }
    }
    if (catalogBatteries.length === 0) catalogBatteries = loadBatteryCatalog(CATALOG_FILE);

    const catalog: CatalogBattery[] = catalogBatteries.map((b) => ({
      modelName: b.modelName,
      manufacturer: b.manufacturer,
      capacityKwh: b.capacityKwh,
      powerKw: b.powerKw,
      efficiency: b.efficiency,
      warrantyYears: b.warrantyYears,
      price1_10: b.price1_10,
      price11_20: b.price11_20,
      price21_50: b.price21_50,
      price50Plus: b.price50Plus,
    }));

    const sizing = recommendOptimalSizing({
      loadProfile,
      demandRatePerKwMonth: Number(body.demandRatePerKwMonth) || 0,
      catalog,
      targetReductionPercent: body.targetReductionPercent,
    });
    return c.json({ success: true, sizing });
  } catch (error) {
    console.error('Optimal sizing error:', error);
    return c.json({ success: false, error: 'Failed to compute optimal sizing' }, 500);
  }
});

/**
 * POST /api/batteries/s-rate-optimized
 * Runs the Option S-aware dispatch heuristic and returns schedule-aware demand charges.
 */
app.post('/api/batteries/s-rate-optimized', async (c) => {
  try {
    const body = await c.req.json() as {
      intervals: Array<{ timestamp: string; kw: number }>;
      batteryCapacityKwh: number;
      batteryPowerKw: number;
      roundTripEfficiency?: number;
      thresholdKw: number;
    };
    if (!Array.isArray(body.intervals) || body.intervals.length === 0) {
      return c.json({ success: false, error: 'intervals are required' }, 400);
    }
    if (!Number.isFinite(body.thresholdKw)) return c.json({ success: false, error: 'thresholdKw is required' }, 400);

    const intervals: Array<{ timestamp: Date; kw: number }> = body.intervals.map((i) => ({
      timestamp: new Date(i.timestamp),
      kw: Number(i.kw) || 0,
    }));

    const dispatch = await runOptionSDispatch({
      intervals,
      batteryCapacityKwh: Number(body.batteryCapacityKwh) || 0,
      batteryPowerKw: Number(body.batteryPowerKw) || 0,
      roundTripEfficiency: Number(body.roundTripEfficiency ?? 0.9) || 0.9,
      thresholdKw: Number(body.thresholdKw),
      rates: DEFAULT_OPTION_S_RATES_2025_SECONDARY,
      mode: 'auto',
    });
    const charges = calculateOptionSDemandCharges(dispatch.netLoadIntervals, DEFAULT_OPTION_S_RATES_2025_SECONDARY);
    return c.json({ success: true, engine: dispatch.engine, warnings: dispatch.warnings, solverStatus: dispatch.solverStatus, dispatch, charges });
  } catch (error) {
    console.error('S-Rate optimized error:', error);
    return c.json({ success: false, error: 'Failed to compute Option S dispatch' }, 500);
  }
});

/**
 * GET /api/batteries/catalog - Get battery catalog
 */
app.get('/api/batteries/catalog', async (c) => {
  try {
    // Prefer the persisted library (supports admin-added batteries)
    const libraryFile = path.join(process.cwd(), 'data', 'library', 'batteries.json');
    if (existsSync(libraryFile)) {
      try {
        const raw = await readFile(libraryFile, 'utf-8');
        const batteries = JSON.parse(raw);
        if (Array.isArray(batteries)) {
          return c.json({ success: true, batteries });
        }
      } catch (e) {
        console.warn('Failed to read persisted battery library, falling back to CSV:', e);
      }
    }

    // Fallback to CSV catalog (seed/source-of-truth when library file is absent)
    console.log(`Loading battery catalog from CSV: ${CATALOG_FILE}`);
    
    // Check if file exists
    if (!existsSync(CATALOG_FILE)) {
      console.error(`Battery catalog file not found at: ${CATALOG_FILE}`);
      return c.json(
        {
          success: false,
          error: 'Battery catalog file not found',
          message: `Expected file at: ${CATALOG_FILE}`,
          batteries: [],
        },
        404
      );
    }
    
    // Graceful handling if catalog file is missing or invalid
    let catalogBatteries: ReturnType<typeof loadBatteryCatalog> = [];
    try {
      catalogBatteries = loadBatteryCatalog(CATALOG_FILE);
      console.log(`Successfully loaded ${catalogBatteries.length} batteries from catalog`);
    } catch (err) {
      console.error('Battery catalog load failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return c.json(
        {
          success: false,
          error: 'Failed to parse battery catalog',
          message: errorMessage,
          batteries: [],
        },
        500
      );
    }
    
    if (catalogBatteries.length === 0) {
      console.warn('Battery catalog is empty after parsing');
      return c.json(
        {
          success: false,
          error: 'Battery catalog is empty',
          message: 'No active batteries found in catalog file',
          batteries: [],
        },
        200
      );
    }
    
    return c.json({
      success: true,
      batteries: catalogBatteries,
    });
  } catch (error) {
    console.error('Battery catalog error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to load battery catalog',
        message: error instanceof Error ? error.message : 'Unknown error',
        batteries: [],
      },
      500
    );
  }
});

/**
 * Analysis storage directory
 */
const ANALYSES_DIR = path.join(process.cwd(), 'data', 'analyses');
if (!existsSync(ANALYSES_DIR)) {
  mkdir(ANALYSES_DIR, { recursive: true }).catch(console.error);
}

// Persisted analysis run snapshots (battery): data/analyses/<analysisId>/{analysis_inputs.json,analysis_result.json,analysis_manifest.json}
// plus archived runs under: data/analyses/<analysisId>/runs/<runId>/...
const analysisSnapshotDir = (analysisId: string) => path.join(ANALYSES_DIR, analysisId);
const analysisRunsDir = (analysisId: string) => path.join(analysisSnapshotDir(analysisId), 'runs');

function sha256OfJson(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    return createHash('sha256').update(json).digest('hex');
  } catch {
    return createHash('sha256').update(String(value)).digest('hex');
  }
}

async function persistBatteryAnalysisRun(args: {
  analysisId: string;
  userId: string;
  inputs: unknown;
  result: unknown;
  manifest: Record<string, unknown>;
}) {
  const { analysisId, inputs, result, manifest } = args;
  const dir = analysisSnapshotDir(analysisId);
  const runsDir = analysisRunsDir(analysisId);
  const runId = String(manifest.runId || randomUUID());
  const runDir = path.join(runsDir, runId);

  await mkdir(runDir, { recursive: true });

  const latestInputs = path.join(dir, 'analysis_inputs.json');
  const latestResult = path.join(dir, 'analysis_result.json');
  const latestManifest = path.join(dir, 'analysis_manifest.json');

  // Keep a single previous snapshot for quick diffs
  const prevInputs = path.join(dir, 'analysis_inputs.prev.json');
  const prevResult = path.join(dir, 'analysis_result.prev.json');
  const prevManifest = path.join(dir, 'analysis_manifest.prev.json');

  try {
    if (existsSync(latestInputs)) await writeFile(prevInputs, await readFile(latestInputs, 'utf-8'));
    if (existsSync(latestResult)) await writeFile(prevResult, await readFile(latestResult, 'utf-8'));
    if (existsSync(latestManifest)) await writeFile(prevManifest, await readFile(latestManifest, 'utf-8'));
  } catch {
    // best-effort
  }

  // Write archived run snapshot
  await writeFile(path.join(runDir, 'analysis_inputs.json'), JSON.stringify(inputs, null, 2));
  await writeFile(path.join(runDir, 'analysis_result.json'), JSON.stringify(result, null, 2));
  await writeFile(path.join(runDir, 'analysis_manifest.json'), JSON.stringify(manifest, null, 2));

  // Write latest snapshot
  await mkdir(dir, { recursive: true });
  await writeFile(latestInputs, JSON.stringify(inputs, null, 2));
  await writeFile(latestResult, JSON.stringify(result, null, 2));
  await writeFile(latestManifest, JSON.stringify(manifest, null, 2));

  return { runId };
}

const PROJECTS_DIR = path.join(process.cwd(), 'data', 'projects');
if (!existsSync(PROJECTS_DIR)) {
  mkdir(PROJECTS_DIR, { recursive: true }).catch(console.error);
}

const CHANGE_ORDERS_DIR = path.join(process.cwd(), 'data', 'change-orders');
if (!existsSync(CHANGE_ORDERS_DIR)) {
  mkdir(CHANGE_ORDERS_DIR, { recursive: true }).catch(console.error);
}

/**
 * Get current user ID (placeholder - replace with actual auth)
 */
function getCurrentUserId(c: Context): string {
  // Prefer JWT user (normal auth)
  const jwtToken = getBearerTokenFromAuthHeader(c.req.header('Authorization'));
  const jwtUser = jwtToken ? verifyJwt(jwtToken) : null;
  if (jwtUser?.userId) return jwtUser.userId;

  // Also accept server-validated admin session when available
  const adminSession = getAdminSessionFromRequest(c);
  if (adminSession?.userId) return adminSession.userId;

  // Fallback for non-admin flows
  return c.req.header('x-user-id') || 'default-user';
}

/**
 * POST /api/analyses - Create new analysis
 * Saves all project data including interval data, usage data, battery selection, and results
 */
app.post('/api/analyses', async (c) => {
  try {
    const body = await c.req.json();

    const userId = getCurrentUserId(c);
    const analysisId = randomUUID();
    const now = new Date().toISOString();

    // Save ALL data from the request body, not just customerInfo and status
    const analysis = {
      id: analysisId,
      userId,
      createdAt: now,
      updatedAt: now,
      // Core info
      customerInfo: body.customerInfo,
      status: body.status || 'draft',
      // Additional project data
      cefoProject: body.cefoProject,
      cefoLoanAmount: body.cefoLoanAmount,
      // Processed data
      intervalData: body.intervalData,
      usageData: body.usageData,
      // Battery selection
      selectedBattery: body.selectedBattery,
      // Analysis results
      calculationResult: body.calculationResult,
    };
    if (isDatabaseEnabled()) {
      const { createAnalysis, createCalculation } = await import('./services/db-service');
      await createAnalysis(userId, analysis, analysisId);
      
      // Also save as a calculation record for unified retrieval
      const calculationType = body.analysisMode === 'multi-tier' ? 'multi-tier-analysis' : 'battery-analysis';
      const customerInfo = body.customerInfo as Record<string, unknown> | undefined;
      const projectName = customerInfo?.companyName || customerInfo?.siteLocation || 'Untitled Battery Analysis';
      await createCalculation(
        userId,
        calculationType,
        {
          analysisId,
          ...analysis,
        },
        `${projectName} - ${new Date().toLocaleDateString()}`
      );
    } else {
      const filePath = path.join(ANALYSES_DIR, `${analysisId}.json`);
      await writeFile(filePath, JSON.stringify(analysis, null, 2));
    }

    console.log(`📁 Created analysis project: ${analysisId} (status: ${analysis.status})`);

    return c.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Create analysis error:', error);
    return c.json(
      {
        error: 'Failed to create analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/analyses/:id - Get analysis by ID
 */
app.get('/api/analyses/:id', async (c) => {
  try {
    const analysisId = c.req.param('id');
    const userId = getCurrentUserId(c);
    let analysis: Record<string, unknown> | null = null;

    if (isDatabaseEnabled()) {
      const { getAnalysis } = await import('./services/db-service');
      const record = await getAnalysis(userId, analysisId);
      analysis =
        record?.data && typeof record.data === 'object' && record.data !== null ? (record.data as Record<string, unknown>) : null;
      if (!analysis) return c.json({ error: 'Analysis not found' }, 404);
    } else {
      const filePath = path.join(ANALYSES_DIR, `${analysisId}.json`);

      if (!existsSync(filePath)) {
        return c.json({ error: 'Analysis not found' }, 404);
      }

      const analysisData = await readFile(filePath, 'utf-8');
      analysis = JSON.parse(analysisData) as Record<string, unknown>;

      // Verify ownership
      const owner = typeof analysis.userId === 'string' ? analysis.userId : '';
      if (owner && owner !== userId) {
        return c.json({ error: 'Unauthorized' }, 403);
      }
    }

    // Normalize legacy shapes to match frontend expectations
    const normalized = { ...analysis } as any;

    // Interval data: older saves stored { intervals, statistics, peakKw }
    if (normalized.intervalData && Array.isArray(normalized.intervalData.intervals)) {
      normalized.intervalStats = normalized.intervalData.statistics || normalized.intervalStats;
      normalized.calculationResult = normalized.calculationResult || {};
      // Provide a threshold fallback if not already set
      if (!normalized.calculationResult.threshold && normalized.intervalData.peakKw) {
        normalized.calculationResult.threshold = normalized.intervalData.peakKw * 0.9;
      }
      normalized.intervalData = normalized.intervalData.intervals;
    }

    // Usage data: older saves stored { monthlyBills: [...] }
    if (normalized.usageData && Array.isArray(normalized.usageData.monthlyBills)) {
      normalized.usageData = normalized.usageData.monthlyBills;
    }

    return c.json({
      success: true,
      analysis: normalized,
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    return c.json(
      {
        error: 'Failed to get analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * Battery analysis run snapshots (persisted by /api/batteries/analyze when analysisId is provided)
 */
app.get('/api/analyses/:id/battery-run/latest', async (c) => {
  try {
    const analysisId = c.req.param('id');
    const dir = analysisSnapshotDir(analysisId);
    const resultPath = path.join(dir, 'analysis_result.json');
    const manifestPath = path.join(dir, 'analysis_manifest.json');
    const inputsPath = path.join(dir, 'analysis_inputs.json');
    if (!existsSync(resultPath) || !existsSync(manifestPath)) {
      return c.json({ success: false, error: 'No persisted battery run found for this analysisId' }, 404);
    }
    const result = JSON.parse(await readFile(resultPath, 'utf-8'));
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
    const inputs = existsSync(inputsPath) ? JSON.parse(await readFile(inputsPath, 'utf-8')) : null;
    return c.json({ success: true, analysisId, manifest, inputs, result });
  } catch (e) {
    console.error('Battery run latest error:', e);
    return c.json({ success: false, error: 'Failed to load persisted battery run' }, 500);
  }
});

app.get('/api/analyses/:id/battery-run/previous', async (c) => {
  try {
    const analysisId = c.req.param('id');
    const dir = analysisSnapshotDir(analysisId);
    const resultPath = path.join(dir, 'analysis_result.prev.json');
    const manifestPath = path.join(dir, 'analysis_manifest.prev.json');
    const inputsPath = path.join(dir, 'analysis_inputs.prev.json');
    if (!existsSync(resultPath) || !existsSync(manifestPath)) {
      return c.json({ success: false, error: 'No previous persisted battery run found for this analysisId' }, 404);
    }
    const result = JSON.parse(await readFile(resultPath, 'utf-8'));
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
    const inputs = existsSync(inputsPath) ? JSON.parse(await readFile(inputsPath, 'utf-8')) : null;
    return c.json({ success: true, analysisId, manifest, inputs, result });
  } catch (e) {
    console.error('Battery run previous error:', e);
    return c.json({ success: false, error: 'Failed to load previous persisted battery run' }, 500);
  }
});

/**
 * PUT /api/analyses/:id - Update analysis
 */
app.put('/api/analyses/:id', async (c) => {
  try {
    const analysisId = c.req.param('id');
    const userId = getCurrentUserId(c);
    const body = await c.req.json();
    let updatedAnalysis: Record<string, unknown>;

    if (isDatabaseEnabled()) {
      const { updateAnalysis } = await import('./services/db-service');
      updatedAnalysis = await updateAnalysis(userId, analysisId, body);
    } else {
      const filePath = path.join(ANALYSES_DIR, `${analysisId}.json`);

      if (!existsSync(filePath)) {
        return c.json({ error: 'Analysis not found' }, 404);
      }

      const analysisData = await readFile(filePath, 'utf-8');
      const analysis = JSON.parse(analysisData) as Record<string, unknown>;

      // Verify ownership
      const owner = typeof analysis.userId === 'string' ? analysis.userId : '';
      if (owner && owner !== userId) {
        return c.json({ error: 'Unauthorized' }, 403);
      }

      // Update analysis
      updatedAnalysis = {
        ...analysis,
        ...(body && typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}),
        id: analysis.id,
        userId: analysis.userId,
        createdAt: analysis.createdAt,
        updatedAt: new Date().toISOString(),
      };

      await writeFile(filePath, JSON.stringify(updatedAnalysis, null, 2));
    }

    return c.json({
      success: true,
      analysis: updatedAnalysis,
    });
  } catch (error) {
    console.error('Update analysis error:', error);
    return c.json(
      {
        error: 'Failed to update analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/analyses - List analyses for current user
 */
app.get('/api/analyses', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const query = c.req.query();
    const status = query.status;

    if (isDatabaseEnabled()) {
      const { listAnalyses } = await import('./services/db-service');
      const analyses = await listAnalyses(userId, status);
      return c.json({ success: true, analyses });
    }

    if (!existsSync(ANALYSES_DIR)) {
      return c.json({
        success: true,
        analyses: [],
      });
    }

    const { readdir } = await import('fs/promises');
    const files = await readdir(ANALYSES_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const analyses = [];
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(ANALYSES_DIR, file);
        const fileData = await readFile(filePath, 'utf-8');
        const analysis = JSON.parse(fileData);

        // Filter by user
        if (analysis.userId !== userId) continue;

        // Filter by status if provided
        if (status && analysis.status !== status) continue;

        analyses.push({
          id: analysis.id,
          projectName: analysis.customerInfo?.projectName || 'Untitled',
          companyName: analysis.customerInfo?.companyName || '',
          facilityName: analysis.customerInfo?.facilityName || '',
          createdAt: analysis.createdAt,
          updatedAt: analysis.updatedAt,
          status: analysis.status,
          originalPeakKw: analysis.summary?.originalPeakKw,
          bestPeakReductionKw: analysis.summary?.bestPeakReductionKw,
          bestAnnualSavings: analysis.summary?.bestAnnualSavings,
        });
      } catch (err) {
        console.warn(`Error reading analysis file ${file}:`, err);
      }
    }

    // Sort by updated date (newest first)
    analyses.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return c.json({
      success: true,
      analyses,
    });
  } catch (error) {
    console.error('List analyses error:', error);
    return c.json(
      {
        error: 'Failed to list analyses',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/calculate/hvac - Calculate HVAC savings
 */
app.post('/api/calculate/hvac', async (c) => {
  try {
    const { calculateAggregateHVACSavings, calculateHVACSavings } = await import('./modules/hvac/calculations');
    const body = await c.req.json() as {
      systems: Array<{
        type: 'chiller' | 'boiler' | 'vrf';
        name: string;
        currentEfficiency: number;
        proposedEfficiency: number;
        capacity: number;
        operatingHours: number;
        energyCost: number;
      }>;
    };

    if (!body.systems || !Array.isArray(body.systems) || body.systems.length === 0) {
      return c.json({ error: 'systems array is required' }, 400);
    }

    // Calculate individual and aggregate results
    const individualResults = body.systems.map(system => ({
      system,
      result: calculateHVACSavings(system),
    }));

    const aggregateResult = calculateAggregateHVACSavings(body.systems);

    return c.json({
      success: true,
      individual: individualResults,
      aggregate: aggregateResult,
    });
  } catch (error) {
    console.error('HVAC calculation error:', error);
    return c.json(
      {
        error: 'Failed to calculate HVAC savings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/calculate/lighting - Calculate lighting savings
 */
app.post('/api/calculate/lighting', async (c) => {
  try {
    const { calculateAggregateLightingSavings, calculateLightingSavings } = await import('./modules/lighting/calculations');
    const body = await c.req.json() as {
      systems: Array<{
        type: 'retrofit' | 'controls';
        name: string;
        currentWattage: number;
        proposedWattage: number;
        fixtureCount: number;
        operatingHours: number;
        energyCost: number;
        controlsSavings?: number;
      }>;
    };

    if (!body.systems || !Array.isArray(body.systems) || body.systems.length === 0) {
      return c.json({ error: 'systems array is required' }, 400);
    }

    // Calculate individual and aggregate results
    const individualResults = body.systems.map(system => ({
      system,
      result: calculateLightingSavings(system),
    }));

    const aggregateResult = calculateAggregateLightingSavings(body.systems);

    return c.json({
      success: true,
      individual: individualResults,
      aggregate: aggregateResult,
    });
  } catch (error) {
    console.error('Lighting calculation error:', error);
    return c.json(
      {
        error: 'Failed to calculate lighting savings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/audits - Save a new audit
 */
app.post('/api/audits', async (c) => {
  try {
    const body = await c.req.json();
    const userId = getCurrentUserId(c);

    if (isDatabaseEnabled()) {
      const { createAudit } = await import('./services/db-service');
      const id = await createAudit(userId, {
        building: body.building,
        hvac: body.hvac || [],
        lighting: body.lighting || [],
      });

      return c.json({ success: true, id });
    }

    const { saveAudit } = await import('./utils/audit-storage');

    const id = await saveAudit({
      building: body.building,
      hvac: body.hvac || [],
      lighting: body.lighting || [],
    });

    return c.json({
      success: true,
      id,
    });
  } catch (error) {
    console.error('Save audit error:', error);
    return c.json(
      {
        error: 'Failed to save audit',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/audits - List all audits
 */
app.get('/api/audits', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    if (isDatabaseEnabled()) {
      const { listAudits } = await import('./services/db-service');
      const audits = await listAudits(userId);
      return c.json({ success: true, audits });
    }

    const { listAudits } = await import('./utils/audit-storage');
    const audits = await listAudits();

    return c.json({
      success: true,
      audits,
    });
  } catch (error) {
    console.error('List audits error:', error);
    return c.json(
      {
        error: 'Failed to list audits',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/audits/:id - Get audit by ID
 */
app.get('/api/audits/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const userId = getCurrentUserId(c);

    if (isDatabaseEnabled()) {
      const { getAudit } = await import('./services/db-service');
      const record = await getAudit(userId, id);
      if (!record) return c.json({ error: 'Audit not found' }, 404);
      return c.json({ success: true, audit: record.data });
    }

    const { loadAudit } = await import('./utils/audit-storage');

    const audit = await loadAudit(id);

    return c.json({
      success: true,
      audit,
    });
  } catch (error) {
    console.error('Load audit error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ error: 'Audit not found' }, 404);
    }
    return c.json(
      {
        error: 'Failed to load audit',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * PUT /api/audits/:id - Update audit
 */
app.put('/api/audits/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const userId = getCurrentUserId(c);

    if (isDatabaseEnabled()) {
      const { updateAudit } = await import('./services/db-service');
      await updateAudit(userId, id, body);
      return c.json({ success: true });
    }

    const { updateAudit } = await import('./utils/audit-storage');

    await updateAudit(id, body);

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Update audit error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ error: 'Audit not found' }, 404);
    }
    return c.json(
      {
        error: 'Failed to update audit',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * DELETE /api/audits/:id - Delete audit
 */
app.delete('/api/audits/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const userId = getCurrentUserId(c);

    if (isDatabaseEnabled()) {
      const { deleteAudit } = await import('./services/db-service');
      await deleteAudit(userId, id);
      return c.json({ success: true });
    }

    const { deleteAudit } = await import('./utils/audit-storage');

    await deleteAudit(id);

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete audit error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ error: 'Audit not found' }, 404);
    }
    return c.json(
      {
        error: 'Failed to delete audit',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/calculations - Save calculation result
 */
app.post('/api/calculations', async (c) => {
  try {
    const { saveCalculation } = await import('./utils/calculation-storage');
    const body = await c.req.json();

    if (!body.type || !body.data) {
      return c.json({ error: 'type and data are required' }, 400);
    }

    const id = await saveCalculation(body.type, body.data, body.auditId);

    return c.json({
      success: true,
      id,
    });
  } catch (error) {
    console.error('Save calculation error:', error);
    return c.json(
      {
        error: 'Failed to save calculation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/calculations - List calculations
 */
app.get('/api/calculations', async (c) => {
  try {
    const { listCalculations } = await import('./utils/calculation-storage');
    const query = c.req.query();
    
    const calculations = await listCalculations({
      type: query.type as any,
      auditId: query.auditId,
    });

    return c.json({
      success: true,
      calculations,
    });
  } catch (error) {
    console.error('List calculations error:', error);
    return c.json(
      {
        error: 'Failed to list calculations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/calculations/:id - Get calculation by ID
 */
app.get('/api/calculations/:id', async (c) => {
  try {
    const { loadCalculation } = await import('./utils/calculation-storage');
    const id = c.req.param('id');

    const calculation = await loadCalculation(id);

    return c.json({
      success: true,
      calculation,
    });
  } catch (error) {
    console.error('Load calculation error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ error: 'Calculation not found' }, 404);
    }
    return c.json(
      {
        error: 'Failed to load calculation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * ==========================================
 * LIBRARY MANAGEMENT API
 * Batteries and Utility Rates with Admin Support
 * ==========================================
 */

// Persistent storage for library items (JSON files for now; DB later)
const LIBRARY_DIR = path.join(process.cwd(), 'data', 'library');
const LIBRARY_BATTERIES_FILE = path.join(LIBRARY_DIR, 'batteries.json');
const LIBRARY_RATES_FILE = path.join(LIBRARY_DIR, 'rates.json');

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  if (!existsSync(filePath)) return null;
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to read JSON file ${filePath}:`, error);
    return null;
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// In-memory cache for library items
type LibraryBattery = Record<string, unknown>;
type LibraryRate = Record<string, unknown>;

const libraryStorage: {
  batteries: LibraryBattery[];
  rates: LibraryRate[];
  initialized: boolean;
} = {
  batteries: [],
  rates: [],
  initialized: false,
};

// Initialize library storage
async function initializeLibraryStorage() {
  if (libraryStorage.initialized) return;
  
  try {
    await mkdir(LIBRARY_DIR, { recursive: true });

    // 1) Batteries: load persistent library first
    const persistedBatteries = await readJsonIfExists<LibraryBattery[]>(LIBRARY_BATTERIES_FILE);
    if (Array.isArray(persistedBatteries) && persistedBatteries.length > 0) {
      libraryStorage.batteries = persistedBatteries;
      console.log(`Loaded ${libraryStorage.batteries.length} batteries from ${LIBRARY_BATTERIES_FILE}`);
    } else {
      // Seed (optional): use CSV catalog if present, then persist as the initial library
      const catalogPath = path.join(process.cwd(), 'data', 'battery-catalog.csv');
      if (existsSync(catalogPath)) {
        const batteries = loadBatteryCatalog(catalogPath);
        libraryStorage.batteries = batteries.map((b, idx) => ({
          id: `battery-${idx}`,
          ...b,
        }));
        await writeJson(LIBRARY_BATTERIES_FILE, libraryStorage.batteries);
        console.log(`Seeded ${libraryStorage.batteries.length} batteries from CSV → ${LIBRARY_BATTERIES_FILE}`);
      } else {
        libraryStorage.batteries = [];
        await writeJson(LIBRARY_BATTERIES_FILE, libraryStorage.batteries);
        console.log(`Initialized empty battery library at ${LIBRARY_BATTERIES_FILE}`);
      }
    }

    // 2) Rates: load persistent library first
    const persistedRates = await readJsonIfExists<LibraryRate[]>(LIBRARY_RATES_FILE);
    if (Array.isArray(persistedRates) && persistedRates.length > 0) {
      libraryStorage.rates = persistedRates;
      console.log(`Loaded ${libraryStorage.rates.length} rates from ${LIBRARY_RATES_FILE}`);
    } else {
      // Seed (optional): from in-repo default rate set (PG&E + baseline SCE/SDG&E + fallback)
      try {
        const { defaultRates } = await import('./utils/rates/rate-data');
        const defaults = Array.isArray(defaultRates) ? (defaultRates as unknown[]) : [];
        libraryStorage.rates = defaults.map((rate, idx) => {
          const r = rate && typeof rate === 'object' ? (rate as Record<string, unknown>) : {};
          return {
            ...r,
            id: (typeof r.id === 'string' && r.id) || `rate-${idx}`,
          };
        });
        await writeJson(LIBRARY_RATES_FILE, libraryStorage.rates);
        console.log(`Seeded ${libraryStorage.rates.length} default rates → ${LIBRARY_RATES_FILE}`);
      } catch (error) {
        console.error('Error seeding default rates:', error);
        libraryStorage.rates = [];
        await writeJson(LIBRARY_RATES_FILE, libraryStorage.rates);
      }
    }
    
    libraryStorage.initialized = true;
  } catch (error) {
    console.error('Error initializing library storage:', error);
  }
}

// Helper to check admin status (server-validated admin sessions)
function isAdmin(c: Context): boolean {
  // Admin session tokens
  if (requireRole(c, 'admin')) return true;

  // JWT role
  const jwtToken = getBearerTokenFromAuthHeader(c.req.header('Authorization'));
  const jwtUser = jwtToken ? verifyJwt(jwtToken) : null;
  return jwtUser?.role === 'admin';
}

// Generate AI description (can be enhanced with actual AI API)
function generateAIDescription(item: unknown, type: 'battery' | 'rate'): string {
  const o = (item && typeof item === 'object' ? (item as Record<string, unknown>) : {}) as Record<string, unknown>;
  if (type === 'battery') {
    const manufacturer = String(o.manufacturer || '');
    const modelName = String(o.modelName || '');
    const capacityKwh = Number(o.capacityKwh || 0);
    const powerKw = Number(o.powerKw || 0);
    const efficiency = Number(o.efficiency || 0);
    const warrantyYears = Number(o.warrantyYears || 0);

    const duration = powerKw > 0 ? (capacityKwh / powerKw).toFixed(1) : 'N/A';
    const cRate = capacityKwh > 0 ? (powerKw / capacityKwh).toFixed(2) : 'N/A';
    
    return `The ${manufacturer} ${modelName} is a ${capacityKwh} kWh / ${powerKw} kW battery storage system with ${(efficiency * 100).toFixed(0)}% round-trip efficiency. With a ${duration}-hour duration at full power and ${cRate}C discharge rate, this system is ideal for ${
      capacityKwh > 500
        ? 'large commercial and industrial applications requiring extended backup power and peak shaving'
        : capacityKwh > 100
          ? 'medium commercial facilities with significant demand charges'
          : 'small to medium commercial applications with moderate peak demand'
    }. The ${warrantyYears}-year warranty provides long-term reliability. Typical use cases include demand charge reduction, TOU arbitrage, and ${
      capacityKwh > 0 && powerKw / capacityKwh > 0.5 ? 'high-power applications requiring rapid discharge' : 'load shifting and backup power'
    }.`;
  } else {
    const description = typeof o.description === 'string' ? o.description : '';
    const rateCode = String(o.rateCode || o.name || '');
    const utility = String(o.utility || o.provider || 'utility');
    return description || `Utility rate ${rateCode} for ${utility} customers.`;
  }
}

// NOTE: Library storage initialization can be expensive (loads/seeds JSON libraries).
// Avoid doing this at module-import time so unit tests that import `app` don't
// eagerly load large datasets. When running the server normally, `bootstrap()`
// will warm this cache once; routes also lazily initialize as needed.

/**
 * GET /api/library/batteries - Get all batteries
 */
app.get('/api/library/batteries', async (c) => {
  try {
    await initializeLibraryStorage();
    return c.json({
      success: true,
      batteries: libraryStorage.batteries,
      count: libraryStorage.batteries.length,
    });
  } catch (error) {
    console.error('Get batteries error:', error);
    return c.json({ error: 'Failed to load batteries' }, 500);
  }
});

/**
 * GET /api/library/batteries/:id - Get specific battery
 */
app.get('/api/library/batteries/:id', async (c) => {
  try {
    await initializeLibraryStorage();
    const id = c.req.param('id');
    const battery = libraryStorage.batteries.find(b => b.id === id);
    
    if (!battery) {
      return c.json({ error: 'Battery not found' }, 404);
    }
    
    return c.json({
      success: true,
      battery: {
        ...battery,
        aiDescription: generateAIDescription(battery, 'battery'),
      },
    });
  } catch (error) {
    console.error('Get battery error:', error);
    return c.json({ error: 'Failed to load battery' }, 500);
  }
});

/**
 * POST /api/library/batteries - Add new battery (Admin only)
 */
app.post('/api/library/batteries', async (c) => {
  try {
    if (!isAdmin(c)) {
      return c.json({ error: 'Unauthorized - Admin access required' }, 403);
    }
    
    await initializeLibraryStorage();
    const body = await c.req.json();
    
    const newBattery = {
      id: `battery-${Date.now()}`,
      modelName: body.modelName,
      manufacturer: body.manufacturer,
      capacityKwh: parseFloat(body.capacityKwh) || 0,
      powerKw: parseFloat(body.powerKw) || 0,
      efficiency: parseFloat(body.efficiency) || 0.9,
      warrantyYears: parseFloat(body.warrantyYears) || 10,
      price1_10: parseFloat(body.price1_10) || 0,
      price11_20: parseFloat(body.price11_20) || body.price1_10 || 0,
      price21_50: parseFloat(body.price21_50) || body.price1_10 || 0,
      price50Plus: parseFloat(body.price50Plus) || body.price1_10 || 0,
      cRate: body.powerKw && body.capacityKwh ? (body.powerKw / body.capacityKwh) : 0,
      active: true,
    };
    
    libraryStorage.batteries.push(newBattery);
    await writeJson(LIBRARY_BATTERIES_FILE, libraryStorage.batteries);
    
    return c.json({
      success: true,
      battery: {
        ...newBattery,
        aiDescription: generateAIDescription(newBattery, 'battery'),
      },
    });
  } catch (error) {
    console.error('Add battery error:', error);
    return c.json({ error: 'Failed to add battery' }, 500);
  }
});

/**
 * PUT /api/library/batteries/:id - Update battery (Admin only)
 */
app.put('/api/library/batteries/:id', async (c) => {
  try {
    if (!isAdmin(c)) {
      return c.json({ error: 'Unauthorized - Admin access required' }, 403);
    }
    
    await initializeLibraryStorage();
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const index = libraryStorage.batteries.findIndex(b => b.id === id);
    if (index === -1) {
      return c.json({ error: 'Battery not found' }, 404);
    }
    
    libraryStorage.batteries[index] = {
      ...libraryStorage.batteries[index],
      ...body,
      id, // Preserve ID
    };
    await writeJson(LIBRARY_BATTERIES_FILE, libraryStorage.batteries);
    
    return c.json({
      success: true,
      battery: {
        ...libraryStorage.batteries[index],
        aiDescription: generateAIDescription(libraryStorage.batteries[index], 'battery'),
      },
    });
  } catch (error) {
    console.error('Update battery error:', error);
    return c.json({ error: 'Failed to update battery' }, 500);
  }
});

/**
 * DELETE /api/library/batteries/:id - Delete battery (Admin only)
 */
app.delete('/api/library/batteries/:id', async (c) => {
  try {
    if (!isAdmin(c)) {
      return c.json({ error: 'Unauthorized - Admin access required' }, 403);
    }
    
    await initializeLibraryStorage();
    const id = c.req.param('id');
    
    const index = libraryStorage.batteries.findIndex(b => b.id === id);
    if (index === -1) {
      return c.json({ error: 'Battery not found' }, 404);
    }
    
    libraryStorage.batteries.splice(index, 1);
    await writeJson(LIBRARY_BATTERIES_FILE, libraryStorage.batteries);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete battery error:', error);
    return c.json({ error: 'Failed to delete battery' }, 500);
  }
});

/**
 * GET /api/library/rates - Get all utility rates
 */
app.get('/api/library/rates', async (c) => {
  try {
    await initializeLibraryStorage();
    return c.json({
      success: true,
      rates: libraryStorage.rates,
      count: libraryStorage.rates.length,
    });
  } catch (error) {
    console.error('Get rates error:', error);
    return c.json({ error: 'Failed to load rates' }, 500);
  }
});

/**
 * POST /api/library/rates - Add new rate (Admin only)
 */
app.post('/api/library/rates', async (c) => {
  try {
    if (!isAdmin(c)) {
      return c.json({ error: 'Unauthorized - Admin access required' }, 403);
    }
    
    await initializeLibraryStorage();
    const body = await c.req.json();
    
    const newRate = {
      id: `rate-${Date.now()}`,
      name: body.name || body.rateName,
      rateName: body.name || body.rateName,
      provider: body.provider || body.utility,
      utility: body.provider || body.utility,
      rateCode: body.rateCode,
      rateType: body.rateType || 'TOU',
      description: body.description || '',
      demandCharge: parseFloat(body.demandCharge) || 0,
      peakRate: parseFloat(body.peakRate) || 0,
      offPeakRate: parseFloat(body.offPeakRate) || 0,
    };
    
    libraryStorage.rates.push(newRate);
    await writeJson(LIBRARY_RATES_FILE, libraryStorage.rates);
    
    return c.json({
      success: true,
      rate: {
        ...newRate,
        aiDescription: generateAIDescription(newRate, 'rate'),
      },
    });
  } catch (error) {
    console.error('Add rate error:', error);
    return c.json({ error: 'Failed to add rate' }, 500);
  }
});

/**
 * PUT /api/library/rates/:id - Update rate (Admin only)
 */
app.put('/api/library/rates/:id', async (c) => {
  try {
    if (!isAdmin(c)) {
      return c.json({ error: 'Unauthorized - Admin access required' }, 403);
    }
    
    await initializeLibraryStorage();
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const index = libraryStorage.rates.findIndex(r => r.id === id);
    if (index === -1) {
      return c.json({ error: 'Rate not found' }, 404);
    }
    
    libraryStorage.rates[index] = {
      ...libraryStorage.rates[index],
      ...body,
      id, // Preserve ID
    };
    await writeJson(LIBRARY_RATES_FILE, libraryStorage.rates);
    
    return c.json({
      success: true,
      rate: {
        ...libraryStorage.rates[index],
        aiDescription: generateAIDescription(libraryStorage.rates[index], 'rate'),
      },
    });
  } catch (error) {
    console.error('Update rate error:', error);
    return c.json({ error: 'Failed to update rate' }, 500);
  }
});

/**
 * DELETE /api/library/rates/:id - Delete rate (Admin only)
 */
app.delete('/api/library/rates/:id', async (c) => {
  try {
    if (!isAdmin(c)) {
      return c.json({ error: 'Unauthorized - Admin access required' }, 403);
    }
    
    await initializeLibraryStorage();
    const id = c.req.param('id');
    
    const index = libraryStorage.rates.findIndex(r => r.id === id);
    if (index === -1) {
      return c.json({ error: 'Rate not found' }, 404);
    }
    
    libraryStorage.rates.splice(index, 1);
    await writeJson(LIBRARY_RATES_FILE, libraryStorage.rates);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete rate error:', error);
    return c.json({ error: 'Failed to delete rate' }, 500);
  }
});

/**
 * POST /api/library/ai-description - Generate AI description
 */
app.post('/api/library/ai-description', async (c) => {
  try {
    const body = await c.req.json();
    const { item, type } = body;
    
    if (!item || !type) {
      return c.json({ error: 'Item and type are required' }, 400);
    }
    
    const description = generateAIDescription(item, type);
    
    return c.json({
      success: true,
      description,
    });
  } catch (error) {
    console.error('Generate AI description error:', error);
    return c.json({ error: 'Failed to generate description' }, 500);
  }
});

/**
 * ==========================================
 * HVAC OPTIMIZER API (Async)
 * ==========================================
 */
app.get('/api/hvac/demo-trends.csv', async (c) => {
  try {
    const demoPath = path.join(process.cwd(), 'data', 'hvac', 'demo_trends.csv');
    if (!existsSync(demoPath)) {
      return c.json({ success: false, error: 'Demo trends file not found. Run python scripts/generate_hvac_trend_csv.py' }, 404);
    }
    const csvText = await readFile(demoPath, 'utf-8');
    c.header('Content-Type', 'text/csv; charset=utf-8');
    return c.body(csvText);
  } catch (error) {
    console.error('Demo trends error:', error);
    return c.json({ success: false, error: 'Failed to load demo trends' }, 500);
  }
});

app.post('/api/hvac/analyze', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const body = await c.req.json();

    const projectId = String((body as any)?.projectId || '').trim();
    const trendFileKey = String((body as any)?.trendFileKey || '').trim();
    const timezone = String((body as any)?.timezone || 'UTC').trim() || 'UTC';
    const targetIntervalMinutes = Number((body as any)?.targetIntervalMinutes ?? 15);

    if (!projectId) return c.json({ success: false, error: 'projectId is required' }, 400);
    if (!trendFileKey) {
      return c.json(
        { success: false, error: 'trendFileKey is required (upload via /api/files/upload)' },
        400
      );
    }

    const systems = (body as any)?.systems;
    const pointMapping = (body as any)?.pointMapping;
    if (!Array.isArray(systems) || systems.length === 0) {
      return c.json({ success: false, error: 'systems are required' }, 400);
    }
    if (!pointMapping) return c.json({ success: false, error: 'pointMapping is required' }, 400);

    // Fetch the uploaded trend file under the current user
    const { getUserFile } = await import('./services/storage-service');
    const obj = await getUserFile({ userId, key: trendFileKey });
    if (!obj) return c.json({ success: false, error: 'Trend file not found for user' }, 404);

    // MVP: assume UTF-8 CSV (XLSX support can be added later)
    const csvText = obj.body.toString('utf-8');
    if (!csvText.trim()) return c.json({ success: false, error: 'Trend file is empty' }, 400);

    const { startHvacOptimizerRun } = await import('./modules/hvac/orchestrator');
    const {
      EquipmentSystemSchema,
      PointMappingSchema,
      HvacObjectiveSchema,
      HvacConstraintsSchema,
    } = await import('./modules/hvac/optimizer-contract');

    const started = await startHvacOptimizerRun({
      userId,
      projectId,
      timezone,
      targetIntervalMinutes,
      systems: systems.map((s: unknown) => EquipmentSystemSchema.parse(s)),
      pointMapping: PointMappingSchema.parse(pointMapping),
      objective: (body as any)?.objective ? HvacObjectiveSchema.parse((body as any).objective) : undefined,
      constraints: (body as any)?.constraints ? HvacConstraintsSchema.parse((body as any).constraints) : undefined,
      trend: { csvText, source: { kind: 'userFile', key: trendFileKey } },
      useCache: (body as any)?.useCache !== false,
    });

    return c.json({ success: true, ...started });
  } catch (error) {
    console.error('HVAC analyze error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to start HVAC analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

app.get('/api/hvac/runs', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const projectId = String(c.req.query('projectId') || '').trim() || undefined;
    const { listHvacRuns } = await import('./modules/hvac/run-storage');
    const runs = await listHvacRuns(userId, projectId);

    // Strip userId
    const clientRuns = runs.map(({ userId: _omit, ...rest }) => rest);
    return c.json({ success: true, runs: clientRuns });
  } catch (error) {
    console.error('List HVAC runs error:', error);
    return c.json({ success: false, error: 'Failed to list HVAC runs' }, 500);
  }
});

app.get('/api/hvac/runs/:id', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const runId = c.req.param('id');
    const { getHvacRun } = await import('./modules/hvac/run-storage');
    const run = await getHvacRun(userId, runId);
    if (!run) return c.json({ success: false, error: 'HVAC run not found' }, 404);
    const { userId: _omit, ...clientRun } = run;
    return c.json({ success: true, run: clientRun });
  } catch (error) {
    console.error('Get HVAC run error:', error);
    return c.json({ success: false, error: 'Failed to get HVAC run' }, 500);
  }
});

/**
 * ==========================================
 * PROJECTS + CHANGE ORDERS API
 * ==========================================
 */

app.post('/api/projects', async (c) => {
  const userId = getCurrentUserId(c);
  const body = await c.req.json().catch(() => ({}));
  const driveFolderLink = String((body as any)?.driveFolderLink || '').trim();
  const customer = (body as any)?.customer || {};

  if (!driveFolderLink) return c.json({ success: false, error: 'driveFolderLink is required' }, 400);
  if (!String(customer?.projectNumber || '').trim()) return c.json({ success: false, error: 'customer.projectNumber is required' }, 400);
  if (!String(customer?.companyName || '').trim()) return c.json({ success: false, error: 'customer.companyName is required' }, 400);

  const id = randomUUID();
  const now = new Date().toISOString();
  const project = {
    id,
    driveFolderLink,
    customer,
    createdAt: now,
    updatedAt: now,
    userId,
  };

  if (isDatabaseEnabled()) {
    const { createProject } = await import('./services/db-service');
    await createProject(userId, project, id);
  } else {
    const filePath = path.join(PROJECTS_DIR, `${id}.json`);
    await writeFile(filePath, JSON.stringify(project, null, 2));
  }

  // Strip userId before returning to client
  const { userId: _omit, ...clientProject } = project as any;
  return c.json({ success: true, project: clientProject });
});

app.get('/api/projects', async (c) => {
  const userId = getCurrentUserId(c);
  if (isDatabaseEnabled()) {
    const { listProjects } = await import('./services/db-service');
    const projects = await listProjects(userId);
    return c.json({ success: true, projects });
  }

  const files = await readdir(PROJECTS_DIR).catch(() => []);
  const projects: any[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const p = path.join(PROJECTS_DIR, f);
    const raw = await readFile(p, 'utf-8').catch(() => '');
    if (!raw) continue;
    const rec = JSON.parse(raw) as any;
    if (rec?.userId !== userId) continue;
    const { userId: _omit, ...clientProject } = rec;
    projects.push(clientProject);
  }
  projects.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  return c.json({ success: true, projects });
});

app.get('/api/projects/:id', async (c) => {
  const userId = getCurrentUserId(c);
  const id = c.req.param('id');
  if (isDatabaseEnabled()) {
    const { getProject } = await import('./services/db-service');
    const project = await getProject(userId, id);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    return c.json({ success: true, project });
  }

  const filePath = path.join(PROJECTS_DIR, `${id}.json`);
  if (!existsSync(filePath)) return c.json({ success: false, error: 'Project not found' }, 404);
  const rec = JSON.parse(await readFile(filePath, 'utf-8')) as any;
  if (rec?.userId !== userId) return c.json({ success: false, error: 'Project not found' }, 404);
  const { userId: _omit, ...clientProject } = rec;
  return c.json({ success: true, project: clientProject });
});

/**
 * ==========================================
 * READ-ONLY ANALYSIS RESULTS (Utility Intelligence + Battery Screening)
 * ==========================================
 *
 * Returns:
 * - Workflow outputs from `runUtilityWorkflow` (utility insights + battery screening + inbox suggestions)
 * - Utility summary report from `generateUtilitySummaryV1` (JSON + Markdown)
 *
 * Demo mode:
 * - `?demo=true` uses `samples/interval_peaky_office.json` as the interval input.
 */
app.get('/api/projects/:id/analysis-results-v1', async (c) => {
  const userId = getCurrentUserId(c);
  const projectId = c.req.param('id');
  const demo = String(c.req.query('demo') || '').trim().toLowerCase() === 'true';

  async function loadIntervalInputsFromFile(filePath: string): Promise<{
    intervalKwSeries: Array<{ timestampIso: string; kw: number }>;
    intervalPointsV1?: Array<{ timestampIso: string; intervalMinutes: number; kWh?: number; kW?: number; temperatureF?: number }>;
    warnings: string[];
  }> {
    const ext = path.extname(filePath).toLowerCase();
    const warnings: string[] = [];

    if (ext === '.json') {
      const raw = JSON.parse(await readFile(filePath, 'utf-8')) as any;
      const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.intervals) ? raw.intervals : [];
      const out: Array<{ timestampIso: string; kw: number }> = [];
      for (const r of arr) {
        const ts = String(r?.timestampIso ?? r?.timestamp ?? r?.ts ?? '').trim();
        const kw = typeof r?.kw === 'number' ? r.kw : Number(r?.kw);
        if (!ts || !Number.isFinite(kw)) continue;
        out.push({ timestampIso: ts, kw });
      }
      return { intervalKwSeries: out, warnings };
    }

    // Spreadsheet/CSV path
    if (ext === '.csv') {
      try {
        const csvText = await readFile(filePath, 'utf-8');
        const { detectPgeCsvTypeV1 } = await import('./modules/determinants/adapters/pge/detectPgeCsvType');
        const det = detectPgeCsvTypeV1(csvText);
        if (det.type === 'interval' && det.confidence >= 0.6) {
          const { parsePgeIntervalCsvV1 } = await import('./modules/determinants/adapters/pge/parsePgeIntervalCsv');
          const parsed = parsePgeIntervalCsvV1({ csvTextOrBuffer: csvText, timezoneHint: 'America/Los_Angeles' });
          warnings.push(...(parsed.warnings || []));
          const firstMeter = parsed.meters?.[0];
          const points = Array.isArray(firstMeter?.intervals) ? firstMeter.intervals : [];
          const intervalPointsV1 = points.map((p: any) => ({
            timestampIso: String(p?.timestampIso || '').trim(),
            intervalMinutes: Number(p?.intervalMinutes),
            ...(Number.isFinite(Number(p?.kWh)) ? { kWh: Number(p.kWh) } : {}),
            ...(Number.isFinite(Number(p?.kW)) ? { kW: Number(p.kW) } : {}),
            ...(Number.isFinite(Number(p?.temperatureF)) ? { temperatureF: Number(p.temperatureF) } : {}),
          }));
          const intervalKwSeries = intervalPointsV1
            .map((p) => ({ timestampIso: p.timestampIso, kw: Number((p as any).kW) }))
            .filter((p) => p.timestampIso && Number.isFinite(p.kw));
          return { intervalKwSeries, intervalPointsV1, warnings };
        }
      } catch (e) {
        warnings.push(`Interval CSV parse warning: ${String((e as any)?.message || e)}`);
      }
    }

    const rows = await readIntervalData(filePath);
    const out: Array<{ timestampIso: string; kw: number }> = [];
    for (const r of rows as any[]) {
      const ts = r?.timestamp ? new Date(r.timestamp).toISOString() : String(r?.timestampIso || '').trim();
      const kw = typeof r?.kw === 'number' ? r.kw : Number(r?.kw);
      if (!ts || !Number.isFinite(kw)) continue;
      out.push({ timestampIso: ts, kw });
    }
    return { intervalKwSeries: out, warnings };
  }

  try {
    const nowIso = new Date().toISOString();
    const runId = randomUUID();
    const idFactory = makeRequestScopedIdFactory({ prefix: 'analysis', runId });
    const suggestionIdFactory = makeRequestScopedIdFactory({ prefix: 'suggestion', runId });
    const inboxIdFactory = makeRequestScopedIdFactory({ prefix: 'inbox', runId });

    const project = demo ? null : await loadProjectInternal(userId, projectId);
    if (!demo && !project) return c.json({ success: false, error: 'Project not found' }, 404);

    // Load interval series:
    // - demo: `samples/interval_peaky_office.json`
    // - project: `project.telemetry.intervalFilePath` if present
    let intervalKwSeries: Array<{ timestampIso: string; kw: number }> | null = null;
    let intervalPointsV1:
      | Array<{ timestampIso: string; intervalMinutes: number; kWh?: number; kW?: number; temperatureF?: number }>
      | null = null;
    const intervalWarnings: string[] = [];
    if (demo) {
      const fp = path.join(DEFAULT_SAMPLES_DIR, 'interval_peaky_office.json');
      const loaded = await loadIntervalInputsFromFile(fp);
      intervalKwSeries = loaded.intervalKwSeries;
      intervalPointsV1 = loaded.intervalPointsV1 || null;
      intervalWarnings.push(...loaded.warnings);
    } else {
      // Prefer persisted interval intake v1 (parsed points + deterministic meta).
      const storedPts = (project as any)?.telemetry?.intervalElectricV1;
      const storedMeta = (project as any)?.telemetry?.intervalElectricMetaV1;
      if (Array.isArray(storedPts) && storedPts.length) {
        intervalPointsV1 = storedPts
          .map((p: any) => ({
            timestampIso: String(p?.timestampIso || '').trim(),
            intervalMinutes: Number(p?.intervalMinutes),
            ...(Number.isFinite(Number(p?.kWh)) ? { kWh: Number(p.kWh) } : {}),
            ...(Number.isFinite(Number(p?.kW)) ? { kW: Number(p.kW) } : {}),
            ...(Number.isFinite(Number(p?.temperatureF)) ? { temperatureF: Number(p.temperatureF) } : {}),
          }))
          .filter((p: any) => p.timestampIso && Number.isFinite(Number(p.intervalMinutes)) && Number(p.intervalMinutes) > 0);
        intervalKwSeries =
          intervalPointsV1
            ?.map((p: any) => {
              const kwExplicit = Number(p?.kW);
              const kWh = Number(p?.kWh);
              const mins = Number(p?.intervalMinutes);
              const kwDerived = !Number.isFinite(kwExplicit) && Number.isFinite(kWh) && Number.isFinite(mins) && mins > 0 ? kWh * (60 / mins) : NaN;
              const kw = Number.isFinite(kwExplicit) ? kwExplicit : kwDerived;
              return { timestampIso: String(p?.timestampIso || '').trim(), kw };
            })
            .filter((x: any) => x.timestampIso && Number.isFinite(Number(x.kw))) || null;

        if (storedMeta && typeof storedMeta === 'object') {
          const ws = (storedMeta as any)?.warnings;
          if (Array.isArray(ws) && ws.length) {
            for (const w of ws.slice(0, 12)) {
              const code = String((w as any)?.code || '').trim();
              if (code) intervalWarnings.push(`interval meta: ${code}`);
            }
          }
        }
      }

      const intervalFilePath = String((project as any)?.telemetry?.intervalFilePath || '').trim();
      if (!intervalKwSeries && intervalFilePath) {
        const abs = resolveAllowlistedPath(intervalFilePath, [DEFAULT_UPLOADS_DIR]);
        if (!abs) return c.json({ success: false, error: 'intervalFilePath rejected (outside uploads allowlist)' }, 400);
        const loaded = await loadIntervalInputsFromFile(abs);
        intervalKwSeries = loaded.intervalKwSeries;
        intervalPointsV1 = loaded.intervalPointsV1 || null;
        intervalWarnings.push(...loaded.warnings);
      }
    }
    if (intervalWarnings.length) {
      console.warn(`interval input warnings (${intervalWarnings.length}):`, intervalWarnings.slice(0, 6));
    }

    const { loadBatteryLibraryV1 } = await import('./modules/batteryLibrary/loadLibrary');
    const { runUtilityWorkflow } = await import('./modules/workflows/runUtilityWorkflow');
    const { generateUtilitySummaryV1 } = await import('./modules/reports/utilitySummary/v1/generateUtilitySummary');

    const libPath = path.join(process.cwd(), 'samples', 'battery_library_fixture.json');
    const lib = await loadBatteryLibraryV1(libPath);

    const customer = (project as any)?.customer || {};
    const telemetry = (project as any)?.telemetry || {};
    const territory =
      String((project as any)?.telemetry?.utilityTerritory || customer?.utilityCompany || (project as any)?.utilityTerritory || '').trim() ||
      (demo ? 'PGE' : '');
    const projectName = String(customer?.projectName || customer?.companyName || '').trim() || (demo ? 'Demo: Peaky Office' : '');
    const siteLocation = String(customer?.siteLocation || '').trim() || (demo ? 'Oakland, CA' : '');
    const billPdfText = String(telemetry?.billPdfText || '').trim();
    const tariffOverrideV1 = !demo ? ((project as any)?.tariffOverrideV1 ?? null) : null;
    const { resolveCurrentRateSelectionV1 } = await import('./modules/utilityIntelligence/currentRate/resolveCurrentRateSelectionV1');
    const resolvedRate = await resolveCurrentRateSelectionV1({
      demo,
      territory,
      customerRateCode: demo ? null : (customer?.rateCode ? String(customer.rateCode) : null),
      billPdfText: billPdfText || null,
      tariffOverrideV1,
    });

    const inputs: UtilityInputs = {
      orgId: userId,
      projectId,
      serviceType: 'electric',
      utilityTerritory: territory || undefined,
      currentRate: resolvedRate.currentRate,
      currentRateSelectionSource: resolvedRate.currentRateSelectionSource,
      customerType: customer?.customerType ? String(customer.customerType) : undefined,
      naicsCode: customer?.naicsCode ? String(customer.naicsCode) : undefined,
      // Keep address optional; many project records store a single string.
      ...(siteLocation
        ? { address: { line1: siteLocation, city: '', state: '', zip: '', country: 'US' } }
        : {}),
      ...(billPdfText ? { billPdfText } : {}),
      ...(tariffOverrideV1 ? { tariffOverrideV1 } : {}),
    };

    const workflow = await runUtilityWorkflow({
      inputs,
      meterId: String(c.req.query('meterId') || '').trim() || undefined,
      intervalKwSeries,
      intervalPointsV1,
      batteryLibrary: lib.library.items,
      nowIso,
      idFactory,
      suggestionIdFactory,
      inboxIdFactory,
    });

    const summary = generateUtilitySummaryV1({
      inputs,
      insights: workflow.utility.insights,
      utilityRecommendations: workflow.utility.recommendations,
      batteryGate: workflow.battery.gate,
      batterySelection: workflow.battery.selection,
      nowIso,
    });

    return c.json({
      success: true,
      demo,
      project: {
        id: projectId,
        name: projectName,
        siteLocation,
        territory,
        customer: customer || {},
      },
      workflow,
      summary,
    });
  } catch (error) {
    console.error('analysis-results-v1 error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate analysis results',
      },
      500
    );
  }
});

/**
 * ==========================================
 * ANALYSIS RESULTS v1 (PDF EXPORT)
 * ==========================================
 *
 * Generates a deterministic, server-side PDF using:
 * - `runUtilityWorkflow`
 * - `generateUtilitySummaryV1` (JSON + Markdown)
 * - `renderUtilitySummaryPdf` (PDF Buffer)
 *
 * Demo mode:
 * - `?demo=true` uses `samples/interval_peaky_office.json` as the interval input.
 */
app.get('/api/projects/:id/analysis-results-v1.pdf', async (c) => {
  const userId = getCurrentUserId(c);
  const projectId = c.req.param('id');
  const demo = String(c.req.query('demo') || '').trim().toLowerCase() === 'true';

  async function loadIntervalKwSeriesFromFile(filePath: string): Promise<Array<{ timestampIso: string; kw: number }>> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.json') {
      const raw = JSON.parse(await readFile(filePath, 'utf-8')) as any;
      const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.intervals) ? raw.intervals : [];
      const out: Array<{ timestampIso: string; kw: number }> = [];
      for (const r of arr) {
        const ts = String(r?.timestampIso ?? r?.timestamp ?? r?.ts ?? '').trim();
        const kw = typeof r?.kw === 'number' ? r.kw : Number(r?.kw);
        if (!ts || !Number.isFinite(kw)) continue;
        out.push({ timestampIso: ts, kw });
      }
      return out;
    }

    // Spreadsheet/CSV path
    const rows = await readIntervalData(filePath);
    const out: Array<{ timestampIso: string; kw: number }> = [];
    for (const r of rows as any[]) {
      const ts = r?.timestamp ? new Date(r.timestamp).toISOString() : String(r?.timestampIso || '').trim();
      const kw = typeof r?.kw === 'number' ? r.kw : Number(r?.kw);
      if (!ts || !Number.isFinite(kw)) continue;
      out.push({ timestampIso: ts, kw });
    }
    return out;
  }

  function safeFilenamePart(s: string): string {
    const cleaned = String(s || '')
      .trim()
      .replace(/[^\w\-]+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 80);
    return cleaned || 'project';
  }

  try {
    const nowIso = new Date().toISOString();
    const runId = randomUUID();
    const idFactory = makeRequestScopedIdFactory({ prefix: 'analysis', runId });
    const suggestionIdFactory = makeRequestScopedIdFactory({ prefix: 'suggestion', runId });
    const inboxIdFactory = makeRequestScopedIdFactory({ prefix: 'inbox', runId });

    const project = demo ? null : await loadProjectInternal(userId, projectId);
    if (!demo && !project) return c.json({ success: false, error: 'Project not found' }, 404);

    // Load interval series:
    // - demo: `samples/interval_peaky_office.json`
    // - project: `project.telemetry.intervalFilePath` if present
    let intervalKwSeries: Array<{ timestampIso: string; kw: number }> | null = null;
    if (demo) {
      const fp = path.join(DEFAULT_SAMPLES_DIR, 'interval_peaky_office.json');
      intervalKwSeries = await loadIntervalKwSeriesFromFile(fp);
    } else {
      const intervalFilePath = String((project as any)?.telemetry?.intervalFilePath || '').trim();
      if (intervalFilePath) {
        const abs = resolveAllowlistedPath(intervalFilePath, [DEFAULT_UPLOADS_DIR]);
        if (!abs) {
          return c.json({ success: false, error: 'intervalFilePath rejected (outside uploads allowlist)' }, 400);
        }
        intervalKwSeries = await loadIntervalKwSeriesFromFile(abs);
      }
    }

    const { loadBatteryLibraryV1 } = await import('./modules/batteryLibrary/loadLibrary');
    const { runUtilityWorkflow } = await import('./modules/workflows/runUtilityWorkflow');
    const { generateUtilitySummaryV1 } = await import('./modules/reports/utilitySummary/v1/generateUtilitySummary');
    const { renderUtilitySummaryPdf } = await import('./modules/reports/utilitySummary/v1/renderUtilitySummaryPdf');

    const libPath = path.join(process.cwd(), 'samples', 'battery_library_fixture.json');
    const lib = await loadBatteryLibraryV1(libPath);

    const customer = (project as any)?.customer || {};
    const telemetry = (project as any)?.telemetry || {};
    const territory =
      String((project as any)?.telemetry?.utilityTerritory || customer?.utilityCompany || (project as any)?.utilityTerritory || '').trim() ||
      (demo ? 'PGE' : '');
    const projectName = String(customer?.projectName || customer?.companyName || '').trim() || (demo ? 'Demo: Peaky Office' : '');
    const siteLocation = String(customer?.siteLocation || '').trim() || (demo ? 'Oakland, CA' : '');
    const billPdfText = String(telemetry?.billPdfText || '').trim();
    const tariffOverrideV1 = !demo ? ((project as any)?.tariffOverrideV1 ?? null) : null;
    const { resolveCurrentRateSelectionV1 } = await import('./modules/utilityIntelligence/currentRate/resolveCurrentRateSelectionV1');
    const resolvedRate = await resolveCurrentRateSelectionV1({
      demo,
      territory,
      customerRateCode: demo ? null : (customer?.rateCode ? String(customer.rateCode) : null),
      billPdfText: billPdfText || null,
      tariffOverrideV1,
    });

    const inputs: UtilityInputs = {
      orgId: userId,
      projectId,
      serviceType: 'electric',
      utilityTerritory: territory || undefined,
      currentRate: resolvedRate.currentRate,
      currentRateSelectionSource: resolvedRate.currentRateSelectionSource,
      customerType: customer?.customerType ? String(customer.customerType) : undefined,
      naicsCode: customer?.naicsCode ? String(customer.naicsCode) : undefined,
      // Keep address optional; many project records store a single string.
      ...(siteLocation ? { address: { line1: siteLocation, city: '', state: '', zip: '', country: 'US' } } : {}),
      ...(billPdfText ? { billPdfText } : {}),
      ...(tariffOverrideV1 ? { tariffOverrideV1 } : {}),
    };

    const workflow = await runUtilityWorkflow({
      inputs,
      meterId: String(c.req.query('meterId') || '').trim() || undefined,
      intervalKwSeries,
      batteryLibrary: lib.library.items,
      nowIso,
      idFactory,
      suggestionIdFactory,
      inboxIdFactory,
    });

    const summary = generateUtilitySummaryV1({
      inputs,
      insights: workflow.utility.insights,
      utilityRecommendations: workflow.utility.recommendations,
      batteryGate: workflow.battery.gate,
      batterySelection: workflow.battery.selection,
      nowIso,
    });

    const pdf = await renderUtilitySummaryPdf({
      project: { name: projectName || projectId, address: siteLocation || undefined, territory: territory || undefined },
      summaryMarkdown: summary.markdown,
      summaryJson: summary.json,
    });

    const filename = `EverWatt_AnalysisResultsV1_${safeFilenamePart(projectName || projectId)}.pdf`;
    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', `attachment; filename="${filename}"`);
    return c.body(new Uint8Array(pdf));
  } catch (error) {
    console.error('analysis-results-v1.pdf error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
      },
      500
    );
  }
});

app.put('/api/projects/:id', async (c) => {
  const userId = getCurrentUserId(c);
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const patch = (body as any)?.patch || body || {};
  const hasTariffOverridePatch = Object.prototype.hasOwnProperty.call(patch || {}, 'tariffOverrideV1');

  if (isDatabaseEnabled()) {
    const { getProject, updateProject } = await import('./services/db-service');
    const prev = await getProject(userId, id);
    if (!prev) return c.json({ success: false, error: 'Project not found' }, 404);

    let nextPatch = patch;
    if (hasTariffOverridePatch) {
      const { appendTariffOverrideAuditEventV1 } = await import('./modules/project/audit/tariffOverrideAuditV1');
      const prevOverride = (prev as any)?.tariffOverrideV1 ?? null;
      const nextOverride = (patch as any)?.tariffOverrideV1 ?? null;
      const auditEventsV1 = appendTariffOverrideAuditEventV1({
        existingEvents: (prev as any)?.auditEventsV1,
        previousOverride: prevOverride,
        newOverride: nextOverride,
      });
      nextPatch = { ...(patch as any), auditEventsV1 };
    }

    const project = await updateProject(userId, id, nextPatch);
    return c.json({ success: true, project });
  }

  const filePath = path.join(PROJECTS_DIR, `${id}.json`);
  if (!existsSync(filePath)) return c.json({ success: false, error: 'Project not found' }, 404);
  const rec = JSON.parse(await readFile(filePath, 'utf-8')) as any;
  if (rec?.userId !== userId) return c.json({ success: false, error: 'Project not found' }, 404);

  let auditEventsV1Next = (rec as any)?.auditEventsV1;
  if (hasTariffOverridePatch) {
    const { appendTariffOverrideAuditEventV1 } = await import('./modules/project/audit/tariffOverrideAuditV1');
    const prevOverride = (rec as any)?.tariffOverrideV1 ?? null;
    const nextOverride = (patch as any)?.tariffOverrideV1 ?? null;
    auditEventsV1Next = appendTariffOverrideAuditEventV1({
      existingEvents: (rec as any)?.auditEventsV1,
      previousOverride: prevOverride,
      newOverride: nextOverride,
    });
  }
  const merged = {
    ...rec,
    ...patch,
    id,
    customer: { ...(rec.customer || {}), ...(patch.customer || {}) },
    driveFolderLink: patch.driveFolderLink || rec.driveFolderLink,
    updatedAt: new Date().toISOString(),
    ...(hasTariffOverridePatch ? { auditEventsV1: auditEventsV1Next } : {}),
  };
  await writeFile(filePath, JSON.stringify(merged, null, 2));
  const { userId: _omit, ...clientProject } = merged;
  return c.json({ success: true, project: clientProject });
});

/**
 * ==========================================
 * PROJECT VAULT + PROJECT GRAPH (Project Builder)
 * ==========================================
 *
 * V1 focus:
 * - Upload PDFs / spreadsheets / images into a "Vault"
 * - Extract lightweight structure (sheet index, headers, summaries)
 * - Create searchable chunks with provenance for AI
 * - Maintain a Project Graph where every inferred item has provenance + confidence + needsConfirmation
 */

async function loadProjectInternal(userId: string, id: string): Promise<any | null> {
  if (isDatabaseEnabled()) {
    const { getProject } = await import('./services/db-service');
    return await getProject(userId, id);
  }
  const filePath = path.join(PROJECTS_DIR, `${id}.json`);
  if (!existsSync(filePath)) return null;
  const rec = JSON.parse(await readFile(filePath, 'utf-8')) as any;
  if (rec?.userId !== userId) return null;
  return rec;
}

async function persistProjectInternal(userId: string, id: string, patch: Record<string, unknown>): Promise<any> {
  if (isDatabaseEnabled()) {
    const { updateProject } = await import('./services/db-service');
    return await updateProject(userId, id, patch as any);
  }
  const filePath = path.join(PROJECTS_DIR, `${id}.json`);
  if (!existsSync(filePath)) throw new Error('Project not found');
  const rec = JSON.parse(await readFile(filePath, 'utf-8')) as any;
  if (rec?.userId !== userId) throw new Error('Project not found');
  const merged = {
    ...rec,
    ...patch,
    id,
    customer: { ...(rec.customer || {}), ...((patch as any).customer || {}) },
    driveFolderLink: (patch as any).driveFolderLink || rec.driveFolderLink,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(filePath, JSON.stringify(merged, null, 2));
  const { userId: _omit, ...clientProject } = merged;
  return clientProject;
}

function requireEditorAccessForAi(c: Context): { userId: string } {
  // Mirror /api/ai/chat: restrict to staff (JWT editor/admin OR admin-session editor/admin)
  let staffUserId: string | undefined;
  try {
    const jwtUser = requireJwtRole(c, 'editor');
    staffUserId = jwtUser.userId;
  } catch {
    // ignore
  }
  if (!staffUserId) {
    const session = getAdminSessionFromRequest(c);
    if (hasPermission(session, 'editor')) staffUserId = session?.userId;
  }
  if (!staffUserId) {
    throw new Error('Unauthorized');
  }
  return { userId: staffUserId };
}

app.get('/api/projects/:id/vault/files', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const id = c.req.param('id');
    const project = await loadProjectInternal(userId, id);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    const files = Array.isArray(project?.vault?.files) ? project.vault.files : [];
    return c.json({ success: true, files });
  } catch (error) {
    console.error('List vault files error:', error);
    return c.json({ success: false, error: 'Failed to list vault files' }, 500);
  }
});

app.get('/api/projects/:id/vault/files/:fileId/extracted', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const id = c.req.param('id');
    const fileId = c.req.param('fileId');
    const project = await loadProjectInternal(userId, id);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const files = Array.isArray(project?.vault?.files) ? project.vault.files : [];
    const file = files.find((f: any) => String(f?.id || '') === String(fileId || ''));
    if (!file) return c.json({ success: false, error: 'Vault file not found' }, 404);

    const extractedKey = (file as any)?.extracted?.storageKey as string | undefined;
    if (!extractedKey) return c.json({ success: false, error: 'No extracted.json available for this file' }, 404);

    const { getUserFile } = await import('./services/storage-service');
    const obj = await getUserFile({ userId, key: extractedKey });
    if (!obj) return c.json({ success: false, error: 'Extracted data not found' }, 404);

    const extracted = JSON.parse(obj.body.toString('utf-8'));
    return c.json({ success: true, fileId, extracted });
  } catch (error) {
    console.error('Get vault extracted error:', error);
    return c.json({ success: false, error: 'Failed to load extracted data' }, 500);
  }
});

app.get('/api/projects/:id/vault/files/:fileId/chunks', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const id = c.req.param('id');
    const fileId = c.req.param('fileId');
    const q = String(c.req.query('q') || '').trim();
    const topK = Number(c.req.query('topK') || 12);
    const pageFilter = c.req.query('page') ? Number(c.req.query('page')) : undefined;
    const sheetFilter = String(c.req.query('sheet') || '').trim() || undefined;

    const project = await loadProjectInternal(userId, id);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const files = Array.isArray(project?.vault?.files) ? project.vault.files : [];
    const file = files.find((f: any) => String(f?.id || '') === String(fileId || ''));
    if (!file) return c.json({ success: false, error: 'Vault file not found' }, 404);

    const chunksKey = (file as any)?.chunks?.storageKey as string | undefined;
    if (!chunksKey) return c.json({ success: false, error: 'No chunks.json available for this file' }, 404);

    const { getUserFile } = await import('./services/storage-service');
    const obj = await getUserFile({ userId, key: chunksKey });
    if (!obj) return c.json({ success: false, error: 'Chunks data not found' }, 404);

    const raw = JSON.parse(obj.body.toString('utf-8')) as any[];
    let chunks = Array.isArray(raw) ? raw : [];

    if (Number.isFinite(pageFilter as any)) {
      chunks = chunks.filter((c: any) => Number(c?.provenance?.page) === Number(pageFilter));
    }
    if (sheetFilter) {
      chunks = chunks.filter((c: any) => String(c?.provenance?.sheet || '').trim() === sheetFilter);
    }

    const normalized = chunks.map((c: any) => ({
      fileId,
      chunkIndex: Number(c?.chunkIndex || 0),
      text: String(c?.text || ''),
      provenance: c?.provenance || {},
    }));

    let results: any[] = [];
    if (q) {
      const { retrieveChunksKeyword } = await import('./services/project-vault-retrieval');
      results = retrieveChunksKeyword({ query: q, chunks: normalized, topK: Number.isFinite(topK) ? topK : 12 });
    } else {
      const n = Number.isFinite(topK) ? Math.max(1, Math.min(200, topK)) : 50;
      results = normalized.slice(0, n);
    }

    return c.json({ success: true, fileId, count: normalized.length, results });
  } catch (error) {
    console.error('Get vault chunks error:', error);
    return c.json({ success: false, error: 'Failed to load chunks' }, 500);
  }
});

app.post('/api/projects/:id/vault/upload', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const id = c.req.param('id');
    const project = await loadProjectInternal(userId, id);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const body = await c.req.parseBody();
    const file = (body as any)?.file as File | undefined;
    if (!file) return c.json({ success: false, error: 'file is required' }, 400);

    const originalName = file.name || 'upload.bin';
    const contentType = file.type || 'application/octet-stream';
    const buf = Buffer.from(await file.arrayBuffer());

    const { extractVaultDoc } = await import('./services/project-vault-extract');
    const extraction = await extractVaultDoc({ filename: originalName, contentType, buf });

    const fileId = randomUUID();
    const { buildUserFileKeyAtPath, putUserFileAtKey } = await import('./services/storage-service');

    const storageKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${id}/vault/${fileId}`,
      filename: originalName,
    });
    const stored = await putUserFileAtKey({ userId, key: storageKey, originalName, contentType, body: buf });

    // Persist extracted artifacts as separate objects (so project JSON stays small)
    const extractedKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${id}/vault/${fileId}`,
      filename: 'extracted.json',
    });
    const chunksKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${id}/vault/${fileId}`,
      filename: 'chunks.json',
    });

    await putUserFileAtKey({
      userId,
      key: extractedKey,
      originalName: 'extracted.json',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify({ ...extraction.extracted, kind: extraction.kind, tags: extraction.tags }, null, 2)),
    });
    await putUserFileAtKey({
      userId,
      key: chunksKey,
      originalName: 'chunks.json',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(extraction.chunks, null, 2)),
    });

    const now = new Date().toISOString();
    const fileRec = {
      id: fileId,
      filename: originalName,
      contentType,
      sizeBytes: buf.length,
      kind: extraction.kind,
      tags: extraction.tags,
      storageKey: stored.key,
      storageUrl: stored.url,
      uploadedAt: now,
      extracted: {
        storageKey: extractedKey,
        // small summary to render without downloading extracted.json
        summary: extraction.extracted,
      },
      chunks: {
        storageKey: chunksKey,
        count: extraction.chunks.length,
      },
    };

    const existing = Array.isArray(project?.vault?.files) ? project.vault.files : [];
    const nextVault = { ...(project.vault || {}), files: [...existing, fileRec] };
    const updated = await persistProjectInternal(userId, id, { vault: nextVault });

    return c.json({ success: true, file: fileRec, project: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to upload vault file';
    console.error('Vault upload error:', error);
    const status = msg === 'Unauthorized' ? 403 : 500;
    return c.json({ success: false, error: msg }, status as any);
  }
});

/**
 * ==========================================
 * WORKBOOK INGESTION (Ship slice safe path)
 * ==========================================
 * Upload a Mills-style XLSX workbook and append ONLY Inbox suggestions
 * (no confirmed graph mutations).
 */
app.post('/api/projects/:projectId/ingest/workbook', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const projectId = c.req.param('projectId');
    const project = await loadProjectInternal(userId, projectId);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const body = await c.req.parseBody();
    const file = (body as any)?.file as File | undefined;
    if (!file) return c.json({ success: false, error: 'file is required' }, 400);

    const originalName = file.name || 'workbook.xlsx';
    const buf = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const fileId = randomUUID();
    const { buildUserFileKeyAtPath, putUserFileAtKey } = await import('./services/storage-service');

    const workbookKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${projectId}/workbooks/${fileId}`,
      filename: originalName,
    });
    const stored = await putUserFileAtKey({ userId, key: workbookKey, originalName, contentType, body: buf });

    const { buildWorkbookIndex } = await import('./services/workbook-index');
    const index = buildWorkbookIndex({ fileId, buf });
    const indexKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${projectId}/workbooks/${fileId}`,
      filename: 'workbook_index.json',
    });
    await putUserFileAtKey({
      userId,
      key: indexKey,
      originalName: 'workbook_index.json',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(index, null, 2)),
    });

    // Mills Peninsula ingest v1: extract deterministic groups with provenance.
    const { ingestMillsWorkbookV1 } = await import('./services/workbook-mills-ingest');
    const ingest = ingestMillsWorkbookV1({ fileId, buf });

    const ingestKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${projectId}/workbooks/${fileId}`,
      filename: 'workbook_ingest.json',
    });
    await putUserFileAtKey({
      userId,
      key: ingestKey,
      originalName: 'workbook_ingest.json',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(ingest, null, 2)),
    });

    // Store a vault-like record so EvidenceViewer can open the workbook.
    const now = new Date().toISOString();
    const fileRec = {
      id: fileId,
      filename: originalName,
      contentType,
      sizeBytes: buf.length,
      kind: 'workbook',
      tags: ['Workbook', 'XLSX'],
      storageKey: stored.key,
      storageUrl: stored.url,
      uploadedAt: now,
      workbookIndex: { storageKey: indexKey },
      workbookIngest: { storageKey: ingestKey },
    };

    const existingFiles = Array.isArray(project?.vault?.files) ? project.vault.files : [];
    const nextVault = { ...(project.vault || {}), files: [...existingFiles, fileRec] };

    const baseGraph = canonicalizeProjectGraphPhase1(project.graph || {});
    const existingInbox = Array.isArray(baseGraph?.inbox) ? baseGraph.inbox : [];
    const existingKeys = new Set(existingInbox.map((i: any) => String(i?.sourceKey || '')).filter(Boolean));

    const created: any[] = [];
    let skippedCount = 0;
    for (const ft of ingest.lightingFixtureTypes || []) {
      const sourceKey = `workbook:${fileId}:fixtureType:${String((ft as any)?.id || '')}`;
      if (sourceKey && existingKeys.has(sourceKey)) {
        skippedCount++;
        continue;
      }
      const prov = Array.isArray((ft as any)?.evidenceRefs) && (ft as any).evidenceRefs[0] ? (ft as any).evidenceRefs[0] : { fileId };
      const tags: string[] = ['fixtureGroup'];
      const fixtureTypeKey = String((ft as any)?.fixtureTypeKey || '').trim();
      if (fixtureTypeKey) tags.push(`fixtureTypeKey:${fixtureTypeKey}`);
      const existingDesc = String((ft as any)?.normalized?.existingDesc || '').trim();
      if (existingDesc) tags.push(`existingDesc:${existingDesc}`);
      const proposedDesc = String((ft as any)?.normalized?.proposedDesc || '').trim();
      if (proposedDesc) tags.push(`proposedDesc:${proposedDesc}`);
      const area = String((ft as any)?.normalized?.area || '').trim();
      if (area) tags.push(`area:${area}`);
      const form = String((ft as any)?.normalized?.formFactor || '').trim();
      if (form) tags.push(`formFactor:${form}`);
      const lampCount = (ft as any)?.normalized?.lampCount;
      if (Number.isFinite(lampCount)) tags.push(`lampCount:${String(lampCount)}`);
      const lampWatts = (ft as any)?.normalized?.lampWatts;
      if (Number.isFinite(lampWatts)) tags.push(`lampWatts:${String(lampWatts)}`);

      created.push({
        id: randomUUID(),
        kind: 'suggestedAsset',
        status: 'inferred',
        sourceKey,
        suggestedAsset: {
          type: 'lightingFixture',
          name: fixtureTypeKey ? `Fixture group (${fixtureTypeKey})` : 'Fixture group',
          assetTagHint: 'LTG',
          tags,
        },
        quantity: Number((ft as any)?.qty) || null,
        unit: 'each',
        provenance: prov,
        confidence: Number((ft as any)?.confidence) || 0.7,
        needsConfirmation: true,
        createdAt: now,
      });
    }

    const nextGraph = canonicalizeProjectGraphPhase1({
      ...baseGraph,
      inbox: [...existingInbox, ...created],
    });

    const updated = await persistProjectInternal(userId, projectId, { vault: nextVault, graph: nextGraph });
    return c.json({
      success: true,
      file: fileRec,
      createdCount: created.length,
      skippedCount,
      inboxCount: nextGraph.inbox.length,
      project: updated,
      graph: nextGraph,
    });
  } catch (error) {
    console.error('ingest workbook to inbox error:', error);
    return c.json({ success: false, error: 'Failed to ingest workbook' }, 500);
  }
});

/**
 * ==========================================
 * WORKBOOK INGESTION v1 (Project Builder)
 * ==========================================
 * Upload an XLSX workbook, create workbook_index.json (table detection),
 * then allow user to map tables/columns and run ingestion deterministically.
 */

async function findVaultFileById(project: any, fileId: string): Promise<any | null> {
  const files = Array.isArray(project?.vault?.files) ? project.vault.files : [];
  const file = files.find((f: any) => String(f?.id || '') === String(fileId || ''));
  return file || null;
}

app.post('/api/projectBuilder/:projectId/uploadWorkbook', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const projectId = c.req.param('projectId');
    const project = await loadProjectInternal(userId, projectId);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const body = await c.req.parseBody();
    const file = (body as any)?.file as File | undefined;
    if (!file) return c.json({ success: false, error: 'file is required' }, 400);

    const originalName = file.name || 'workbook.xlsx';
    const buf = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const fileId = randomUUID();
    const { buildUserFileKeyAtPath, putUserFileAtKey } = await import('./services/storage-service');

    const workbookKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${projectId}/workbooks/${fileId}`,
      filename: originalName,
    });
    const stored = await putUserFileAtKey({ userId, key: workbookKey, originalName, contentType, body: buf });

    const { buildWorkbookIndex } = await import('./services/workbook-index');
    const index = buildWorkbookIndex({ fileId, buf });

    const indexKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${projectId}/workbooks/${fileId}`,
      filename: 'workbook_index.json',
    });
    await putUserFileAtKey({
      userId,
      key: indexKey,
      originalName: 'workbook_index.json',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(index, null, 2)),
    });

    // Mills Peninsula ingest v1 (reference workbook format)
    const { ingestMillsWorkbookV1, applyMillsIngestToProjectGraph } = await import('./services/workbook-mills-ingest');
    const ingest = ingestMillsWorkbookV1({ fileId, buf });

    const auditRowsKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${projectId}/workbooks/${fileId}`,
      filename: 'audit_rows.json',
    });
    const fixtureTypesKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${projectId}/workbooks/${fileId}`,
      filename: 'lighting_fixture_types.json',
    });
    const measuresKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${projectId}/workbooks/${fileId}`,
      filename: 'measures.json',
    });
    const bomKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${projectId}/workbooks/${fileId}`,
      filename: 'bom_items.json',
    });
    const sheetsKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${projectId}/workbooks/${fileId}`,
      filename: 'vault_sheets.json',
    });
    const ingestKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${projectId}/workbooks/${fileId}`,
      filename: 'workbook_ingest.json',
    });

    await putUserFileAtKey({
      userId,
      key: sheetsKey,
      originalName: 'vault_sheets.json',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(ingest.vaultSheets, null, 2)),
    });
    await putUserFileAtKey({
      userId,
      key: auditRowsKey,
      originalName: 'audit_rows.json',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(ingest.auditRows, null, 2)),
    });
    await putUserFileAtKey({
      userId,
      key: fixtureTypesKey,
      originalName: 'lighting_fixture_types.json',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(ingest.lightingFixtureTypes, null, 2)),
    });
    await putUserFileAtKey({
      userId,
      key: measuresKey,
      originalName: 'measures.json',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(ingest.measures, null, 2)),
    });
    await putUserFileAtKey({
      userId,
      key: bomKey,
      originalName: 'bom_items.json',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(ingest.bomItems, null, 2)),
    });
    await putUserFileAtKey({
      userId,
      key: ingestKey,
      originalName: 'workbook_ingest.json',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(ingest, null, 2)),
    });

    // Store a vault-like record so EvidenceViewer can open the file.
    const now = new Date().toISOString();
    const fileRec = {
      id: fileId,
      filename: originalName,
      contentType,
      sizeBytes: buf.length,
      kind: 'workbook',
      tags: ['Workbook', 'XLSX'],
      storageKey: stored.key,
      storageUrl: stored.url,
      uploadedAt: now,
      workbookIndex: { storageKey: indexKey },
      workbookIngest: {
        storageKey: ingestKey,
        auditRowsKey,
        fixtureTypesKey,
        measuresKey,
        bomKey,
        sheetsKey,
      },
    };

    const existing = Array.isArray(project?.vault?.files) ? project.vault.files : [];
    const nextVault = { ...(project.vault || {}), files: [...existing, fileRec] };
    // Update canonical project graph with consolidated fixture types + measures + inbox notes.
    const nextGraph = applyMillsIngestToProjectGraph({
      ingest,
      existingGraph: canonicalizeProjectGraphPhase1(project.graph || {}),
    });
    const updated = await persistProjectInternal(userId, projectId, { vault: nextVault, graph: nextGraph });

    return c.json({
      success: true,
      file: fileRec,
      workbookIndex: index,
      ingestSummary: {
        fixtureTypeGroups: ingest.lightingFixtureTypes.length,
        auditRows: ingest.auditRows.length,
        measures: ingest.measures.length,
        bomItems: ingest.bomItems.length,
        inbox: ingest.inbox.length,
      },
      project: updated,
      // UI convenience: return fixture types by default
      lightingFixtureTypes: ingest.lightingFixtureTypes,
    });
  } catch (error) {
    console.error('uploadWorkbook error:', error);
    return c.json({ success: false, error: 'Failed to upload workbook' }, 500);
  }
});

// Alias without /api for callers that hit backend directly (optional).
app.post('/projectBuilder/:projectId/uploadWorkbook', async (c) => {
  // Delegate to the /api route handler by reusing same logic via fetch is overkill; just call through.
  // In Hono, easiest is to respond with guidance.
  return c.json({ success: false, error: 'Use /api/projectBuilder/:projectId/uploadWorkbook' }, 400);
});

app.get('/api/projectBuilder/:projectId/workbooks/:fileId/index', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const projectId = c.req.param('projectId');
    const fileId = c.req.param('fileId');
    const project = await loadProjectInternal(userId, projectId);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    const file = await findVaultFileById(project, fileId);
    if (!file) return c.json({ success: false, error: 'Workbook not found in vault' }, 404);

    const indexKey = (file as any)?.workbookIndex?.storageKey as string | undefined;
    if (!indexKey) return c.json({ success: false, error: 'workbook_index.json not available' }, 404);

    const { getUserFile } = await import('./services/storage-service');
    const obj = await getUserFile({ userId, key: indexKey });
    if (!obj) return c.json({ success: false, error: 'workbook_index.json not found' }, 404);
    const index = JSON.parse(obj.body.toString('utf-8'));
    return c.json({ success: true, fileId, workbookIndex: index });
  } catch (error) {
    console.error('get workbook index error:', error);
    return c.json({ success: false, error: 'Failed to load workbook index' }, 500);
  }
});

app.get('/api/projectBuilder/:projectId/workbooks/:fileId/mappings', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const projectId = c.req.param('projectId');
    const fileId = c.req.param('fileId');
    const project = await loadProjectInternal(userId, projectId);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    const file = await findVaultFileById(project, fileId);
    if (!file) return c.json({ success: false, error: 'Workbook not found in vault' }, 404);

    const mappingsKey = (file as any)?.workbookMappings?.storageKey as string | undefined;
    if (!mappingsKey) return c.json({ success: true, fileId, mappings: null });

    const { getUserFile } = await import('./services/storage-service');
    const obj = await getUserFile({ userId, key: mappingsKey });
    if (!obj) return c.json({ success: true, fileId, mappings: null });
    const mappings = JSON.parse(obj.body.toString('utf-8'));
    return c.json({ success: true, fileId, mappings });
  } catch (error) {
    console.error('get workbook mappings error:', error);
    return c.json({ success: false, error: 'Failed to load workbook mappings' }, 500);
  }
});

app.post('/api/projectBuilder/:projectId/workbooks/:fileId/mappings', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const projectId = c.req.param('projectId');
    const fileId = c.req.param('fileId');
    const project = await loadProjectInternal(userId, projectId);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    const file = await findVaultFileById(project, fileId);
    if (!file) return c.json({ success: false, error: 'Workbook not found in vault' }, 404);

    const body = await c.req.json().catch(() => ({}));
    const mappings = (body as any)?.mappings || body;
    if (!mappings || typeof mappings !== 'object') return c.json({ success: false, error: 'mappings is required' }, 400);

    const { buildUserFileKeyAtPath, putUserFileAtKey } = await import('./services/storage-service');
    const mappingsKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${projectId}/workbooks/${fileId}`,
      filename: 'table_mappings.json',
    });
    await putUserFileAtKey({
      userId,
      key: mappingsKey,
      originalName: 'table_mappings.json',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(mappings, null, 2)),
    });

    // Patch file record in vault to reference mappings key
    const files = Array.isArray(project?.vault?.files) ? project.vault.files : [];
    const nextFiles = files.map((f: any) => {
      if (String(f?.id || '') !== String(fileId)) return f;
      return { ...f, workbookMappings: { storageKey: mappingsKey } };
    });
    const nextVault = { ...(project.vault || {}), files: nextFiles };
    await persistProjectInternal(userId, projectId, { vault: nextVault });

    return c.json({ success: true, fileId, mappingsKey });
  } catch (error) {
    console.error('save workbook mappings error:', error);
    return c.json({ success: false, error: 'Failed to save workbook mappings' }, 500);
  }
});

app.post('/api/projectBuilder/:projectId/runIngestion', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const projectId = c.req.param('projectId');
    const fileId = String(c.req.query('fileId') || '').trim();
    if (!fileId) return c.json({ success: false, error: 'fileId is required' }, 400);
    const project = await loadProjectInternal(userId, projectId);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    const file = await findVaultFileById(project, fileId);
    if (!file) return c.json({ success: false, error: 'Workbook not found in vault' }, 404);

    const workbookKey = (file as any)?.storageKey as string | undefined;
    if (!workbookKey) return c.json({ success: false, error: 'Workbook storageKey missing' }, 500);

    const { getUserFile, buildUserFileKeyAtPath, putUserFileAtKey } = await import('./services/storage-service');
    const wbObj = await getUserFile({ userId, key: workbookKey });
    if (!wbObj) return c.json({ success: false, error: 'Workbook file not found in storage' }, 404);
    const { ingestMillsWorkbookV1, applyMillsIngestToProjectGraph } = await import('./services/workbook-mills-ingest');
    const ingest = ingestMillsWorkbookV1({ fileId, buf: wbObj.body });
    const nextGraph = applyMillsIngestToProjectGraph({
      ingest,
      existingGraph: canonicalizeProjectGraphPhase1(project.graph || {}),
    });

    // Persist artifacts
    const graphKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${projectId}/workbooks/${fileId}`,
      filename: 'project_graph.json',
    });
    const inboxKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${projectId}/workbooks/${fileId}`,
      filename: 'inbox.json',
    });
    const summaryKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${projectId}/workbooks/${fileId}`,
      filename: 'ingestion_summary.json',
    });

    await putUserFileAtKey({
      userId,
      key: graphKey,
      originalName: 'project_graph.json',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(nextGraph, null, 2)),
    });
    await putUserFileAtKey({
      userId,
      key: inboxKey,
      originalName: 'inbox.json',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify({ inbox: nextGraph.inbox }, null, 2)),
    });
    await putUserFileAtKey({
      userId,
      key: summaryKey,
      originalName: 'ingestion_summary.json',
      contentType: 'application/json',
      body: Buffer.from(
        JSON.stringify(
          {
            fixtureTypeGroups: ingest.lightingFixtureTypes.length,
            auditRows: ingest.auditRows.length,
            measures: ingest.measures.length,
            bomItems: ingest.bomItems.length,
            inbox: ingest.inbox.length,
          },
          null,
          2
        )
      ),
    });

    // Update canonical graph in project record
    const updated = await persistProjectInternal(userId, projectId, { graph: nextGraph });

    return c.json({
      success: true,
      projectId,
      fileId,
      summary: {
        fixtureTypeGroups: ingest.lightingFixtureTypes.length,
        auditRows: ingest.auditRows.length,
        measures: ingest.measures.length,
        bomItems: ingest.bomItems.length,
        inbox: ingest.inbox.length,
      },
      graph: canonicalizeProjectGraphPhase1(updated.graph || nextGraph),
      artifacts: { graphKey, inboxKey, summaryKey },
    });
  } catch (error) {
    console.error('run ingestion error:', error);
    return c.json({ success: false, error: 'Failed to run ingestion' }, 500);
  }
});

app.get('/api/projectBuilder/:projectId/workbooks/:fileId/ingestion', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const projectId = c.req.param('projectId');
    const fileId = c.req.param('fileId');
    const project = await loadProjectInternal(userId, projectId);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    const file = await findVaultFileById(project, fileId);
    if (!file) return c.json({ success: false, error: 'Workbook not found in vault' }, 404);

    const ingestKey = (file as any)?.workbookIngest?.storageKey as string | undefined;
    if (!ingestKey) return c.json({ success: false, error: 'No ingestion artifact found for this workbook' }, 404);
    const { getUserFile } = await import('./services/storage-service');
    const obj = await getUserFile({ userId, key: ingestKey });
    if (!obj) return c.json({ success: false, error: 'Ingestion artifact not found in storage' }, 404);
    const ingest = JSON.parse(obj.body.toString('utf-8'));
    return c.json({ success: true, fileId, ingest });
  } catch (error) {
    console.error('get ingestion error:', error);
    return c.json({ success: false, error: 'Failed to load ingestion output' }, 500);
  }
});

app.get('/api/projects/:id/graph', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const id = c.req.param('id');
    const project = await loadProjectInternal(userId, id);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    // Phase 1 canonical graph only (no extra top-level keys).
    const raw = project.graph || {};
    const canonical = canonicalizeProjectGraphPhase1(raw);
    return c.json({ success: true, graph: canonical });
  } catch (error) {
    console.error('Get project graph error:', error);
    return c.json({ success: false, error: 'Failed to load project graph' }, 500);
  }
});

app.get('/api/projects/:id/hvac-snapshot', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const id = c.req.param('id');
    const project = await loadProjectInternal(userId, id);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    const { projectGraphToHvacSnapshot } = await import('./modules/hvac/project-graph-snapshot');
    const snapshot = projectGraphToHvacSnapshot(project.graph || null);
    return c.json({ success: true, snapshot });
  } catch (error) {
    console.error('Get project HVAC snapshot error:', error);
    return c.json({ success: false, error: 'Failed to build HVAC snapshot' }, 500);
  }
});

/**
 * ==========================================
 * Calculator ↔ Project Builder contract (v0)
 * ==========================================
 *
 * Project Builder is the system of record.
 * Calculators consume baseline snapshots (read-only) and return Proposal Packs (deltas).
 */

function buildProjectBaselineSnapshotV0(args: { projectId: string; project: any }): any {
  const projectId = args.projectId;
  const project = args.project || {};
  const createdAt = new Date().toISOString();
  const snapshotId = randomUUID();
  const timezone = String(project?.timezone || project?.customer?.timezone || 'UTC');

  const graph = canonicalizeProjectGraphPhase1(project.graph || {});
  const assets = Array.isArray(graph?.assets) ? graph.assets : [];

  const lightingFixtureGroups = assets
    .filter((a: any) => String(a?.type || '') === 'lightingFixture' && Array.isArray(a?.tags) && a.tags.includes('fixtureGroup'))
    .map((a: any) => {
      const qty = Number(a?.baseline?.properties?.qty);
      return {
        id: String(a?.id || ''),
        assetTag: String(a?.assetTag || ''),
        qty: Number.isFinite(qty) ? qty : null,
        fixtureTypeKey: a?.baseline?.properties?.fixtureTypeKey ? String(a.baseline.properties.fixtureTypeKey) : null,
        existingDesc: a?.baseline?.properties?.existingDesc ? String(a.baseline.properties.existingDesc) : null,
        proposedDesc: a?.baseline?.properties?.proposedDesc ? String(a.baseline.properties.proposedDesc) : null,
        evidenceRefs: Array.isArray(a?.evidenceRefs) ? a.evidenceRefs : Array.isArray(a?.baseline?.evidenceRefs) ? a.baseline.evidenceRefs : [],
        needsConfirmation: true,
      };
    })
    .filter((g: any) => g.id);

  // V0: assumptions/dataSources are not yet first-class in the Phase 1 graph;
  // expose vault evidence as dataSources so calculators can reason about coverage.
  const vaultFiles = Array.isArray(project?.vault?.files) ? project.vault.files : [];
  const dataSources = vaultFiles.map((vf: any) => ({
    id: String(vf?.id || randomUUID()),
    kind: String(vf?.kind || '').toLowerCase() === 'workbook' ? 'workbook' : 'other',
    fileId: vf?.id ? String(vf.id) : null,
    coverage: null,
    notes: vf?.filename ? String(vf.filename) : null,
    evidenceRefs: vf?.id ? [{ fileId: String(vf.id) }] : [],
  }));

  return {
    projectId,
    snapshotId,
    createdAt,
    timezone,
    assets,
    lightingFixtureGroups,
    assumptions: [],
    dataSources,
    constraints: project?.constraints || undefined,
    provenancePolicy: {
      requireEvidenceRefs: true,
      requireConfirmation: true,
    },
  };
}

app.get('/api/projects/:projectId/baseline-snapshot', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const projectId = c.req.param('projectId');
    const project = await loadProjectInternal(userId, projectId);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const snapshot = buildProjectBaselineSnapshotV0({ projectId, project });
    return c.json({ success: true, snapshot });
  } catch (error) {
    console.error('Get baseline snapshot error:', error);
    return c.json({ success: false, error: 'Failed to build baseline snapshot' }, 500);
  }
});

app.get('/api/projects/:projectId/proposals', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const projectId = c.req.param('projectId');
    const project = await loadProjectInternal(userId, projectId);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    const items = Array.isArray(project?.proposalPacks) ? project.proposalPacks : [];
    return c.json({ success: true, projectId, proposals: items });
  } catch (error) {
    console.error('List proposals error:', error);
    return c.json({ success: false, error: 'Failed to list proposals' }, 500);
  }
});

app.get('/api/projects/:projectId/proposals/:proposalPackId', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const projectId = c.req.param('projectId');
    const proposalPackId = c.req.param('proposalPackId');
    const project = await loadProjectInternal(userId, projectId);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const items = Array.isArray(project?.proposalPacks) ? project.proposalPacks : [];
    const hit = items.find((p: any) => String(p?.proposalPackId || '') === String(proposalPackId));
    if (!hit?.storageKey) return c.json({ success: false, error: 'Proposal pack not found' }, 404);

    const { getUserFile } = await import('./services/storage-service');
    const obj = await getUserFile({ userId, key: String(hit.storageKey) });
    if (!obj) return c.json({ success: false, error: 'Proposal pack artifact not found' }, 404);
    const pack = JSON.parse(obj.body.toString('utf-8'));
    return c.json({ success: true, projectId, proposalPackId, pack });
  } catch (error) {
    console.error('Get proposal pack error:', error);
    return c.json({ success: false, error: 'Failed to load proposal pack' }, 500);
  }
});

app.post('/api/projects/:projectId/proposals/import', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const projectId = c.req.param('projectId');
    const project = await loadProjectInternal(userId, projectId);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const body = await c.req.json().catch(() => ({}));
    const pack = (body as any)?.pack || body;

    const { ProposalPackSchema } = await import('./validation/schemas/proposal-contract-schema');
    const parsed = ProposalPackSchema.safeParse(pack);
    if (!parsed.success) {
      return c.json(
        {
          success: false,
          error: 'ProposalPack validation failed',
          details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        400
      );
    }

    if (String(parsed.data.projectId) !== String(projectId)) {
      return c.json({ success: false, error: 'proposal.projectId must match route projectId' }, 400);
    }

    const { buildUserFileKeyAtPath, putUserFileAtKey } = await import('./services/storage-service');
    const storageKey = buildUserFileKeyAtPath({
      userId,
      pathPrefix: `projects/${projectId}/proposals/${parsed.data.proposalPackId}`,
      filename: 'proposal_pack.json',
    });
    await putUserFileAtKey({
      userId,
      key: storageKey,
      originalName: 'proposal_pack.json',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(parsed.data, null, 2)),
    });

    const nextIndex = {
      proposalPackId: parsed.data.proposalPackId,
      createdAt: parsed.data.createdAt,
      createdBy: parsed.data.createdBy,
      title: parsed.data.title,
      summary: parsed.data.summary,
      basedOnSnapshotId: parsed.data.basedOnSnapshotId,
      storageKey,
    };
    const existing = Array.isArray(project?.proposalPacks) ? project.proposalPacks : [];
    const deduped = existing.filter((p: any) => String(p?.proposalPackId || '') !== String(nextIndex.proposalPackId));
    const proposalPacks = [nextIndex, ...deduped].slice(0, 200);
    // v0: store-only. Do NOT mutate graph or create inbox/timeline entries yet.
    const updated = await persistProjectInternal(userId, projectId, { proposalPacks });
    return c.json({ success: true, projectId, proposalPackId: parsed.data.proposalPackId, index: nextIndex });
  } catch (error) {
    console.error('Import proposal error:', error);
    return c.json({ success: false, error: 'Failed to import proposal pack' }, 500);
  }
});

app.post('/api/projects/:projectId/proposals/:proposalPackId/commit', async (c) => {
  try {
    const enabled = (await import('./services/proposal-commit')).isProposalCommitEnabled(process.env.ENABLE_PROPOSAL_COMMIT);
    if (!enabled) return c.json({ success: false, enabled: false }, 404);

    const userId = getCurrentUserId(c);
    const projectId = c.req.param('projectId');
    const proposalPackId = c.req.param('proposalPackId');
    const project = await loadProjectInternal(userId, projectId);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const body = await c.req.json().catch(() => ({}));
    const scenarioId = String((body as any)?.scenarioId || '').trim();
    if (!scenarioId) return c.json({ success: false, error: 'scenarioId is required' }, 400);

    const items = Array.isArray(project?.proposalPacks) ? project.proposalPacks : [];
    const hit = items.find((p: any) => String(p?.proposalPackId || '') === String(proposalPackId));
    if (!hit?.storageKey) return c.json({ success: false, error: 'Proposal pack not found' }, 404);

    const { getUserFile } = await import('./services/storage-service');
    const obj = await getUserFile({ userId, key: String(hit.storageKey) });
    if (!obj) return c.json({ success: false, error: 'Proposal pack artifact not found' }, 404);
    const pack = JSON.parse(obj.body.toString('utf-8'));

    // Validate the stored pack before we convert it into inbox items.
    const { ProposalPackSchema } = await import('./validation/schemas/proposal-contract-schema');
    const parsed = ProposalPackSchema.safeParse(pack);
    if (!parsed.success) return c.json({ success: false, error: 'Invalid ProposalPack artifact' }, 500);

    const graph = canonicalizeProjectGraphPhase1(project.graph || {});
    const nowIso = new Date().toISOString();

    const { commitProposalPackToInboxV1 } = await import('./services/proposal-commit');
    const res = commitProposalPackToInboxV1({
      enabled: true,
      proposalPackId,
      scenarioId,
      pack: parsed.data,
      storageKey: String(hit.storageKey),
      graph,
      nowIso,
    });
    if (res.status === 400) return c.json({ success: false, error: 'Scenario not found in ProposalPack' }, 400);
    if (res.status === 404) return c.json({ success: false, enabled: false }, 404);

    // Persist ONLY graph.inbox changes.
    const updated = await persistProjectInternal(userId, projectId, { graph: res.nextGraph });
    const inboxCount = Array.isArray((updated.graph || {}).inbox) ? (updated.graph || {}).inbox.length : res.inboxCount;

    return c.json({
      success: true,
      createdCount: res.createdCount,
      skippedCount: res.skippedCount,
      inboxCount,
    });
  } catch (error) {
    console.error('Commit proposal to inbox error:', error);
    return c.json({ success: false, error: 'Failed to commit proposal to inbox' }, 500);
  }
});

/**
 * Calculator services (v0)
 */
app.post('/api/calc/battery/run', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const body = await c.req.json().catch(() => ({}));
    const projectId = String((body as any)?.projectId || '').trim();
    if (!projectId) return c.json({ success: false, error: 'projectId is required' }, 400);
    const project = await loadProjectInternal(userId, projectId);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const snapshot = buildProjectBaselineSnapshotV0({ projectId, project });
    const now = new Date().toISOString();
    const proposalPackId = randomUUID();
    const scenarioId = randomUUID();
    const measureId = randomUUID();

    const pack = {
      proposalPackId,
      projectId,
      basedOnSnapshotId: snapshot.snapshotId,
      createdAt: now,
      createdBy: 'battery_calculator',
      title: 'Battery Option A (stub)',
      summary: 'Stub proposal pack to prove end-to-end contract wiring (run → import → view).',
      scenarios: [
        {
          scenarioId,
          name: 'Battery Option A',
          objective: 'max_npv',
          constraints: {
            maxPaybackYears: Number(snapshot?.constraints?.maxPaybackYears || 10),
            noExport: Boolean(snapshot?.constraints?.noExport ?? true),
          },
          deltas: [
            {
              id: randomUUID(),
              kind: 'ADD_MEASURE',
              measure: {
                id: measureId,
                name: 'Install BESS (Option A)',
                category: 'battery',
                notes: 'Stub measure; does not mutate project until reviewed and committed.',
              },
            },
            {
              id: randomUUID(),
              kind: 'ADD_BOM_ITEMS',
              measureId,
              items: [
                { sku: 'BESS-OPTION-A', description: 'Battery energy storage system (material only)', qty: 1, uom: 'ea' },
                { sku: 'EMS', description: 'Energy management system', qty: 1, uom: 'ea' },
              ],
            },
          ],
          economics: { annualSavingsUsd: null, capexUsd: null, paybackYears: null, npvUsd: null, irr: null },
          performance: { peakKwBefore: null, peakKwAfter: null, kwShaved: null, kwhShifted: null },
          confidence: 0.3,
          notes: ['Stub economics/performance; next step is wiring to real interval+billing datasources.'],
        },
      ],
      recommendedScenarioId: '', // set below
      assumptionsUsed: [],
      missingInfo: [],
      riskFlags: ['TEMP_MISSING'],
      evidenceRefs: [],
    };
    pack.recommendedScenarioId = pack.scenarios[0].scenarioId;

    // Validate contract before returning
    const { ProposalPackSchema } = await import('./validation/schemas/proposal-contract-schema');
    const parsed = ProposalPackSchema.safeParse(pack);
    if (!parsed.success) return c.json({ success: false, error: 'Internal ProposalPack validation failed' }, 500);

    return c.json({ success: true, snapshot, pack: parsed.data });
  } catch (error) {
    console.error('Battery calc run error:', error);
    return c.json({ success: false, error: 'Failed to run battery calculator' }, 500);
  }
});

app.post('/api/calc/hvac/run', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const body = await c.req.json().catch(() => ({}));
    const projectId = String((body as any)?.projectId || '').trim();
    if (!projectId) return c.json({ success: false, error: 'projectId is required' }, 400);
    const project = await loadProjectInternal(userId, projectId);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const snapshot = buildProjectBaselineSnapshotV0({ projectId, project });
    const now = new Date().toISOString();
    const proposalPackId = randomUUID();

    const pack = {
      proposalPackId,
      projectId,
      basedOnSnapshotId: snapshot.snapshotId,
      createdAt: now,
      createdBy: 'hvac_calculator',
      title: 'HVAC calculator proposal (v0)',
      summary: 'Scenario-based HVAC outputs are not yet wired to Project Builder assumptions/controls (v0 placeholder).',
      scenarios: [
        {
          scenarioId: randomUUID(),
          name: 'Base scenario',
          objective: 'max_savings',
          constraints: {
            maxPaybackYears: Number(snapshot?.constraints?.maxPaybackYears || 10),
            noExport: Boolean(snapshot?.constraints?.noExport ?? true),
          },
          deltas: [],
          economics: { annualSavingsUsd: null, capexUsd: null, paybackYears: null, npvUsd: null, irr: null },
          performance: { peakKwBefore: null, peakKwAfter: null, kwShaved: null, kwhShifted: null },
          confidence: 0.2,
          notes: ['v0: proposal pack shape only.'],
        },
      ],
      recommendedScenarioId: '',
      assumptionsUsed: [],
      missingInfo: [
        {
          key: 'hvac_controls',
          message: 'No HVAC control assumptions are mapped in Project Builder yet (next step).',
          severity: 'warning',
        },
      ],
      riskFlags: ['TEMP_MISSING'],
      evidenceRefs: [],
    };
    pack.recommendedScenarioId = pack.scenarios[0].scenarioId;

    const { ProposalPackSchema } = await import('./validation/schemas/proposal-contract-schema');
    const parsed = ProposalPackSchema.safeParse(pack);
    if (!parsed.success) return c.json({ success: false, error: 'Internal ProposalPack validation failed' }, 500);

    return c.json({ success: true, snapshot, pack: parsed.data });
  } catch (error) {
    console.error('HVAC calc run error:', error);
    return c.json({ success: false, error: 'Failed to run HVAC calculator' }, 500);
  }
});

function canonicalizeProjectGraphPhase1(input: any): any {
  const g = input && typeof input === 'object' ? input : {};
  const assets = Array.isArray((g as any).assets) ? (g as any).assets : [];
  const measures = Array.isArray((g as any).measures) ? (g as any).measures : [];
  const inbox = Array.isArray((g as any).inbox) ? (g as any).inbox : [];
  const inboxHistory = Array.isArray((g as any).inboxHistory) ? (g as any).inboxHistory : [];
  const bomItems = Array.isArray((g as any).bomItems) ? (g as any).bomItems : [];
  const decisions = Array.isArray((g as any).decisions) ? (g as any).decisions : [];

  const canonAssets = assets.map((a: any) => {
    const obj = a && typeof a === 'object' ? a : {};
    // Inject required kind for Phase 1 assets
    if (!obj.kind) obj.kind = 'asset';
    return obj;
  });

  const canonMeasures = measures.map((m: any) => {
    const obj = m && typeof m === 'object' ? m : {};
    if (!obj.kind) obj.kind = 'measure';
    return obj;
  });

  return {
    assets: canonAssets,
    measures: canonMeasures,
    inbox,
    inboxHistory,
    bomItems,
    decisions,
  };
}

app.get('/api/projects/:projectId/graph/inbox', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const projectId = c.req.param('projectId');
    const project = await loadProjectInternal(userId, projectId);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    const graph = canonicalizeProjectGraphPhase1(project.graph || {});
    const inbox = Array.isArray(graph?.inbox) ? graph.inbox : [];
    return c.json({ success: true, projectId, inbox });
  } catch (error) {
    console.error('Get project inbox error:', error);
    return c.json({ success: false, error: 'Failed to load project inbox' }, 500);
  }
});

app.post('/api/projects/:projectId/graph/inbox/:inboxItemId/decide', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const projectId = c.req.param('projectId');
    const inboxItemId = c.req.param('inboxItemId');
    const project = await loadProjectInternal(userId, projectId);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const body = await c.req.json().catch(() => ({}));
    const decision = String((body as any)?.decision || '').trim().toUpperCase();
    const reason = String((body as any)?.reason || '').trim();
    if (decision !== 'ACCEPT' && decision !== 'REJECT') {
      return c.json({ success: false, error: 'decision must be ACCEPT or REJECT' }, 400);
    }
    if (!reason) return c.json({ success: false, error: 'reason is required' }, 400);

    const nowIso = new Date().toISOString();
    const graph = canonicalizeProjectGraphPhase1(project.graph || {});
    const { applyInboxDecision } = await import('./services/inbox-decisions');
    const res = applyInboxDecision({
      graph,
      inboxItemId,
      decision: decision as any,
      reason,
      nowIso,
    });

    if (res.status !== 200) {
      return c.json({ success: false, error: res.error }, res.status);
    }

    // Canonical Phase 1 lock: validate graph strictly to prevent scope drift.
    const { ProjectGraphPhase1Schema } = await import('./validation/schemas/project-graph-phase1-schema');
    const parsed = ProjectGraphPhase1Schema.safeParse(res.nextGraph);
    if (!parsed.success) {
      return c.json(
        {
          success: false,
          error: 'ProjectGraph validation failed after inbox decision',
          details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        400
      );
    }

    const updated = await persistProjectInternal(userId, projectId, { graph: res.nextGraph });
    return c.json({
      success: true,
      projectId,
      inboxItemId,
      decision,
      createdAssetIds: res.createdAssetIds,
      createdMeasureIds: res.createdMeasureIds,
      graph: canonicalizeProjectGraphPhase1(updated.graph || res.nextGraph),
    });
  } catch (error) {
    console.error('Decide inbox item error:', error);
    return c.json({ success: false, error: 'Failed to decide inbox item' }, 500);
  }
});

app.put('/api/projects/:id/graph', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const id = c.req.param('id');
    const project = await loadProjectInternal(userId, id);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    const body = await c.req.json().catch(() => ({}));
    const graphInput = (body as any)?.graph || body || {};
    const graph = canonicalizeProjectGraphPhase1(graphInput);

    // Canonical Phase 1 lock: validate graph strictly to prevent scope drift.
    try {
      const { ProjectGraphPhase1Schema } = await import('./validation/schemas/project-graph-phase1-schema');
      const parsed = ProjectGraphPhase1Schema.safeParse(graph);
      if (!parsed.success) {
        return c.json(
          {
            success: false,
            error: 'ProjectGraph validation failed (Phase 1 canonical lock)',
            details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
          },
          400
        );
      }
    } catch (e) {
      // If validation module fails to load for any reason, fail closed.
      return c.json({ success: false, error: 'ProjectGraph validator unavailable' }, 500);
    }

    // Phase 1 baseline lock: if an asset baseline is frozen, it cannot be modified.
    try {
      const incomingAssets = Array.isArray((graph as any)?.assets) ? (graph as any).assets : [];
      const existingAssets = Array.isArray((project as any)?.graph?.assets) ? (project as any).graph.assets : [];
      const existingById = new Map(existingAssets.map((a: any) => [String(a?.id || ''), a]));

      for (const a of incomingAssets) {
        const idKey = String(a?.id || '');
        if (!idKey) continue;
        const prev = existingById.get(idKey);
        const prevFrozenAt = String(prev?.baseline?.frozenAt || '').trim();
        if (!prevFrozenAt) continue;

        const prevBaseline = prev?.baseline || {};
        const nextBaseline = a?.baseline || {};
        // Compare JSON; baseline must match exactly once frozen.
        const prevStr = JSON.stringify(prevBaseline);
        const nextStr = JSON.stringify(nextBaseline);
        if (prevStr !== nextStr) {
          return c.json(
            {
              success: false,
              error: `Baseline is frozen for asset ${String(prev?.assetTag || idKey)} and cannot be modified`,
            },
            400
          );
        }
      }
    } catch {
      // fail-safe: if check fails, do not block
    }

    // Optional V1 strictness: enforce unique assetTag when assets are present.
    try {
      const assets = Array.isArray((graph as any)?.assets) ? (graph as any).assets : [];
      const seen = new Set<string>();
      for (const a of assets) {
        const tag = String(a?.assetTag || '').trim();
        if (!tag) continue;
        const key = tag.toLowerCase();
        if (seen.has(key)) {
          return c.json({ success: false, error: `Duplicate assetTag detected: ${tag}` }, 400);
        }
        seen.add(key);
      }
    } catch {
      // ignore validation errors
    }

    const updated = await persistProjectInternal(userId, id, { graph });
    return c.json({ success: true, graph: updated.graph });
  } catch (error) {
    console.error('Update project graph error:', error);
    return c.json({ success: false, error: 'Failed to update project graph' }, 500);
  }
});

app.post('/api/projects/:id/analyze', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const id = c.req.param('id');
    const project = await loadProjectInternal(userId, id);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const { getUserFile } = await import('./services/storage-service');
    const vaultFiles = Array.isArray(project?.vault?.files) ? project.vault.files : [];

    // Pull a bounded set of chunks for context (keyword retrieval is handled client-side for chat;
    // analyzer just samples first chunks per file for V1).
    const sampledChunks: Array<{ fileId: string; storageKey?: string; chunkIndex: number; text: string; provenance: any }> = [];
    for (const vf of vaultFiles.slice(0, 6)) {
      const chunksKey = (vf as any)?.chunks?.storageKey as string | undefined;
      if (!chunksKey) continue;
      const obj = await getUserFile({ userId, key: chunksKey });
      if (!obj) continue;
      const arr = JSON.parse(obj.body.toString('utf-8')) as any[];
      for (const ch of (Array.isArray(arr) ? arr : []).slice(0, 10)) {
        sampledChunks.push({
          fileId: String(vf.id),
          storageKey: String((vf as any).storageKey || ''),
          chunkIndex: Number(ch.chunkIndex || 0),
          text: String(ch.text || ''),
          provenance: ch.provenance || {},
        });
      }
    }

    const { chatCompletion } = await import('./services/ai-service');
    const customer = project.customer || {};
    const graph = project.graph || {};
    const filesForPrompt = vaultFiles.map((f: any) => ({
      id: f.id,
      filename: f.filename,
      kind: f.kind,
      tags: f.tags,
      extractedSummary: f.extracted?.summary || {},
    }));

    const system = [
      `You are EverWatt's Project Analyzer.`,
      `You MUST follow this rule: every extracted/inferred item must include provenance (fileId + page/sheet/cellRange if available), confidence (0..1), and needsConfirmation (true unless explicitly confirmed by user).`,
      `No fully automated takeoff claims. If you are unsure, set needsConfirmation=true and lower confidence.`,
      `Output STRICT JSON only (no markdown).`,
      `Return shape:`,
      `{`,
      `  "projectSummary": string,`,
      `  "eeScopeSummaryDraft": string,`,
      `  "inferredAssets": [{ "name": string, "category": string, "quantity": number|null, "unit": string|null, "provenance": { "fileId": string, "page": number|null, "sheet": string|null, "cellRange": string|null }, "confidence": number, "needsConfirmation": boolean }],`,
      `  "inferredMeasures": [{ "name": string, "category": string, "provenance": { "fileId": string, "page": number|null, "sheet": string|null, "cellRange": string|null }, "confidence": number, "needsConfirmation": boolean }],`,
      `  "missingInfoChecklist": string[],`,
      `  "suggestedNextSteps": string[]`,
      `}`,
    ].join('\n');

    const userPrompt = [
      `PROJECT:`,
      JSON.stringify(
        {
          id,
          customer,
          vaultFiles: filesForPrompt,
          existingGraph: graph,
          sampledEvidenceChunks: sampledChunks.slice(0, 40),
        },
        null,
        2
      ),
    ].join('\n\n');

    const res = await chatCompletion({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    });

    const raw = String(res.text || '');
    const jsonText = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
    const draft = JSON.parse(jsonText);

    const now = new Date().toISOString();
    const inbox = [
      ...(Array.isArray((project.graph || {}).inbox) ? (project.graph || {}).inbox : []),
      ...(Array.isArray(draft?.inferredAssets)
        ? draft.inferredAssets.map((x: any) => ({
            id: randomUUID(),
            kind: 'suggestedAsset',
            status: 'inferred',
            suggestedAsset: {
              // Analyzer doesn't reliably map asset types yet; leave undefined.
              name: x?.name ? String(x.name) : undefined,
              location: x?.location ? String(x.location) : undefined,
              tags: Array.isArray(x?.tags) ? x.tags.map((t: any) => String(t)) : undefined,
            },
            quantity: Number.isFinite(Number(x?.quantity)) ? Number(x.quantity) : null,
            unit: x?.unit ? String(x.unit) : null,
            provenance: x?.provenance || { fileId: 'unknown' },
            confidence: Number.isFinite(Number(x?.confidence)) ? Number(x.confidence) : 0.5,
            needsConfirmation: x?.needsConfirmation ?? true,
            createdAt: now,
          }))
        : []),
      ...(Array.isArray(draft?.inferredMeasures)
        ? draft.inferredMeasures.map((x: any) => ({
            id: randomUUID(),
            kind: 'suggestedMeasure',
            status: 'inferred',
            suggestedMeasure: {
              name: x?.name ? String(x.name) : undefined,
              category: x?.category ? String(x.category) : undefined,
            },
            provenance: x?.provenance || { fileId: 'unknown' },
            confidence: Number.isFinite(Number(x?.confidence)) ? Number(x.confidence) : 0.5,
            needsConfirmation: x?.needsConfirmation ?? true,
            createdAt: now,
          }))
        : []),
    ];

    // Keep the graph Phase-1 canonical and avoid schema drift.
    const nextGraph = canonicalizeProjectGraphPhase1({
      ...(project.graph || {}),
      inbox,
    });

    const eeScopeSummary = {
      status: 'draft',
      draftText: String(draft?.eeScopeSummaryDraft || ''),
      updatedAt: now,
    };

    await persistProjectInternal(userId, id, { graph: nextGraph, eeScopeSummary });
    return c.json({ success: true, draft, stored: { inboxAdded: inbox.length, eeScopeSummary } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Analyze failed';
    const status =
      msg === 'Unauthorized'
        ? 403
        : msg.includes('OPENAI_API_KEY')
          ? 501
          : 500;
    console.error('Project analyze error:', error);
    return c.json({ success: false, error: msg }, status as any);
  }
});

app.post('/api/projects/:id/ai/chat', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const id = c.req.param('id');
    const project = await loadProjectInternal(userId, id);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const body = await c.req.json().catch(() => ({}));
    const messages = Array.isArray((body as any)?.messages) ? (body as any).messages : [];
    const lastUser = [...messages].reverse().find((m: any) => m?.role === 'user');
    if (!lastUser?.content) return c.json({ success: false, error: 'messages must include a user prompt' }, 400);

    const vaultFiles = Array.isArray(project?.vault?.files) ? project.vault.files : [];
    const { getUserFile } = await import('./services/storage-service');

    const allChunks: Array<any> = [];
    for (const vf of vaultFiles.slice(0, 10)) {
      const chunksKey = (vf as any)?.chunks?.storageKey as string | undefined;
      if (!chunksKey) continue;
      const obj = await getUserFile({ userId, key: chunksKey });
      if (!obj) continue;
      const arr = JSON.parse(obj.body.toString('utf-8')) as any[];
      for (const ch of Array.isArray(arr) ? arr : []) {
        allChunks.push({
          fileId: String(vf.id),
          storageKey: String((vf as any).storageKey || ''),
          chunkIndex: Number(ch.chunkIndex || 0),
          text: String(ch.text || ''),
          provenance: ch.provenance || {},
        });
      }
    }

    const { retrieveChunksKeyword } = await import('./services/project-vault-retrieval');
    const top = retrieveChunksKeyword({
      query: String(lastUser.content || ''),
      chunks: allChunks,
      topK: 10,
    });

    const { chatCompletion } = await import('./services/ai-service');
    const system = [
      `You are EverWatt's Project Builder assistant.`,
      `You reason primarily over the Project Graph. Use Vault chunks as evidence when needed.`,
      `CRITICAL: Do not claim certainty when evidence is weak. If you infer a quantity, set it as a hypothesis and ask user to confirm.`,
      `Always cite provenance when stating extracted facts: fileId + page/sheet/cellRange.`,
    ].join('\n');

    const context = [
      `PROJECT_GRAPH_JSON:`,
      JSON.stringify(project.graph || {}, null, 2),
      `\nVAULT_FILES:`,
      JSON.stringify(
        vaultFiles.map((f: any) => ({
          id: f.id,
          filename: f.filename,
          kind: f.kind,
          tags: f.tags,
          extractedSummary: f.extracted?.summary || {},
        })),
        null,
        2
      ),
      `\nTOP_VAULT_CHUNKS:`,
      top
        .map(
          (c: any) =>
            `SOURCE fileId=${c.fileId} page=${c?.provenance?.page ?? ''} sheet=${c?.provenance?.sheet ?? ''}\n${String(c.text || '')}`
        )
        .join('\n\n---\n\n'),
    ].join('\n');

    const res = await chatCompletion({
      messages: [
        { role: 'system', content: system },
        { role: 'system', content: context },
        ...messages.filter((m: any) => m?.role !== 'system'),
      ],
      temperature: 0.2,
    });

    return c.json({
      success: true,
      text: res.text || '',
      model: res.model,
      sources: top.map((c: any) => ({ fileId: c.fileId, chunkIndex: c.chunkIndex, provenance: c.provenance })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'AI request failed';
    const status =
      msg === 'Unauthorized'
        ? 403
        : msg.includes('OPENAI_API_KEY')
          ? 501
          : 500;
    console.error('Project AI chat error:', error);
    return c.json({ success: false, error: msg }, status as any);
  }
});

app.get('/api/projects/:id/decision-memory', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const id = c.req.param('id');
    const project = await loadProjectInternal(userId, id);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    const items = Array.isArray(project.decisionMemory) ? project.decisionMemory : [];
    return c.json({ success: true, items });
  } catch (error) {
    console.error('List decision memory error:', error);
    return c.json({ success: false, error: 'Failed to list decision memory' }, 500);
  }
});

app.post('/api/projects/:id/decision-memory', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const id = c.req.param('id');
    const project = await loadProjectInternal(userId, id);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const body = await c.req.json().catch(() => ({}));
    const title = String((body as any)?.title || '').trim();
    const note = String((body as any)?.note || '').trim();
    const provenance = (body as any)?.provenance;
    if (!title) return c.json({ success: false, error: 'title is required' }, 400);
    if (!note) return c.json({ success: false, error: 'note is required' }, 400);

    const now = new Date().toISOString();
    const item = {
      id: randomUUID(),
      title,
      note,
      createdAt: now,
      updatedAt: now,
      ...(provenance ? { provenance } : {}),
    };

    const existing = Array.isArray(project.decisionMemory) ? project.decisionMemory : [];
    const next = [item, ...existing].slice(0, 500);
    const updated = await persistProjectInternal(userId, id, { decisionMemory: next });
    return c.json({ success: true, item, items: updated.decisionMemory || next });
  } catch (error) {
    console.error('Create decision memory error:', error);
    return c.json({ success: false, error: 'Failed to create decision memory' }, 500);
  }
});

app.delete('/api/projects/:id/decision-memory/:memoryId', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const id = c.req.param('id');
    const memoryId = c.req.param('memoryId');
    const project = await loadProjectInternal(userId, id);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const existing = Array.isArray(project.decisionMemory) ? project.decisionMemory : [];
    const next = existing.filter((x: any) => String(x?.id || '') !== String(memoryId || ''));
    const updated = await persistProjectInternal(userId, id, { decisionMemory: next });
    return c.json({ success: true, items: updated.decisionMemory || next });
  } catch (error) {
    console.error('Delete decision memory error:', error);
    return c.json({ success: false, error: 'Failed to delete decision memory' }, 500);
  }
});

/**
 * ==========================================
 * INTERNAL ENGINEERING REPORTS (append-only)
 * ==========================================
 *
 * V1: append-only JSON revisions stored on the project record, with deterministic HTML rendering.
 */

function stableStringifyV1(value: unknown): string {
  const seen = new WeakSet<object>();
  const normalize = (v: any): any => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map(normalize);
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) out[k] = normalize(v[k]);
    return out;
  };
  return JSON.stringify(normalize(value));
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

app.get('/api/projects/:id/reports/internal-engineering', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const id = c.req.param('id');
    const project = await loadProjectInternal(userId, id);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    const revisions = Array.isArray((project as any)?.reportsV1?.internalEngineering)
      ? (project as any).reportsV1.internalEngineering
      : [];
    return c.json({ success: true, revisions });
  } catch (error) {
    console.error('List internal engineering reports error:', error);
    return c.json({ success: false, error: 'Failed to list internal reports' }, 500);
  }
});

app.post('/api/projects/:id/reports/internal-engineering', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const id = c.req.param('id');
    const project = await loadProjectInternal(userId, id);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const body = await c.req.json().catch(() => ({}));
    const title = String((body as any)?.title || '').trim() || 'Internal Engineering Report (v1)';
    const reportJsonRaw = (body as any)?.reportJson;
    if (reportJsonRaw === null || reportJsonRaw === undefined) return c.json({ success: false, error: 'reportJson is required' }, 400);

    // Hardening: enforce server-side truth for projectId inside the snapshot JSON.
    // This guarantees stable deep links even if clients change/malfunction.
    const reportJson = (() => {
      const v = reportJsonRaw as any;
      if (v && typeof v === 'object') {
        if (Array.isArray(v)) return { projectId: id, items: v };
        return { ...v, projectId: id };
      }
      return { projectId: id, value: v };
    })();

    const now = new Date().toISOString();
    const reportHash = sha256Hex(stableStringifyV1(reportJson));
    const revision = {
      id: randomUUID(),
      createdAt: now,
      title,
      reportHash,
      reportJson,
    };

    const existingReports = (project as any)?.reportsV1 && typeof (project as any).reportsV1 === 'object' ? (project as any).reportsV1 : {};
    const existingRevisions = Array.isArray(existingReports?.internalEngineering) ? existingReports.internalEngineering : [];
    // Append-only: always create a new revision; keep a bounded history.
    const nextRevisions = [revision, ...existingRevisions].slice(0, 200);
    const nextReportsV1 = { ...existingReports, internalEngineering: nextRevisions };
    const updated = await persistProjectInternal(userId, id, { reportsV1: nextReportsV1 });
    return c.json({ success: true, revision, revisions: (updated as any)?.reportsV1?.internalEngineering || nextRevisions });
  } catch (error) {
    console.error('Append internal engineering report error:', error);
    return c.json({ success: false, error: 'Failed to append internal report' }, 500);
  }
});

app.get('/api/projects/:id/reports/internal-engineering/:revisionId.json', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const id = c.req.param('id');
    const revisionId = c.req.param('revisionId');
    const project = await loadProjectInternal(userId, id);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    const revisions = Array.isArray((project as any)?.reportsV1?.internalEngineering)
      ? (project as any).reportsV1.internalEngineering
      : [];
    const rev = revisions.find((r: any) => String(r?.id || '') === String(revisionId || ''));
    if (!rev) return c.json({ success: false, error: 'Report revision not found' }, 404);
    return c.json({ success: true, revision: rev });
  } catch (error) {
    console.error('Get internal engineering report json error:', error);
    return c.json({ success: false, error: 'Failed to load report json' }, 500);
  }
});

app.get('/api/projects/:id/reports/internal-engineering/:revisionId.html', async (c) => {
  try {
    const userId = getCurrentUserId(c);
    const id = c.req.param('id');
    const revisionId = c.req.param('revisionId');
    const project = await loadProjectInternal(userId, id);
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    const revisions = Array.isArray((project as any)?.reportsV1?.internalEngineering)
      ? (project as any).reportsV1.internalEngineering
      : [];
    const rev = revisions.find((r: any) => String(r?.id || '') === String(revisionId || ''));
    if (!rev) return c.json({ success: false, error: 'Report revision not found' }, 404);

    const { renderInternalEngineeringReportHtmlV1 } = await import('./modules/reports/internalEngineering/v1/renderInternalEngineeringReportHtml');
    const html = renderInternalEngineeringReportHtmlV1({
      project: {
        id,
        name: String((project as any)?.customer?.projectName || (project as any)?.customer?.companyName || '').trim() || undefined,
      },
      revision: {
        id: String((rev as any)?.id || ''),
        createdAt: String((rev as any)?.createdAt || ''),
        title: String((rev as any)?.title || ''),
        reportJson: (rev as any)?.reportJson,
        reportHash: String((rev as any)?.reportHash || ''),
      },
    });
    c.header('Content-Type', 'text/html; charset=utf-8');
    return c.body(html);
  } catch (error) {
    console.error('Render internal engineering report html error:', error);
    return c.json({ success: false, error: 'Failed to render report html' }, 500);
  }
});

app.get('/api/change-orders/next-number', async (c) => {
  const userId = getCurrentUserId(c);
  const projectId = String(c.req.query('projectId') || '').trim();
  if (!projectId) return c.json({ success: false, error: 'projectId is required' }, 400);

  if (isDatabaseEnabled()) {
    const { getNextChangeOrderNumber } = await import('./services/db-service');
    const nextNumber = await getNextChangeOrderNumber(userId, projectId);
    return c.json({ success: true, nextNumber });
  }

  const files = await readdir(CHANGE_ORDERS_DIR).catch(() => []);
  let max = 0;
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const raw = await readFile(path.join(CHANGE_ORDERS_DIR, f), 'utf-8').catch(() => '');
    if (!raw) continue;
    const rec = JSON.parse(raw) as any;
    if (rec?.userId !== userId) continue;
    if (rec?.projectId !== projectId) continue;
    const n = Number(rec?.changeOrderNumber || 0);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return c.json({ success: true, nextNumber: max + 1 });
});

app.post('/api/change-orders', async (c) => {
  const userId = getCurrentUserId(c);
  const body = await c.req.json().catch(() => ({}));
  const input = (body as any)?.input || {};
  const generateAiBody = Boolean((body as any)?.generateAiBody);
  const providedAiBody = (body as any)?.aiBody;

  const projectId = String(input?.projectId || '').trim();
  const driveFolderLink = String(input?.driveFolderLink || '').trim();
  const amountUsd = Number(input?.amountUsd || 0);
  const description = String(input?.description || '').trim();
  const customer = input?.customer || {};

  if (!projectId) return c.json({ success: false, error: 'input.projectId is required' }, 400);
  if (!driveFolderLink) return c.json({ success: false, error: 'input.driveFolderLink is required' }, 400);
  if (!String(customer?.projectNumber || '').trim()) return c.json({ success: false, error: 'input.customer.projectNumber is required' }, 400);
  if (!String(customer?.companyName || '').trim()) return c.json({ success: false, error: 'input.customer.companyName is required' }, 400);
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return c.json({ success: false, error: 'input.amountUsd must be > 0' }, 400);
  if (!description) return c.json({ success: false, error: 'input.description is required' }, 400);

  const id = randomUUID();
  const now = new Date().toISOString();
  let aiBody: unknown | undefined = undefined;

  if (providedAiBody) {
    aiBody = providedAiBody;
  } else if (generateAiBody) {
    const { generateChangeOrderAiBody } = await import('./services/change-order-ai-service');
    const res = await generateChangeOrderAiBody({
      projectId,
      driveFolderLink,
      customer,
      amountUsd,
      description,
      requestedBy: input?.requestedBy,
      salesNotes: input?.salesNotes,
      requestedEffectiveDate: input?.requestedEffectiveDate,
    });
    aiBody = res.aiBody;
  }

  if (isDatabaseEnabled()) {
    const { createChangeOrder } = await import('./services/db-service');
    const base: any = {
      id,
      projectId,
      changeOrderNumber: 0, // overwritten by DB
      driveFolderLink,
      customer,
      amountUsd,
      description,
      ...(aiBody ? { aiBody } : {}),
      metadata: { generatedAt: now },
      createdAt: now,
      updatedAt: now,
    };
    const changeOrder = await createChangeOrder(userId, { projectId, driveFolderLink, data: base, id });
    return c.json({ success: true, changeOrder });
  }

  // File-based persistence
  const files = await readdir(CHANGE_ORDERS_DIR).catch(() => []);
  let max = 0;
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const raw = await readFile(path.join(CHANGE_ORDERS_DIR, f), 'utf-8').catch(() => '');
    if (!raw) continue;
    const rec = JSON.parse(raw) as any;
    if (rec?.userId !== userId) continue;
    if (rec?.projectId !== projectId) continue;
    const n = Number(rec?.changeOrderNumber || 0);
    if (Number.isFinite(n) && n > max) max = n;
  }
  const changeOrderNumber = max + 1;

  const rec: any = {
    id,
    userId,
    projectId,
    changeOrderNumber,
    driveFolderLink,
    customer,
    amountUsd,
    description,
    ...(aiBody ? { aiBody } : {}),
    metadata: { generatedAt: now },
    createdAt: now,
    updatedAt: now,
  };
  await writeFile(path.join(CHANGE_ORDERS_DIR, `${id}.json`), JSON.stringify(rec, null, 2));
  const { userId: _omit, ...clientChangeOrder } = rec;
  return c.json({ success: true, changeOrder: clientChangeOrder });
});

app.post('/api/change-orders/ai', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const input = (body as any)?.input || {};

  const projectId = String(input?.projectId || '').trim();
  const driveFolderLink = String(input?.driveFolderLink || '').trim();
  const amountUsd = Number(input?.amountUsd || 0);
  const description = String(input?.description || '').trim();
  const customer = input?.customer || {};

  if (!projectId) return c.json({ success: false, error: 'input.projectId is required' }, 400);
  if (!driveFolderLink) return c.json({ success: false, error: 'input.driveFolderLink is required' }, 400);
  if (!String(customer?.projectNumber || '').trim()) return c.json({ success: false, error: 'input.customer.projectNumber is required' }, 400);
  if (!String(customer?.companyName || '').trim()) return c.json({ success: false, error: 'input.customer.companyName is required' }, 400);
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return c.json({ success: false, error: 'input.amountUsd must be > 0' }, 400);
  if (!description) return c.json({ success: false, error: 'input.description is required' }, 400);

  const { generateChangeOrderAiBody } = await import('./services/change-order-ai-service');
  const res = await generateChangeOrderAiBody({
    projectId,
    driveFolderLink,
    customer,
    amountUsd,
    description,
    requestedBy: input?.requestedBy,
    salesNotes: input?.salesNotes,
    requestedEffectiveDate: input?.requestedEffectiveDate,
  });

  return c.json({ success: true, aiBody: res.aiBody, model: res.model });
});

app.get('/api/change-orders', async (c) => {
  const userId = getCurrentUserId(c);
  const projectId = String(c.req.query('projectId') || '').trim();
  if (!projectId) return c.json({ success: false, error: 'projectId is required' }, 400);

  if (isDatabaseEnabled()) {
    const { listChangeOrders } = await import('./services/db-service');
    const changeOrders = await listChangeOrders(userId, projectId);
    return c.json({ success: true, changeOrders });
  }

  const files = await readdir(CHANGE_ORDERS_DIR).catch(() => []);
  const changeOrders: any[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const raw = await readFile(path.join(CHANGE_ORDERS_DIR, f), 'utf-8').catch(() => '');
    if (!raw) continue;
    const rec = JSON.parse(raw) as any;
    if (rec?.userId !== userId) continue;
    if (rec?.projectId !== projectId) continue;
    const { userId: _omit, ...clientChangeOrder } = rec;
    changeOrders.push(clientChangeOrder);
  }
  changeOrders.sort((a, b) => Number(b.changeOrderNumber || 0) - Number(a.changeOrderNumber || 0));
  return c.json({ success: true, changeOrders });
});

app.get('/api/change-orders/:id', async (c) => {
  const userId = getCurrentUserId(c);
  const id = c.req.param('id');
  if (isDatabaseEnabled()) {
    const { getChangeOrder } = await import('./services/db-service');
    const changeOrder = await getChangeOrder(userId, id);
    if (!changeOrder) return c.json({ success: false, error: 'Change order not found' }, 404);
    return c.json({ success: true, changeOrder });
  }

  const filePath = path.join(CHANGE_ORDERS_DIR, `${id}.json`);
  if (!existsSync(filePath)) return c.json({ success: false, error: 'Change order not found' }, 404);
  const rec = JSON.parse(await readFile(filePath, 'utf-8')) as any;
  if (rec?.userId !== userId) return c.json({ success: false, error: 'Change order not found' }, 404);
  const { userId: _omit, ...clientChangeOrder } = rec;
  return c.json({ success: true, changeOrder: clientChangeOrder });
});

app.put('/api/change-orders/:id', async (c) => {
  const userId = getCurrentUserId(c);
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const patch = (body as any)?.patch || body || {};

  if (isDatabaseEnabled()) {
    const { updateChangeOrder } = await import('./services/db-service');
    const changeOrder = await updateChangeOrder(userId, id, patch);
    return c.json({ success: true, changeOrder });
  }

  const filePath = path.join(CHANGE_ORDERS_DIR, `${id}.json`);
  if (!existsSync(filePath)) return c.json({ success: false, error: 'Change order not found' }, 404);
  const rec = JSON.parse(await readFile(filePath, 'utf-8')) as any;
  if (rec?.userId !== userId) return c.json({ success: false, error: 'Change order not found' }, 404);

  const merged = {
    ...rec,
    ...patch,
    id,
    customer: { ...(rec.customer || {}), ...(patch.customer || {}) },
    driveFolderLink: patch.driveFolderLink || rec.driveFolderLink,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(filePath, JSON.stringify(merged, null, 2));
  const { userId: _omit, ...clientChangeOrder } = merged;
  return c.json({ success: true, changeOrder: clientChangeOrder });
});

app.post('/api/change-orders/:id/upload', async (c) => {
  const userId = getCurrentUserId(c);
  const id = c.req.param('id');

  const body = await c.req.parseBody();
  const file = (body as any)?.file as File | undefined;
  if (!file) return c.json({ success: false, error: 'file is required' }, 400);

  // Load change order
  let co: any | null = null;
  if (isDatabaseEnabled()) {
    const { getChangeOrder } = await import('./services/db-service');
    co = await getChangeOrder(userId, id);
  } else {
    const filePath = path.join(CHANGE_ORDERS_DIR, `${id}.json`);
    if (existsSync(filePath)) {
      const rec = JSON.parse(await readFile(filePath, 'utf-8')) as any;
      if (rec?.userId === userId) {
        const { userId: _omit, ...clientCo } = rec;
        co = clientCo;
      }
    }
  }
  if (!co) return c.json({ success: false, error: 'Change order not found' }, 404);

  const projectId = String(co.projectId || '').trim();
  const coNum = Number(co.changeOrderNumber || 0);
  if (!projectId) return c.json({ success: false, error: 'Change order missing projectId' }, 500);
  if (!Number.isFinite(coNum) || coNum <= 0) return c.json({ success: false, error: 'Change order missing number' }, 500);

  const originalName = file.name || `change_order_${coNum}.bin`;
  const contentType = file.type || 'application/octet-stream';
  const buf = Buffer.from(await file.arrayBuffer());

  const { buildUserFileKeyAtPath, putUserFileAtKey } = await import('./services/storage-service');
  const key = buildUserFileKeyAtPath({
    userId,
    pathPrefix: `projects/${projectId}/change-orders/CO-${coNum}`,
    filename: originalName,
  });
  const stored = await putUserFileAtKey({ userId, key, originalName, contentType, body: buf });

  const ext =
    originalName.toLowerCase().endsWith('.docx') || contentType.includes('word')
      ? 'word'
      : originalName.toLowerCase().endsWith('.pdf') || contentType.includes('pdf')
        ? 'pdf'
        : 'pdf';
  const fileRef = {
    format: ext,
    filename: originalName,
    storageKey: stored.key,
    storageUrl: stored.url,
    uploadedAt: new Date().toISOString(),
  };

  // Persist file reference onto change order
  if (isDatabaseEnabled()) {
    const { updateChangeOrder } = await import('./services/db-service');
    const existingFiles = Array.isArray(co.files) ? co.files : [];
    const files = [...existingFiles, fileRef];
    const updated = await updateChangeOrder(userId, id, { files });
    return c.json({ success: true, file: fileRef, changeOrder: updated });
  }

  const coPath = path.join(CHANGE_ORDERS_DIR, `${id}.json`);
  if (!existsSync(coPath)) return c.json({ success: false, error: 'Change order not found' }, 404);
  const full = JSON.parse(await readFile(coPath, 'utf-8')) as any;
  if (full?.userId !== userId) return c.json({ success: false, error: 'Change order not found' }, 404);
  const merged = {
    ...full,
    files: [...(Array.isArray(full.files) ? full.files : []), fileRef],
    updatedAt: new Date().toISOString(),
  };
  await writeFile(coPath, JSON.stringify(merged, null, 2));
  const { userId: _omit, ...clientChangeOrder } = merged;
  return c.json({ success: true, file: fileRef, changeOrder: clientChangeOrder });
});

// Start server
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

declare global {
  // eslint-disable-next-line no-var
  var __everwattServer: HttpServer | undefined;
}

async function bootstrap() {
  try {
    if (isDatabaseEnabled()) {
      await ensureDatabaseSchema();
      console.log('✅ Database enabled and schema ensured');
    } else {
      console.log('ℹ️ Database disabled (set USE_DATABASE=true and DATABASE_URL to enable)');
    }
  } catch (e) {
    console.error('Database initialization failed:', e);
  }

  const store: any = process as any;
  const isWatch = Boolean(process.env.TSX_WATCH) || process.argv.some((a) => String(a || '').toLowerCase() === 'watch');

  const startServer = async (args: { closeExisting: boolean }) => {
    // Dev ergonomics: when running under a file-watcher (tsx watch), we can re-enter
    // `bootstrap()` within the same process. Ensure we close the previous listener
    // to avoid EADDRINUSE / intermittent API downtime during reloads.
    if (args.closeExisting && store.__everwattServer) {
      await new Promise<void>((resolve) => {
        try {
          store.__everwattServer?.close(() => resolve());
        } catch {
          resolve();
        }
      });
      store.__everwattServer = undefined;
    }

    // In Vitest (module isolation) and other re-import scenarios, avoid repeatedly
    // bootstrapping the API server within the same Node process.
    if (store.__everwattServer) return;

    // Warm library storage once on real server start (not on import).
    // Routes will also lazily initialize on-demand.
    await initializeLibraryStorage();

    const listener = getRequestListener(app.fetch);
    const server = createServer(listener);
    store.__everwattServer = server;

    // Attach error handler before listen so EADDRINUSE doesn't crash the process.
    server.on('error', (err: any) => {
      console.error('Server error:', err);
    });

    // Small retry loop helps on rapid restarts.
    const maxRetries = 5;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await new Promise<void>((resolve, reject) => {
          server.listen(port, () => resolve());
          server.once('error', reject);
        });
        console.log(`🚀 EverWatt Engine API Server running on http://localhost:${port}`);
        console.log(`📡 Health check: http://localhost:${port}/health`);
        console.log(`📊 Analyze endpoint: POST http://localhost:${port}/api/analyze`);

        // Non-fatal startup snapshot summary (decision-safety signal).
        try {
          const nowIso = new Date().toISOString();
          const utilities = ['PGE', 'SCE', 'SDGE'] as const;
          console.log('[tariffLibrary:v0] Tariff Library loaded:');
          for (const u of utilities) {
            const snap = await loadLatestSnapshot(u);
            if (!snap) {
              console.log(`  ${u}: (missing) → run: npm run tariffs:ingest:ca`);
              continue;
            }
            const stale = isSnapshotStale(snap.capturedAt, nowIso, 14);
            console.log(`  ${u}@${snap.versionTag} (${stale ? 'stale' : 'fresh'}) capturedAt=${snap.capturedAt} rates=${snap.rates?.length || 0}`);
          }
        } catch {
          // ignore
        }

        break;
      } catch (err: any) {
        if (err?.code === 'EADDRINUSE' && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 250));
          continue;
        }
        throw err;
      }
    }
  };

  if (!isWatch) {
    if (store.__everwattBootstrapPromise) return await store.__everwattBootstrapPromise;
    store.__everwattBootstrapPromise = startServer({ closeExisting: false });
    return await store.__everwattBootstrapPromise;
  }

  await startServer({ closeExisting: true });
}

// Only start the network listener when this file is the entrypoint.
// Unit tests import `app` and call `app.request(...)` without needing a live port.
try {
  const thisFile = path.resolve(fileURLToPath(import.meta.url));
  const entry = path.resolve(String(process.argv[1] || ''));
  if (thisFile === entry) {
    bootstrap();
  }
} catch {
  // If we can't determine entrypoint, default to starting (backwards compatible).
  bootstrap();
}

export default app;

