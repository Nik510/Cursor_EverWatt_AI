/**
 * Vertical Market Profiles
 * Energy profiles, challenges, and opportunities by market vertical
 */

import { VerticalProfile, VerticalMarket, EquipmentType } from './types';

export const VERTICAL_PROFILES: VerticalProfile[] = [
  {
    vertical: VerticalMarket.HOSPITAL,
    name: 'Hospitals',
    description: '24/7 healthcare facilities with complex HVAC requirements, strict IAQ standards, and high energy intensity.',
    
    typicalLoadProfile: {
      peakDemand: {
        min: 2000,
        max: 10000, // kW
      },
      annualUsage: {
        min: 15000000,
        max: 80000000, // kWh
      },
      loadFactor: 0.7, // 24/7 operation
    },
    
    keyChallenges: [
      '24/7 operation with no downtime',
      'Strict IAQ requirements (ASHRAE 170)',
      'Operating rooms with high air change rates',
      'Age of equipment (often 20+ years)',
      'Legacy gas-fired central plants',
      'Complex HVAC systems (pressurization, isolation)',
    ],
    
    decarbonizationFocus: 'Central plant electrification, heat recovery chillers for reheat, isolation room pressurization optimization.',
    electrificationOpportunities: [
      'Gas absorption chiller → electric magnetic-bearing chiller',
      'Steam boilers → heat pump chillers with heat recovery',
      'Gas-fired reheat → electric heat recovery',
      'Domestic hot water electrification',
    ],
    
    priorityMeasures: [
      {
        measureId: 'chiller-conversion',
        priority: 'high',
        rationale: 'Major decarbonization opportunity, 24/7 operation maximizes savings',
      },
      {
        measureId: 'filtration-upgrades',
        priority: 'high',
        rationale: 'IAQ compliance with energy efficiency',
      },
      {
        measureId: 'chiller-plant-optimization',
        priority: 'high',
        rationale: 'Large central plants with optimization potential',
      },
      {
        measureId: 'bms-ems-installation',
        priority: 'medium',
        rationale: 'Complex systems benefit from centralized control',
      },
    ],
    
    commonEquipment: [
      EquipmentType.CHILLER_CENTRIFUGAL,
      EquipmentType.CHILLER_ABSORPTION,
      EquipmentType.BOILER_STEAM,
      EquipmentType.COOLING_TOWER,
      EquipmentType.BMS_EMS,
    ],
  },
  
  {
    vertical: VerticalMarket.OFFICE,
    name: 'Commercial Office Buildings',
    description: 'Daytime operation with significant lighting and HVAC loads, typically 8am-6pm weekdays.',
    
    typicalLoadProfile: {
      peakDemand: {
        min: 200,
        max: 2000, // kW
      },
      annualUsage: {
        min: 500000,
        max: 5000000, // kWh
      },
      loadFactor: 0.4, // Daytime only
    },
    
    keyChallenges: [
      'Peak demand charges drive costs',
      'Inefficient lighting (fluorescent)',
      'Older RTUs on roof',
      'Lack of controls/automation',
      'Varying occupancy patterns',
    ],
    
    decarbonizationFocus: 'Gas RTU replacement with heat pumps, LED + controls, VRF systems.',
    electrificationOpportunities: [
      'Gas RTUs → heat pump RTUs',
      'Gas furnaces → VRF heat pumps',
      'Steam/hot water heating → heat pumps',
    ],
    
    priorityMeasures: [
      {
        measureId: 'led-fixture-replacement',
        priority: 'high',
        rationale: 'Fast payback, large impact, easy to implement',
      },
      {
        measureId: 'networked-lighting-controls',
        priority: 'high',
        rationale: 'Captures additional 30-40% savings from controls',
      },
      {
        measureId: 'rtu-replacement',
        priority: 'medium',
        rationale: 'Older RTUs are major energy consumers',
      },
      {
        measureId: 'smart-thermostats',
        priority: 'medium',
        rationale: 'Cost-effective for smaller offices',
      },
    ],
    
    commonEquipment: [
      EquipmentType.RTU,
      EquipmentType.LED_TROFFER,
      EquipmentType.SMART_THERMOSTAT,
      EquipmentType.VRF_VRF,
    ],
  },
  
  {
    vertical: VerticalMarket.MANUFACTURING,
    name: 'Manufacturing Plants',
    description: 'High energy intensity, process loads, air compressors, material handling, and environmental control.',
    
    typicalLoadProfile: {
      peakDemand: {
        min: 1000,
        max: 10000, // kW
      },
      annualUsage: {
        min: 5000000,
        max: 50000000, // kWh
      },
      loadFactor: 0.75, // Long operating hours
    },
    
    keyChallenges: [
      'Process loads dominate',
      'Compressed air systems',
      'Material handling (conveyors)',
      'Industrial lighting (high bays)',
      'Make-up air requirements',
      'Heat recovery opportunities',
    ],
    
    decarbonizationFocus: 'Electrify process heating, VFDs on motors, LED high-bay with controls.',
    electrificationOpportunities: [
      'Gas process heating → electric induction',
      'Steam boilers → heat pumps',
      'Gas make-up air → electric VFD units',
    ],
    
    priorityMeasures: [
      {
        measureId: 'led-fixture-replacement',
        priority: 'high',
        rationale: 'High-bay LED replacement has fast payback',
      },
      {
        measureId: 'vfd-fans-ahus-chillers',
        priority: 'high',
        rationale: 'Fans and pumps run 24/7, VFDs save 30-50%',
      },
      {
        measureId: 'infrared-heating',
        priority: 'medium',
        rationale: 'Efficient zone heating for warehouses',
      },
      {
        measureId: 'air-compressor-optimization',
        priority: 'medium',
        rationale: 'Compressed air is often largest load',
      },
    ],
    
    commonEquipment: [
      EquipmentType.LED_HIGH_BAY,
      EquipmentType.VFD,
      EquipmentType.CHILLER_SCREW,
      EquipmentType.BOILER_HOT_WATER,
    ],
  },
  
  {
    vertical: VerticalMarket.WAREHOUSE,
    name: 'Warehouses',
    description: 'Large open spaces, minimal heating/cooling, high-bay lighting, material handling equipment.',
    
    typicalLoadProfile: {
      peakDemand: {
        min: 500,
        max: 5000, // kW
      },
      annualUsage: {
        min: 2000000,
        max: 20000000, // kWh
      },
      loadFactor: 0.5,
    },
    
    keyChallenges: [
      'High-bay lighting (400W Metal Halide)',
      'Minimal HVAC (spot heating)',
      'Loading dock doors (infiltration)',
      'Material handling (forklifts, conveyors)',
    ],
    
    decarbonizationFocus: 'LED high-bay with motion sensing, infrared heating, dock door seals.',
    electrificationOpportunities: [
      'Gas unit heaters → infrared',
      'Gas make-up air → electric VFD',
    ],
    
    priorityMeasures: [
      {
        measureId: 'led-fixture-replacement',
        priority: 'high',
        rationale: 'Metal Halide → LED saves 60-70%',
      },
      {
        measureId: 'high-bay-motion',
        priority: 'high',
        rationale: 'Motion sensing in aisles saves 50%+',
      },
      {
        measureId: 'infrared-heating',
        priority: 'medium',
        rationale: 'Efficient spot heating',
      },
    ],
    
    commonEquipment: [
      EquipmentType.LED_HIGH_BAY,
      EquipmentType.OCCUPANCY_SENSOR,
    ],
  },
  
  {
    vertical: VerticalMarket.RETAIL,
    name: 'Retail Stores',
    description: 'Daytime operation with significant lighting loads, varying occupancy, and comfort requirements.',
    
    typicalLoadProfile: {
      peakDemand: {
        min: 100,
        max: 500, // kW
      },
      annualUsage: {
        min: 200000,
        max: 1500000, // kWh
      },
      loadFactor: 0.35, // Daytime operation
    },
    
    keyChallenges: [
      'High lighting loads (merchandising)',
      'Peak demand charges',
      'Older RTUs',
      'Display lighting',
      'Refrigeration (grocery)',
    ],
    
    decarbonizationFocus: 'LED lighting with controls, RTU replacement with heat pumps.',
    electrificationOpportunities: [
      'Gas RTUs → heat pumps',
      'Gas furnaces → VRF',
    ],
    
    priorityMeasures: [
      {
        measureId: 'led-fixture-replacement',
        priority: 'high',
        rationale: 'High lighting loads, fast payback',
      },
      {
        measureId: 'daylight-harvesting',
        priority: 'high',
        rationale: 'Retail stores often have windows',
      },
      {
        measureId: 'rtu-replacement',
        priority: 'medium',
        rationale: 'Older RTUs are common',
      },
    ],
    
    commonEquipment: [
      EquipmentType.RTU,
      EquipmentType.LED_TROFFER,
      EquipmentType.SMART_THERMOSTAT,
    ],
  },
  
  {
    vertical: VerticalMarket.SCHOOL,
    name: 'Schools & Educational Facilities',
    description: 'Daytime operation with high occupancy, IAQ requirements, and seasonal variations.',
    
    typicalLoadProfile: {
      peakDemand: {
        min: 300,
        max: 2000, // kW
      },
      annualUsage: {
        min: 1000000,
        max: 6000000, // kWh
      },
      loadFactor: 0.3, // School hours only
    },
    
    keyChallenges: [
      'IAQ requirements (ASHRAE 62.1)',
      'Daytime-only operation',
      'High occupancy loads',
      'Aging infrastructure',
      'Budget constraints',
    ],
    
    decarbonizationFocus: 'LED lighting, RTU upgrades, electrification of heating.',
    electrificationOpportunities: [
      'Gas RTUs → heat pumps',
      'Steam/hot water → heat pumps',
    ],
    
    priorityMeasures: [
      {
        measureId: 'led-fixture-replacement',
        priority: 'high',
        rationale: 'Fast payback, large impact',
      },
      {
        measureId: 'ventilation-optimization',
        priority: 'high',
        rationale: 'IAQ compliance critical',
      },
      {
        measureId: 'ahu-vfds',
        priority: 'medium',
        rationale: 'Large AHUs with VFD potential',
      },
    ],
    
    commonEquipment: [
      EquipmentType.RTU,
      EquipmentType.LED_TROFFER,
      EquipmentType.VFD,
    ],
  },
  
  {
    vertical: VerticalMarket.HOTEL,
    name: 'Hotels & Hospitality',
    description: '24/7 operation with high occupancy variability, guest comfort requirements, and water heating loads.',
    
    typicalLoadProfile: {
      peakDemand: {
        min: 500,
        max: 3000, // kW
      },
      annualUsage: {
        min: 2000000,
        max: 12000000, // kWh
      },
      loadFactor: 0.55, // Partial 24/7
    },
    
    keyChallenges: [
      'High water heating loads',
      'Variable occupancy',
      'Guest comfort expectations',
      '24/7 operation in common areas',
      'Older equipment',
    ],
    
    decarbonizationFocus: 'Water heating electrification, VRF systems, LED lighting.',
    electrificationOpportunities: [
      'Gas water heaters → HPWH',
      'Gas RTUs → heat pumps',
      'Steam → hot water with heat pumps',
    ],
    
    priorityMeasures: [
      {
        measureId: 'heat-pump-water-heaters',
        priority: 'high',
        rationale: 'Large water heating loads',
      },
      {
        measureId: 'led-fixture-replacement',
        priority: 'high',
        rationale: 'Extensive lighting',
      },
      {
        measureId: 'smart-thermostats',
        priority: 'medium',
        rationale: 'Room-level control',
      },
    ],
    
    commonEquipment: [
      EquipmentType.RTU,
      EquipmentType.HPWH,
      EquipmentType.LED_TROFFER,
      EquipmentType.SMART_THERMOSTAT,
    ],
  },
  
  {
    vertical: VerticalMarket.GROCERY,
    name: 'Grocery Stores & Supermarkets',
    description: 'High refrigeration loads, extensive lighting, and 24/7 operation with significant peak demand.',
    
    typicalLoadProfile: {
      peakDemand: {
        min: 400,
        max: 1500, // kW
      },
      annualUsage: {
        min: 2500000,
        max: 10000000, // kWh
      },
      loadFactor: 0.7, // Long hours
    },
    
    keyChallenges: [
      'Refrigeration is largest load',
      'High lighting (case lighting)',
      '24/7 operation',
      'Peak demand charges',
      'Multiple refrigerated cases',
    ],
    
    decarbonizationFocus: 'Refrigeration optimization, LED case lighting, VFDs on compressors.',
    electrificationOpportunities: [
      'Gas make-up air → electric VFD',
    ],
    
    priorityMeasures: [
      {
        measureId: 'led-case-lighting',
        priority: 'high',
        rationale: 'Extensive case lighting, fast payback',
      },
      {
        measureId: 'refrigeration-compressor',
        priority: 'high',
        rationale: 'Largest energy consumer',
      },
      {
        measureId: 'anti-sweat-heater-controls',
        priority: 'high',
        rationale: 'Low-cost, high impact',
      },
      {
        measureId: 'smart-defrost-controls',
        priority: 'medium',
        rationale: 'Optimize defrost cycles',
      },
    ],
    
    commonEquipment: [
      EquipmentType.LED_TROFFER,
      EquipmentType.VFD,
    ],
  },
];

/**
 * Get vertical profile
 */
export function getVerticalProfile(vertical: VerticalMarket): VerticalProfile | undefined {
  return VERTICAL_PROFILES.find(v => v.vertical === vertical);
}

/**
 * Get all verticals
 */
export function getAllVerticals(): VerticalProfile[] {
  return VERTICAL_PROFILES;
}

