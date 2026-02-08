/**
 * OBF (On-Bill Financing) Eligibility Data Model
 * Tracks which EE measures are eligible for utility OBF programs
 */

export type UtilityProvider = 'PGE' | 'SCE' | 'SDGE' | 'LADWP';

/**
 * NMEC Pathway Types
 * Normalized Metered Energy Consumption has two distinct pathways
 */
export type NMECPathway = 
  | 'site-specific-nmec'  // Site-Specific NMEC (Site_NMEC) - for individual projects
  | 'population-nmec';     // Population-Level NMEC (Pop-NMEC) - for aggregated portfolios

/**
 * PG&E OBF Pathway Types
 * PG&E offers three distinct pathways for On-Bill Financing
 */
export type PGEOBFPathway = 
  | 'prescriptive'      // Standard prescriptive measures
  | 'custom'            // Custom calculated measures
  | 'site-specific-nmec'; // Site-Specific NMEC (IPMVP Option C) - Note: Only Site-Specific NMEC is used for OBF, not Population-Level

export interface UtilityOBFProgram {
  utility: UtilityProvider;
  eligible: boolean;
  maxFinancing?: number;      // Maximum financing amount in dollars
  interestRate?: string;       // e.g., "0%", "1.5%"
  maxTerm?: number;            // Maximum term in months
  minProjectCost?: number;     // Minimum project cost for eligibility
  pathway?: PGEOBFPathway;     // PG&E specific pathway (if applicable)
  notes?: string;
}

export interface OBFEligibility {
  measureId: string;
  measureName: string;
  category: string;
  eligible: boolean;
  eligibilityReason?: string;
  utilityPrograms: UtilityOBFProgram[];
  requirements?: string[];
  exceptions?: string[];
  documentation?: string[];
  lastUpdated?: string;
}

// Default utility programs configuration
export const defaultUtilityPrograms: Record<UtilityProvider, {
  name: string;
  programName: string;
  defaultMaxFinancing: number;  // Maximum per project
  maxPerAccount?: number;       // Maximum per account (if different)
  defaultInterestRate: string;
  defaultMaxTerm: number;
  minProjectCost: number;
  lastUpdated?: string;         // Last update date for program changes
  pathways?: PGEOBFPathway[];    // Available pathways (PG&E specific)
  thirdPartyAccess?: {           // 3P program access details
    canHandleOBF: boolean;       // Whether 3P can handle OBF submissions
    systemAccess?: string;       // System access (e.g., "Energy Insight CRM")
    notes?: string;              // Additional notes about 3P access
  };
}> = {
  PGE: {
    name: 'Pacific Gas & Electric',
    programName: 'PG&E On-Bill Financing',
    defaultMaxFinancing: 400000,  // Updated 2026: increased from $250,000
    maxPerAccount: 6000000,       // Updated 2026: increased from $4M to $6M per account
    defaultInterestRate: '0%',
    defaultMaxTerm: 120, // 10 years
    minProjectCost: 5000,
    lastUpdated: '2026-01-01',
    pathways: ['prescriptive', 'custom', 'site-specific-nmec'],
    thirdPartyAccess: {
      canHandleOBF: true,
      systemAccess: 'Energy Insight (Salesforce CRM)',
      notes: '3P partners (e.g., HEFI) have access to PG&E\'s Energy Insight CRM and can upload OBF projects directly and communicate on behalf of projects',
    },
  },
  SCE: {
    name: 'Southern California Edison',
    programName: 'SCE On-Bill Financing',
    defaultMaxFinancing: 250000,
    defaultInterestRate: '0%',
    defaultMaxTerm: 120,
    minProjectCost: 5000,
    thirdPartyAccess: {
      canHandleOBF: false,
      notes: '3P only handle rebates and incentives. OBF is strictly through the utility.',
    },
  },
  SDGE: {
    name: 'San Diego Gas & Electric',
    programName: 'SDG&E On-Bill Financing',
    defaultMaxFinancing: 150000,
    defaultInterestRate: '0%',
    defaultMaxTerm: 120,
    minProjectCost: 5000,
    thirdPartyAccess: {
      canHandleOBF: false,
      notes: '3P only handle rebates and incentives. OBF is strictly through the utility.',
    },
  },
  LADWP: {
    name: 'Los Angeles DWP',
    programName: 'LADWP Commercial Direct Install',
    defaultMaxFinancing: 100000,
    defaultInterestRate: '0%',
    defaultMaxTerm: 60, // 5 years
    minProjectCost: 2500,
  },
};

/**
 * NMEC Pathway Descriptions
 * NMEC has two distinct pathways for different use cases
 */
