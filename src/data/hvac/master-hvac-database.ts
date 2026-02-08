/**
 * MASTER HVAC DATABASE
 * Complete reference for HVAC auditors, sales, and engineers
 * 
 * Comprehensive catalog of ALL HVAC equipment types, controls, and measures
 * Based on the complete energy efficiency measures list
 */

export interface HVACEquipment {
  id: string;
  name: string;
  category: 'cooling' | 'heating' | 'ventilation' | 'controls' | 'distribution' | 'electrification';
  subcategory: string;
  equipmentType: string;
  
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
    efficiencyMetrics: string[]; // EER, COP, SEER, AFUE, etc.
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
  
  // Company Customization
  companySpecific?: {
    preferredVendor?: string;
    partNumber?: string;
    pricing?: string;
    notes?: string;
  };
}

/**
 * COOLING SYSTEMS
 */
export const COOLING_EQUIPMENT: HVACEquipment[] = [
  // Electric Chillers
  {
    id: 'chiller-centrifugal-standard',
    name: 'Centrifugal Chiller (Standard)',
    category: 'cooling',
    subcategory: 'Electric Chiller',
    equipmentType: 'Centrifugal',
    identification: {
      physicalCharacteristics: [
        'Large cylindrical compressor housing',
        'Centrifugal impeller design',
        'Water-cooled condenser',
        'Typically 200+ tons capacity',
        'Multiple stages visible',
      ],
      keyComponents: ['Centrifugal compressor', 'Evaporator', 'Condenser', 'Expansion device'],
      typicalSizes: '200-2000+ tons',
      nameplateInfo: ['Model number', 'Tonnage', 'EER or kW/ton', 'Refrigerant type', 'Year'],
      howToIdentify: [
        'Look for centrifugal compressor (large, cylindrical)',
        'Check nameplate for model (often starts with "Centrifugal" or "Cent")',
        'Water-cooled condenser (not air-cooled)',
        'Large capacity (typically 200+ tons)',
        'Two-stage or multi-stage design',
      ],
      typicalManufacturers: ['Trane', 'Carrier', 'York', 'McQuay', 'Daikin'],
    },
    specifications: {
      capacityRange: '200-2000+ tons',
      efficiencyRange: '0.50-0.70 kW/ton (EER 17-24)',
      efficiencyMetrics: ['kW/ton', 'EER', 'COP'],
      typicalEfficiency: '0.60 kW/ton (EER 20)',
      powerRange: '100-1400+ kW',
      operatingConditions: 'Water-cooled, typically 44°F CHW, 85°F CWS',
    },
    applications: {
      typicalLocations: ['Large office buildings', 'Hospitals', 'Data centers', 'Manufacturing'],
      buildingTypes: ['Commercial', 'Institutional', 'Industrial'],
      useCases: ['Central plant cooling', 'Large building HVAC', 'Process cooling'],
      commonConfigurations: ['Primary/secondary pumping', 'Variable primary flow'],
    },
    replacement: {
      recommendedUpgrade: 'VFD Centrifugal or Magnetic-Bearing Centrifugal',
      upgradeReason: 'VFD centrifugal provides 20-30% energy savings through variable speed operation. Magnetic-bearing eliminates mechanical wear and improves efficiency.',
      whenToUpgrade: {
        age: 'If >15 years old',
        efficiency: 'If >0.65 kW/ton',
        condition: 'If frequent maintenance issues',
      },
      priority: 'High',
      typicalPaybackYears: '3-7 years',
      energySavingsPercent: '20-30%',
      notes: [
        'VFD retrofit can be cost-effective vs full replacement',
        'Magnetic-bearing provides best efficiency but higher cost',
        'Consider variable primary flow conversion',
        'Evaluate part-load performance',
      ],
    },
    bestPractices: {
      maintenance: [
        'Annual tube cleaning (evaporator and condenser)',
        'Check refrigerant charge',
        'Monitor approach temperatures',
        'Lubrication (if not magnetic-bearing)',
        'Vibration analysis',
      ],
      optimization: [
        'Optimize CHW setpoint (higher = more efficient)',
        'Optimize condenser water temperature',
        'Variable speed drives on pumps',
        'Sequencing multiple chillers',
        'Load balancing',
      ],
      commonIssues: [
        'Fouled tubes (reduces efficiency)',
        'Refrigerant leaks',
        'Bearing wear (if not magnetic)',
        'Poor part-load performance',
        'Inefficient sequencing',
      ],
      troubleshooting: [
        'If high approach temp: clean tubes',
        'If low efficiency: check refrigerant charge',
        'If vibration: check bearings',
      ],
    },
  },
  
  {
    id: 'chiller-centrifugal-vfd',
    name: 'VFD Centrifugal Chiller',
    category: 'cooling',
    subcategory: 'Electric Chiller',
    equipmentType: 'Centrifugal VFD',
    identification: {
      physicalCharacteristics: [
        'Centrifugal compressor with VFD',
        'Variable frequency drive visible',
        'Water-cooled',
        'Modern control panel',
      ],
      keyComponents: ['VFD', 'Centrifugal compressor', 'Evaporator', 'Condenser'],
      typicalSizes: '200-2000+ tons',
      nameplateInfo: ['VFD model', 'Compressor model', 'EER', 'Year'],
      howToIdentify: [
        'VFD unit visible on or near chiller',
        'Variable speed control panel',
        'Modern installation (typically 2010+)',
        'Better part-load efficiency',
      ],
      typicalManufacturers: ['Trane', 'Carrier', 'York', 'McQuay'],
    },
    specifications: {
      capacityRange: '200-2000+ tons',
      efficiencyRange: '0.40-0.60 kW/ton (EER 20-30)',
      efficiencyMetrics: ['kW/ton', 'EER', 'IPLV'],
      typicalEfficiency: '0.50 kW/ton (EER 24)',
      powerRange: '80-1200+ kW',
      operatingConditions: 'Variable speed operation',
    },
    applications: {
      typicalLocations: ['Modern office buildings', 'Hospitals', 'Data centers'],
      buildingTypes: ['Commercial', 'Institutional'],
      useCases: ['Central plant cooling', 'Variable load applications'],
      commonConfigurations: ['Variable primary flow', 'Optimized sequencing'],
    },
    replacement: {
      recommendedUpgrade: 'Keep or upgrade to Magnetic-Bearing',
      upgradeReason: 'VFD centrifugal is already efficient. Consider magnetic-bearing for best efficiency or optimize controls.',
      whenToUpgrade: {
        age: 'If >20 years old, consider magnetic-bearing',
        efficiency: 'If >0.55 kW/ton, optimize or replace',
      },
      priority: 'Optimize',
      typicalPaybackYears: '5-10 years for magnetic-bearing upgrade',
      energySavingsPercent: '10-15% additional vs VFD',
      notes: [
        'Already efficient technology',
        'Focus on controls optimization',
        'Consider magnetic-bearing for new installations',
      ],
    },
    bestPractices: {
      maintenance: ['Same as standard centrifugal', 'VFD maintenance', 'Control optimization'],
      optimization: ['Optimize VFD control strategy', 'Load sequencing', 'Setpoint optimization'],
      commonIssues: ['VFD failures', 'Control issues'],
      troubleshooting: [],
    },
  },
  
  {
    id: 'chiller-screw',
    name: 'Screw Chiller',
    category: 'cooling',
    subcategory: 'Electric Chiller',
    equipmentType: 'Screw',
    identification: {
      physicalCharacteristics: [
        'Helical screw compressor',
        'Twin-screw or single-screw design',
        'Air-cooled or water-cooled',
        'Smaller than centrifugal',
        'Rectangular compressor housing',
      ],
      keyComponents: ['Screw compressor', 'Evaporator', 'Condenser', 'Oil separator'],
      typicalSizes: '50-500 tons',
      nameplateInfo: ['Model', 'Tonnage', 'EER', 'Refrigerant'],
      howToIdentify: [
        'Screw compressor (helical design)',
        'Smaller than centrifugal',
        'Air-cooled or water-cooled',
        'Oil system visible',
        'Typically 50-500 tons',
      ],
      typicalManufacturers: ['Trane', 'Carrier', 'York', 'McQuay', 'Daikin'],
    },
    specifications: {
      capacityRange: '50-500 tons',
      efficiencyRange: '0.55-0.75 kW/ton (EER 16-22)',
      efficiencyMetrics: ['kW/ton', 'EER', 'COP'],
      typicalEfficiency: '0.65 kW/ton (EER 18.5)',
      powerRange: '30-375 kW',
      operatingConditions: 'Air-cooled or water-cooled',
    },
    applications: {
      typicalLocations: ['Medium office buildings', 'Retail', 'Schools', 'Hotels'],
      buildingTypes: ['Commercial', 'Institutional'],
      useCases: ['Medium building cooling', 'Distributed cooling'],
      commonConfigurations: ['Packaged units', 'Split systems'],
    },
    replacement: {
      recommendedUpgrade: 'VFD Screw or High-Efficiency Screw',
      upgradeReason: 'VFD screw provides 15-25% energy savings. High-efficiency models offer better part-load performance.',
      whenToUpgrade: {
        age: 'If >12 years old',
        efficiency: 'If >0.70 kW/ton',
      },
      priority: 'High',
      typicalPaybackYears: '4-8 years',
      energySavingsPercent: '15-25%',
      notes: [
        'VFD retrofit available for many models',
        'Consider full replacement if very old',
        'Evaluate air-cooled vs water-cooled',
      ],
    },
    bestPractices: {
      maintenance: [
        'Oil changes per manufacturer',
        'Tube cleaning',
        'Refrigerant charge check',
        'Compressor inspection',
      ],
      optimization: ['VFD retrofit', 'Setpoint optimization', 'Sequencing'],
      commonIssues: ['Oil contamination', 'Bearing wear', 'Refrigerant leaks'],
      troubleshooting: [],
    },
  },
  
  {
    id: 'chiller-scroll',
    name: 'Scroll Chiller',
    category: 'cooling',
    subcategory: 'Electric Chiller',
    equipmentType: 'Scroll',
    identification: {
      physicalCharacteristics: [
        'Scroll compressor (spiral design)',
        'Smaller than screw',
        'Often modular/multi-scroll',
        'Air-cooled or water-cooled',
        'Packaged design',
      ],
      keyComponents: ['Scroll compressor(s)', 'Evaporator', 'Condenser'],
      typicalSizes: '5-150 tons',
      nameplateInfo: ['Model', 'Tonnage', 'EER'],
      howToIdentify: [
        'Scroll compressor (spiral, not screw)',
        'Smaller capacity',
        'Often multiple scrolls in one unit',
        'Packaged design',
      ],
      typicalManufacturers: ['Trane', 'Carrier', 'McQuay', 'Daikin'],
    },
    specifications: {
      capacityRange: '5-150 tons',
      efficiencyRange: '0.60-0.80 kW/ton (EER 15-20)',
      efficiencyMetrics: ['kW/ton', 'EER'],
      typicalEfficiency: '0.70 kW/ton (EER 17)',
      powerRange: '3-105 kW',
      operatingConditions: 'Air-cooled or water-cooled',
    },
    applications: {
      typicalLocations: ['Small-medium buildings', 'Retail', 'Restaurants', 'Offices'],
      buildingTypes: ['Commercial', 'Retail'],
      useCases: ['Small building cooling', 'Distributed systems'],
      commonConfigurations: ['Packaged', 'Modular'],
    },
    replacement: {
      recommendedUpgrade: 'High-Efficiency Scroll or VRF',
      upgradeReason: 'Modern scroll chillers or VRF systems provide 20-30% energy savings with better controls.',
      whenToUpgrade: {
        age: 'If >10 years old',
        efficiency: 'If >0.75 kW/ton',
      },
      priority: 'High',
      typicalPaybackYears: '4-7 years',
      energySavingsPercent: '20-30%',
      notes: [
        'Consider VRF for distributed applications',
        'Modern scroll chillers more efficient',
        'Evaluate full replacement vs optimization',
      ],
    },
    bestPractices: {
      maintenance: ['Regular maintenance', 'Refrigerant checks'],
      optimization: ['Controls optimization', 'Setpoint management'],
      commonIssues: ['Scroll wear', 'Refrigerant leaks'],
      troubleshooting: [],
    },
  },
  
  {
    id: 'chiller-absorption',
    name: 'Absorption Chiller',
    category: 'cooling',
    subcategory: 'Absorption/Gas Chiller',
    equipmentType: 'Absorption',
    identification: {
      physicalCharacteristics: [
        'Large, complex system',
        'Uses heat (steam or gas) instead of electricity',
        'Lithium bromide solution',
        'Multiple vessels',
        'Steam or gas connection visible',
      ],
      keyComponents: ['Generator', 'Absorber', 'Condenser', 'Evaporator', 'Solution pump'],
      typicalSizes: '100-2000+ tons',
      nameplateInfo: ['Model', 'Tonnage', 'Steam pressure or gas input', 'COP'],
      howToIdentify: [
        'Steam or gas connection (not just electrical)',
        'Lithium bromide solution',
        'Complex multi-vessel design',
        'Lower electrical consumption',
        'Often in CHP applications',
      ],
      typicalManufacturers: ['Trane', 'Carrier', 'Broad', 'Yazaki'],
    },
    specifications: {
      capacityRange: '100-2000+ tons',
      efficiencyRange: 'COP 0.6-1.2 (thermal efficiency)',
      efficiencyMetrics: ['COP (thermal)', 'Steam rate', 'Gas input'],
      typicalEfficiency: 'COP 0.7-0.8',
      powerRange: 'Low electrical (pumps only)',
      operatingConditions: 'Steam or direct-fired',
    },
    applications: {
      typicalLocations: ['CHP plants', 'District energy', 'Waste heat recovery', 'Gas-rich areas'],
      buildingTypes: ['Industrial', 'District energy'],
      useCases: ['Waste heat utilization', 'CHP integration', 'Low electrical cost areas'],
      commonConfigurations: ['Steam-driven', 'Direct-fired', 'Double-effect'],
    },
    replacement: {
      recommendedUpgrade: 'Electric Chiller (if electricity cost-effective) or High-Efficiency Absorption',
      upgradeReason: 'Electric chillers typically more efficient unless waste heat available. Evaluate based on energy costs.',
      whenToUpgrade: {
        age: 'If >20 years old',
        efficiency: 'If COP <0.7',
        cost: 'If electricity cheaper than gas/steam',
      },
      priority: 'Medium',
      typicalPaybackYears: '5-10 years',
      energySavingsPercent: 'Varies by energy costs',
      notes: [
        'Keep if waste heat available',
        'Consider electric if electricity cost-effective',
        'Double-effect more efficient than single-effect',
        'Evaluate total cost of ownership',
      ],
    },
    bestPractices: {
      maintenance: [
        'Solution concentration check',
        'Crystallization prevention',
        'Tube cleaning',
        'Vacuum maintenance',
      ],
      optimization: [
        'Optimize generator temperature',
        'Waste heat recovery',
        'Sequencing',
      ],
      commonIssues: [
        'Crystallization',
        'Corrosion',
        'Vacuum leaks',
        'Solution contamination',
      ],
      troubleshooting: [
        'If crystallization: check solution concentration',
        'If low capacity: check vacuum',
      ],
    },
  },
  
  // Cooling Towers
  {
    id: 'cooling-tower-crossflow',
    name: 'Crossflow Cooling Tower',
    category: 'cooling',
    subcategory: 'Cooling Tower',
    equipmentType: 'Crossflow',
    identification: {
      physicalCharacteristics: [
        'Water flows horizontally across fill',
        'Air flows vertically up',
        'Fill media visible',
        'Fan on top',
        'Basin at bottom',
      ],
      keyComponents: ['Fill media', 'Fan(s)', 'Drift eliminators', 'Basin', 'Nozzles'],
      typicalSizes: '50-5000+ tons',
      nameplateInfo: ['Model', 'Tonnage', 'Fan HP', 'Year'],
      howToIdentify: [
        'Water flows across (not down)',
        'Fill media horizontal',
        'Fan typically on top',
        'Wider than counterflow',
      ],
      typicalManufacturers: ['Baltimore Aircoil', 'Evapco', 'Marley', 'Cooling Tower Systems'],
    },
    specifications: {
      capacityRange: '50-5000+ tons',
      efficiencyRange: 'Approach: 5-10°F',
      efficiencyMetrics: ['Approach temperature', 'Range', 'Fan power'],
      typicalEfficiency: 'Approach 7°F',
      powerRange: 'Fan: 5-500+ HP',
      operatingConditions: 'Wet bulb dependent',
    },
    applications: {
      typicalLocations: ['Chiller plants', 'Industrial processes', 'Power plants'],
      buildingTypes: ['Commercial', 'Industrial'],
      useCases: ['Chiller condenser cooling', 'Process cooling'],
      commonConfigurations: ['Single cell', 'Multi-cell'],
    },
    replacement: {
      recommendedUpgrade: 'High-Efficiency Fill Media + VFD Fans + EC Motors',
      upgradeReason: 'Modern fill media improves heat transfer. VFD fans reduce energy 30-50%. EC motors add 10-15% efficiency.',
      whenToUpgrade: {
        age: 'If >15 years old',
        efficiency: 'If approach >8°F',
        condition: 'If fill media degraded',
      },
      priority: 'High',
      typicalPaybackYears: '2-5 years',
      energySavingsPercent: '30-50%',
      notes: [
        'Fill media upgrade often cost-effective',
        'VFD fans provide significant savings',
        'EC motors eliminate belt losses',
        'Drift eliminator upgrade reduces water loss',
      ],
    },
    bestPractices: {
      maintenance: [
        'Regular fill media cleaning',
        'Basin cleaning',
        'Fan bearing maintenance',
        'Water treatment',
        'Drift eliminator inspection',
      ],
      optimization: [
        'VFD on fans',
        'EC motors',
        'Optimize fan speed',
        'Water treatment optimization',
        'Side-stream filtration',
      ],
      commonIssues: [
        'Fouled fill media',
        'Fan motor failures',
        'Water treatment issues',
        'Drift (water loss)',
        'Legionella risk',
      ],
      troubleshooting: [
        'If high approach: clean fill media',
        'If fan issues: check motor and bearings',
        'If drift: check eliminators',
      ],
    },
  },
  
  {
    id: 'cooling-tower-counterflow',
    name: 'Counterflow Cooling Tower',
    category: 'cooling',
    subcategory: 'Cooling Tower',
    equipmentType: 'Counterflow',
    identification: {
      physicalCharacteristics: [
        'Water flows vertically down',
        'Air flows vertically up (counter to water)',
        'More compact than crossflow',
        'Fill media vertical',
        'Fan on top or bottom',
      ],
      keyComponents: ['Fill media', 'Fan(s)', 'Drift eliminators', 'Basin', 'Spray nozzles'],
      typicalSizes: '50-5000+ tons',
      nameplateInfo: ['Model', 'Tonnage', 'Fan HP'],
      howToIdentify: [
        'Water and air flow in opposite directions',
        'More compact design',
        'Vertical fill media',
        'Better efficiency than crossflow',
      ],
      typicalManufacturers: ['Baltimore Aircoil', 'Evapco', 'Marley'],
    },
    specifications: {
      capacityRange: '50-5000+ tons',
      efficiencyRange: 'Approach: 4-8°F',
      efficiencyMetrics: ['Approach temperature', 'Range'],
      typicalEfficiency: 'Approach 5-7°F',
      powerRange: 'Fan: 5-500+ HP',
      operatingConditions: 'Wet bulb dependent',
    },
    applications: {
      typicalLocations: ['Chiller plants', 'Industrial'],
      buildingTypes: ['Commercial', 'Industrial'],
      useCases: ['Chiller condenser cooling'],
      commonConfigurations: ['Single cell', 'Multi-cell'],
    },
    replacement: {
      recommendedUpgrade: 'High-Efficiency Fill + VFD Fans',
      upgradeReason: 'Similar to crossflow - VFD and fill upgrades provide 30-50% savings.',
      whenToUpgrade: {
        age: 'If >15 years old',
        efficiency: 'If approach >7°F',
      },
      priority: 'High',
      typicalPaybackYears: '2-5 years',
      energySavingsPercent: '30-50%',
      notes: ['Counterflow typically more efficient than crossflow'],
    },
    bestPractices: {
      maintenance: ['Fill cleaning', 'Fan maintenance', 'Water treatment'],
      optimization: ['VFD fans', 'EC motors', 'Fill upgrade'],
      commonIssues: ['Fouling', 'Fan issues'],
      troubleshooting: [],
    },
  },
];

