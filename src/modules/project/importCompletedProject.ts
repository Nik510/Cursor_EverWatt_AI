import { z } from 'zod';
import { randomUUID } from 'crypto';
import type { CompletedProjectRecord, CompletedProjectAssetSummary, CompletedProjectMeasureRecord, CompletedProjectEvidenceRef } from './types';
import type { EvidenceRef, ProjectGraph } from '../../types/project-graph';
import type { ProjectRecord } from '../../types/change-order';
import { normalizeMeasure } from '../measures/normalizeMeasure';
import type { Measure } from '../measures/types';

function iso(s: unknown): string {
  const raw = String(s ?? '').trim();
  if (!raw) return '';
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toISOString();
}

const AssetSummarySchema = z
  .object({
    ahuCount: z.number().int().nonnegative().optional(),
    rtuCount: z.number().int().nonnegative().optional(),
    vavCount: z.number().int().nonnegative().optional(),
    fanCount: z.number().int().nonnegative().optional(),
    pumpCount: z.number().int().nonnegative().optional(),
    chillerCount: z.number().int().nonnegative().optional(),
    boilerCount: z.number().int().nonnegative().optional(),
    coolingTowerCount: z.number().int().nonnegative().optional(),
    panelCount: z.number().int().nonnegative().optional(),
    lightingFixtureCount: z.number().int().nonnegative().optional(),
    lightingControlCount: z.number().int().nonnegative().optional(),
    otherCount: z.number().int().nonnegative().optional(),
  })
  .strict();

const MeasureSchema = z
  .object({
    measureId: z.string().min(1),
    type: z.string().min(1),
    tags: z.array(z.string().min(1)).optional(),
    parameters: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    notes: z.string().min(1).optional(),
  })
  .strict();

const CanonicalMeasureSchema = z
  .object({
    measureType: z.string().min(1),
    label: z.string().min(1).optional(),
    tags: z.array(z.string().min(1)).optional(),
    parameters: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    affectedAssetIds: z.array(z.string().min(1)).optional(),
    affectedAssetTypes: z.array(z.string().min(1)).optional(),
  })
  .strict();

const OutcomesSchema = z
  .object({
    savingsKwh: z.number().optional().nullable(),
    savingsKw: z.number().optional().nullable(),
    savingsTherms: z.number().optional().nullable(),
    savingsUsd: z.number().optional().nullable(),
    costUsd: z.number().optional().nullable(),
    paybackYears: z.number().optional().nullable(),
  })
  .strict();

const RationaleSchema = z
  .object({
    summary: z.string().min(1),
    decisionTags: z.array(z.string().min(1)).optional(),
    assumptions: z
      .array(
        z
          .object({
            key: z.string().min(1),
            value: z.string().min(1),
            tags: z.array(z.string().min(1)).optional(),
          })
          .strict()
      )
      .optional(),
  })
  .strict();

const EvidenceSchema = z
  .object({
    refId: z.string().min(1),
    label: z.string().min(1).optional(),
    url: z.string().min(1).optional(),
    storageKey: z.string().min(1).optional(),
    notes: z.string().min(1).optional(),
  })
  .strict();

