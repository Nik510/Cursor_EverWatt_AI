/**
 * HVAC EQUIPMENT CATEGORIES
 * Complete categorization based on the master energy efficiency list
 */

export interface EquipmentCategory {
  id: string;
  name: string;
  description: string;
  subcategories: {
    id: string;
    name: string;
    equipmentTypes: string[];
  }[];
}

export const HVAC_CATEGORIES: EquipmentCategory[] = [
  {
    id: 'cooling-systems',
    name: 'Cooling Systems',
    description: 'Chillers, cooling towers, and cooling distribution',
    subcategories: [
      {
        id: 'electric-chillers',
        name: 'Electric Chillers',
        equipmentTypes: [
          'Centrifugal (Standard)',
          'Centrifugal (Two-stage)',
          'VFD Centrifugal',
          'Magnetic-Bearing Centrifugal',
          'Screw (Air-cooled)',
          'Screw (Water-cooled)',
          'VFD Screw',
          'Scroll (Modular multi-scroll)',
          'Scroll (Packaged air-cooled)',
          'Reciprocating (Legacy)',
          'Free-cooling / Economizer',
        ],
      },
      {
        id: 'absorption-chillers',
        name: 'Absorption / Gas / Engine Chillers',
        equipmentTypes: [
          'Direct-fired Absorption (LiBr)',
          'Double-effect Absorption',
          'Steam Absorption',
          'Natural Gas Engine-driven Chiller',
          'CHP Integrated Chiller',
        ],
      },
      {
        id: 'heat-pump-chillers',
        name: 'Heat Pump Chillers',
        equipmentTypes: [
          'Air-source Heat Pump Chiller',
          'Water-source Heat Pump Chiller',
          'Reversible Heat Pump Chiller (4-pipe)',
          'Heat-recovery Chiller (simultaneous heat + cooling)',
          'High-temp Heat Pump Chiller-boiler (130–180°F)',
          'CO₂ Transcritical Heat Pump Chiller',
        ],
      },
      {
        id: 'cooling-towers',
        name: 'Cooling Towers',
        equipmentTypes: [
          'Cooling Tower Replacement',
          'VFD Tower Fans',
          'EC Fan Motors',
          'Drift Eliminators',
          'Fill Media Upgrades',
          'Nozzle Upgrades',
          'Basin Heaters Optimization',
          'Side-stream Filtration',
          'Water Treatment Optimization',
        ],
      },
      {
        id: 'cooling-distribution',
        name: 'Cooling Distribution',
        equipmentTypes: [
          'CHW Pumps (Primary)',
          'CHW Pumps (Secondary)',
          'Pump VFDs',
          'Pump Impeller Trimming',
          'Variable Primary Flow Conversion',
          'PICVs (Pressure Independent Control Valves)',
          'Hydronic Balancing',
          'CHW ΔT Optimization',
        ],
      },
    ],
  },
  
  {
    id: 'heating-systems',
    name: 'Heating Systems',
    description: 'Boilers, heat pumps, and heating distribution',
    subcategories: [
      {
        id: 'boilers',
        name: 'Boilers',
        equipmentTypes: [
          'Condensing Boilers (High-efficiency)',
          'High-turndown Burner Retrofits',
          'Steam Boilers',
          'Boiler Economizers',
          'Blowdown Heat Recovery',
          'Boiler Sequencing Optimization',
        ],
      },
      {
        id: 'heat-pumps',
        name: 'Heat Pumps',
        equipmentTypes: [
          'Packaged Heat Pumps (RTU Heat Pumps)',
          'Split-system Heat Pumps',
          'VRF/VRV Heat Pump Systems',
          'Water-source Heat Pumps',
          'Air-to-water Heat Pumps',
          'Ground-source Heat Pumps',
          'Heat Pump Water Heaters (HPWH)',
          'High-temp Industrial Heat Pumps',
          'Heat Pump Make-up Air Units',
          'Heat Pump Boiler Replacements',
        ],
      },
      {
        id: 'heating-distribution',
        name: 'Heating Distribution',
        equipmentTypes: [
          'HW Pumps (Primary/Secondary)',
          'Pump VFDs',
          'Hydronic Loop Balancing',
          'Reheat Coil Optimization',
          'Pipe Insulation',
          'Steam-to-hot-water Conversion',
        ],
      },
    ],
  },
  
  {
    id: 'ventilation',
    name: 'Ventilation + Air Distribution',
    description: 'AHUs, ventilation systems, and exhaust',
    subcategories: [
      {
        id: 'air-handling-units',
        name: 'Air Handling Units (AHUs)',
        equipmentTypes: [
          'AHU Replacements',
          'Fan Wall Retrofits',
          'ECM Supply/Return Fans',
          'VFD Upgrades',
          'Coil Cleaning / Replacement',
          'Filter Upgrades (MERV 13–16)',
          'Humidification Upgrades',
        ],
      },
      {
        id: 'ventilation-systems',
        name: 'Ventilation Systems',
        equipmentTypes: [
          'DOAS Systems',
          'ERV (Energy Recovery Ventilator)',
          'HRV (Heat Recovery Ventilator)',
          'Enthalpy Wheels',
          'Heat Pipes',
          'Runaround Heat Recovery Loops',
        ],
      },
      {
        id: 'ventilation-controls',
        name: 'Ventilation Controls',
        equipmentTypes: [
          'CO₂ Demand-controlled Ventilation (DCV)',
          'Occupancy-based Ventilation',
          'Outdoor Air Reset',
          'VAV Calibration',
          'Night Setback Modes',
        ],
      },
      {
        id: 'exhaust-systems',
        name: 'Exhaust Systems',
        equipmentTypes: [
          'Lab Fume Hood VAV Controls',
          'Lab Exhaust VFD Systems',
          'Kitchen Hood VFD Systems',
        ],
      },
    ],
  },
  
  {
    id: 'controls',
    name: 'HVAC Controls & Energy Management',
    description: 'BMS platforms and control strategies',
    subcategories: [
      {
        id: 'bms-platforms',
        name: 'BMS/EMS Platforms',
        equipmentTypes: [
          'KMC Controls',
          'Siemens',
          'Honeywell',
          'Johnson Controls',
          'Tridium Niagara',
          'Ignition SCADA',
          'Distech',
          'Automated Logic',
          'Schneider EcoStruxure',
        ],
      },
      {
        id: 'control-strategies',
        name: 'Control Strategies',
        equipmentTypes: [
          'SAT Reset',
          'CHW Reset',
          'HW Reset',
          'Outside Air Reset',
          'Static Pressure Reset',
          'Optimal Start/Stop',
          'Equipment Scheduling Optimization',
          'Load Shedding',
        ],
      },
      {
        id: 'advanced-controls',
        name: 'Advanced Controls',
        equipmentTypes: [
          'Fault Detection and Diagnostics (FDD)',
          'AI-based Optimization (EverWatt.AI)',
          'DR Automation',
          'Weather-integrated Predictive Logic',
          'Circuit-level Metering',
        ],
      },
    ],
  },
  
  {
    id: 'electrification',
    name: 'Electrification Measures',
    description: 'Complete electrification pathways',
    subcategories: [
      {
        id: 'heating-electrification',
        name: 'Heating Electrification',
        equipmentTypes: [
          'Gas Boiler → Heat Pump Chiller',
          'Gas Boiler → Electric Boiler',
          'Gas Furnace → Heat Pump',
          'Gas RTU → Electric Heat Pump RTU',
          'Gas MAU → Electric MAU',
          'Steam Heating → High-temp Heat Pump',
        ],
      },
      {
        id: 'cooling-electrification',
        name: 'Cooling Electrification',
        equipmentTypes: [
          'Absorption Chiller → Electric Chiller',
          'Engine-driven Chiller → Electric Chiller',
        ],
      },
      {
        id: 'dhw-electrification',
        name: 'Domestic Hot Water Electrification',
        equipmentTypes: [
          'Gas Water Heater → HPWH',
          'Gas Booster → Electric Booster',
          'Steam → Heat Pump DHW System',
        ],
      },
      {
        id: 'cooking-electrification',
        name: 'Cooking Electrification',
        equipmentTypes: [
          'Gas Range → Induction',
          'Gas Fryer → Electric Fryer',
          'Gas Oven → Electric Convection Oven',
          'Gas Broiler → Electric Salamander',
        ],
      },
      {
        id: 'infrastructure-electrification',
        name: 'Infrastructure Upgrades for Electrification',
        equipmentTypes: [
          'Panelboard Replacement',
          'Service Upgrade',
          'Transformer Replacement',
          'Electrified Reheat Systems',
          'Distribution Redesign (4-pipe to 2-pipe HP system)',
        ],
      },
    ],
  },
  
  {
    id: 'envelope',
    name: 'Envelope & Insulation',
    description: 'Building envelope improvements',
    subcategories: [
      {
        id: 'insulation',
        name: 'Insulation',
        equipmentTypes: [
          'Roof Insulation',
          'Wall Insulation',
          'Pipe Insulation',
          'Duct Insulation',
        ],
      },
      {
        id: 'windows',
        name: 'Windows',
        equipmentTypes: [
          'Double-pane Windows',
          'Triple-pane Windows',
          'Low-E Film',
          'Security Tint Film',
          'Window Replacement',
          'Skylights / Solar Tubes',
        ],
      },
      {
        id: 'air-sealing',
        name: 'Air Sealing',
        equipmentTypes: [
          'Door Sweeps',
          'Weather Stripping',
          'Envelope Leak Sealing',
          'Vestibule Addition',
        ],
      },
      {
        id: 'roofing',
        name: 'Roofing',
        equipmentTypes: [
          'Cool Roof Coating',
          'Reflective Membranes',
          'Green Roof',
        ],
      },
    ],
  },
  
  {
    id: 'refrigeration',
    name: 'Refrigeration',
    description: 'Commercial refrigeration systems',
    subcategories: [
      {
        id: 'display-case',
        name: 'Display / Case Refrigeration',
        equipmentTypes: [
          'EC Evaporator Fan Motors',
          'LED Case Lighting',
          'Anti-sweat Heater Controls',
          'Night Curtains',
          'Door Gasket Upgrades',
        ],
      },
      {
        id: 'rack-systems',
        name: 'Rack Systems',
        equipmentTypes: [
          'Floating Head Pressure Controls',
          'Floating Suction Pressure',
          'VFD Compressors',
          'Heat Reclaim',
          'Defrost Optimization',
          'Refrigeration Controls Upgrade',
        ],
      },
      {
        id: 'walk-in',
        name: 'Walk-in Coolers / Freezers',
        equipmentTypes: [
          'Strip Curtains',
          'ECM Fans',
          'High-efficiency Doors',
          'Insulation Upgrades',
        ],
      },
    ],
  },
  
  {
    id: 'hot-water',
    name: 'Hot Water & Plumbing',
    description: 'DHW and plumbing efficiency',
    subcategories: [
      {
        id: 'fixtures',
        name: 'Fixtures',
        equipmentTypes: [
          'Low-flow Fixtures',
          'Auto-faucets',
          'Auto-flush Valves',
        ],
      },
      {
        id: 'systems',
        name: 'Systems',
        equipmentTypes: [
          'HPWH Systems',
          'Hot-water Recirculation Optimization',
          'Steam-to-DHW Conversion',
          'Irrigation Controllers',
          'Leak Detection Systems',
          'Water-cooled to Air-cooled Conversions',
        ],
      },
    ],
  },
  
  {
    id: 'motors-electrical',
    name: 'Motors & Electrical Systems',
    description: 'Motor and electrical improvements',
    subcategories: [
      {
        id: 'motors',
        name: 'Motors',
        equipmentTypes: [
          'NEMA Premium Motors',
          'ECM Motors',
          'Right-sizing Motors',
          'Soft Starters',
          'Motor VFDs',
        ],
      },
      {
        id: 'electrical-infrastructure',
        name: 'Electrical Infrastructure',
        equipmentTypes: [
          'High-efficiency Transformers',
          'Load Balancing',
          'Power Factor Correction',
          'Harmonic Filtering',
          'Smart Panels',
          'Submetering',
        ],
      },
    ],
  },
  
  {
    id: 'renewables-storage',
    name: 'Renewables & Storage',
    description: 'Renewable energy and storage',
    subcategories: [
      {
        id: 'storage',
        name: 'Storage',
        equipmentTypes: [
          'Battery Energy Storage Systems (BESS)',
          'Peak Shaving Batteries',
          'Load Shifting Batteries',
        ],
      },
      {
        id: 'renewables',
        name: 'Renewables',
        equipmentTypes: [
          'Solar PV',
          'Solar Thermal',
          'Microgrid Controls',
          'Hybrid Inverter Systems',
        ],
      },
      {
        id: 'thermal-storage',
        name: 'Thermal Storage',
        equipmentTypes: [
          'Ice Storage',
          'Chilled Water Storage',
          'PCM Thermal Storage',
        ],
      },
    ],
  },
  
  {
    id: 'industrial',
    name: 'Industrial / Process Loads',
    description: 'Industrial process optimization',
    subcategories: [
      {
        id: 'compressed-air',
        name: 'Compressed Air',
        equipmentTypes: [
          'Leak Detection',
          'Compressor Replacement (VFD/two-stage)',
          'Zero-loss Drains',
          'Heat Recovery',
          'Setpoint Optimization',
        ],
      },
      {
        id: 'process-loads',
        name: 'Process Loads',
        equipmentTypes: [
          'Oven Upgrades',
          'Process Chiller Optimization',
          'Industrial Refrigeration',
          'Pump VFDs',
          'Industrial Fans (ECM/VFD)',
        ],
      },
    ],
  },
  
  {
    id: 'healthcare',
    name: 'Healthcare-Specific Measures',
    description: 'Healthcare facility optimizations',
    subcategories: [
      {
        id: 'healthcare-measures',
        name: 'Healthcare Measures',
        equipmentTypes: [
          'OR Setback Controls',
          'OR ACH Reduction',
          'Lab VAV Hood Control',
          'Lab Exhaust VFDs',
          'Isolation Room Pressurization',
          'Heat Recovery Chillers for Reheat Loops',
          'MRI Chiller Optimization',
          'Sterilizer Reclaim Systems',
          'Medical Air/Vacuum Optimization',
        ],
      },
    ],
  },
  
  {
    id: 'data-center',
    name: 'Data Center Measures',
    description: 'Data center specific optimizations',
    subcategories: [
      {
        id: 'cooling',
        name: 'Cooling',
        equipmentTypes: [
          'Hot Aisle Containment',
          'Cold Aisle Containment',
          'CRAH/CRAC VFD Retrofits',
          'Free Cooling',
          'Liquid Cooling',
        ],
      },
      {
        id: 'it-efficiency',
        name: 'IT Efficiency',
        equipmentTypes: [
          'Server Virtualization',
          'Server Consolidation',
          'High-efficiency UPS',
        ],
      },
    ],
  },
  
  {
    id: 'plug-loads',
    name: 'Plug Load Management',
    description: 'Plug load optimization',
    subcategories: [
      {
        id: 'plug-load-measures',
        name: 'Plug Load Measures',
        equipmentTypes: [
          'Smart Plugs',
          'PC Power Management',
          'Vending Machine Controllers',
          'Lab Freezer Replacements',
          'Appliance Replacement',
          'Copier/Printer Consolidation',
        ],
      },
    ],
  },
];

/**
 * Get all equipment types from all categories
 */
export function getAllEquipmentTypes(): string[] {
  const types: string[] = [];
  HVAC_CATEGORIES.forEach(category => {
    category.subcategories.forEach(subcat => {
      types.push(...subcat.equipmentTypes);
    });
  });
  return types;
}

/**
 * Get category by ID
 */
export function getCategoryById(id: string): EquipmentCategory | undefined {
  return HVAC_CATEGORIES.find(cat => cat.id === id);
}

