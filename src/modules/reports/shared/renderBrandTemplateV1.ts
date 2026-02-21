type Kv = { k: string; v: string };

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderFooterKv(lines: Kv[]): string {
  const rows = (Array.isArray(lines) ? lines : [])
    .filter((x) => x && typeof x === 'object')
    .map((x) => ({ k: String((x as any).k || '').trim(), v: String((x as any).v || '').trim() }))
    .filter((x) => x.k && x.v)
    .sort((a, b) => a.k.localeCompare(b.k));
  if (!rows.length) return '';
  return `<div class="ewFooterKv">${rows.map((r) => `<div><span class="k">${escapeHtml(r.k)}</span>=<span class="v">${escapeHtml(r.v)}</span></div>`).join('')}</div>`;
}

export function renderBrandTemplateV1(args: {
  title: string;
  project?: { id?: string; name?: string };
  revision?: { id?: string; reportType?: string; createdAtIso?: string };
  generatedAtIso?: string | null;
  bodyHtml: string;
  provenanceFooterLines?: Kv[];
  extraCss?: string;
}): string {
  const title = String(args.title || '').trim() || 'EverWatt Report';
  const projectName = String(args.project?.name || '').trim();
  const projectId = String(args.project?.id || '').trim();
  const revisionId = String(args.revision?.id || '').trim();
  const reportType = String(args.revision?.reportType || '').trim();
  const createdAtIso = String(args.revision?.createdAtIso || '').trim();
  const generatedAtIso = String(args.generatedAtIso || '').trim() || createdAtIso;

  const metaLeft = [projectName ? projectName : '', projectId ? `projectId=${projectId}` : ''].filter(Boolean).join(' • ');
  const metaRight = [
    reportType ? reportType : '',
    revisionId ? `revisionId=${revisionId}` : '',
    generatedAtIso ? `generatedAtIso=${generatedAtIso}` : createdAtIso ? `createdAtIso=${createdAtIso}` : '',
  ]
    .filter(Boolean)
    .join(' • ');

  const bodyHtml = String(args.bodyHtml || '');
  const extraCss = String(args.extraCss || '').trim();

  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `<meta charset="utf-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `<title>${escapeHtml(title)}</title>`,
    `<style>`,
    `  :root { --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; --sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; --ink:#0f172a; --muted:#64748b; --border:#e2e8f0; --panel:#f8fafc; --brand:#0f172a; }`,
    `  body { margin:0; font-family: var(--sans); background: #ffffff; color: var(--ink); }`,
    `  .ewWrap { max-width: 1040px; margin: 0 auto; padding: 24px 18px 28px; }`,
    `  .ewHdr { display:flex; justify-content: space-between; gap: 16px; align-items: flex-start; padding-bottom: 14px; border-bottom: 1px solid var(--border); }`,
    `  .ewBrand { display:flex; gap: 12px; align-items: center; }`,
    `  .ewMark { width: 40px; height: 40px; border-radius: 12px; background: var(--brand); color: #fff; display:flex; align-items:center; justify-content:center; font-weight: 900; letter-spacing: -0.02em; }`,
    `  .ewBrandText { line-height: 1.15; }`,
    `  .ewBrandName { font-weight: 900; color: var(--brand); letter-spacing: -0.02em; }`,
    `  .ewBrandSub { font-size: 12px; color: var(--muted); margin-top: 2px; }`,
    `  .ewTitle { margin-top: 12px; font-size: 18px; font-weight: 900; letter-spacing: -0.01em; }`,
    `  .ewMeta { font-family: var(--mono); font-size: 12px; color: #334155; margin-top: 6px; }`,
    `  .pill { display:inline-block; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border); background: var(--panel); font-family: var(--mono); font-size: 11px; color:#334155; }`,
    `  .grid { display:grid; grid-template-columns: 1fr; gap: 14px; margin-top: 16px; }`,
    `  .card { border: 1px solid var(--border); border-radius: 14px; overflow:hidden; }`,
    `  .cardTitle { padding: 10px 12px; background: var(--panel); border-bottom: 1px solid var(--border); font-size: 12px; font-weight: 900; }`,
    `  .cardBody { padding: 12px; }`,
    `  .muted { color: var(--muted); font-size: 12px; }`,
    `  table.kv { width:100%; border-collapse: collapse; }`,
    `  table.kv td { padding: 6px 8px; border-bottom: 1px solid var(--border); font-size: 12px; }`,
    `  table.kv td.k { width: 260px; color:#334155; font-family: var(--mono); }`,
    `  table.kv td.v { color: var(--ink); font-family: var(--mono); }`,
    `  pre { margin:0; padding: 12px; font-family: var(--mono); font-size: 12px; line-height: 1.45; overflow:auto; background: #0b1020; color: #e2e8f0; border-radius: 12px; }`,
    `  ul { margin: 0; padding-left: 18px; }`,
    `  li { margin: 4px 0; }`,
    `  .ewFooter { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border); }`,
    `  .ewFooterLine { font-family: var(--mono); font-size: 11px; color: #475569; }`,
    `  .ewFooterKv { margin-top: 6px; font-family: var(--mono); font-size: 11px; color:#334155; display:grid; grid-template-columns: 1fr; gap: 2px; }`,
    `  .ewFooterKv .k { font-weight: 800; }`,
    `  .ewFooterKv .v { font-weight: 500; }`,
    extraCss ? `\n${extraCss}\n` : ``,
    `</style>`,
    `</head>`,
    `<body>`,
    `<div class="ewWrap">`,
    `<div class="ewHdr">`,
    `<div>`,
    `<div class="ewBrand"><div class="ewMark">EW</div><div class="ewBrandText"><div class="ewBrandName">EverWatt</div><div class="ewBrandSub">Snapshot-only report</div></div></div>`,
    `<div class="ewTitle">${escapeHtml(title)}</div>`,
    metaLeft ? `<div class="ewMeta">${escapeHtml(metaLeft)}</div>` : ``,
    metaRight ? `<div class="ewMeta">${escapeHtml(metaRight)}</div>` : ``,
    `</div>`,
    `<div class="pill">snapshot-only • deterministic</div>`,
    `</div>`,
    `<div class="ewBody">${bodyHtml}</div>`,
    `<div class="ewFooter">`,
    `<div class="ewFooterLine">Snapshot-only • no recomputation • generated artifacts are derived from stored snapshots.</div>`,
    `<div class="ewFooterLine">Provenance below; handle share links as secrets for sensitive customers.</div>`,
    renderFooterKv(args.provenanceFooterLines || []),
    `</div>`,
    `</div>`,
    `</body>`,
    `</html>`,
    ``,
  ].join('\n');
}

