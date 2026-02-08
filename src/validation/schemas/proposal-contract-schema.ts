import { z } from 'zod';
import { EvidenceRefSchema } from './project-graph-phase1-schema';

export const MissingInfoItemSchema = z
  .object({
    key: z.string().min(1),
    message: z.string().min(1),
    severity: z.enum(['info', 'warning', 'blocking']),
    evidenceRef: EvidenceRefSchema.optional(),
  })
  .strict();

export const AssumptionRefSchema = z
  .object({
    assumptionId: z.string().min(1).optional(),
    key: z.string().min(1).optional(),
    value: z.unknown().optional(),
    status: z.enum(['proposed', 'confirmed']).optional(),
  })
  .strict();

export const EconomicsResultSchema = z
  .object({
    annualSavingsUsd: z.number().nullable().optional(),
    capexUsd: z.number().nullable().optional(),
    paybackYears: z.number().nullable().optional(),
    npvUsd: z.number().nullable().optional(),
    irr: z.number().nullable().optional(),
  })
  .strict();

export const PerformanceResultSchema = z
  .object({
    peakKwBefore: z.number().nullable().optional(),
    peakKwAfter: z.number().nullable().optional(),
    kwShaved: z.number().nullable().optional(),
    kwhShifted: z.number().nullable().optional(),
  })
  .strict();

export const ProposedDeltaSchema = z
  .discriminatedUnion('kind', [
    z.object({ id: z.string().min(1), kind: z.literal('ADD_ASSET'), asset: z.unknown() }).strict(),
    z.object({ id: z.string().min(1), kind: z.literal('UPDATE_ASSET_META'), assetId: z.string().min(1), patch: z.record(z.unknown()) }).strict(),
    z.object({ id: z.string().min(1), kind: z.literal('ADD_MEASURE'), measure: z.unknown() }).strict(),
    z.object({ id: z.string().min(1), kind: z.literal('LINK_ASSET_TO_MEASURE'), assetId: z.string().min(1), measureId: z.string().min(1) }).strict(),
    z.object({ id: z.string().min(1), kind: z.literal('ADD_ASSUMPTION'), assumption: z.unknown() }).strict(),
    z.object({ id: z.string().min(1), kind: z.literal('UPDATE_ASSUMPTION'), assumptionId: z.string().min(1), value: z.unknown(), status: z.literal('proposed').optional() }).strict(),
    z.object({ id: z.string().min(1), kind: z.literal('ADD_BOM_ITEMS'), measureId: z.string().min(1), items: z.array(z.unknown()) }).strict(),
  ])
  .superRefine((v, ctx) => {
    if (!v.id) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'delta.id is required' });
  });

export const ProposalScenarioSchema = z
  .object({
    scenarioId: z.string().min(1),
    name: z.string().min(1),
    objective: z.enum(['max_savings', 'max_roi', 'min_payback', 'max_npv']),
    constraints: z.object({ maxPaybackYears: z.number(), noExport: z.boolean() }).passthrough(),
    deltas: z.array(ProposedDeltaSchema),
    economics: EconomicsResultSchema,
    performance: PerformanceResultSchema,
    confidence: z.number().min(0).max(1),
    notes: z.array(z.string()),
  })
  .strict();

export const ProposalPackSchema = z
  .object({
    proposalPackId: z.string().min(1),
    projectId: z.string().min(1),
    basedOnSnapshotId: z.string().min(1),
    createdAt: z.string().min(1),
    createdBy: z.enum(['battery_calculator', 'hvac_calculator']),
    title: z.string().min(1),
    summary: z.string().min(1),
    scenarios: z.array(ProposalScenarioSchema),
    recommendedScenarioId: z.string().min(1),
    assumptionsUsed: z.array(AssumptionRefSchema),
    missingInfo: z.array(MissingInfoItemSchema),
    riskFlags: z.array(z.string()),
    evidenceRefs: z.array(EvidenceRefSchema).optional(),
  })
  .strict();