/**
 * HEATING SYSTEMS
 */
export const HEATING_EQUIPMENT: HVACEquipment[] = [
  {
    id: 'boiler-condensing',
    name: 'Condensing Boiler',
    category: 'heating',
    subcategory: 'Boiler',
    equipmentType: 'Condensing',
    identification: {
      physicalCharacteristics: [
        'Condensing heat exchanger',
        'Plastic vent (PVC)',
        'High efficiency rating',
        'Smaller flue',
        'Condensate drain',
      ],
      keyComponents: ['Condensing heat exchanger', 'Burner', 'Pump', 'Controls'],
      typicalSizes: '50-2000+ MBH',
      nameplateInfo: ['Model', 'MBH', 'AFUE', 'Year'],
      howToIdentify: [
        'PVC vent (not metal)',
        'Condensate drain visible',
        'High AFUE (90%+)',
        'Modern design',
        'Smaller flue diameter',
      ],
      typicalManufacturers: ['Burnham', 'Weil-McLain', 'Lochinvar', 'Viessmann'],
    },
    specifications: {
      capacityRange: '50-2000+ MBH',
      efficiencyRange: 'AFUE 90-98%',
      efficiencyMetrics: ['AFUE', 'Thermal efficiency'],
      typicalEfficiency: 'AFUE 95%',
      powerRange: 'Low (pumps and controls)',
      operatingConditions: 'Low return water temp for condensing',
    },
    applications: {
      typicalLocations: ['Modern buildings', 'Residential', 'Small commercial'],
      buildingTypes: ['Commercial', 'Residential'],
      useCases: ['Space heating', 'DHW'],
      commonConfigurations: ['Modular', 'Single unit'],
    },
    replacement: {
      recommendedUpgrade: 'Keep or optimize',
      upgradeReason: 'Condensing boilers are already high-efficiency. Focus on optimization and controls.',
      whenToUpgrade: {
        age: 'If >20 years old, consider newer model',
        efficiency: 'If AFUE <90%, upgrade',
      },
      priority: 'Optimize',
      typicalPaybackYears: 'N/A (already efficient)',
      energySavingsPercent: 'Already efficient',
      notes: [
        'Already efficient technology',
        'Optimize controls and sequencing',
        'Consider heat pump for electrification',
      ],
    },
    bestPractices: {
      maintenance: [
        'Annual inspection',
        'Heat exchanger cleaning',
        'Burner adjustment',
        'Water treatment',
      ],
      optimization: [
        'Optimize return water temperature',
        'Sequencing multiple boilers',
        'Outdoor reset',
        'Modulating controls',
      ],
      commonIssues: [
        'Condensate issues',
        'Heat exchanger fouling',
        'Vent blockage',
      ],
      troubleshooting: [],
    },
  },
  
  {
    id: 'boiler-standard',
    name: 'Standard Efficiency Boiler',
    category: 'heating',
    subcategory: 'Boiler',
    equipmentType: 'Standard',
    identification: {
      physicalCharacteristics: [
        'Metal flue (not PVC)',
        'Non-condensing heat exchanger',
        'Larger flue diameter',
        'Older design',
        'No condensate drain',
      ],
      keyComponents: ['Heat exchanger', 'Burner', 'Pump', 'Controls'],
      typicalSizes: '50-5000+ MBH',
      nameplateInfo: ['Model', 'MBH', 'AFUE', 'Year'],
      howToIdentify: [
        'Metal flue (steel or cast iron)',
        'AFUE <85%',
        'Older installation',
        'No condensate drain',
        'Larger flue',
      ],
      typicalManufacturers: ['Burnham', 'Weil-McLain', 'Cleaver-Brooks', 'Bryan'],
    },
    specifications: {
      capacityRange: '50-5000+ MBH',
      efficiencyRange: 'AFUE 75-85%',
      efficiencyMetrics: ['AFUE'],
      typicalEfficiency: 'AFUE 80%',
      powerRange: 'Low',
      operatingConditions: 'Standard operation',
    },
    applications: {
      typicalLocations: ['Older buildings', 'Industrial', 'Large commercial'],
      buildingTypes: ['Commercial', 'Industrial'],
      useCases: ['Space heating', 'Process heating'],
      commonConfigurations: ['Single', 'Multiple'],
    },
    replacement: {
      recommendedUpgrade: 'Condensing Boiler or Heat Pump',
      upgradeReason: 'Condensing boiler provides 10-15% efficiency improvement. Heat pump for electrification.',
      whenToUpgrade: {
        age: 'If >15 years old',
        efficiency: 'If AFUE <80%',
        priority: 'High for older units',
      },
      priority: 'High',
      typicalPaybackYears: '5-10 years',
      energySavingsPercent: '10-15%',
      notes: [
        'Condensing boiler direct replacement',
        'Consider heat pump for electrification',
        'Evaluate gas vs electric costs',
      ],
    },
    bestPractices: {
      maintenance: [
        'Annual inspection',
        'Tube cleaning',
        'Burner maintenance',
        'Water treatment',
      ],
      optimization: [
        'Outdoor reset',
        'Sequencing',
        'Economizer (if steam)',
        'Blowdown heat recovery',
      ],
      commonIssues: [
        'Low efficiency',
        'Scale buildup',
        'Corrosion',
      ],
      troubleshooting: [],
    },
  },
  
  {
    id: 'heat-pump-vrf',
    name: 'VRF/VRV Heat Pump System',
    category: 'heating',
    subcategory: 'Heat Pump',
    equipmentType: 'VRF',
    identification: {
      physicalCharacteristics: [
        'Outdoor condensing unit',
        'Multiple indoor units',
        'Refrigerant piping',
        'Variable refrigerant flow',
        'Modern controls',
      ],
      keyComponents: ['Outdoor unit', 'Indoor units', 'Refrigerant piping', 'Controls'],
      typicalSizes: '5-100+ tons',
      nameplateInfo: ['Model', 'Tonnage', 'COP', 'Year'],
      howToIdentify: [
        'Multiple indoor units connected to one outdoor',
        'Refrigerant piping (not water)',
        'Variable capacity',
        'Modern installation',
        'Heat pump capability',
      ],
      typicalManufacturers: ['Daikin', 'Mitsubishi', 'LG', 'Fujitsu', 'Carrier'],
    },
    specifications: {
      capacityRange: '5-100+ tons',
      efficiencyRange: 'COP 3.5-5.5 (heating), EER 12-19 (cooling)',
      efficiencyMetrics: ['COP', 'EER', 'IPLV'],
      typicalEfficiency: 'COP 4.5, EER 15',
      powerRange: 'Variable',
      operatingConditions: 'Air-source or water-source',
    },
    applications: {
      typicalLocations: ['Modern offices', 'Retail', 'Hotels', 'Schools'],
      buildingTypes: ['Commercial'],
      useCases: ['Zoned HVAC', 'Heat + cool', 'Efficient operation'],
      commonConfigurations: ['Heat pump', 'Heat recovery', '3-pipe', '2-pipe'],
    },
    replacement: {
      recommendedUpgrade: 'Keep or optimize',
      upgradeReason: 'VRF is already efficient. Optimize controls and consider heat recovery version.',
      whenToUpgrade: {
        age: 'If >15 years old, consider newer model',
        efficiency: 'If COP <3.5, upgrade',
      },
      priority: 'Optimize',
      typicalPaybackYears: 'N/A',
      energySavingsPercent: 'Already efficient',
      notes: [
        'Already efficient technology',
        'Consider heat recovery version',
        'Optimize controls',
      ],
    },
    bestPractices: {
      maintenance: [
        'Filter cleaning',
        'Coil cleaning',
        'Refrigerant charge check',
        'Control optimization',
      ],
      optimization: [
        'Optimize setpoints',
        'Zoning optimization',
        'Heat recovery',
        'Scheduling',
      ],
      commonIssues: [
        'Refrigerant leaks',
        'Control issues',
        'Zoning problems',
      ],
      troubleshooting: [],
    },
  },
];

