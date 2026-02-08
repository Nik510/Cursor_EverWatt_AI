/**
 * Generate Comprehensive HVAC Database
 * Expand all equipment types with detailed information similar to lighting compendium
 */

import * as fs from 'fs';
import * as path from 'path';
import { masterEEDatabase } from '../data/master-ee-database';

interface DetailedEquipment {
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
    whenToUpgrade: {
      age?: string;
      condition?: string;
      efficiency?: string;
      cost?: string;
    };
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
  
  // Engineer vs Sales Perspectives
  perspectives?: {
    engineer?: {
      technicalExplanation: string;
      formulas?: Array<{ name: string; formula: string; explanation: string }>;
    };
    sales?: {
      salesPitch: string;
      tradeSecrets: string[];
      commonObjections: Array<{ objection: string; response: string }>;
    };
  };
}

// Generate detailed equipment info based on measure name
function generateEquipmentDetails(measureName: string, category: string, subcategory: string): DetailedEquipment {
  const id = measureName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  // Base structure
  const equipment: DetailedEquipment = {
    id,
    name: measureName,
    category,
    subcategory,
    identification: {
      physicalCharacteristics: [],
      keyComponents: [],
      typicalSizes: 'Varies',
      nameplateInfo: [],
      howToIdentify: [],
      typicalManufacturers: [],
    },
    specifications: {
      capacityRange: 'Varies by application',
      efficiencyRange: 'Varies',
      efficiencyMetrics: [],
      typicalEfficiency: 'Varies',
      operatingConditions: 'Standard',
    },
    applications: {
      typicalLocations: [],
      buildingTypes: [],
      useCases: [],
      commonConfigurations: [],
    },
    replacement: {
      recommendedUpgrade: 'Evaluate on case-by-case basis',
      upgradeReason: 'Improve efficiency and reduce energy costs',
      whenToUpgrade: {},
      priority: 'Medium',
      typicalPaybackYears: '5-10 years',
      energySavingsPercent: '10-30%',
      notes: [],
    },
    bestPractices: {
      maintenance: [],
      optimization: [],
      commonIssues: [],
      troubleshooting: [],
    },
  };

  // Generate specific details based on equipment type
  generateSpecificDetails(equipment, measureName, category, subcategory);
  
  return equipment;
}

