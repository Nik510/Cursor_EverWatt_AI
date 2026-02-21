import type { ExecutivePackJsonV1 } from './buildExecutivePackJsonV1';
import { renderBrandTemplateV1 } from '../../shared/renderBrandTemplateV1';

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
  const lab: any = (pack as any)?.scenarioLabV1 || null;
  const verifierStatus = fmt((pack as any)?.verificationSummaryV1?.status || (pack as any)?.verifierResultV1?.status);
  const claimsStatus = fmt((pack as any)?.claimsPolicyV1?.status);

  const tiles = [
    `<div class="tiles">`,
    `<div class="tile"><div class="tLabel">Verifier</div><div class="tVal">${escapeHtml(verifierStatus)}</div><div class="tSub">snapshot-only</div></div>`,
    `<div class="tile"><div class="tLabel">Claims</div><div class="tVal">${escapeHtml(claimsStatus)}</div><div class="tSub">gating policy v1</div></div>`,
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

  const jsonPretty = JSON.stringify(stableNormalize(pack), null, 2);

  const scenarioLabHtml = (() => {
    if (!lab || typeof lab !== 'object') return `<div class="muted">(scenario lab unavailable)</div>`;
    const top: any[] = Array.isArray(lab?.topOpportunities) ? lab.topOpportunities : [];
    const blockedTitles: string[] = Array.isArray(lab?.blockedByData?.blockedTitles) ? lab.blockedByData.blockedTitles.map((x: any) => fmt(x)).filter(Boolean) : [];
    const requiredNext: string[] = Array.isArray(lab?.blockedByData?.requiredNextData) ? lab.blockedByData.requiredNextData.map((x: any) => fmt(x)).filter(Boolean) : [];
    const frontierCount = Number(lab?.frontierSummary?.pointCount) || 0;
    const topHtml = top.length
      ? `<ol>${top
          .slice(0, 3)
          .map((s: any) => `<li><span class="mono">${escapeHtml(fmt(s?.scenarioId))}</span> — ${escapeHtml(fmt(s?.title))}${s?.annualUsd !== null && s?.annualUsd !== undefined ? ` • $${escapeHtml(fmtNum(s.annualUsd, 0))}/yr` : ' • usd gated'}</li>`)
          .join('')}</ol>`
      : `<div class="muted">(no ranked opportunities)</div>`;
    const blockedHtml = blockedTitles.length ? `<ul>${blockedTitles.slice(0, 8).map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>` : `<div class="muted">(none)</div>`;
    const reqHtml = requiredNext.length ? `<div class="muted mono">requiredNextData: ${escapeHtml(requiredNext.slice(0, 12).join(' • '))}</div>` : '';
    return [
      `<div><div class="subTitle">Top 3 opportunities</div>${topHtml}</div>`,
      `<div style="margin-top:10px"><div class="subTitle">Opportunity frontier</div><div class="muted">frontierPoints=${escapeHtml(String(frontierCount))} (bounded)</div></div>`,
      `<div style="margin-top:10px"><div class="subTitle">Blocked by data</div>${blockedHtml}${reqHtml}</div>`,
    ].join('\n');
  })();

  const bodyHtml = [
    `<div class="grid">`,
    `${card('KPIs', tiles)}`,
    `${card('Top findings (from stored wizard output)', findingsHtml)}`,
    `${card('Scenario Lab v1 (snapshot-only)', scenarioLabHtml)}`,
    `${card('What we need to finalize', missingHtml)}`,
    `${card('Next best actions (wizard requiredActions)', actionsHtml)}`,
    `${card('Pack JSON (stable key ordering)', `<pre>${escapeHtml(jsonPretty)}</pre>`)}`,
    `</div>`,
  ].join('\n');

  const provenanceFooterLines = [
    { k: 'projectId', v: fmt(hdr.projectId || args.project?.id) },
    ...(hdr.projectName ? [{ k: 'projectName', v: fmt(hdr.projectName) }] : []),
    { k: 'revisionId', v: fmt(linkage.revisionId || revId) },
    { k: 'reportType', v: 'EXECUTIVE_PACK_V1' },
    ...(hash ? [{ k: 'packHash', v: hash.slice(0, 12) + '…' }] : []),
  ];

  const extraCss = [
    `  .mono { font-family: var(--mono); }`,
    `  .tiles { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }`,
    `  @media (min-width: 900px) { .tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); } }`,
    `  .tile { border: 1px solid var(--border); border-radius: 12px; padding: 10px 12px; background: #ffffff; }`,
    `  .tLabel { font-size: 11px; color: var(--muted); font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; }`,
    `  .tVal { margin-top: 6px; font-size: 20px; font-weight: 900; font-family: var(--mono); }`,
    `  .tSub { margin-top: 4px; font-size: 12px; color:#475569; font-family: var(--mono); }`,
    `  .twoCol { display:grid; grid-template-columns: 1fr; gap: 12px; }`,
    `  @media (min-width: 900px) { .twoCol { grid-template-columns: 1fr 1fr; } }`,
    `  .subTitle { font-size: 12px; font-weight: 900; margin-bottom: 6px; }`,
    `  li { font-size: 13px; margin: 4px 0; }`,
    `  .tag { display:inline-block; margin-left: 8px; font-size: 11px; font-weight: 900; border: 1px solid var(--border); border-radius: 999px; padding: 1px 8px; font-family: var(--mono); color:#334155; background: var(--panel); }`,
  ].join('\n');

  return renderBrandTemplateV1({
    title,
    project: { id: args.project?.id, name: args.project?.name },
    revision: { id: revId, reportType: 'EXECUTIVE_PACK_V1', createdAtIso: createdAt },
    generatedAtIso: String((pack as any)?.generatedAtIso || '').trim() || null,
    bodyHtml,
    provenanceFooterLines,
    extraCss,
  });
}