/**
 * VENTILATION SYSTEMS
 */
export const VENTILATION_EQUIPMENT: HVACEquipment[] = [
  {
    id: 'ahu-standard',
    name: 'Standard Air Handling Unit',
    category: 'ventilation',
    subcategory: 'AHU',
    equipmentType: 'Standard',
    identification: {
      physicalCharacteristics: [
        'Large rectangular unit',
        'Supply and return fans',
        'Filters, coils, mixing box',
        'Duct connections',
        'Control panel',
      ],
      keyComponents: ['Supply fan', 'Return fan', 'Filters', 'Coils', 'Mixing box'],
      typicalSizes: '1000-100,000+ CFM',
      nameplateInfo: ['Model', 'CFM', 'Fan HP', 'Year'],
      howToIdentify: [
        'Large rectangular unit',
        'Multiple sections',
        'Fan motors visible',
        'Duct connections',
        'Standard efficiency',
      ],
      typicalManufacturers: ['Trane', 'Carrier', 'York', 'McQuay', 'Daikin'],
    },
    specifications: {
      capacityRange: '1000-100,000+ CFM',
      efficiencyRange: 'Fan efficiency: 60-75%',
      efficiencyMetrics: ['Fan efficiency', 'CFM/W'],
      typicalEfficiency: 'Fan efficiency 65%',
      powerRange: '5-500+ HP',
      operatingConditions: 'Constant volume or VAV',
    },
    applications: {
      typicalLocations: ['Office buildings', 'Schools', 'Hospitals'],
      buildingTypes: ['Commercial', 'Institutional'],
      useCases: ['General ventilation', 'Space conditioning'],
      commonConfigurations: ['Single-zone', 'Multi-zone', 'VAV'],
    },
    replacement: {
      recommendedUpgrade: 'ECM Fans + VFD + High-Efficiency Filters',
      upgradeReason: 'ECM fans provide 30-50% energy savings. VFD adds 20-30%. High-efficiency filters improve IAQ.',
      whenToUpgrade: {
        age: 'If >15 years old',
        efficiency: 'If fan efficiency <70%',
        condition: 'If frequent maintenance',
      },
      priority: 'High',
      typicalPaybackYears: '3-7 years',
      energySavingsPercent: '30-50%',
      notes: [
        'ECM fan retrofit often cost-effective',
        'VFD for variable volume',
        'MERV 13+ filters for IAQ',
        'Consider full replacement if very old',
      ],
    },
    bestPractices: {
      maintenance: [
        'Filter replacement',
        'Coil cleaning',
        'Fan bearing maintenance',
        'Belt replacement (if applicable)',
        'Control calibration',
      ],
      optimization: [
        'ECM fan upgrade',
        'VFD installation',
        'Filter upgrade',
        'Coil optimization',
        'Controls optimization',
      ],
      commonIssues: [
        'Fan inefficiency',
        'Filter loading',
        'Coil fouling',
        'Control issues',
      ],
      troubleshooting: [],
    },
  },
  
  {
    id: 'erv',
    name: 'Energy Recovery Ventilator (ERV)',
    category: 'ventilation',
    subcategory: 'Ventilation',
    equipmentType: 'ERV',
    identification: {
      physicalCharacteristics: [
        'Enthalpy wheel or plate heat exchanger',
        'Two air streams (supply and exhaust)',
        'Recovery core',
        'Fans for both streams',
      ],
      keyComponents: ['Enthalpy wheel', 'Supply fan', 'Exhaust fan', 'Filters'],
      typicalSizes: '200-20,000+ CFM',
      nameplateInfo: ['Model', 'CFM', 'Recovery efficiency', 'Year'],
      howToIdentify: [
        'Two air streams',
        'Enthalpy wheel or plate exchanger',
        'Recovery efficiency rating',
        'Modern installation',
      ],
      typicalManufacturers: ['Greenheck', 'Trane', 'Carrier', 'Des Champs'],
    },
    specifications: {
      capacityRange: '200-20,000+ CFM',
      efficiencyRange: 'Sensible: 70-85%, Total: 60-75%',
      efficiencyMetrics: ['Sensible recovery', 'Total recovery', 'CFM/W'],
      typicalEfficiency: 'Sensible 75%, Total 65%',
      powerRange: 'Low (fans only)',
      operatingConditions: 'Simultaneous supply/exhaust',
    },
    applications: {
      typicalLocations: ['Modern buildings', 'High-occupancy', 'Tight buildings'],
      buildingTypes: ['Commercial', 'Institutional'],
      useCases: ['Ventilation with energy recovery', 'IAQ improvement'],
      commonConfigurations: ['Standalone', 'Integrated with AHU'],
    },
    replacement: {
      recommendedUpgrade: 'Keep or optimize',
      upgradeReason: 'ERV is already efficient. Optimize controls and maintenance.',
      whenToUpgrade: {
        age: 'If >15 years old, consider newer model',
        efficiency: 'If recovery <60%, upgrade',
      },
      priority: 'Optimize',
      typicalPaybackYears: 'N/A',
      energySavingsPercent: 'Already efficient',
      notes: [
        'Already efficient technology',
        'Maintain filters',
        'Optimize controls',
      ],
    },
    bestPractices: {
      maintenance: [
        'Filter cleaning',
        'Wheel cleaning',
        'Fan maintenance',
        'Control check',
      ],
      optimization: [
        'Optimize airflow',
        'Control optimization',
        'Filter upgrade',
      ],
      commonIssues: [
        'Wheel fouling',
        'Filter loading',
        'Control issues',
      ],
      troubleshooting: [],
    },
  },
];

