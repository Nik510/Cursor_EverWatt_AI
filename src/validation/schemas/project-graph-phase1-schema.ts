import { z } from 'zod';

/**
 * Phase 1 Canonical Project Graph schema.
 *
 * This is the contract that prevents scope drift:
 * - only allowed objects exist
 * - only allowed connections exist (implicitly via evidenceRefs/provenance)
 * - no extra top-level keys
 */

export const EvidenceRefSchema = z
  .object({
    fileId: z.string().min(1),
    page: z.number().int().positive().nullable().optional(),
    sheet: z.string().min(1).nullable().optional(),
    cellRange: z.string().min(1).nullable().optional(),
    snippetText: z.string().min(1).nullable().optional(),
    rowStart: z.number().int().positive().nullable().optional(),
    rowEnd: z.number().int().positive().nullable().optional(),
    colStart: z.number().int().positive().nullable().optional(),
    colEnd: z.number().int().positive().nullable().optional(),
    snippet: z.string().min(1).nullable().optional(),
    extractedAt: z.string().min(1).nullable().optional(),
    source: z.literal('proposalPack').nullable().optional(),
    proposalPackId: z.string().min(1).nullable().optional(),
    scenarioId: z.string().min(1).nullable().optional(),
    deltaId: z.string().min(1).nullable().optional(),
    sourceKey: z.string().min(1).nullable().optional(),
    storageKey: z.string().min(1).nullable().optional(),
    bbox: z
      .object({
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number(),
      })
      .nullable()
      .optional(),
  })
  .strict();

export const AssetTypeSchema = z.enum([
  'lightingFixture',
  'lightingControl',
  'lightingArea',
  'panel',
  'ahu',
  'rtu',
  'fan',
  'pump',
  'vav',
  'chiller',
  'boiler',
  'coolingTower',
  'other',
]);

export const AssetNodeSchema = z
  .object({
    kind: z.literal('asset'),
    id: z.string().min(1),
    assetTag: z.string().min(1),
    type: AssetTypeSchema,
    name: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    tags: z.array(z.string().min(1)).optional(),
    assetRole: z.enum(['primary', 'component']).optional(),
    attachedToAssetId: z.string().min(1).optional(),
    componentType: z.string().min(1).optional(),
    baseline: z
      .object({
        description: z.string().min(1).optional(),
        equipment: z.array(z.string().min(1)).optional(),
        properties: z.record(z.string().min(1)).optional(),
        evidenceRefs: z.array(EvidenceRefSchema).optional(),
        frozenAt: z.string().min(1).optional(),
      })
      .strict()
      .optional(),
    evidenceRefs: z.array(EvidenceRefSchema).optional(),
    measures: z
      .array(
        z
          .object({
            id: z.string().min(1),
            name: z.string().min(1),
            measureType: z.string().min(1).optional(),
            before: z
              .object({
                description: z.string().min(1).optional(),
                equipment: z.array(z.string().min(1)).optional(),
                evidenceRefs: z.array(EvidenceRefSchema).optional(),
              })
              .strict()
              .optional(),
            after: z
              .object({
                description: z.string().min(1).optional(),
                equipmentAdded: z.array(z.string().min(1)).optional(),
                evidenceRefs: z.array(EvidenceRefSchema).optional(),
              })
              .strict()
              .optional(),
            evidenceRefs: z.array(EvidenceRefSchema).optional(),
            createdAt: z.string().min(1).optional(),
            updatedAt: z.string().min(1).optional(),
          })
          .strict()
      )
      .optional(),
    assumptions: z
      .array(
        z
          .object({
            id: z.string().min(1),
            key: z.string().min(1),
            value: z.string().min(1),
            evidenceRefs: z.array(EvidenceRefSchema).optional(),
          })
          .strict()
      )
      .optional(),
    status: z.literal('confirmed').optional(),
    createdAt: z.string().min(1).optional(),
    updatedAt: z.string().min(1).optional(),
    reviewedAt: z.string().min(1).optional(),
  })
  .strict();

export const MeasureNodeSchema = z
  .object({
    kind: z.literal('measure'),
    id: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1).optional(),
    evidenceRefs: z.array(EvidenceRefSchema).optional(),
    status: z.literal('confirmed').optional(),
    createdAt: z.string().min(1).optional(),
    updatedAt: z.string().min(1).optional(),
    reviewedAt: z.string().min(1).optional(),
  })
  .strict();

