/**
 * Battery Library (API-backed)
 *
 * Battery (and rate) “library” data is managed server-side so it can be:
 * - Persisted (JSON now; DB later)
 * - Edited via admin CRUD endpoints
 *
 * This module is intentionally browser-safe (no Node fs/path imports).
 * Use `/api/library/batteries` (and `/api/library/rates`) from the client.
 */

import type { BatterySpec } from './types';

/**
 * Minimal shape used by the Library APIs.
 * (This is intentionally separate from `BatterySpec`, which is calculation-focused.)
 */
export type LibraryBattery = {
  id: string;
  modelName: string;
  manufacturer: string;
  capacityKwh: number;
  powerKw: number;
  cRate?: number;
  efficiency?: number;
  warrantyYears?: number;
  price1_10?: number;
  price11_20?: number;
  price21_50?: number;
  price50Plus?: number;
  active?: boolean;
};

/**
 * Legacy export kept to avoid breaking old imports.
 * @deprecated Use `/api/library/batteries` instead.
 */
export const BATTERY_LIBRARY: BatterySpec[] = [];