function generateSpecificDetails(equipment: DetailedEquipment, name: string, category: string, subcategory: string) {
  const lowerName = name.toLowerCase();
  
  // COOLING SYSTEMS
  if (category === 'COOLING SYSTEMS') {
    if (lowerName.includes('centrifugal')) {
      equipment.identification = {
        physicalCharacteristics: [
          'Large cylindrical compressor housing',
          'Centrifugal impeller design',
          'Water-cooled condenser',
          'Typically 200+ tons capacity',
        ],
        keyComponents: ['Centrifugal compressor', 'Evaporator', 'Condenser', 'Expansion device'],
        typicalSizes: '200-2000+ tons',
        nameplateInfo: ['Model number', 'Tonnage', 'EER or kW/ton', 'Refrigerant type', 'Year'],
        howToIdentify: [
          'Look for centrifugal compressor (large, cylindrical)',
          'Check nameplate for model',
          'Water-cooled condenser',
          'Large capacity (typically 200+ tons)',
        ],
        typicalManufacturers: ['Trane', 'Carrier', 'York', 'McQuay', 'Daikin'],
      };
      equipment.specifications = {
        capacityRange: '200-2000+ tons',
        efficiencyRange: '0.50-0.70 kW/ton (EER 17-24)',
        efficiencyMetrics: ['kW/ton', 'EER', 'COP'],
        typicalEfficiency: '0.60 kW/ton (EER 20)',
        powerRange: '100-1400+ kW',
        operatingConditions: 'Water-cooled, typically 44°F CHW, 85°F CWS',
      };
      equipment.replacement.priority = 'High';
      equipment.replacement.typicalPaybackYears = '5-10 years';
      equipment.replacement.energySavingsPercent = '20-30%';
      
      if (lowerName.includes('vfd')) {
        equipment.replacement.recommendedUpgrade = 'Magnetic-bearing centrifugal';
        equipment.replacement.priority = 'Optimize';
      } else if (lowerName.includes('magnetic')) {
        equipment.replacement.recommendedUpgrade = 'Keep or optimize controls';
        equipment.replacement.priority = 'Optimize';
      } else {
        equipment.replacement.recommendedUpgrade = 'VFD centrifugal or magnetic-bearing';
      }
    }
    
    else if (lowerName.includes('screw')) {
      equipment.identification = {
        physicalCharacteristics: [
          'Helical screw compressor',
          'Twin-screw or single-screw design',
          'Air-cooled or water-cooled',
          'Smaller than centrifugal',
        ],
        keyComponents: ['Screw compressor', 'Evaporator', 'Condenser', 'Oil separator'],
        typicalSizes: '50-500 tons',
        nameplateInfo: ['Model', 'Tonnage', 'EER', 'Refrigerant'],
        howToIdentify: ['Screw compressor (helical design)', 'Smaller than centrifugal', 'Oil system visible'],
        typicalManufacturers: ['Trane', 'Carrier', 'York', 'McQuay', 'Daikin'],
      };
      equipment.specifications = {
        capacityRange: '50-500 tons',
        efficiencyRange: '0.55-0.75 kW/ton (EER 16-22)',
        efficiencyMetrics: ['kW/ton', 'EER', 'COP'],
        typicalEfficiency: '0.65 kW/ton (EER 18.5)',
        powerRange: '30-375 kW',
        operatingConditions: 'Air-cooled or water-cooled',
      };
      equipment.replacement.priority = 'High';
      equipment.replacement.typicalPaybackYears = '4-8 years';
      equipment.replacement.energySavingsPercent = '15-25%';
      if (!lowerName.includes('vfd')) {
        equipment.replacement.recommendedUpgrade = 'VFD screw or high-efficiency screw';
      }
    }
    
    else if (lowerName.includes('scroll')) {
      equipment.identification = {
        physicalCharacteristics: [
          'Scroll compressor (spiral design)',
          'Smaller than screw',
          'Often modular/multi-scroll',
          'Packaged design',
        ],
        keyComponents: ['Scroll compressor(s)', 'Evaporator', 'Condenser'],
        typicalSizes: '5-150 tons',
        nameplateInfo: ['Model', 'Tonnage', 'EER'],
        howToIdentify: ['Scroll compressor (spiral, not screw)', 'Smaller capacity', 'Packaged design'],
        typicalManufacturers: ['Trane', 'Carrier', 'McQuay', 'Daikin'],
      };
      equipment.specifications = {
        capacityRange: '5-150 tons',
        efficiencyRange: '0.60-0.80 kW/ton (EER 15-20)',
        efficiencyMetrics: ['kW/ton', 'EER'],
        typicalEfficiency: '0.70 kW/ton (EER 17)',
        powerRange: '3-105 kW',
        operatingConditions: 'Air-cooled or water-cooled',
      };
      equipment.replacement.priority = 'Medium-High';
      equipment.replacement.typicalPaybackYears = '4-7 years';
      equipment.replacement.energySavingsPercent = '20-30%';
      equipment.replacement.recommendedUpgrade = 'High-efficiency scroll or VRF';
    }
    
    else if (lowerName.includes('cooling tower')) {
      equipment.identification = {
        physicalCharacteristics: [
          'Fill media visible',
          'Fan(s) on top or side',
          'Basin at bottom',
          'Water spray system',
        ],
        keyComponents: ['Fill media', 'Fan(s)', 'Drift eliminators', 'Basin', 'Nozzles'],
        typicalSizes: '50-5000+ tons',
        nameplateInfo: ['Model', 'Tonnage', 'Fan HP', 'Year'],
        howToIdentify: ['Look for fill media and fans', 'Check for drift eliminators', 'Basin at bottom'],
        typicalManufacturers: ['Baltimore Aircoil', 'Evapco', 'Marley', 'Cooling Tower Systems'],
      };
      equipment.specifications = {
        capacityRange: '50-5000+ tons',
        efficiencyRange: 'Approach: 4-10°F',
        efficiencyMetrics: ['Approach temperature', 'Range', 'Fan power'],
        typicalEfficiency: 'Approach 7°F',
        powerRange: 'Fan: 5-500+ HP',
        operatingConditions: 'Wet bulb dependent',
      };
      equipment.replacement.priority = 'High';
      equipment.replacement.typicalPaybackYears = '2-5 years';
      equipment.replacement.energySavingsPercent = '30-50%';
      if (lowerName.includes('replacement')) {
        equipment.replacement.recommendedUpgrade = 'High-efficiency tower with VFD fans and EC motors';
      } else {
        equipment.replacement.recommendedUpgrade = 'VFD fans + EC motors + fill upgrade';
      }
    }
    
    // Fill in other cooling equipment...
  }
  
  // HEATING SYSTEMS
  else if (category === 'HEATING SYSTEMS') {
    if (lowerName.includes('condensing boiler')) {
      equipment.identification = {
        physicalCharacteristics: [
          'Condensing heat exchanger',
          'Plastic vent (PVC)',
          'High efficiency rating',
          'Condensate drain',
        ],
        keyComponents: ['Condensing heat exchanger', 'Burner', 'Pump', 'Controls'],
        typicalSizes: '50-2000+ MBH',
        nameplateInfo: ['Model', 'MBH', 'AFUE', 'Year'],
        howToIdentify: ['PVC vent (not metal)', 'Condensate drain visible', 'High AFUE (90%+)'],
        typicalManufacturers: ['Burnham', 'Weil-McLain', 'Lochinvar', 'Viessmann'],
      };
      equipment.specifications = {
        capacityRange: '50-2000+ MBH',
        efficiencyRange: 'AFUE 90-98%',
        efficiencyMetrics: ['AFUE', 'Thermal efficiency'],
        typicalEfficiency: 'AFUE 95%',
        operatingConditions: 'Low return water temp for condensing',
      };
      equipment.replacement.priority = 'Optimize';
      equipment.replacement.recommendedUpgrade = 'Keep or optimize controls';
    }
    
    else if (lowerName.includes('vrf') || lowerName.includes('vrv') || lowerName.includes('heat pump system')) {
      equipment.identification = {
        physicalCharacteristics: [
          'Outdoor condensing unit',
          'Multiple indoor units',
          'Refrigerant piping',
          'Variable refrigerant flow',
        ],
        keyComponents: ['Outdoor unit', 'Indoor units', 'Refrigerant piping', 'Controls'],
        typicalSizes: '5-100+ tons',
        nameplateInfo: ['Model', 'Tonnage', 'COP', 'Year'],
        howToIdentify: ['Multiple indoor units connected to one outdoor', 'Refrigerant piping (not water)', 'Variable capacity'],
        typicalManufacturers: ['Daikin', 'Mitsubishi', 'LG', 'Fujitsu', 'Carrier'],
      };
      equipment.specifications = {
        capacityRange: '5-100+ tons',
        efficiencyRange: 'COP 3.5-5.5 (heating), EER 12-19 (cooling)',
        efficiencyMetrics: ['COP', 'EER', 'IPLV'],
        typicalEfficiency: 'COP 4.5, EER 15',
        operatingConditions: 'Air-source or water-source',
      };
      equipment.replacement.priority = 'Optimize';
      equipment.replacement.recommendedUpgrade = 'Keep or optimize controls';
    }
  }
  
  // Add common applications
  if (equipment.applications.typicalLocations.length === 0) {
    if (category === 'COOLING SYSTEMS') {
      equipment.applications.typicalLocations = ['Office buildings', 'Hospitals', 'Data centers', 'Manufacturing'];
      equipment.applications.buildingTypes = ['Commercial', 'Institutional', 'Industrial'];
    } else if (category === 'HEATING SYSTEMS') {
      equipment.applications.typicalLocations = ['All building types'];
      equipment.applications.buildingTypes = ['Commercial', 'Residential'];
    }
  }
  
  // Add common best practices
  if (equipment.bestPractices.maintenance.length === 0) {
    equipment.bestPractices.maintenance = [
      'Regular inspection',
      'Clean coils/filters',
      'Check refrigerant charge (if applicable)',
      'Monitor performance',
    ];
    equipment.bestPractices.optimization = [
      'Optimize setpoints',
      'Proper sequencing',
      'Maintain equipment',
      'Control optimization',
    ];
  }
}

