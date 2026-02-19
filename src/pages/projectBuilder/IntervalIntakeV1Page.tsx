import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FileUp, Info, Save } from 'lucide-react';
import { apiRequest } from '../../shared/api/client';
import * as pbApi from '../../shared/api/projectBuilder';
import { logger } from '../../services/logger';
import { parseIntervalElectricCsvV1 } from '../../shared/utilityIntelligence/intake/intervalElectricV1/parseIntervalElectricCsvV1';
import type { IntervalElectricMetaV1, IntervalElectricPointV1 } from '../../shared/utilityIntelligence/intake/intervalElectricV1/types';

function shortIso(s: string | null | undefined): string {
  const x = String(s || '').trim();
  if (!x) return '—';
  // YYYY-MM-DD
  if (x.length >= 10) return x.slice(0, 10);
  return x;
}

export const IntervalIntakeV1Page: React.FC = () => {
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

  const [file, setFile] = useState<File | null>(null);
  const [points, setPoints] = useState<IntervalElectricPointV1[]>([]);
  const [meta, setMeta] = useState<IntervalElectricMetaV1 | null>(null);
  const [previewRows, setPreviewRows] = useState<IntervalElectricPointV1[]>([]);

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
        const existingPts = (data.project as any)?.telemetry?.intervalElectricV1;
        const existingMeta = (data.project as any)?.telemetry?.intervalElectricMetaV1;
        if (Array.isArray(existingPts)) setPoints(existingPts as any);
        if (existingMeta && typeof existingMeta === 'object') setMeta(existingMeta as any);
      } catch (e) {
        logger.error('Failed to load project for interval intake', e);
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

  async function onPickFile(nextFile: File) {
    setError(null);
    setFile(nextFile);
    setPoints([]);
    setMeta(null);
    setPreviewRows([]);
    try {
      const text = await nextFile.text();
      const parsed = parseIntervalElectricCsvV1({ csvText: text, filename: nextFile.name, timezoneHint: 'America/Los_Angeles' });
      setPoints(parsed.points || []);
      setMeta(parsed.meta || null);
      setPreviewRows((parsed.points || []).slice(0, 12));
      if (!parsed.ok) {
        setError('Interval file could not be parsed deterministically (see warnings).');
      }
    } catch (e) {
      logger.error('Interval CSV preview parse failed', e);
      setError(e instanceof Error ? e.message : 'Failed to parse interval CSV');
    }
  }

  async function onSave() {
    if (!projectId) return;
    if (!file || !meta || !Array.isArray(points) || points.length === 0) {
      setError('Select an interval CSV and confirm preview before saving.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // 1) Persist the raw file in Vault (evidence-first).
      const up = await pbApi.uploadVaultFile(projectId, file);
      const vaultFile = (up as any)?.file || null;

      // 2) Patch project.telemetry with parsed points + deterministic meta.
      const existingTelemetry =
        ((project as any)?.telemetry && typeof (project as any).telemetry === 'object') ? (project as any).telemetry : {};
      const nowIso = new Date().toISOString();
      const nextMeta: IntervalElectricMetaV1 = {
        ...(meta as any),
        savedAtIso: nowIso,
        ...(vaultFile?.id
          ? {
              source: {
                kind: 'vaultFile',
                vaultFileId: String(vaultFile.id),
                storageKey: vaultFile?.storageKey ? String(vaultFile.storageKey) : undefined,
                filename: vaultFile?.filename ? String(vaultFile.filename) : file.name,
                contentType: vaultFile?.contentType ? String(vaultFile.contentType) : file.type,
                uploadedAtIso: vaultFile?.uploadedAt ? String(vaultFile.uploadedAt) : nowIso,
              },
            }
          : {}),
      };

      const nextTelemetry = {
        ...existingTelemetry,
        intervalElectricV1: points,
        intervalElectricMetaV1: nextMeta,
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
      logger.error('Failed to save interval intake', e);
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const existingMeta = (project as any)?.telemetry?.intervalElectricMetaV1 as any;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Interval intake (v1)</h1>
          <p className="text-sm text-gray-600 mt-1">Upload interval electricity data. Parsing is deterministic and warnings-first.</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Project</div>
          <div className="text-sm font-mono text-gray-800">{projectId || '—'}</div>
        </div>
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-700 mt-0.5" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-blue-900">Determinism contract</div>
            <div className="text-sm text-blue-900/90 mt-1">
              We store the parsed interval points plus a deterministic meta/warnings bundle. The analysis UI will label interval-derived results as “From
              intervals” and surface missing info actions when this intake is missing.
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Upload CSV</div>
            <div className="text-xs text-gray-600">Supported: PG&amp;E interval export CSV (v1).</div>
          </div>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer">
            <FileUp className="w-4 h-4" />
            Choose file
            <input
              type="file"
              className="hidden"
              accept=".csv,text/csv"
              disabled={loading || saving}
              onChange={(e) => {
                const f = e.currentTarget.files?.[0];
                if (f) void onPickFile(f);
                e.currentTarget.value = '';
              }}
            />
          </label>
        </div>

        <div className="text-xs text-gray-500">
          {file ? (
            <span className="font-mono">
              selected={file.name} size={file.size.toLocaleString()}B type={file.type || '—'}
            </span>
          ) : existingMeta ? (
            <span className="font-mono">
              existing={String(existingMeta?.source?.filename || 'intervalElectricV1')} savedAt={shortIso(String(existingMeta?.savedAtIso || ''))}
            </span>
          ) : (
            'No file selected.'
          )}
        </div>
      </div>

      {meta ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="text-sm font-semibold text-gray-900">Parse preview</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-[11px] uppercase text-gray-500 font-semibold">Format</div>
              <div className="mt-1 font-mono text-gray-900">{String(meta.detectedFormat)}</div>
              <div className="mt-1 text-gray-700">conf={Number(meta.detection?.confidence || 0).toFixed(2)}</div>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-[11px] uppercase text-gray-500 font-semibold">Series</div>
              <div className="mt-1 text-gray-700">
                meterKey=<span className="font-mono text-gray-900">{String(meta.meterKey || '—')}</span>
              </div>
              <div className="mt-1 text-gray-700">
                points=<span className="font-semibold text-gray-900">{Number(meta.pointCount || 0).toLocaleString()}</span> interval=
                <span className="font-mono text-gray-900">{meta.inferredIntervalMinutes ? `${Number(meta.inferredIntervalMinutes)}m` : '—'}</span>
              </div>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-[11px] uppercase text-gray-500 font-semibold">Range</div>
              <div className="mt-1 font-mono text-gray-900">{shortIso(meta.range?.startIso)}</div>
              <div className="mt-1 font-mono text-gray-900">{shortIso(meta.range?.endIso)}</div>
            </div>
          </div>

          {Array.isArray(meta.warnings) && meta.warnings.length ? (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-amber-900">Warnings / reason codes</div>
              <ul className="mt-2 space-y-1 text-xs">
                {meta.warnings.slice(0, 8).map((w, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-[11px] text-amber-800">{String((w as any)?.code || '')}</span>
                    <span className="text-amber-900/90">{(w as any)?.details ? JSON.stringify((w as any).details) : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {previewRows.length ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700">First rows</div>
              <div className="overflow-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-white">
                    <tr className="text-left text-[11px] uppercase text-gray-500">
                      <th className="px-3 py-2">timestampIso</th>
                      <th className="px-3 py-2">intervalMinutes</th>
                      <th className="px-3 py-2">kWh</th>
                      <th className="px-3 py-2">kW</th>
                      <th className="px-3 py-2">temperatureF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewRows.map((r, idx) => (
                      <tr key={idx} className="text-gray-800">
                        <td className="px-3 py-2 font-mono">{String(r.timestampIso || '').slice(0, 24)}</td>
                        <td className="px-3 py-2 font-mono">{Number.isFinite(Number(r.intervalMinutes)) ? String(r.intervalMinutes) : '—'}</td>
                        <td className="px-3 py-2 font-mono">{Number.isFinite(Number((r as any).kWh)) ? Number((r as any).kWh).toFixed(3) : '—'}</td>
                        <td className="px-3 py-2 font-mono">{Number.isFinite(Number((r as any).kW)) ? Number((r as any).kW).toFixed(3) : '—'}</td>
                        <td className="px-3 py-2 font-mono">
                          {Number.isFinite(Number((r as any).temperatureF)) ? Number((r as any).temperatureF).toFixed(1) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || loading || !projectId || !meta || points.length === 0 || !file}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
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
          {projectId ? (
            <>
              <Link
                to={`/analysis/v1/${encodeURIComponent(projectId)}`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Go to Analysis Results
              </Link>
              <Link
                to={`/project-builder/${encodeURIComponent(projectId)}/reports/internal-engineering`}
                state={{ returnTo: `/project-builder/${encodeURIComponent(projectId)}/intake/intervals` }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Internal report
              </Link>
            </>
          ) : null}
          <Link
            to={projectId ? `/project-builder/${encodeURIComponent(projectId)}` : '/project-builder'}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Go to Project Vault
          </Link>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Status: {loading ? 'loading' : saving ? 'saving' : 'ready'} • points={points.length.toLocaleString()}
      </div>
    </div>
  );
};

