import { z } from 'zod';

export const PROJECT_MANIFEST_SCHEMA_VERSION = 'project_manifest/v1' as const;

/**
 * Minimal deterministic manifest format.
 * This is the ONLY supported ingestion source in Phase 1 (no PDF parsing/OCR).
 */
export const ProjectLibraryManifestSchema = z.object({
  schema_version: z.literal(PROJECT_MANIFEST_SCHEMA_VERSION),

  /** Folder name under everwatt-project-library/raw/<project_slug>/ */
  project_slug: z.string().min(1),
  /** Optional stable ID override; otherwise generated deterministically from slug */
  project_id: z.string().min(1).optional(),

  manual: z
    .object({
      title: z.string().min(1).optional(),

      client: z.object({
        name: z.string().min(1),
        industry: z.string().min(1).optional(),
        notes: z.string().min(1).optional(),
      }),

      site: z
        .object({
          name: z.string().min(1).optional(),
          address: z.string().min(1).optional(),
          city: z.string().min(1).optional(),
          state: z.string().min(1).optional(),
          postal_code: z.string().min(1).optional(),
          country: z.string().min(1).optional(),
          latitude: z.number().min(-90).max(90).optional(),
          longitude: z.number().min(-180).max(180).optional(),
          notes: z.string().min(1).optional(),
        })
        .default({}),

      building_type: z.string().min(1),

      project_year: z.number().int().min(1900).max(2100).optional(),

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
          notes: z.string().min(1).optional(),
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

      confidence_overall: z.number().min(0).max(1).default(0.5),
      implementation_notes: z.string().min(1).optional(),
    })
    .passthrough(),

  /**
   * Raw artifacts to link to this project.
   * `path` is relative to the raw/<project_slug>/ folder.
   */
  source_files: z
    .array(
      z.object({
        path: z.string().min(1),
        role: z.enum(['summary', 'calc', 'trend', 'other']).default('other'),
        description: z.string().min(1).optional(),
      })
    )
    .default([]),
});

export type ProjectLibraryManifest = z.infer<typeof ProjectLibraryManifestSchema>;

