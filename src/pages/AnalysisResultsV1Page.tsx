import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Battery, Building2, ClipboardList, Download, FileText, ListChecks, PlugZap, TrendingUp } from 'lucide-react';
import { SectionCard } from '../components/SectionCard';
import { MarkdownViewer } from '../components/analysis/MarkdownViewer';
import * as analysisApi from '../shared/api/analysisResults';

type TabId = 'overview' | 'rate' | 'programs' | 'battery' | 'missing' | 'inbox' | 'markdown';

function toneClasses(tone: 'gray' | 'red' | 'amber' | 'blue' | 'green'): string {
  switch (tone) {
    case 'red':
      return 'bg-red-50 text-red-800 border-red-200';
    case 'amber':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'blue':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'green':
      return 'bg-green-50 text-green-800 border-green-200';
    default:
      return 'bg-gray-50 text-gray-800 border-gray-200';
  }
}

function StatusPill(props: { label: string; tone?: 'gray' | 'red' | 'amber' | 'blue' | 'green' }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] font-semibold ${toneClasses(props.tone || 'gray')}`}>
      {props.label}
    </span>
  );
}

function tabButtonClass(active: boolean): string {
  return [
    'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
    active ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700',
  ].join(' ');
}

function formatDollars(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}$${abs.toFixed(0)}`;
}

function getDeltaMissingNote(a: any): string {
  const because = Array.isArray(a?.because) ? a.because.map((b: any) => String(b || '').toLowerCase()) : [];
  const needsSchedule = because.some((b: string) => b.includes('schedule') || b.includes('business-hours'));
  const needsBilling = because.some((b: string) => b.includes('billing cycle') || b.includes('billing periods'));
  const needsMoreMonths = because.some((b: string) => b.includes('months') || b.includes('interval data'));

  const lines: string[] = [];
  if (needsSchedule) lines.push('needs current operating schedule');
  if (needsBilling) lines.push('needs seasonal billing periods');
  if (needsMoreMonths) lines.push('needs additional months of interval data');
  if (!lines.length) lines.push('needs additional inputs to compute deterministic savings');
  return lines.join(' · ');
}

function truncateText(s: unknown, maxLen = 140): string {
  const t = String(s ?? '').trim();
  if (!t) return '';
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}

function supplyTypeLabel(type: unknown): string {
  const t = String(type || '').trim();
  switch (t) {
    case 'bundled':
      return 'Bundled (Utility Supply)';
    case 'CCA':
      return 'Community Choice Aggregation (CCA)';
    case 'DA':
      return 'Direct Access (ESP)';
    default:
      return 'Unknown';
  }
}

function supplyConfidenceLabel(confidence: unknown): string {
  const n = Number(confidence);
  if (!Number.isFinite(n)) return 'Unknown';
  const tier = n >= 0.8 ? 'High' : n >= 0.5 ? 'Medium' : 'Low';
  return `${tier} (${n.toFixed(2)})`;
}

function supplyBecauseSummary(because: unknown): string {
  const arr = Array.isArray(because) ? (because as any[]).map((x) => String(x ?? '').trim()).filter(Boolean) : [];
  if (!arr.length) return '';
  const top = arr.slice(0, 2).map((s) => truncateText(s, 120));
  return top.join(' • ');
}

function applicabilityTone(status: unknown): 'green' | 'red' | 'amber' | 'gray' {
  const s = String(status || '').trim();
  if (s === 'applicable') return 'green';
  if (s === 'not_applicable') return 'red';
  if (s === 'unknown') return 'amber';
  return 'gray';
}

function applicabilityLabel(status: unknown): string {
  const s = String(status || '').trim();
  if (s === 'applicable') return 'Applicable';
  if (s === 'not_applicable') return 'Not applicable';
  return 'Unknown';
}

function confidenceLabel(confidence: unknown): string {
  const n = Number(confidence);
  if (!Number.isFinite(n)) return 'Unknown';
  const tier = n >= 0.8 ? 'High' : n >= 0.5 ? 'Medium' : 'Low';
  return `${tier} (${n.toFixed(2)})`;
}

function loadAttributionLabel(classification: unknown): string {
  const s = String(classification || '').trim();
  switch (s) {
    case 'cooling_driven':
      return 'Cooling-driven';
    case 'heating_driven':
      return 'Heating-driven';
    case 'base_load':
      return 'Base-load dominated';
    case 'mixed':
      return 'Mixed';
    default:
      return 'Unknown';
  }
}

function pickApplicabilityBecause(because: unknown): string[] {
  const arr = Array.isArray(because) ? (because as any[]).map((x) => String(x ?? '').trim()).filter(Boolean) : [];
  if (!arr.length) return [];
  const preferred = arr.filter((s) => /rule:|threshold|demand|storage|requires|meets|below|exceeds/i.test(s));
  const base = (preferred.length ? preferred : arr).filter((s) => !/^applicability evaluation v1/i.test(s));
  const out: string[] = [];
  for (const s of base) {
    if (out.length >= 2) break;
    if (out.includes(s)) continue;
    out.push(truncateText(s, 160));
  }
  return out.length ? out : arr.slice(0, 2).map((s) => truncateText(s, 160));
}

function shortIso(s: unknown): string {
  const t = String(s ?? '').trim();
  if (!t) return '—';
  // Keep deterministic display: avoid locale formatting; just trim long ISO strings.
  return t.length > 24 ? `${t.slice(0, 24)}…` : t;
}

