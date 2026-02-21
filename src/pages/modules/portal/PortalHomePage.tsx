import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, FolderKanban, RefreshCcw } from 'lucide-react';

import { ExternalShareLayout } from '../../../components/reports/ExternalShareLayout';
import { portalListProjectsV1, portalMeV1, portalLogoutV1, type PortalListProjectsV1Response, type PortalMeV1Response } from '../../../shared/api/portalV1';

function fmtIsoShort(iso: string | null | undefined): string {
  const s = String(iso || '').trim();
  if (!s) return '—';
  return s.replace('T', ' ').slice(0, 19);
}

export const PortalHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<PortalMeV1Response | null>(null);
  const [projects, setProjects] = useState<PortalListProjectsV1Response | null>(null);

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const [meRes, projectsRes] = await Promise.all([portalMeV1(), portalListProjectsV1()]);
      setMe(meRes);
      setProjects(projectsRes);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load portal';
      setError(msg);
      // If session is missing/expired, push to login.
      const anyErr: any = e as any;
      if (anyErr && typeof anyErr.status === 'number' && anyErr.status === 401) navigate('/portal/login');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title = useMemo(() => {
    const orgName = me?.org?.name || 'Portal';
    return orgName;
  }, [me]);

  return (
    <ExternalShareLayout
      title={title}
      subtitle={me ? `${me.user.email} • role=${me.user.role}` : undefined}
      headerRight={
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-300 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            onClick={() => refresh()}
            disabled={busy}
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
            onClick={() => {
              void portalLogoutV1()
                .catch(() => {})
                .finally(() => navigate('/portal/login'));
            }}
            disabled={busy}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">{error}</div> : null}
        {busy && !projects ? <div className="p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-600">Loading…</div> : null}

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">
              Projects <span className="text-gray-500 font-normal">({projects?.projects?.length ?? 0})</span>
            </div>
            <FolderKanban className="w-4 h-4 text-gray-400" />
          </div>
          <div className="divide-y divide-gray-200">
            {(projects?.projects || []).map((p) => {
              const latest = p.latestRevision;
              return (
                <button
                  key={p.projectId}
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-gray-50"
                  onClick={() => navigate(`/portal/projects/${encodeURIComponent(p.projectId)}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{p.name}</div>
                      <div className="text-xs font-mono text-gray-600 mt-1 truncate">{p.projectId}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-gray-700">{latest ? String(latest.reportType) : 'No revisions'}</div>
                      <div className="text-xs font-mono text-gray-500 mt-1">{latest ? fmtIsoShort(latest.createdAtIso) : '—'}</div>
                    </div>
                  </div>
                </button>
              );
            })}
            {!busy && !(projects?.projects || []).length ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">No projects linked to your organization yet.</div>
            ) : null}
          </div>
        </div>
      </div>
    </ExternalShareLayout>
  );
};