export const nmecPathways: Record<NMECPathway, {
  name: string;
  description: string;
  useCase: string;
  requirements?: string[];
  notes?: string;
}> = {
  'site-specific-nmec': {
    name: 'Site-Specific NMEC (Site_NMEC)',
    description: 'Site-Level Normalized Metered Energy Consumption (IPMVP Option C) for individual projects',
    useCase: 'Individual facility projects where savings are verified at the meter',
    requirements: [
      '12-month baseline period required',
      'NMEC Predictability Report',
      'M&V Plan',
      '12-month performance period',
      'NMEC Savings Report',
    ],
    notes: 'Used for OBF projects. Most rigorous pathway but allows for whole-building savings verification and interactive effects',
  },
  'population-nmec': {
    name: 'Population-Level NMEC (Pop-NMEC)',
    description: 'Population-Level Normalized Metered Energy Consumption for aggregated portfolios',
    useCase: 'Large portfolios of similar customers (e.g., residential homes, small businesses) where savings are aggregated',
    requirements: [
      'Portfolio of similar customers',
      'Aggregated savings calculations',
      'Population-level baseline and reporting',
    ],
    notes: 'Used in Market Access Programs (MAP). Not used for OBF - OBF uses Site-Specific NMEC only',
  },
};

// PG&E OBF Pathway Descriptions
// Note: For comprehensive pathway documentation including submission processes, required documents,
// and detailed requirements, see: src/data/pge/pge-obf-pathways.ts
export const pgeOBFPathways: Record<PGEOBFPathway, {
  name: string;
  description: string;
  useCase: string;
  requirements?: string[];
  notes?: string;
}> = {
  'prescriptive': {
    name: 'Prescriptive',
    description: 'Standard prescriptive measures with pre-approved savings calculations',
    useCase: 'Common energy efficiency measures with established savings values',
    requirements: ['Measure must be on prescriptive list', 'Standard documentation required'],
    notes: 'Fastest approval process for standard measures. See pge-obf-pathways.ts for complete documentation.',
  },
  'custom': {
    name: 'Custom',
    description: 'Custom calculated measures requiring engineering analysis',
    useCase: 'Unique or complex projects requiring custom savings calculations',
    requirements: ['Engineering analysis required', 'Custom savings calculations', 'Detailed documentation'],
    notes: 'Requires more detailed submission but allows for project-specific measures. See pge-obf-pathways.ts for complete documentation.',
  },
  'site-specific-nmec': {
    name: 'Site-Specific NMEC',
    description: 'Site-Specific Normalized Metered Energy Consumption (IPMVP Option C)',
    useCase: 'Whole-building retrofits where savings are verified at the meter',
    requirements: [
      '12-month baseline period required',
      'NMEC Predictability Report',
      'M&V Plan',
      '12-month performance period',
      'NMEC Savings Report',
    ],
    notes: 'Uses Site-Specific NMEC (Site_NMEC), not Population-Level NMEC. Most rigorous pathway but allows for whole-building savings verification and interactive effects. See pge-obf-pathways.ts for complete documentation.',
  },
};

// General OBF eligibility rules
export const obfEligibilityRules = {
  typicallyEligible: [
    'Chillers and chiller components',
    'Boilers and heating equipment',
    'Heat pumps (air-source, water-source, ground-source)',
    'VFDs and ECM motors',
    'LED lighting retrofits',
    'HVAC equipment replacements',
    'Building envelope improvements',
    'Cooling tower equipment',
    'Air handling unit upgrades',
    'Energy management systems (with hardware)',
    'Refrigeration equipment',
    'Commercial kitchen equipment',
    'Water heating equipment',
  ],
  typicallyNotEligible: [
    'Behavioral programs only',
    'Pure software/controls-only measures (without hardware)',
    'Routine maintenance items',
    'Measures with payback > 10 years',
    'Educational programs',
    'Demand response (participation-only)',
    'Renewable energy systems (separate programs)',
    'Plug load management (behavior-only)',
  ],
  generalRequirements: [
    'Equipment must be installed at a commercial facility',
    'Project must result in measurable energy savings',
    'Installation by licensed contractor',
    'Customer must be in good standing with utility',
    'Building must have a minimum 12-month utility billing history',
    'Project must meet minimum cost threshold',
    'Equipment must have minimum efficiency requirements',
  ],
};

