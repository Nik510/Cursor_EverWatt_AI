import { z } from 'zod';

export const TariffIdSchema = z.string().min(1);

export const TouWindowSchema = z.object({
  name: z.string().min(1),
  // Minutes since midnight local time (0..1440)
  startMinute: z.number().int().min(0).max(1440),
  endMinute: z.number().int().min(0).max(1440),
  days: z.enum(['all', 'weekday', 'weekend']).default('all'),
});

export const EnergyChargeSchema = z.object({
  id: z.string().min(1),
  season: z.enum(['all', 'summer', 'winter']).default('all'),
  windows: z.array(TouWindowSchema).min(1),
  pricePerKwh: z.number().finite().nonnegative(),
});

export const DemandTierSchema = z.object({
  upToKw: z.number().finite().positive().optional(), // undefined means infinity
  pricePerKw: z.number().finite().nonnegative(),
});

export const DemandDeterminantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  // e.g. peak, part-peak, facilities
  kind: z.enum(['peak', 'part_peak', 'off_peak', 'facilities', 'custom']).default('peak'),
  windows: z.array(TouWindowSchema).optional(), // if omitted => all intervals in cycle
  tiers: z.array(DemandTierSchema).min(1),
});

export const RatchetSchema = z.object({
  id: z.string().min(1),
  lookbackCycles: z.number().int().min(1).max(12),
  percent: z.number().finite().min(0).max(1),
  appliesToDeterminantId: z.string().min(1),
});

export const TariffModelSchema = z.object({
  version: z.string().min(1),
  tariffId: TariffIdSchema,
  rateCode: z.string().min(1),
  utility: z.string().min(1),
  region: z.string().optional(),
  eligibilityNotes: z.string().optional(),

  timezone: z.string().min(1).default('UTC'),

  fixedMonthlyCharge: z.number().finite().nonnegative().default(0),
  energyCharges: z.array(EnergyChargeSchema).default([]),
  demandDeterminants: z.array(DemandDeterminantSchema).default([]),
  ratchets: z.array(RatchetSchema).default([]),
});

export type TariffModel = z.infer<typeof TariffModelSchema>;

export const BillingPeriodSchema = z.object({
  cycleId: z.string().min(1),
  accountId: z.string().optional(),
  billStartDate: z.coerce.date(),
  billEndDate: z.coerce.date(),
  rateCode: z.string().optional(),
  statedTotalBill: z.number().finite().nonnegative().optional(),
});

export type BillingPeriod = z.infer<typeof BillingPeriodSchema>;

export const IntervalRowSchema = z.object({
  timestamp: z.coerce.date(),
  kw: z.number().finite(),
});

export type IntervalRow = z.infer<typeof IntervalRowSchema>;

