import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { apiRequest } from '../../shared/api/client';
import { logger } from '../../services/logger';

export const BillingIntakePlaceholder: React.FC = () => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const projectId = String(params.projectId || '').trim();

  const returnTo = useMemo(() => {
    const s: any = (location as any)?.state || {};
    const rt = String(s?.returnTo || '').trim();
    if (rt) return rt;
    return projectId ? `/analysis/v1/${encodeURIComponent(projectId)}` : '/analysis/v1/demo';
  }, [location, projectId]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);
  const [billPdfText, setBillPdfText] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest<{ success: true; project: any }>({ url: `/api/projects/${encodeURIComponent(projectId)}` });
        if (cancelled) return;
        setProject(data.project || null);
        const existing = String((data.project as any)?.telemetry?.billPdfText || '').trim();
        setBillPdfText(existing);
      } catch (e) {
        logger.error('Failed to load project for billing intake', e);
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load project');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function onSave() {
    if (!projectId) return;
    setSaving(true);
    setError(null);
    try {
      const nextTelemetry = {
        ...(((project as any)?.telemetry && typeof (project as any).telemetry === 'object') ? (project as any).telemetry : {}),
        billPdfText: String(billPdfText || '').trim(),
      };
      const data = await apiRequest<{ success: true; project: any }>({
        url: `/api/projects/${encodeURIComponent(projectId)}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patch: { telemetry: nextTelemetry } }),
      });
      setProject(data.project || null);
      navigate(returnTo);
    } catch (e) {
      logger.error('Failed to save billPdfText', e);
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Billing intake</h1>
          <p className="text-sm text-gray-600 mt-1">
            Paste extracted bill text (from a PDF) to enable deterministic supply-structure inference.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Project</div>
          <div className="text-sm font-mono text-gray-800">{projectId || '—'}</div>
        </div>
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-amber-700 mt-0.5" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-amber-900">What’s required (truthful checklist)</div>
            <div className="text-sm text-amber-900/90 mt-1">
              To deterministically infer supply structure (bundled vs CCA vs DA), at least one of the following inputs is required:
            </div>
            <ul className="text-sm text-amber-900/90 mt-3 space-y-1">
              <li>- <span className="font-mono">billingRecords</span> (structured billing records array)</li>
              <li>- <span className="font-mono">billPdfText</span> (parsed bill PDF text)</li>
            </ul>
            <div className="text-xs text-amber-900/80 mt-3">No guessing: the engine only infers when the pasted text contains explicit signals (e.g. “CCA”, “Community Choice Aggregation”, “Direct Access”, “Electric Service Provider”).</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <label className="block text-sm font-semibold text-gray-900" htmlFor="billPdfText">
          Paste bill text (from PDF)
        </label>
        <textarea
          id="billPdfText"
          className="w-full min-h-[220px] rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="Paste the extracted bill text here…"
          value={billPdfText}
          onChange={(e) => setBillPdfText(e.target.value)}
          disabled={loading || saving}
        />
        <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            {loading ? 'Loading project…' : saving ? 'Saving…' : project ? 'Loaded.' : '—'}
          </div>
          <div className="font-mono">{String(billPdfText || '').trim().length} chars</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || loading || !projectId}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => navigate(returnTo)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <div className="ml-auto flex items-center gap-3">
          <Link
            to={projectId ? `/project-builder/${encodeURIComponent(projectId)}` : '/project-builder'}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Go to Project Vault
          </Link>
        </div>
      </div>
    </div>
  );
};