async function generateComprehensiveDatabase() {
  console.log('🔧 Generating Comprehensive HVAC Database...');
  console.log();

  const allEquipment: DetailedEquipment[] = [];
  
  // Process all measures from the master database
  for (const category of masterEEDatabase.categories) {
    // Focus on HVAC-related categories first
    const hvacCategories = [
      'COOLING SYSTEMS',
      'HEATING SYSTEMS',
      'VENTILATION + AIR DISTRIBUTION',
      'HVAC CONTROLS & ENERGY MANAGEMENT',
    ];
    
    if (!hvacCategories.includes(category.name)) continue;
    
    for (const subcategory of category.subcategories) {
      for (const measure of subcategory.measures) {
        const equipment = generateEquipmentDetails(
          measure.name,
          category.name,
          subcategory.name
        );
        allEquipment.push(equipment);
      }
    }
  }

  // Save to file
  const outputDir = path.join(process.cwd(), 'src', 'data', 'hvac');
  const outputFile = path.join(outputDir, 'comprehensive-hvac-database.ts');
  
  const tsContent = `/**
 * COMPREHENSIVE HVAC DATABASE
 * Detailed information for all HVAC equipment types
 * Generated: ${new Date().toISOString()}
 */

export interface DetailedHVACEquipment {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  identification: {
    physicalCharacteristics: string[];
    keyComponents: string[];
    typicalSizes: string;
    nameplateInfo: string[];
    howToIdentify: string[];
    typicalManufacturers: string[];
  };
  specifications: {
    capacityRange: string;
    efficiencyRange: string;
    efficiencyMetrics: string[];
    typicalEfficiency: string;
    powerRange?: string;
    operatingConditions: string;
  };
  applications: {
    typicalLocations: string[];
    buildingTypes: string[];
    useCases: string[];
    commonConfigurations: string[];
  };
  replacement: {
    recommendedUpgrade: string;
    upgradeReason: string;
    whenToUpgrade: {
      age?: string;
      condition?: string;
      efficiency?: string;
      cost?: string;
    };
    priority: 'Critical' | 'High' | 'Medium' | 'Low' | 'Optimize';
    typicalPaybackYears: string;
    energySavingsPercent: string;
    notes: string[];
  };
  bestPractices: {
    maintenance: string[];
    optimization: string[];
    commonIssues: string[];
    troubleshooting: string[];
  };
}

export const comprehensiveHVACDatabase: DetailedHVACEquipment[] = ${JSON.stringify(allEquipment, null, 2)};

export function findHVACEquipmentByName(name: string): DetailedHVACEquipment | undefined {
  return comprehensiveHVACDatabase.find(eq => 
    eq.name.toLowerCase().includes(name.toLowerCase()) ||
    name.toLowerCase().includes(eq.name.toLowerCase())
  );
}

export function getHVACEquipmentByCategory(category: string): DetailedHVACEquipment[] {
  return comprehensiveHVACDatabase.filter(eq => 
    eq.category.toLowerCase().includes(category.toLowerCase())
  );
}

export function getHVACEquipmentBySubcategory(subcategory: string): DetailedHVACEquipment[] {
  return comprehensiveHVACDatabase.filter(eq => 
    eq.subcategory.toLowerCase().includes(subcategory.toLowerCase())
  );
}
`;

  fs.writeFileSync(outputFile, tsContent, 'utf-8');
  
  console.log(`✅ Generated ${allEquipment.length} equipment entries`);
  console.log(`   Saved to: ${outputFile}`);
}

generateComprehensiveDatabase().catch(console.error);

