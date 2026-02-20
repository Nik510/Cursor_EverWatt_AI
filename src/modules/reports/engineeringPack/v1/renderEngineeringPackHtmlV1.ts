import type { EngineeringPackJsonV1 } from './buildEngineeringPackJsonV1';

type StableJson = any;

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stableNormalize(value: StableJson): StableJson {
  const seen = new WeakSet<object>();
  const norm = (v: any): any => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map(norm);
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) out[k] = norm(v[k]);
    return out;
  };
  return norm(value);
}

function renderKv(rows: Array<{ k: string; v: string }>): string {
  return [
    `<table class="kv"><tbody>`,
    ...rows.map((r) => `<tr><td class="k">${escapeHtml(r.k)}</td><td class="v">${escapeHtml(r.v)}</td></tr>`),
    `</tbody></table>`,
  ].join('\n');
}

function fmt(x: unknown): string {
  const s = String(x ?? '').trim();
  return s ? s : '—';
}

export function renderEngineeringPackHtmlV1(args: {
  project: { id: string; name?: string };
  revision: { id: string; createdAt: string; title?: string; packJson: EngineeringPackJsonV1; packHash?: string };
}): string {
  const title = String(args.revision?.title || '').trim() || 'Engineering Report Pack (v1)';
  const createdAt = String(args.revision?.createdAt || '').trim();
  const revId = String(args.revision?.id || '').trim();
  const hash = String((args.revision as any)?.packHash || '').trim();

  const pack = (args.revision?.packJson && typeof args.revision.packJson === 'object' ? args.revision.packJson : ({} as any)) as EngineeringPackJsonV1;
  const hdr = (pack as any)?.header || {};
  const linkage = (pack as any)?.linkage || {};
  const prov = (pack as any)?.provenance || {};
  const snapIds = (prov as any)?.snapshotIds || {};
  const sections: any = (pack as any)?.sections || {};

  const metaRows: Array<{ k: string; v: string }> = [
    { k: 'projectId', v: fmt(hdr.projectId || args.project?.id) },
    ...(hdr.projectName ? [{ k: 'projectName', v: fmt(hdr.projectName) }] : []),
    ...(hdr.address ? [{ k: 'address', v: fmt(hdr.address) }] : []),
    ...(hdr.utilityTerritory ? [{ k: 'utilityTerritory', v: fmt(hdr.utilityTerritory) }] : []),
    ...(hdr.reportId ? [{ k: 'reportId', v: fmt(hdr.reportId) }] : []),
    { k: 'runId', v: fmt(linkage.runId) },
    { k: 'revisionId', v: fmt(linkage.revisionId || revId) },
    ...(linkage.wizardOutputHash ? [{ k: 'wizardOutputHash', v: fmt(linkage.wizardOutputHash) }] : []),
    { k: 'generatedAtIso', v: fmt((pack as any)?.generatedAtIso) },
  ];

  const warnings: any = sections?.warningsAndMissingInfo || {};
  const engineWarnings = Array.isArray(warnings.engineWarnings) ? warnings.engineWarnings : [];
  const missingInfo = Array.isArray(warnings.missingInfo) ? warnings.missingInfo : [];

  const audit: any = sections?.auditDrawer || {};
  const auditLine = audit?.present
    ? `present (v=${fmt(audit.version)} • moneyExplainers=${fmt(audit.moneyExplainersCount)})`
    : 'missing';

  const trace: any = sections?.analysisTrace || {};
  const ws: any = trace?.warningsSummary || {};

  const provRows: Array<{ k: string; v: string }> = [
    { k: 'tariffSnapshotId', v: fmt(snapIds.tariffSnapshotId) },
    { k: 'generationEnergySnapshotId', v: fmt(snapIds.generationEnergySnapshotId) },
    { k: 'addersSnapshotId', v: fmt(snapIds.addersSnapshotId) },
    { k: 'exitFeesSnapshotId', v: fmt(snapIds.exitFeesSnapshotId) },
    { k: 'engineWarningsCount', v: fmt(ws.engineWarningsCount) },
    { k: 'missingInfoCount', v: fmt(ws.missingInfoCount) },
  ];

  const jsonPretty = JSON.stringify(stableNormalize(pack), null, 2);

  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `<meta charset="utf-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `<title>${escapeHtml(title)}</title>`,
    `<style>`,
    `  :root { --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; --sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }`,
    `  body { margin:0; font-family: var(--sans); background: #ffffff; color: #0f172a; }`,
    `  .wrap { max-width: 1040px; margin: 0 auto; padding: 28px 20px; }`,
    `  .hdr { display:flex; justify-content: space-between; gap: 16px; align-items: flex-start; }`,
    `  h1 { font-size: 20px; margin:0; }`,
    `  .meta { font-family: var(--mono); font-size: 12px; color: #334155; }`,
    `  .pill { display:inline-block; padding: 2px 8px; border-radius: 999px; border: 1px solid #e2e8f0; background: #f8fafc; font-family: var(--mono); font-size: 11px; color:#334155; }`,
    `  .grid { display:grid; grid-template-columns: 1fr; gap: 14px; margin-top: 16px; }`,
    `  .card { border: 1px solid #e2e8f0; border-radius: 12px; overflow:hidden; }`,
    `  .cardTitle { padding: 10px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 800; }`,
    `  .cardBody { padding: 12px; }`,
    `  table.kv { width:100%; border-collapse: collapse; }`,
    `  table.kv td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }`,
    `  table.kv td.k { width: 260px; color:#334155; font-family: var(--mono); }`,
    `  table.kv td.v { color:#0f172a; font-family: var(--mono); }`,
    `  .muted { color:#64748b; font-size: 12px; }`,
    `  pre { margin:0; padding: 12px; font-family: var(--mono); font-size: 12px; line-height: 1.45; overflow:auto; background: #0b1020; color: #e2e8f0; border-radius: 12px; }`,
    `  ul { margin: 0; padding-left: 18px; }`,
    `  li { font-family: var(--mono); font-size: 12px; color:#0f172a; margin: 3px 0; }`,
    `</style>`,
    `</head>`,
    `<body>`,
    `<div class="wrap">`,
    `<div class="hdr">`,
    `<div>`,
    `<h1>${escapeHtml(title)}</h1>`,
    `<div class="meta">createdAt=${escapeHtml(createdAt)} • revisionId=${escapeHtml(revId)}${hash ? ` • hash=${escapeHtml(hash.slice(0, 12))}…` : ''}</div>`,
    `</div>`,
    `<div class="pill">snapshot-only • deterministic renderer</div>`,
    `</div>`,
    `<div class="grid">`,
    `<div class="card"><div class="cardTitle">Header</div><div class="cardBody">${renderKv(metaRows)}</div></div>`,
    `<div class="card"><div class="cardTitle">Provenance</div><div class="cardBody">${renderKv(provRows)}<div class="muted" style="margin-top:8px;font-family: var(--mono);">auditDrawerV1: ${escapeHtml(auditLine)}</div></div></div>`,
    `<div class="card"><div class="cardTitle">Warnings (engine)</div><div class="cardBody">${
      engineWarnings.length
        ? `<ul>${engineWarnings.slice(0, 60).map((w: any) => `<li>${escapeHtml(fmt(w?.code))}</li>`).join('')}</ul>`
        : `<div class="muted">(none)</div>`
    }</div></div>`,
    `<div class="card"><div class="cardTitle">Missing info</div><div class="cardBody">${
      missingInfo.length
        ? `<ul>${missingInfo.slice(0, 80).map((m: any) => `<li>${escapeHtml(fmt(m?.id || m?.description))}</li>`).join('')}</ul>`
        : `<div class="muted">(none)</div>`
    }</div></div>`,
    `<div class="card"><div class="cardTitle">Pack JSON (stable key ordering)</div><div class="cardBody"><pre>${escapeHtml(jsonPretty)}</pre></div></div>`,
    `</div>`,
    `<div class="muted" style="margin-top:14px;">EverWatt • Engineering Pack v1</div>`,
    `</div>`,
    `</body>`,
    `</html>`,
    ``,
  ].join('\n');
}

