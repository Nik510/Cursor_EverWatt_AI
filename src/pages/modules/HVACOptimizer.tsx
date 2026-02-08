import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Fan, Loader2, PlayCircle, RefreshCcw, Download } from 'lucide-react';
import { FileUpload } from '../../components/FileUpload';
import { useToast } from '../../contexts/ToastContext';
import {
  HvacPointTagSchema,
  type HvacPointTag,
  PointMappingSchema,
  EquipmentSystemSchema,
  type HvacComputeAnalyzeResponse,
} from '../../modules/hvac/optimizer-contract';
 
type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'blocked_by_faults';
 
type HvacRunClientRecord = {
  id: string;
  projectId: string;
  status: RunStatus;
  result?: HvacComputeAnalyzeResponse;
  error?: { message: string };
  createdAt?: string;
  updatedAt?: string;
};
 
async function readJsonSafe(res: Response): Promise<any> {
  const text = await res.text().catch(() => '');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}
 
export const HVACOptimizer: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
 
  const pointTags = useMemo(() => HvacPointTagSchema.options as HvacPointTag[], []);
 
  // Step 1: upload
  const [trendFile, setTrendFile] = useState<File | null>(null);
  const [trendFileKey, setTrendFileKey] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
 
  // Step 2: mapping + minimal config
  const [projectId, setProjectId] = useState('hvac-demo');
  const [timestampColumn, setTimestampColumn] = useState('Timestamp');
  const [mappedPoints, setMappedPoints] = useState<Record<string, string>>({});
  const [targetIntervalMinutes, setTargetIntervalMinutes] = useState(15);
 
  // Step 3/4: run
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const [runRecord, setRunRecord] = useState<HvacRunClientRecord | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const pollingRef = useRef<number | null>(null);
 
  useEffect(() => {
    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    };
  }, []);
 
  const uploadTrend = async (fileOverride?: File) => {
    const fileToUpload = fileOverride ?? trendFile;
    if (!fileToUpload) {
      toast({ type: 'warning', message: 'Please choose a CSV file first.' });
      return;
    }
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', fileToUpload);
 
      const res = await fetch('/api/files/upload', { method: 'POST', body: form });
      const data = await readJsonSafe(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || data?.message || 'Failed to upload file');
      }
      if (!data?.key) throw new Error('Upload succeeded but no key returned');
      setTrendFileKey(String(data.key));
      toast({ type: 'success', title: 'Uploaded', message: 'Trend file uploaded successfully.' });
    } catch (e) {
      toast({ type: 'error', title: 'Upload failed', message: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setIsUploading(false);
    }
  };
 
  const loadDemoDataset = async () => {
    setIsLoadingDemo(true);
    try {
      const res = await fetch('/api/hvac/demo-trends.csv', { method: 'GET' });
      if (!res.ok) {
        const data = await readJsonSafe(res);
        throw new Error(data?.error || data?.message || `Failed to load demo CSV (${res.status})`);
      }
      const csvText = await res.text();
      if (!csvText.trim()) throw new Error('Demo CSV returned empty');
 
      const file = new File([csvText], 'demo_trends.csv', { type: 'text/csv' });
 
      // Reset run + set demo-friendly defaults
      setTrendFile(file);
      setTrendFileKey(null);
      setRunId(null);
      setRunStatus(null);
      setRunRecord(null);
 
      setTimestampColumn('timestamp');
      setTargetIntervalMinutes(5);
      setMappedPoints({
        SAT: 'SAT',
        CHW_VALVE_PCT: 'CHW_VALVE_PCT',
        HW_VALVE_PCT: 'HW_VALVE_PCT',
        DUCT_STATIC: 'DUCT_STATIC',
        FAN_SPEED_PCT: 'FAN_SPEED_PCT',
      });
 
      // Immediately upload to get a trendFileKey
      await uploadTrend(file);
      toast({ type: 'success', title: 'Demo loaded', message: 'Demo dataset loaded and uploaded. You can start a run.' });
    } catch (e) {
      toast({ type: 'error', title: 'Demo load failed', message: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setIsLoadingDemo(false);
    }
  };
 
  const validateBeforeRun = (): { ok: true } | { ok: false; message: string } => {
    const pid = String(projectId || '').trim();
    if (!pid) return { ok: false, message: 'Project ID is required.' };
    if (!trendFileKey) return { ok: false, message: 'Upload the CSV first (trendFileKey missing).' };
    if (!String(timestampColumn || '').trim()) return { ok: false, message: 'Timestamp column is required.' };
 
    const mapping = {
      timestampColumn: String(timestampColumn).trim(),
      points: mappedPoints,
    };
    const parsed = PointMappingSchema.safeParse(mapping);
    if (!parsed.success) return { ok: false, message: 'Point mapping is invalid. Check timestamp column and point columns.' };
    const anyPoint = Object.values(parsed.data.points || {}).some((v) => String(v || '').trim().length > 0);
    if (!anyPoint) return { ok: false, message: 'Map at least one point tag to a CSV column.' };
 
    // Basic safeguard to avoid accidental huge uploads over JSON boundary
    if (trendFile && trendFile.size > 25 * 1024 * 1024) {
      return { ok: false, message: 'Trend CSV is too large for MVP (>25MB). Please export a smaller time range or resample.' };
    }
 
    if (!Number.isFinite(targetIntervalMinutes) || targetIntervalMinutes < 1 || targetIntervalMinutes > 60) {
      return { ok: false, message: 'Target interval minutes must be 1–60.' };
    }
 
    return { ok: true };
  };
 
  const fetchRun = async (id: string) => {
    const res = await fetch(`/api/hvac/runs/${encodeURIComponent(id)}`);
    const data = await readJsonSafe(res);
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || data?.message || 'Failed to fetch run');
    }
    const run = data.run as HvacRunClientRecord;
    setRunRecord(run);
    setRunStatus(run.status);
    return run;
  };
 
  const startPolling = (id: string) => {
    if (pollingRef.current) window.clearInterval(pollingRef.current);
    pollingRef.current = window.setInterval(async () => {
      try {
        const r = await fetchRun(id);
        if (r.status === 'completed' || r.status === 'failed') {
          if (pollingRef.current) window.clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } catch {
        // ignore transient polling errors
      }
    }, 1500);
  };
 
  const startRun = async () => {
    const v = validateBeforeRun();
    if (!v.ok) {
      toast({ type: 'error', title: 'Missing info', message: v.message });
      return;
    }
 
    setIsStarting(true);
    try {
      const systems = [
        EquipmentSystemSchema.parse({
          id: 'ahu-1',
          type: 'AHU',
          name: 'AHU-1',
        }),
      ];
 
      const body = {
        projectId: String(projectId).trim(),
        trendFileKey,
        targetIntervalMinutes,
        systems,
        pointMapping: {
          timestampColumn: String(timestampColumn).trim(),
          points: mappedPoints,
        },
      };
 
      const res = await fetch('/api/hvac/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await readJsonSafe(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || data?.message || 'Failed to start run');
      }
 
      const id = String(data.runId || '');
      if (!id) throw new Error('Run started but no runId returned');
      setRunId(id);
      setRunStatus(String(data.status || 'queued') as RunStatus);
      toast({
        type: 'success',
        title: data.cached ? 'Loaded cached run' : 'Run started',
        message: `Run ID: ${id}`,
      });
 
      // Immediately fetch + begin polling
      await fetchRun(id);
      startPolling(id);
    } catch (e) {
      toast({ type: 'error', title: 'Run failed to start', message: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setIsStarting(false);
    }
  };
 
  const setMappedPoint = (tag: HvacPointTag, value: string) => {
    setMappedPoints((prev) => {
      const next = { ...prev };
      const trimmed = value.trim();
      if (!trimmed) delete next[tag];
      else next[tag] = trimmed;
      return next;
    });
  };
 
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <Fan className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">HVAC Optimizer</h1>
                <p className="text-sm text-gray-500">Trend QA → FDD → Optimization</p>
              </div>
            </div>
          </div>
        </div>
      </div>
 
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Step 0: Project ID */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Project</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Project ID</label>
                <input
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g., acme-hq-ahu-optimization"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Target interval (minutes)</label>
                <input
                  type="number"
                  value={targetIntervalMinutes}
                  min={1}
                  max={60}
                  onChange={(e) => setTargetIntervalMinutes(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
 
          {/* Step 1: Upload */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">1) Upload trend CSV</h2>
            <FileUpload
              label="Trend export"
              description="Upload a BAS/Historian CSV export (UTF-8)."
              acceptedFormats=".csv"
              onFileSelect={(f) => {
                setTrendFile(f);
                setTrendFileKey(null);
                setRunId(null);
                setRunStatus(null);
                setRunRecord(null);
              }}
              file={trendFile ?? undefined}
              isRequired
            />
            <div className="flex items-center gap-3">
              <button
                onClick={uploadTrend}
                disabled={!trendFile || isUploading}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading…
                  </span>
                ) : (
                  'Upload to project'
                )}
              </button>
              <div className="text-xs text-gray-600">
                {trendFileKey ? (
                  <span>
                    Uploaded key: <span className="font-mono">{trendFileKey}</span>
                  </span>
                ) : (
                  <span>Not uploaded yet</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadDemoDataset}
                disabled={isLoadingDemo || isUploading}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                title="Loads data/hvac/demo_trends.csv via the API"
              >
                <span className="inline-flex items-center gap-2">
                  {isLoadingDemo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Load demo dataset
                </span>
              </button>
              <div className="text-xs text-gray-500">
                Uses <span className="font-mono">data/hvac/demo_trends.csv</span> (generated via{' '}
                <span className="font-mono">python scripts/generate_hvac_trend_csv.py</span>).
              </div>
            </div>
            {trendFile ? (
              <div className="text-xs text-gray-500">
                File size: {(trendFile.size / 1024 / 1024).toFixed(2)} MB (MVP limit: 25 MB)
              </div>
            ) : null}
          </div>
 
          {/* Step 2: Point mapping */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-900">2) Map points</h2>
              <p className="text-xs text-gray-500">Map canonical tags → CSV column names (exact match).</p>
            </div>
 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Timestamp column</label>
                <input
                  value={timestampColumn}
                  onChange={(e) => setTimestampColumn(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Timestamp"
                />
              </div>
              <div className="text-xs text-gray-500 flex items-end">
                Tip: start with OAT + SAT + FAN_KW (or FAN_SPEED_PCT) + DUCT_STATIC.
              </div>
            </div>
 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pointTags.map((tag) => (
                <div key={tag} className="flex items-center gap-3">
                  <div className="w-36 shrink-0 text-xs font-mono text-gray-700">{tag}</div>
                  <input
                    value={mappedPoints[tag] || ''}
                    onChange={(e) => setMappedPoint(tag, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="CSV column name (optional)"
                  />
                </div>
              ))}
            </div>
          </div>
 
          {/* Step 3: Run */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-900">3) Run optimizer</h2>
              <div className="text-xs text-gray-600">
                {runId ? (
                  <span>
                    Run: <span className="font-mono">{runId}</span> ({runStatus || 'unknown'})
                  </span>
                ) : (
                  <span>No run yet</span>
                )}
              </div>
            </div>
 
            <div className="flex items-center gap-3">
              <button
                onClick={startRun}
                disabled={isStarting || !trendFileKey}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <PlayCircle className="w-4 h-4" />
                    Start run
                  </span>
                )}
              </button>
 
              <button
                onClick={() => runId && fetchRun(runId)}
                disabled={!runId}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh run status"
              >
                <span className="inline-flex items-center gap-2">
                  <RefreshCcw className="w-4 h-4" />
                  Refresh
                </span>
              </button>
            </div>
 
            <div className="text-xs text-gray-500">
              If runs fail immediately, make sure the Node server is running and the Python <span className="font-mono">hvac_compute</span>{' '}
              service is running (default: <span className="font-mono">http://localhost:8010</span>).
            </div>
          </div>
 
          {/* Step 4: Results */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">4) Results</h2>
 
            {!runRecord ? (
              <div className="text-sm text-gray-600">No results yet. Start a run to see QA/FDD/recommendations.</div>
            ) : runRecord.status === 'failed' ? (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                Run failed: {runRecord.error?.message || 'Unknown error'}
              </div>
            ) : runRecord.status === 'blocked_by_faults' ? (
              <div className="space-y-3">
                <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  Blocked by high-severity faults. Fix/verify these before any optimization is allowed.
                </div>
                <div className="text-sm text-gray-600">Status: {runRecord.status}</div>
              </div>
            ) : runRecord.status !== 'completed' ? (
              <div className="text-sm text-gray-600">Status: {runRecord.status}</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Completeness score</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.round(((runRecord.result?.dataQa as any)?.completenessScore || 0) * 100)}%
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500">QA issues</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {Array.isArray((runRecord.result?.dataQa as any)?.issues)
                        ? (runRecord.result?.dataQa as any).issues.length
                        : 0}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Recommendations</div>
                    <div className="text-2xl font-bold text-gray-900">{runRecord.result?.recommendations?.length || 0}</div>
                  </div>
                </div>
 
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700">FDD findings</div>
                  <div className="p-4 space-y-3">
                    {Array.isArray((runRecord.result as any)?.fdd_findings) && (runRecord.result as any).fdd_findings.length > 0 ? (
                      (runRecord.result as any).fdd_findings.map((f: any) => (
                        <div key={String(f.id)} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-gray-900">{f.fault_type}</div>
                            <div className="text-xs font-mono text-gray-600">{f.severity}</div>
                          </div>
                          {Array.isArray(f?.evidence?.timestamps) && f.evidence.timestamps.length > 0 ? (
                            <div className="text-xs text-gray-600 mt-1">
                              Window: <span className="font-mono">{String(f.evidence.timestamps[0])}</span> →{' '}
                              <span className="font-mono">{String(f.evidence.timestamps[1] || '')}</span>
                            </div>
                          ) : null}
                          {Array.isArray(f?.recommended_investigation) && f.recommended_investigation.length > 0 ? (
                            <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
                              {f.recommended_investigation.map((s: string, idx: number) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-600">No FDD findings reported.</div>
                    )}
                  </div>
                </div>
 
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700">Data QA issues</div>
                  <div className="p-4 space-y-2">
                    {Array.isArray((runRecord.result?.dataQa as any)?.issues) && (runRecord.result?.dataQa as any).issues.length > 0 ? (
                      (runRecord.result?.dataQa as any).issues.map((i: any) => (
                        <div key={String(i.id)} className="text-sm text-gray-800">
                          <span className="font-mono text-xs text-gray-500">{i.severity || 'warning'}</span>{' '}
                          {i.pointTag ? <span className="font-mono text-xs">[{i.pointTag}]</span> : null} {i.message}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-600">No QA issues reported.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
 
