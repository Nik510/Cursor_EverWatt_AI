import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, Download, AlertTriangle, Info } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { getProjectReportRevisionV1, type GetProjectReportRevisionV1Response } from '../../../shared/api/reportRevisionsV1';

export const ReportRevisionLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const revisionId = String(params.revisionId || '').trim();
  const projectIdFromQs = String(searchParams.get('projectId') || '').trim();

  const [projectIdInput, setProjectIdInput] = useState(projectIdFromQs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GetProjectReportRevisionV1Response | null>(null);

  const warningsBadge = useMemo(() => {
    const w = data?.revision?.warningsSummary;
    if (!w) return { label: 'No warnings summary', tone: 'gray' as const };
    const total = Number(w.engineWarningsCount || 0) + Number(w.missingInfoCount || 0);
    if (total <= 0) return { label: 'No warnings', tone: 'green' as const };
    return { label: `${total} warnings`, tone: 'amber' as const };
  }, [data]);

  const verifierBadge = useMemo(() => {
    const s = String((data as any)?.revision?.verifierStatusV1 || '').trim().toUpperCase();
    if (s === 'PASS') return { label: 'Verifier: PASS', tone: 'green' as const };
    if (s === 'WARN') return { label: 'Verifier: WARN', tone: 'amber' as const };
    if (s === 'FAIL') return { label: 'Verifier: FAIL', tone: 'red' as const };
    return { label: 'Verifier: —', tone: 'gray' as const };
  }, [data]);

  const claimsBadge = useMemo(() => {
    const s = String((data as any)?.revision?.claimsStatusV1 || '').trim().toUpperCase();
    if (s === 'ALLOW') return { label: 'Claims: ALLOW', tone: 'green' as const };
    if (s === 'LIMITED') return { label: 'Claims: LIMITED', tone: 'amber' as const };
    if (s === 'BLOCK') return { label: 'Claims: BLOCK', tone: 'red' as const };
    return { label: 'Claims: —', tone: 'gray' as const };
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    const projectId = projectIdFromQs;
    if (!revisionId || !projectId) return;
    setBusy(true);
    setError(null);
    setData(null);
    void getProjectReportRevisionV1({ projectId, revisionId })
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load revision');
      })
      .finally(() => {
        if (cancelled) return;
        setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectIdFromQs, revisionId]);

  const links = data?.links;
  const revision = data?.revision;

  const badgeClass =
    warningsBadge.tone === 'green'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : warningsBadge.tone === 'amber'
        ? 'bg-amber-50 text-amber-900 border-amber-200'
        : 'bg-gray-50 text-gray-800 border-gray-200';

  const smallBadgeClass = (tone: string) =>
    tone === 'green'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-900 border-amber-200'
        : tone === 'red'
          ? 'bg-red-50 text-red-800 border-red-200'
          : 'bg-gray-50 text-gray-800 border-gray-200';

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/reports/sessions')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-gray-900 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Revision</h1>
                <p className="text-sm text-gray-500 font-mono truncate">{revisionId || '—'}</p>
              </div>
            </div>
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${badgeClass}`}>
            {warningsBadge.tone === 'amber' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
            {warningsBadge.label}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {!projectIdFromQs ? (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="p-4 bg-white border border-gray-200 rounded-xl">
              <div className="text-sm font-semibold text-gray-900">Project ID required</div>
              <div className="text-sm text-gray-600 mt-1">
                This page needs a `projectId` query param to load the snapshot. Example: <span className="font-mono">?projectId=...</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  placeholder="projectId"
                  value={projectIdInput}
                  onChange={(e) => setProjectIdInput(e.target.value)}
                />
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                  onClick={() => setSearchParams({ projectId: projectIdInput })}
                  disabled={!String(projectIdInput || '').trim()}
                >
                  Load
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {busy ? (
              <div className="p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-600">Loading…</div>
            ) : error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">{error}</div>
            ) : data && revision && links ? (
              <>
                <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{String(revision.reportType || 'UNKNOWN')}</div>
                      <div className="text-xs text-gray-600 font-mono mt-1 truncate">
                        project={projectIdFromQs} • createdAt={String(revision.createdAtIso || '').slice(0, 19)} • run={String(revision.runId || '').slice(0, 12)}…
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-300 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                        href={links.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileText className="w-4 h-4" />
                        View HTML
                      </a>
                      <a
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                        href={links.pdfUrl}
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a className="text-sm font-semibold text-blue-700 hover:underline" href={links.jsonUrl}>
                      Download JSON
                    </a>
                    {links.bundleZipUrl ? (
                      <>
                        <span className="text-gray-300">•</span>
                        <a className="text-sm font-semibold text-blue-700 hover:underline" href={links.bundleZipUrl}>
                          Download bundle (.zip)
                        </a>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="p-4 bg-white border border-gray-200 rounded-xl">
                  <div className="text-sm font-semibold text-gray-900">Trust badges</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-full border text-xs font-semibold ${smallBadgeClass(verifierBadge.tone)}`}>
                      {verifierBadge.label}
                    </div>
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-full border text-xs font-semibold ${smallBadgeClass(claimsBadge.tone)}`}>
                      {claimsBadge.label}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">Badges are derived from stored revision snapshots only.</div>
                </div>

                <div className="p-4 bg-white border border-gray-200 rounded-xl">
                  <div className="text-sm font-semibold text-gray-900">Provenance</div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="text-xs font-semibold text-gray-700">runId</div>
                      <div className="text-xs font-mono text-gray-900 mt-1 break-all">{String(revision.runId || '—')}</div>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="text-xs font-semibold text-gray-700">wizardOutputHash</div>
                      <div className="text-xs font-mono text-gray-900 mt-1 break-all">{String(revision.wizardOutputHash || '—')}</div>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="text-xs font-semibold text-gray-700">engineVersions</div>
                    <div className="text-xs font-mono text-gray-900 mt-1 space-y-1">
                      {revision.engineVersions && Object.keys(revision.engineVersions).length ? (
                        Object.keys(revision.engineVersions)
                          .sort()
                          .map((k) => (
                            <div key={k} className="break-all">
                              {k}={String((revision.engineVersions as any)[k])}
                            </div>
                          ))
                      ) : (
                        <div>—</div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-600">No data.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

