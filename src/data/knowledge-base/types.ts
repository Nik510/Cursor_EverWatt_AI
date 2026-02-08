/**
 * Knowledge Base Type Definitions
 * Core data structures for organizing all EverWatt training data
 */

// ============================================================================
// MASTER MEASURES LIST - Energy Efficiency Measures
// ============================================================================

export enum MeasureCategory {
  LIGHTING_CONTROLS = 'LIGHTING_CONTROLS',
  HVAC_COOLING = 'HVAC_COOLING',
  HVAC_HEATING = 'HVAC_HEATING',
  AIR_HANDLING = 'AIR_HANDLING',
  BUILDING_AUTOMATION = 'BUILDING_AUTOMATION',
  BUILDING_ENVELOPE = 'BUILDING_ENVELOPE',
  WATER_PLUMBING = 'WATER_PLUMBING',
  ELECTRICAL_MOTORS = 'ELECTRICAL_MOTORS',
  GAS_TO_ELECTRIC = 'GAS_TO_ELECTRIC',
  REFRIGERATION = 'REFRIGERATION',
  PUMPS_DISTRIBUTION = 'PUMPS_DISTRIBUTION',
  RENEWABLES_STORAGE = 'RENEWABLES_STORAGE',
  TRANSPORTATION_EV = 'TRANSPORTATION_EV',
  PROCESS_INDUSTRIAL = 'PROCESS_INDUSTRIAL',
  HEALTHCARE_SPECIFIC = 'HEALTHCARE_SPECIFIC',
  MEASUREMENT_VERIFICATION = 'MEASUREMENT_VERIFICATION',
}

export interface EnergyMeasure {
  id: string;
  name: string;
  category: MeasureCategory;
  description?: string;
  typicalPayback?: {
    min: number; // years
    max: number; // years
  };
  typicalSavings?: {
    percentage?: number; // % reduction
    kwhPerYear?: number;
    kwReduction?: number;
  };
  applicableVerticals?: VerticalMarket[];
  relatedEquipment?: string[]; // Equipment IDs
  tags?: string[];
}

// ============================================================================
// EQUIPMENT LIBRARY - HVAC, Lighting, etc.
// ============================================================================

export enum EquipmentType {
  // HVAC Cooling
  CHILLER_CENTRIFUGAL = 'CHILLER_CENTRIFUGAL',
  CHILLER_MAGNETIC = 'CHILLER_MAGNETIC',
  CHILLER_SCREW = 'CHILLER_SCREW',
  CHILLER_SCROLL = 'CHILLER_SCROLL',
  CHILLER_ABSORPTION = 'CHILLER_ABSORPTION',
  RTU = 'RTU',
  VRF_VRF = 'VRF_VRF',
  COOLING_TOWER = 'COOLING_TOWER',
  ECONOBIZER = 'ECONOBIZER',
  
  // HVAC Heating
  BOILER_STEAM = 'BOILER_STEAM',
  BOILER_HOT_WATER = 'BOILER_HOT_WATER',
  BOILER_CONDENSING = 'BOILER_CONDENSING',
  BOILER_NON_CONDENSING = 'BOILER_NON_CONDENSING',
  HEAT_PUMP_AIR = 'HEAT_PUMP_AIR',
  HEAT_PUMP_WATER = 'HEAT_PUMP_WATER',
  HPWH = 'HPWH',
  
  // Lighting
  LED_TROFFER = 'LED_TROFFER',
  LED_HIGH_BAY = 'LED_HIGH_BAY',
  LED_AREA_LIGHT = 'LED_AREA_LIGHT',
  LED_LINEAR = 'LED_LINEAR',
  OCCUPANCY_SENSOR = 'OCCUPANCY_SENSOR',
  DAYLIGHT_SENSOR = 'DAYLIGHT_SENSOR',
  NLC_SYSTEM = 'NLC_SYSTEM',
  
  // Controls
  VFD = 'VFD',
  BMS_EMS = 'BMS_EMS',
  SMART_THERMOSTAT = 'SMART_THERMOSTAT',
  
