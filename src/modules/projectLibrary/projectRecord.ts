import { z } from 'zod';

/**
 * Canonical normalized project record for the EverWatt Project Library.
 *
 * This schema is intentionally conservative and versioned so we can evolve safely.
 */

export const PROJECT_RECORD_SCHEMA_VERSION = 'project_record/v1' as const;

export const ProjectRecordSourceFileSchema = z.object({
  /** Path relative to the repo root (e.g. everwatt-project-library/raw/<slug>/file.pdf) */
  path: z.string().min(1),
  /** Role of the file for audit/retrieval (deterministic, human-curated) */
  role: z.enum(['summary', 'calc', 'trend', 'other']),
  /** SHA-256 of file bytes (hex) */
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  /** File size in bytes */
  bytes: z.number().int().nonnegative(),
  /** Best-effort content type by extension (deterministic; no sniffing) */
  content_type: z.string().min(1).optional(),
  /** Human note on what this file contains */
  description: z.string().min(1).optional(),
  /** Deterministic label to describe where it came from */
  source: z.enum(['raw']).default('raw'),
});

export type ProjectRecordSourceFile = z.infer<typeof ProjectRecordSourceFileSchema>;

export const ProjectRecordSchema = z.object({
  schema_version: z.literal(PROJECT_RECORD_SCHEMA_VERSION),

  /** Stable deterministic ID; used for normalized/<project_id>.json */
  project_id: z.string().min(1),
  /** Folder name under raw/<project_slug>/ */
  project_slug: z.string().min(1),

  title: z.string().min(1).optional(),

  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),

  /**
   * Project year for quick filtering / audit context.
   * (Often the year of implementation or the analysis year; be explicit in notes if unclear.)
   */
  project_year: z.number().int().min(1900).max(2100).optional(),

  client: z.object({
    name: z.string().min(1),
    industry: z.string().min(1).optional(),
    notes: z.string().min(1).optional(),
  }),

  site: z.object({
    name: z.string().min(1).optional(),
    address: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    postal_code: z.string().min(1).optional(),
    country: z.string().min(1).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    notes: z.string().min(1).optional(),
  }),

  building_type: z.string().min(1),

  /**
   * A small set of deterministic keywords used for retrieval.
   * (In Phase 1, this is just a curated list from the manifest/manual entry.)
   */
  tags: z.array(z.string().min(1)).default([]),

  systems: z
    .array(
      z.object({
        system_type: z.string().min(1),
        description: z.string().min(1).optional(),
        notes: z.string().min(1).optional(),
      })
    )
    .default([]),

  /**
   * Energy saving measures (ESMs / ECMs).
   * Keep these high-level in v1; detailed calc provenance comes later.
   */
  measures: z
    .array(
      z.object({
        name: z.string().min(1),
        category: z.string().min(1).optional(),
        status: z.enum(['identified', 'proposed', 'implemented', 'unknown']).default('unknown'),
        description: z.string().min(1).optional(),
        notes: z.string().min(1).optional(),
      })
    )
    .default([]),

  assumptions: z
    .object({
      /** Freeform assumptions captured during manual entry */
      notes: z.string().min(1).optional(),
      /** Key/value assumptions for simple deterministic retrieval */
      kv: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
    })
    .default({ kv: {} }),

  calc_outputs: z
    .object({
      annual_kwh_savings: z.number().optional(),
      annual_therm_savings: z.number().optional(),
      kw_reduction: z.number().optional(),
      annual_cost_savings_usd: z.number().optional(),
      notes: z.string().min(1).optional(),
    })
    .default({}),

  confidence: z
    .object({
      /** 0..1 confidence in the normalized record */
      overall: z.number().min(0).max(1),
      notes: z.string().min(1).optional(),
    })
    .default({ overall: 0.5 }),

  implementation_notes: z.string().min(1).optional(),

  source_files: z.array(ProjectRecordSourceFileSchema).default([]),
});

export type ProjectRecord = z.infer<typeof ProjectRecordSchema>;

