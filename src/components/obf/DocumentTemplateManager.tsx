import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import type { DocumentTemplate } from '../../data/pge/pge-obf-pathways';

export type DocumentState = Record<string, { ready?: boolean; uploaded?: boolean; notes?: string }>;

function storageKey(key: string): string {
  return `everwatt:obf:documents:${key}`;
}

function loadState(key: string): DocumentState {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DocumentState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveState(key: string, state: DocumentState): void {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(state));
  } catch {
    // ignore
  }
}

export interface DocumentTemplateManagerProps {
  /** Typically: `pge:${pathwayId}` */
  persistKey: string;
  title?: string;
  documents: DocumentTemplate[];
  showOptional?: boolean;
}

export const DocumentTemplateManager: React.FC<DocumentTemplateManagerProps> = ({
  persistKey,
  title = 'Required Documents',
  documents,
  showOptional = false,
}) => {
  const [state, setState] = useState<DocumentState>({});

  useEffect(() => {
    setState(loadState(persistKey));
  }, [persistKey]);

  useEffect(() => {
    saveState(persistKey, state);
  }, [persistKey, state]);

  const visible = useMemo(() => documents.filter((d) => showOptional || d.required), [documents, showOptional]);

  const progress = useMemo(() => {
    const total = visible.length;
    const uploaded = visible.filter((d) => !!state[d.id]?.uploaded).length;
    const pct = total === 0 ? 0 : Math.round((uploaded / total) * 100);
    return { total, uploaded, pct };
  }, [visible, state]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-lg font-bold text-slate-900">{title}</div>
          <div className="text-sm text-slate-500">
            Uploaded: {progress.uploaded}/{progress.total} ({progress.pct}%)
          </div>
        </div>
        <button
          onClick={() => setState({})}
          className="text-sm px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          Reset
        </button>
      </div>

      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-5">
        <div className="h-full bg-blue-600" style={{ width: `${progress.pct}%` }} />
      </div>

      <div className="space-y-3">
        {visible.map((d) => {
          const st = state[d.id] || {};
          return (
            <div key={d.id} className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <div className="text-sm font-bold text-slate-900">{d.name}</div>
                    {d.required && (
                      <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        Required
                      </span>
                    )}
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                      {d.phase}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mt-1">{d.description}</div>
                  {(d.templatePath || d.notes) && (
                    <div className="text-xs text-slate-500 mt-2">
                      {d.templatePath ? (
                        <span className="inline-flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" /> Template ref: {d.templatePath}
                        </span>
                      ) : null}
                      {d.notes ? <div className="mt-1">{d.notes}</div> : null}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={!!st.ready}
                      onChange={(e) =>
                        setState((prev) => ({ ...prev, [d.id]: { ...prev[d.id], ready: e.target.checked } }))
                      }
                    />
                    Ready
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={!!st.uploaded}
                      onChange={(e) =>
                        setState((prev) => ({ ...prev, [d.id]: { ...prev[d.id], uploaded: e.target.checked } }))
                      }
                    />
                    Uploaded
                  </label>
                  {st.uploaded && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                </div>
              </div>

              <div className="mt-3">
                <textarea
                  value={st.notes || ''}
                  onChange={(e) => setState((prev) => ({ ...prev, [d.id]: { ...prev[d.id], notes: e.target.value } }))}
                  placeholder="Notes (optional)…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  rows={2}
                />
              </div>
            </div>
          );
        })}

        {visible.length === 0 && <div className="text-sm text-slate-600">No documents defined for this pathway yet.</div>}
      </div>
    </div>
  );
};


