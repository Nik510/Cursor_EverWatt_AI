import type { ExecutivePackJsonV1 } from './buildExecutivePackJsonV1';

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

function fmt(x: unknown): string {
  const s = String(x ?? '').trim();
  return s ? s : '—';
}

function fmtNum(x: unknown, digits = 0): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return '—';
  const isInt = Math.abs(n - Math.round(n)) < 1e-9;
  return isInt ? String(Math.round(n)) : n.toFixed(digits);
}

function card(title: string, body: string): string {
  return `<div class="card"><div class="cardTitle">${escapeHtml(title)}</div><div class="cardBody">${body}</div></div>`;
}

function pill(label: string): string {
  return `<span class="pill">${escapeHtml(label)}</span>`;
}

export function renderExecutivePackHtmlV1(args: {
  project: { id: string; name?: string };
  revision: { id: string; createdAt: string; title?: string; packJson: ExecutivePackJsonV1; packHash?: string };
}): string {
  const title = String(args.revision?.title || '').trim() || 'Executive Report Pack (v1)';
  const createdAt = String(args.revision?.createdAt || '').trim();
  const revId = String(args.revision?.id || '').trim();
  const hash = String((args.revision as any)?.packHash || '').trim();

  const pack = (args.revision?.packJson && typeof args.revision.packJson === 'object' ? args.revision.packJson : ({} as any)) as ExecutivePackJsonV1;
  const hdr: any = (pack as any)?.header || {};
  const linkage: any = (pack as any)?.linkage || {};

  const topFindings: string[] = Array.isArray((pack as any)?.topFindings) ? ((pack as any).topFindings as any[]).map((x) => String(x || '').trim()).filter(Boolean) : [];
  const nextActions: any[] = Array.isArray((pack as any)?.nextBestActions) ? (pack as any).nextBestActions : [];
  const requiredMissing: any[] = Array.isArray((pack as any)?.whatWeNeedToFinalize?.requiredMissingInfo) ? (pack as any).whatWeNeedToFinalize.requiredMissingInfo : [];
  const recommendedMissing: any[] = Array.isArray((pack as any)?.whatWeNeedToFinalize?.recommendedMissingInfo) ? (pack as any).whatWeNeedToFinalize.recommendedMissingInfo : [];

  const kpis: any = (pack as any)?.kpis || {};
  const dq: any = (pack as any)?.dataQuality || {};
  const batt: any = (pack as any)?.batteryFit || {};
  const savings: any = (pack as any)?.savings || {};

  const tiles = [
    `<div class="tiles">`,
    `<div class="tile"><div class="tLabel">Annual kWh (est.)</div><div class="tVal">${kpis?.annualKwhEstimate ? fmtNum(kpis.annualKwhEstimate.value, 0) : '—'}</div><div class="tSub">${kpis?.annualKwhEstimate?.confidenceTier ? `conf=${escapeHtml(fmt(kpis.annualKwhEstimate.confidenceTier))}` : 'snapshot-only'}</div></div>`,
    `<div class="tile"><div class="tLabel">Baseload (kW)</div><div class="tVal">${kpis?.baseloadKw ? fmtNum(kpis.baseloadKw.value, 2) : '—'}</div><div class="tSub">${kpis?.baseloadKw?.confidenceTier ? `conf=${escapeHtml(fmt(kpis.baseloadKw.confidenceTier))}` : 'snapshot-only'}</div></div>`,
    `<div class="tile"><div class="tLabel">Peak (kW)</div><div class="tVal">${kpis?.peakKw ? fmtNum(kpis.peakKw.value, 2) : '—'}</div><div class="tSub">snapshot-only</div></div>`,
    `<div class="tile"><div class="tLabel">Battery fit</div><div class="tVal">${escapeHtml(fmt(batt.decision))}</div><div class="tSub">${batt?.tierSource ? escapeHtml(fmt(batt.tierSource)) : 'derived from stored tiers'}</div></div>`,
    `<div class="tile"><div class="tLabel">Data quality</div><div class="tVal">${escapeHtml(fmt(dq.tier))}</div><div class="tSub">${Number.isFinite(Number(dq.score0to100)) ? `${escapeHtml(String(Math.trunc(Number(dq.score0to100))))}/100` : 'no wizard score'}</div></div>`,
    `<div class="tile"><div class="tLabel">Savings</div><div class="tVal">${escapeHtml(fmt(savings.status))}</div><div class="tSub">${
      savings?.annualUsd?.value !== undefined && savings?.annualUsd?.value !== null
        ? `$${escapeHtml(fmtNum(savings.annualUsd.value, 0))}/yr`
        : savings?.annualUsd?.min !== undefined && savings?.annualUsd?.max !== undefined
          ? `$${escapeHtml(fmtNum(savings.annualUsd.min, 0))}..$${escapeHtml(fmtNum(savings.annualUsd.max, 0))}/yr`
          : 'pending required inputs'
    }</div></div>`,
    `</div>`,
  ].join('\n');

  const findingsHtml = topFindings.length
    ? `<ul>${topFindings.slice(0, 6).map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`
    : `<div class="muted">(no findings available)</div>`;

  const missingHtml = [
    `<div class="twoCol">`,
    `<div>`,
    `<div class="subTitle">Required</div>`,
    requiredMissing.length ? `<ul>${requiredMissing.slice(0, 12).map((m: any) => `<li>${escapeHtml(fmt(m?.id))}</li>`).join('')}</ul>` : `<div class="muted">(none)</div>`,
    `</div>`,
    `<div>`,
    `<div class="subTitle">Recommended</div>`,
    recommendedMissing.length ? `<ul>${recommendedMissing.slice(0, 12).map((m: any) => `<li>${escapeHtml(fmt(m?.id))}</li>`).join('')}</ul>` : `<div class="muted">(none)</div>`,
    `</div>`,
    `</div>`,
  ].join('\n');

  const actionsHtml = nextActions.length
    ? `<ul>${nextActions
        .slice(0, 14)
        .map((a: any) => `<li><span class="mono">${escapeHtml(fmt(a?.actionId))}</span>${a?.label ? ` — ${escapeHtml(fmt(a.label))}` : ''}${a?.status ? ` <span class="tag">${escapeHtml(fmt(a.status))}</span>` : ''}</li>`)
        .join('')}</ul>`
    : `<div class="muted">(wizard output missing; next actions unavailable)</div>`;

  const metaLine = `projectId=${escapeHtml(fmt(hdr.projectId || args.project?.id))}${hdr.projectName ? ` • projectName=${escapeHtml(fmt(hdr.projectName))}` : ''}`;
  const linkLine = `runId=${escapeHtml(fmt(linkage.runId))} • revisionId=${escapeHtml(fmt(linkage.revisionId || revId))}${
    linkage.wizardOutputHash ? ` • wizardOutputHash=${escapeHtml(fmt(linkage.wizardOutputHash).slice(0, 12))}…` : ''
  }`;

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
    `  .card { border: 1px solid #e2e8f0; border-radius: 14px; overflow:hidden; }`,
    `  .cardTitle { padding: 10px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 800; }`,
    `  .cardBody { padding: 12px; }`,
    `  .muted { color:#64748b; font-size: 12px; }`,
    `  .mono { font-family: var(--mono); }`,
    `  .tiles { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }`,
    `  @media (min-width: 900px) { .tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); } }`,
    `  .tile { border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; background: #ffffff; }`,
    `  .tLabel { font-size: 11px; color:#64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }`,
    `  .tVal { margin-top: 6px; font-size: 20px; font-weight: 900; font-family: var(--mono); }`,
    `  .tSub { margin-top: 4px; font-size: 12px; color:#475569; font-family: var(--mono); }`,
    `  .twoCol { display:grid; grid-template-columns: 1fr; gap: 12px; }`,
    `  @media (min-width: 900px) { .twoCol { grid-template-columns: 1fr 1fr; } }`,
    `  .subTitle { font-size: 12px; font-weight: 900; margin-bottom: 6px; }`,
    `  ul { margin: 0; padding-left: 18px; }`,
    `  li { font-size: 13px; margin: 4px 0; }`,
    `  .tag { display:inline-block; margin-left: 8px; font-size: 11px; font-weight: 900; border: 1px solid #e2e8f0; border-radius: 999px; padding: 1px 8px; font-family: var(--mono); color:#334155; background:#f8fafc; }`,
    `  pre { margin:0; padding: 12px; font-family: var(--mono); font-size: 12px; line-height: 1.45; overflow:auto; background: #0b1020; color: #e2e8f0; border-radius: 12px; }`,
    `</style>`,
    `</head>`,
    `<body>`,
    `<div class="wrap">`,
    `<div class="hdr">`,
    `<div>`,
    `<h1>${escapeHtml(title)}</h1>`,
    `<div class="meta">${metaLine}</div>`,
    `<div class="meta">createdAt=${escapeHtml(createdAt)} • ${linkLine}${hash ? ` • hash=${escapeHtml(hash.slice(0, 12))}…` : ''}</div>`,
    `</div>`,
    `<div>${pill('snapshot-only')}${pill('deterministic')}${pill('provenance-first')}</div>`,
    `</div>`,
    `<div class="grid">`,
    `${card('KPIs', tiles)}`,
    `${card('Top findings (from stored wizard output)', findingsHtml)}`,
    `${card('What we need to finalize', missingHtml)}`,
    `${card('Next best actions (wizard requiredActions)', actionsHtml)}`,
    `${card('Pack JSON (stable key ordering)', `<pre>${escapeHtml(jsonPretty)}</pre>`)}`,
    `</div>`,
    `<div class="muted" style="margin-top:14px;">EverWatt • Executive Pack v1</div>`,
    `</div>`,
    `</body>`,
    `</html>`,
    ``,
  ].join('\n');
}

