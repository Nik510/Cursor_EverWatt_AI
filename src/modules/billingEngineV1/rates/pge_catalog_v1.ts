import type { RateDefinitionV1 } from './types';

function norm(s: string): string {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '-');
}

export const PGE_SIM_B19_LIKE: RateDefinitionV1 = {
  rateId: 'PGE_SIM_B19_LIKE',
  utilityTerritory: 'PGE',
  serviceClassTags: ['electric', 'commercial', 'demand', 'tou'],
  timezone: 'America/Los_Angeles',
  billing: {
    fixedCharges: [{ kind: 'perDay', dollars: 12.0 }],
  },
  touPeriods: [
    { label: 'OFF_PEAK', weekday: [{ startHour: 0, endHour: 16 }, { startHour: 21, endHour: 24 }], weekend: [{ startHour: 0, endHour: 24 }] },
    { label: 'PEAK', weekday: [{ startHour: 16, endHour: 21 }], weekend: [] },
  ],
  energyCharges: {
    OFF_PEAK: 0.18,
    PEAK: 0.32,
  },
  demandCharges: [
    { kind: 'monthlyMaxKw', touLabel: 'ANY', dollarsPerKw: 22.5, notes: ['Monthly max demand charge (placeholder).'] },
    { kind: 'touMaxKw', touLabel: 'PEAK', dollarsPerKw: 8.0, notes: ['On-peak demand adder (placeholder).'] },
  ],
  notes: ['Simplified B-19-like commercial TOU + demand structure. Placeholder numbers; schema supports full fidelity later.'],
  version: 'pge_catalog_v1',
};

export const PGE_SIM_TOU_COMMERCIAL: RateDefinitionV1 = {
  rateId: 'PGE_SIM_TOU_COMMERCIAL',
  utilityTerritory: 'PGE',
  serviceClassTags: ['electric', 'commercial', 'tou'],
  timezone: 'America/Los_Angeles',
  billing: {
    fixedCharges: [{ kind: 'perMonth', dollars: 120.0 }],
  },
  touPeriods: [
    { label: 'SUPER_OFF_PEAK', weekday: [{ startHour: 0, endHour: 8 }], weekend: [{ startHour: 0, endHour: 10 }] },
    { label: 'OFF_PEAK', weekday: [{ startHour: 8, endHour: 16 }, { startHour: 21, endHour: 24 }], weekend: [{ startHour: 10, endHour: 16 }, { startHour: 21, endHour: 24 }] },
    { label: 'PEAK', weekday: [{ startHour: 16, endHour: 21 }], weekend: [{ startHour: 16, endHour: 21 }] },
  ],
  energyCharges: {
    SUPER_OFF_PEAK: 0.15,
    OFF_PEAK: 0.22,
    PEAK: 0.38,
  },
  demandCharges: [{ kind: 'monthlyMaxKw', touLabel: 'ANY', dollarsPerKw: 10.0, notes: ['Lower demand charge, more energy-weighted (placeholder).'] }],
  notes: ['Simplified TOU commercial rate with lower demand component. Placeholder numbers.'],
  version: 'pge_catalog_v1',
};

export const PGE_SIM_DEMAND_LIGHT: RateDefinitionV1 = {
  rateId: 'PGE_SIM_DEMAND_LIGHT',
  utilityTerritory: 'PGE',
  serviceClassTags: ['electric', 'commercial', 'flat_energy', 'demand_light'],
  timezone: 'America/Los_Angeles',
  billing: {
    fixedCharges: [{ kind: 'perDay', dollars: 6.0 }],
  },
  touPeriods: [{ label: 'ANY', weekday: [{ startHour: 0, endHour: 24 }], weekend: [{ startHour: 0, endHour: 24 }], notes: ['Single-period flat energy.'] }],
  energyCharges: {
    ANY: 0.24,
  },
  demandCharges: [{ kind: 'monthlyMaxKw', touLabel: 'ANY', dollarsPerKw: 6.5, notes: ['Demand-light structure (placeholder).'] }],
  notes: ['Simplified demand-light commercial structure. Placeholder numbers.'],
  version: 'pge_catalog_v1',
};

export const PGE_SIM_TOU_SEASONAL: RateDefinitionV1 = {
  rateId: 'PGE_SIM_TOU_SEASONAL',
  utilityTerritory: 'PGE',
  serviceClassTags: ['electric', 'commercial', 'tou', 'seasonal'],
  timezone: 'America/Los_Angeles',
  billing: {
    fixedCharges: [{ kind: 'perMonth', dollars: 140.0 }],
  },
  touPeriods: [
    { label: 'OFF_PEAK', weekday: [{ startHour: 0, endHour: 14 }, { startHour: 20, endHour: 24 }], weekend: [{ startHour: 0, endHour: 24 }] },
    { label: 'PARTIAL_PEAK', weekday: [{ startHour: 14, endHour: 16 }, { startHour: 19, endHour: 20 }], weekend: [] },
    { label: 'PEAK', weekday: [{ startHour: 16, endHour: 19 }], weekend: [] },
  ],
  energyCharges: {
    OFF_PEAK: 0.19,
    PARTIAL_PEAK: 0.28,
    PEAK: 0.42,
  },
  demandCharges: [
    { kind: 'monthlyMaxKw', touLabel: 'ANY', dollarsPerKw: 14.0, notes: ['Seasonal-style demand (placeholder).'] },
    { kind: 'touMaxKw', touLabel: 'PEAK', dollarsPerKw: 6.0, notes: ['Peak demand adder (placeholder).'] },
  ],
  notes: ['Simplified seasonal TOU variant (summer-like). Placeholder numbers.'],
  version: 'pge_catalog_v1',
};

export const PGE_CATALOG_V1: RateDefinitionV1[] = [PGE_SIM_B19_LIKE, PGE_SIM_TOU_COMMERCIAL, PGE_SIM_DEMAND_LIGHT, PGE_SIM_TOU_SEASONAL];

export function getPgeRateById(rateId: string): RateDefinitionV1 | null {
  const id = norm(rateId);
  return PGE_CATALOG_V1.find((r) => norm(r.rateId) === id) || null;
}

/**
 * Best-effort mapping from "real-ish" rate codes into the v1 simulated catalog.
 * This keeps utilityIntelligence integration additive and conservative.
 */
export function resolvePgeSimRateForCode(rateCodeOrId: string): RateDefinitionV1 | null {
  const rc = norm(rateCodeOrId).replace(/-/g, '');

  // Direct ID match first
  const direct = getPgeRateById(rateCodeOrId);
  if (direct) return direct;

  // Common PG&E large C&I demand/TOU family → B19-like structure
  if (rc.startsWith('B19') || rc.startsWith('E19') || rc.endsWith('19S') || rc.includes('OPTION') || rc.endsWith('S')) {
    return PGE_SIM_B19_LIKE;
  }

  // Many TOU commercial codes → TOU commercial sim
  if (rc.includes('TOU') || rc.startsWith('A10TOU') || rc.startsWith('A6TOU')) {
    return PGE_SIM_TOU_COMMERCIAL;
  }

  if (rc.includes('SEASON') || rc.startsWith('E20') || rc.startsWith('B20')) {
    return PGE_SIM_TOU_SEASONAL;
  }

  // Light commercial / small demand → demand light
  if (rc.startsWith('A10') || rc.startsWith('A6')) {
    return PGE_SIM_DEMAND_LIGHT;
  }

  return null;
}

