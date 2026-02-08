/**
 * Generate explainable, safe recommendations for a Project Builder project (v1).
 *
 * Usage:
 *   npx tsx scripts/generate-recommendations.ts --org <orgId> --project <projectId>
 *   npx tsx scripts/generate-recommendations.ts --org <orgId> --project <projectId> --dryRun true
 */

import { ensureDatabaseSchema, isDatabaseEnabled } from '../src/db/client';
import { getMemoryIndex, listCompletedProjects, upsertRecommendationSuggestion } from '../src/modules/memory/storage';
import { generateRecommendationsV1, assertMemoryIndexVersion } from '../src/modules/recommendations/generateRecommendations';
import { loadProjectForOrg, patchProjectForOrg } from '../src/modules/project/projectRepository';
import type { ProjectGraph } from '../src/types/project-graph';

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

function parseBool(s: string | undefined, fallback = false): boolean {
  const v = String(s ?? '').trim().toLowerCase();
  if (!v) return fallback;
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
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

  return {
    assets: canonAssets,
    measures: canonMeasures,
    inbox,
    inboxHistory,
    bomItems,
    decisions,
  } as any;
}

async function main() {
  const args = argMap(process.argv.slice(2));
  const orgId = String(args.org || '').trim();
  const projectId = String(args.project || '').trim();
  const dryRun = parseBool(args.dryRun, false);
  const topN = args.topN ? Number(args.topN) : undefined;

  if (!orgId) {
    console.error('Missing --org <orgId>');
    process.exit(2);
  }
  if (!projectId) {
    console.error('Missing --project <projectId>');
    process.exit(2);
  }

  if (isDatabaseEnabled()) await ensureDatabaseSchema();

  const [project, completed, index] = await Promise.all([
    loadProjectForOrg(orgId, projectId),
    listCompletedProjects(orgId),
    getMemoryIndex(orgId, 'v1'),
  ]);

  if (!project) {
    console.error('Project not found (or org mismatch).');
    process.exit(1);
  }
  if (!index) {
    console.error('Memory index not found. Run: npx tsx scripts/build-memory-index.ts --org <orgId>');
    process.exit(1);
  }
  const v = assertMemoryIndexVersion(index);
  if (!v.ok) {
    console.error(v.error);
    process.exit(1);
  }

  const nowIso = new Date().toISOString();
  const { suggestions, inboxItems } = generateRecommendationsV1({
    orgId,
    projectId,
    stateId: 'baseline',
    targetProject: project,
    memoryIndex: index,
    completedProjects: completed,
    topN,
    nowIso,
  });

  console.log('✅ Recommendations generated (preview)');
  console.log(`- projectId: ${projectId}`);
  console.log(`- suggestions: ${suggestions.length}`);
  for (const s of suggestions.slice(0, 10)) {
    console.log(
      `  - ${String(s.suggestedMeasure.label || s.suggestedMeasure.measureType)} (type=${s.suggestedMeasure.measureType} score=${s.score.toFixed(2)} conf=${s.confidence.toFixed(2)})`
    );
    console.log(`    playbook: alignment=${String((s as any).playbookAlignment || 'neutral')}${(s as any).playbookId ? ` id=${String((s as any).playbookId)}` : ''}`);
    const because = s.explain.because.map((b) => b.completedProjectId).join(', ');
    console.log(`    because: ${because || '(none)'}`);
    if (s.requiredInputsMissing.length) console.log(`    requires: ${s.requiredInputsMissing.join('; ')}`);
  }

  if (dryRun) {
    console.log('\nDry run: not writing to storage or project inbox.');
    return;
  }

  for (const s of suggestions) await upsertRecommendationSuggestion(s);

  const graph = canonicalizeGraphPhase1((project as any).graph || {});
  const existing = Array.isArray(graph.inbox) ? graph.inbox : [];
  const existingKeys = new Set(existing.map((it: any) => String(it?.sourceKey || it?.id || '').trim()).filter(Boolean));
  const toAdd = inboxItems.filter((it: any) => {
    const k = String(it?.sourceKey || '').trim();
    if (!k) return true;
    return !existingKeys.has(k);
  });

  const nextGraph = { ...graph, inbox: [...existing, ...toAdd] };
  await patchProjectForOrg(orgId, projectId, { graph: nextGraph });

  console.log('\n✅ Persisted');
  console.log(`- recommendations stored: ${suggestions.length}`);
  console.log(`- inbox items added: ${toAdd.length} (deduped=${inboxItems.length - toAdd.length})`);
  console.log(`\nStorage: ${isDatabaseEnabled() ? 'database + project store' : 'data/dev/* + data/projects/*'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

