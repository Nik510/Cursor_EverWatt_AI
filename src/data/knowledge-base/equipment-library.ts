/**
 * Equipment Library
 * Comprehensive database of HVAC, Lighting, and other equipment
 * Based on training data and real-world specifications
 */

import { EquipmentSpec, EquipmentType } from './types';

/**
 * Equipment Specifications Database
 * Organized by equipment type with visual ID, specs, and optimization opportunities
 */
export const EQUIPMENT_LIBRARY: EquipmentSpec[] = [
  // ============================================================================
  // CHILLERS
  // ============================================================================
  {
    id: 'chiller-centrifugal-legacy',
    type: EquipmentType.CHILLER_CENTRIFUGAL,
    name: 'Water-Cooled Centrifugal Chiller (Legacy)',
    visualId: {
      description: 'Large water-cooled centrifugal chiller',
      whereFound: 'Mechanical room, chiller plant, basement',
      visualCues: [
        'Large metal box with two water pipes (supply/return)',
        'Centrifugal compressor visible through service panels',
        'Often 20+ years old, visible wear',
        'May have older controls (pneumatic or early electronic)',
      ],
    },
    specifications: {
      capacity: {
        value: 200,
        unit: 'tons',
      },
      efficiency: {
        kwPerTon: 0.8,
        cop: 4.4,
        eer: 15,
      },
    },
    typicalRuntime: {
      hoursPerYear: 2000,
      partLoadFactor: 0.65,
    },
    energyBaseline: {
      kwhPerYear: 208000, // 200 tons × 0.8 kW/ton × 2000 hrs × 0.65 PLF
      kwPeak: 160, // 200 tons × 0.8 kW/ton
    },
    redFlags: [
      'Loud compressor surge/vibration',
      'High condenser water temperature',
      'Short cycling',
      'Oil leaks',
      'Corrosion on heat exchangers',
      'Outdated controls',
      'Bypass valve stuck open',
    ],
    optimizationOpportunities: [
      {
        measure: 'Replace with magnetic-bearing chiller',
        typicalSavings: 55, // % reduction in kW/ton
        payback: 8,
      },
      {
        measure: 'Install VFD on chilled water pump',
        typicalSavings: 40,
        payback: 3,
      },
      {
        measure: 'Optimize controls and reset strategies',
        typicalSavings: 15,
        payback: 1,
      },
    ],
    relatedMeasures: [
      'chiller-replacements',
      'chiller-plant-optimization',
      'vfd-fans-ahus-chillers',
    ],
  },
  {
    id: 'chiller-magnetic-bearing',
    type: EquipmentType.CHILLER_MAGNETIC,
    name: 'Magnetic-Bearing Centrifugal Chiller',
    visualId: {
      description: 'Modern high-efficiency magnetic-bearing chiller',
      whereFound: 'Mechanical room, new installations',
      visualCues: [
        'Compact, modern design',
        'Variable-speed drive visible',
        'Advanced digital controls',
        'Magnetic bearing compressor (no oil)',
        'Typically 5-10 years old or newer',
      ],
    },
    specifications: {
      capacity: {
        value: 200,
        unit: 'tons',
      },
      efficiency: {
        kwPerTon: 0.35,
        cop: 10,
        eer: 34,
      },
    },
    typicalRuntime: {
      hoursPerYear: 2000,
      partLoadFactor: 0.65,
    },
    optimizationOpportunities: [
      {
        measure: 'Optimal control strategies',
        typicalSavings: 10,
        payback: 2,
      },
    ],
    relatedMeasures: [
      'chiller-plant-optimization',
    ],
  },
  {
    id: 'chiller-absorption-gas',
    type: EquipmentType.CHILLER_ABSORPTION,
    name: 'Gas Absorption Chiller',
    visualId: {
      description: 'Gas-fired absorption chiller',
      whereFound: 'Mechanical room, typically older facilities',
      visualCues: [
        'Large unit with gas connection',
        'Hot exhaust stack',
        'Steam or hot water input',
        'Lower efficiency than electric',
        'Often 15+ years old',
      ],
    },
    specifications: {
      capacity: {
        value: 300,
        unit: 'tons',
      },
      efficiency: {
        cop: 0.7,
        kwPerTon: 1.2, // Higher due to gas consumption
      },
    },
    optimizationOpportunities: [
      {
        measure: 'Convert to electric chiller',
        typicalSavings: 40, // Significant decarbonization
        payback: 12,
      },
    ],
    relatedMeasures: [
      'chiller-conversion',
      'gas-to-electric-conversion',
    ],
  },

  // ============================================================================
  // BOILERS
  // ============================================================================
  {
    id: 'boiler-hot-water-non-condensing',
    type: EquipmentType.BOILER_NON_CONDENSING,
    name: 'Hot Water Boiler (Non-Condensing)',
    visualId: {
      description: 'Traditional hot water boiler',
      whereFound: 'Mechanical room, basement',
      visualCues: [
        'Cast iron or steel construction',
        'Gas or oil-fired',
        'Return water temperature > 140°F',
        'Often 15+ years old',
        'May have visible rust or corrosion',
      ],
    },
    specifications: {
      capacity: {
        value: 500,
        unit: 'btu',
      },
      efficiency: {
        cop: 0.8, // 80% AFUE typical
      },
    },
    redFlags: [
      'High flue gas temperature',
      'Condensation in flue (indicating need for condensing)',
      'Short cycling',
      'Rusted heat exchanger',
      'Insufficient hot water reset',
    ],
    optimizationOpportunities: [
      {
        measure: 'Replace with condensing boiler',
        typicalSavings: 25, // Efficiency gain
        payback: 10,
      },
      {
        measure: 'Install hot water reset controls',
        typicalSavings: 10,
        payback: 2,
      },
    ],
    relatedMeasures: [
      'boiler-retrofits',
      'hot-water-reset',
    ],
  },
  {
    id: 'boiler-condensing',
    type: EquipmentType.BOILER_CONDENSING,
    name: 'Condensing Boiler',
    visualId: {
      description: 'High-efficiency condensing boiler',
      whereFound: 'Mechanical room, new installations',
      visualCues: [
        'Compact, modern design',
        'Plastic condensate drain',
        'Low return water temperature capability',
        'Modulating burner',
        'High efficiency rating (>90% AFUE)',
      ],
    },
    specifications: {
      capacity: {
        value: 500,
        unit: 'btu',
      },
      efficiency: {
        cop: 0.95, // 95% AFUE
      },
    },
  },

  // ============================================================================
  // RTUs
  // ============================================================================
  {
    id: 'rtu-standard',
    type: EquipmentType.RTU,
    name: 'Rooftop Unit (Standard Efficiency)',
    visualId: {
      description: 'Standard efficiency rooftop unit',
      whereFound: 'Roof',
      visualCues: [
        'Large rectangular box on roof',
        'Visible compressor access panel',
        'Standard efficiency (10-13 SEER)',
        'May have economizer',
        'Often 10+ years old',
      ],
    },
    specifications: {
      capacity: {
        value: 20,
        unit: 'tons',
      },
      efficiency: {
        seer: 12,
        ieer: 11,
      },
    },
    optimizationOpportunities: [
      {
        measure: 'Replace with high-SEER/IEER RTU',
        typicalSavings: 30,
        payback: 8,
      },
      {
        measure: 'Install VFD on supply fan',
        typicalSavings: 35,
        payback: 4,
      },
    ],
    relatedMeasures: [
      'rtu-replacement',
      'vfd-fans-ahus-chillers',
    ],
  },

  // ============================================================================
  // LIGHTING
  // ============================================================================
  {
    id: 'led-troffer',
    type: EquipmentType.LED_TROFFER,
    name: 'LED Troffer',
    visualId: {
      description: 'LED troffer fixture (2x4 or 2x2)',
      whereFound: 'Office ceilings, suspended grid',
      visualCues: [
        'Replaces fluorescent troffer',
        'Integrated LED modules',
        'May have built-in sensors',
        'Thin profile',
        'No visible ballast',
      ],
    },
    specifications: {
      capacity: {
        value: 25,
        unit: 'kw', // Per fixture
      },
    },
    optimizationOpportunities: [
      {
        measure: 'Add occupancy sensors',
        typicalSavings: 30,
        payback: 2,
      },
      {
        measure: 'Add daylight harvesting',
        typicalSavings: 40,
        payback: 3,
      },
    ],
    relatedMeasures: [
      'led-fixture-replacement',
      'occupancy-sensors',
      'daylight-harvesting',
    ],
  },
  {
    id: 'led-high-bay',
    type: EquipmentType.LED_HIGH_BAY,
    name: 'LED High Bay',
    visualId: {
      description: 'LED high bay fixture',
      whereFound: 'Warehouse, manufacturing, high ceilings',
      visualCues: [
        'Replaces 400W Metal Halide',
        'Hangs from ceiling 20+ ft',
        'High lumen output',
        'Modern LED array',
      ],
    },
    specifications: {
      capacity: {
        value: 150,
        unit: 'kw', // Per fixture
      },
    },
    optimizationOpportunities: [
      {
        measure: 'Add motion sensing',
        typicalSavings: 50,
        payback: 2,
      },
    ],
    relatedMeasures: [
      'led-fixture-replacement',
      'high-bay-motion',
    ],
  },

  // ============================================================================
  // VFDs
  // ============================================================================
  {
    id: 'vfd-generic',
    type: EquipmentType.VFD,
    name: 'Variable Frequency Drive (VFD)',
    visualId: {
      description: 'VFD controller',
      whereFound: 'Next to motor/pump/fan',
      visualCues: [
        'Rectangular control box',
        'Digital display',
        'Multiple connection points',
        'Variable speed control',
      ],
    },
    specifications: {
      efficiency: {
        cop: 0.95, // Typical VFD efficiency
      },
    },
    optimizationOpportunities: [
      {
        measure: 'Optimize control curves',
        typicalSavings: 10,
        payback: 1,
      },
    ],
    relatedMeasures: [
      'vfd-fans-ahus-chillers',
      'ahu-vfds',
    ],
  },

  // ============================================================================
  // VRF SYSTEMS
  // ============================================================================
  {
    id: 'vrf-system',
    type: EquipmentType.VRF_VRF,
    name: 'VRF/VRV Heat Pump System',
    visualId: {
      description: 'Variable Refrigerant Flow heat pump system',
      whereFound: 'Rooftop or mechanical room',
      visualCues: [
        'Outdoor condensing unit (multiple modules)',
        'Refrigerant pipes (small diameter)',
        'Indoor fan coil units in ceiling',
        'Digital controls',
        'Modern, high-efficiency design',
      ],
    },
    specifications: {
      capacity: {
        value: 50,
        unit: 'tons',
      },
      efficiency: {
        cop: 4.5,
        eer: 15.4,
      },
    },
    optimizationOpportunities: [
      {
        measure: 'Optimal control sequencing',
        typicalSavings: 15,
        payback: 2,
      },
    ],
    relatedMeasures: [
      'vrf-vrv',
      'gas-furnaces-to-vrf',
    ],
  },

  // ============================================================================
  // HEAT PUMPS
  // ============================================================================
  {
    id: 'heat-pump-air',
    type: EquipmentType.HEAT_PUMP_AIR,
    name: 'Air-Source Heat Pump',
    visualId: {
      description: 'Air-source heat pump unit',
      whereFound: 'Rooftop, exterior wall',
      visualCues: [
        'Similar to RTU but reversible',
        'Can heat and cool',
        'Outdoor unit with fan',
        'Modern, efficient design',
      ],
    },
    specifications: {
      capacity: {
        value: 5,
        unit: 'tons',
      },
      efficiency: {
        seer: 18,
        // hspf: 10, // Note: HSPF not in type definition yet
      },
    },
    optimizationOpportunities: [
      {
        measure: 'Replace gas furnace/AC with heat pump',
        typicalSavings: 40, // Electrification + efficiency
        payback: 10,
      },
    ],
    relatedMeasures: [
      'heat-pumps-replace-furnaces',
      'gas-rtu-to-heat-pump',
    ],
  },
  {
    id: 'hpwh',
    type: EquipmentType.HPWH,
    name: 'Heat Pump Water Heater',
    visualId: {
      description: 'Heat pump water heater',
      whereFound: 'Mechanical room, utility room',
      visualCues: [
        'Tall tank with top fan/compressor',
        'Refrigerant loop visible',
        'Electric connection (no gas)',
        'Modern, efficient design',
      ],
    },
    specifications: {
      capacity: {
        value: 80,
        unit: 'btu', // gallons equivalent
      },
      efficiency: {
        cop: 3.0, // Much better than electric resistance
      },
    },
    optimizationOpportunities: [
      {
        measure: 'Replace gas or electric resistance water heater',
        typicalSavings: 60, // vs electric resistance, 70% vs gas
        payback: 7,
      },
    ],
    relatedMeasures: [
      'heat-pump-water-heaters',
      'gas-water-heater-to-hpwh',
      'boiler-to-hpwh',
    ],
  },

  // ============================================================================
  // BMS/EMS
  // ============================================================================
  {
    id: 'bms-ems',
    type: EquipmentType.BMS_EMS,
    name: 'Building Management System / Energy Management System',
    visualId: {
      description: 'Building automation system',
      whereFound: 'Control room, IT closet',
      visualCues: [
        'Computer/server rack',
        'Multiple control panels',
        'Network equipment',
        'Screens/displays',
        'Wiring to all equipment',
      ],
    },
    specifications: {},
    optimizationOpportunities: [
      {
        measure: 'Install comprehensive BMS/EMS',
        typicalSavings: 15, // Overall building optimization
        payback: 5,
      },
    ],
    relatedMeasures: [
      'bms-ems-installation',
      'global-scheduling',
      'fault-detection',
    ],
  },

  // ============================================================================
  // BATTERY STORAGE
  // ============================================================================
  {
    id: 'battery-bess',
    type: EquipmentType.BATTERY_BESS,
    name: 'Battery Energy Storage System (BESS)',
    visualId: {
      description: 'Battery storage system',
      whereFound: 'Exterior, parking lot, utility area',
      visualCues: [
        'Containerized system (shipping container)',
        'HVAC units on top (temperature control)',
        'Electrical connections',
        'Large, modern installation',
      ],
    },
    specifications: {
      capacity: {
        value: 1000,
        unit: 'kwh',
      },
      power: {
        min: 500,
        max: 1000,
        unit: 'kw',
      },
    },
    optimizationOpportunities: [
      {
        measure: 'Peak shaving to reduce demand charges',
        typicalSavings: 20000, // $/year typical
        payback: 8,
      },
    ],
    relatedMeasures: [
      'battery-storage',
      'peak-shaving-batteries',
    ],
  },

  // ============================================================================
  // EV CHARGERS
  // ============================================================================
  {
    id: 'ev-charger-level2',
    type: EquipmentType.EV_CHARGER,
    name: 'EV Charger (Level 2)',
    visualId: {
      description: 'Electric vehicle charging station',
      whereFound: 'Parking lot, garage',
      visualCues: [
        'Wall-mounted or pedestal',
        'Cable with connector',
        'Digital display',
        'Network connection',
      ],
    },
    specifications: {
      power: {
        min: 7.2,
        max: 19.2,
        unit: 'kw',
      },
    },
    relatedMeasures: [
      'ev-charging',
      'smart-ev-charging',
    ],
  },

  // ============================================================================
  // COOLING TOWER
  // ============================================================================
  {
    id: 'cooling-tower',
    type: EquipmentType.COOLING_TOWER,
    name: 'Cooling Tower',
    visualId: {
      description: 'Cooling tower for water-cooled chillers',
      whereFound: 'Roof, mechanical area',
      visualCues: [
        'Large open tower structure',
        'Fan on top (forced draft) or bottom (induced draft)',
        'Water basin at bottom',
        'Drift eliminators visible',
        'Make-up water connection',
      ],
    },
    specifications: {
      capacity: {
        value: 500,
        unit: 'tons',
      },
    },
    redFlags: [
      'Excessive drift (visible water mist)',
      'Fan running at constant speed (no VFD)',
      'Scaling/corrosion visible',
      'High make-up water usage',
    ],
    optimizationOpportunities: [
      {
        measure: 'Install VFD on tower fan',
        typicalSavings: 50, // Variable speed savings
        payback: 3,
      },
      {
        measure: 'Upgrade drift eliminators',
        typicalSavings: 5, // Water savings
        payback: 4,
      },
    ],
    relatedMeasures: [
      'cooling-tower-upgrades',
      'vfd-fans-ahus-chillers',
    ],
  },

  // ============================================================================
  // SMART THERMOSTAT
  // ============================================================================
  {
    id: 'smart-thermostat',
    type: EquipmentType.SMART_THERMOSTAT,
    name: 'Smart Thermostat',
    visualId: {
      description: 'WiFi-enabled programmable thermostat',
      whereFound: 'Walls in occupied spaces',
      visualCues: [
        'Digital display',
        'Touch screen interface',
        'WiFi connectivity',
        'Occupancy sensing',
        'Remote control capability',
      ],
    },
    specifications: {},
    optimizationOpportunities: [
      {
        measure: 'Replace standard thermostat',
        typicalSavings: 10, // Scheduling and setbacks
        payback: 2,
      },
    ],
    relatedMeasures: [
      'smart-thermostats',
    ],
  },
];

/**
 * Get equipment by type
 */
export function getEquipmentByType(type: EquipmentType): EquipmentSpec[] {
  return EQUIPMENT_LIBRARY.filter(e => e.type === type);
}

/**
 * Get equipment by ID
 */
export function getEquipmentById(id: string): EquipmentSpec | undefined {
  return EQUIPMENT_LIBRARY.find(e => e.id === id);
}

/**
 * Search equipment by name or visual cues
 */
export function searchEquipment(query: string): EquipmentSpec[] {
  const lowerQuery = query.toLowerCase();
  return EQUIPMENT_LIBRARY.filter(e =>
    e.name.toLowerCase().includes(lowerQuery) ||
    e.visualId.description.toLowerCase().includes(lowerQuery) ||
    e.visualId.visualCues.some(cue => cue.toLowerCase().includes(lowerQuery))
  );
}