/**
 * CONTROLS & ENERGY MANAGEMENT
 */
export const CONTROLS_EQUIPMENT: HVACEquipment[] = [
  {
    id: 'bms-platform',
    name: 'Building Management System (BMS)',
    category: 'controls',
    subcategory: 'BMS/EMS',
    equipmentType: 'Platform',
    identification: {
      physicalCharacteristics: [
        'Control panels',
        'Network infrastructure',
        'Sensors and actuators',
        'User interface',
        'Integration points',
      ],
      keyComponents: ['Controller', 'Sensors', 'Actuators', 'Network', 'Software'],
      typicalSizes: 'Varies by building size',
      nameplateInfo: ['Platform', 'Version', 'Points count'],
      howToIdentify: [
        'Control panels',
        'Brand name (Siemens, Honeywell, JCI, etc.)',
        'Network infrastructure',
        'Software interface',
      ],
      typicalManufacturers: ['Siemens', 'Honeywell', 'Johnson Controls', 'Trane', 'Carrier', 'KMC', 'Distech'],
    },
    specifications: {
      capacityRange: '10-10,000+ points',
      efficiencyRange: 'Varies by implementation',
      efficiencyMetrics: ['Energy savings potential', 'Control accuracy'],
      typicalEfficiency: '15-30% energy savings potential',
      powerRange: 'Low (controls only)',
      operatingConditions: '24/7 operation',
    },
    applications: {
      typicalLocations: ['All commercial buildings'],
      buildingTypes: ['All'],
      useCases: ['HVAC control', 'Lighting control', 'Energy management'],
      commonConfigurations: ['Centralized', 'Distributed', 'Cloud-based'],
    },
    replacement: {
      recommendedUpgrade: 'Modern BMS Platform or Optimization',
      upgradeReason: 'Modern BMS provides better integration, analytics, and energy optimization. Optimization of existing can provide 10-20% savings.',
      whenToUpgrade: {
        age: 'If >15 years old',
        integration: 'If poor integration',
      },
      priority: 'High',
      typicalPaybackYears: '3-8 years',
      energySavingsPercent: '15-30%',
      notes: [
        'Optimization often cost-effective vs replacement',
        'Modern platforms offer better analytics',
        'Consider cloud-based solutions',
        'Integration with other systems',
      ],
    },
    bestPractices: {
      maintenance: [
        'Regular calibration',
        'Software updates',
        'Network maintenance',
        'Sensor replacement',
      ],
      optimization: [
        'Advanced control strategies',
        'FDD implementation',
        'Analytics and reporting',
        'Integration optimization',
      ],
      commonIssues: [
        'Outdated software',
        'Poor integration',
        'Sensor drift',
        'Network issues',
      ],
      troubleshooting: [],
    },
  },
  
  {
    id: 'vfd-motor',
    name: 'Variable Frequency Drive (VFD)',
    category: 'controls',
    subcategory: 'Motor Control',
    equipmentType: 'VFD',
    identification: {
      physicalCharacteristics: [
        'Electronic drive unit',
        'Control panel',
        'Connected to motor',
        'Variable speed capability',
        'Modern installation',
      ],
      keyComponents: ['Drive unit', 'Control panel', 'Motor connection'],
      typicalSizes: '1-1000+ HP',
      nameplateInfo: ['Model', 'HP', 'Voltage', 'Year'],
      howToIdentify: [
        'Electronic drive unit',
        'Variable speed control',
        'Connected to motor',
        'Modern technology',
      ],
      typicalManufacturers: ['ABB', 'Siemens', 'Schneider', 'Danfoss', 'Yaskawa'],
    },
    specifications: {
      capacityRange: '1-1000+ HP',
      efficiencyRange: '95-98% efficiency',
      efficiencyMetrics: ['Drive efficiency', 'Motor efficiency', 'System efficiency'],
      typicalEfficiency: '96% drive efficiency',
      powerRange: 'Matches motor HP',
      operatingConditions: 'Variable speed',
    },
    applications: {
      typicalLocations: ['Pumps', 'Fans', 'Chillers', 'All variable load applications'],
      buildingTypes: ['All'],
      useCases: ['Variable speed control', 'Energy savings', 'Soft start'],
      commonConfigurations: ['Standalone', 'Integrated'],
    },
    replacement: {
      recommendedUpgrade: 'Keep or upgrade to modern VFD',
      upgradeReason: 'VFD is already efficient. Modern VFDs offer better control and features.',
      whenToUpgrade: {
        age: 'If >15 years old',
      },
      priority: 'Optimize',
      typicalPaybackYears: 'N/A',
      energySavingsPercent: 'Already efficient',
      notes: [
        'Already efficient technology',
        'Optimize control strategy',
        'Consider advanced features',
      ],
    },
    bestPractices: {
      maintenance: [
        'Regular inspection',
        'Filter cleaning',
        'Connection check',
        'Parameter review',
      ],
      optimization: [
        'Optimize control strategy',
        'Proper sizing',
        'Harmonic filtering if needed',
      ],
      commonIssues: [
        'Harmonic distortion',
        'Control issues',
        'Overheating',
      ],
      troubleshooting: [],
    },
  },
];

