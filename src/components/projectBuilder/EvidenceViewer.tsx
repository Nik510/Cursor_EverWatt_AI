import { useEffect, useMemo, useState } from 'react';
import type { ProjectRecord } from '../../types/change-order';
import { ExternalLink, Search, FileText } from 'lucide-react';
import { getChunks, getExtracted } from '../../shared/api/vault';

type VaultFile = NonNullable<ProjectRecord['vault']>['files'] extends Array<infer T> ? T : any;

export function EvidenceViewer(props: {
  projectId: string;
  files: VaultFile[];
  selectedFileId?: string;
  onSelectFileId?: (id: string) => void;
  initialPage?: number;
  initialSheet?: string;
}) {
  const [fileId, setFileId] = useState<string>(props.selectedFileId || '');
  const [extracted, setExtracted] = useState<any>(null);
  const [chunks, setChunks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [page, setPage] = useState<string>(props.initialPage ? String(props.initialPage) : '');
  const [sheet, setSheet] = useState<string>(props.initialSheet || '');

  useEffect(() => {
    if (props.selectedFileId && props.selectedFileId !== fileId) setFileId(props.selectedFileId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedFileId]);

  useEffect(() => {
    if (props.initialPage && String(props.initialPage) !== page) setPage(String(props.initialPage));
    if (props.initialSheet && props.initialSheet !== sheet) setSheet(props.initialSheet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.initialPage, props.initialSheet]);

  const selected = useMemo(() => props.files.find((f: any) => String(f?.id || '') === String(fileId || '')) || null, [props.files, fileId]);

  async function load() {
    if (!props.projectId || !fileId) return;
    setLoading(true);
    setError(null);
    try {
      const [eData, cData] = await Promise.all([
        getExtracted({ projectId: props.projectId, fileId }),
        getChunks({ projectId: props.projectId, fileId, topK: 80 }),
      ]);
      setExtracted((eData as any).extracted || null);
      setChunks(Array.isArray((cData as any).results) ? (cData as any).results : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load evidence');
      setExtracted(null);
      setChunks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  async function runSearch() {
    if (!props.projectId || !fileId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getChunks({
        projectId: props.projectId,
        fileId,
        topK: 30,
        q: q.trim() ? q.trim() : undefined,
        page: page.trim() ? page.trim() : undefined,
        sheet: sheet.trim() ? sheet.trim() : undefined,
      });
      setChunks(Array.isArray((data as any).results) ? (data as any).results : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="text-sm font-semibold text-gray-900">Vault Files</div>
        {props.files.length === 0 && <div className="text-sm text-gray-600">No files uploaded yet.</div>}
        <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
          {props.files.map((f: any) => (
            <button
              key={String(f.id)}
              type="button"
              onClick={() => {
                const id = String(f.id);
                setFileId(id);
                props.onSelectFileId?.(id);
              }}
              className={`w-full text-left border rounded-lg p-3 ${
                String(f.id) === String(fileId) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="font-semibold text-gray-900 truncate">{f.filename}</div>
              <div className="text-xs text-gray-600">
                {f.kind} • {typeof f.chunks?.count === 'number' ? `${f.chunks.count} chunks` : '—'}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(Array.isArray(f.tags) ? f.tags : []).slice(0, 4).map((t: string) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-700">
                    {t}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Evidence Viewer
            </div>
            <div className="text-xs text-gray-600">
              Select a file to view extracted metadata and searchable chunks (with provenance).
            </div>
          </div>
          {selected?.storageKey ? (
            <a
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              href={`/api/files/${encodeURIComponent(String((selected as any).storageKey))}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="w-4 h-4" />
              Open file
            </a>
          ) : null}
        </div>

        {!fileId && <div className="text-sm text-gray-600">Pick a Vault file to begin.</div>}
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

        {fileId && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <label className="text-xs text-gray-700">
                Query
                <div className="mt-1 relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="e.g. fixture, schedule, AHU"
                  />
                </div>
              </label>
              <label className="text-xs text-gray-700">
                Page
                <input value={page} onChange={(e) => setPage(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. 2" />
              </label>
              <label className="text-xs text-gray-700">
                Sheet
                <input value={sheet} onChange={(e) => setSheet(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. E2.1" />
              </label>
              <div className="flex items-end">
                <button
                  onClick={() => void runSearch()}
                  disabled={loading}
                  className="w-full px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Search'}
                </button>
              </div>
            </div>
          </div>
        )}

        {fileId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Extracted metadata</div>
              <pre className="text-xs whitespace-pre-wrap break-words bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-[50vh] overflow-auto">
                {loading ? 'Loading…' : extracted ? JSON.stringify(extracted, null, 2) : '(none)'}
              </pre>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Chunks (evidence)</div>
              <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
                {chunks.length === 0 && <div className="text-sm text-gray-600">No chunks returned.</div>}
                {chunks.map((c: any, idx: number) => (
                  <div key={`${c.chunkIndex || idx}`} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="text-[11px] text-gray-600 font-mono">
                      chunk={c.chunkIndex}
                      {c?.provenance?.page ? ` page=${c.provenance.page}` : ''}
                      {c?.provenance?.sheet ? ` sheet=${c.provenance.sheet}` : ''}
                      {c?.provenance?.cellRange ? ` cellRange=${c.provenance.cellRange}` : ''}
                      {typeof c.score === 'number' ? ` score=${c.score.toFixed(2)}` : ''}
                    </div>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap mt-2">{String(c.text || '')}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

