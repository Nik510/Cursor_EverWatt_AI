import { z } from 'zod';

export const BatteryLibraryCreateSchema = z.object({
  modelName: z.string().trim().min(1, 'Model name is required'),
  manufacturer: z.string().trim().min(1, 'Manufacturer is required'),
  capacityKwh: z.coerce.number().finite().positive('Capacity (kWh) must be > 0'),
  powerKw: z.coerce.number().finite().positive('Power (kW) must be > 0'),
  efficiency: z.coerce.number().finite().min(0, 'Efficiency must be >= 0').max(1, 'Efficiency must be <= 1').optional(),
  warrantyYears: z.coerce.number().int().min(0, 'Warranty years must be >= 0').optional(),
  price1_10: z.coerce.number().finite().min(0, 'Price must be >= 0').optional(),
  price11_20: z.coerce.number().finite().min(0, 'Price must be >= 0').optional(),
  price21_50: z.coerce.number().finite().min(0, 'Price must be >= 0').optional(),
  price50Plus: z.coerce.number().finite().min(0, 'Price must be >= 0').optional(),
});

export type BatteryLibraryCreateInput = z.infer<typeof BatteryLibraryCreateSchema>;
