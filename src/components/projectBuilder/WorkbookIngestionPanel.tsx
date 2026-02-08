import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Play, Save, Upload, ChevronDown } from 'lucide-react';

type WorkbookFile = {
  id: string;
  filename: string;
  kind?: string;
  tags?: string[];
};

type WorkbookIndex = any;

function isXlsx(name: string): boolean {
  return /\.xlsx$/i.test(String(name || '').trim());
}

export function WorkbookIngestionPanel(props: {
  projectId: string;
  vaultFiles: WorkbookFile[];
  onAfterIngestion?: (nextGraph: any) => void;
  onVaultFilesPatched?: (file: any) => void;
}) {
  const workbooks = useMemo(
    () => (props.vaultFiles || []).filter((f) => isXlsx(f.filename) || String(f.kind || '').toLowerCase() === 'workbook'),
    [props.vaultFiles]
  );

  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [index, setIndex] = useState<WorkbookIndex | null>(null);
  const [mappings, setMappings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [fixtureTypes, setFixtureTypes] = useState<any[]>([]);
  const [auditRows, setAuditRows] = useState<any[]>([]);
  const [openGroupId, setOpenGroupId] = useState<string>('');

  const selected = useMemo(() => workbooks.find((w) => String(w.id) === String(selectedFileId)) || null, [workbooks, selectedFileId]);

  async function loadIndexAndMappings(fileId: string) {
    if (!props.projectId || !fileId) return;
    setLoading(true);
    setError(null);
    try {
      const [iRes, mRes] = await Promise.all([
        fetch(`/api/projectBuilder/${encodeURIComponent(props.projectId)}/workbooks/${encodeURIComponent(fileId)}/index`),
        fetch(`/api/projectBuilder/${encodeURIComponent(props.projectId)}/workbooks/${encodeURIComponent(fileId)}/mappings`),
      ]);
      const iData = await iRes.json().catch(() => ({}));
      const mData = await mRes.json().catch(() => ({}));
      if (!iRes.ok || !iData?.success) throw new Error(iData?.error || `Failed to load workbook_index (${iRes.status})`);
      if (!mRes.ok || !mData?.success) throw new Error(mData?.error || `Failed to load mappings (${mRes.status})`);
      setIndex(iData.workbookIndex || null);
      setMappings(mData.mappings || null);
      // Load latest ingestion output if present
      const ingRes = await fetch(`/api/projectBuilder/${encodeURIComponent(props.projectId)}/workbooks/${encodeURIComponent(fileId)}/ingestion`);
      const ingData = await ingRes.json().catch(() => ({}));
      if (ingRes.ok && ingData?.success && ingData?.ingest) {
        const ft = Array.isArray(ingData.ingest.lightingFixtureTypes) ? ingData.ingest.lightingFixtureTypes : [];
        const ar = Array.isArray(ingData.ingest.auditRows) ? ingData.ingest.auditRows : [];
        setFixtureTypes(ft);
        setAuditRows(ar);
      } else {
        setFixtureTypes([]);
        setAuditRows([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workbook details');
      setIndex(null);
      setMappings(null);
      setFixtureTypes([]);
      setAuditRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (workbooks.length === 1 && !selectedFileId) setSelectedFileId(String(workbooks[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workbooks.length]);

  useEffect(() => {
    if (selectedFileId) void loadIndexAndMappings(selectedFileId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFileId]);

  const tables = useMemo(() => {
    const sheets = Array.isArray(index?.sheets) ? index.sheets : [];
    const out: Array<{ tableId: string; sheet: string; columns: any[]; sampleRows: string[]; meta: any }> = [];
    for (const s of sheets) {
      const t = Array.isArray(s?.tables) ? s.tables : [];
      for (const tbl of t) {
        out.push({
          tableId: String(tbl.tableId || ''),
          sheet: String(tbl.sheet || s?.name || ''),
          columns: Array.isArray(tbl.columns) ? tbl.columns : [],
          sampleRows: Array.isArray(tbl.sampleRows) ? tbl.sampleRows : [],
          meta: tbl,
        });
      }
    }
    return out;
  }, [index]);

  const [lightingTableId, setLightingTableId] = useState('');
  const [lightingCols, setLightingCols] = useState<any>({
    area: '',
    fixtureType: '',
    qty: '',
    lampCount: '',
    wattsPerLamp: '',
    fixtureWatts: '',
    controlType: '',
    notes: '',
  });

  useEffect(() => {
    const m = mappings?.lightingAudit;
    if (m?.tableId && m?.columns) {
      setLightingTableId(String(m.tableId));
      setLightingCols({ ...lightingCols, ...(m.columns || {}) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappings?.lightingAudit?.tableId]);

  const lightingTable = useMemo(() => tables.find((t) => t.tableId === lightingTableId) || null, [tables, lightingTableId]);
  const lightingColumnOptions = useMemo(() => {
    const cols = Array.isArray(lightingTable?.columns) ? lightingTable.columns : [];
    return cols.map((c: any) => ({ key: String(c.key || ''), label: String(c.header || c.key || '') }));
  }, [lightingTable]);

  async function saveMappings() {
    if (!props.projectId || !selectedFileId) return;
    setSaving(true);
    setError(null);
    try {
      if (!lightingTable) throw new Error('Select a Lighting Audit table to save mappings.');
      const payload = {
        apiVersion: 'workbook-mappings/v1',
        fileId: selectedFileId,
        updatedAt: new Date().toISOString(),
        lightingAudit: {
          tableId: lightingTable.meta.tableId,
          sheet: lightingTable.meta.sheet,
          headerRow: lightingTable.meta.headerRow,
          startCol: lightingTable.meta.startCol,
          endCol: lightingTable.meta.endCol,
          rowStart: lightingTable.meta.rowStart,
          rowEnd: lightingTable.meta.rowEnd,
          columns: lightingCols,
        },
      };
      const res = await fetch(`/api/projectBuilder/${encodeURIComponent(props.projectId)}/workbooks/${encodeURIComponent(selectedFileId)}/mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || `Failed to save mappings (${res.status})`);
      setMappings(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save mappings');
    } finally {
      setSaving(false);
    }
  }

  async function runIngestion() {
    if (!props.projectId || !selectedFileId) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/projectBuilder/${encodeURIComponent(props.projectId)}/runIngestion?fileId=${encodeURIComponent(selectedFileId)}`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || `Ingestion failed (${res.status})`);
      setSummary(data.summary || null);
      props.onAfterIngestion?.(data.graph || null);
      // Refresh ingestion output for UI
      await loadIndexAndMappings(selectedFileId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run ingestion');
    } finally {
      setRunning(false);
    }
  }

  async function uploadWorkbook(file: File) {
    if (!props.projectId || !file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch(`/api/projectBuilder/${encodeURIComponent(props.projectId)}/uploadWorkbook`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || `Upload failed (${res.status})`);
      if (data.file?.id) {
        props.onVaultFilesPatched?.(data.file);
        setSelectedFileId(String(data.file.id));
        setSummary(data.ingestSummary || null);
        setFixtureTypes(Array.isArray(data.lightingFixtureTypes) ? data.lightingFixtureTypes : []);
        setOpenGroupId('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload workbook');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-4 bg-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Workbook Ingestion (v1)
          </div>
          <div className="text-xs text-gray-600">
            Upload 1 XLSX workbook, map the lighting audit table once, and ingest consolidated FixtureGroups with evidence (sheet+cell range).
          </div>
        </div>
      </div>

      {workbooks.length === 0 && (
        <div className="text-sm text-gray-700 border border-amber-200 bg-amber-50 rounded-lg p-3">
          Upload a Mills Peninsula-style `.xlsx` workbook here (ingests immediately).
          <label className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 cursor-pointer">
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading…' : 'Upload workbook'}
            <input
              type="file"
              className="hidden"
              accept=".xlsx"
              disabled={uploading}
              onChange={(e) => {
                const f = e.currentTarget.files?.[0];
                if (f) void uploadWorkbook(f);
                e.currentTarget.value = '';
              }}
            />
          </label>
        </div>
      )}

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

      {workbooks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-4">
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-gray-700 mb-2">Workbooks</div>
            <div className="space-y-2">
              {workbooks.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedFileId(String(w.id))}
                  className={`w-full text-left border rounded-lg p-2 ${
                    String(w.id) === String(selectedFileId) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-sm font-semibold text-gray-900 truncate">{w.filename}</div>
                  <div className="text-[11px] text-gray-600 font-mono">fileId={w.id}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-3 space-y-4">
            <div className="text-sm font-semibold text-gray-900">Mapping</div>
            {loading && <div className="text-sm text-gray-600">Loading workbook index…</div>}
            {!loading && selected && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Uploading…' : 'Upload new workbook'}
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.currentTarget.files?.[0];
                        if (f) void uploadWorkbook(f);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                  {summary ? (
                    <div className="text-xs text-gray-600">
                      groups={summary.fixtureTypeGroups ?? summary.fixtureTypeGroupsCreated ?? 0} • rows={summary.auditRows ?? 0}
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-sm">
                    <div className="text-xs font-semibold text-gray-700">Lighting Audit table *</div>
                    <select
                      value={lightingTableId}
                      onChange={(e) => setLightingTableId(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                    >
                      <option value="">Select table…</option>
                      {tables.map((t) => (
                        <option key={t.tableId} value={t.tableId}>
                          {t.sheet} • {t.tableId}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {lightingTable && (
                  <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                    <div className="text-xs text-gray-600">
                      Detected columns: {(lightingColumnOptions || []).map((c) => c.label).slice(0, 10).join(', ')}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        ['area', 'Area (optional)'],
                        ['fixtureType', 'Fixture type *'],
                        ['qty', 'Quantity *'],
                        ['lampCount', 'Lamp count (optional)'],
                        ['fixtureWatts', 'Fixture watts (optional)'],
                        ['wattsPerLamp', 'Watts per lamp (optional)'],
                        ['controlType', 'Control type (optional)'],
                        ['notes', 'Notes (optional)'],
                      ].map(([k, label]) => (
                        <label key={k} className="text-sm">
                          <div className="text-xs font-semibold text-gray-700">{label}</div>
                          <select
                            value={lightingCols[k] || ''}
                            onChange={(e) => setLightingCols((p: any) => ({ ...p, [k]: e.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                          >
                            <option value="">(unmapped)</option>
                            {lightingColumnOptions.map((c) => (
                              <option key={c.key} value={c.key}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>

                    {lightingTable.sampleRows?.length ? (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-xs font-semibold text-gray-800">Preview rows</summary>
                        <div className="mt-2 space-y-1">
                          {lightingTable.sampleRows.slice(0, 8).map((r, idx) => (
                            <div key={idx} className="text-xs font-mono text-gray-700 border border-gray-200 rounded p-2">
                              {r}
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void saveMappings()}
                    disabled={saving || running}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving…' : 'Save table_mappings.json'}
                  </button>
                  <button
                    onClick={() => void runIngestion()}
                    disabled={running || saving}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    {running ? 'Running…' : 'Run ingestion'}
                  </button>
                </div>

                {summary && (
                  <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-3 text-sm">
                    <div className="font-semibold text-emerald-900">Ingestion summary</div>
                    <div className="text-xs text-emerald-800 mt-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>FixtureGroups: {summary.fixtureGroupsCreated ?? 0}</div>
                      <div>Measures: {summary.measuresCreated ?? 0}</div>
                      <div>Assumptions: {summary.assumptionsCreated ?? 0}</div>
                      <div>Inbox: {summary.inboxItemsCreated ?? 0}</div>
                    </div>
                  </div>
                )}

                {/* Default view: consolidated fixture types */}
                {fixtureTypes.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="text-sm font-semibold text-gray-900">Lighting fixture types</div>
                    <div className="text-xs text-gray-600">Default view (engineer-usable). Click a group to view evidence rows.</div>
                    <div className="space-y-2 max-h-[40vh] overflow-auto pr-1">
                      {fixtureTypes.map((ft: any) => {
                        const isOpen = String(openGroupId) === String(ft.id);
                        const qty = Number(ft.qty ?? 0) || 0;
                        const needs = Boolean(ft.needsConfirmation);
                        const key = String(ft.fixtureTypeKey || '').slice(0, 90);
                        return (
                          <div key={String(ft.id)} className="border border-gray-200 rounded-lg">
                            <button
                              type="button"
                              onClick={() => setOpenGroupId(isOpen ? '' : String(ft.id))}
                              className="w-full text-left p-3 flex items-start justify-between gap-3 hover:bg-gray-50"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 truncate">
                                  qty={qty.toLocaleString()} {needs ? '• needs confirmation' : ''}
                                </div>
                                <div className="text-[11px] font-mono text-gray-600 truncate">{key}</div>
                              </div>
                              <ChevronDown className={`w-4 h-4 text-gray-500 mt-0.5 ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isOpen && (
                              <div className="border-t border-gray-200 p-3 space-y-2 bg-white">
                                <div className="text-xs text-gray-700 font-semibold">Evidence (sample rows)</div>
                                <div className="space-y-2">
                                  {(Array.isArray(ft.evidenceRefs) ? ft.evidenceRefs : []).slice(0, 10).map((ev: any, idx: number) => (
                                    <div key={idx} className="text-xs border border-gray-200 rounded p-2">
                                      <div className="font-mono text-gray-600">
                                        {ev.sheet ? `sheet=${ev.sheet} ` : ''}
                                        {ev.rowStart ? `row=${ev.rowStart} ` : ''}
                                        {ev.colStart ? `col=${ev.colStart}-${ev.colEnd}` : ''}
                                      </div>
                                      <div className="text-gray-900 mt-1 whitespace-pre-wrap">{String(ev.snippet || ev.snippetText || '')}</div>
                                    </div>
                                  ))}
                                </div>

                                <details className="text-sm">
                                  <summary className="cursor-pointer text-xs font-semibold text-gray-800">View linked audit rows</summary>
                                  <div className="mt-2 space-y-2">
                                    {auditRows
                                      .filter((r: any) => Array.isArray(ft.sourceRowIds) && ft.sourceRowIds.includes(r.id))
                                      .slice(0, 50)
                                      .map((r: any) => (
                                        <div key={String(r.id)} className="text-xs border border-gray-200 rounded p-2">
                                          <div className="font-mono text-gray-600">
                                            sheet={r.sourceSheet} row={r.rowNumber}{' '}
                                            {r?.evidenceRef?.cellRange ? `range=${r.evidenceRef.cellRange}` : ''}
                                          </div>
                                          <div className="text-gray-900 mt-1">
                                            {String(r?.evidenceRef?.snippet || r?.evidenceRef?.snippetText || '')}
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

