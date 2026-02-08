import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, FileText } from 'lucide-react';

import * as tariffsApi from '../shared/api/tariffs';
import * as utilitiesApi from '../shared/api/utilities';
import * as programsApi from '../shared/api/programs';
import {
  deriveWhyMissingReasonCodesV1,
  filterTariffRatesForDisplayVNext,
  formatUtilityCardAsOfV1,
  formatUtilityCardLastChangeV1,
  getTariffAcquisitionMethodForCommodityV1,
  shouldShowManualIngestBannerV1,
} from './tariffBrowserTruth';

function badgeClass(tone: 'gray' | 'green' | 'amber'): string {
  switch (tone) {
    case 'green':
      return 'bg-green-100 text-green-800';
    case 'amber':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function shortIso(s: unknown): string {
  const t = String(s ?? '').trim();
  if (!t) return '—';
  return t.length > 24 ? `${t.slice(0, 24)}…` : t;
}

export const TariffBrowserCA: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<tariffsApi.CaTariffsLatestResponse | tariffsApi.CaGasTariffsLatestResponse | null>(null);
  const [utilityRegistry, setUtilityRegistry] = useState<utilitiesApi.UtilitiesCaRegistryResponse | null>(null);
  const [programs, setPrograms] = useState<programsApi.CaProgramsLatestResponse | null>(null);

  const initialUtility = (() => String(searchParams.get('utility') || '').trim().toUpperCase() || 'all')();
  const initialSnapshot = String(searchParams.get('snapshot') || '').trim();
  const initialHighlightRate = String(searchParams.get('rate') || '').trim();
  const initialCommodity = String(searchParams.get('commodity') || '').trim().toLowerCase() === 'gas' ? 'gas' : 'electric';

  const [commodity, setCommodity] = useState<'electric' | 'gas'>(initialCommodity as any);
  const [utilityFilter, setUtilityFilter] = useState<'all' | string>(initialUtility as any);
  const [query, setQuery] = useState(String(searchParams.get('q') || '').trim());
  const [incompleteOnly, setIncompleteOnly] = useState<boolean>(String(searchParams.get('incomplete') || '').trim() === '1');

  // Non-residential-first defaults (operator-friendly).
  const [businessOnly, setBusinessOnly] = useState<boolean>(true);
  const [includeResidential, setIncludeResidential] = useState<boolean>(false);
  const [includeUnknownSegment, setIncludeUnknownSegment] = useState<boolean>(false);
  const [sectorAllow, setSectorAllow] = useState<Record<string, boolean>>({
    commercial: true,
    industrial: true,
    agricultural: true,
    institutional: true,
    government: true,
    other: true,
    unknown: false,
  });
  const [tier, setTier] = useState<'featured' | 'common' | 'all'>('featured');
  const [includeHidden, setIncludeHidden] = useState<boolean>(false);
  const [canonOnly, setCanonOnly] = useState<boolean>(true);
  const [highlightRateCode] = useState(initialHighlightRate);
  const [snapshotHistory, setSnapshotHistory] = useState<any[]>([]);
  const [selectedSnapshotTag, setSelectedSnapshotTag] = useState<string>(initialSnapshot);
  const [selectedSnapshot, setSelectedSnapshot] = useState<any | null>(null);
  const [selectedSnapshotStale, setSelectedSnapshotStale] = useState<boolean>(false);
  const [previousSnapshot, setPreviousSnapshot] = useState<any | null>(null);
  const [selectedRate, setSelectedRate] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const tariffReq = commodity === 'gas' ? tariffsApi.getLatestCaGasTariffs() : tariffsApi.getLatestCaTariffs();
        const [res, reg, progs] = await Promise.all([tariffReq as any, utilitiesApi.getUtilitiesCaRegistry(), programsApi.getLatestCaPrograms({ allowResidential: includeResidential })]);
        if (!cancelled) {
          setData(res);
          setUtilityRegistry(reg);
          setPrograms(progs);
          setSnapshotHistory([]);
          setSelectedSnapshot(null);
          setPreviousSnapshot(null);
          setSelectedRate(null);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load CA tariff snapshots';
        const u = String(utilityFilter || 'all');
        const snap = String(selectedSnapshotTag || '').trim();
        if (!cancelled) setError(`[tariffs-ca] utility=${u} snapshot=${snap || 'latest'} — ${msg}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [commodity]);

  // Programs are policy-filtered (residential excluded by default). Refetch when toggle changes.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const progs = await programsApi.getLatestCaPrograms({ allowResidential: includeResidential });
        if (!cancelled) setPrograms(progs);
      } catch {
        // Keep quiet; the main page error banner is for tariffs snapshot loading.
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [includeResidential]);

  const utilities = data?.utilities || [];
  const allMissing = utilities.length > 0 && utilities.every((u) => !u.latestSnapshot || !String(u.latestSnapshot.versionTag || '').trim());

  const latestFlatRates = useMemo(() => {
    const rows: Array<{
      utility: string;
      rateCode: string;
      sourceTitle: string;
      sourceUrl: string;
      customerClass?: string;
      customerClassSource?: string;
      voltage?: string;
      voltageSource?: string;
      eligibilityNotes?: string;
      eligibilitySource?: string;
      effectiveStart?: string | null;
      effectiveEnd?: string | null;
      effectiveSource?: string;
      customerSegment?: string;
      customerSegmentSource?: string;
      popularityTier?: string;
      curationHidden?: boolean;
      curationNotes?: string;
      preferredForEverWatt?: boolean;
      businessFamilyKey?: string | null;
      isEverWattCanonicalBusiness?: boolean;
      isBusinessRelevant?: boolean;
      effectiveStatus?: string;
      evidence?: any[];
    }> = [];
    for (const u of utilities) {
      for (const r of u.rates || []) {
        rows.push({
          utility: u.utility,
          rateCode: String(r.rateCode || '').trim(),
          sourceTitle: String(r.sourceTitle || '').trim(),
          sourceUrl: String(r.sourceUrl || '').trim(),
          customerClass: String((r as any).customerClass || '').trim() || undefined,
          customerClassSource: String((r as any).customerClassSource || '').trim() || undefined,
          voltage: String((r as any).voltage || '').trim() || undefined,
          voltageSource: String((r as any).voltageSource || '').trim() || undefined,
          eligibilityNotes: String((r as any).eligibilityNotes || '').trim() || undefined,
          eligibilitySource: String((r as any).eligibilitySource || '').trim() || undefined,
          effectiveStart: (r as any).effectiveStart ?? null,
          effectiveEnd: (r as any).effectiveEnd ?? null,
          effectiveSource: String((r as any).effectiveSource || '').trim() || undefined,
          customerSegment: String((r as any).customerSegment || '').trim() || undefined,
          customerSegmentSource: String((r as any).customerSegmentSource || '').trim() || undefined,
          popularityTier: String((r as any).popularityTier || '').trim() || undefined,
          curationHidden: Boolean((r as any).curationHidden),
          curationNotes: String((r as any).curationNotes || '').trim() || undefined,
          preferredForEverWatt: Boolean((r as any).preferredForEverWatt),
          businessFamilyKey: (r as any).businessFamilyKey ?? null,
          isEverWattCanonicalBusiness: Boolean((r as any).isEverWattCanonicalBusiness),
          isBusinessRelevant: Boolean((r as any).isBusinessRelevant),
          effectiveStatus: String((r as any).effectiveStatus || '').trim() || undefined,
          evidence: Array.isArray((r as any).evidence) ? (r as any).evidence : [],
        });
      }
    }
    return rows;
  }, [utilities]);

  const selectedSnapshotRates = useMemo(() => {
    const snap = selectedSnapshot;
    const rates = Array.isArray(snap?.rates) ? snap.rates : [];
    const rows: Array<{
      utility: string;
      rateCode: string;
      sourceTitle: string;
      sourceUrl: string;
      customerClass?: string;
      customerClassSource?: string;
      voltage?: string;
      voltageSource?: string;
      eligibilityNotes?: string;
      eligibilitySource?: string;
      effectiveStart?: string | null;
      effectiveEnd?: string | null;
      effectiveSource?: string;
      customerSegment?: string;
      customerSegmentSource?: string;
      popularityTier?: string;
      curationHidden?: boolean;
      curationNotes?: string;
      preferredForEverWatt?: boolean;
      businessFamilyKey?: string | null;
      isEverWattCanonicalBusiness?: boolean;
      isBusinessRelevant?: boolean;
      effectiveStatus?: string;
      evidence?: any[];
    }> = [];
    for (const r of rates) {
      rows.push({
        utility: String(snap?.utility || utilityFilter) as any,
        rateCode: String(r?.rateCode || '').trim(),
        sourceTitle: String(r?.sourceTitle || '').trim(),
        sourceUrl: String(r?.sourceUrl || '').trim(),
        customerClass: String(r?.customerClass || '').trim() || undefined,
        customerClassSource: String((r as any)?.customerClassSource || '').trim() || undefined,
        voltage: String(r?.voltage || '').trim() || undefined,
        voltageSource: String((r as any)?.voltageSource || '').trim() || undefined,
        eligibilityNotes: String(r?.eligibilityNotes || '').trim() || undefined,
        eligibilitySource: String((r as any)?.eligibilitySource || '').trim() || undefined,
        effectiveStart: r?.effectiveStart ?? null,
        effectiveEnd: r?.effectiveEnd ?? null,
        effectiveSource: String((r as any)?.effectiveSource || '').trim() || undefined,
        customerSegment: String((r as any)?.customerSegment || '').trim() || undefined,
        customerSegmentSource: String((r as any)?.customerSegmentSource || '').trim() || undefined,
        popularityTier: String((r as any)?.popularityTier || '').trim() || undefined,
        curationHidden: Boolean((r as any)?.curationHidden),
        curationNotes: String((r as any)?.curationNotes || '').trim() || undefined,
        preferredForEverWatt: Boolean((r as any)?.preferredForEverWatt),
        businessFamilyKey: (r as any)?.businessFamilyKey ?? null,
        isEverWattCanonicalBusiness: Boolean((r as any)?.isEverWattCanonicalBusiness),
        isBusinessRelevant: Boolean((r as any)?.isBusinessRelevant),
        effectiveStatus: String((r as any)?.effectiveStatus || '').trim() || undefined,
        evidence: Array.isArray((r as any)?.evidence) ? (r as any).evidence : [],
      });
    }
    return rows;
  }, [selectedSnapshot, utilityFilter]);

  const isIouUtility = utilityFilter === 'PGE' || utilityFilter === 'SCE' || utilityFilter === 'SDGE' || utilityFilter === 'SOCALGAS';
  const effectiveRates = utilityFilter === 'all' ? latestFlatRates : selectedSnapshotRates;

  const filteredRates = useMemo(() => {
    let rows = filterTariffRatesForDisplayVNext({
      rates: effectiveRates,
      businessOnly,
      includeResidential,
      includeUnknownSegment,
      tier,
      includeHidden,
      canonOnly: commodity === 'gas' ? false : canonOnly,
    });
    const isIncomplete = (r: any) => {
      const cc = String(r.customerClass || '').trim();
      const vv = String(r.voltage || '').trim();
      const en = String(r.eligibilityNotes || '').trim();
      const es = String(r.effectiveStart || '').trim();
      const ee = String(r.effectiveEnd || '').trim();
      const voltageCounts = commodity === 'electric';
      return cc === '' || cc === 'unknown' || (voltageCounts ? vv === '' || vv === 'unknown' : false) || en === '' || (!es && !ee);
    };
    if (incompleteOnly) rows = rows.filter((r) => isIncomplete(r));
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const hay = `${r.rateCode} ${r.sourceTitle} ${r.sourceUrl} ${r.customerClass || ''} ${r.voltage || ''} ${r.eligibilityNotes || ''}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return rows.sort((a, b) => a.utility.localeCompare(b.utility) || a.rateCode.localeCompare(b.rateCode));
  }, [effectiveRates, businessOnly, includeResidential, includeUnknownSegment, tier, includeHidden, canonOnly, incompleteOnly, query, commodity]);

  function SourceBadge(props: { source?: string }) {
    const s = String(props.source || '').toLowerCase();
    if (!s || s === 'explicit' || s === 'unknown') return null;
    const label = s === 'inferred' ? 'INFERRED' : s === 'pdf' ? 'PDF' : s === 'parsed' ? 'PARSED' : s.toUpperCase();
    return <span className="ml-2 inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">{label}</span>;
  }

  const selectedUtilityEntry = useMemo(() => {
    if (utilityFilter === 'all') return null;
    return (utilityRegistry?.utilities || []).find((x) => String(x.utilityKey).toUpperCase() === String(utilityFilter).toUpperCase()) || null;
  }, [utilityFilter, utilityRegistry]);

  // When a specific utility is selected, load history and default to latest snapshot.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!data) return;
      if (utilityFilter === 'all') {
        setSnapshotHistory([]);
        setSelectedSnapshot(null);
        setSelectedSnapshotStale(false);
        return;
      }
      if (!isIouUtility) {
        setSnapshotHistory([]);
        setSelectedSnapshot(null);
        setSelectedSnapshotStale(false);
        return;
      }
      try {
        const hist =
          commodity === 'gas'
            ? await tariffsApi.getCaGasTariffHistory({ utility: utilityFilter as any })
            : await tariffsApi.getCaTariffHistory({ utility: utilityFilter as any });
        if (cancelled) return;
        setSnapshotHistory(hist.snapshots || []);

        const latestTag =
          String(data.utilities.find((u) => u.utility === (utilityFilter as any))?.latestSnapshot?.versionTag || '').trim() ||
          String((hist.snapshots || [])[hist.snapshots.length - 1]?.versionTag || '').trim();
        const want = String(selectedSnapshotTag || '').trim() || latestTag;
        setSelectedSnapshotTag(want);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load tariff snapshot history');
        setSnapshotHistory([]);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [utilityFilter, data, isIouUtility, commodity]);

  // Load the selected snapshot details (rates list) when tag changes.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (utilityFilter === 'all') return;
      const tag = String(selectedSnapshotTag || '').trim();
      if (!tag) return;
      try {
        const snap =
          commodity === 'gas'
            ? await tariffsApi.getCaGasTariffSnapshot({ utility: utilityFilter as any, versionTag: tag })
            : await tariffsApi.getCaTariffSnapshot({ utility: utilityFilter as any, versionTag: tag });
        if (cancelled) return;
        setSelectedSnapshot(snap.snapshot || null);
        setSelectedSnapshotStale(Boolean(snap.isStale));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load tariff snapshot');
        setSelectedSnapshot(null);
        setSelectedSnapshotStale(true);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [utilityFilter, selectedSnapshotTag, commodity]);

  // Load previous snapshot (for provenance diffs) when available.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (utilityFilter === 'all') return;
      const prevTag = String(selectedSnapshot?.diffFromPrevious?.previousVersionTag || '').trim();
      if (!prevTag) {
        setPreviousSnapshot(null);
        return;
      }
      try {
        const prev =
          commodity === 'gas'
            ? await tariffsApi.getCaGasTariffSnapshot({ utility: utilityFilter as any, versionTag: prevTag })
            : await tariffsApi.getCaTariffSnapshot({ utility: utilityFilter as any, versionTag: prevTag });
        if (cancelled) return;
        setPreviousSnapshot(prev.snapshot || null);
      } catch {
        if (cancelled) return;
        setPreviousSnapshot(null);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [utilityFilter, selectedSnapshot, commodity]);

  const snapshotDiff = useMemo(() => {
    const d = selectedSnapshot?.diffFromPrevious;
    if (!d) return null;
    const added = Array.isArray(d.addedRateCodes) ? d.addedRateCodes : [];
    const removed = Array.isArray(d.removedRateCodes) ? d.removedRateCodes : [];
    const unchanged = Array.isArray(d.unchangedRateCodes) ? d.unchangedRateCodes : [];
    return { previousVersionTag: String(d.previousVersionTag || ''), added, removed, unchanged };
  }, [selectedSnapshot]);

  const fingerprintDiff = useMemo(() => {
    const cur = Array.isArray(selectedSnapshot?.sourceFingerprints) ? selectedSnapshot.sourceFingerprints : [];
    const prev = Array.isArray(previousSnapshot?.sourceFingerprints) ? previousSnapshot.sourceFingerprints : [];
    const curByUrl = new Map(cur.map((x: any) => [String(x?.url || ''), String(x?.contentHash || '')]));
    const prevByUrl = new Map(prev.map((x: any) => [String(x?.url || ''), String(x?.contentHash || '')]));

    const changed: Array<{ url: string; from: string; to: string }> = [];
    const added: Array<{ url: string; to: string }> = [];
    const removed: Array<{ url: string; from: string }> = [];

    for (const [url, to] of curByUrl.entries()) {
      if (!url) continue;
      if (!prevByUrl.has(url)) added.push({ url, to });
      else {
        const from = String(prevByUrl.get(url) || '');
        if (from && to && from !== to) changed.push({ url, from, to });
      }
    }
    for (const [url, from] of prevByUrl.entries()) {
      if (!url) continue;
      if (!curByUrl.has(url)) removed.push({ url, from });
    }

    changed.sort((a, b) => a.url.localeCompare(b.url));
    added.sort((a, b) => a.url.localeCompare(b.url));
    removed.sort((a, b) => a.url.localeCompare(b.url));
    return { changed, added, removed };
  }, [selectedSnapshot, previousSnapshot]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button onClick={() => navigate('/utilities')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Utilities & Programs</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Tariffs (CA)</h1>
              <p className="text-slate-500">Read-only browser backed by Tariff Library snapshots (metadata only).</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          Note: For Community Choice Aggregation (CCA) or Direct Access (ESP) customers, generation rates may differ from IOU tariff schedules.
        </div>

        {utilityRegistry?.utilities?.length ? (
          <div className="bg-white rounded-lg border border-slate-200 p-4 text-sm text-slate-800">
            <div className="font-semibold">Coverage gaps (registry vs snapshots)</div>
            <div className="text-slate-600 mt-1 text-xs">
              Utilities in the CA registry that do not have automated tariff snapshots available in this browser yet (truthful: these may require manual ingest).
            </div>
            <div className="mt-2 text-xs text-slate-700">
              {(() => {
                const registry = utilityRegistry?.utilities || [];
                const selectedCommodity = commodity === 'gas' ? 'GAS' : 'ELECTRIC';
                const have = new Set((data?.utilities || []).filter((u) => u?.latestSnapshot?.versionTag).map((u) => String(u.utility).toUpperCase()));
                const gaps = registry
                  .filter((u) => String(u.state || '').toUpperCase() === 'CA')
                  .filter((u) => {
                    const cs = Array.isArray((u as any)?.commodities) ? ((u as any).commodities as string[]) : [];
                    return !cs.length ? true : cs.map((x) => String(x).toUpperCase()).includes(selectedCommodity);
                  })
                  .filter((u) => !have.has(String(u.utilityKey).toUpperCase()))
                  .slice()
                  .sort((a, b) => String(a.utilityKey).localeCompare(String(b.utilityKey)));
                if (!gaps.length) return <div>(No gaps detected.)</div>;
                return (
                  <div>
                    <div className="text-slate-600 mb-1">Missing snapshots: {gaps.length}</div>
                    <ul className="list-disc ml-5 space-y-1">
                      {gaps.slice(0, 18).map((u) => (
                        <li key={u.utilityKey}>
                          <span className="font-mono">{u.utilityKey}</span> ({String((u as any).utilityType || (u as any).type || '').toUpperCase() || 'UNKNOWN'}) —{' '}
                          <span className="font-mono">{String(getTariffAcquisitionMethodForCommodityV1(u as any, commodity) || 'UNKNOWN')}</span>
                        </li>
                      ))}
                      {gaps.length > 18 ? <li>(…and {gaps.length - 18} more)</li> : null}
                    </ul>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : null}

        {utilityFilter !== 'all' &&
          (() => {
            const u = selectedUtilityEntry;
            const method = String(getTariffAcquisitionMethodForCommodityV1(u as any, commodity) || '').toUpperCase();
            if (u && shouldShowManualIngestBannerV1(u as any, commodity)) {
              return (
                <div className="bg-white rounded-lg border border-slate-200 p-4 text-sm text-slate-800">
                  <div className="font-semibold">Tariff acquisition: {method || 'UNKNOWN'}</div>
                  <div className="text-slate-600 mt-1">Manual ingest required / automation not implemented for this utility (truthful coverage banner).</div>
                </div>
              );
            }
            return null;
          })()}

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Filter by rate code, title, or notes…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">Commodity</label>
              <select
                value={commodity}
                onChange={(e) => {
                  const v = String(e.target.value) === 'gas' ? 'gas' : 'electric';
                  setCommodity(v as any);
                  setUtilityFilter('all' as any);
                  setSelectedSnapshotTag('');
                  setSectorAllow((prev) => ({ ...prev, unknown: false }));
                  setIncludeUnknownSegment(false);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="electric">Electric</option>
                <option value="gas">Gas</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">Utility</label>
              <select
                value={utilityFilter}
                onChange={(e) => setUtilityFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                {(utilityRegistry?.utilities || [])
                  .filter((u) => String(u.state).toUpperCase() === 'CA')
                  .filter((u) => {
                    const cs = Array.isArray((u as any)?.commodities) ? ((u as any).commodities as any[]) : [];
                    if (!cs.length) return true;
                    const want = commodity === 'gas' ? 'GAS' : 'ELECTRIC';
                    return cs.map((x) => String(x).toUpperCase()).includes(want);
                  })
                  .sort(
                    (a, b) =>
                      String((a as any).utilityType || (a as any).type).localeCompare(String((b as any).utilityType || (b as any).type)) ||
                      String(a.displayName).localeCompare(String(b.displayName)),
                  )
                  .map((u) => (
                    <option key={u.utilityKey} value={u.utilityKey}>
                      {u.utilityKey} ({(u as any).utilityType || (u as any).type})
                    </option>
                  ))}
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">Snapshot</label>
              <select
                value={selectedSnapshotTag}
                onChange={(e) => setSelectedSnapshotTag(e.target.value)}
                disabled={utilityFilter === 'all' || snapshotHistory.length === 0}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                title={utilityFilter === 'all' ? 'Select a utility to choose a snapshot.' : snapshotHistory.length ? '' : 'No snapshots found.'}
              >
                {(snapshotHistory.length ? snapshotHistory : [{ versionTag: '—', capturedAt: '', rateCount: 0, isStale: true, diffSummary: null, sourceFingerprints: [] }]).map((s) => (
                  <option key={s.versionTag} value={s.versionTag}>
                    {s.versionTag}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 select-none">
                <input type="checkbox" checked={businessOnly} onChange={(e) => {
                  const v = e.target.checked;
                  setBusinessOnly(v);
                  if (v) {
                    setIncludeResidential(false);
                  }
                }} />
                Non-residential only
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 select-none">
                <input type="checkbox" checked={includeResidential} disabled={businessOnly} onChange={(e) => setIncludeResidential(e.target.checked)} />
                Include residential
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={includeUnknownSegment}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setIncludeUnknownSegment(v);
                    setSectorAllow((prev) => ({ ...prev, unknown: v }));
                  }}
                />
                Include unknown
              </label>
              <div className="flex items-center gap-3 text-xs text-slate-700">
                <span className="select-none font-semibold">Sectors:</span>
                {([
                  ['commercial', 'Commercial'],
                  ['industrial', 'Industrial'],
                  ['agricultural', 'Ag'],
                  ['institutional', 'Institutional'],
                  ['government', 'Gov'],
                  ['unknown', 'Unknown'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="inline-flex items-center gap-1 select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(sectorAllow[key])}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setSectorAllow((prev) => ({ ...prev, [key]: v }));
                        if (key === 'unknown') setIncludeUnknownSegment(v);
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span className="select-none">Tier</span>
                <select value={tier} onChange={(e) => setTier(e.target.value as any)} className="px-2 py-1 border border-slate-300 rounded-md text-sm">
                  <option value="featured">Featured</option>
                  <option value="common">Common</option>
                  <option value="all">All</option>
                </select>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 select-none">
                <input type="checkbox" checked={includeHidden} onChange={(e) => setIncludeHidden(e.target.checked)} />
                Include hidden
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 select-none">
                <input type="checkbox" checked={canonOnly} disabled={commodity === 'gas'} onChange={(e) => setCanonOnly(e.target.checked)} />
                Canon only
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 select-none">
                <input type="checkbox" checked={incompleteOnly} onChange={(e) => setIncompleteOnly(e.target.checked)} />
                Show incomplete only
              </label>
            </div>

            <div className="text-xs text-slate-500">
              {(() => {
                const util = utilityFilter === 'all' ? null : utilityFilter;
                const u = util ? data?.utilities?.find((x) => x.utility === util) : null;
                const comp = u?.latestSnapshot?.metadataCompleteness || null;

                const base = util ? selectedSnapshotRates : latestFlatRates;
                const total = base.length;
                const shownRows = filterTariffRatesForDisplayVNext({
                  rates: base,
                  businessOnly,
                  includeResidential,
                  includeUnknownSegment,
                  sectors: Object.entries(sectorAllow)
                    .filter(([, v]) => Boolean(v))
                    .map(([k]) => String(k)),
                  tier,
                  includeHidden,
                  canonOnly: commodity === 'gas' ? false : canonOnly,
                });

                function sectorGroupOf(r: any): string {
                  const sg = String(r?.sectorGroup || '').trim();
                  if (sg) return sg;
                  const seg = String(r?.customerSegment || 'unknown');
                  return seg === 'residential' ? 'residential' : seg === 'unknown' ? 'unknown' : 'non_residential';
                }

                const shownNonRes = shownRows.filter((r: any) => sectorGroupOf(r) === 'non_residential').length;
                const hiddenTotal = base.filter((r: any) => Boolean(r.curationHidden)).length;
                const canonBusinessTotal = base.filter((r: any) => Boolean(r.isBusinessRelevant) && Boolean(r.isEverWattCanonicalBusiness)).length;
                const cur = (data as any)?.curationStatus?.tariffCuration || null;
                const curPath = cur?.loadedFromPath ? String(cur.loadedFromPath).split(/[/\\\\]/).slice(-3).join('/') : '';
                const curAt = String(cur?.capturedAtIso || '').trim();

                const excludedHidden = includeHidden ? 0 : hiddenTotal;
                const residentialExcluded = businessOnly || !includeResidential ? base.filter((r: any) => sectorGroupOf(r) === 'residential').length : 0;
                const unknownExcluded = businessOnly || !includeUnknownSegment ? base.filter((r: any) => sectorGroupOf(r) === 'unknown').length : 0;

                const selectedSectors = new Set(
                  Object.entries(sectorAllow)
                    .filter(([, v]) => Boolean(v))
                    .map(([k]) => String(k).toLowerCase()),
                );
                const sectorExcluded =
                  selectedSectors.size === 0
                    ? 0
                    : base.filter((r: any) => {
                        const sg = sectorGroupOf(r);
                        if (sg !== 'non_residential') return false;
                        const seg = String((r as any)?.customerSegment || 'unknown').trim().toLowerCase() || 'unknown';
                        return !selectedSectors.has(seg);
                      }).length;
                const nonCanonExcluded = canonOnly ? base.filter((r: any) => Boolean(r.isBusinessRelevant) && !Boolean(r.isEverWattCanonicalBusiness)).length : 0;
                return (
                  <span>
                    {`Shown non-res: ${shownNonRes} / ${total}`}
                    {canonOnly ? ` • Canon business total: ${canonBusinessTotal}` : ''}
                    {` • Hidden by curation: ${hiddenTotal}`}
                    {` • Excluded: hidden=${excludedHidden} residential=${residentialExcluded} unknown=${unknownExcluded} sector=${sectorExcluded} non-canon=${nonCanonExcluded}`}
                    {curPath ? ` • Curation: ${curPath}${curAt ? ` @ ${shortIso(curAt)}` : ''}` : ''}
                    {comp ? ` • Completeness: class ${(comp.customerClassPct * 100).toFixed(0)}% • voltage ${(comp.voltagePct * 100).toFixed(0)}% • effective ${(comp.effectiveDatePct * 100).toFixed(0)}% • eligibility ${(comp.eligibilityNotesPct * 100).toFixed(0)}%` : null}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>

        {error && <div className="bg-white rounded-lg border border-red-200 p-4 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {utilities.map((u) => (
            <div key={u.utility} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{u.utility}</div>
                  <div className="text-xs text-slate-600 mt-1">Snapshot: {u.latestSnapshot?.versionTag ? String(u.latestSnapshot.versionTag) : '—'}</div>
                  <div className="text-xs text-slate-600">Captured: {shortIso(u.latestSnapshot?.capturedAt)}</div>
                  <div className="text-xs text-slate-600">As of: {shortIso(formatUtilityCardAsOfV1(u.latestSnapshot?.capturedAt))}</div>
                  <div className="text-xs text-slate-600">Rates: {Number.isFinite(u.latestSnapshot?.rateCount) ? String(u.latestSnapshot?.rateCount) : String(u.rates?.length || 0)}</div>
                  <div className="text-xs text-slate-600">
                    Programs (non-res):{' '}
                    {(() => {
                      const entry = (programs?.utilities || []).find((x) => String(x.utilityKey).toUpperCase() === String(u.utility).toUpperCase()) || null;
                      const n = entry?.latestSnapshot?.programCount;
                      return Number.isFinite(n) ? String(n) : '—';
                    })()}
                  </div>
                  {Number.isFinite((u.latestSnapshot as any)?.businessRelevantShownCount) && Number.isFinite((u.latestSnapshot as any)?.totalRateCount) && (
                    <div className="text-xs text-slate-600">
                      Shown business: {String((u.latestSnapshot as any)?.businessRelevantShownCount)} / {String((u.latestSnapshot as any)?.totalRateCount)}
                    </div>
                  )}
                  {Number.isFinite((u.latestSnapshot as any)?.hiddenByCurationCount) && <div className="text-xs text-slate-600">Hidden by curation: {String((u.latestSnapshot as any)?.hiddenByCurationCount)}</div>}
                  {u.latestSnapshot?.diffSummary && (
                    <div className="text-xs text-slate-600 mt-1">
                      Changes: +{u.latestSnapshot.diffSummary.addedRateCodes} / -{u.latestSnapshot.diffSummary.removedRateCodes}
                    </div>
                  )}
                  <div className="text-xs text-slate-600 mt-1">
                    {formatUtilityCardLastChangeV1({
                      previousVersionTag: (u.latestSnapshot as any)?.previousVersionTag,
                      lastChangeDetected: (u.latestSnapshot as any)?.lastChangeDetected,
                    })}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${badgeClass(u.latestSnapshot?.isStale ? 'amber' : u.latestSnapshot ? 'green' : 'gray')}`}>
                  Stale: {u.latestSnapshot ? (u.latestSnapshot.isStale ? 'Yes' : 'No') : '—'}
                </span>
              </div>
              {u.warning && <div className="text-xs text-slate-500 mt-3">{String(u.warning)}</div>}
            </div>
          ))}
        </div>

        {(loading || !data) && <div className="text-sm text-slate-600">Loading…</div>}

        {data && allMissing && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 text-sm text-slate-700">
            Tariff snapshots not loaded. Run ingestion: <span className="font-mono">npm run tariffs:ingest:ca</span>
          </div>
        )}

        {utilityFilter !== 'all' && (!selectedSnapshot || !String(selectedSnapshot?.versionTag || '').trim()) && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 text-sm text-slate-700">
            Tariff snapshots not loaded for {utilityFilter}. Run ingestion: <span className="font-mono">npm run tariffs:ingest:ca</span>
          </div>
        )}

        {utilityFilter !== 'all' && snapshotHistory.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-900 mb-3">Snapshot history ({utilityFilter})</div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b border-slate-200">Version</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b border-slate-200">Captured</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b border-slate-200">Rates</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b border-slate-200">Stale</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b border-slate-200">Δ</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b border-slate-200"></th>
                  </tr>
                </thead>
                <tbody>
                  {snapshotHistory
                    .slice()
                    .reverse()
                    .map((s) => {
                      const active = String(s.versionTag) === String(selectedSnapshotTag);
                      return (
                        <tr key={s.versionTag} className={active ? 'bg-amber-50' : ''}>
                          <td className="px-3 py-2 border-b border-slate-100 font-mono text-xs text-slate-800">{String(s.versionTag)}</td>
                          <td className="px-3 py-2 border-b border-slate-100 text-slate-700">{shortIso(s.capturedAt)}</td>
                          <td className="px-3 py-2 border-b border-slate-100 text-slate-700">{String(s.rateCount)}</td>
                          <td className="px-3 py-2 border-b border-slate-100">
                            <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${badgeClass(s.isStale ? 'amber' : 'green')}`}>
                              {s.isStale ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-3 py-2 border-b border-slate-100 text-slate-700">
                            {s.diffSummary ? `+${s.diffSummary.addedRateCodes} / -${s.diffSummary.removedRateCodes}` : '—'}
                          </td>
                          <td className="px-3 py-2 border-b border-slate-100 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedSnapshotTag(String(s.versionTag))}
                              className="text-blue-600 hover:text-blue-700 font-semibold text-xs"
                            >
                              {active ? 'Selected' : 'Select'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {utilityFilter !== 'all' && selectedSnapshot && (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Snapshot details</div>
                <div className="text-xs text-slate-600 mt-1">
                  {utilityFilter} snapshot <span className="font-mono">{String(selectedSnapshot?.versionTag || '—')}</span> • captured {shortIso(selectedSnapshot?.capturedAt)}
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${badgeClass(selectedSnapshotStale ? 'amber' : 'green')}`}>
                {selectedSnapshotStale ? 'Stale' : 'Up to date'}
              </span>
            </div>

            {snapshotDiff ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-xs text-slate-700">
                  <div className="font-semibold text-slate-900 mb-1">Rate code diff vs previous</div>
                  <div className="text-slate-600 mb-2">
                    previous: <span className="font-mono">{snapshotDiff.previousVersionTag || '—'}</span> • +{snapshotDiff.added.length} / -{snapshotDiff.removed.length} / unchanged {snapshotDiff.unchanged.length}
                  </div>
                  {snapshotDiff.added.length > 0 && <div>Added: {snapshotDiff.added.slice(0, 20).join(', ')}{snapshotDiff.added.length > 20 ? ', …' : ''}</div>}
                  {snapshotDiff.removed.length > 0 && <div className="mt-1">Removed: {snapshotDiff.removed.slice(0, 20).join(', ')}{snapshotDiff.removed.length > 20 ? ', …' : ''}</div>}
                  {snapshotDiff.added.length === 0 && snapshotDiff.removed.length === 0 && <div>(No rate code adds/removals.)</div>}
                </div>

                <div className="text-xs text-slate-700">
                  <div className="font-semibold text-slate-900 mb-1">Source fingerprint changes (URL → hash)</div>
                  <div className="text-slate-600 mb-2">
                    changed {fingerprintDiff.changed.length} • added {fingerprintDiff.added.length} • removed {fingerprintDiff.removed.length}
                  </div>
                  {fingerprintDiff.changed.slice(0, 6).map((x) => (
                    <div key={`c:${x.url}`} className="truncate" title={`${x.url}\n${x.from} -> ${x.to}`}>
                      Changed: {x.url}
                    </div>
                  ))}
                  {fingerprintDiff.added.slice(0, 4).map((x) => (
                    <div key={`a:${x.url}`} className="truncate" title={`${x.url}\n${x.to}`}>
                      Added: {x.url}
                    </div>
                  ))}
                  {fingerprintDiff.removed.slice(0, 4).map((x) => (
                    <div key={`r:${x.url}`} className="truncate" title={`${x.url}\n${x.from}`}>
                      Removed: {x.url}
                    </div>
                  ))}
                  {fingerprintDiff.changed.length === 0 && fingerprintDiff.added.length === 0 && fingerprintDiff.removed.length === 0 && <div>(No source fingerprint changes detected.)</div>}
                </div>
              </div>
            ) : (
              <div className="mt-4 text-xs text-slate-600">(No previous snapshot diff available for this snapshot.)</div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">Utility</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">Rate Code</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">Customer Class</th>
                {commodity === 'electric' && (
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">Voltage</th>
                )}
                <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">Eligibility Notes</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">Effective</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">Source Title</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">Source Link</th>
              </tr>
            </thead>
            <tbody>
              {filteredRates.map((r, idx) => (
                <tr
                  key={`${r.utility}:${r.rateCode}:${idx}`}
                  onClick={() => setSelectedRate(r)}
                  className={
                    'cursor-pointer ' +
                    (highlightRateCode && r.rateCode && r.rateCode.toLowerCase() === highlightRateCode.toLowerCase() ? 'bg-amber-50' : '') +
                    (selectedRate && selectedRate.rateCode === r.rateCode && selectedRate.utility === r.utility ? ' bg-slate-50' : '')
                  }
                >
                  <td className="px-4 py-3 text-slate-700 border-b border-slate-100">{r.utility}</td>
                  <td className="px-4 py-3 text-slate-900 border-b border-slate-100 font-semibold">{r.rateCode || '—'}</td>
                  <td className="px-4 py-3 text-slate-700 border-b border-slate-100">
                    {r.customerClass || '—'}
                    <SourceBadge source={(r as any).customerClassSource} />
                  </td>
                  {commodity === 'electric' && (
                    <td className="px-4 py-3 text-slate-700 border-b border-slate-100">
                      {r.voltage || '—'}
                      <SourceBadge source={(r as any).voltageSource} />
                    </td>
                  )}
                  <td className="px-4 py-3 text-slate-700 border-b border-slate-100">
                    {r.eligibilityNotes ? r.eligibilityNotes : '—'}
                    <SourceBadge source={(r as any).eligibilitySource} />
                  </td>
                  <td className="px-4 py-3 text-slate-700 border-b border-slate-100">
                    {r.effectiveStart || r.effectiveEnd ? `${r.effectiveStart || '—'} → ${r.effectiveEnd || '—'}` : '—'}
                    <SourceBadge source={(r as any).effectiveSource} />
                  </td>
                  <td className="px-4 py-3 text-slate-700 border-b border-slate-100">{r.sourceTitle || '—'}</td>
                  <td className="px-4 py-3 text-slate-700 border-b border-slate-100">
                    {r.sourceUrl ? (
                      <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">
                        Open
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {filteredRates.length === 0 && (
                <tr>
                  <td colSpan={commodity === 'electric' ? 8 : 7} className="px-4 py-6 text-slate-600 text-sm">
                    No rates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedRate && (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Rate details</div>
                <div className="text-xs text-slate-600 mt-1">
                  {String(selectedRate.utility || '—')} <span className="font-mono">{String(selectedRate.rateCode || '—')}</span>
                </div>
              </div>
              <button className="text-xs text-slate-600 hover:text-slate-900" onClick={() => setSelectedRate(null)}>
                Close
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="text-slate-700">
                <div className="font-semibold text-slate-900 mb-1">Enriched fields</div>
                <div>Customer Class: {String(selectedRate.customerClass || '—')} <SourceBadge source={String(selectedRate.customerClassSource || '')} /></div>
                {commodity === 'electric' ? (
                  <div>Voltage: {String(selectedRate.voltage || '—')} <SourceBadge source={String(selectedRate.voltageSource || '')} /></div>
                ) : null}
                <div>Eligibility: {String(selectedRate.eligibilityNotes || '—')} <SourceBadge source={String(selectedRate.eligibilitySource || '')} /></div>
                <div>
                  Effective: {selectedRate.effectiveStart || selectedRate.effectiveEnd ? `${selectedRate.effectiveStart || '—'} → ${selectedRate.effectiveEnd || '—'}` : '—'}{' '}
                  <SourceBadge source={String(selectedRate.effectiveSource || '')} />
                </div>
                <div>Effective status: <span className="font-mono">{String((selectedRate as any).effectiveStatus || 'UNKNOWN')}</span></div>
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <div className="font-semibold text-slate-900 mb-1">Segment / Tier / Curation</div>
                  <div>Segment: {String((selectedRate as any).customerSegment || '—')} <SourceBadge source={String((selectedRate as any).customerSegmentSource || '')} /></div>
                  <div>Tier: {String((selectedRate as any).popularityTier || 'all')} <span className="text-slate-500">({String((selectedRate as any).popularitySource || 'unknown')})</span></div>
                  <div>Hidden by curation: {Boolean((selectedRate as any).curationHidden) ? 'Yes' : 'No'}</div>
                  {String((selectedRate as any).curationNotes || '').trim() ? <div>Notes: {String((selectedRate as any).curationNotes)}</div> : null}
                  <div>Preferred for EverWatt: {Boolean((selectedRate as any).preferredForEverWatt) ? 'Yes' : 'No'}</div>
                  {commodity === 'electric' ? (
                    <div>
                      Business family: <span className="font-mono">{String((selectedRate as any).businessFamilyKey || '—')}</span>{' '}
                      {Boolean((selectedRate as any).isEverWattCanonicalBusiness) ? <span className="text-slate-500">(canonical)</span> : <span className="text-slate-500">(non-canon)</span>}
                    </div>
                  ) : null}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <div className="font-semibold text-slate-900 mb-1">As-of truth</div>
                  <div>Snapshot capturedAt: <span className="font-mono">{String(selectedSnapshot?.capturedAt || '—')}</span></div>
                  <div>
                    Utility last change: {formatUtilityCardLastChangeV1({
                      previousVersionTag: (data?.utilities || []).find((u) => u.utility === selectedRate.utility)?.latestSnapshot?.previousVersionTag,
                      lastChangeDetected: (data?.utilities || []).find((u) => u.utility === selectedRate.utility)?.latestSnapshot?.lastChangeDetected,
                    })}
                  </div>
                </div>
                {commodity === 'electric' ? (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <div className="font-semibold text-slate-900 mb-1">Related programs (non-res)</div>
                    {(() => {
                      const uk = String(selectedRate.utility || '').toUpperCase();
                      const familyKey = String((selectedRate as any).businessFamilyKey || '').trim();
                      const entry = (programs?.utilities || []).find((x) => String(x.utilityKey).toUpperCase() === uk) || null;
                      const ps = (entry?.programs || []).filter((p: any) => !familyKey || (Array.isArray(p.relatedTariffFamilies) && p.relatedTariffFamilies.includes(familyKey)));
                      if (!entry) return <div className="text-slate-600">(Programs snapshot not loaded.)</div>;
                      if (!ps.length) return <div className="text-slate-600">(No related programs found.)</div>;
                      return (
                        <ul className="list-disc ml-5 space-y-1">
                          {ps.slice(0, 5).map((p: any) => (
                            <li key={String(p.programId)}>
                              <span className="font-semibold">{String(p.programName || p.programId)}</span>{' '}
                              {p.internalRating ? <span className="text-slate-500">(rating {String(p.internalRating)})</span> : null}
                              {Array.isArray(p.prominentCallouts) && p.prominentCallouts.length ? (
                                <div className="text-slate-600">{String(p.prominentCallouts[0])}</div>
                              ) : null}
                              {p.worthItThresholds ? <div className="text-slate-600">Worth-it: {JSON.stringify(p.worthItThresholds)}</div> : null}
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>
                ) : null}
              </div>
              <div className="text-slate-700">
                <div className="font-semibold text-slate-900 mb-1">Why blank?</div>
                {deriveWhyMissingReasonCodesV1({ rate: selectedRate, utility: selectedUtilityEntry as any, commodity }).length ? (
                  <ul className="list-disc ml-5 space-y-1">
                    {deriveWhyMissingReasonCodesV1({ rate: selectedRate, utility: selectedUtilityEntry as any, commodity }).map((x, i) => (
                      <li key={`${x.field}:${i}`}>
                        <span className="font-semibold">{x.field}</span>: {x.codes.join(', ')}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>(No missing fields detected.)</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