export const InboxItemSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(['suggestedAsset', 'suggestedProperty', 'suggestedMeasure', 'suggestedBomItems']),
    status: z.literal('inferred'),
    sourceKey: z.string().min(1).optional(),
    suggestedAsset: z
      .object({
        type: AssetTypeSchema.optional(),
        name: z.string().min(1).optional(),
        assetTagHint: z.string().min(1).optional(),
        location: z.string().min(1).optional(),
        tags: z.array(z.string().min(1)).optional(),
      })
      .strict()
      .optional(),
    suggestedMeasure: z
      .object({
        id: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        category: z.string().min(1).optional(),
        notes: z.string().min(1).optional(),
      })
      .strict()
      .optional(),
    suggestedBomItems: z
      .object({
        measureId: z.string().min(1),
        items: z.array(z.unknown()),
      })
      .strict()
      .optional(),
    suggestedProperty: z
      .object({
        assetId: z.string().min(1).optional(),
        key: z.string().min(1),
        value: z.string().min(1),
      })
      .strict()
      .optional(),
    quantity: z.number().nullable().optional(),
    unit: z.string().min(1).nullable().optional(),
    provenance: EvidenceRefSchema,
    confidence: z.number().min(0).max(1),
    needsConfirmation: z.boolean(),
    createdAt: z.string().min(1).optional(),
    dispositionReason: z.string().min(1).optional(),
    reviewedAt: z.string().min(1).optional(),
  })
  .strict();

export const InboxHistoryItemSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(['suggestedAsset', 'suggestedProperty', 'suggestedMeasure', 'suggestedBomItems']),
    status: z.enum(['accepted', 'rejected']),
    sourceKey: z.string().min(1).optional(),
    suggestedAsset: z
      .object({
        type: AssetTypeSchema.optional(),
        name: z.string().min(1).optional(),
        assetTagHint: z.string().min(1).optional(),
        location: z.string().min(1).optional(),
        tags: z.array(z.string().min(1)).optional(),
      })
      .strict()
      .optional(),
    suggestedMeasure: z
      .object({
        id: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        category: z.string().min(1).optional(),
        notes: z.string().min(1).optional(),
      })
      .strict()
      .optional(),
    suggestedBomItems: z
      .object({
        measureId: z.string().min(1),
        items: z.array(z.unknown()),
      })
      .strict()
      .optional(),
    suggestedProperty: z
      .object({
        assetId: z.string().min(1).optional(),
        key: z.string().min(1),
        value: z.string().min(1),
      })
      .strict()
      .optional(),
    quantity: z.number().nullable().optional(),
    unit: z.string().min(1).nullable().optional(),
    provenance: EvidenceRefSchema,
    confidence: z.number().min(0).max(1),
    needsConfirmation: z.boolean(),
    createdAt: z.string().min(1).optional(),
    dispositionReason: z.string().min(1),
    reviewedAt: z.string().min(1),
  })
  .strict();

export const BomItemsRecordSchema = z
  .object({
    id: z.string().min(1),
    measureId: z.string().min(1),
    items: z.array(z.unknown()),
    provenance: EvidenceRefSchema,
    sourceKey: z.string().min(1).optional(),
    createdAt: z.string().min(1).optional(),
  })
  .strict();

export const DecisionEntrySchema = z
  .object({
    id: z.string().min(1),
    date: z.string().min(1),
    disposition: z.enum(['accepted', 'rejected', 'modified']),
    decisionType: z.enum(['design', 'scope', 'assumption', 'change-order']),
    context: z.string().min(1),
    optionsConsidered: z.array(z.string().min(1)).optional(),
    selectedOption: z.string().min(1).optional(),
    rationale: z.string().min(1),
    linkedAssetIds: z.array(z.string().min(1)).optional(),
    linkedMeasureIds: z.array(z.string().min(1)).optional(),
    evidenceRefs: z.array(EvidenceRefSchema).optional(),
  })
  .strict();

export const ProjectGraphPhase1Schema = z
  .object({
    assets: z.array(AssetNodeSchema).default([]),
    measures: z.array(MeasureNodeSchema).default([]),
    inbox: z.array(InboxItemSchema).default([]),
    inboxHistory: z.array(InboxHistoryItemSchema).default([]).optional(),
    bomItems: z.array(BomItemsRecordSchema).default([]).optional(),
    decisions: z.array(DecisionEntrySchema).default([]).optional(),
  })
  .strict();

