import type { EngineeringPackJsonV1 } from './buildEngineeringPackJsonV1';
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

  const bodyHtml = [
    `<div class="grid">`,
    `<div class="card"><div class="cardTitle">Header</div><div class="cardBody">${renderKv(metaRows)}</div></div>`,
    `<div class="card"><div class="cardTitle">Provenance</div><div class="cardBody">${renderKv(provRows)}<div class="muted" style="margin-top:8px;font-family: var(--mono);">auditDrawerV1: ${escapeHtml(auditLine)}</div></div></div>`,
    `<div class="card"><div class="cardTitle">Warnings (engine)</div><div class="cardBody">${
      engineWarnings.length ? `<ul>${engineWarnings.slice(0, 60).map((w: any) => `<li>${escapeHtml(fmt(w?.code))}</li>`).join('')}</ul>` : `<div class="muted">(none)</div>`
    }</div></div>`,
    `<div class="card"><div class="cardTitle">Missing info</div><div class="cardBody">${
      missingInfo.length ? `<ul>${missingInfo.slice(0, 80).map((m: any) => `<li>${escapeHtml(fmt(m?.id || m?.description))}</li>`).join('')}</ul>` : `<div class="muted">(none)</div>`
    }</div></div>`,
    `<div class="card"><div class="cardTitle">Pack JSON (stable key ordering)</div><div class="cardBody"><pre>${escapeHtml(jsonPretty)}</pre></div></div>`,
    `</div>`,
  ].join('\n');

  const provenanceFooterLines = [
    { k: 'projectId', v: fmt(hdr.projectId || args.project?.id) },
    ...(hdr.projectName ? [{ k: 'projectName', v: fmt(hdr.projectName) }] : []),
    { k: 'revisionId', v: fmt(linkage.revisionId || revId) },
    { k: 'reportType', v: 'ENGINEERING_PACK_V1' },
    ...(hash ? [{ k: 'packHash', v: hash.slice(0, 12) + '…' }] : []),
  ];

  return renderBrandTemplateV1({
    title,
    project: { id: args.project?.id, name: args.project?.name },
    revision: { id: revId, reportType: 'ENGINEERING_PACK_V1', createdAtIso: createdAt },
    generatedAtIso: String((pack as any)?.generatedAtIso || '').trim() || null,
    bodyHtml,
    provenanceFooterLines,
  });
}

