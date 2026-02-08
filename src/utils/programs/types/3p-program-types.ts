/**
 * Type definitions for Third-Party Energy Efficiency Programs
 */

export interface ThreePartyProgram {
  // Core identification
  id: string;
  programName: string;
  implementer: string;              // The 3rd party company name (e.g., "Willdan", "CLEAResult")
  utilities: string[];               // Array of utilities served ["PG&E", "SCE", "SDG&E", "SoCalGas"]
  sectors: string[];                 // ["Commercial", "Industrial", "Residential", "Public", "Agricultural"]
  
  // Program classification
  programType: string;               // "Upstream", "Midstream", "Market Transformation", "Custom", "Direct Install"
  scope: string;                     // "Statewide" | "Regional" | "Territory-Specific"
  
  // Program details
  description: string;
  leadAdministrator?: string;        // If different from utility (e.g., "SoCalGas" for statewide programs)
  
  // Program specifics
  eligibleEquipment?: string[];      // What equipment/measures are covered
  eligibleCustomers?: string;        // Who can participate (e.g., "Commercial customers with >20 kW demand")
  incentiveStructure?: string;       // How incentives work (e.g., "Deemed rebates", "NMEC-based", "No co-pay")
  incentiveRates?: string;           // Specific rates if mentioned (e.g., "$0.12/kWh, $150/kW peak")
  
  // Program logistics
  methodology?: string;              // e.g., "Site-Level NMEC", "Population-Level NMEC", "SEM"
  coordination?: string;             // Coordination with other programs
  website?: string;
  contactInfo?: string;
  
  // Additional context
  notes?: string[];
  relatedPrograms?: string[];        // References to related programs
}

export interface StructuredThreePartyPrograms {
  programs: ThreePartyProgram[];
  metadata: {
    totalPrograms: number;
    utilities: string[];
    implementers: string[];
    sectors: string[];
    programTypes: string[];
  };
}