  // Storage
  BATTERY_BESS = 'BATTERY_BESS',
  THERMAL_STORAGE = 'THERMAL_STORAGE',
  
  // Other
  EV_CHARGER = 'EV_CHARGER',
  SOLAR_PV = 'SOLAR_PV',
}

export interface EquipmentSpec {
  id: string;
  type: EquipmentType;
  name: string;
  manufacturer?: string;
  model?: string;
  
  // Visual Identification
  visualId: {
    description: string;
    whereFound: string; // "On roof", "Mechanical room", etc.
    visualCues: string[];
    photos?: string[]; // Image URLs or base64
  };
  
  // Technical Specifications
  specifications: {
    capacity?: {
      value: number;
      unit: 'tons' | 'btu' | 'kw' | 'kwh' | 'cfm';
    };
    efficiency?: {
      cop?: number;
      eer?: number;
      seer?: number;
      ieer?: number;
      kwPerTon?: number;
    };
    power?: {
      min: number;
      max: number;
      unit: 'kw' | 'hp';
    };
  };
  
  // Operational Characteristics
  typicalRuntime?: {
    hoursPerYear?: number;
    partLoadFactor?: number;
  };
  
  // Energy Impact
  energyBaseline?: {
    kwhPerYear?: number;
    kwPeak?: number;
  };
  
  // Common Issues / Red Flags
  redFlags?: string[];
  
  // Optimization Opportunities
  optimizationOpportunities?: {
    measure: string;
    typicalSavings: number; // percentage or $/year
    payback?: number; // years
  }[];
  
  // Related Content
  trainingContentId?: string;
  relatedMeasures?: string[]; // Measure IDs
}

// ============================================================================
// TRAINING CONTENT
// ============================================================================

export interface TrainingContent {
  id: string;
  title: string;
  subtitle?: string;
  category: MeasureCategory | EquipmentType;
  
  // Content Sections
  sections: {
    identification?: {
      whatIsIt: string;
      whereToFind: string;
      visualCues: string[];
    };
    auditChecklist?: {
      redFlags: string[];
      items: {
        category: string;
        items: string[];
      }[];
    };
    optimizationPlaybook?: {
      whyImportant: string;
      standardECMs: string[];
      physics?: string; // Technical explanation
    };
    engineerVocabulary?: {
      term: string;
      definition: string;
      salesHook?: string;
    }[];
    technicalDiagrams?: {
      type: 'schematic' | 'flowchart' | 'comparison';
      title: string;
      description: string;
      imageUrl?: string;
    }[];
  };
  
  // Related Equipment
  relatedEquipment?: string[]; // Equipment IDs
  
  // Vertical-Specific Content
  verticalSpecific?: {
    vertical: VerticalMarket;
    challenges: string[];
    opportunities: string[];
    caseStudy?: string;
  }[];
}

// ============================================================================
// VERTICAL MARKETS
// ============================================================================

export enum VerticalMarket {
  HOSPITAL = 'HOSPITAL',
  OFFICE = 'OFFICE',
  MANUFACTURING = 'MANUFACTURING',
  RETAIL = 'RETAIL',
  WAREHOUSE = 'WAREHOUSE',
  SCHOOL = 'SCHOOL',
  HOTEL = 'HOTEL',
  DATA_CENTER = 'DATA_CENTER',
  LABORATORY = 'LABORATORY',
  GROCERY = 'GROCERY',
}

export interface VerticalProfile {
  vertical: VerticalMarket;
  name: string;
  description: string;
  
  // Energy Profile
  typicalLoadProfile: {
    peakDemand: {
      min: number; // kW
      max: number; // kW
    };
    annualUsage: {
      min: number; // kWh
      max: number; // kWh
    };
    loadFactor?: number; // average/peak
  };
  
  // Key Challenges
  keyChallenges: string[];
  
  // Decarbonization Strategy
  decarbonizationFocus: string;
  electrificationOpportunities: string[];
  
  // Priority Measures
  priorityMeasures: {
    measureId: string;
    priority: 'high' | 'medium' | 'low';
    rationale: string;
  }[];
  