// OBF eligibility by measure category
export const obfEligibilityByCategory: Record<string, {
  generallyEligible: boolean;
  notes: string;
}> = {
  'cooling': {
    generallyEligible: true,
    notes: 'Most cooling equipment qualifies. Chillers, condensers, cooling towers, and VFDs are typically eligible.',
  },
  'heating': {
    generallyEligible: true,
    notes: 'Boilers, furnaces, and heat pumps generally qualify. Steam traps may require minimum quantity.',
  },
  'ventilation': {
    generallyEligible: true,
    notes: 'AHUs, ERVs, and fan systems typically qualify. DCV may need associated hardware.',
  },
  'controls': {
    generallyEligible: false,
    notes: 'Controls-only projects often not eligible. Must include hardware component to qualify.',
  },
  'electrification': {
    generallyEligible: true,
    notes: 'Heat pumps and electric equipment usually qualify. EV charging has separate programs.',
  },
  'motors': {
    generallyEligible: true,
    notes: 'Motor replacements and VFDs are prime OBF candidates. High savings, quick payback.',
  },
  'datacenter': {
    generallyEligible: true,
    notes: 'CRAC/CRAH units and containment qualify. IT equipment may have separate programs.',
  },
  'plugload': {
    generallyEligible: false,
    notes: 'Equipment purchases may qualify. Behavioral measures and smart strips often not eligible.',
  },
};