function formatPct01(n: unknown): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${(v * 100).toFixed(0)}%`;
}

export const AnalysisResultsV1Page: React.FC = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const projectIdRaw = String(params.projectId || '').trim();
  const demo = projectIdRaw.toLowerCase() === 'demo' || String(searchParams.get('demo') || '').toLowerCase() === 'true';
  const projectId = projectIdRaw || 'demo';

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [behaviorV3Commodity, setBehaviorV3Commodity] = useState<'electric' | 'gas'>('electric');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<analysisApi.AnalysisResultsV1Response | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const tabs = useMemo<Array<{ id: TabId; label: string }>>(
    () => [
      { id: 'overview', label: 'Overview' },
      { id: 'rate', label: 'Rate & Tariff' },
      { id: 'programs', label: 'Programs' },
      { id: 'battery', label: 'Battery Screening' },
      { id: 'missing', label: 'Missing Inputs' },
      { id: 'inbox', label: 'Inbox Suggestions' },
      { id: 'markdown', label: 'Summary (Markdown)' },
    ],
    []
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await analysisApi.getAnalysisResultsV1({ projectId, demo });
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load analysis results');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [projectId, demo]);

  const project = data?.project as any;
  const workflow = data?.workflow as any;
  const summary = data?.summary as any;

  const insights = workflow?.utility?.insights as any;
  const tariffLibrary = insights?.tariffLibrary as any;
  const tariffApplicability = insights?.tariffApplicability as any;
  const detSummary = insights?.determinantsPackSummary as any;
  const loadAttribution = insights?.loadAttribution as any;
  const versionTags = insights?.versionTags as any;
  const supplyType = String(insights?.supplyStructure?.supplyType || '').trim() || 'bundled';
  const qualifySavings = supplyType !== 'bundled';
  const missingInputs: string[] = Array.isArray(workflow?.requiredInputsMissing)
    ? workflow.requiredInputsMissing
    : Array.isArray(summary?.json?.missingInputsChecklist)
      ? summary.json.missingInputsChecklist
      : [];

  const programsMatches: any[] = Array.isArray(insights?.programs?.matches) ? insights.programs.matches : [];
  const utilityRecos: any[] = Array.isArray(workflow?.utility?.recommendations) ? workflow.utility.recommendations : [];
  const allSuggestions: any[] = Array.isArray(workflow?.inbox?.suggestions) ? workflow.inbox.suggestions : [];
  const allInboxItems: any[] = Array.isArray(workflow?.inbox?.inboxItems) ? workflow.inbox.inboxItems : [];

  const gateStatus = String(workflow?.battery?.gate?.status || 'unknown');
  const gateTone =
    gateStatus === 'recommended' ? 'green' : gateStatus === 'not_recommended' ? 'gray' : gateStatus === 'unknown' ? 'amber' : 'gray';

  const rateStatus = String(insights?.rateFit?.status || 'unknown');
  const rateTone =
    rateStatus === 'good' ? 'green' : rateStatus === 'ok' ? 'blue' : rateStatus === 'likely_suboptimal' ? 'amber' : 'gray';

  const optionSStatus = String(insights?.optionSRelevance?.status || 'unknown');
  const optionSTone =
    optionSStatus === 'relevant' ? 'amber' : optionSStatus === 'not_relevant' ? 'gray' : optionSStatus === 'unknown' ? 'blue' : 'gray';

  const exportPdfUrl = useMemo(() => {
    const qs = demo ? '?demo=true' : '';
    return `/api/projects/${encodeURIComponent(projectId)}/analysis-results-v1.pdf${qs}`;
  }, [projectId, demo]);

  const inferredUtilityLabel = useMemo(() => {
    const u =
      String(workflow?.utility?.utility || '').trim() ||
      String(workflow?.utility?.inputs?.currentRate?.utility || '').trim() ||
      String(workflow?.utility?.inputs?.utilityTerritory || '').trim() ||
      String(workflow?.utility?.inputs?.utilityTerritoryCode || '').trim() ||
      String(project?.territory || '').trim() ||
      '';
    return u;
  }, [workflow, project]);

  const showTariffPanel = useMemo(() => {
    if (tariffLibrary) return true;
    const u = inferredUtilityLabel.toLowerCase();
    return u === 'pge' || u === 'sce' || u === 'sdge' || u === 'sdg&e';
  }, [tariffLibrary, inferredUtilityLabel]);

  async function onExportPdf() {
    try {
      setExportingPdf(true);
      // Direct download to keep existing UI flow intact.
      const a = document.createElement('a');
      a.href = exportPdfUrl;
      a.download = '';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      window.setTimeout(() => setExportingPdf(false), 600);
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Link to="/projects" className="text-gray-500 hover:text-gray-700 inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Projects</span>
            </Link>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {String(project?.name || `Analysis Results (${projectId})`)}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {String(project?.siteLocation || 'Location n/a')}
                {project?.territory ? ` • Territory: ${String(project.territory)}` : ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {demo && <StatusPill label="Demo mode" tone="blue" />}
                <StatusPill label={`Rate fit: ${rateStatus}`} tone={rateTone as any} />
                <StatusPill label={`Option S: ${optionSStatus}`} tone={optionSTone as any} />
                <StatusPill label={`Battery: ${gateStatus}`} tone={gateTone as any} />
                {missingInputs.length > 0 && <StatusPill label={`Missing inputs: ${missingInputs.length}`} tone="amber" />}
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <button
            type="button"
            onClick={onExportPdf}
            disabled={exportingPdf}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export a branded PDF for this analysis"
          >
            <Download className="w-4 h-4" />
            <span>{exportingPdf ? 'Exporting…' : 'Export PDF'}</span>
          </button>
          <div className="text-xs text-gray-500">Project ID</div>
          <div className="text-sm font-mono text-gray-800">{projectId}</div>
        </div>
      </div>

      {error && (
        <SectionCard title="Failed to load results" description="This page is read-only." icon={<ClipboardList className="w-5 h-5 text-red-500" />}>
          <div className="text-sm text-gray-700 space-y-2">
            <p>{error}</p>
            <p>
              Tip: open <span className="font-mono">/analysis/v1/demo</span> for an immediate demo experience.
            </p>
          </div>
        </SectionCard>
      )}

      {loading && !data && (
        <SectionCard title="Loading analysis results…" description="Running deterministic workflow + summary generator." icon={<TrendingUp className="w-5 h-5 text-blue-600" />}>
          <div className="text-sm text-gray-600">Please wait.</div>
        </SectionCard>
      )}

      {data && (
        <>
          <div className="border-b border-gray-200">
            <div className="flex flex-wrap gap-x-1">
              {tabs.map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={tabButtonClass(activeTab === t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard
                title="Load Shape"
                description="Deterministic metrics from interval kW."
                icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
                right={insights?.operatingPatternInference?.scheduleBucket ? <StatusPill label={String(insights.operatingPatternInference.scheduleBucket)} tone="gray" /> : null}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Baseload</div>
                    <div className="text-lg font-bold text-gray-900">{Number.isFinite(insights?.inferredLoadShape?.baseloadKw) ? `${insights.inferredLoadShape.baseloadKw.toFixed(1)} kW` : 'n/a'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Peak</div>
                    <div className="text-lg font-bold text-gray-900">{Number.isFinite(insights?.inferredLoadShape?.peakKw) ? `${insights.inferredLoadShape.peakKw.toFixed(1)} kW` : 'n/a'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Load factor</div>
                    <div className="text-lg font-bold text-gray-900">{Number.isFinite(insights?.inferredLoadShape?.loadFactor) ? insights.inferredLoadShape.loadFactor.toFixed(2) : 'n/a'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Peakiness</div>
                    <div className="text-lg font-bold text-gray-900">{Number.isFinite(insights?.inferredLoadShape?.peakinessIndex) ? insights.inferredLoadShape.peakinessIndex.toFixed(2) : 'n/a'}</div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Rate Fit"
                description="Current rate fit + deterministic alternatives list."
                icon={<PlugZap className="w-5 h-5 text-blue-600" />}
                right={<StatusPill label={rateStatus} tone={rateTone as any} />}
              >
                <ul className="text-sm text-gray-700 space-y-1">
                  {(Array.isArray(insights?.rateFit?.because) ? insights.rateFit.because : []).slice(0, 4).map((b: any, idx: number) => (
                    <li key={idx}>- {String(b)}</li>
                  ))}
                </ul>
                <div className="mt-4">
                  <div className="text-xs text-gray-500 mb-2">Top alternatives</div>
                  <div className="space-y-2">
                    {(Array.isArray(insights?.rateFit?.alternatives) ? insights.rateFit.alternatives : []).slice(0, 3).map((a: any, idx: number) => (
                      <div key={idx} className="flex items-start justify-between gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {String(a.utility || '')} {String(a.rateCode || '')}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">{String((Array.isArray(a.because) ? a.because[0] : '') || '')}</div>
                        </div>
                        <StatusPill label={String(a.status || 'needs_eval')} tone="gray" />
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Programs Matched"
                description="Demand response + utility/ISO programs."
                icon={<ClipboardList className="w-5 h-5 text-blue-600" />}
                right={<StatusPill label={`${programsMatches.length} matches`} tone="gray" />}
              >
                <div className="space-y-2">
                  {programsMatches.slice(0, 5).map((m: any, idx: number) => (
                    <div key={idx} className="flex items-start justify-between gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {String(m.programId)} {m.programName ? `— ${String(m.programName)}` : ''}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{String((Array.isArray(m.because) ? m.because[0] : '') || '')}</div>
                      </div>
                      <StatusPill label={String(m.matchStatus || 'unknown')} tone={String(m.matchStatus) === 'eligible' ? 'green' : String(m.matchStatus) === 'likely_eligible' ? 'blue' : String(m.matchStatus) === 'unlikely' ? 'gray' : 'amber'} />
                    </div>
                  ))}
                  {programsMatches.length === 0 && <div className="text-sm text-gray-600">No program matches available.</div>}
                </div>
              </SectionCard>

              <SectionCard
                title="Battery Screening"
                description="Feasibility gate + top candidates (no dispatch in v1)."
                icon={<Battery className="w-5 h-5 text-blue-600" />}
                right={<StatusPill label={gateStatus} tone={gateTone as any} />}
              >
                <ul className="text-sm text-gray-700 space-y-1">
                  {(Array.isArray(workflow?.battery?.gate?.because) ? workflow.battery.gate.because : []).slice(0, 4).map((b: any, idx: number) => (
                    <li key={idx}>- {String(b)}</li>
                  ))}
                </ul>
                <div className="mt-4">
                  <div className="text-xs text-gray-500 mb-2">Top candidates</div>
                  <div className="space-y-2">
                    {(Array.isArray(workflow?.battery?.selection?.rankedCandidates) ? workflow.battery.selection.rankedCandidates : [])
                      .slice(0, 3)
                      .map((c: any, idx: number) => (
                        <div key={idx} className="flex items-start justify-between gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {String(c.vendor)} {String(c.sku)}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              fitScore={Number.isFinite(c.fitScore) ? Number(c.fitScore).toFixed(3) : 'n/a'}
                              {Array.isArray(c.disqualifiers) && c.disqualifiers.length ? ` • disq: ${c.disqualifiers.join('; ')}` : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    {(Array.isArray(workflow?.battery?.selection?.rankedCandidates) ? workflow.battery.selection.rankedCandidates : []).length === 0 && (
                      <div className="text-sm text-gray-600">No candidates selected.</div>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {activeTab === 'rate' && (
            <SectionCard title="Rate & Tariff" description="Read-only view of deterministic rate fit evaluation." icon={<PlugZap className="w-5 h-5 text-blue-600" />}>
              <div className="flex items-center gap-2 mb-3">
                <StatusPill label={`status: ${rateStatus}`} tone={rateTone as any} />
                {insights?.rateFit?.currentRateCode && <StatusPill label={`current: ${String(insights.rateFit.currentRateCode)}`} tone="gray" />}
                <button
                  type="button"
                  className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    const audit = {
                      generatedAt: new Date().toISOString(),
                      projectId,
                      versionTags: versionTags || null,
                      tariffSnapshotVersionTag: tariffLibrary?.snapshotVersionTag || null,
                      determinantsPackSummary: detSummary || null,
                      billSimV2: (insights as any)?.billSimV2 || null,
                      behaviorInsights: insights?.behaviorInsights || null,
                      behaviorInsightsV3: (insights as any)?.behaviorInsightsV3 || null,
                      reconciliation: detSummary?.meters?.[0]?.reconciliation || null,
                      loadAttribution: loadAttribution || null,
                      missingInfo: Array.isArray(insights?.missingInfo) ? insights.missingInfo : [],
                    };
                    const blob = new Blob([JSON.stringify(audit, null, 2)], { type: 'application/json' });
                    const a = document.createElement('a');
                    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                    a.href = URL.createObjectURL(blob);
                    a.download = `everwatt_analysis_audit_${String(projectId || stamp)}.json`;
                    a.rel = 'noopener';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
                  }}
                  title="Download a JSON audit bundle (determinants + attribution + missing info)"
                >
                  Export JSON
                </button>
              </div>

              {insights?.supplyStructure && (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="text-sm font-semibold text-gray-900">
                    Supply: {supplyTypeLabel(insights.supplyStructure.supplyType)}
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    Confidence: {supplyConfidenceLabel(insights.supplyStructure.confidence)}
                  </div>
                  {supplyBecauseSummary(insights.supplyStructure.because) && (
                    <div className="text-xs text-gray-600 mt-2">{supplyBecauseSummary(insights.supplyStructure.because)}</div>
                  )}
                  {String(insights.supplyStructure.supplyType || '') !== 'bundled' && (
                    <div className="text-xs text-gray-500 mt-2">
                      Note: Estimated savings may be inaccurate unless CCA/ESP generation is modeled.
                    </div>
                  )}
                </div>
              )}

              {tariffApplicability && (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">Applicability</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Confidence: {confidenceLabel(tariffApplicability?.confidence)}
                        {tariffApplicability?.determinants?.maxDemandKwObserved !== undefined && tariffApplicability?.determinants?.maxDemandKwObserved !== null
                          ? ` • max demand: ${Number(tariffApplicability.determinants.maxDemandKwObserved).toFixed(1)} kW`
                          : ''}
                        {String(tariffApplicability?.determinants?.demandSource || '').trim() ? ` • source: ${String(tariffApplicability.determinants.demandSource)}` : ''}
                      </div>
                    </div>
                    <StatusPill label={applicabilityLabel(tariffApplicability?.status)} tone={applicabilityTone(tariffApplicability?.status) as any} />
                  </div>

                  {pickApplicabilityBecause(tariffApplicability?.because).length > 0 && (
                    <ul className="text-xs text-gray-700 mt-3 space-y-1">
                      {pickApplicabilityBecause(tariffApplicability?.because).map((b: string, idx: number) => (
                        <li key={idx}>- {b}</li>
                      ))}
                    </ul>
                  )}

                  {String(tariffApplicability?.status || '') === 'unknown' && Array.isArray(tariffApplicability?.missingInfo) && tariffApplicability.missingInfo.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-gray-900 mb-1">Missing (to resolve applicability)</div>
                      <ul className="text-xs text-gray-700 space-y-1">
                        {tariffApplicability.missingInfo.slice(0, 4).map((it: any) => (
                          <li key={String(it?.id || Math.random())}>
                            - <span className="font-semibold">{String(it?.severity || 'info')}</span> ({String(it?.category || 'tariff')}): {String(it?.description || '')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(tariffApplicability?.warnings) && tariffApplicability.warnings.length > 0 && (
                    <div className="mt-3 text-xs text-gray-500">{truncateText(tariffApplicability.warnings[0], 220)}</div>
                  )}
                </div>
              )}

              {detSummary && Array.isArray(detSummary?.meters) && detSummary.meters.length > 0 && (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">Demand &amp; Usage</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Determinants {String(versionTags?.determinantsVersionTag || detSummary?.rulesVersionTag || 'v1')} • TOU {String(versionTags?.touLabelerVersionTag || 'tou_v1')} • Attribution{' '}
                        {String(versionTags?.loadAttributionVersionTag || (loadAttribution as any)?.loadAttributionVersionTag || 'cp_v0')}
                      </div>
                    </div>
                    {(Number(detSummary?.meters?.[0]?.reconciliation?.demandMismatchCount || 0) > 0 ||
                      Number(detSummary?.meters?.[0]?.reconciliation?.kwhMismatchCount || 0) > 0) && <StatusPill label="reconcile warning" tone="amber" />}
                  </div>

                  {(() => {
                    const m0 = detSummary.meters[0];
                    const c0 = Array.isArray(m0?.last12Cycles) && m0.last12Cycles.length ? m0.last12Cycles[0] : null;
                    if (!c0) return <div className="mt-2 text-xs text-gray-600">No billing-cycle determinants available.</div>;
                    const tou = c0.kWMaxByTouPeriod || null;
                    return (
                      <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="p-3 bg-white border border-gray-200 rounded-lg">
                          <div className="text-[11px] text-gray-500">Latest cycle</div>
                          <div className="text-sm font-semibold text-gray-900">{String(c0.cycleLabel || '—')}</div>
                          <div className="text-[11px] text-gray-500 mt-1">
                            {shortIso(c0.startIso)} → {shortIso(c0.endIso)}
                          </div>
                        </div>
                        <div className="p-3 bg-white border border-gray-200 rounded-lg">
                          <div className="text-[11px] text-gray-500">kWh total</div>
                          <div className="text-sm font-semibold text-gray-900">{Number.isFinite(c0.kwhTotal) ? `${Number(c0.kwhTotal).toFixed(0)} kWh` : '—'}</div>
                          <div className="text-[11px] text-gray-500 mt-1">interval={Number.isFinite(c0.intervalMinutes) ? `${Number(c0.intervalMinutes)}m` : '—'}</div>
                        </div>
                        <div className="p-3 bg-white border border-gray-200 rounded-lg">
                          <div className="text-[11px] text-gray-500">Max demand (kW)</div>
                          <div className="text-sm font-semibold text-gray-900">{Number.isFinite(c0.kWMax) ? `${Number(c0.kWMax).toFixed(1)} kW` : '—'}</div>
                          <div className="text-[11px] text-gray-500 mt-1">coverage={formatPct01(c0.coveragePct)}</div>
                        </div>
                        <div className="p-3 bg-white border border-gray-200 rounded-lg">
                          <div className="text-[11px] text-gray-500">Billing demand (slot)</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {Number.isFinite(c0.billingDemandKw) ? `${Number(c0.billingDemandKw).toFixed(1)} kW` : '—'}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-1">ratchet/demand rules may be unmodeled</div>
                        </div>
                        <div className="col-span-2 lg:col-span-4 text-[11px] text-gray-600">
                          {tou && (tou.onPeak !== undefined || tou.partialPeak !== undefined || tou.offPeak !== undefined || tou.superOffPeak !== undefined) ? (
                            <div>
                              TOU kW max:{' '}
                              {`OnPeak ${Number.isFinite(tou.onPeak) ? Number(tou.onPeak).toFixed(1) : '—'} | PartPeak ${Number.isFinite(tou.partialPeak) ? Number(tou.partialPeak).toFixed(1) : '—'} | OffPeak ${Number.isFinite(tou.offPeak) ? Number(tou.offPeak).toFixed(1) : '—'} | SuperOffPeak ${Number.isFinite(tou.superOffPeak) ? Number(tou.superOffPeak).toFixed(1) : '—'}`}
                            </div>
                          ) : (
                            <div className="text-gray-500" title="TOU buckets require TOU labeling or usage-export TOU demand columns.">
                              TOU buckets unavailable; provide rate schedule or usage export TOU columns.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {Array.isArray(detSummary?.warnings) && detSummary.warnings.length > 0 && (
                    <div className="mt-3 text-xs text-gray-500">{truncateText(detSummary.warnings[0], 220)}</div>
                  )}
                </div>
              )}

              {loadAttribution ? (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">Load Attribution</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {loadAttributionLabel(loadAttribution?.classification)} • R² {Number.isFinite(loadAttribution?.r2) ? Number(loadAttribution.r2).toFixed(2) : '—'}
                      </div>
                    </div>
                    <StatusPill
                      label={String(loadAttribution?.status || 'unknown')}
                      tone={String(loadAttribution?.status || '') === 'ok' ? 'green' : String(loadAttribution?.status || '') === 'no_weather' ? 'gray' : 'amber'}
                    />
                  </div>

                  <div className="mt-3 text-xs text-gray-700 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="text-[11px] text-gray-500">Tb (°F)</div>
                      <div className="text-sm font-semibold text-gray-900">{Number.isFinite(loadAttribution?.balanceTempF) ? `${Number(loadAttribution.balanceTempF).toFixed(0)}°F` : '—'}</div>
                    </div>
                    <div className="p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="text-[11px] text-gray-500">Base load</div>
                      <div className="text-sm font-semibold text-gray-900">{Number.isFinite(loadAttribution?.baseLoadKw) ? `${Number(loadAttribution.baseLoadKw).toFixed(1)} kW` : '—'}</div>
                    </div>
                    <div className="p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="text-[11px] text-gray-500">Cooling slope</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {Number.isFinite(loadAttribution?.coolingSlopeKwPerF) ? `${Number(loadAttribution.coolingSlopeKwPerF).toFixed(2)} kW/°F` : '—'}
                      </div>
                    </div>
                    <div className="p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="text-[11px] text-gray-500">Heating slope</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {Number.isFinite(loadAttribution?.heatingSlopeKwPerF) ? `${Number(loadAttribution.heatingSlopeKwPerF).toFixed(2)} kW/°F` : '—'}
                      </div>
                    </div>
                  </div>

                  {Array.isArray(loadAttribution?.because) && loadAttribution.because.length > 0 && (
                    <ul className="text-xs text-gray-700 mt-3 space-y-1">
                      {loadAttribution.because.slice(0, 2).map((b: any, idx: number) => (
                        <li key={idx}>- {String(b)}</li>
                      ))}
                    </ul>
                  )}

                  {String(loadAttribution?.status || '') === 'no_weather' && (
                    <div className="mt-3 text-xs text-gray-500">Weather data not present in interval export; load attribution unavailable.</div>
                  )}
                </div>
              ) : (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="text-sm font-semibold text-gray-900">Load Attribution</div>
                  <div className="mt-2 text-xs text-gray-500">Weather data not present in interval export; load attribution unavailable.</div>
                </div>
              )}

              {insights?.behaviorInsights && (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">Behavior Insights</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Months: {Number(insights.behaviorInsights.dataWindow?.monthsAvailable || 0)} • Confidence:{' '}
                        {Number.isFinite(insights.behaviorInsights.confidence) ? (insights.behaviorInsights.confidence * 100).toFixed(0) : '—'}%
                      </div>
                    </div>
                    <StatusPill label="insights" tone="gray" />
                  </div>

                  <ul className="mt-3 text-xs text-gray-700 space-y-1">
                    <li>
                      - kWh trend:{' '}
                      {Number.isFinite(insights.behaviorInsights.usageTrend?.pctChange as any)
                        ? `${(Number(insights.behaviorInsights.usageTrend?.pctChange) * 100).toFixed(1)}%`
                        : '—'}
                    </li>
                    <li>
                      - kW trend:{' '}
                      {Number.isFinite(insights.behaviorInsights.demandTrend?.pctChange as any)
                        ? `${(Number(insights.behaviorInsights.demandTrend?.pctChange) * 100).toFixed(1)}%`
                        : '—'}
                    </li>
                    <li>
                      - Peak timing:{' '}
                      {(() => {
                        const hrs = insights.behaviorInsights.peaks?.peakHourHistogram || {};
                        const top = Object.entries(hrs).sort((a, b) => b[1] - a[1])[0];
                        return top ? `${top[0]}:00` : '—';
                      })()}
                    </li>
                    {insights.behaviorInsights.anomalies?.stepChangeDetected && (
                      <li>
                        - Step change: {insights.behaviorInsights.anomalies.stepChangeDetected.whenMonth} (Δ
                        {Number.isFinite(insights.behaviorInsights.anomalies.stepChangeDetected.deltaKwh as any)
                          ? Number(insights.behaviorInsights.anomalies.stepChangeDetected.deltaKwh).toFixed(0)
                          : 'n/a'}
                        kWh)
                      </li>
                    )}
                  </ul>

                  {Array.isArray(insights.behaviorInsights.insightCards) && insights.behaviorInsights.insightCards.length > 0 && (
                    <details className="mt-3">
                      <summary className="text-xs font-semibold text-gray-900 cursor-pointer">Customer Questions</summary>
                      <ul className="mt-2 text-xs text-gray-700 space-y-1">
                        {insights.behaviorInsights.insightCards.slice(0, 3).flatMap((c, idx) =>
                          (c.customerQuestions || []).slice(0, 3).map((q, qIdx) => (
                            <li key={`${c.id}-${idx}-${qIdx}`}>- {String(q)}</li>
                          )),
                        )}
                      </ul>
                    </details>
                  )}
                </div>
              )}

              {(insights as any)?.behaviorInsightsV3 && (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  {(() => {
                    const b3 = (insights as any).behaviorInsightsV3;
                    const hasE = Boolean(b3?.electric);
                    const hasG = Boolean(b3?.gas);
                    const active = hasE && !hasG ? 'electric' : hasG && !hasE ? 'gas' : behaviorV3Commodity;
                    const cur = active === 'gas' ? b3?.gas : b3?.electric;
                    if (!cur) return null;
                    const cards = Array.isArray(cur.conversationCards) ? cur.conversationCards : [];
                    return (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900">Behavior Insights (v3)</div>
                            <div className="text-xs text-gray-600 mt-1">
                              Commodity: <span className="font-mono">{active}</span> • Months: {Number(cur.dataWindow?.monthCount || 0)} • Confidence:{' '}
                              {Number.isFinite(cur.confidence) ? (Number(cur.confidence) * 100).toFixed(0) : '—'}%
                            </div>
                          </div>
                          <StatusPill label="v3" tone="gray" />
                        </div>

                        {(hasE && hasG) ? (
                          <div className="mt-3 flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              className={`px-2 py-1 rounded-md border ${active === 'electric' ? 'bg-white border-gray-300 font-semibold' : 'bg-gray-100 border-gray-200'}`}
                              onClick={() => setBehaviorV3Commodity('electric')}
                            >
                              Electric
                            </button>
                            <button
                              type="button"
                              className={`px-2 py-1 rounded-md border ${active === 'gas' ? 'bg-white border-gray-300 font-semibold' : 'bg-gray-100 border-gray-200'}`}
                              onClick={() => setBehaviorV3Commodity('gas')}
                            >
                              Gas
                            </button>
                          </div>
                        ) : null}

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-700">
                          <div className="p-3 bg-white border border-gray-200 rounded-lg">
                            <div className="text-[11px] text-gray-500">YoY (last12 vs prior12)</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {Number.isFinite(cur.usage?.yoyDeltaPct) ? `${(Number(cur.usage.yoyDeltaPct) * 100).toFixed(0)}%` : '—'}
                            </div>
                          </div>
                          <div className="p-3 bg-white border border-gray-200 rounded-lg">
                            <div className="text-[11px] text-gray-500">Slope per month</div>
                            <div className="text-sm font-semibold text-gray-900">{Number.isFinite(cur.usage?.slopePerMonth) ? Number(cur.usage.slopePerMonth).toFixed(2) : '—'}</div>
                          </div>
                          <div className="p-3 bg-white border border-gray-200 rounded-lg">
                            <div className="text-[11px] text-gray-500">Peak month</div>
                            <div className="text-sm font-semibold text-gray-900">{String((cur.usage?.peakMonth as any)?.month || '—')}</div>
                          </div>
                        </div>

                        {cards.length ? (
                          <details className="mt-3">
                            <summary className="text-xs font-semibold text-gray-900 cursor-pointer">Top customer questions</summary>
                            <ul className="mt-2 text-xs text-gray-700 space-y-2">
                              {cards.slice(0, 5).map((c: any) => (
                                <li key={String(c.id)}>
                                  <div className="font-semibold text-gray-900">{String(c.finding)}</div>
                                  <div className="text-gray-700">- {String(c.askCustomer)}</div>
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : (
                          <div className="mt-3 text-xs text-gray-500">(No behavior v3 cards available.)</div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {showTariffPanel && (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="text-sm font-semibold text-gray-900">
                    Tariff Library{(() => {
                      const label = inferredUtilityLabel ? `: ${inferredUtilityLabel}` : '';
                      const tag = String(tariffLibrary?.snapshotVersionTag || '').trim();
                      return `${label}${tag ? ` snapshot ${tag}` : ''}`;
                    })()}
                  </div>
                  {!tariffLibrary || !String(tariffLibrary?.snapshotVersionTag || '').trim() ? (
                    <div className="mt-2 text-xs text-gray-600">Tariff snapshots not loaded. Run ingestion: <span className="font-mono">npm run tariffs:ingest:ca</span></div>
                  ) : (
                    <>
                      <div className="mt-1 text-xs text-gray-500">
                        {(() => {
                          const u = inferredUtilityLabel ? inferredUtilityLabel.trim() : '';
                          const tag = String(tariffLibrary?.snapshotVersionTag || '').trim();
                          const rate = String(tariffLibrary?.rateMetadata?.rateCode || workflow?.utility?.inputs?.currentRate?.rateCode || '').trim();
                          const qs = new URLSearchParams();
                          if (u) qs.set('utility', u);
                          if (tag) qs.set('snapshot', tag);
                          if (rate) qs.set('rate', rate);
                          const href = `/utilities/tariffs-ca${qs.toString() ? `?${qs.toString()}` : ''}`;
                          return (
                            <a className="text-blue-700 hover:text-blue-800 underline" href={href} title="Open tariff snapshot in Tariff Browser (CA)">
                              Open in Tariff Browser
                            </a>
                          );
                        })()}
                      </div>
                      <div className="text-sm text-gray-700 mt-1">Captured: {shortIso(tariffLibrary?.snapshotCapturedAt || tariffLibrary?.lastUpdatedAt)}</div>
                      {tariffLibrary?.isStale === true ? (
                        <div className="mt-2 text-xs text-amber-700 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-[1px] shrink-0" />
                          <span>Warning: tariff snapshot may be stale (&gt;14 days). Run ingestion.</span>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-gray-600">Status: up to date</div>
                      )}

                      {tariffLibrary?.changeSummary && (
                        <div className="mt-3 text-xs text-gray-600 space-y-1">
                          <div>
                            Changes since previous snapshot: +{Array.isArray(tariffLibrary.changeSummary.addedRateCodes) ? tariffLibrary.changeSummary.addedRateCodes.length : 0} / -
                            {Array.isArray(tariffLibrary.changeSummary.removedRateCodes) ? tariffLibrary.changeSummary.removedRateCodes.length : 0}
                          </div>
                          {Array.isArray(tariffLibrary.changeSummary.addedRateCodes) && tariffLibrary.changeSummary.addedRateCodes.length > 0 && (
                            <div>
                              Added: {tariffLibrary.changeSummary.addedRateCodes.slice(0, 5).join(', ')}
                              {tariffLibrary.changeSummary.addedRateCodes.length > 5 ? ', …' : ''}
                            </div>
                          )}
                          {Array.isArray(tariffLibrary.changeSummary.removedRateCodes) && tariffLibrary.changeSummary.removedRateCodes.length > 0 && (
                            <div>
                              Removed: {tariffLibrary.changeSummary.removedRateCodes.slice(0, 5).join(', ')}
                              {tariffLibrary.changeSummary.removedRateCodes.length > 5 ? ', …' : ''}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-3 text-xs text-gray-600">
                        {tariffLibrary?.rateMetadata ? (
                          <div>
                            Rate metadata: <span className="font-semibold text-gray-900">{String(tariffLibrary.rateMetadata.rateCode || '')}</span> —{' '}
                            {String(tariffLibrary.rateMetadata.sourceTitle || '').trim() ? (
                              <span title={String(tariffLibrary.rateMetadata.sourceUrl || '')}>{truncateText(tariffLibrary.rateMetadata.sourceTitle, 140)}</span>
                            ) : String(tariffLibrary.rateMetadata.sourceUrl || '').trim() ? (
                              <a
                                className="text-blue-700 hover:text-blue-800 underline"
                                href={String(tariffLibrary.rateMetadata.sourceUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {truncateText(tariffLibrary.rateMetadata.sourceUrl, 140)}
                              </a>
                            ) : (
                              <span>(no source)</span>
                            )}
                          </div>
                        ) : (
                          <div>Rate metadata: not found in latest snapshot.</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="text-sm text-gray-700">
                <div className="font-semibold text-gray-900 mb-2">Because</div>
                <ul className="space-y-1">
                  {(Array.isArray(insights?.rateFit?.because) ? insights.rateFit.because : []).map((b: any, idx: number) => (
                    <li key={idx}>- {String(b)}</li>
                  ))}
                  {(!insights?.rateFit?.because || !insights.rateFit.because.length) && <li>- (none)</li>}
                </ul>
              </div>

              <div className="mt-6">
                <div className="font-semibold text-gray-900 mb-2">Alternatives</div>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Rate</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Est. Savings ($)</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(insights?.rateFit?.alternatives) ? insights.rateFit.alternatives : []).map((a: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-gray-700 border-b border-gray-100 align-top">
                            {String(a.utility || '')} {String(a.rateCode || '')}
                          </td>
                          <td className="px-4 py-3 text-gray-700 border-b border-gray-100 align-top">
                            <StatusPill label={String(a.status || 'needs_eval')} tone="gray" />
                          </td>
                          <td className="px-4 py-3 text-gray-700 border-b border-gray-100 align-top">
                            {qualifySavings ? (
                              <span className="text-xs text-gray-500" title="Generation supplied by CCA/ESP; savings not fully modeled.">
                                — <span className="ml-1">Generation supplied by CCA/ESP; savings not fully modeled.</span>
                              </span>
                            ) : Number.isFinite(a.estimatedDeltaDollars) ? (
                              <span className="text-sm font-semibold">{formatDollars(a.estimatedDeltaDollars)}</span>
                            ) : (
                              <span className="text-xs text-gray-500" title={getDeltaMissingNote(a)}>
                                — <span className="ml-1">{getDeltaMissingNote(a)}</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700 border-b border-gray-100 align-top">
                            <div className="space-y-1">
                              {Array.isArray(a.because) && a.because.length ? (
                                a.because.slice(0, 3).map((b: any, i: number) => <div key={i}>- {String(b)}</div>)
                              ) : (
                                <div>- (no notes)</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!insights?.rateFit?.alternatives || insights.rateFit.alternatives.length === 0) && (
                        <tr>
                          <td className="px-4 py-3 text-gray-600" colSpan={4}>
                            No alternatives generated.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {(() => {
                const sim = (insights as any)?.billSimV2 || null;
                if (!sim) return null;
                const m0 = Array.isArray(sim.meters) && sim.meters.length ? sim.meters[0] : null;
                const cycles = m0 && Array.isArray(m0.cycles) ? m0.cycles : [];
                const latest = cycles.slice().sort((a: any, b: any) => String(b.cycleEndIso || '').localeCompare(String(a.cycleEndIso || '')))[0] || null;
                if (!latest) return null;
                const t = latest.totals || {};
                return (
                  <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="text-sm font-semibold text-gray-900">Bill Simulation (v2)</div>
                    <div className="text-xs text-gray-600 mt-1">
                      cycle <span className="font-mono">{String(latest.cycleLabel || '')}</span> • total{' '}
                      <span className="font-semibold">{Number.isFinite(t.totalDollars) ? formatDollars(Number(t.totalDollars)) : '—'}</span>
                      {t.isPartial ? <span className="ml-2 text-amber-700">(partial)</span> : null}
                    </div>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-700">
                      <div>
                        <div className="text-gray-500">Energy</div>
                        <div className="font-semibold">{Number.isFinite(t.energyDollars) ? formatDollars(Number(t.energyDollars)) : '—'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Demand</div>
                        <div className="font-semibold">{Number.isFinite(t.demandDollars) ? formatDollars(Number(t.demandDollars)) : '—'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Fixed</div>
                        <div className="font-semibold">{Number.isFinite(t.fixedDollars) ? formatDollars(Number(t.fixedDollars)) : '—'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Notes</div>
                        <div className="text-gray-600">
                          {Array.isArray(latest.missingInfo) && latest.missingInfo.length ? `${latest.missingInfo.length} missing/unmodeled` : 'ok'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </SectionCard>
          )}

          {activeTab === 'programs' && (
            <SectionCard title="Programs" description="Matched programs and derived recommendations." icon={<ClipboardList className="w-5 h-5 text-blue-600" />}>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Program</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Match</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Because</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programsMatches.map((m: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-gray-700 border-b border-gray-100 align-top">
                          <div className="font-semibold text-gray-900">{String(m.programId)}</div>
                          {m.programName && <div className="text-xs text-gray-600">{String(m.programName)}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-700 border-b border-gray-100 align-top">
                          <StatusPill
                            label={String(m.matchStatus || 'unknown')}
                            tone={String(m.matchStatus) === 'eligible' ? 'green' : String(m.matchStatus) === 'likely_eligible' ? 'blue' : String(m.matchStatus) === 'unlikely' ? 'gray' : 'amber'}
                          />
                        </td>
                        <td className="px-4 py-3 text-gray-700 border-b border-gray-100 align-top">
                          <div className="space-y-1">
                            {(Array.isArray(m.because) ? m.because : []).slice(0, 4).map((b: any, i: number) => (
                              <div key={i}>- {String(b)}</div>
                            ))}
                            {Array.isArray(m.requiredInputsMissing) && m.requiredInputsMissing.length > 0 && (
                              <div className="text-xs text-gray-500">missing: {m.requiredInputsMissing.join('; ')}</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {programsMatches.length === 0 && (
                      <tr>
                        <td className="px-4 py-3 text-gray-600" colSpan={3}>
                          No matches available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6">
                <div className="font-semibold text-gray-900 mb-2">Program-derived recommendations</div>
                <div className="space-y-2">
                  {utilityRecos
                    .filter((r) => String(r?.recommendationType || '') === 'DEMAND_RESPONSE' || String(r?.recommendationType || '') === 'UTILITY_PROGRAM')
                    .slice(0, 8)
                    .map((r: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{String(r?.suggestedMeasure?.name || r?.recommendationType || 'Recommendation')}</div>
                            <div className="text-xs text-gray-600 mt-1">{String((Array.isArray(r?.because) ? r.because[0] : '') || '')}</div>
                          </div>
                          <StatusPill label={`score=${Number.isFinite(r?.score) ? Number(r.score).toFixed(2) : 'n/a'}`} tone="gray" />
                        </div>
                      </div>
                    ))}
                  {utilityRecos.length === 0 && <div className="text-sm text-gray-600">No recommendations available.</div>}
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === 'battery' && (
            <SectionCard title="Battery Screening" description="Read-only gate + candidate selection." icon={<Battery className="w-5 h-5 text-blue-600" />}>
              <div className="flex items-center gap-2 mb-3">
                <StatusPill label={`gate: ${gateStatus}`} tone={gateTone as any} />
              </div>
              <div className="text-sm text-gray-700">
                <div className="font-semibold text-gray-900 mb-2">Because</div>
                <ul className="space-y-1">
                  {(Array.isArray(workflow?.battery?.gate?.because) ? workflow.battery.gate.because : []).map((b: any, idx: number) => (
                    <li key={idx}>- {String(b)}</li>
                  ))}
                  {(!workflow?.battery?.gate?.because || !workflow.battery.gate.because.length) && <li>- (none)</li>}
                </ul>
              </div>

              <div className="mt-6">
                <div className="font-semibold text-gray-900 mb-2">Ranked candidates</div>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">SKU</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Fit</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Because</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(workflow?.battery?.selection?.rankedCandidates) ? workflow.battery.selection.rankedCandidates : []).map((c: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-gray-700 border-b border-gray-100 align-top">
                            <div className="font-semibold text-gray-900">{String(c.vendor)} {String(c.sku)}</div>
                            <div className="text-xs text-gray-600">{Number.isFinite(c.kw) ? `${Number(c.kw)} kW` : ''}{Number.isFinite(c.kwh) ? ` • ${Number(c.kwh)} kWh` : ''}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700 border-b border-gray-100 align-top">
                            {Number.isFinite(c.fitScore) ? Number(c.fitScore).toFixed(3) : 'n/a'}
                          </td>
                          <td className="px-4 py-3 text-gray-700 border-b border-gray-100 align-top">
                            <div className="space-y-1">
                              {(Array.isArray(c.because) ? c.because : []).slice(0, 4).map((b: any, i: number) => (
                                <div key={i}>- {String(b)}</div>
                              ))}
                              {Array.isArray(c.disqualifiers) && c.disqualifiers.length > 0 && (
                                <div className="text-xs text-gray-500">disq: {c.disqualifiers.join('; ')}</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!workflow?.battery?.selection?.rankedCandidates || workflow.battery.selection.rankedCandidates.length === 0) && (
                        <tr>
                          <td className="px-4 py-3 text-gray-600" colSpan={3}>
                            No candidates available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === 'missing' && (
            <SectionCard title="Missing Inputs Checklist" description="Conservative: unknown → missing." icon={<ListChecks className="w-5 h-5 text-blue-600" />}>
              {Array.isArray(insights?.missingInfo) && insights.missingInfo.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="text-sm font-semibold text-gray-900 mb-2">Decision safety notes</div>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {insights.missingInfo.map((it: any) => (
                      <li key={String(it?.id || Math.random())}>
                        - <span className="font-semibold">{String(it?.severity || 'info')}</span> ({String(it?.category || 'unknown')}): {String(it?.description || '')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {missingInputs.length > 0 ? (
                <ul className="text-sm text-gray-700 space-y-1">
                  {missingInputs.map((m, idx) => (
                    <li key={idx}>- {String(m)}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-600">(none)</div>
              )}
            </SectionCard>
          )}

          {activeTab === 'inbox' && (
            <SectionCard title="Inbox Suggestions" description="Read-only suggestions suitable for the existing inbox workflow." icon={<ClipboardList className="w-5 h-5 text-blue-600" />}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="font-semibold text-gray-900 mb-2">Suggestions ({allSuggestions.length})</div>
                  <div className="space-y-2">
                    {allSuggestions.slice(0, 12).map((s: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{String(s?.title || s?.kind || 'Suggestion')}</div>
                            <div className="text-xs text-gray-600 mt-1">{String(s?.summary || '')}</div>
                          </div>
                          {s?.score !== undefined && <StatusPill label={`score=${Number(s.score).toFixed(2)}`} tone="gray" />}
                        </div>
                      </div>
                    ))}
                    {allSuggestions.length === 0 && <div className="text-sm text-gray-600">No suggestions generated.</div>}
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-gray-900 mb-2">Inbox items ({allInboxItems.length})</div>
                  <div className="space-y-2">
                    {allInboxItems.slice(0, 12).map((it: any, idx: number) => (
                      <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-sm font-semibold text-gray-900 truncate">{String(it?.kind || 'inboxItem')}</div>
                        <div className="text-xs text-gray-600 mt-1">status: {String(it?.status || 'inferred')}</div>
                      </div>
                    ))}
                    {allInboxItems.length === 0 && <div className="text-sm text-gray-600">No inbox items generated.</div>}
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === 'markdown' && (
            <SectionCard title="Utility Summary (Markdown)" description="Generated by the deterministic report generator." icon={<FileText className="w-5 h-5 text-blue-600" />}>
              <MarkdownViewer markdown={String(summary?.markdown || '')} />
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
};

