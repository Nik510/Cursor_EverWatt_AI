import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FileText, RefreshCw, PlusCircle, ExternalLink } from 'lucide-react';
import { apiRequest } from '../../shared/api/client';
import { getAnalysisResultsV1 } from '../../shared/api/analysisResults';
import { logger } from '../../services/logger';
import { buildInternalEngineeringReportJsonV1 } from '../../modules/reports/internalEngineering/v1/buildInternalEngineeringReportJsonV1';

function shortIso(s: string | null | undefined): string {
  const x = String(s || '').trim();
  if (!x) return '—';
  return x.length >= 19 ? x.slice(0, 19).replace('T', ' ') : x;
}

export const InternalEngineeringReportV1Page: React.FC = () => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const projectId = String(params.projectId || '').trim();

  const returnTo = useMemo(() => {
    const s: any = (location as any)?.state || {};
    const rt = String(s?.returnTo || '').trim();
    if (rt) return rt;
    return projectId ? `/project-builder/${encodeURIComponent(projectId)}` : '/project-builder';
  }, [location, projectId]);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [html, setHtml] = useState<string>('');

  async function loadRevisions() {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ success: true; revisions: any[] }>({
        url: `/api/projects/${encodeURIComponent(projectId)}/reports/internal-engineering`,
      });
      const list = Array.isArray((data as any).revisions) ? (data as any).revisions : [];
      setRevisions(list);
      if (!selectedId && list.length) setSelectedId(String(list[0].id || ''));
    } catch (e) {
      logger.error('Failed to load internal engineering revisions', e);
      setError(e instanceof Error ? e.message : 'Failed to load revisions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRevisions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function loadHtml(revisionId: string) {
    if (!projectId || !revisionId) return;
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/reports/internal-engineering/${encodeURIComponent(revisionId)}.html`);
      const text = await res.text();
      setHtml(text);
    } catch (e) {
      setHtml('');
    }
  }

  useEffect(() => {
    if (selectedId) void loadHtml(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function generateNewRevision() {
    if (!projectId) return;
    setGenerating(true);
    setError(null);
    try {
      const proj = await apiRequest<{ success: true; project: any }>({ url: `/api/projects/${encodeURIComponent(projectId)}` });
      const analysis = await getAnalysisResultsV1({ projectId });
      const nowIso = new Date().toISOString();
      const intervalMeta = (proj as any)?.project?.telemetry?.intervalElectricMetaV1 || null;
      const intervalPts = (proj as any)?.project?.telemetry?.intervalElectricV1;
      const reportJson = buildInternalEngineeringReportJsonV1({
        projectId,
        generatedAtIso: nowIso,
        analysisResults: analysis as any,
        telemetry: {
          intervalElectricPointsV1: Array.isArray(intervalPts) ? intervalPts : null,
          intervalElectricMetaV1: intervalMeta,
        },
      });
      const title = `Internal Engineering Report • ${nowIso.slice(0, 10)}`;
      const appended = await apiRequest<{ success: true; revision: any; revisions: any[] }>({
        url: `/api/projects/${encodeURIComponent(projectId)}/reports/internal-engineering`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, reportJson }),
      });
      const list = Array.isArray((appended as any).revisions) ? (appended as any).revisions : [];
      setRevisions(list);
      const newId = String((appended as any)?.revision?.id || (list[0]?.id ?? ''));
      if (newId) setSelectedId(newId);
    } catch (e) {
      logger.error('Failed to generate internal engineering report', e);
      setError(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  }

  const selected = revisions.find((r) => String(r?.id || '') === String(selectedId || '')) || null;
  const htmlHref = selectedId
    ? `/api/projects/${encodeURIComponent(projectId)}/reports/internal-engineering/${encodeURIComponent(selectedId)}.html`
    : '';
  const jsonHref = selectedId
    ? `/api/projects/${encodeURIComponent(projectId)}/reports/internal-engineering/${encodeURIComponent(selectedId)}.json`
    : '';

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-gray-500">
            <Link className="text-blue-700 underline" to="/project-builder">
              Project Builder
            </Link>{' '}
            / <span className="font-mono">{projectId}</span> / <span className="font-semibold">Internal engineering</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Internal Engineering Report (v1)</h1>
          <p className="text-sm text-gray-600 mt-1">Append-only JSON revisions with deterministic HTML rendering.</p>
        </div>
        <div className="flex items-center gap-2">
          {projectId ? (
            <>
              <Link
                to={`/analysis/v1/${encodeURIComponent(projectId)}`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Open Analysis Results
              </Link>
              <Link
                to={`/project-builder/${encodeURIComponent(projectId)}/intake/intervals`}
                state={{ returnTo: `/project-builder/${encodeURIComponent(projectId)}/reports/internal-engineering` }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Open Intervals intake
              </Link>
            </>
          ) : null}
          <button
            onClick={() => void loadRevisions()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => void generateNewRevision()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-slate-900 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
            disabled={generating}
          >
            <PlusCircle className="w-4 h-4" />
            {generating ? 'Generating…' : 'Generate new revision'}
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-900">History</div>
            <div className="text-xs text-gray-500">{revisions.length} revisions</div>
          </div>
          <div className="max-h-[36rem] overflow-auto">
            {revisions.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">No revisions yet. Generate one from current analysis.</div>
            ) : (
              revisions.map((r) => {
                const id = String(r?.id || '');
                const selected = id && id === selectedId;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedId(id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${selected ? 'bg-blue-50' : 'bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{String(r?.title || 'Internal Engineering Report')}</div>
                        <div className="text-xs text-gray-600 font-mono truncate">
                          {shortIso(String(r?.createdAt || ''))} • id={id.slice(0, 8)}…
                        </div>
                      </div>
                      <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-900">Preview</div>
            <div className="flex items-center gap-2">
              {selectedId ? (
                <>
                  <a
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                    href={jsonHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    JSON <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                    href={htmlHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    HTML <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              ) : null}
            </div>
          </div>
          {!selected ? (
            <div className="p-4 text-sm text-gray-600">Select a revision to preview.</div>
          ) : (
            <div className="p-0">
              {/* Deterministic HTML renderer output */}
              <iframe title="internal-engineering-report" className="w-full h-[36rem] bg-white" srcDoc={html || ''} />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(returnTo)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
      </div>
    </div>
  );
};

