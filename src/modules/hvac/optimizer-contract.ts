/**
 * HVAC Optimizer (Compute Service) - Versioned Contract
 *
 * Node orchestrates async runs and calls the Python `hvac_compute` service.
 * This file defines the request/response schema for that HTTP boundary.
 *
 * IMPORTANT:
 * - Keep this contract versioned and backwards compatible.
 * - Keep it JSON-serializable.
 */
import { z } from 'zod';
 
export const HVAC_COMPUTE_API_VERSION = 'v1' as const;
 
/**
 * Canonical point tags used by the compute service.
 * We map vendor-specific point names/columns to these tags.
 */
export const HvacPointTagSchema = z.enum([
  // Weather / mixed air
  'OAT',
  'RH',
  'DEWPOINT',
 
  // Airside temps
  'RAT',
  'MAT',
  'SAT',
 
  // Airside flow / pressure / power
  'DUCT_STATIC',
  'FAN_SPEED_PCT',
  'FAN_KW',
 
  // Coil/valve positions
  'CHW_VALVE_PCT',
  'HW_VALVE_PCT',
  'OA_DAMPER_PCT',
 
  // Plant temps
  'CHWST',
  'CHWRT',
  'HWST',
  'HWRT',
 
  // Zone-level (optional)
  'SPACE_TEMP',
  'SPACE_TEMP_SP',
  'ZONE_CO2',
 
  // Control states (optional)
  'AHU_ENABLE',
  'ECON_ENABLE',
  'OCCUPANCY',
]);
export type HvacPointTag = z.infer<typeof HvacPointTagSchema>;
 
export const PointMappingSchema = z.object({
  /**
   * The trend file column name that contains timestamps.
   * Example: "Timestamp" or "Date/Time".
   */
  timestampColumn: z.string().min(1),
 
  /**
   * Mapping from canonical point tag -> trend file column name.
   * Example: { "OAT": "Outside Air Temp (F)" }
   */
  // Note: `z.record(enumKey, ...)` already allows a subset of keys; `.partial()` is only for ZodObject.
  points: z.record(HvacPointTagSchema, z.string().min(1)).default({}),
 
  /**
   * Optional units hints (used when the CSV lacks units in headers).
   * Example: { "OAT": "F", "DUCT_STATIC": "inwc" }
   */
  unitsHint: z
    .record(
      HvacPointTagSchema,
      z.enum(['F', 'C', 'kW', 'pct', 'inwc', 'Pa', 'cfm', 'gpm', 'ppm'])
    )
    .optional(),
});
export type PointMapping = z.infer<typeof PointMappingSchema>;
 
export const EquipmentSystemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['AHU', 'RTU', 'VAVGroup', 'ChillerPlant', 'BoilerPlant']),
  name: z.string().min(1),
 
  // Optional metadata for calibration/constraints
  metadata: z
    .object({
      tonnage: z.number().finite().positive().optional(),
      motorHp: z.number().finite().positive().optional(),
      vavCount: z.number().int().positive().optional(),
      economizerType: z.enum(['drybulb', 'enthalpy', 'none']).optional(),
      minOutsideAirCfm: z.number().finite().nonnegative().optional(),
      criticalZones: z.array(z.string()).optional(),
    })
    .partial()
    .optional(),
});
export type EquipmentSystem = z.infer<typeof EquipmentSystemSchema>;
 
export const HvacObjectiveSchema = z.object({
  /**
   * Cost optimization (energy + demand). Tariff integration lives in Node today,
   * but the compute service needs enough context to score savings.
   */
  mode: z.enum(['energy', 'demand', 'cost']).default('cost'),
 
  /**
   * If provided, optimizer should avoid exceeding this demand cap (kW).
   * This is the natural coupling point with battery dispatch, but the HVAC
   * module remains independent; Node can coordinate objectives.
   */
  demandCapKw: z.number().finite().positive().optional(),
});
export type HvacObjective = z.infer<typeof HvacObjectiveSchema>;
 
export const HvacConstraintsSchema = z.object({
  comfort: z
    .object({
      spaceTempBandF: z
        .tuple([z.number().finite(), z.number().finite()])
        .optional()
        .describe('Min/max allowed space temperature band (F).'),
      satMinF: z.number().finite().optional(),
      satMaxF: z.number().finite().optional(),
    })
    .partial()
    .optional(),
 
  ventilation: z
    .object({
      minOutsideAirCfm: z.number().finite().nonnegative().optional(),
      minOutsideAirPct: z.number().finite().min(0).max(100).optional(),
    })
    .partial()
    .optional(),
 
  equipment: z
    .object({
      minFanSpeedPct: z.number().finite().min(0).max(100).optional(),
      maxFanSpeedPct: z.number().finite().min(0).max(100).optional(),
      antiShortCycleMinutes: z.number().finite().nonnegative().optional(),
    })
    .partial()
    .optional(),
});
export type HvacConstraints = z.infer<typeof HvacConstraintsSchema>;
 
