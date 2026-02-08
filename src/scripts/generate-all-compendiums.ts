/**
 * Generate Comprehensive Compendiums for ALL Technology Categories
 * Creates detailed entries for refrigeration, envelope, motors, electrical, etc.
 */

import * as fs from 'fs';
import * as path from 'path';
import { masterEEDatabase } from '../data/master-ee-database';
import type { EEMeasure } from '../data/master-ee-database';
import type { DetailedEquipment } from '../data/equipment/comprehensive-equipment-database';

interface EquipmentTemplate {
  namePattern: RegExp;
  details: Partial<DetailedEquipment>;
}

// Templates for different equipment types
const equipmentTemplates: EquipmentTemplate[] = [
  // REFRIGERATION
  {
    namePattern: /refrigeration|refrigerator|freezer|cooler/i,
    details: {
      category: 'REFRIGERATION',
      identification: {
        physicalCharacteristics: ['Refrigeration equipment', 'Condensing unit', 'Evaporator coils'],
        keyComponents: ['Compressor', 'Evaporator', 'Condenser', 'Expansion valve'],
        typicalSizes: 'Varies by application',
        nameplateInfo: ['Model', 'Capacity', 'Refrigerant type', 'Year'],
        howToIdentify: ['Look for refrigeration nameplate', 'Check compressor type', 'Identify refrigerant'],
        typicalManufacturers: ['Carrier', 'Trane', 'Lennox', 'York'],
      },
      specifications: {
        capacityRange: 'Varies',
        efficiencyRange: 'Varies by type',
        efficiencyMetrics: ['COP', 'EER', 'kW/ton'],
        typicalEfficiency: 'Varies',
        operatingConditions: 'Refrigeration',
      },
      applications: {
        typicalLocations: ['Supermarkets', 'Restaurants', 'Food service', 'Cold storage'],
        buildingTypes: ['Commercial', 'Retail', 'Food service'],
        useCases: ['Food preservation', 'Cold storage'],
        commonConfigurations: [],
      },
      replacement: {
        recommendedUpgrade: 'High-efficiency refrigeration system',
        upgradeReason: 'Modern systems provide significant energy savings',
        whenToUpgrade: {
          age: 'If >10 years old',
          efficiency: 'If high energy consumption',
        },
        priority: 'High',
        typicalPaybackYears: '5-8 years',
        energySavingsPercent: '20-40%',
        notes: [],
      },
      bestPractices: {
        maintenance: ['Regular cleaning', 'Coil maintenance', 'Refrigerant checks', 'Door seal inspection'],
        optimization: ['Proper temperature settings', 'Door management', 'Defrost optimization', 'Heat reclaim'],
        commonIssues: ['Door seal leaks', 'Frost buildup', 'Compressor issues'],
        troubleshooting: [],
      },
    },
  },
  
  // MOTORS
  {
    namePattern: /motor|ecm|nema|premium/i,
    details: {
      category: 'MOTORS & ELECTRICAL SYSTEMS',
      identification: {
        physicalCharacteristics: ['Motor housing', 'Nameplate with specs', 'Mounting bracket'],
        keyComponents: ['Stator', 'Rotor', 'Bearings', 'Shaft'],
        typicalSizes: 'Varies by HP rating',
        nameplateInfo: ['HP', 'Voltage', 'RPM', 'Efficiency', 'Frame size'],
        howToIdentify: ['Check nameplate', 'Measure frame size', 'Identify mounting type'],
        typicalManufacturers: ['Baldor', 'Toshiba', 'Siemens', 'ABB'],
      },
      specifications: {
        capacityRange: 'Varies by HP',
        efficiencyRange: 'Standard: 85-90%, Premium: 90-95%, ECM: 85-95%',
        efficiencyMetrics: ['Motor efficiency', 'Power factor'],
        typicalEfficiency: 'Varies by type',
        powerRange: 'Varies by HP',
        operatingConditions: 'Continuous duty',
      },
      applications: {
        typicalLocations: ['HVAC equipment', 'Pumps', 'Fans', 'Industrial equipment'],
        buildingTypes: ['All'],
        useCases: ['Mechanical systems', 'Process equipment'],
        commonConfigurations: [],
      },
      replacement: {
        recommendedUpgrade: 'NEMA Premium or ECM motor',
        upgradeReason: 'Higher efficiency reduces energy consumption',
        whenToUpgrade: {
          age: 'If >15 years old',
          efficiency: 'If below premium efficiency',
        },
        priority: 'High',
        typicalPaybackYears: '3-7 years',
        energySavingsPercent: '5-15%',
        notes: [],
      },
      bestPractices: {
        maintenance: ['Regular lubrication', 'Bearing inspection', 'Alignment checks', 'Cleaning'],
        optimization: ['Right-sizing', 'Variable speed control', 'Power factor correction'],
        commonIssues: ['Bearing wear', 'Overheating', 'Misalignment'],
        troubleshooting: [],
      },
    },
  },
  
  // INSULATION
  {
    namePattern: /insulation|insulate|roof|wall|pipe|duct/i,
    details: {
      category: 'ENVELOPE & INSULATION',
      identification: {
        physicalCharacteristics: ['Insulation material visible', 'Thickness', 'R-value'],
        keyComponents: ['Insulation material', 'Vapor barrier', 'Protective covering'],
        typicalSizes: 'Varies by R-value and thickness',
        nameplateInfo: ['R-value', 'Material type', 'Thickness'],
        howToIdentify: ['Measure thickness', 'Check material type', 'Determine R-value'],
        typicalManufacturers: ['Owens Corning', 'Johns Manville', 'CertainTeed', 'Knauf'],
      },
      specifications: {
        capacityRange: 'Varies by R-value',
        efficiencyRange: 'R-value dependent',
        efficiencyMetrics: ['R-value', 'U-factor'],
        typicalEfficiency: 'Varies by material and thickness',
        operatingConditions: 'Building envelope',
      },
      applications: {
        typicalLocations: ['Roofs', 'Walls', 'Attics', 'Crawl spaces', 'Pipes', 'Ducts'],
        buildingTypes: ['All'],
        useCases: ['Thermal insulation', 'Energy conservation'],
        commonConfigurations: [],
      },
      replacement: {
        recommendedUpgrade: 'Higher R-value insulation',
        upgradeReason: 'Better insulation reduces heating and cooling loads',
        whenToUpgrade: {
          age: 'If >20 years old',
          condition: 'If damaged or compressed',
          efficiency: 'If below current code requirements',
        },
        priority: 'Medium',
        typicalPaybackYears: '5-15 years',
        energySavingsPercent: '10-30%',
        notes: [],
      },
      bestPractices: {
        maintenance: ['Inspect for damage', 'Check for compression', 'Monitor moisture'],
        optimization: ['Proper installation', 'Air sealing', 'Vapor barrier placement'],
        commonIssues: ['Moisture damage', 'Compression', 'Gaps'],
        troubleshooting: [],
      },
    },
  },
  
  // WINDOWS
  {
    namePattern: /window|double.pane|triple.pane|low.e|film|tint/i,
    details: {
      category: 'ENVELOPE & INSULATION',
      identification: {
        physicalCharacteristics: ['Glass panes', 'Frame material', 'Glazing type'],
        keyComponents: ['Glass', 'Frame', 'Seal', 'Hardware'],
        typicalSizes: 'Varies by opening size',
        nameplateInfo: ['U-factor', 'SHGC', 'VT', 'Glazing type'],
        howToIdentify: ['Count glass panes', 'Check frame material', 'Look for low-E coating'],
        typicalManufacturers: ['Pella', 'Andersen', 'Marvin', 'Jeld-Wen'],
      },
      specifications: {
        capacityRange: 'Varies by size',
        efficiencyRange: 'U-factor 0.2-1.2, SHGC varies',
        efficiencyMetrics: ['U-factor', 'SHGC', 'VT', 'R-value'],
        typicalEfficiency: 'U-factor 0.3-0.5 for double pane',
        operatingConditions: 'Building envelope',
      },
      applications: {
        typicalLocations: ['Exterior walls', 'Skylights', 'Storefronts'],
        buildingTypes: ['All'],
        useCases: ['Daylighting', 'Views', 'Ventilation'],
        commonConfigurations: [],
      },
      replacement: {
        recommendedUpgrade: 'High-performance double or triple pane windows',
        upgradeReason: 'Better thermal performance reduces HVAC loads',
        whenToUpgrade: {
          age: 'If >20 years old',
          condition: 'If drafty or failing',
          efficiency: 'If U-factor >0.5',
        },
        priority: 'Medium',
        typicalPaybackYears: '10-20 years',
        energySavingsPercent: '5-15%',
        notes: [],
      },
      bestPractices: {
        maintenance: ['Regular cleaning', 'Weatherstripping replacement', 'Hardware maintenance'],
        optimization: ['Proper installation', 'Air sealing', 'Window treatments'],
        commonIssues: ['Air leakage', 'Condensation', 'Hardware failure'],
        troubleshooting: [],
      },
    },
  },
  
  // HOT WATER / PLUMBING
  {
    namePattern: /hot.water|hpwh|water.heater|dhw|plumbing|fixture|faucet|toilet/i,
    details: {
      category: 'HOT WATER & PLUMBING',
      identification: {
        physicalCharacteristics: ['Water heater tank', 'Plumbing fixtures', 'Pipes'],
        keyComponents: ['Heater', 'Storage tank', 'Piping', 'Controls'],
        typicalSizes: 'Varies by capacity',
        nameplateInfo: ['Capacity', 'Efficiency', 'Fuel type', 'Year'],
        howToIdentify: ['Check fuel type', 'Measure capacity', 'Read nameplate'],
        typicalManufacturers: ['A.O. Smith', 'Rheem', 'Bradford White', 'State'],
      },
      specifications: {
        capacityRange: 'Varies by application',
        efficiencyRange: 'EF 0.5-2.0 for water heaters',
        efficiencyMetrics: ['EF', 'UEF', 'Energy factor'],
        typicalEfficiency: 'EF 0.6-0.9 standard, 2.0+ for HPWH',
        operatingConditions: 'Water heating',
      },
      applications: {
        typicalLocations: ['Basements', 'Mechanical rooms', 'Kitchens', 'Bathrooms'],
        buildingTypes: ['All'],
        useCases: ['Domestic hot water', 'Sanitary fixtures'],
        commonConfigurations: [],
      },
      replacement: {
        recommendedUpgrade: 'Heat pump water heater or high-efficiency unit',
        upgradeReason: 'Significant energy savings with modern technology',
        whenToUpgrade: {
          age: 'If >10 years old',
          efficiency: 'If EF <0.7',
        },
        priority: 'High',
        typicalPaybackYears: '3-8 years',
        energySavingsPercent: '30-60%',
        notes: [],
      },
      bestPractices: {
        maintenance: ['Regular flushing', 'Anode rod replacement', 'Temperature settings', 'Pipe insulation'],
        optimization: ['Right-sizing', 'Temperature optimization', 'Low-flow fixtures', 'Recirculation control'],
        commonIssues: ['Sediment buildup', 'Leaks', 'Inefficient operation'],
        troubleshooting: [],
      },
    },
  },
  
  // ELECTRICAL INFRASTRUCTURE
  {
    namePattern: /transformer|panel|submeter|power.factor|harmonic|load.balancing|electrical/i,
    details: {
      category: 'MOTORS & ELECTRICAL SYSTEMS',
      identification: {
        physicalCharacteristics: ['Electrical equipment', 'Transformers', 'Panelboards', 'Meters'],
        keyComponents: ['Transformer core', 'Switches', 'Breakers', 'Meters'],
        typicalSizes: 'Varies by capacity',
        nameplateInfo: ['KVA', 'Voltage', 'Amperage', 'Efficiency'],
        howToIdentify: ['Check nameplate', 'Measure dimensions', 'Identify type'],
        typicalManufacturers: ['Siemens', 'Schneider', 'ABB', 'Eaton'],
      },
      specifications: {
        capacityRange: 'Varies by application',
        efficiencyRange: 'Transformer: 95-99%',
        efficiencyMetrics: ['Efficiency', 'Power factor', 'Harmonic distortion'],
        typicalEfficiency: 'Varies by type',
        powerRange: 'Varies',
        operatingConditions: 'Electrical distribution',
      },
      applications: {
        typicalLocations: ['Electrical rooms', 'Mechanical rooms', 'Distribution panels'],
        buildingTypes: ['All'],
        useCases: ['Power distribution', 'Load management', 'Metering'],
        commonConfigurations: [],
      },
      replacement: {
        recommendedUpgrade: 'High-efficiency equipment',
        upgradeReason: 'Reduced losses and better power quality',
        whenToUpgrade: {
          age: 'If >25 years old',
          efficiency: 'If below current standards',
        },
        priority: 'Medium',
        typicalPaybackYears: '10-20 years',
        energySavingsPercent: '2-5%',
        notes: [],
      },
      bestPractices: {
        maintenance: ['Regular inspection', 'Thermal scanning', 'Connection checks', 'Cleaning'],
        optimization: ['Load balancing', 'Power factor correction', 'Harmonic filtering'],
        commonIssues: ['Overheating', 'Loose connections', 'Harmonic distortion'],
        troubleshooting: [],
      },
    },
  },
  
  // RENEWABLES & STORAGE
  {
    namePattern: /solar|pv|battery|bess|storage|renewable|thermal.storage|ice.storage/i,
    details: {
      category: 'RENEWABLES & STORAGE',
      identification: {
        physicalCharacteristics: ['Solar panels', 'Battery units', 'Storage systems'],
        keyComponents: ['PV modules', 'Inverters', 'Batteries', 'Controllers'],
        typicalSizes: 'Varies by capacity',
        nameplateInfo: ['Capacity', 'Power rating', 'Efficiency', 'Year'],
        howToIdentify: ['Check nameplate', 'Measure capacity', 'Identify technology'],
        typicalManufacturers: ['Tesla', 'LG', 'Panasonic', 'First Solar'],
      },
      specifications: {
        capacityRange: 'Varies by application',
        efficiencyRange: 'Solar PV: 15-22%, Battery: 85-95%',
        efficiencyMetrics: ['Efficiency', 'Capacity', 'Round-trip efficiency'],
        typicalEfficiency: 'Varies by technology',
        powerRange: 'Varies',
        operatingConditions: 'Renewable generation/storage',
      },
      applications: {
        typicalLocations: ['Roofs', 'Ground mounts', 'Mechanical rooms', 'Outdoor installations'],
        buildingTypes: ['All'],
        useCases: ['Renewable generation', 'Energy storage', 'Peak shaving'],
        commonConfigurations: [],
      },
      replacement: {
        recommendedUpgrade: 'Higher efficiency or larger capacity',
        upgradeReason: 'Technology improvements and capacity expansion',
        whenToUpgrade: {
          age: 'If >20 years old (solar), >10 years (battery)',
          efficiency: 'If below current standards',
        },
        priority: 'Medium',
        typicalPaybackYears: '7-15 years',
        energySavingsPercent: 'Varies',
        notes: [],
      },
      bestPractices: {
        maintenance: ['Regular cleaning (solar)', 'Battery monitoring', 'Performance tracking', 'Inspection'],
        optimization: ['Optimal orientation', 'Shading management', 'Load matching'],
        commonIssues: ['Soiling', 'Degradation', 'Inverter failure'],
        troubleshooting: [],
      },
    },
  },
  
  // DATA CENTER
  {
    namePattern: /data.center|crah|crac|server|it|ups|aisle|containment/i,
    details: {
      category: 'DATA CENTER MEASURES',
      identification: {
        physicalCharacteristics: ['CRAC/CRAH units', 'Server racks', 'UPS systems'],
        keyComponents: ['Cooling units', 'Servers', 'UPS', 'PDU'],
        typicalSizes: 'Varies by data center size',
        nameplateInfo: ['Capacity', 'Efficiency', 'Year'],
        howToIdentify: ['Check equipment type', 'Measure capacity', 'Identify cooling type'],
        typicalManufacturers: ['Liebert', 'Schneider', 'Stulz', 'Vertiv'],
      },
      specifications: {
        capacityRange: 'Varies by data center size',
        efficiencyRange: 'PUE 1.2-2.5+',
        efficiencyMetrics: ['PUE', 'EER', 'Efficiency'],
        typicalEfficiency: 'PUE 1.5-2.0 typical',
        operatingConditions: 'Data center environment',
      },
      applications: {
        typicalLocations: ['Data centers', 'Server rooms', 'IT closets'],
        buildingTypes: ['Data centers', 'Office buildings with IT'],
        useCases: ['IT equipment cooling', 'Power backup', 'IT infrastructure'],
        commonConfigurations: [],
      },
      replacement: {
        recommendedUpgrade: 'High-efficiency cooling and UPS',
        upgradeReason: 'Significant energy savings in data centers',
        whenToUpgrade: {
          age: 'If >10 years old',
          efficiency: 'If PUE >2.0',
        },
        priority: 'High',
        typicalPaybackYears: '3-7 years',
        energySavingsPercent: '20-40%',
        notes: [],
      },
      bestPractices: {
        maintenance: ['Regular cleaning', 'Filter replacement', 'Performance monitoring', 'Airflow management'],
        optimization: ['Hot/cold aisle containment', 'Free cooling', 'Temperature optimization', 'Server virtualization'],
        commonIssues: ['Airflow issues', 'Hot spots', 'Inefficient cooling'],
        troubleshooting: [],
      },
    },
  },
  
  // PLUG LOADS
  {
    namePattern: /plug.load|pc|vending|appliance|printer|copier|smart.plug/i,
    details: {
      category: 'PLUG LOAD MANAGEMENT',
      identification: {
        physicalCharacteristics: ['Plug-in equipment', 'Office equipment', 'Appliances'],
        keyComponents: ['Plug', 'Power supply', 'Controls'],
        typicalSizes: 'Varies by equipment',
        nameplateInfo: ['Power rating', 'Voltage', 'Efficiency'],
        howToIdentify: ['Check nameplate', 'Measure power consumption', 'Identify type'],
        typicalManufacturers: ['Various'],
      },
      specifications: {
        capacityRange: 'Varies by equipment',
        efficiencyRange: 'Varies',
        efficiencyMetrics: ['Power consumption', 'Standby power'],
        typicalEfficiency: 'Varies',
        operatingConditions: 'Plug load operation',
      },
      applications: {
        typicalLocations: ['Offices', 'Common areas', 'Kitchens', 'Break rooms'],
        buildingTypes: ['All'],
        useCases: ['Office equipment', 'Appliances', 'Electronics'],
        commonConfigurations: [],
      },
      replacement: {
        recommendedUpgrade: 'Energy-efficient equipment or smart controls',
        upgradeReason: 'Reduce plug load energy consumption',
        whenToUpgrade: {
          age: 'If >7 years old',
          efficiency: 'If high standby power',
        },
        priority: 'Medium',
        typicalPaybackYears: '5-10 years',
        energySavingsPercent: '10-30%',
        notes: [],
      },
      bestPractices: {
        maintenance: ['Regular cleaning', 'Power management settings', 'Equipment consolidation'],
        optimization: ['Power management', 'Smart plugs', 'Equipment consolidation', 'Behavior changes'],
        commonIssues: ['Phantom loads', 'Inefficient equipment', 'Over-provisioning'],
        troubleshooting: [],
      },
    },
  },
];

