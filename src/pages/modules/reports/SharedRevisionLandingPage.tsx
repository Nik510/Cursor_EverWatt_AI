import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Download, AlertTriangle, Info, Link as LinkIcon } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { ExternalShareLayout } from '../../../components/reports/ExternalShareLayout';
import { getSharedRevisionMetaV1, verifySharedRevisionPasswordV1, type GetSharedRevisionMetaV1Response } from '../../../shared/api/shareRevisionsV1';

function parseFilenameFromContentDisposition(cd: string | null): string | null {
  const raw = String(cd || '').trim();
  if (!raw) return null;
  const m = raw.match(/filename="([^"]+)"/i);
  if (m && m[1]) return m[1];
  return null;
}

async function fetchWithShareToken(url: string, token: string): Promise<Response> {
  return await fetch(url, { headers: { Authorization: `Share ${token}` }, credentials: 'same-origin' });
}

async function downloadWithShareToken(args: { url: string; token: string; fallbackFilename: string }): Promise<void> {
  const res = await fetchWithShareToken(args.url, args.token);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const filename = parseFilenameFromContentDisposition(res.headers.get('content-disposition')) || args.fallbackFilename;
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function openHtmlInNewTab(args: { url: string; token: string }): Promise<void> {
  const res = await fetchWithShareToken(args.url, args.token);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Failed to load HTML (${res.status})`);
  }
  const html = await res.text();
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) throw new Error('Popup blocked (allow popups to view HTML)');
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export const SharedRevisionLandingPage: React.FC = () => {
  const params = useParams();
  const token = String(params.token || '').trim();
  const embed = useMemo(() => new URLSearchParams(window.location.search).get('embed') === '1', []);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GetSharedRevisionMetaV1Response | null>(null);

  const [pw, setPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const warningsBadge = useMemo(() => {
    const w = data?.revision?.warningsSummary;
    if (!w) return { label: 'No warnings summary', tone: 'gray' as const };
    const total = Number(w.engineWarningsCount || 0) + Number(w.missingInfoCount || 0);
    if (total <= 0) return { label: 'No warnings', tone: 'green' as const };
    return { label: `${total} warnings`, tone: 'amber' as const };
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    if (!token) return;
    setBusy(true);
    setError(null);
    setData(null);
    void getSharedRevisionMetaV1({ token })
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load shared revision');
      })
      .finally(() => {
        if (cancelled) return;
        setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const badgeClass =
    warningsBadge.tone === 'green'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : warningsBadge.tone === 'amber'
        ? 'bg-amber-50 text-amber-900 border-amber-200'
        : 'bg-gray-50 text-gray-800 border-gray-200';

  const links = data?.links || null;
  const revision = data?.revision || null;
  const share = data?.share || null;

  return (
    <ExternalShareLayout
      embed={embed}
      title={embed ? undefined : 'Shared revision'}
      subtitle={embed ? undefined : revision?.revisionId || '—'}
      headerRight={
        embed ? null : (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${badgeClass}`}>
            {warningsBadge.tone === 'amber' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
            {warningsBadge.label}
          </div>
        )
      }
    >
      <div className={embed ? 'max-w-none' : 'max-w-3xl mx-auto space-y-4'}>
          {!token ? (
            <div className="p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-700">Missing token.</div>
          ) : busy ? (
            <div className="p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-600">Loading…</div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">{error}</div>
          ) : data && revision && links && share ? (
            <>
              {share.requiresPassword && !share.passwordVerified ? (
                <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center flex-none">
                      <LinkIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">Password required</div>
                      <div className="text-sm text-gray-600 mt-1">This shared snapshot is password-protected.</div>
                      {share.passwordHint ? <div className="text-xs text-gray-500 mt-1">Hint: {share.passwordHint}</div> : null}
                    </div>
                  </div>

                  {pwError ? <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{pwError}</div> : null}

                  <form
                    className="flex flex-col sm:flex-row gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setPwError(null);
                      setPwBusy(true);
                      void verifySharedRevisionPasswordV1({ token, password: pw })
                        .then(() => getSharedRevisionMetaV1({ token }))
                        .then((res) => {
                          setData(res);
                          setPw('');
                        })
                        .catch((e2) => setPwError(e2 instanceof Error ? e2.message : 'Invalid credentials'))
                        .finally(() => setPwBusy(false));
                    }}
                  >
                    <input
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter password"
                      disabled={pwBusy}
                    />
                    <button type="submit" className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50" disabled={pwBusy}>
                      {pwBusy ? 'Checking…' : 'Unlock'}
                    </button>
                  </form>
                </div>
              ) : null}

              <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{String(revision.reportType || 'UNKNOWN')}</div>
                    <div className="text-xs text-gray-600 font-mono mt-1 truncate">
                      scope={share.scope} • createdAt={String(revision.createdAtIso || '').slice(0, 19)}
                      {revision.runId ? ` • run=${String(revision.runId).slice(0, 12)}…` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {links.htmlUrl ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-300 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                        onClick={() => openHtmlInNewTab({ url: links.htmlUrl!, token }).catch((e) => setError(e instanceof Error ? e.message : 'Failed to open HTML'))}
                      >
                        <FileText className="w-4 h-4" />
                        View HTML
                      </button>
                    ) : null}
                    {links.pdfUrl ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                        onClick={() =>
                          downloadWithShareToken({ url: links.pdfUrl!, token, fallbackFilename: 'EverWatt_Report.pdf' }).catch((e) =>
                            setError(e instanceof Error ? e.message : 'Failed to download PDF'),
                          )
                        }
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {links.jsonUrl ? (
                    <button
                      type="button"
                      className="text-sm font-semibold text-blue-700 hover:underline"
                      onClick={() =>
                        downloadWithShareToken({ url: links.jsonUrl!, token, fallbackFilename: 'EverWatt_Pack.json' }).catch((e) =>
                          setError(e instanceof Error ? e.message : 'Failed to download JSON'),
                        )
                      }
                    >
                      Download JSON
                    </button>
                  ) : null}
                  {links.bundleZipUrl ? (
                    <>
                      <span className="text-gray-300">•</span>
                      <button
                        type="button"
                        className="text-sm font-semibold text-blue-700 hover:underline"
                        onClick={() =>
                          downloadWithShareToken({ url: links.bundleZipUrl!, token, fallbackFilename: 'EverWatt_Bundle.zip' }).catch((e) =>
                            setError(e instanceof Error ? e.message : 'Failed to download bundle'),
                          )
                        }
                      >
                        Download bundle (.zip)
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {embed ? null : (
                <div className="p-4 bg-white border border-gray-200 rounded-xl">
                <div className="text-sm font-semibold text-gray-900">Provenance</div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="text-xs font-semibold text-gray-700">revisionId</div>
                    <div className="text-xs font-mono text-gray-900 mt-1 break-all">{String(revision.revisionId || '—')}</div>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="text-xs font-semibold text-gray-700">runId</div>
                    <div className="text-xs font-mono text-gray-900 mt-1 break-all">{String(revision.runId || '—')}</div>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="text-xs font-semibold text-gray-700">wizardOutputHash</div>
                    <div className="text-xs font-mono text-gray-900 mt-1 break-all">{String(revision.wizardOutputHash || '—')}</div>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="text-xs font-semibold text-gray-700">expiresAtIso</div>
                    <div className="text-xs font-mono text-gray-900 mt-1 break-all">{String(share.expiresAtIso || '—')}</div>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="text-xs font-semibold text-gray-700">engineVersions</div>
                  <div className="text-xs font-mono text-gray-900 mt-1 space-y-1">
                    {revision.engineVersions && Object.keys(revision.engineVersions).length ? (
                      Object.keys(revision.engineVersions)
                        .sort()
                        .map((k) => (
                          <div key={k} className="break-all">
                            {k}={String((revision.engineVersions as any)[k])}
                          </div>
                        ))
                    ) : (
                      <div>—</div>
                    )}
                  </div>
                </div>
              </div>
              )}
            </>
          ) : (
            <div className="p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-600">No data.</div>
          )}
      </div>
    </ExternalShareLayout>
  );
};

