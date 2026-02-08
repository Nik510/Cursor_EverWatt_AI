/**
 * Import an EverWattAuditExport v1 JSON file into a Project Builder project:
 * - validates + parses
 * - ingests evidence artifacts (file-based dev store)
 * - maps to Phase-1 inbox suggestions (never mutates assets/measures directly)
 * - creates evidence links from audit fields → inbox items
 *
 * Usage:
 *   npx tsx scripts/import-audit-export.ts --projectId <id> --file <export.json>
 *   npx tsx scripts/import-audit-export.ts --projectId <id> --file <export.json> --org <orgId>
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { isDatabaseEnabled } from '../src/db/client';
import { loadProjectForOrg, patchProjectForOrg } from '../src/modules/project/projectRepository';
import type { ProjectGraph } from '../src/types/project-graph';
import { parseAuditExport } from '../src/modules/audit/exchange/parseAuditExport';
import { mapAuditExportToProjectInbox } from '../src/modules/audit/exchange/mapToProjectInbox';
import { ingestEvidence } from '../src/modules/evidence/ingestEvidence';
import { linkEvidence } from '../src/modules/evidence/linkEvidence';

function argMap(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    out[k] = v;
  }
  return out;
}

function canonicalizeGraphPhase1(input: any): ProjectGraph {
  const g = input && typeof input === 'object' ? input : {};
  const assets = Array.isArray((g as any).assets) ? (g as any).assets : [];
  const measures = Array.isArray((g as any).measures) ? (g as any).measures : [];
  const inbox = Array.isArray((g as any).inbox) ? (g as any).inbox : [];
  const inboxHistory = Array.isArray((g as any).inboxHistory) ? (g as any).inboxHistory : [];
  const bomItems = Array.isArray((g as any).bomItems) ? (g as any).bomItems : [];
  const decisions = Array.isArray((g as any).decisions) ? (g as any).decisions : [];

  const canonAssets = assets.map((a: any) => {
    const obj = a && typeof a === 'object' ? a : {};
    if (!obj.kind) obj.kind = 'asset';
    return obj;
  });
  const canonMeasures = measures.map((m: any) => {
    const obj = m && typeof m === 'object' ? m : {};
    if (!obj.kind) obj.kind = 'measure';
    return obj;
  });

  return { assets: canonAssets, measures: canonMeasures, inbox, inboxHistory, bomItems, decisions } as any;
}

async function detectOrgIdFromFileProject(projectId: string): Promise<string | null> {
  if (isDatabaseEnabled()) return null;
  const fp = path.join(process.cwd(), 'data', 'projects', `${projectId}.json`);
  try {
    const raw = await readFile(fp, 'utf-8');
    const obj = JSON.parse(raw) as any;
    return obj?.userId ? String(obj.userId) : null;
  } catch {
    return null;
  }
}

async function main() {
  const args = argMap(process.argv.slice(2));
  const projectId = String(args.projectId || '').trim();
  const file = String(args.file || '').trim();
  const orgArg = String(args.org || '').trim();

  if (!projectId) {
    console.error('Missing --projectId <id>');
    process.exit(2);
  }
  if (!file) {
    console.error('Missing --file <export.json>');
    process.exit(2);
  }

  const orgId = orgArg || (await detectOrgIdFromFileProject(projectId)) || '';
  if (!orgId) {
    console.error('Unable to determine orgId. Provide --org <orgId>.');
    process.exit(2);
  }

  const fp = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const raw = await readFile(fp, 'utf-8');
  const json = JSON.parse(raw);
  const parsed = parseAuditExport(json);
  if (!parsed.ok) {
    console.error('Audit export validation failed:');
    for (const e of parsed.errors) console.error(`- ${e.jsonPath}: ${e.message}`);
    process.exit(1);
  }

  const project = await loadProjectForOrg(orgId, projectId);
  if (!project) {
    console.error('Project not found (or org mismatch).');
    process.exit(1);
  }

  const nowIso = new Date().toISOString();

  const { source, artifacts } = await ingestEvidence({ orgId, projectId, audit: parsed.export, nowIso });

  const graph = canonicalizeGraphPhase1((project as any).graph || {});
  const mapped = mapAuditExportToProjectInbox({ export: parsed.export, projectId, existingGraph: graph, nowIso });

  // Deduplicate by sourceKey
  const existing = Array.isArray(graph.inbox) ? graph.inbox : [];
  const existingKeys = new Set(existing.map((it: any) => String(it?.sourceKey || '').trim()).filter(Boolean));
  const toAdd = mapped.inboxItems.filter((it: any) => {
    const k = String(it?.sourceKey || '').trim();
    if (!k) return true;
    return !existingKeys.has(k);
  });

  const nextGraph = { ...graph, inbox: [...existing, ...toAdd] };
  await patchProjectForOrg(orgId, projectId, { graph: nextGraph });

  const linked = await linkEvidence({
    orgId,
    projectId,
    sourceId: source.sourceId,
    audit: parsed.export,
    inboxItems: toAdd,
    nowIso,
  });

  console.log('✅ Audit export imported (inbox-only)');
  console.log(`- orgId: ${orgId}`);
  console.log(`- projectId: ${projectId}`);
  console.log(`- artifacts ingested: ${artifacts.length}`);
  console.log(`- inbox items created: ${toAdd.length} (deduped=${mapped.inboxItems.length - toAdd.length})`);
  console.log(`- evidence links created: ${linked.links.length}`);
  if (parsed.warnings.length || mapped.warnings.length || linked.warnings.length) {
    console.log('\nWarnings:');
    for (const w of [...parsed.warnings, ...mapped.warnings, ...linked.warnings].slice(0, 20)) console.log(`- ${w}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