function generateDetailedEquipment(measure: EEMeasure): DetailedEquipment | null {
  // Skip if already has detailed info (would come from HVAC database)
  if (measure.name.match(/(chiller|boiler|ahu|vrf|vfd|cooling.tower)/i)) {
    return null; // Skip HVAC - already handled
  }

  // Find matching template
  const template = equipmentTemplates.find(t => t.namePattern.test(measure.name));
  
  if (!template) {
    // Generate basic entry
    return {
      id: measure.id,
      name: measure.name,
      category: measure.category || 'UNCATEGORIZED',
      subcategory: measure.subcategory || 'General',
      identification: {
        physicalCharacteristics: [],
        keyComponents: [],
        typicalSizes: 'Varies',
        nameplateInfo: [],
        howToIdentify: [],
        typicalManufacturers: [],
      },
      specifications: {
        capacityRange: 'Varies',
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
        maintenance: ['Regular inspection', 'Preventive maintenance', 'Performance monitoring'],
        optimization: ['Optimize operation', 'Controls optimization', 'Efficiency improvements'],
        commonIssues: [],
        troubleshooting: [],
      },
    };
  }

  // Merge template with measure
  return {
    id: measure.id,
    name: measure.name,
    category: template.details.category || measure.category || 'UNCATEGORIZED',
    subcategory: measure.subcategory || 'General',
    identification: {
      ...template.details.identification!,
      howToIdentify: template.details.identification?.howToIdentify || [],
    },
    specifications: template.details.specifications || {
      capacityRange: 'Varies',
      efficiencyRange: 'Varies',
      efficiencyMetrics: [],
      typicalEfficiency: 'Varies',
      operatingConditions: 'Standard',
    },
    applications: template.details.applications || {
      typicalLocations: [],
      buildingTypes: [],
      useCases: [],
      commonConfigurations: [],
    },
    replacement: template.details.replacement || {
      recommendedUpgrade: 'Evaluate on case-by-case basis',
      upgradeReason: 'Improve efficiency',
      whenToUpgrade: {},
      priority: 'Medium',
      typicalPaybackYears: '5-10 years',
      energySavingsPercent: '10-30%',
      notes: [],
    },
    bestPractices: template.details.bestPractices || {
      maintenance: [],
      optimization: [],
      commonIssues: [],
      troubleshooting: [],
    },
  };
}