  // Equipment Commonly Found
  commonEquipment: EquipmentType[];
}

// ============================================================================
// CALCULATION MODELS / FORMULAS
// ============================================================================

export interface CalculationModel {
  id: string;
  name: string;
  description: string;
  category: MeasureCategory | EquipmentType;
  
  // Formula Definition
  formula: {
    type: 'savings' | 'sizing' | 'efficiency';
    equation: string; // Mathematical notation
    variables: {
      name: string;
      description: string;
      unit: string;
      required: boolean;
    }[];
  };
  
  // Implementation
  implementation?: {
    functionName: string;
    parameters: string[];
    returns: string;
  };
  
  // References
  references?: {
    standard?: string; // "ASHRAE 90.1", "IEEE 1547", etc.
    manual?: string; // Link to training manual
  };
}

// ============================================================================
// AI PROMPTING & FRAMEWORK
// ============================================================================

export interface AIPromptTemplate {
  id: string;
  name: string;
  purpose: string; // "generate_training", "polish_audit_note", etc.
  
  systemInstruction: string;
  userPrompt: string;
  
  variables?: {
    name: string;
    description: string;
    example: string;
  }[];
  
  expectedOutput?: {
    format: 'text' | 'json' | 'markdown';
    schema?: any; // JSON schema if JSON format
  };
}

// ============================================================================
// UTILITY RATES & INCENTIVES
// ============================================================================

export enum UtilityProvider {
  PGE = 'PGE',
  SCE = 'SCE',
  SDGE = 'SDGE',
  LADWP = 'LADWP',
  OTHER = 'OTHER',
}

export interface RateStructure {
  id: string;
  provider: UtilityProvider;
  rateName: string;
  description: string;
  
  // Rate Components
  energyCharges: {
    peak?: number; // $/kWh
    offPeak?: number; // $/kWh
    midPeak?: number; // $/kWh
    tier1?: number;
    tier2?: number;
  };
  
  demandCharges: {
    peak?: number; // $/kW/month
    partPeak?: number;
    offPeak?: number;
    season?: 'summer' | 'winter' | 'all';
  };
  
  // TOU Periods
  touPeriods?: {
    peak: {
      start: string; // "HH:MM"
      end: string;
      days: string[]; // ["weekday", "weekend"]
      season?: 'summer' | 'winter';
    }[];
  };
}

export interface IncentiveProgram {
  id: string;
  provider: UtilityProvider;
  programName: string;
  description: string;
  
  // Eligibility
  eligibleMeasures: string[]; // Measure IDs
  eligibleVerticals?: VerticalMarket[];
  
  // Incentive Details
  incentiveType: 'rebate' | 'tariff' | 'financing';
  incentiveAmount?: {
    perUnit?: number; // $ per fixture/kW/etc.
    percentage?: number; // % of cost
    maxAmount?: number; // $ maximum
  };
  
  // Requirements
  requirements?: string[];
  expirationDate?: string;
}

// ============================================================================
// HISTORICAL PROJECTS
// ============================================================================

export interface HistoricalProject {
  id: string;
  projectName: string;
  clientName?: string;
  vertical: VerticalMarket;
  dateCompleted: string;
  
  // Project Details
  measuresImplemented: {
    measureId: string;
    quantity?: number;
    cost?: number;
  }[];
  
  // Results
  results: {
    annualSavingsKwh: number;
    annualSavingsDollars: number;
    peakReductionKw?: number;
    paybackPeriod?: number; // years
    actualSavings?: number; // M&V results if available
  };
  
  // Lessons Learned
  lessonsLearned?: string[];
  challenges?: string[];
}

// ============================================================================
// SEARCH & QUERY
// ============================================================================

export interface KnowledgeBaseQuery {
  search?: string;
  category?: MeasureCategory;
  equipmentType?: EquipmentType;
  vertical?: VerticalMarket;
  tags?: string[];
  limit?: number;
}

export interface KnowledgeBaseResult {
  measures?: EnergyMeasure[];
  equipment?: EquipmentSpec[];
  trainingContent?: TrainingContent[];
  verticals?: VerticalProfile[];
}

