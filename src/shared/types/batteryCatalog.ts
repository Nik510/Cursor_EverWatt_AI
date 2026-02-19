export type CatalogBatteryRow = {
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
};

