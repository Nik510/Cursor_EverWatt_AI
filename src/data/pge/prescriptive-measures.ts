/**
 * PG&E Prescriptive Measures (starter dataset)
 *
 * IMPORTANT:
 * - This file is intended to become a comprehensive searchable list.
 * - For now, we seed it with high-signal common measures and keep the schema stable.
 * - Savings numbers are intentionally omitted unless we have an authoritative source.
 *
 * Last Updated: 2026-01-01
 */

export type PgePrescriptiveMeasureCategory =
  | 'HVAC'
  | 'Lighting'
  | 'Motors'
  | 'Controls'
  | 'Process'
  | 'Envelope'
  | 'Refrigeration'
  | 'Other';

export interface PrescriptiveMeasureSavings {
  /** kWh/year (optional if not sourced) */
  energyKwhPerYear?: number;
  /** kW (optional if not sourced) */
  demandKw?: number;
  /** therms/year (optional if not sourced) */
  gasThermsPerYear?: number;
  /** Human description of how savings are calculated (DEER, deemed, engineering, etc.) */
  methodology: string;
}

export interface PrescriptiveMeasureEquipmentRequirements {
  /** e.g. "COP ≥ X", "IE3 motor", "U-factor ≤ Y" */
  minEfficiency?: string;
  /** Additional spec bullets (model constraints, controls, etc.) */
  specifications?: string[];
  /** Standards / certifications (ENERGY STAR, AHRI, Title 24, etc.) */
  standards?: string[];
}

export interface PrescriptiveMeasureEligibility {
  sectors: Array<'Commercial' | 'Industrial' | 'Public' | 'Residential' | 'Multifamily' | 'All'>;
  buildingTypes: string[];
  minProjectCost?: number;
  maxProjectCost?: number;
}

export interface PrescriptiveMeasure {
  id: string;
  name: string;
  category: PgePrescriptiveMeasureCategory;
  description: string;
  savings: PrescriptiveMeasureSavings;
  equipmentRequirements: PrescriptiveMeasureEquipmentRequirements;
  eligibility: PrescriptiveMeasureEligibility;
  /** Which OBF pathway this measure most commonly aligns to. */
  pathway: 'prescriptive' | 'custom';
  /** Search tags to help match informal queries. */
  tags?: string[];
  notes?: string;
}

/**
 * Starter set of common prescriptive-leaning measures.
 * Expand this list as you ingest the official PG&E prescriptive tables.
 */
export const pgePrescriptiveMeasures: PrescriptiveMeasure[] = [
  {
    id: 'pge-pres-LED-retrofit',
    name: 'LED Lighting Retrofit (Interior/Exterior)',
    category: 'Lighting',
    description:
      'Replace existing lighting with qualifying LED fixtures/lamps; may include controls depending on scope.',
    savings: { methodology: 'Deemed/prescriptive (PG&E table / deemed values)' },
    equipmentRequirements: {
      standards: ['Title 24 (as applicable)', 'UL/ETL listing (as applicable)'],
      specifications: ['Fixture/lamps must match prescriptive list criteria for type and wattage'],
    },
    eligibility: { sectors: ['All'], buildingTypes: ['All'], minProjectCost: 5000 },
    pathway: 'prescriptive',
    tags: ['LED', 'lighting', 'troffer', 'highbay', 'parking', 'exterior'],
  },
  {
    id: 'pge-pres-VFD-fans-pumps',
    name: 'Variable Frequency Drive (VFD) for Fans/Pumps',
    category: 'Motors',
    description: 'Install VFDs on eligible constant-speed motor applications to reduce energy at part load.',
    savings: { methodology: 'Deemed/prescriptive or simplified calc depending on application' },
    equipmentRequirements: {
      specifications: ['Motor application must be eligible', 'Controls sequence must be documented'],
    },
    eligibility: { sectors: ['Commercial', 'Industrial', 'Public', 'Multifamily'], buildingTypes: ['All'], minProjectCost: 5000 },
    pathway: 'prescriptive',
    tags: ['VFD', 'motor', 'pump', 'fan', 'AHU', 'CHW', 'CW'],
  },
  {
    id: 'pge-pres-ECM-motors',
    name: 'Electronically Commutated Motors (ECM) / High-Efficiency Motors',
    category: 'Motors',
    description: 'Replace eligible motors with high-efficiency or ECM options where applicable.',
    savings: { methodology: 'Deemed/prescriptive (motor efficiency table) or simplified calc' },
    equipmentRequirements: { standards: ['NEMA Premium (as applicable)'] },
    eligibility: { sectors: ['Commercial', 'Industrial', 'Public', 'Multifamily'], buildingTypes: ['All'], minProjectCost: 5000 },
    pathway: 'prescriptive',
    tags: ['ECM', 'motor', 'NEMA', 'premium'],
  },
  {
    id: 'pge-pres-HVAC-unit-replacement',
    name: 'High-Efficiency HVAC Unit Replacement',
    category: 'HVAC',
    description: 'Replace existing HVAC equipment with qualifying high-efficiency equipment meeting prescriptive criteria.',
    savings: { methodology: 'Deemed/prescriptive (equipment efficiency thresholds)' },
    equipmentRequirements: { standards: ['AHRI Certified (as applicable)'], minEfficiency: 'Meets PG&E prescriptive threshold for equipment type' },
    eligibility: { sectors: ['Commercial', 'Public', 'Multifamily'], buildingTypes: ['All'], minProjectCost: 5000 },
    pathway: 'prescriptive',
    tags: ['HVAC', 'RTU', 'heat pump', 'replacement'],
  },
  {
    id: 'pge-pres-controls-scheduling',
    name: 'Controls / Scheduling Optimization (Standard Package)',
    category: 'Controls',
    description: 'Install standard controls upgrades (e.g., scheduling, occupancy-based control) that meet prescriptive criteria.',
    savings: { methodology: 'Deemed/prescriptive (controls package table)' },
    equipmentRequirements: { specifications: ['Controls sequence and setpoints must be documented'] },
    eligibility: { sectors: ['Commercial', 'Public', 'Multifamily'], buildingTypes: ['All'], minProjectCost: 5000 },
    pathway: 'prescriptive',
    tags: ['controls', 'EMS', 'scheduling', 'occupancy'],
  },
  {
    id: 'pge-custom-process-improvements',
    name: 'Process Improvements (Custom Calculated)',
    category: 'Process',
    description: 'Custom calculated process efficiency improvements requiring engineering analysis.',
    savings: { methodology: 'Custom engineering analysis (project-specific)' },
    equipmentRequirements: { specifications: ['Engineering calc package required'] },
    eligibility: { sectors: ['Industrial'], buildingTypes: ['Manufacturing', 'Food Processing', 'Warehousing', 'All'], minProjectCost: 5000 },
    pathway: 'custom',
    tags: ['process', 'industrial', 'custom'],
    notes: 'Custom pathway: engineering analysis required; may be bundled with other measures.',
  },
];

export function searchPgePrescriptiveMeasures(query: string): PrescriptiveMeasure[] {
  const q = query.trim().toLowerCase();
  if (!q) return pgePrescriptiveMeasures;
  return pgePrescriptiveMeasures.filter((m) => {
    const haystack = `${m.name} ${m.description} ${(m.tags || []).join(' ')} ${m.category}`.toLowerCase();
    return haystack.includes(q);
  });
}

export function getPgePrescriptiveMeasureById(id: string): PrescriptiveMeasure | undefined {
  return pgePrescriptiveMeasures.find((m) => m.id === id);
}