const CompletedProjectTemplateSchema = z
  .object({
    completedProjectId: z.string().min(1),
    orgId: z.string().min(1),
    createdAt: z.string().min(1),
    building: z
      .object({
        buildingType: z.string().min(1),
        sqft: z.number().optional().nullable(),
        climateZone: z.string().optional().nullable(),
        territory: z.string().optional().nullable(),
        operatingSchedule: z
          .object({
            bucket: z.enum(['24_7', 'business_hours', 'mixed', 'unknown']),
            notes: z.string().optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    assetsBefore: AssetSummarySchema.optional(),
    assetsAfter: AssetSummarySchema.optional(),
    // Accept either canonical measuresImplemented or legacy measures[] (or both).
    measuresImplemented: z.array(CanonicalMeasureSchema).optional(),
    measures: z.array(MeasureSchema).optional(),
    outcomes: OutcomesSchema.optional(),
    rationale: RationaleSchema.optional(),
    evidenceRefs: z.array(EvidenceSchema).optional(),
    source: z
      .object({
        kind: z.enum(['json_template', 'csv', 'doc_export', 'other']),
        sourceKey: z.string().min(1).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const a = Array.isArray((val as any).measuresImplemented) ? (val as any).measuresImplemented : [];
    const b = Array.isArray((val as any).measures) ? (val as any).measures : [];
    if (a.length === 0 && b.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['measuresImplemented'],
        message: 'Provide at least one measure (measuresImplemented[] preferred, or legacy measures[])',
      });
    }
  });

function normalizeAllMeasures(args: { measuresImplemented?: unknown[]; legacyMeasures?: CompletedProjectMeasureRecord[] }): Measure[] {
  const out: Measure[] = [];

  if (Array.isArray(args.measuresImplemented) && args.measuresImplemented.length) {
    for (const m of args.measuresImplemented) out.push(normalizeMeasure(m));
  }

  if (Array.isArray(args.legacyMeasures) && args.legacyMeasures.length) {
    for (const m of args.legacyMeasures) {
      out.push(
        normalizeMeasure({
          type: m.type,
          label: m.type,
          tags: m.tags,
          parameters: m.parameters,
        })
      );
    }
  }

  return out;
}

function formatZodIssuesMissingFields(issues: z.ZodIssue[]): string[] {
  const out: string[] = [];
  for (const i of issues) {
    const path = i.path.join('.');
    if (i.code === 'invalid_type' && (i as any).received === 'undefined') {
      out.push(path || '(root)');
      continue;
    }
    // For strict schema failures, surface the offending path too.
    if (i.code === 'unrecognized_keys') {
      out.push(`${path || '(root)'} (unrecognized keys: ${String((i as any).keys || []).trim()})`);
      continue;
    }
    out.push(`${path || '(root)'}: ${i.message}`);
  }
  return [...new Set(out)];
}

export type ImportCompletedProjectResult =
  | { ok: true; record: CompletedProjectRecord; warnings: string[] }
  | { ok: false; errors: string[] };

export function importCompletedProjectFromJson(args: {
  input: unknown;
  importedAtIso: string;
}): ImportCompletedProjectResult {
  const parsed = CompletedProjectTemplateSchema.safeParse(args.input);
  if (!parsed.success) {
    return { ok: false, errors: formatZodIssuesMissingFields(parsed.error.issues) };
  }

  const raw = parsed.data;
  const createdAt = iso(raw.createdAt);
  if (!createdAt) return { ok: false, errors: ['createdAt: invalid date (expected ISO string)'] };

  const record: CompletedProjectRecord = {
    completedProjectId: raw.completedProjectId,
    orgId: raw.orgId,
    createdAt,
    importedAt: args.importedAtIso,
    archivedProjectId: raw.completedProjectId,
    building: {
      buildingType: raw.building.buildingType,
      sqft: raw.building.sqft ?? null,
      climateZone: raw.building.climateZone ?? null,
      territory: raw.building.territory ?? null,
      operatingSchedule: raw.building.operatingSchedule
        ? { bucket: raw.building.operatingSchedule.bucket, notes: raw.building.operatingSchedule.notes }
        : { bucket: 'unknown' },
    },
    assetsBefore: raw.assetsBefore as CompletedProjectAssetSummary | undefined,
    assetsAfter: raw.assetsAfter as CompletedProjectAssetSummary | undefined,
    measuresImplemented: normalizeAllMeasures({
      measuresImplemented: (raw as any).measuresImplemented as any[] | undefined,
      legacyMeasures: ((raw as any).measures as CompletedProjectMeasureRecord[] | undefined) || [],
    }),
    // preserve legacy payload if provided (debug/back-compat)
    ...(Array.isArray((raw as any).measures) ? { measures: (raw as any).measures as CompletedProjectMeasureRecord[] } : {}),
    outcomes: raw.outcomes,
    rationale: raw.rationale,
    evidenceRefs: raw.evidenceRefs as CompletedProjectEvidenceRef[] | undefined,
    source: raw.source,
  };

  const warnings: string[] = [];
  if (!record.assetsBefore && !record.assetsAfter) warnings.push('assetsBefore/assetsAfter not provided; inventory similarity will be weaker');
  if (!record.evidenceRefs?.length) warnings.push('evidenceRefs is empty; provenance will be limited');

  return { ok: true, record, warnings };
}

function firstEvidenceAsProjectGraphRef(evidenceRefs: CompletedProjectEvidenceRef[] | undefined): EvidenceRef {
  const e = (Array.isArray(evidenceRefs) ? evidenceRefs : [])[0];
  if (!e) return { fileId: 'unknown' };
  return {
    fileId: String(e.refId),
    storageKey: e.storageKey ? String(e.storageKey) : undefined,
    snippetText: e.url ? String(e.url) : e.label ? String(e.label) : undefined,
  } as any;
}

function addAggregateAssetNodes(args: {
  counts: CompletedProjectAssetSummary | undefined;
  evidence: EvidenceRef;
  nowIso: string;
}): ProjectGraph['assets'] {
  const c = args.counts || {};
  const nodes: any[] = [];
  const add = (type: string, qty: number) => {
    if (!qty || qty <= 0) return;
    nodes.push({
      kind: 'asset',
      id: randomUUID(),
      assetTag: `${String(type).toUpperCase()}-COUNT`,
      type,
      name: `${String(type).toUpperCase()} inventory (aggregate)`,
      tags: ['aggregateCount', 'importedCompletedProject'],
      baseline: {
        properties: { qty: String(qty), unit: 'count' },
        evidenceRefs: [args.evidence],
      },
      evidenceRefs: [args.evidence],
      status: 'confirmed',
      createdAt: args.nowIso,
      updatedAt: args.nowIso,
    });
  };

  add('ahu', Number(c.ahuCount || 0));
  add('rtu', Number(c.rtuCount || 0));
  add('vav', Number(c.vavCount || 0));
  add('fan', Number(c.fanCount || 0));
  add('pump', Number(c.pumpCount || 0));
  add('chiller', Number(c.chillerCount || 0));
  add('boiler', Number(c.boilerCount || 0));
  add('coolingTower', Number(c.coolingTowerCount || 0));
  add('panel', Number(c.panelCount || 0));
  add('lightingFixture', Number(c.lightingFixtureCount || 0));
  add('lightingControl', Number(c.lightingControlCount || 0));
  add('other', Number(c.otherCount || 0));

  return nodes as any;
}

export function buildArchivedProjectFromCompletedRecord(args: {
  record: CompletedProjectRecord;
  archivedProjectId?: string;
  nowIso: string;
}): ProjectRecord {
  const r = args.record;
  const evidence = firstEvidenceAsProjectGraphRef(r.evidenceRefs);
  const counts = r.assetsAfter || r.assetsBefore;
  const assets = addAggregateAssetNodes({ counts, evidence, nowIso: args.nowIso });

  const measures = (Array.isArray(r.measures) ? r.measures : []).map((m) => ({
    kind: 'measure',
    id: String(m.measureId || '').trim() || randomUUID(),
    name: String(m.type || '').trim() || 'Imported measure',
    category: 'completed_project_import',
    evidenceRefs: [evidence],
    status: 'confirmed',
    createdAt: args.nowIso,
    updatedAt: args.nowIso,
  }));

  const canonicalMeasures = (Array.isArray((r as any).measuresImplemented) ? ((r as any).measuresImplemented as Measure[]) : []).map((m) => ({
    kind: 'measure',
    id: randomUUID(),
    name: String(m.label || m.measureType).trim() || 'Imported measure',
    category: 'completed_project_import',
    evidenceRefs: [evidence],
    status: 'confirmed',
    createdAt: args.nowIso,
    updatedAt: args.nowIso,
  }));

  const graph: ProjectGraph = {
    assets: assets as any,
    measures: (canonicalMeasures.length ? canonicalMeasures : measures) as any,
    inbox: [],
    inboxHistory: [],
    bomItems: [],
    decisions: r.rationale?.summary
      ? [
          {
            id: randomUUID(),
            date: args.nowIso,
            disposition: 'accepted',
            decisionType: 'design',
            context: `importedCompletedProjectId=${r.completedProjectId}`,
            rationale: r.rationale.summary,
            evidenceRefs: [evidence],
          },
        ]
      : [],
  };

  const vaultFiles =
    (Array.isArray(r.evidenceRefs) ? r.evidenceRefs : []).map((e) => ({
      id: String(e.refId),
      filename: String(e.label || e.url || e.refId),
      contentType: 'text/plain',
      kind: 'unknown' as const,
      tags: ['importedEvidence', 'completedProject'],
      storageKey: e.storageKey ? String(e.storageKey) : undefined,
      storageUrl: e.url ? String(e.url) : undefined,
      uploadedAt: args.nowIso,
    })) || [];

  const archivedProjectId = args.archivedProjectId || r.completedProjectId;

  return {
    id: archivedProjectId,
    driveFolderLink: (r.evidenceRefs || []).find((x) => x?.url)?.url || '',
    customer: {
      projectNumber: `ARCH-${String(r.completedProjectId).slice(0, 8).toUpperCase()}`,
      projectName: `Archived: ${r.building.buildingType}`,
      companyName: 'Imported Completed Project',
      facilityName: `Completed Project ${String(r.completedProjectId).slice(0, 8).toUpperCase()}`,
      facilityType: r.building.buildingType,
      utilityCompany: r.building.territory || undefined,
    },
    vault: { files: vaultFiles as any },
    graph,
    decisionMemory: r.rationale?.assumptions?.length
      ? r.rationale.assumptions.map((a) => ({
          id: randomUUID(),
          title: `Assumption: ${a.key}`,
          note: a.value,
          createdAt: args.nowIso,
          updatedAt: args.nowIso,
          provenance: { completedProjectId: r.completedProjectId, tags: a.tags || [] },
        }))
      : [],
    createdAt: r.createdAt,
    updatedAt: args.nowIso,
    // Keep it out of active workflows; UI is expected to ignore unknown fields.
    ...(true ? ({ status: 'archived', archivedFromCompletedProjectId: r.completedProjectId } as any) : {}),
  };
}

