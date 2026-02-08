import React, { useEffect, useState } from 'react';
import { ClipboardCheck, RefreshCw, Trash2, Eye } from 'lucide-react';
import { GetAuditResponseSchema, ListAuditsResponseSchema, ApiOkSchema, unwrap } from '../../types/api-responses';

type AuditSummary = {
  id: string;
  name: string;
  timestamp: string;
  updatedAt: string;
};

type AuditDetail = {
  id: string;
  timestamp: string;
  updatedAt: string;
  building?: {
    name?: string;
    address?: string;
    squareFootage?: number;
    buildingType?: string;
  };
  hvac?: unknown[];
  lighting?: unknown[];
};

export function AuditList(props: { onNewAudit: () => void }) {
  const [audits, setAudits] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditDetail | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/audits');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`Failed to load audits (${res.status})`);
      const v = unwrap(ListAuditsResponseSchema, data);
      setAudits((v.audits || []) as AuditSummary[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audits');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function openAudit(id: string) {
    try {
      const res = await fetch(`/api/audits/${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`Failed to load audit (${res.status})`);
      const v = unwrap(GetAuditResponseSchema, data);
      setSelected(v.audit as AuditDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit');
    }
  }

  async function deleteAudit(id: string) {
    if (!confirm('Delete this audit? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/audits/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`Failed to delete audit (${res.status})`);
      unwrap(ApiOkSchema.or(GetAuditResponseSchema), data);
      setAudits((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete audit');
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Saved Audits</h3>
          <p className="text-sm text-gray-500">Audits saved to the server</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={props.onNewAudit}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            New Audit
          </button>
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="text-gray-600">Loading audits…</div>
      ) : audits.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="mb-4">No audits yet. Start a new audit to begin.</p>
          <button
            onClick={props.onNewAudit}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Start New Audit
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {audits.map((a) => (
            <div key={a.id} className="py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 truncate">{a.name || a.id}</div>
                <div className="text-sm text-gray-500">
                  Updated {new Date(a.updatedAt || a.timestamp).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void openAudit(a.id)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => void deleteAudit(a.id)}
                  className="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{selected.building?.name || selected.id}</h4>
                  <p className="text-sm text-gray-500">{selected.building?.address}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-2xl">
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-xs text-gray-500">Square Footage</div>
                  <div className="font-semibold text-gray-900">
                    {selected.building?.squareFootage ? selected.building.squareFootage.toLocaleString() : '—'}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-xs text-gray-500">Building Type</div>
                  <div className="font-semibold text-gray-900">{selected.building?.buildingType || '—'}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-xs text-gray-500">HVAC Systems</div>
                  <div className="font-semibold text-gray-900">{Array.isArray(selected.hvac) ? selected.hvac.length : 0}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-xs text-gray-500">Lighting Systems</div>
                  <div className="font-semibold text-gray-900">{Array.isArray(selected.lighting) ? selected.lighting.length : 0}</div>
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                Created: {new Date(selected.timestamp).toLocaleString()} • Updated: {new Date(selected.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
