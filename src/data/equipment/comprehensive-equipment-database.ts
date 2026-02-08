/**
 * COMPREHENSIVE EQUIPMENT DATABASE
 * Detailed information for ALL equipment types across all categories
 * Generated from ALL EE MEASURES 2.0
 * 
 * Database Statistics:
 * - HVAC Equipment: 84 entries (from master-hvac-database.ts)
 * - Technology Compendiums: 179 entries (from all-technology-compendiums.ts)
 * - Total Unique Entries: ~220-230 (after deduplication)
 * 
 * HVAC entries take precedence when duplicates exist (as they have more detailed info)
 */

import { ALL_HVAC_EQUIPMENT, type HVACEquipment } from '../hvac/master-hvac-database';
import { allTechnologyCompendiums } from './all-technology-compendiums';

/**
 * Unified equipment interface
 * Compatible with both HVACEquipment and technology compendiums
 */
export interface DetailedEquipment {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  
  // Identification
  identification: {
    physicalCharacteristics: string[];
    keyComponents: string[];
    typicalSizes: string;
    nameplateInfo: string[];
    howToIdentify: string[];
    typicalManufacturers: string[];
  };
  
  // Technical Specifications
  specifications: {
    capacityRange: string;
    efficiencyRange: string;
    efficiencyMetrics: string[];
    typicalEfficiency: string;
    powerRange?: string;
    operatingConditions: string;
  };
  
  // Applications
  applications: {
    typicalLocations: string[];
    buildingTypes: string[];
    useCases: string[];
    commonConfigurations: string[];
  };
  
  // Replacement/Upgrade Logic
  replacement: {
    recommendedUpgrade: string;
    upgradeReason: string;
    whenToUpgrade: Record<string, any>;
    priority: 'Critical' | 'High' | 'Medium' | 'Low' | 'Optimize';
    typicalPaybackYears: string;
    energySavingsPercent: string;
    notes: string[];
  };
  
  // Best Practices
  bestPractices: {
    maintenance: string[];
    optimization: string[];
    commonIssues: string[];
    troubleshooting: string[];
  };
}

/**
 * Convert HVACEquipment to DetailedEquipment format
 */
function convertHVACToDetailed(hvac: HVACEquipment): DetailedEquipment {
  return {
    id: hvac.id,
    name: hvac.name,
    category: hvac.category.toUpperCase().replace('_', ' '),
    subcategory: hvac.subcategory,
    identification: hvac.identification,
    specifications: {
      ...hvac.specifications,
      powerRange: hvac.specifications.powerRange,
    },
    applications: hvac.applications,
    replacement: {
      recommendedUpgrade: hvac.replacement.recommendedUpgrade,
      upgradeReason: hvac.replacement.upgradeReason,
      whenToUpgrade: hvac.replacement.whenToUpgrade,
      priority: hvac.replacement.priority,
      typicalPaybackYears: hvac.replacement.typicalPaybackYears,
      energySavingsPercent: hvac.replacement.energySavingsPercent,
      notes: hvac.replacement.notes,
    },
    bestPractices: hvac.bestPractices,
  };
}

/**
 * Merge HVAC equipment and technology compendiums
 * HVAC entries take precedence when duplicates exist (by name)
 */
function mergeEquipmentDatabases(): DetailedEquipment[] {
  const merged: DetailedEquipment[] = [];
  const seenNames = new Set<string>();
  
  // First, add all HVAC equipment (higher priority)
  for (const hvac of ALL_HVAC_EQUIPMENT) {
    const detailed = convertHVACToDetailed(hvac);
    merged.push(detailed);
    seenNames.add(hvac.name.toLowerCase());
  }
  
  // Then, add technology compendiums that aren't duplicates
  for (const tech of allTechnologyCompendiums) {
    const nameLower = tech.name.toLowerCase();
    if (!seenNames.has(nameLower)) {
      merged.push(tech);
      seenNames.add(nameLower);
    }
  }
  
  return merged;
}

/**
 * Comprehensive equipment database
 * All equipment types merged from HVAC and other technology compendiums
 */
export const comprehensiveEquipmentDatabase: DetailedEquipment[] = mergeEquipmentDatabases();

/**
 * Find equipment by name (case-insensitive, partial match)
 */
export function findEquipmentByName(name: string): DetailedEquipment | null {
  const search = name.toLowerCase();
  return comprehensiveEquipmentDatabase.find(eq =>
    eq.name.toLowerCase().includes(search) ||
    eq.id.toLowerCase().includes(search)
  ) || null;
}

/**
 * Get equipment by category
 */
export function getEquipmentByCategory(category: string): DetailedEquipment[] {
  return comprehensiveEquipmentDatabase.filter(eq =>
    eq.category.toLowerCase().includes(category.toLowerCase())
  );
}

/**
 * Get equipment by subcategory
 */
export function getEquipmentBySubcategory(subcategory: string): DetailedEquipment[] {
  return comprehensiveEquipmentDatabase.filter(eq =>
    eq.subcategory.toLowerCase().includes(subcategory.toLowerCase())
  );
}

/**
 * Search equipment by query (name, category, subcategory)
 */
export function searchEquipment(query: string): DetailedEquipment[] {
  const search = query.toLowerCase();
  return comprehensiveEquipmentDatabase.filter(eq =>
    eq.name.toLowerCase().includes(search) ||
    eq.category.toLowerCase().includes(search) ||
    eq.subcategory.toLowerCase().includes(search) ||
    eq.identification.howToIdentify.some(hint => hint.toLowerCase().includes(search))
  );
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  return Array.from(new Set(
    comprehensiveEquipmentDatabase.map(eq => eq.category)
  )).sort();
}

/**
 * Get all unique subcategories
 */
export function getAllSubcategories(): string[] {
  return Array.from(new Set(
    comprehensiveEquipmentDatabase.map(eq => eq.subcategory)
  )).sort();
}
