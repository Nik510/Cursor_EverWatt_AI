import { useMemo, useState } from 'react';
import type { ProjectRecord } from '../../types/change-order';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

type VaultFile = NonNullable<ProjectRecord['vault']>['files'] extends Array<infer T> ? T : any;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export type InboxItem = any;

export function InboxReviewPanel(props: {
  projectId: string;
  item: InboxItem;
  vaultFiles: VaultFile[];
  onCancel: () => void;
  onConfirm: (nextItem: InboxItem) => void;
  onReject: (reason: string) => void;
  onOpenEvidence?: (args: { fileId?: string; page?: number; sheet?: string }) => void;
}) {
  const [working, setWorking] = useState<InboxItem>(() => ({ ...(props.item || {}) }));
  const [rejectReason, setRejectReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const vaultById = useMemo(() => {
    const m = new Map<string, any>();
    for (const f of props.vaultFiles as any[]) {
      if (f?.id) m.set(String(f.id), f);
    }
    return m;
  }, [props.vaultFiles]);

  const prov = working?.provenance || {};
  const fileId = String(prov?.fileId || '').trim() || '';
  const file = fileId ? vaultById.get(fileId) : null;
  const viewHref = file?.storageKey ? `/api/files/${encodeURIComponent(String(file.storageKey))}` : null;

  function validateConfirm() {
    const name = String(working?.name || working?.title || '').trim();
    if (!name) return 'Name is required.';
    const confidence = clamp01(Number(working?.confidence ?? 0.5));
    if (!Number.isFinite(confidence)) return 'Confidence must be a number.';
    if (working?.provenance && typeof working.provenance === 'object') {
      const p = working.provenance;
      if (p.fileId && !String(p.fileId).trim()) return 'If provenance.fileId is set, it cannot be empty.';
    }
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={props.onCancel}>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">Review inferred item</div>
            <div className="text-xs text-gray-600 font-mono truncate">
              id={String(working?.id || '(none)')} kind={String(working?.kind || 'asset')}
            </div>
          </div>
          <button className="text-sm text-gray-700 hover:text-gray-900" onClick={props.onCancel}>
            Close
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="font-medium text-gray-700">Name *</div>
              <input
                value={String(working?.name || working?.title || '')}
                onChange={(e) => setWorking((w: any) => ({ ...w, name: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </label>
            <label className="text-sm">
              <div className="font-medium text-gray-700">Category</div>
              <input
                value={String(working?.category || '')}
                onChange={(e) => setWorking((w: any) => ({ ...w, category: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </label>
            <label className="text-sm">
              <div className="font-medium text-gray-700">Confidence (0..1)</div>
              <input
                value={String(working?.confidence ?? 0.5)}
                onChange={(e) => setWorking((w: any) => ({ ...w, confidence: Number(e.target.value) }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </label>
            <label className="text-sm">
              <div className="font-medium text-gray-700">Needs confirmation</div>
              <select
                value={String(working?.needsConfirmation ?? true)}
                onChange={(e) => setWorking((w: any) => ({ ...w, needsConfirmation: e.target.value === 'true' }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="text-sm font-semibold text-gray-900">Provenance</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm">
                <div className="font-medium text-gray-700">File</div>
                <select
                  value={fileId}
                  onChange={(e) =>
                    setWorking((w: any) => ({ ...w, provenance: { ...(w.provenance || {}), fileId: e.target.value } }))
                  }
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">(none)</option>
                  {(props.vaultFiles as any[]).map((f: any) => (
                    <option key={String(f.id)} value={String(f.id)}>
                      {String(f.filename || f.id)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <div className="font-medium text-gray-700">Page</div>
                <input
                  value={String(prov?.page ?? '')}
                  onChange={(e) => setWorking((w: any) => ({ ...w, provenance: { ...(w.provenance || {}), page: Number(e.target.value) } }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </label>
              <label className="text-sm">
                <div className="font-medium text-gray-700">Sheet</div>
                <input
                  value={String(prov?.sheet ?? '')}
                  onChange={(e) => setWorking((w: any) => ({ ...w, provenance: { ...(w.provenance || {}), sheet: e.target.value } }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </label>
              <label className="text-sm">
                <div className="font-medium text-gray-700">Cell range</div>
                <input
                  value={String(prov?.cellRange ?? '')}
                  onChange={(e) =>
                    setWorking((w: any) => ({ ...w, provenance: { ...(w.provenance || {}), cellRange: e.target.value } }))
                  }
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-gray-600 truncate">
                {file ? (
                  <>
                    <span className="font-mono">fileId={fileId}</span>
                    <span className="ml-2">{String(file.filename || '')}</span>
                  </>
                ) : (
                  <span>No file selected</span>
                )}
              </div>
              <div className="flex gap-2">
                {viewHref ? (
                  <a className="text-xs text-blue-700 underline inline-flex items-center gap-1" href={viewHref} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-3 h-3" /> Open file
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => props.onOpenEvidence?.({ fileId: fileId || undefined, page: prov?.page, sheet: prov?.sheet })}
                  className="text-xs text-blue-700 underline"
                >
                  Open in Evidence Viewer
                </button>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="text-sm font-semibold text-gray-900">Reject (requires reason)</div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={3}
              placeholder="Why is this incorrect or not actionable?"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={() => {
              const msg = validateConfirm();
              if (msg) {
                setError(msg);
                return;
              }
              setError(null);
              props.onConfirm(working);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
          >
            <CheckCircle2 className="w-4 h-4" /> Confirm
          </button>
          <button
            onClick={() => {
              const r = rejectReason.trim();
              if (!r) {
                setError('Reject reason is required.');
                return;
              }
              setError(null);
              props.onReject(r);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-800 font-semibold hover:bg-gray-50"
          >
            <XCircle className="w-4 h-4" /> Reject
          </button>
        </div>
      </div>
    </div>
  );
}

