/**
 * HVAC Equipment Library
 *
 * Thin module wrapper around `src/data/hvac` so the rest of the app
 * imports HVAC data from `src/modules/hvac/*`.
 */

import { HVACDatabase } from '../../data/hvac';
import type { HVACEquipment } from '../../data/hvac/master-hvac-database';

export type { HVACEquipment };

export function getAllHVACEquipment(): HVACEquipment[] {
  return HVACDatabase.allEquipment;
}

export function findHVACEquipmentById(id: string): HVACEquipment | null {
  return HVACDatabase.findEquipment(id);
}

export function getHVACEquipmentByCategory(category: HVACEquipment['category']): HVACEquipment[] {
  return HVACDatabase.getEquipmentByCategory(category);
}

export function getHVACEquipmentBySubcategory(subcategory: string): HVACEquipment[] {
  return HVACDatabase.getEquipmentBySubcategory(subcategory);
}

export function getHVACDatabaseStats() {
  return HVACDatabase.stats;
}
