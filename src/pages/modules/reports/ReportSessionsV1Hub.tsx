import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileStack, RefreshCw, Play, FileText, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { ReportSessionKindV1, ReportSessionV1 } from '../../../shared/types/reportSessionsV1';
import {
  buildWizardOutputForReportSessionV1,
  createReportSessionV1,
  generateEngineeringPackFromSessionV1,
  generateExecutivePackFromSessionV1,
  generateInternalEngineeringReportFromSessionV1,
  getReportSessionV1,
  listReportSessionsV1,
  runUtilityInReportSessionV1,
  setPciaVintageKeyInReportSessionV1,
  setProjectMetadataInReportSessionV1,
  setProviderInReportSessionV1,
  setRateCodeInReportSessionV1,
  uploadBillInputToReportSessionV1,
  uploadIntervalInputToReportSessionV1,
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

function statusChipClass(status: string): string {
  const s = String(status || '').toUpperCase();
  if (s === 'DONE') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (s === 'NEEDS_INPUT') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (s === 'BLOCKED') return 'bg-red-50 text-red-800 border-red-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
}

function getInlineWizardOutput(session: ReportSessionV1 | null): any | null {
  const wiz: any = (session as any)?.wizardOutputV1 ?? null;
  if (!wiz || typeof wiz !== 'object') return null;
  if (String(wiz.kind || '').trim() === 'INLINE') return (wiz as any).wizardOutput ?? null;
  return null;
}

function buildClientWizardSteps(session: ReportSessionV1 | null, opts: { demo: boolean }): any[] {
  if (!session) return [];
  const inputs: any = (session as any)?.inputsV1 && typeof (session as any).inputsV1 === 'object' ? (session as any).inputsV1 : {};
  const hasBill = Boolean(String(inputs?.billPdfTextRef || '').trim()) || Boolean((session as any)?.inputsSummary?.hasBillText);
  const hasIntervals = Boolean(String(inputs?.intervalFile?.uploadsRef || '').trim()) || Boolean((session as any)?.inputsSummary?.hasIntervals);
  const hasAddress = Boolean(String(inputs?.projectMetadata?.address || '').trim()) || Boolean((session as any)?.inputsSummary?.hasAddress);
  const rateCode = String(inputs?.rateCode || '').trim();
  const providerType = String(inputs?.providerType || '').trim();
  const pciaVintageKey = String(inputs?.pciaVintageKey || '').trim();

  const hasAnyIntake =
    opts.demo ||
    hasBill ||
    hasIntervals ||
    Boolean(rateCode) ||
    Boolean(String(inputs?.projectMetadata?.utilityHint || (session as any)?.inputsSummary?.utilityHint || '').trim()) ||
    hasAddress;

  const runStepStatus = hasAnyIntake ? 'DONE' : 'NEEDS_INPUT';

  return [
    {
      id: 'project_metadata',
      title: 'Project metadata (optional)',
      status: hasAddress ? 'DONE' : 'OPTIONAL',
      requiredActions: [{ type: 'ADD_PROJECT_METADATA', status: hasAddress ? 'DONE' : 'OPTIONAL' }],
      helpText: 'Optional context that improves auditability and downstream reporting.',
    },
    {
      id: 'bill_pdf',
      title: 'Bill PDF',
      status: hasBill ? 'DONE' : 'NEEDS_INPUT',
      requiredActions: [{ type: 'UPLOAD_BILL_PDF', status: hasBill ? 'DONE' : 'NEEDS_INPUT' }],
      helpText: 'Used to extract rate labels, billing periods, and TOU hints when available.',
    },
    {
      id: 'interval_data',
      title: 'Interval data (CSV)',
      status: hasIntervals ? 'DONE' : 'NEEDS_INPUT',
      requiredActions: [{ type: 'UPLOAD_INTERVAL_CSV', status: hasIntervals ? 'DONE' : 'NEEDS_INPUT' }],
      helpText: 'Enables interval-derived load shape, demand, and battery feasibility signals.',
    },
    {
      id: 'rate_code',
      title: 'Current rate code',
      status: rateCode ? 'DONE' : 'NEEDS_INPUT',
      requiredActions: [{ type: 'ENTER_RATE_CODE', status: rateCode ? 'DONE' : 'NEEDS_INPUT' }],
      helpText: 'Strongly recommended for deterministic tariff resolution when bill matching is ambiguous.',
    },
    {
      id: 'supply_provider',
      title: 'Supply provider type (CCA/DA/None)',
      status: providerType ? 'DONE' : 'OPTIONAL',
      requiredActions: [{ type: 'SELECT_PROVIDER_TYPE', status: providerType ? 'DONE' : 'OPTIONAL' }],
      helpText: 'Improves generation/exit-fee context when analyzing CCA or Direct Access supply.',
    },
    {
      id: 'pcia_vintage',
      title: 'PCIA vintage key (optional)',
      status: pciaVintageKey ? 'DONE' : 'OPTIONAL',
      requiredActions: [{ type: 'SET_PCIA_VINTAGE_KEY', status: pciaVintageKey ? 'DONE' : 'OPTIONAL' }],
      helpText: 'Selects vintage-specific PCIA deterministically when available.',
    },
    {
      id: 'run_utility',
      title: 'Run Utility',
      status: runStepStatus,
      requiredActions: [],
      helpText: hasAnyIntake ? 'Run is allowed with current inputs.' : 'Add at least one intake input (or use Demo) before running.',
    },
    {
      id: 'build_wizard_output',
      title: 'Build wizard output',
      status: 'OPTIONAL',
      requiredActions: [],
      helpText: 'Rebuilds a deterministic wizard artifact from stored run snapshots.',
    },
    {
      id: 'generate_revision',
      title: 'Generate revision',
      status: Array.isArray((session as any)?.revisions) && (session as any).revisions.length ? 'DONE' : 'OPTIONAL',
      requiredActions: [],
      helpText: 'Optional: attach a rendered revision (HTML/PDF) for sharing.',
    },
  ];
}

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
  const [runBusy, setRunBusy] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string>('project_metadata');

  const [genBusy, setGenBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [engPackBusy, setEngPackBusy] = useState(false);
  const [engPackError, setEngPackError] = useState<string | null>(null);
  const [execPackBusy, setExecPackBusy] = useState(false);
  const [execPackError, setExecPackError] = useState<string | null>(null);

  const [wizBusy, setWizBusy] = useState(false);
  const [wizError, setWizError] = useState<string | null>(null);
  const [wizardOutput, setWizardOutput] = useState<any>(null);

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
        setWizardOutput(null);
        return;
      }
      setLoadingSession(true);
      setSessionError(null);
      try {
        const res = await getReportSessionV1(reportId);
        if (cancelled) return;
        setSession(res.session as any);
        setWizardOutput(getInlineWizardOutput(res.session as any));
      } catch (e) {
        if (cancelled) return;
        setSessionError(e instanceof Error ? e.message : 'Failed to load session');
        setSession(null);
        setWizardOutput(null);
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

  async function onRunUtility(opts?: { runAnyway?: boolean }) {
    if (!session?.reportId) return;
    setRunBusy(true);
    setRunError(null);
    try {
      const res = await runUtilityInReportSessionV1(session.reportId, {
        ...(opts?.runAnyway ? { runAnyway: true } : {}),
        workflowInputs: {
          demo,
        },
      });
      await loadIndex();
      setSelectedReportId(res.reportId);
      const refreshed = await getReportSessionV1(res.reportId);
      setSession(refreshed.session as any);
      setWizardOutput(getInlineWizardOutput(refreshed.session as any));
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

  async function onGenerateEngineeringPack() {
    if (!session?.reportId) return;
    setEngPackBusy(true);
    setEngPackError(null);
    try {
      await generateEngineeringPackFromSessionV1(session.reportId, {});
      const refreshed = await getReportSessionV1(session.reportId);
      setSession(refreshed.session as any);
    } catch (e) {
      setEngPackError(e instanceof Error ? e.message : 'Failed to generate engineering pack');
    } finally {
      setEngPackBusy(false);
    }
  }

  async function onGenerateExecutivePack() {
    if (!session?.reportId) return;
    setExecPackBusy(true);
    setExecPackError(null);
    try {
      await generateExecutivePackFromSessionV1(session.reportId, {});
      const refreshed = await getReportSessionV1(session.reportId);
      setSession(refreshed.session as any);
    } catch (e) {
      setExecPackError(e instanceof Error ? e.message : 'Failed to generate executive pack');
    } finally {
      setExecPackBusy(false);
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

  const wizardJson = useMemo(() => jsonPretty(wizardOutput), [wizardOutput]);

  const runIds = Array.isArray(session?.runIds) ? session!.runIds : [];
  const revisions = Array.isArray(session?.revisions) ? session!.revisions : [];
  const steps = useMemo(() => {
    const fromWiz = Array.isArray((wizardOutput as any)?.wizardSteps) ? (wizardOutput as any).wizardSteps : null;
    return fromWiz || buildClientWizardSteps(session, { demo });
  }, [wizardOutput, session, demo]);

  const activeStep = steps.find((s: any) => String(s?.id || '') === String(selectedStepId || '')) || steps[0] || null;
  const missingInfoSummary = (wizardOutput as any)?.missingInfoSummary || null;
  const gatingStep = steps.find((s: any) => String(s?.id || '') === 'run_utility') || null;
  const runBlocked = String(gatingStep?.status || '').toUpperCase() === 'BLOCKED';
  const runNeedsInput = String(gatingStep?.status || '').toUpperCase() === 'NEEDS_INPUT';

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
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Wizard steps</div>
                <div className="text-sm font-semibold text-gray-900 truncate">{session?.title || '—'}</div>
              </div>
              <button
                type="button"
                onClick={() => void onBuildWizardOutput()}
                disabled={wizBusy || !session?.reportId || !runIds.length}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                title={!runIds.length ? 'Attach a run first' : 'Rebuild wizard output (POST, snapshot-only)'}
              >
                <Wand2 className="w-4 h-4" />
                {wizBusy ? 'Building…' : 'Rebuild'}
              </button>
            </div>

            {!selectedReportId && <div className="p-4 text-sm text-gray-600">Select a session.</div>}
            {selectedReportId && loadingSession && <div className="p-4 text-sm text-gray-600">Loading…</div>}
            {selectedReportId && sessionError && <div className="p-4 text-sm text-red-700">{sessionError}</div>}

            {session && (
              <div className="flex-1 overflow-auto">
                <div className="p-4 space-y-2 border-b border-gray-100">
                  <div className="text-xs text-gray-600 font-mono break-all">{session.reportId}</div>
                  <div className="grid grid-cols-1 gap-1 text-xs text-gray-700">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-gray-500">status</div>
                      <div className="font-mono">{session.status}</div>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-gray-500">projectId</div>
                      <div className="font-mono break-all">{session.projectId || '—'}</div>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-gray-500">runs</div>
                      <div className="font-mono">{runIds.length}</div>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  {steps.map((s: any) => {
                    const active = String(s.id) === String(selectedStepId);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedStepId(String(s.id))}
                        className={`w-full text-left px-3 py-2 rounded-lg border mb-2 ${active ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-gray-900 truncate">{s.title}</div>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusChipClass(String(s.status || ''))}`}>
                            {String(s.status || 'OPTIONAL')}
                          </span>
                        </div>
                        {s.helpText ? <div className="text-xs text-gray-600 mt-1">{String(s.helpText)}</div> : null}
                      </button>
                    );
                  })}
                </div>

                {wizError && <div className="px-4 pb-4 text-xs text-red-700">{wizError}</div>}
              </div>
            )}
          </div>

          <div className="xl:col-span-4 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Step actions</div>
            </div>

            {!session ? (
              <div className="p-4 text-sm text-gray-600">Select a session.</div>
            ) : !activeStep ? (
              <div className="p-4 text-sm text-gray-600">No steps available.</div>
            ) : (
              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{String(activeStep.title || '')}</div>
                  {activeStep.helpText ? <div className="text-sm text-gray-600 mt-1">{String(activeStep.helpText)}</div> : null}
                </div>

                {String(activeStep.id) === 'bill_pdf' ? (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-700">Upload a bill PDF (server extracts and stores bill text snapshot).</div>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f || !session?.reportId) return;
                        void (async () => {
                          try {
                            await uploadBillInputToReportSessionV1(session.reportId, f);
                            const refreshed = await getReportSessionV1(session.reportId);
                            setSession(refreshed.session as any);
                            setWizardOutput(getInlineWizardOutput(refreshed.session as any));
                          } catch (err) {
                            setRunError(err instanceof Error ? err.message : 'Failed to upload bill');
                          }
                        })();
                      }}
                    />
                  </div>
                ) : null}

                {String(activeStep.id) === 'interval_data' ? (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-700">Upload interval CSV (PG&E exports supported) or JSON.</div>
                    <input
                      type="file"
                      accept=".csv,application/vnd.ms-excel,application/json,.json,text/csv"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f || !session?.reportId) return;
                        void (async () => {
                          try {
                            await uploadIntervalInputToReportSessionV1(session.reportId, f);
                            const refreshed = await getReportSessionV1(session.reportId);
                            setSession(refreshed.session as any);
                            setWizardOutput(getInlineWizardOutput(refreshed.session as any));
                          } catch (err) {
                            setRunError(err instanceof Error ? err.message : 'Failed to upload interval');
                          }
                        })();
                      }}
                    />
                  </div>
                ) : null}

                {String(activeStep.id) === 'rate_code' ? (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-700">Enter current rate code (e.g., `B-19`, `E-19S`).</div>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                      placeholder="Rate code"
                      defaultValue={String((session as any)?.inputsV1?.rateCode || '')}
                      onBlur={(e) => {
                        const rateCode = String((e.target as any).value || '').trim();
                        if (!rateCode || !session?.reportId) return;
                        void (async () => {
                          try {
                            await setRateCodeInReportSessionV1(session.reportId, { rateCode });
                            const refreshed = await getReportSessionV1(session.reportId);
                            setSession(refreshed.session as any);
                          } catch (err) {
                            setRunError(err instanceof Error ? err.message : 'Failed to set rate code');
                          }
                        })();
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        (e.target as any).blur?.();
                      }}
                    />
                    <div className="text-xs text-gray-500">Saved on blur / Enter (snapshot-only).</div>
                  </div>
                ) : null}

                {String(activeStep.id) === 'supply_provider' ? (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-700">Select supply provider type.</div>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      value={String((session as any)?.inputsV1?.providerType || '')}
                      onChange={(e) => {
                        const providerType = e.target.value as any;
                        if (!session?.reportId) return;
                        void (async () => {
                          try {
                            await setProviderInReportSessionV1(session.reportId, { providerType });
                            const refreshed = await getReportSessionV1(session.reportId);
                            setSession(refreshed.session as any);
                          } catch (err) {
                            setRunError(err instanceof Error ? err.message : 'Failed to set provider');
                          }
                        })();
                      }}
                    >
                      <option value="">—</option>
                      <option value="NONE">None (bundled)</option>
                      <option value="CCA">CCA</option>
                      <option value="DA">Direct Access (DA)</option>
                    </select>
                  </div>
                ) : null}

                {String(activeStep.id) === 'pcia_vintage' ? (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-700">Set PCIA vintage key (example: `2019`).</div>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                      defaultValue={String((session as any)?.inputsV1?.pciaVintageKey || '')}
                      placeholder="pciaVintageKey"
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        const pciaVintageKey = String((e.target as any).value || '').trim();
                        if (!pciaVintageKey || !session?.reportId) return;
                        void (async () => {
                          try {
                            await setPciaVintageKeyInReportSessionV1(session.reportId, { pciaVintageKey });
                            const refreshed = await getReportSessionV1(session.reportId);
                            setSession(refreshed.session as any);
                          } catch (err) {
                            setRunError(err instanceof Error ? err.message : 'Failed to set PCIA vintage key');
                          }
                        })();
                      }}
                    />
                    <div className="text-xs text-gray-500">Tip: press Enter to save.</div>
                  </div>
                ) : null}

                {String(activeStep.id) === 'project_metadata' ? (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-700">Add address and utility hint (project optional).</div>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Address"
                      defaultValue={String((session as any)?.inputsV1?.projectMetadata?.address || '')}
                      onBlur={(e) => {
                        const address = String(e.target.value || '').trim();
                        if (!session?.reportId) return;
                        void (async () => {
                          try {
                            await setProjectMetadataInReportSessionV1(session.reportId, { address });
                            const refreshed = await getReportSessionV1(session.reportId);
                            setSession(refreshed.session as any);
                          } catch (err) {
                            setRunError(err instanceof Error ? err.message : 'Failed to set project metadata');
                          }
                        })();
                      }}
                    />
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Utility hint (e.g., PGE)"
                      defaultValue={String((session as any)?.inputsV1?.projectMetadata?.utilityHint || '')}
                      onBlur={(e) => {
                        const utilityHint = String(e.target.value || '').trim();
                        if (!session?.reportId) return;
                        void (async () => {
                          try {
                            await setProjectMetadataInReportSessionV1(session.reportId, { utilityHint });
                            const refreshed = await getReportSessionV1(session.reportId);
                            setSession(refreshed.session as any);
                          } catch (err) {
                            setRunError(err instanceof Error ? err.message : 'Failed to set project metadata');
                          }
                        })();
                      }}
                    />
                    <div className="text-xs text-gray-500">Saved on blur (snapshot-only).</div>
                  </div>
                ) : null}

                {String(activeStep.id) === 'run_utility' ? (
                  <div className="space-y-3">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
                      Demo mode (sample intervals)
                    </label>
                    <button
                      type="button"
                      onClick={() => void onRunUtility({ runAnyway: false })}
                      disabled={runBusy || runBlocked || runNeedsInput}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 w-full"
                      title={runBlocked ? 'Blocked by last run missing required inputs' : runNeedsInput ? 'Add at least one input (or use Demo) first' : undefined}
                    >
                      <Play className="w-4 h-4" />
                      {runBusy ? 'Running…' : 'Run Utility'}
                    </button>
                    {(runBlocked || runNeedsInput) && (
                      <button
                        type="button"
                        onClick={() => void onRunUtility({ runAnyway: true })}
                        disabled={runBusy}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 w-full"
                      >
                        Run anyway (mark outputs partial)
                      </button>
                    )}
                    {runError && <div className="text-xs text-red-700">{runError}</div>}
                  </div>
                ) : null}

                {String(activeStep.id) === 'build_wizard_output' ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => void onBuildWizardOutput()}
                      disabled={wizBusy || !runIds.length}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-50 w-full"
                      title={!runIds.length ? 'Attach a run first' : undefined}
                    >
                      <Wand2 className="w-4 h-4" />
                      {wizBusy ? 'Building…' : 'Build wizard output'}
                    </button>
                    {wizardOutput ? (
                      <pre className="text-[11px] bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-[260px]">{wizardJson.text}</pre>
                    ) : (
                      <div className="text-sm text-gray-600">Not built yet.</div>
                    )}
                  </div>
                ) : null}

                {String(activeStep.id) === 'generate_revision' ? (
                  <div className="space-y-2">
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
                    <button
                      type="button"
                      onClick={() => void onGenerateEngineeringPack()}
                      disabled={engPackBusy || !runIds.length}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 w-full"
                      title={!runIds.length ? 'Attach a run first' : 'Snapshot-only (stored run snapshot)'}>
                      <FileText className="w-4 h-4" />
                      {engPackBusy ? 'Generating…' : 'Generate Engineering Pack'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onGenerateExecutivePack()}
                      disabled={execPackBusy || !runIds.length}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 w-full"
                      title={!runIds.length ? 'Attach a run first' : 'Snapshot-only (stored run snapshot)'}>
                      <FileText className="w-4 h-4" />
                      {execPackBusy ? 'Generating…' : 'Generate Executive Pack'}
                    </button>
                    {genError && <div className="text-xs text-red-700">{genError}</div>}
                    {engPackError && <div className="text-xs text-red-700">{engPackError}</div>}
                    {execPackError && <div className="text-xs text-red-700">{execPackError}</div>}
                    {revisions.length ? (
                      <div className="space-y-2">
                        {revisions.slice(0, 8).map((r) => (
                          <div key={r.revisionId} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 truncate">
                                  {String((r as any)?.reportType || 'INTERNAL_ENGINEERING_V1')}
                                </div>
                                <div className="text-xs text-gray-600 font-mono truncate">
                                  {shortIso(r.createdAtIso)} • fmt={String(r.format || '')} • rev={r.revisionId.slice(0, 8)}… • run={String(r.runId || '').slice(0, 8)}…
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {session?.projectId ? (
                                  <a
                                    className="text-xs font-semibold text-blue-700 hover:underline"
                                    href={`/api/projects/${encodeURIComponent(String(session.projectId))}/reports/revisions/${encodeURIComponent(String(r.revisionId))}/html`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    HTML
                                  </a>
                                ) : null}
                                {session?.projectId ? (
                                  <a
                                    className="text-xs font-semibold text-blue-700 hover:underline"
                                    href={`/api/projects/${encodeURIComponent(String(session.projectId))}/reports/revisions/${encodeURIComponent(String(r.revisionId))}/json`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    JSON
                                  </a>
                                ) : null}
                                {session?.projectId ? (
                                  <a
                                    className="text-xs font-semibold text-blue-700 hover:underline"
                                    href={`/api/projects/${encodeURIComponent(String(session.projectId))}/reports/revisions/${encodeURIComponent(String(r.revisionId))}/pdf`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    PDF
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">No revisions attached yet.</div>
                    )}
                  </div>
                ) : null}

                {missingInfoSummary ? (
                  <div className="border-t border-gray-100 pt-4 space-y-2">
                    <div className="text-sm font-semibold text-gray-900">Missing info (from last built wizard output)</div>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-xs font-semibold text-red-900">Required</div>
                        <div className="text-xs text-red-800 mt-1">
                          {Array.isArray((missingInfoSummary as any)?.required) && (missingInfoSummary as any).required.length
                            ? (missingInfoSummary as any).required.slice(0, 8).map((m: any) => <div key={String(m?.id)} className="font-mono break-all">{String(m?.id)}</div>)
                            : '—'}
                        </div>
                      </div>
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="text-xs font-semibold text-amber-900">Recommended</div>
                        <div className="text-xs text-amber-800 mt-1">
                          {Array.isArray((missingInfoSummary as any)?.recommended) && (missingInfoSummary as any).recommended.length
                            ? (missingInfoSummary as any).recommended.slice(0, 8).map((m: any) => <div key={String(m?.id)} className="font-mono break-all">{String(m?.id)}</div>)
                            : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

