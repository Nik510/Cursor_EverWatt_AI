import { z } from 'zod';

export const AuditBuildingSchema = z.object({
  name: z.string().trim().min(1, 'Building name is required'),
  address: z.string().trim().min(1, 'Address is required'),
  squareFootage: z.number().finite().positive('Square footage must be > 0'),
  buildingType: z.string().trim().min(1, 'Building type is required'),
  yearBuilt: z.number().int().min(1800, 'Year built must be valid').max(new Date().getFullYear(), 'Year built must be valid'),
  occupancy: z.number().int().min(0, 'Occupancy must be >= 0'),
  operatingHours: z.number().finite().min(0, 'Operating hours must be >= 0').max(8760, 'Operating hours must be <= 8760'),
});

export const AuditHVACSchema = z.object({
  type: z.enum(['chiller', 'boiler', 'vrf', 'rtu', 'other']),
  manufacturer: z.string().trim().optional().default(''),
  model: z.string().trim().optional().default(''),
  capacity: z.number().finite().min(0, 'Capacity must be >= 0'),
  efficiency: z.number().finite().min(0, 'Efficiency must be >= 0'),
  yearInstalled: z.number().int().min(0, 'Year installed must be >= 0'),
  location: z.string().trim().optional().default(''),
  notes: z.string().trim().optional().default(''),
});

export const AuditLightingSchema = z.object({
  fixtureType: z.string().trim().min(1, 'Fixture type is required'),
  bulbType: z.string().trim().optional().default(''),
  fixtureCount: z.number().int().min(0, 'Fixture count must be >= 0'),
  wattage: z.number().finite().min(0, 'Wattage must be >= 0'),
  controls: z.string().trim().optional().default(''),
  location: z.string().trim().optional().default(''),
  notes: z.string().trim().optional().default(''),
});

export const AuditPayloadSchema = z.object({
  building: AuditBuildingSchema,
  hvac: z.array(AuditHVACSchema).default([]),
  lighting: z.array(AuditLightingSchema).default([]),
});

export type AuditPayload = z.infer<typeof AuditPayloadSchema>;

export type AuditValidationErrors = Record<string, string[]>;

export function zodErrorsToAuditValidationErrors(issues: z.ZodIssue[]): AuditValidationErrors {
  const errors: AuditValidationErrors = {};
  for (const issue of issues) {
    const path = issue.path.join('.');
    const msg = issue.message;

    // map into existing UI buckets
    if (path.startsWith('building.')) {
      errors.building = errors.building || [];
      errors.building.push(msg);
      continue;
    }

    const hvacMatch = path.match(/^hvac\.(\d+)\./);
    if (hvacMatch) {
      const idx = hvacMatch[1];
      const key = `hvac_${idx}`;
      errors[key] = errors[key] || [];
      errors[key].push(msg);
      continue;
    }

    const lightingMatch = path.match(/^lighting\.(\d+)\./);
    if (lightingMatch) {
      const idx = lightingMatch[1];
      const key = `lighting_${idx}`;
      errors[key] = errors[key] || [];
      errors[key].push(msg);
      continue;
    }

    errors.form = errors.form || [];
    errors.form.push(msg);
  }

  return errors;
}
