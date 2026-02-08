import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, AlertTriangle, FileText, Play } from 'lucide-react';

type AnalysisSummary = {
  id: string;
  projectName?: string;
  companyName?: string;
  facilityName?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
};

/**
 * Projects list page
 * Lists saved analyses from the backend and lets you reopen them.
 */
export const Projects: React.FC = () => {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalyses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyses');
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.analyses) {
        throw new Error(json?.error || 'Failed to load projects');
      }
      setAnalyses(Array.isArray(json.analyses) ? json.analyses : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load projects';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyses();
  }, []);

  const sorted = useMemo(
    () =>
      [...analyses].sort((a, b) => {
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        return bTime - aTime;
      }),
    [analyses]
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Saved Projects</h1>
          <p className="text-sm text-gray-600">Projects are saved via the /api/analyses endpoint.</p>
        </div>
        <button
          onClick={loadAnalyses}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {!loading && sorted.length === 0 && !error && (
        <div className="text-sm text-gray-600 bg-white border border-gray-200 rounded-lg p-4">
          No saved projects yet. Run an analysis and click “Save Project” to create one.
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[2fr,1.3fr,1fr,140px,160px] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200">
          <div>Project</div>
          <div>Company</div>
          <div>Status</div>
          <div className="text-right">Updated</div>
          <div className="text-right">Actions</div>
        </div>

        {sorted.map((a) => (
          <div
            key={a.id}
            className="grid grid-cols-[2fr,1.3fr,1fr,140px,160px] px-4 py-3 text-sm text-gray-800 border-b border-gray-100 last:border-b-0"
          >
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900">{a.projectName || 'Untitled Project'}</span>
              <span className="text-xs text-gray-500">{a.id}</span>
            </div>
            <div>{a.companyName || '—'}</div>
            <div>
              <span className="inline-flex px-2 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
                {a.status || 'draft'}
              </span>
            </div>
            <div className="text-right text-gray-600">
              {a.updatedAt ? new Date(a.updatedAt).toLocaleString() : '—'}
            </div>
            <div className="flex justify-end gap-2">
              <Link
                to={`/calculator/battery?analysisId=${encodeURIComponent(a.id)}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                <Play className="w-4 h-4" /> Resume
              </Link>
              <Link
                to={`/analysis/report?analysisId=${encodeURIComponent(a.id)}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 text-gray-800 text-xs font-semibold hover:bg-gray-50"
              >
                <FileText className="w-4 h-4" /> Report
              </Link>
            </div>
          </div>
        ))}

        {loading && (
          <div className="px-4 py-6 text-sm text-gray-600 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading projects...
          </div>
        )}
      </div>
    </div>
  );
};
