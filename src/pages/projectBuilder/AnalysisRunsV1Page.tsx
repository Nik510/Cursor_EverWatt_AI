import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, RefreshCw, Shuffle, ArrowLeft } from 'lucide-react';

import type { AnalysisRunV1 } from '../../shared/types/analysisRunsV1';
import type { DiffSummaryV1 } from '../../shared/types/analysisRunsDiffV1';
import { diffRunsV1, downloadRunPdfV1, listRunsV1, readRunV1, type AnalysisRunsV1IndexRow } from '../../api/analysisRunsV1';

function shortIso(s: unknown): string {
  const t = String(s ?? '').trim();
  if (!t) return '—';
  return t.length > 24 ? `${t.slice(0, 24)}…` : t;
}

function badgeClass(tone: 'gray' | 'blue' | 'amber' | 'green'): string {
  switch (tone) {
    case 'blue':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'amber':
      return 'bg-amber-50 text-amber-900 border-amber-200';
    case 'green':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function Pill(props: { label: string; tone?: 'gray' | 'blue' | 'amber' | 'green'; title?: string }) {
  return (
    <span
      title={props.title}
      className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] font-semibold ${badgeClass(props.tone || 'gray')}`}
    >
      {props.label}
    </span>
  );
}

function clampString(s: unknown, max = 600): string {
  const t = String(s ?? '');
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 14)) + ' …(truncated)';
}

function trimJsonForDisplay(value: unknown, args?: { maxDepth?: number; maxArray?: number; maxString?: number }): unknown {
  const maxDepth = Number(args?.maxDepth ?? 6);
  const maxArray = Number(args?.maxArray ?? 20);
  const maxString = Number(args?.maxString ?? 800);
  const seen = new WeakSet<object>();

  const walk = (v: any, depth: number): any => {
    if (v === null || v === undefined) return v;
    if (typeof v === 'string') return v.length > maxString ? clampString(v, maxString) : v;
    if (typeof v === 'number' || typeof v === 'boolean') return v;
    if (typeof v !== 'object') return String(v);
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    if (depth >= maxDepth) return '[MaxDepth]';
    if (Array.isArray(v)) {
      const head = v.slice(0, maxArray).map((x) => walk(x, depth + 1));
      return v.length > maxArray ? { __truncated: true, length: v.length, head } : head;
    }
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) {
      out[k] = walk(v[k], depth + 1);
    }
    return out;
  };

  return walk(value as any, 0);
}

function jsonPretty(value: unknown, maxChars = 24_000): { text: string; truncated: boolean } {
  let text = '';
  try {
    text = JSON.stringify(trimJsonForDisplay(value), null, 2);
  } catch (e) {
    text = JSON.stringify({ error: 'Failed to stringify', message: String((e as any)?.message || e) }, null, 2);
  }
  if (text.length <= maxChars) return { text, truncated: false };
  return { text: text.slice(0, Math.max(0, maxChars - 14)) + '\n…(truncated)', truncated: true };
}

function formatProviderType(t: unknown): string {
  const s = String(t ?? '').trim().toUpperCase();
  if (s === 'CCA') return 'CCA';
  if (s === 'DA') return 'DA';
  return 'NONE';
}

export const AnalysisRunsV1Page: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [loadingIndex, setLoadingIndex] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [runs, setRuns] = useState<AnalysisRunsV1IndexRow[]>([]);

  const [search, setSearch] = useState('');
  const [selectedRunId, setSelectedRunId] = useState<string>('');

  const [loadingRun, setLoadingRun] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [analysisRun, setAnalysisRun] = useState<AnalysisRunV1 | null>(null);

  const [diffA, setDiffA] = useState<string>('');
  const [diffB, setDiffB] = useState<string>('');
  const [diffBusy, setDiffBusy] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [diff, setDiff] = useState<DiffSummaryV1 | null>(null);

  const [runProjectId, setRunProjectId] = useState(() => String(searchParams.get('projectId') || '').trim());
  const [runDemo, setRunDemo] = useState(() => String(searchParams.get('demo') || '').trim().toLowerCase() === 'true');
  const [runBusy, setRunBusy] = useState(false);
  const [runStoreError, setRunStoreError] = useState<string | null>(null);

  async function loadIndex() {
    setLoadingIndex(true);
    setIndexError(null);
    try {
      const res = await listRunsV1();
      const rows = Array.isArray(res.runs) ? res.runs.slice() : [];
      rows.sort((a, b) => String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || '')) || String(a.runId || '').localeCompare(String(b.runId || '')));
      setRuns(rows);
      setWarnings(Array.isArray(res.warnings) ? res.warnings.map((w) => String(w)) : []);
      setSelectedRunId((prev) => {
        if (prev && rows.some((r) => String(r.runId) === prev)) return prev;
        return rows[0]?.runId ? String(rows[0].runId) : '';
      });
      setDiffA((prev) => {
        if (prev && rows.some((r) => String(r.runId) === prev)) return prev;
        return rows[0]?.runId ? String(rows[0].runId) : '';
      });
      setDiffB((prev) => {
        if (prev && rows.some((r) => String(r.runId) === prev)) return prev;
        const second = rows[1]?.runId ? String(rows[1].runId) : rows[0]?.runId ? String(rows[0].runId) : '';
        return second;
      });
    } catch (e) {
      setIndexError(e instanceof Error ? e.message : 'Failed to load runs index');
      setRuns([]);
      setWarnings([]);
      setSelectedRunId('');
      setDiffA('');
      setDiffB('');
    } finally {
      setLoadingIndex(false);
    }
  }

  useEffect(() => {
    void loadIndex();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRun(runId: string) {
      if (!runId) {
        setAnalysisRun(null);
        return;
      }
      setLoadingRun(true);
      setRunError(null);
      try {
        const res = await readRunV1(runId);
        if (cancelled) return;
        setAnalysisRun(res.analysisRun as any);
      } catch (e) {
        if (cancelled) return;
        setRunError(e instanceof Error ? e.message : 'Failed to load run');
        setAnalysisRun(null);
      } finally {
        if (!cancelled) setLoadingRun(false);
      }
    }
    void loadRun(selectedRunId);
    return () => {
      cancelled = true;
    };
  }, [selectedRunId]);

  const filteredRuns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return runs;
    return runs.filter((r) => {
      const parts = [
        r.runId,
        r.createdAtIso,
        r.inputFingerprint,
        r.summary?.utility,
        r.summary?.rateCode,
        r.summary?.lseName,
        r.summary?.supplyProviderType,
        r.summary?.rateSourceKind,
      ]
        .map((x) => String(x || '').toLowerCase())
        .join(' | ');
      return parts.includes(q);
    });
  }, [runs, search]);

  const selectedRow = useMemo(() => runs.find((r) => String(r.runId) === String(selectedRunId)) || null, [runs, selectedRunId]);

  const reportJson: any = (analysisRun as any)?.snapshot?.reportJson ?? null;
  const snapshotResponse: any = (analysisRun as any)?.snapshot?.response ?? null;
  const rateFitStatus = String(reportJson?.summary?.json?.rateFit?.status || snapshotResponse?.workflow?.utility?.insights?.rateFit?.status || '').trim();
  const supplyStructure: any =
    reportJson?.workflow?.utility?.insights?.supplyStructure ?? snapshotResponse?.workflow?.utility?.insights?.supplyStructure ?? null;
  const missingInfoIds = useMemo(() => {
    const arr = Array.isArray(reportJson?.missingInfo) ? reportJson.missingInfo : [];
    return arr
      .map((m: any) => String(m?.id || '').trim())
      .filter(Boolean)
      .slice()
      .sort((a: string, b: string) => a.localeCompare(b));
  }, [reportJson?.missingInfo]);

  const batteryDecisionPackV1_2: any = reportJson?.batteryDecisionPackV1_2 ?? null;
  const auditDrawerV1: any = reportJson?.auditDrawerV1 ?? null;

  async function onDownloadPdf() {
    if (!selectedRunId) return;
    const { blob, filename } = await downloadRunPdfV1(selectedRunId);
    const href = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = href;
      a.download = filename || `EverWatt_AnalysisRunV1_${selectedRunId}.pdf`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      URL.revokeObjectURL(href);
    }
  }

  async function onRunAndStore() {
    setRunBusy(true);
    setRunStoreError(null);
    try {
      const res = await fetch('/api/analysis-results-v1/run-and-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: runProjectId || undefined, demo: runDemo }),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(String(json?.error || json?.message || `Request failed (${res.status})`));
      const newRunId = String(json?.runId || json?.analysisRun?.runId || '').trim();
      await loadIndex();
      if (newRunId) setSelectedRunId(newRunId);
    } catch (e) {
      setRunStoreError(e instanceof Error ? e.message : 'Failed to run-and-store');
    } finally {
      setRunBusy(false);
    }
  }

  async function onDiff() {
    if (!diffA || !diffB) return;
    setDiffBusy(true);
    setDiffError(null);
    try {
      const res = await diffRunsV1(diffA, diffB);
      setDiff(res.diff);
    } catch (e) {
      setDiff(null);
      setDiffError(e instanceof Error ? e.message : 'Failed to diff runs');
    } finally {
      setDiffBusy(false);
    }
  }

  const diffHighlights = useMemo(() => {
    const cats = Array.isArray(diff?.categories) ? diff?.categories : [];
    const out: Array<{ category: string; label: string; before: string; after: string }> = [];
    for (const c of cats) {
      for (const h of Array.isArray((c as any)?.highlights) ? (c as any).highlights : []) {
        if (out.length >= 10) break;
        out.push({ category: String((c as any)?.category || ''), label: String(h?.label || ''), before: String(h?.before || ''), after: String(h?.after || '') });
      }
      if (out.length >= 10) break;
    }
    return out;
  }, [diff]);

  const diffChangedPaths = useMemo(() => {
    const cats = Array.isArray(diff?.categories) ? diff?.categories : [];
    const all: string[] = [];
    for (const c of cats) {
      for (const p of Array.isArray((c as any)?.changedPaths) ? (c as any).changedPaths : []) {
        const s = String(p || '').trim();
        if (s) all.push(s);
      }
    }
    const uniq = Array.from(new Set(all)).sort((a, b) => a.localeCompare(b));
    return uniq.slice(0, 25);
  }, [diff]);

  const jsonRun = useMemo(() => jsonPretty(analysisRun), [analysisRun]);
  const jsonReport = useMemo(() => jsonPretty(reportJson), [reportJson]);
  const jsonResponse = useMemo(() => jsonPretty(snapshotResponse), [snapshotResponse]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Link to="/project-builder" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-4 h-4" />
              Project Builder
            </Link>
            <Pill label="Snapshot-only" tone="blue" title="This UI only reads stored snapshots and never recomputes engines." />
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">Analysis Runs (V1)</h1>
          <p className="text-sm text-gray-600">Run-and-store, browse, open, diff, and download PDFs — without recompute on read.</p>
        </div>

        <button
          type="button"
          onClick={() => void loadIndex()}
          disabled={loadingIndex}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loadingIndex ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {indexError && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{indexError}</div>}
      {!indexError && warnings.length > 0 && (
        <div className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
          <div className="font-semibold">Warnings</div>
          <ul className="list-disc pl-5">
            {warnings.slice(0, 6).map((w, idx) => (
              <li key={idx}>{String(w)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left: runs list */}
        <div className="xl:col-span-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Runs</div>
            <div className="mt-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Search runId, utility, rate, LSE, provider type, fingerprint…"
              />
            </div>
          </div>

          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="text-sm font-semibold text-gray-900">Run & store</div>
            <div className="mt-2 grid grid-cols-1 gap-2">
              <input
                value={runProjectId}
                onChange={(e) => setRunProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                placeholder="projectId (blank for demo)"
              />
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={runDemo} onChange={(e) => setRunDemo(e.target.checked)} />
                Demo mode
              </label>
              <button
                type="button"
                onClick={() => void onRunAndStore()}
                disabled={runBusy}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {runBusy ? 'Running…' : 'Run & store'}
              </button>
              {runStoreError && <div className="text-xs text-red-700">{runStoreError}</div>}
            </div>
          </div>

          <div className="max-h-[66vh] overflow-auto">
            {loadingIndex && runs.length === 0 && <div className="px-4 py-6 text-sm text-gray-600">Loading…</div>}
            {!loadingIndex && filteredRuns.length === 0 && <div className="px-4 py-6 text-sm text-gray-600">No runs found.</div>}
            {filteredRuns.map((r) => {
              const active = String(r.runId) === String(selectedRunId);
              const provider = formatProviderType(r.summary?.supplyProviderType);
              return (
                <button
                  key={r.runId}
                  type="button"
                  onClick={() => setSelectedRunId(String(r.runId))}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${
                    active ? 'bg-blue-50 border-blue-100' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{r.summary?.utility || '(unknown utility)'}</div>
                      <div className="text-xs text-gray-600 truncate">
                        {r.summary?.rateCode ? `Rate ${r.summary.rateCode}` : 'Rate —'} • {provider} • {r.summary?.rateSourceKind || 'source —'}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1 font-mono truncate">{shortIso(r.createdAtIso)} • {String(r.runId)}</div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      {r.summary?.hasIntervals ? <Pill label="interval" tone="green" /> : <Pill label="no interval" tone="gray" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle: run details */}
        <div className="xl:col-span-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Run details</div>
            <button
              type="button"
              onClick={() => void onDownloadPdf()}
              disabled={!selectedRunId}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>

          {!selectedRunId && <div className="px-4 py-6 text-sm text-gray-600">Select a run from the list.</div>}
          {selectedRunId && loadingRun && <div className="px-4 py-6 text-sm text-gray-600">Loading snapshot…</div>}
          {selectedRunId && runError && <div className="px-4 py-6 text-sm text-red-700">{runError}</div>}

          {selectedRunId && analysisRun && (
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <Pill label={rateFitStatus ? `Rate fit: ${rateFitStatus}` : 'Rate fit: —'} tone={rateFitStatus === 'good' ? 'green' : rateFitStatus ? 'amber' : 'gray'} />
                  {selectedRow?.summary?.supplyProviderType ? <Pill label={`Provider: ${formatProviderType(selectedRow.summary.supplyProviderType)}`} /> : null}
                  {selectedRow?.summary?.lseName ? <Pill label={`LSE: ${selectedRow.summary.lseName}`} /> : null}
                  {auditDrawerV1 ? <Pill label={`Audit drawer: ${Object.keys(auditDrawerV1?.moneyExplainers || {}).length}`} tone="blue" /> : <Pill label="Audit drawer: —" />}
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-gray-500">runId</div>
                    <div className="font-mono text-gray-900 text-right break-all">{analysisRun.runId}</div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-gray-500">createdAt</div>
                    <div className="font-mono text-gray-900 text-right">{shortIso(analysisRun.createdAtIso)}</div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-gray-500">inputFingerprint</div>
                    <div className="font-mono text-gray-900 text-right">
                      {String(analysisRun.inputFingerprint || '').slice(0, 10)}
                      <button
                        type="button"
                        className="ml-2 text-xs font-semibold text-blue-700 hover:underline"
                        onClick={async () => {
                          const fp = String(analysisRun.inputFingerprint || '').trim();
                          if (!fp) return;
                          try {
                            await navigator.clipboard.writeText(fp);
                          } catch {
                            // best-effort
                          }
                        }}
                        title="Copy full fingerprint"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="text-sm font-semibold text-gray-900">Effective rate context (stored)</div>
                <div className="text-sm text-gray-700">
                  <div>
                    Utility: <span className="font-semibold">{String(selectedRow?.summary?.utility || reportJson?.project?.territory || '—')}</span>
                  </div>
                  <div>
                    Rate: <span className="font-semibold">{String(selectedRow?.summary?.rateCode || reportJson?.summary?.json?.building?.currentRateCode || '—')}</span>
                  </div>
                  <div>
                    Provider type: <span className="font-semibold">{formatProviderType(selectedRow?.summary?.supplyProviderType || supplyStructure?.supplyType)}</span>
                  </div>
                  <div>
                    Rate source: <span className="font-mono">{String(selectedRow?.summary?.rateSourceKind || '—')}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="text-sm font-semibold text-gray-900">Missing info IDs</div>
                {missingInfoIds.length === 0 ? (
                  <div className="text-sm text-gray-600">None</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {missingInfoIds.slice(0, 32).map((id) => (
                      <span key={id} className="inline-flex items-center px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-[11px] font-mono text-gray-700">
                        {id}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="text-sm font-semibold text-gray-900">Battery decision pack v1.2</div>
                {!batteryDecisionPackV1_2 ? (
                  <div className="text-sm text-gray-600">Not present</div>
                ) : (
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>
                      Tier: <span className="font-semibold">{String(batteryDecisionPackV1_2?.recommendationV1?.recommendationTier || batteryDecisionPackV1_2?.confidenceTier || '—')}</span>
                    </div>
                    <div>
                      Selected: <span className="font-mono">{String(batteryDecisionPackV1_2?.selected?.candidateId || '—')}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {(Array.isArray(batteryDecisionPackV1_2?.recommendationV1?.reasonsTop) ? batteryDecisionPackV1_2.recommendationV1.reasonsTop : [])
                        .slice(0, 4)
                        .map((s: any, idx: number) => (
                          <div key={idx}>- {String(s)}</div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-gray-900">Open JSON (bounded)</summary>
                  <div className="mt-3 space-y-3">
                    <details>
                      <summary className="cursor-pointer text-xs font-semibold text-gray-700">analysisRun</summary>
                      <pre className="mt-2 text-[11px] bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-[240px]">
                        {jsonRun.text}
                      </pre>
                    </details>
                    <details>
                      <summary className="cursor-pointer text-xs font-semibold text-gray-700">snapshot.reportJson</summary>
                      <pre className="mt-2 text-[11px] bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-[240px]">
                        {jsonReport.text}
                      </pre>
                    </details>
                    <details>
                      <summary className="cursor-pointer text-xs font-semibold text-gray-700">snapshot.response</summary>
                      <pre className="mt-2 text-[11px] bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-[240px]">
                        {jsonResponse.text}
                      </pre>
                    </details>
                    {(jsonRun.truncated || jsonReport.truncated || jsonResponse.truncated) && (
                      <div className="text-[11px] text-amber-800">Some JSON sections were truncated for UI safety.</div>
                    )}
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>

        {/* Right: diff */}
        <div className="xl:col-span-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Diff (snapshot-only)</div>
            <div className="mt-2 grid grid-cols-1 gap-2">
              <label className="text-xs text-gray-600">
                Run A
                <select value={diffA} onChange={(e) => setDiffA(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono">
                  {runs.map((r) => (
                    <option key={r.runId} value={r.runId}>
                      {r.createdAtIso.slice(0, 19)} • {r.runId}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-gray-600">
                Run B
                <select value={diffB} onChange={(e) => setDiffB(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono">
                  {runs.map((r) => (
                    <option key={r.runId} value={r.runId}>
                      {r.createdAtIso.slice(0, 19)} • {r.runId}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void onDiff()}
                  disabled={!diffA || !diffB || diffBusy}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {diffBusy ? 'Diffing…' : 'Diff'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDiffA(diffB);
                    setDiffB(diffA);
                  }}
                  disabled={!diffA || !diffB}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Shuffle className="w-4 h-4" />
                  Swap
                </button>
              </div>
              {diffError && <div className="text-xs text-red-700">{diffError}</div>}
            </div>
          </div>

          <div className="p-4 space-y-4">
            {!diff && <div className="text-sm text-gray-600">Select two runs and click Diff.</div>}
            {diff && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Pill label={`A: ${diff.runA.runId}`} />
                  <Pill label={`B: ${diff.runB.runId}`} />
                  <Pill label={`Sections: ${Array.isArray(diff.changedSections) ? diff.changedSections.length : 0}`} tone="blue" />
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-900">Highlights (max 10)</div>
                  {diffHighlights.length === 0 ? (
                    <div className="text-sm text-gray-600">No highlights.</div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {diffHighlights.map((h, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="text-[11px] font-semibold text-gray-700">{h.category}</div>
                          <div className="text-sm font-semibold text-gray-900">{h.label}</div>
                          <div className="mt-1 text-xs text-gray-700">
                            <div className="font-mono text-[11px]">before: {h.before}</div>
                            <div className="font-mono text-[11px]">after: {h.after}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-900">Changed paths (max 25)</div>
                  {diffChangedPaths.length === 0 ? (
                    <div className="text-sm text-gray-600">No changed paths.</div>
                  ) : (
                    <ul className="mt-2 text-[11px] font-mono text-gray-700 list-disc pl-5 space-y-1">
                      {diffChangedPaths.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