// Master OBF eligibility database
export const obfEligibilityDatabase: OBFEligibility[] = [
  // Cooling Systems
  {
    measureId: 'chiller-replacement',
    measureName: 'Chiller Replacement',
    category: 'cooling',
    eligible: true,
    eligibilityReason: 'Major equipment replacement with significant energy savings',
    utilityPrograms: [
      { utility: 'PGE', eligible: true, maxFinancing: 400000, interestRate: '0%', maxTerm: 120 }, // Updated 2026: increased from $250K
      { utility: 'SCE', eligible: true, maxFinancing: 250000, interestRate: '0%', maxTerm: 120 },
      { utility: 'SDGE', eligible: true, maxFinancing: 150000, interestRate: '0%', maxTerm: 120 },
      { utility: 'LADWP', eligible: true, maxFinancing: 100000, interestRate: '0%', maxTerm: 60 },
    ],
    requirements: ['Minimum efficiency improvement of 15%', 'Installed by licensed contractor'],
  },
  {
    measureId: 'vfd-chilled-water-pump',
    measureName: 'VFD for Chilled Water Pump',
    category: 'cooling',
    eligible: true,
    eligibilityReason: 'Motor efficiency measure with documented savings',
    utilityPrograms: [
      { utility: 'PGE', eligible: true, maxFinancing: 50000, interestRate: '0%', maxTerm: 60 },
      { utility: 'SCE', eligible: true, maxFinancing: 50000, interestRate: '0%', maxTerm: 60 },
      { utility: 'SDGE', eligible: true, maxFinancing: 50000, interestRate: '0%', maxTerm: 60 },
      { utility: 'LADWP', eligible: true, maxFinancing: 25000, interestRate: '0%', maxTerm: 48 },
    ],
    requirements: ['Motor must be 5 HP or larger'],
  },
  {
    measureId: 'cooling-tower-vfd',
    measureName: 'Cooling Tower Fan VFD',
    category: 'cooling',
    eligible: true,
    eligibilityReason: 'VFD installation with measurable energy savings',
    utilityPrograms: [
      { utility: 'PGE', eligible: true, maxFinancing: 75000, interestRate: '0%', maxTerm: 84 },
      { utility: 'SCE', eligible: true, maxFinancing: 75000, interestRate: '0%', maxTerm: 84 },
      { utility: 'SDGE', eligible: true, maxFinancing: 50000, interestRate: '0%', maxTerm: 84 },
      { utility: 'LADWP', eligible: true, maxFinancing: 40000, interestRate: '0%', maxTerm: 60 },
    ],
  },
  // Heating Systems
  {
    measureId: 'boiler-replacement',
    measureName: 'High-Efficiency Boiler Replacement',
    category: 'heating',
    eligible: true,
    eligibilityReason: 'Major heating equipment with documented efficiency improvement',
    utilityPrograms: [
      { utility: 'PGE', eligible: true, maxFinancing: 400000, interestRate: '0%', maxTerm: 120 }, // Updated 2026: increased from $200K
      { utility: 'SCE', eligible: true, maxFinancing: 200000, interestRate: '0%', maxTerm: 120 },
      { utility: 'SDGE', eligible: true, maxFinancing: 150000, interestRate: '0%', maxTerm: 120 },
      { utility: 'LADWP', eligible: true, maxFinancing: 100000, interestRate: '0%', maxTerm: 60 },
    ],
    requirements: ['Condensing boiler with 95%+ efficiency'],
  },
  {
    measureId: 'heat-pump-conversion',
    measureName: 'Heat Pump Conversion',
    category: 'heating',
    eligible: true,
    eligibilityReason: 'Electrification measure with significant energy savings',
    utilityPrograms: [
      { utility: 'PGE', eligible: true, maxFinancing: 150000, interestRate: '0%', maxTerm: 120 },
      { utility: 'SCE', eligible: true, maxFinancing: 150000, interestRate: '0%', maxTerm: 120 },
      { utility: 'SDGE', eligible: true, maxFinancing: 100000, interestRate: '0%', maxTerm: 120 },
      { utility: 'LADWP', eligible: true, maxFinancing: 75000, interestRate: '0%', maxTerm: 60 },
    ],
  },
  // Controls - Often NOT eligible without hardware
  {
    measureId: 'ems-software-only',
    measureName: 'EMS Software Upgrade Only',
    category: 'controls',
    eligible: false,
    eligibilityReason: 'Software-only measures typically not eligible for OBF',
    utilityPrograms: [
      { utility: 'PGE', eligible: false, notes: 'Must include hardware component' },
      { utility: 'SCE', eligible: false, notes: 'Must include hardware component' },
      { utility: 'SDGE', eligible: false, notes: 'Must include hardware component' },
      { utility: 'LADWP', eligible: false, notes: 'Must include hardware component' },
    ],
    exceptions: ['May qualify if bundled with hardware installation'],
  },
  {
    measureId: 'bms-installation',
    measureName: 'Building Management System Installation',
    category: 'controls',
    eligible: true,
    eligibilityReason: 'Hardware-based controls system',
    utilityPrograms: [
      { utility: 'PGE', eligible: true, maxFinancing: 100000, interestRate: '0%', maxTerm: 84 },
      { utility: 'SCE', eligible: true, maxFinancing: 100000, interestRate: '0%', maxTerm: 84 },
      { utility: 'SDGE', eligible: true, maxFinancing: 75000, interestRate: '0%', maxTerm: 84 },
      { utility: 'LADWP', eligible: true, maxFinancing: 50000, interestRate: '0%', maxTerm: 60 },
    ],
    requirements: ['Must include physical sensors and actuators', 'Documented savings calculations'],
  },
  // Lighting
  {
    measureId: 'led-retrofit',
    measureName: 'LED Lighting Retrofit',
    category: 'lighting',
    eligible: true,
    eligibilityReason: 'Standard efficiency measure with well-documented savings',
    utilityPrograms: [
      { utility: 'PGE', eligible: true, maxFinancing: 100000, interestRate: '0%', maxTerm: 60 },
      { utility: 'SCE', eligible: true, maxFinancing: 100000, interestRate: '0%', maxTerm: 60 },
      { utility: 'SDGE', eligible: true, maxFinancing: 75000, interestRate: '0%', maxTerm: 60 },
      { utility: 'LADWP', eligible: true, maxFinancing: 50000, interestRate: '0%', maxTerm: 48 },
    ],
  },
  // Motors
  {
    measureId: 'motor-replacement',
    measureName: 'Premium Efficiency Motor Replacement',
    category: 'motors',
    eligible: true,
    eligibilityReason: 'Standard motor efficiency upgrade',
    utilityPrograms: [
      { utility: 'PGE', eligible: true, maxFinancing: 50000, interestRate: '0%', maxTerm: 60 },
      { utility: 'SCE', eligible: true, maxFinancing: 50000, interestRate: '0%', maxTerm: 60 },
      { utility: 'SDGE', eligible: true, maxFinancing: 40000, interestRate: '0%', maxTerm: 60 },
      { utility: 'LADWP', eligible: true, maxFinancing: 30000, interestRate: '0%', maxTerm: 48 },
    ],
    requirements: ['NEMA Premium or better efficiency rating'],
  },
  // Plug Load - Often NOT eligible
  {
    measureId: 'smart-power-strips',
    measureName: 'Smart Power Strips',
    category: 'plugload',
    eligible: false,
    eligibilityReason: 'Small equipment purchases typically below minimum project cost',
    utilityPrograms: [
      { utility: 'PGE', eligible: false, notes: 'Below minimum project threshold' },
      { utility: 'SCE', eligible: false, notes: 'Below minimum project threshold' },
      { utility: 'SDGE', eligible: false, notes: 'Below minimum project threshold' },
      { utility: 'LADWP', eligible: false, notes: 'Below minimum project threshold' },
    ],
    exceptions: ['May qualify as part of larger project bundle'],
  },
];

// Helper functions
export const getOBFEligibility = (measureId: string): OBFEligibility | undefined => {
  return obfEligibilityDatabase.find(m => m.measureId === measureId);
};

export const getMeasuresByEligibility = (eligible: boolean): OBFEligibility[] => {
  return obfEligibilityDatabase.filter(m => m.eligible === eligible);
};

export const getEligibleMeasuresByUtility = (utility: UtilityProvider): OBFEligibility[] => {
  return obfEligibilityDatabase.filter(m => 
    m.utilityPrograms.some(p => p.utility === utility && p.eligible)
  );
};

export const getCategoryEligibility = (category: string): { generallyEligible: boolean; notes: string } => {
  return obfEligibilityByCategory[category] || { generallyEligible: false, notes: 'Unknown category' };
};

export default obfEligibilityDatabase;
