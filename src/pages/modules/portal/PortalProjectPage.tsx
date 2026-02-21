import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Download } from 'lucide-react';

import { ExternalShareLayout } from '../../../components/reports/ExternalShareLayout';
import { portalListProjectRevisionsV1, portalMeV1, portalRevisionLinksV1, type PortalListRevisionsV1Response, type PortalMeV1Response } from '../../../shared/api/portalV1';

function fmtIsoShort(iso: string | null | undefined): string {
  const s = String(iso || '').trim();
  if (!s) return '—';
  return s.replace('T', ' ').slice(0, 19);
}

export const PortalProjectPage: React.FC = () => {
  const params = useParams();
  const navigate = useNavigate();
  const projectId = String(params.projectId || '').trim();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<PortalMeV1Response | null>(null);
  const [revs, setRevs] = useState<PortalListRevisionsV1Response | null>(null);

  async function refresh() {
    if (!projectId) return;
    setBusy(true);
    setError(null);
    try {
      const [meRes, revRes] = await Promise.all([portalMeV1(), portalListProjectRevisionsV1({ projectId })]);
      setMe(meRes);
      setRevs(revRes);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load project';
      setError(msg);
      const anyErr: any = e as any;
      if (anyErr && typeof anyErr.status === 'number' && anyErr.status === 401) navigate('/portal/login');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const subtitle = useMemo(() => {
    if (!me) return projectId || undefined;
    return `${projectId} • ${me.user.email}`;
  }, [me, projectId]);

  return (
    <ExternalShareLayout
      title={me?.org?.name ? `${me.org.name} / ${projectId}` : projectId}
      subtitle={subtitle}
      headerRight={
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-300 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          onClick={() => navigate('/portal')}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      }
    >
      <div className="space-y-4">
        {error ? <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">{error}</div> : null}
        {busy && !revs ? <div className="p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-600">Loading…</div> : null}

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 text-sm font-semibold text-gray-900">
            Revisions <span className="text-gray-500 font-normal">({revs?.revisions?.length ?? 0})</span>
          </div>
          <div className="divide-y divide-gray-200">
            {(revs?.revisions || []).map((r) => {
              const links = portalRevisionLinksV1({ projectId, revisionId: r.revisionId });
              return (
                <div key={r.revisionId} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{String(r.reportType || 'UNKNOWN')}</div>
                    <div className="text-xs font-mono text-gray-600 mt-1 truncate">
                      revision={r.revisionId} • createdAt={fmtIsoShort(r.createdAtIso)}
                      {r.runId ? ` • run=${String(r.runId).slice(0, 12)}…` : ''}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-300 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                      onClick={() => window.open(links.htmlUrl, '_blank', 'noopener,noreferrer')}
                    >
                      <FileText className="w-4 h-4" />
                      View HTML
                    </button>
                    <a className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800" href={links.pdfUrl}>
                      <Download className="w-4 h-4" />
                      PDF
                    </a>
                    <a className="text-sm font-semibold text-blue-700 hover:underline" href={links.jsonUrl}>
                      JSON
                    </a>
                    <span className="text-gray-300">•</span>
                    <a className="text-sm font-semibold text-blue-700 hover:underline" href={links.bundleUrl}>
                      Bundle (.zip)
                    </a>
                  </div>
                </div>
              );
            })}
            {!busy && !(revs?.revisions || []).length ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">No revisions found.</div>
            ) : null}
          </div>
        </div>
      </div>
    </ExternalShareLayout>
  );
};

