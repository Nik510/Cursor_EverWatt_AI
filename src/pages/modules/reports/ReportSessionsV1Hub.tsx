import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileStack, RefreshCw, Play, FileText, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { ReportSessionKindV1, ReportSessionV1 } from '../../../shared/types/reportSessionsV1';
import type { DiffSummaryV1 } from '../../../shared/types/analysisRunsDiffV1';
import { diffAnalysisRunsV1 } from '../../../shared/api/analysisRuns';
import {
  buildWizardOutputForReportSessionV1,
  createReportSessionV1,
  generateInternalEngineeringReportFromSessionV1,
  getReportSessionV1,
  listReportSessionsV1,
  runUtilityInReportSessionV1,
} from '../../../shared/api/reportSessionsV1';

function shortIso(s: unknown): string {
  const t = String(s ?? '').trim();
  if (!t) return '—';
  return t.length >= 19 ? t.slice(0, 19).replace('T', ' ') : t;
}

function clampString(s: unknown, max = 900): string {
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
    for (const k of Object.keys(v).sort()) out[k] = walk(v[k], depth + 1);
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

const KIND_OPTIONS: Array<{ id: ReportSessionKindV1; label: string }> = [
  { id: 'WIZARD', label: 'Wizard' },
  { id: 'REGRESSION', label: 'Regression' },
  { id: 'SOLAR', label: 'Solar' },
  { id: 'COST_EFFECTIVENESS', label: 'Cost effectiveness' },
  { id: 'CUSTOM', label: 'Custom' },
];

export const ReportSessionsV1Hub: React.FC = () => {
  const navigate = useNavigate();

  const [loadingIndex, setLoadingIndex] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ReportSessionV1[]>([]);
  const [q, setQ] = useState('');
  const [selectedReportId, setSelectedReportId] = useState('');

  const [createKind, setCreateKind] = useState<ReportSessionKindV1>('WIZARD');
  const [createTitle, setCreateTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [session, setSession] = useState<ReportSessionV1 | null>(null);

  const [demo, setDemo] = useState(true);
  const [billPdfText, setBillPdfText] = useState('');
  const [intervalJsonText, setIntervalJsonText] = useState('');
  const [runBusy, setRunBusy] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const [genBusy, setGenBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [wizBusy, setWizBusy] = useState(false);
  const [wizError, setWizError] = useState<string | null>(null);
  const [wizardOutput, setWizardOutput] = useState<any>(null);

  const [diffA, setDiffA] = useState('');
  const [diffB, setDiffB] = useState('');
  const [diffBusy, setDiffBusy] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [diff, setDiff] = useState<DiffSummaryV1 | null>(null);
  const [diffCategory, setDiffCategory] = useState<string>('rate_and_supply');

  async function loadIndex() {
    setLoadingIndex(true);
    setIndexError(null);
    try {
      const res = await listReportSessionsV1({ limit: 100, q: q.trim() || undefined });
      const rows = Array.isArray(res.sessions) ? res.sessions.slice() : [];
      rows.sort((a, b) => String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || '')) || String(a.reportId || '').localeCompare(String(b.reportId || '')));
      setSessions(rows);
      setSelectedReportId((prev) => (prev && rows.some((r) => r.reportId === prev) ? prev : rows[0]?.reportId || ''));
    } catch (e) {
      setIndexError(e instanceof Error ? e.message : 'Failed to load report sessions');
      setSessions([]);
      setSelectedReportId('');
    } finally {
      setLoadingIndex(false);
    }
  }

  useEffect(() => {
    void loadIndex();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSession(reportId: string) {
      if (!reportId) {
        setSession(null);
        return;
      }
      setLoadingSession(true);
      setSessionError(null);
      try {
        const res = await getReportSessionV1(reportId);
        if (cancelled) return;
        setSession(res.session as any);
        const runIds = Array.isArray((res as any)?.session?.runIds) ? ((res as any).session.runIds as string[]) : [];
        setDiffA((prev) => (prev && runIds.includes(prev) ? prev : runIds[0] || ''));
        setDiffB((prev) => (prev && runIds.includes(prev) ? prev : runIds[1] || runIds[0] || ''));
      } catch (e) {
        if (cancelled) return;
        setSessionError(e instanceof Error ? e.message : 'Failed to load session');
        setSession(null);
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    }
    void loadSession(selectedReportId);
    return () => {
      cancelled = true;
    };
  }, [selectedReportId]);

  const filteredSessions = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return sessions;
    return sessions.filter((s) => {
      const parts = [s.reportId, s.title, s.kind, s.projectId ?? '']
        .map((x) => String(x || '').toLowerCase())
        .join(' | ');
      return parts.includes(query);
    });
  }, [sessions, q]);

  async function onCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await createReportSessionV1({ kind: createKind, ...(createTitle.trim() ? { title: createTitle.trim() } : {}) });
      setCreateTitle('');
      await loadIndex();
      setSelectedReportId(res.reportId);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create session');
    } finally {
      setCreating(false);
    }
  }

  function parseIntervalsFromJsonText(raw: string): any[] | null {
    const text = String(raw || '').trim();
    if (!text) return null;
    const parsed = JSON.parse(text) as any;
    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.intervals) ? parsed.intervals : null;
    if (!Array.isArray(arr)) return null;
    const out: any[] = [];
    for (const r of arr) {
      const timestampIso = String(r?.timestampIso || r?.timestamp || '').trim();
      const intervalMinutes = Number(r?.intervalMinutes ?? r?.mins);
      if (!timestampIso || !Number.isFinite(intervalMinutes) || intervalMinutes <= 0) continue;
      const p: any = { timestampIso, intervalMinutes };
      if (Number.isFinite(Number(r?.kWh))) p.kWh = Number(r.kWh);
      if (Number.isFinite(Number(r?.kW))) p.kW = Number(r.kW);
      if (Number.isFinite(Number(r?.temperatureF))) p.temperatureF = Number(r.temperatureF);
      out.push(p);
      if (out.length >= 200_000) break;
    }
    return out.length ? out : null;
  }

  async function onRunUtility() {
    if (!session?.reportId) return;
    setRunBusy(true);
    setRunError(null);
    try {
      const intervals = intervalJsonText.trim() ? parseIntervalsFromJsonText(intervalJsonText) : null;
      const res = await runUtilityInReportSessionV1(session.reportId, {
        workflowInputs: {
          demo,
          billPdfText: billPdfText.trim() ? billPdfText.trim() : undefined,
          ...(intervals ? { intervalElectricV1: intervals as any } : {}),
        },
      });
      await loadIndex();
      setSelectedReportId(res.reportId);
      const refreshed = await getReportSessionV1(res.reportId);
      setSession(refreshed.session as any);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Failed to run utility workflow');
    } finally {
      setRunBusy(false);
    }
  }

  async function onGenerateInternal() {
    if (!session?.reportId) return;
    setGenBusy(true);
    setGenError(null);
    try {
      await generateInternalEngineeringReportFromSessionV1(session.reportId, {});
      const refreshed = await getReportSessionV1(session.reportId);
      setSession(refreshed.session as any);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Failed to generate internal engineering report');
    } finally {
      setGenBusy(false);
    }
  }

  async function onBuildWizardOutput() {
    if (!session?.reportId) return;
    setWizBusy(true);
    setWizError(null);
    try {
      const res = await buildWizardOutputForReportSessionV1(session.reportId, {});
      setWizardOutput(res.wizardOutput as any);
    } catch (e) {
      setWizardOutput(null);
      setWizError(e instanceof Error ? e.message : 'Failed to build wizard output');
    } finally {
      setWizBusy(false);
    }
  }

  const fixedCategoryOrder = useMemo(
    () => ['rate_and_supply', 'interval', 'weather_determinants', 'battery', 'programs', 'warnings'] as const,
    [],
  );

  async function onDiff() {
    if (!diffA || !diffB) return;
    setDiffBusy(true);
    setDiffError(null);
    try {
      const res = await diffAnalysisRunsV1(diffA, diffB);
      setDiff(res.diff);
      const first = (Array.isArray((res.diff as any)?.changedSections) ? (res.diff as any).changedSections[0] : null) || (res.diff as any)?.categories?.[0]?.category || null;
      if (first) setDiffCategory(String(first));
    } catch (e) {
      setDiff(null);
      setDiffError(e instanceof Error ? e.message : 'Failed to diff runs');
    } finally {
      setDiffBusy(false);
    }
  }

  const activeCategorySummary = useMemo(() => {
    const cats = Array.isArray((diff as any)?.categories) ? ((diff as any).categories as any[]) : [];
    return cats.find((c) => String(c?.category || '') === String(diffCategory || '')) || null;
  }, [diff, diffCategory]);

  const activeDetailedItems = useMemo(() => {
    const all = Array.isArray((diff as any)?.changedPathsDetailed) ? ((diff as any).changedPathsDetailed as any[]) : [];
    return all.filter((it) => String(it?.category || '') === String(diffCategory || ''));
  }, [diff, diffCategory]);

  const wizardJson = useMemo(() => jsonPretty(wizardOutput), [wizardOutput]);

  const runIds = Array.isArray(session?.runIds) ? session!.runIds : [];
  const revisions = Array.isArray(session?.revisions) ? session!.revisions : [];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/reports')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-gray-900 rounded-lg flex items-center justify-center">
                <FileStack className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Report Sessions (v1)</h1>
                <p className="text-sm text-gray-500">One spine for standalone reports, projects, and wizard runs (snapshot-only reads).</p>
              </div>
            </div>
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
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 p-6 h-full">
          <div className="xl:col-span-4 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sessions</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Search reportId, title, kind, projectId…"
              />
              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-gray-100">
                <div className="text-sm font-semibold text-gray-900">Create session</div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={createKind} onChange={(e) => setCreateKind(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {KIND_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void onCreate()}
                    disabled={creating}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-50"
                  >
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                </div>
                <input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Optional title"
                />
                {createError && <div className="text-xs text-red-700">{createError}</div>}
              </div>
            </div>

            {indexError && <div className="p-4 text-sm text-red-700">{indexError}</div>}
            <div className="flex-1 overflow-auto">
              {loadingIndex && sessions.length === 0 && <div className="px-4 py-6 text-sm text-gray-600">Loading…</div>}
              {!loadingIndex && filteredSessions.length === 0 && <div className="px-4 py-6 text-sm text-gray-600">No sessions found.</div>}
              {filteredSessions.map((s) => {
                const active = s.reportId === selectedReportId;
                return (
                  <button
                    key={s.reportId}
                    type="button"
                    onClick={() => setSelectedReportId(s.reportId)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${active ? 'bg-blue-50 border-blue-100' : 'bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{s.title}</div>
                        <div className="text-xs text-gray-600 truncate">
                          {s.kind} • {shortIso(s.createdAtIso)} • runs={Array.isArray(s.runIds) ? s.runIds.length : 0}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1 font-mono truncate">{s.reportId}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="xl:col-span-4 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Session details</div>
            </div>

            {!selectedReportId && <div className="p-4 text-sm text-gray-600">Select a session.</div>}
            {selectedReportId && loadingSession && <div className="p-4 text-sm text-gray-600">Loading…</div>}
            {selectedReportId && sessionError && <div className="p-4 text-sm text-red-700">{sessionError}</div>}

            {session && (
              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-900">{session.title}</div>
                  <div className="text-xs text-gray-600 font-mono break-all">{session.reportId}</div>
                  <div className="grid grid-cols-1 gap-1 text-sm text-gray-700">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-gray-500">kind</div>
                      <div className="font-mono">{session.kind}</div>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-gray-500">created</div>
                      <div className="font-mono">{shortIso(session.createdAtIso)}</div>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-gray-500">updated</div>
                      <div className="font-mono">{shortIso(session.updatedAtIso)}</div>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-gray-500">projectId</div>
                      <div className="font-mono break-all">{session.projectId || '—'}</div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="text-sm font-semibold text-gray-900">Run utility (run-and-store)</div>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
                    Demo intervals (sample)
                  </label>
                  <textarea
                    value={billPdfText}
                    onChange={(e) => setBillPdfText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono min-h-[90px]"
                    placeholder="Optional: paste bill PDF text (stored on project.telemetry.billPdfText)"
                  />
                  <textarea
                    value={intervalJsonText}
                    onChange={(e) => setIntervalJsonText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono min-h-[90px]"
                    placeholder="Optional: paste interval JSON array (timestampIso, intervalMinutes, kWh/kW/temperatureF)"
                  />
                  <button
                    type="button"
                    onClick={() => void onRunUtility()}
                    disabled={runBusy}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 w-full"
                  >
                    <Play className="w-4 h-4" />
                    {runBusy ? 'Running…' : 'Run & store'}
                  </button>
                  {runError && <div className="text-xs text-red-700">{runError}</div>}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="text-sm font-semibold text-gray-900">Revisions</div>
                  <button
                    type="button"
                    onClick={() => void onGenerateInternal()}
                    disabled={genBusy || !runIds.length}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-50 w-full"
                    title={!runIds.length ? 'Attach a run first' : undefined}
                  >
                    <FileText className="w-4 h-4" />
                    {genBusy ? 'Generating…' : 'Generate Internal Engineering revision'}
                  </button>
                  {genError && <div className="text-xs text-red-700">{genError}</div>}

                  {revisions.length === 0 ? (
                    <div className="text-sm text-gray-600">No revisions attached yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {revisions.slice(0, 12).map((r) => (
                        <div key={r.revisionId} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{r.format}</div>
                              <div className="text-xs text-gray-600 font-mono truncate">
                                {shortIso(r.createdAtIso)} • rev={r.revisionId.slice(0, 8)}… • run={String(r.runId || '').slice(0, 8)}…
                              </div>
                            </div>
                            {r.downloadUrl ? (
                              <a className="text-xs font-semibold text-blue-700 hover:underline" href={r.downloadUrl} target="_blank" rel="noreferrer">
                                Open
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="text-sm font-semibold text-gray-900">Wizard output (contract v1)</div>
                  <button
                    type="button"
                    onClick={() => void onBuildWizardOutput()}
                    disabled={wizBusy || !runIds.length}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 w-full"
                    title={!runIds.length ? 'Attach a run first' : undefined}
                  >
                    <Wand2 className="w-4 h-4" />
                    {wizBusy ? 'Building…' : 'Build wizard output'}
                  </button>
                  {wizError && <div className="text-xs text-red-700">{wizError}</div>}
                  {wizardOutput ? (
                    <pre className="text-[11px] bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-[260px]">{wizardJson.text}</pre>
                  ) : (
                    <div className="text-sm text-gray-600">Not built yet.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="xl:col-span-4 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Diff runs (drilldown)</div>
            </div>
            {!session ? (
              <div className="p-4 text-sm text-gray-600">Select a session with runs.</div>
            ) : runIds.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">Attach at least one run.</div>
            ) : (
              <div className="p-4 space-y-3 overflow-auto">
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-xs text-gray-600">
                    Run A
                    <select value={diffA} onChange={(e) => setDiffA(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono">
                      {runIds.map((rid) => (
                        <option key={rid} value={rid}>
                          {rid}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-gray-600">
                    Run B
                    <select value={diffB} onChange={(e) => setDiffB(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono">
                      {runIds.map((rid) => (
                        <option key={rid} value={rid}>
                          {rid}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => void onDiff()}
                    disabled={!diffA || !diffB || diffBusy}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                  >
                    {diffBusy ? 'Diffing…' : 'Diff'}
                  </button>
                  {diffError && <div className="text-xs text-red-700">{diffError}</div>}
                </div>

                {!diff ? (
                  <div className="text-sm text-gray-600">Select two runs and click Diff.</div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {fixedCategoryOrder.map((cat) => {
                        const active = String(diffCategory) === String(cat);
                        const hasChanges = Boolean((diff as any)?.categories?.find?.((c: any) => String(c?.category || '') === String(cat))?.changedPaths?.length);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setDiffCategory(String(cat))}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
                              active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            } ${hasChanges ? '' : 'opacity-60'}`}
                            title={hasChanges ? 'Has changes' : 'No changes'}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900">Changed paths (max 25)</div>
                      {!activeCategorySummary || !Array.isArray((activeCategorySummary as any).changedPaths) || (activeCategorySummary as any).changedPaths.length === 0 ? (
                        <div className="text-sm text-gray-600">No changed paths in this category.</div>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {((activeCategorySummary as any).changedPaths as any[]).slice(0, 25).map((p: any) => {
                            const path = String(p || '').trim();
                            const d = activeDetailedItems.find((it: any) => String(it?.path || '') === path) || null;
                            return (
                              <details key={path} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <summary className="cursor-pointer text-[11px] font-mono text-gray-800">{path}</summary>
                                {d ? (
                                  <div className="mt-2 grid grid-cols-1 gap-2 text-[11px] font-mono text-gray-700">
                                    <div>
                                      <div className="text-[10px] font-semibold text-gray-500 uppercase">Before</div>
                                      <div className="break-words">{String(d.beforePreview || '')}</div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] font-semibold text-gray-500 uppercase">After</div>
                                      <div className="break-words">{String(d.afterPreview || '')}</div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-2 text-xs text-gray-600">Preview unavailable (older diff payload).</div>
                                )}
                              </details>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

