import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClipboardCopy, ExternalLink, RefreshCcw, Search, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AdminLogin } from '../../../components/admin/AdminLogin';
import { useAdmin } from '../../../contexts/AdminContext';
import {
  createShareV1,
  extendExpiryV1,
  listSharesV1,
  readShareV1,
  revokeShareV1,
  setScopeV1,
  type ShareLinkMetaV1,
  type ShareLinkV1,
  type ShareScopeV1,
} from '../../../shared/api/sharesV1';

function fmtIsoShort(iso: string | null | undefined): string {
  const s = String(iso || '').trim();
  if (!s) return '—';
  return s.replace('T', ' ').slice(0, 19);
}

function isExpired(expiresAtIso: string | null): boolean {
  if (!expiresAtIso) return false;
  const ms = Date.parse(expiresAtIso);
  return Number.isFinite(ms) ? Date.now() > ms : false;
}

export const SharesAdminV1Page: React.FC = () => {
  const navigate = useNavigate();
  const { session, isAuthenticated, hasPermission } = useAdmin();
  const adminToken = session?.token || '';

  const [qInput, setQInput] = useState('');
  const [qApplied, setQApplied] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shares, setShares] = useState<ShareLinkMetaV1[]>([]);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditBusy, setAuditBusy] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditShare, setAuditShare] = useState<ShareLinkV1 | null>(null);

  const [newLinkOpen, setNewLinkOpen] = useState(false);
  const [newLink, setNewLink] = useState<string>('');

  const canStaff = isAuthenticated && hasPermission('editor');

  async function refresh() {
    if (!canStaff) return;
    setBusy(true);
    setError(null);
    try {
      const res = await listSharesV1({ limit: 100, q: qApplied || undefined, adminToken });
      setShares(Array.isArray(res.shares) ? res.shares : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load shares');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qApplied, canStaff, adminToken]);

  const sharesSorted = useMemo(() => {
    return [...shares].sort((a, b) => String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || '')) || String(a.shareId || '').localeCompare(String(b.shareId || '')));
  }, [shares]);

  async function copy(text: string) {
    const t = String(text || '').trim();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      // ignore
    }
  }

  async function openAudit(shareId: string) {
    if (!canStaff) return;
    setAuditOpen(true);
    setAuditBusy(true);
    setAuditError(null);
    setAuditShare(null);
    try {
      const res = await readShareV1({ shareId, adminToken });
      setAuditShare(res.share);
    } catch (e) {
      setAuditError(e instanceof Error ? e.message : 'Failed to load audit log');
    } finally {
      setAuditBusy(false);
    }
  }

  async function revoke(shareId: string) {
    if (!canStaff) return;
    if (!window.confirm('Revoke this share? This cannot be undone.')) return;
    try {
      await revokeShareV1({ shareId, adminToken });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to revoke share');
    }
  }

  async function extendExpiry(shareId: string) {
    if (!canStaff) return;
    const raw = window.prompt('Extend expiry by how many hours?', '168');
    if (raw === null) return;
    const extendHours = Number(raw);
    if (!Number.isFinite(extendHours) || extendHours <= 0) return alert('extendHours must be a positive number');
    try {
      await extendExpiryV1({ shareId, extendHours: Math.trunc(extendHours), adminToken });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to extend expiry');
    }
  }

  async function setScope(shareId: string, scope: ShareScopeV1) {
    if (!canStaff) return;
    try {
      await setScopeV1({ shareId, scope, adminToken });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update scope');
    }
  }

  async function createReplacement(s: ShareLinkMetaV1) {
    if (!canStaff) return;
    try {
      const res = await createShareV1({
        projectId: s.projectId,
        revisionId: s.revisionId,
        scope: s.scope,
        expiresInHours: 168,
        note: s.note ?? null,
        adminToken,
      });
      setNewLink(String(res.shareUrl || ''));
      setNewLinkOpen(true);
      void copy(String(res.shareUrl || ''));
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create replacement share');
    }
  }

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => {}} />;
  }

  if (!canStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">Access denied</div>
              <div className="text-sm text-gray-600">You need staff (editor/admin) permissions.</div>
            </div>
          </div>
          <button onClick={() => navigate('/')} className="mt-4 w-full px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/reports')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Shares Admin (v1)</h1>
              <p className="text-sm text-gray-500">Manage, revoke, extend, scope; view access ledger</p>
            </div>
          </div>
          <button
            onClick={() => refresh()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-300 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            disabled={busy}
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <form
            className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setQApplied(qInput.trim());
            }}
          >
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Search q (projectId, revisionId, note substring)…"
              />
            </div>
            <button type="submit" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">
              Search
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              onClick={() => {
                setQInput('');
                setQApplied('');
              }}
            >
              Clear
            </button>
          </form>

          {error ? <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">{error}</div> : null}

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">
                Shares <span className="text-gray-500 font-normal">({sharesSorted.length})</span>
              </div>
              {busy ? <div className="text-xs text-gray-500">Loading…</div> : null}
            </div>
            <div className="overflow-auto">
              <table className="min-w-[1200px] w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Created</th>
                    <th className="text-left font-semibold px-4 py-3">Project</th>
                    <th className="text-left font-semibold px-4 py-3">Revision</th>
                    <th className="text-left font-semibold px-4 py-3">Scope</th>
                    <th className="text-left font-semibold px-4 py-3">Expires</th>
                    <th className="text-left font-semibold px-4 py-3">Revoked</th>
                    <th className="text-right font-semibold px-4 py-3">Access</th>
                    <th className="text-left font-semibold px-4 py-3">Last access</th>
                    <th className="text-left font-semibold px-4 py-3">Note</th>
                    <th className="text-left font-semibold px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sharesSorted.map((s) => {
                    const revoked = !!s.revokedAtIso;
                    const expired = isExpired(s.expiresAtIso);
                    return (
                      <tr key={s.shareId} className={revoked ? 'bg-gray-50' : expired ? 'bg-amber-50' : 'bg-white'}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{fmtIsoShort(s.createdAtIso)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{s.projectId}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{s.revisionId}</td>
                        <td className="px-4 py-3">
                          <select
                            className="px-2 py-1 border border-gray-300 rounded-lg text-xs font-semibold bg-white"
                            value={s.scope}
                            onChange={(e) => setScope(s.shareId, e.target.value as ShareScopeV1)}
                            disabled={revoked}
                          >
                            <option value="VIEW">VIEW</option>
                            <option value="DOWNLOAD">DOWNLOAD</option>
                            <option value="BOTH">BOTH</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">
                          <span className={expired ? 'text-amber-900 font-semibold' : ''}>{fmtIsoShort(s.expiresAtIso)}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{fmtIsoShort(s.revokedAtIso)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-gray-700">{String(s.accessCount ?? 0)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{fmtIsoShort(s.lastAccessAtIso)}</td>
                        <td className="px-4 py-3 max-w-[240px] truncate text-gray-700">{String(s.note || '') || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-gray-300 text-xs font-semibold text-gray-900 hover:bg-gray-50"
                              onClick={() => openAudit(s.shareId)}
                            >
                              Audit
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-gray-300 text-xs font-semibold text-gray-900 hover:bg-gray-50"
                              onClick={() => {
                                const url = `/reports/revisions/${encodeURIComponent(s.revisionId)}?projectId=${encodeURIComponent(s.projectId)}`;
                                window.open(url, '_blank', 'noreferrer');
                              }}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Revision
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-gray-300 text-xs font-semibold text-gray-900 hover:bg-gray-50"
                              onClick={() => createReplacement(s)}
                            >
                              <ClipboardCopy className="w-3.5 h-3.5" />
                              Create replacement
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-gray-300 text-xs font-semibold text-gray-900 hover:bg-gray-50"
                              onClick={() => extendExpiry(s.shareId)}
                              disabled={revoked}
                            >
                              Extend expiry
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                              onClick={() => revoke(s.shareId)}
                              disabled={revoked}
                            >
                              Revoke
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!sharesSorted.length && !busy ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                        No shares found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {auditOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setAuditOpen(false)}>
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-gray-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">Audit log</div>
                <div className="text-xs text-gray-500 font-mono">{auditShare?.shareId || '—'}</div>
              </div>
              <button className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200" onClick={() => setAuditOpen(false)}>
                Close
              </button>
            </div>
            <div className="p-5">
              {auditBusy ? (
                <div className="text-sm text-gray-600">Loading…</div>
              ) : auditError ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{auditError}</div>
              ) : auditShare ? (
                <div className="space-y-3">
                  <div className="text-xs text-gray-600">
                    project={auditShare.projectId} • revision={auditShare.revisionId} • scope={auditShare.scope}
                  </div>
                  <div className="max-h-[55vh] overflow-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="text-left font-semibold px-3 py-2">Type</th>
                          <th className="text-left font-semibold px-3 py-2">At</th>
                          <th className="text-left font-semibold px-3 py-2">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(auditShare.events || []).map((ev, idx) => {
                          const at = (ev as any).atIso || (ev as any).createdAtIso || '';
                          const details =
                            ev.type === 'CREATED'
                              ? `scope=${ev.scope} expires=${String(ev.expiresAtIso || '—')}`
                              : ev.type === 'ACCESSED'
                                ? `uaHash=${String(ev.userAgentHash || '—')} ipHash=${String(ev.ipHash || '—')}`
                                : ev.type === 'EXPIRY_EXTENDED'
                                  ? `newExpires=${ev.newExpiresAtIso}`
                                  : ev.type === 'SCOPE_CHANGED'
                                    ? `newScope=${ev.newScope}`
                                    : '';
                          return (
                            <tr key={idx}>
                              <td className="px-3 py-2 font-semibold text-gray-900">{ev.type}</td>
                              <td className="px-3 py-2 font-mono text-gray-700">{fmtIsoShort(String(at))}</td>
                              <td className="px-3 py-2 font-mono text-gray-700 break-all">{details || '—'}</td>
                            </tr>
                          );
                        })}
                        {!auditShare.events?.length ? (
                          <tr>
                            <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                              No events.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">No data.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {newLinkOpen ? (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center p-4"
          onClick={() => {
            setNewLinkOpen(false);
            setNewLink('');
          }}
        >
          <div className="w-full max-w-xl bg-white rounded-2xl border border-gray-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Replacement share link</div>
              <button
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
                onClick={() => {
                  setNewLinkOpen(false);
                  setNewLink('');
                }}
              >
                Close
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-sm text-gray-600">
                Token plaintext is not stored (by design). This is the new link; copy it now.
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-3">
                <div className="font-mono text-xs text-gray-900 break-all">{newLink || '—'}</div>
                <button
                  className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                  onClick={() => copy(newLink)}
                  disabled={!newLink}
                >
                  <ClipboardCopy className="w-4 h-4" />
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