/**
 * ELECTRIFICATION MEASURES
 */
export const ELECTRIFICATION_EQUIPMENT: HVACEquipment[] = [
  {
    id: 'electrification-boiler-to-hp',
    name: 'Gas Boiler → Heat Pump Conversion',
    category: 'electrification',
    subcategory: 'Heating Electrification',
    equipmentType: 'Heat Pump',
    identification: {
      physicalCharacteristics: [
        'Replace gas boiler with heat pump',
        'Electric connection',
        'Outdoor unit (air-source) or ground loop (geothermal)',
        'Indoor unit or integration',
      ],
      keyComponents: ['Heat pump', 'Refrigerant system', 'Controls'],
      typicalSizes: 'Equivalent MBH capacity',
      nameplateInfo: ['Model', 'Capacity', 'COP', 'Year'],
      howToIdentify: [
        'Electric heating (not gas)',
        'Heat pump outdoor unit',
        'No gas connection',
        'Modern installation',
      ],
      typicalManufacturers: ['Trane', 'Carrier', 'Mitsubishi', 'Daikin'],
    },
    specifications: {
      capacityRange: '50-2000+ MBH equivalent',
      efficiencyRange: 'COP 3.0-5.0',
      efficiencyMetrics: ['COP', 'HSPF'],
      typicalEfficiency: 'COP 4.0',
      powerRange: 'Electric (replaces gas)',
      operatingConditions: 'Air-source or ground-source',
    },
    applications: {
      typicalLocations: ['All building types'],
      buildingTypes: ['All'],
      useCases: ['Electrification', 'Decarbonization', 'Efficiency improvement'],
      commonConfigurations: ['Air-source', 'Ground-source', 'Water-source'],
    },
    replacement: {
      recommendedUpgrade: 'High-Temperature Heat Pump (for high-temp applications)',
      upgradeReason: 'Electrification reduces emissions. High-temp heat pumps can replace steam systems.',
      whenToUpgrade: {
        cost: 'Evaluate gas vs electric costs',
        infrastructure: 'Check electrical capacity',
      },
      priority: 'High',
      typicalPaybackYears: '5-15 years (varies by energy costs)',
      energySavingsPercent: 'Varies (may increase or decrease energy cost)',
      notes: [
        'Evaluate total cost of ownership',
        'Consider utility incentives',
        'Check electrical infrastructure',
        'High-temp heat pumps for 130-180°F applications',
      ],
    },
    bestPractices: {
      maintenance: ['Heat pump maintenance', 'Refrigerant checks'],
      optimization: ['Optimize setpoints', 'Controls'],
      commonIssues: ['Capacity at low temps', 'Electrical requirements'],
      troubleshooting: [],
    },
  },
  
  {
    id: 'electrification-absorption-to-electric',
    name: 'Absorption Chiller → Electric Chiller',
    category: 'electrification',
    subcategory: 'Cooling Electrification',
    equipmentType: 'Electric Chiller',
    identification: {
      physicalCharacteristics: [
        'Replace absorption with electric chiller',
        'No steam/gas connection',
        'Electric power',
        'More efficient operation',
      ],
      keyComponents: ['Electric chiller', 'Compressor', 'Controls'],
      typicalSizes: 'Equivalent tonnage',
      nameplateInfo: ['Model', 'Tonnage', 'EER', 'Year'],
      howToIdentify: [
        'Electric chiller (not absorption)',
        'No steam/gas connection',
        'Higher efficiency',
      ],
      typicalManufacturers: ['Trane', 'Carrier', 'York'],
    },
    specifications: {
      capacityRange: '100-2000+ tons',
      efficiencyRange: '0.50-0.70 kW/ton (EER 17-24)',
      efficiencyMetrics: ['kW/ton', 'EER'],
      typicalEfficiency: '0.60 kW/ton (EER 20)',
      powerRange: 'Electric (replaces thermal)',
      operatingConditions: 'Standard chiller operation',
    },
    applications: {
      typicalLocations: ['Buildings with electric chiller replacement'],
      buildingTypes: ['Commercial', 'Industrial'],
      useCases: ['Electrification', 'Efficiency improvement'],
      commonConfigurations: ['Standard electric chiller'],
    },
    replacement: {
      recommendedUpgrade: 'High-Efficiency Electric Chiller',
      upgradeReason: 'Electric chillers typically more efficient than absorption unless waste heat available.',
      whenToUpgrade: {
        priority: 'High',
        cost: 'If electricity cost-effective',
      },
      priority: 'High',
      typicalPaybackYears: '5-10 years',
      energySavingsPercent: 'Varies by energy costs',
      notes: [
        'Evaluate total energy costs',
        'Consider if waste heat available',
        'Check electrical infrastructure',
      ],
    },
    bestPractices: {
      maintenance: ['Standard chiller maintenance'],
      optimization: ['Optimize operation'],
      commonIssues: [],
      troubleshooting: [],
    },
  },
];

/**
 * Combine all equipment
 */
export const ALL_HVAC_EQUIPMENT: HVACEquipment[] = [
  ...COOLING_EQUIPMENT,
  ...HEATING_EQUIPMENT,
  ...VENTILATION_EQUIPMENT,
  ...CONTROLS_EQUIPMENT,
  ...ELECTRIFICATION_EQUIPMENT,
];

/**
 * Helper functions
 */
export function findHVACEquipment(identifier: string): HVACEquipment | null {
  const search = identifier.toLowerCase();
  return ALL_HVAC_EQUIPMENT.find(eq =>
    eq.id.toLowerCase().includes(search) ||
    eq.name.toLowerCase().includes(search) ||
    eq.equipmentType.toLowerCase().includes(search)
  ) || null;
}

export function getHVACEquipmentByCategory(category: HVACEquipment['category']): HVACEquipment[] {
  return ALL_HVAC_EQUIPMENT.filter(eq => eq.category === category);
}

export function getHVACEquipmentBySubcategory(subcategory: string): HVACEquipment[] {
  return ALL_HVAC_EQUIPMENT.filter(eq => eq.subcategory === subcategory);
}

