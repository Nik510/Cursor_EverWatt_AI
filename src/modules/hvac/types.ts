/**
 * HVAC module types
 */

import type { HVACEquipment } from '../../data/hvac/master-hvac-database';

export type HVACCategory = HVACEquipment['category'];

export type HVACSystemType = 'chiller' | 'boiler' | 'vrf';

export interface HVACSystem {
  type: HVACSystemType;
  name: string;
  currentEfficiency: number;
  proposedEfficiency: number;
  capacity: number;
  operatingHours: number;
  energyCost: number;
}
