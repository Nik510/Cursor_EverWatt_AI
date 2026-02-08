import { z } from 'zod';

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export const ApiOkSchema = z.object({ success: z.literal(true) });

export const LibraryBatterySchema = z.object({
  id: z.string().optional(),
  modelName: z.string(),
  manufacturer: z.string(),
  capacityKwh: z.number(),
  powerKw: z.number(),
  cRate: z.number().optional(),
  efficiency: z.number().optional(),
  warrantyYears: z.number().optional(),
  price1_10: z.number().optional(),
  price11_20: z.number().optional(),
  price21_50: z.number().optional(),
  price50Plus: z.number().optional(),
  active: z.boolean().optional(),
});

export const GetLibraryBatteriesResponseSchema = z.union([
  z.object({ success: z.literal(true), batteries: z.array(LibraryBatterySchema) }),
  ApiErrorSchema,
]);

export const AuditSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  timestamp: z.string(),
  updatedAt: z.string(),
});

export const ListAuditsResponseSchema = z.union([
  z.object({ success: z.literal(true), audits: z.array(AuditSummarySchema) }),
  ApiErrorSchema,
]);

export const GetAuditResponseSchema = z.union([
  z.object({ success: z.literal(true), audit: z.unknown() }),
  ApiErrorSchema,
]);

export const GetAnalysisResponseSchema = z.union([
  z.object({ success: z.literal(true), analysis: z.unknown() }),
  ApiErrorSchema,
]);

export const CalculationSummarySchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.string(),
  auditId: z.string().optional(),
});

export const ListCalculationsResponseSchema = z.union([
  z.object({ success: z.literal(true), calculations: z.array(CalculationSummarySchema) }),
  ApiErrorSchema,
]);

export const GetCalculationResponseSchema = z.union([
  z.object({ success: z.literal(true), calculation: z.unknown() }),
  ApiErrorSchema,
]);

type Failure = z.infer<typeof ApiErrorSchema>;

export function unwrap<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown
): Exclude<z.infer<S>, Failure> {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new Error('Invalid API response');
  }
  const v = r.data as z.infer<S>;
  if (typeof v === 'object' && v !== null && 'success' in v && (v as { success?: unknown }).success === false) {
    const fail = v as Failure;
    throw new Error(fail.error || 'Request failed');
  }
  return v as Exclude<z.infer<S>, Failure>;
}
