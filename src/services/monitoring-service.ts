/**
 * Monitoring service
 *
 * Provides real-time-ish monitoring data via polling endpoints.
 * Today this is a structured mock data generator (so the feature is functional),
 * but the shapes are designed to be replaceable with real telemetry sources.
 */

export type MonitoringBuilding = {
  id: string;
  name: string;
  type?: string;
};

export type SystemStatus = {
  id: string;
  name: string;
  type: 'hvac' | 'lighting' | 'battery' | 'other';
  status: 'online' | 'offline' | 'warning' | 'error';
  currentLoad: number;
  efficiency: number;
  lastUpdate: string;
};

export type EnergyMetrics = {
  currentDemand: number; // kW
  todayEnergy: number; // kWh
  monthEnergy: number; // kWh
  peakDemand: number; // kW
  demandReduction: number; // kW
  costToday: number; // $
  costMonth: number; // $
};

export type DemandPoint = {
  time: string; // HH:00
  demand: number;
  afterBattery: number;
};

export type EnergyBreakdownItem = {
  name: string;
  value: number;
  color: string;
};

export type MonitoringSnapshot = {
  buildingId: string;
  updatedAt: string;
  metrics: EnergyMetrics;
  systems: SystemStatus[];
  demandData: DemandPoint[];
  energyBreakdown: EnergyBreakdownItem[];
};

const BUILDINGS: MonitoringBuilding[] = [
  { id: 'building-1', name: 'Main Office Building', type: 'office' },
  { id: 'building-2', name: 'Warehouse Facility', type: 'warehouse' },
  { id: 'building-3', name: 'Retail Store', type: 'retail' },
];

function clamp(min: number, v: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function rand(seed: number): number {
  // deterministic-ish pseudo random
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function nowIso(): string {
  return new Date().toISOString();
}

function getProfileBase(buildingId: string): { base: number; swing: number } {
  if (buildingId === 'building-2') return { base: 320, swing: 120 };
  if (buildingId === 'building-3') return { base: 260, swing: 90 };
  return { base: 400, swing: 150 };
}

function generateDemandData(buildingId: string): DemandPoint[] {
  const { base, swing } = getProfileBase(buildingId);
  const hourNow = new Date().getHours();
  const points: DemandPoint[] = [];

  for (let h = 0; h < 24; h++) {
    const isDay = h >= 6 && h < 20;
    const dayShape = isDay ? Math.sin(((h - 6) / 14) * Math.PI) : 0;
    const noise = (rand(h * 11 + hourNow * 7) - 0.5) * 40;

    const demand = base + (isDay ? dayShape * swing : -swing * 0.3) + noise;
    const afterBattery = clamp(200, demand - 70 - (rand(h * 13) * 15), demand);

    points.push({
      time: `${String(h).padStart(2, '0')}:00`,
      demand: Math.max(0, demand),
      afterBattery,
    });
  }

  return points;
}

function generateEnergyBreakdown(buildingId: string): EnergyBreakdownItem[] {
  if (buildingId === 'building-2') {
    return [
      { name: 'HVAC', value: 42000, color: '#3b82f6' },
      { name: 'Lighting', value: 24000, color: '#10b981' },
      { name: 'Process', value: 26000, color: '#f59e0b' },
      { name: 'Other', value: 12000, color: '#ef4444' },
    ];
  }

  return [
    { name: 'HVAC', value: 65000, color: '#3b82f6' },
    { name: 'Lighting', value: 35000, color: '#10b981' },
    { name: 'Plug Loads', value: 15000, color: '#f59e0b' },
    { name: 'Other', value: 10000, color: '#ef4444' },
  ];
}

function generateSystems(buildingId: string): SystemStatus[] {
  const t = Date.now();
  const baseEff = buildingId === 'building-1' ? 88 : buildingId === 'building-2' ? 82 : 85;

  return [
    {
      id: `${buildingId}-chiller-1`,
      name: 'Chiller #1',
      type: 'hvac',
      status: 'online',
      currentLoad: 320 + rand(t / 5000) * 80,
      efficiency: 0.55 + rand(t / 7000) * 0.15,
      lastUpdate: nowIso(),
    },
    {
      id: `${buildingId}-battery-1`,
      name: 'Battery System',
      type: 'battery',
      status: 'online',
      currentLoad: 60 + rand(t / 6500) * 35,
      efficiency: baseEff + rand(t / 9000) * 6,
      lastUpdate: nowIso(),
    },
    {
      id: `${buildingId}-lighting-1`,
      name: 'Lighting Zone',
      type: 'lighting',
      status: 'online',
      currentLoad: 15 + rand(t / 8000) * 20,
      efficiency: baseEff - 5 + rand(t / 8500) * 6,
      lastUpdate: nowIso(),
    },
  ];
}

function computeMetrics(buildingId: string, demandData: DemandPoint[], energyBreakdown: EnergyBreakdownItem[]): EnergyMetrics {
  const currentDemand = demandData[new Date().getHours()]?.demand ?? demandData[0]?.demand ?? 0;
  const peakDemand = Math.max(...demandData.map((d) => d.demand));
  const peakAfter = Math.max(...demandData.map((d) => d.afterBattery));
  const demandReduction = Math.max(0, peakDemand - peakAfter);

  const monthEnergy = energyBreakdown.reduce((sum, e) => sum + e.value, 0);
  const todayEnergy = monthEnergy / 30;

  // crude blended cost
  const blendedRate = buildingId === 'building-3' ? 0.26 : 0.22;
  const costMonth = monthEnergy * blendedRate;
  const costToday = todayEnergy * blendedRate;

  return {
    currentDemand,
    todayEnergy,
    monthEnergy,
    peakDemand,
    demandReduction,
    costToday,
    costMonth,
  };
}

export function listBuildings(): MonitoringBuilding[] {
  return BUILDINGS;
}

export function getMonitoringSnapshot(buildingId: string): MonitoringSnapshot {
  const resolved = BUILDINGS.some((b) => b.id === buildingId) ? buildingId : 'building-1';
  const demandData = generateDemandData(resolved);
  const energyBreakdown = generateEnergyBreakdown(resolved);
  const systems = generateSystems(resolved);
  const metrics = computeMetrics(resolved, demandData, energyBreakdown);

  return {
    buildingId: resolved,
    updatedAt: nowIso(),
    metrics,
    systems,
    demandData,
    energyBreakdown,
  };
}