function generateAllCompendiums() {
  console.log('🔧 Generating Comprehensive Compendiums for ALL Technologies...');
  console.log();

  const allDetailedEquipment: DetailedEquipment[] = [];
  const processedMeasures = new Set<string>();

  // Process all measures
  for (const measure of masterEEDatabase.allMeasures) {
    // Skip intro text and invalid measures
    if (measure.name.toLowerCase().match(/^(understood|this is|it contains|every|cooling|heating|ventilation|controls|electrification|category|subcategory|everwatt|master|database|entire industry|structured list|if you want|just tell me)/i)) {
      continue;
    }

    if (processedMeasures.has(measure.name)) continue;
    processedMeasures.add(measure.name);

    const detailed = generateDetailedEquipment(measure);
    if (detailed) {
      allDetailedEquipment.push(detailed);
    }
  }

  // Save to file
  const outputDir = path.join(process.cwd(), 'src', 'data', 'equipment');
  const outputFile = path.join(outputDir, 'all-technology-compendiums.ts');

  const tsContent = `/**
 * ALL TECHNOLOGY COMPENDIUMS
 * Comprehensive detailed entries for all technology categories
 * Generated: ${new Date().toISOString()}
 * 
 * Includes: Refrigeration, Envelope, Motors, Electrical, Renewables, Data Center, Plug Loads, etc.
 */

import type { DetailedEquipment } from './comprehensive-equipment-database';

export const allTechnologyCompendiums: DetailedEquipment[] = ${JSON.stringify(allDetailedEquipment, null, 2)};

export function findTechnologyByName(name: string): DetailedEquipment | undefined {
  return allTechnologyCompendiums.find(eq =>
    eq.name.toLowerCase().includes(name.toLowerCase()) ||
    name.toLowerCase().includes(eq.name.toLowerCase())
  );
}

export function getTechnologiesByCategory(category: string): DetailedEquipment[] {
  return allTechnologyCompendiums.filter(eq =>
    eq.category.toLowerCase().includes(category.toLowerCase())
  );
}
`;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, tsContent, 'utf-8');

  console.log(`✅ Generated ${allDetailedEquipment.length} detailed equipment entries`);
  console.log(`   Saved to: ${outputFile}`);
  console.log();

  // Statistics by category
  const byCategory: Record<string, number> = {};
  for (const eq of allDetailedEquipment) {
    byCategory[eq.category] = (byCategory[eq.category] || 0) + 1;
  }

  console.log('📊 Statistics by Category:');
  for (const [category, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${category}: ${count} entries`);
  }
}

generateAllCompendiums();