export const HvacComputeAnalyzeRequestSchema = z.object({
  apiVersion: z.literal(HVAC_COMPUTE_API_VERSION),
  projectId: z.string().min(1),
  runId: z.string().min(1),
  timezone: z.string().min(1).default('UTC'),
 
  systems: z.array(EquipmentSystemSchema).min(1),
  pointMapping: PointMappingSchema,
 
  /**
   * Trend data payload (normalized to CSV for MVP).
   * - Node is responsible for fetching the uploaded file (per-user storage)
   * - Python is responsible for parsing, unit detection, resampling, QA, etc.
   */
  trend: z.object({
    format: z.literal('csv'),
    csvText: z.string().min(1),
  }),
 
  // Optional: richer context for optimization
  objective: HvacObjectiveSchema.optional(),
  constraints: HvacConstraintsSchema.optional(),
 
  /**
   * Trend sampling interval target (minutes). Compute can resample.
   */
  targetIntervalMinutes: z.number().int().min(1).max(60).default(15),
});
export type HvacComputeAnalyzeRequest = z.infer<typeof HvacComputeAnalyzeRequestSchema>;
 
export const EvidenceMetricSchema = z.object({
  key: z.string().min(1),
  value: z.union([z.number(), z.string(), z.boolean(), z.null()]),
  unit: z.string().optional(),
});
export type EvidenceMetric = z.infer<typeof EvidenceMetricSchema>;
 
export const TechnicianChangeSchema = z.object({
  pointTag: HvacPointTagSchema.optional(),
  pointName: z.string().min(1).describe('BAS point name (or mapped column)'),
  currentValue: z.union([z.number(), z.string(), z.boolean(), z.null()]).optional(),
  recommendedValue: z.union([z.number(), z.string(), z.boolean(), z.null()]),
  when: z
    .object({
      // Simple schedule window; can be extended later
      startLocal: z.string().optional(),
      endLocal: z.string().optional(),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    })
    .partial()
    .optional(),
  rollbackValue: z.union([z.number(), z.string(), z.boolean(), z.null()]).optional(),
  notes: z.string().optional(),
});
export type TechnicianChange = z.infer<typeof TechnicianChangeSchema>;
 
export const RecommendationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.enum(['schedule', 'reset', 'economizer', 'fdd', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  confidence: z.number().finite().min(0).max(1),
 
  estimatedImpact: z
    .object({
      kwPeakReduction: z.number().finite().optional(),
      kwhAnnualSavings: z.number().finite().optional(),
      thermAnnualSavings: z.number().finite().optional(),
      costAnnualSavings: z.number().finite().optional(),
    })
    .partial()
    .optional(),
 
  technicianChangeList: z.array(TechnicianChangeSchema).default([]),
  evidence: z.array(EvidenceMetricSchema).default([]),
  rationale: z.array(z.string()).default([]),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;
 
export const FaultFindingSchema = z.object({
  id: z.string().min(1),
  system_id: z.string().min(1).optional(),
  fault_type: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high']),
  // Backwards compatible: older payloads may omit this field.
  blocks_optimization: z.boolean().default(false),
  evidence: z
    .object({
      metrics: z.array(EvidenceMetricSchema).default([]),
      timestamps: z.array(z.string()).default([]),
    })
    .default({ metrics: [], timestamps: [] }),
  recommended_investigation: z.array(z.string()).default([]),
});
export type FaultFinding = z.infer<typeof FaultFindingSchema>;
 
export const DataQaIssueSchema = z.object({
  id: z.string().min(1),
  pointTag: HvacPointTagSchema.optional(),
  message: z.string().min(1),
  severity: z.enum(['info', 'warning', 'error']).default('warning'),
});
export type DataQaIssue = z.infer<typeof DataQaIssueSchema>;
 
export const HvacComputeAnalyzeResponseSchema = z.object({
  apiVersion: z.literal(HVAC_COMPUTE_API_VERSION),
  projectId: z.string().min(1),
  runId: z.string().min(1),
  generatedAt: z.string().min(1),
 
  dataQa: z
    .object({
      completenessScore: z.number().finite().min(0).max(1),
      issues: z.array(DataQaIssueSchema).default([]),
    })
    .default({ completenessScore: 0, issues: [] }),
 
  fdd_findings: z.array(FaultFindingSchema).default([]),
  recommendations: z.array(RecommendationSchema).default([]),
 
  /**
   * Minimal summary used by UI for quick rendering.
   */
  summary: z
    .object({
      recommendationCount: z.number().int().nonnegative(),
      highPriorityCount: z.number().int().nonnegative(),
      notes: z.array(z.string()).default([]),
    })
    .default({ recommendationCount: 0, highPriorityCount: 0, notes: [] }),
});
export type HvacComputeAnalyzeResponse = z.infer<typeof HvacComputeAnalyzeResponseSchema>;
 
