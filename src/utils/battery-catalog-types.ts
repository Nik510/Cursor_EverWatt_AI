import type { BatterySpec } from '../modules/battery/types';

export interface CatalogBatteryRow {
  id?: string;
  modelName: string;
  manufacturer: string;
  capacityKwh: number;
  powerKw: number;
  cRate: number;
  efficiency: number;
  warrantyYears: number;
  price1_10: number;
  price11_20: number;
  price21_50: number;
  price50Plus: number;
  active: boolean;
}

export function catalogToBatterySpec(catalogBattery: CatalogBatteryRow, quantity: number = 1): BatterySpec {
  let systemPrice: number;
  if (quantity > 50) {
    systemPrice = catalogBattery.price50Plus;
  } else if (quantity > 20) {
    systemPrice = catalogBattery.price21_50;
  } else if (quantity > 10) {
    systemPrice = catalogBattery.price11_20;
  } else {
    systemPrice = catalogBattery.price1_10;
  }

  // Keep `systemPrice` computed for future use; BatterySpec doesn't currently carry price.
  void systemPrice;

  const degradationRate = 0.02;

  return {
    capacity_kwh: catalogBattery.capacityKwh,
    max_power_kw: catalogBattery.powerKw,
    round_trip_efficiency: catalogBattery.efficiency,
    degradation_rate: degradationRate,
    min_soc: 0.10,
    max_soc: 0.90,
    depth_of_discharge: 0.90,
  };
}

