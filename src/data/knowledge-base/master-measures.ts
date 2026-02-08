/**
 * Master List of Energy Efficiency Measures
 * Extracted and organized from TRAINING DATA
 * Based on: MASTER LIST — ALL ENERGY-EFFICIENCY MEASURES FOR COMMERCIAL BUILDINGS
 */

import { MeasureCategory, EnergyMeasure, EquipmentType } from './types';

/**
 * Complete Master Measures List
 * Organized by category as per EverWatt standards
 */
export const MASTER_MEASURES: EnergyMeasure[] = [
  // ============================================================================
  // LIGHTING & CONTROLS
  // ============================================================================
  {
    id: 'led-fixture-replacement',
    name: 'LED fixture replacement',
    category: MeasureCategory.LIGHTING_CONTROLS,
    relatedEquipment: [EquipmentType.LED_TROFFER, EquipmentType.LED_HIGH_BAY],
    tags: ['lighting', 'retrofit', 'fast-payback'],
  },
  {
    id: 'led-retrofit-kits',
    name: 'LED retrofit kits (LCM equivalents)',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: ['lighting', 'retrofit', 'cost-effective'],
  },
  {
    id: 'led-lamps',
    name: 'LED lamps (A19, PAR, MR16, tubes, HID replacement)',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: ['lighting', 'lamps', 'simple'],
  },
  {
    id: 'exterior-led',
    name: 'Exterior LED site lighting upgrades',
    category: MeasureCategory.LIGHTING_CONTROLS,
    relatedEquipment: [EquipmentType.LED_AREA_LIGHT],
    tags: ['lighting', 'exterior', 'security'],
  },
  {
    id: 'parking-lot-led',
    name: 'Parking-lot and garage LED upgrades',
    category: MeasureCategory.LIGHTING_CONTROLS,
    relatedEquipment: [EquipmentType.LED_AREA_LIGHT],
    tags: ['lighting', 'parking', 'exterior'],
  },
  {
    id: 'occupancy-sensors',
    name: 'Occupancy sensors',
    category: MeasureCategory.LIGHTING_CONTROLS,
    relatedEquipment: [EquipmentType.OCCUPANCY_SENSOR],
    tags: ['controls', 'sensors', 'automation'],
  },
  {
    id: 'vacancy-sensors',
    name: 'Vacancy sensors',
    category: MeasureCategory.LIGHTING_CONTROLS,
    relatedEquipment: [EquipmentType.OCCUPANCY_SENSOR],
    tags: ['controls', 'sensors'],
  },
  {
    id: 'bi-level-stairwell',
    name: 'Bi-level stairwell lighting controls',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: ['lighting', 'controls', 'safety'],
  },
  {
    id: 'daylight-harvesting',
    name: 'Daylight harvesting sensors',
    category: MeasureCategory.LIGHTING_CONTROLS,
    relatedEquipment: [EquipmentType.DAYLIGHT_SENSOR],
    tags: ['controls', 'daylight', 'high-savings'],
  },
  {
    id: 'networked-lighting-controls',
    name: 'Networked lighting controls (NLC)',
    category: MeasureCategory.LIGHTING_CONTROLS,
    relatedEquipment: [EquipmentType.NLC_SYSTEM],
    tags: ['controls', 'networking', 'iot', 'advanced'],
  },
  {
    id: 'wireless-lighting-controls',
    name: 'Wireless lighting control systems (Autani, nLight, Enlighted, etc.)',
    category: MeasureCategory.LIGHTING_CONTROLS,
    relatedEquipment: [EquipmentType.NLC_SYSTEM],
    tags: ['controls', 'wireless', 'advanced'],
  },
  {
    id: 'scheduling-zoning',
    name: 'Scheduling and zoning controls',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: ['controls', 'automation'],
  },
  {
    id: 'high-bay-motion',
    name: 'High-bay motion sensing and daylighting',
    category: MeasureCategory.LIGHTING_CONTROLS,
    relatedEquipment: [EquipmentType.LED_HIGH_BAY, EquipmentType.OCCUPANCY_SENSOR],
    tags: ['lighting', 'controls', 'warehouse'],
  },
  {
    id: 'photocells-astronomical',
    name: 'Photocells and astronomical timers',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: ['controls', 'exterior'],
  },
  {
    id: 'emergency-lighting',
    name: 'Emergency lighting upgrades and self-testing systems',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: ['lighting', 'safety', 'code-compliance'],
  },
  {
    id: 'dr-lighting',
    name: 'Demand response capable lighting systems',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: ['controls', 'demand-response', 'grid-interactive'],
  },

  // ============================================================================
  // HVAC — COOLING SYSTEM IMPROVEMENTS
  // ============================================================================
  {
    id: 'rtu-replacement',
    name: 'Rooftop unit (RTU) replacement (high-SEER, high-IEER)',
    category: MeasureCategory.HVAC_COOLING,
    relatedEquipment: [EquipmentType.RTU],
    tags: ['hvac', 'cooling', 'replacement'],
  },
  {
    id: 'vrf-vrv',
    name: 'VRF/VRV heat-pump systems',
    category: MeasureCategory.HVAC_COOLING,
    relatedEquipment: [EquipmentType.VRF_VRF],
    tags: ['hvac', 'cooling', 'efficient', 'modern'],
  },
  {
    id: 'chiller-plant-optimization',
    name: 'Chiller plant optimization',
    category: MeasureCategory.HVAC_COOLING,
    relatedEquipment: [
      EquipmentType.CHILLER_CENTRIFUGAL,
      EquipmentType.CHILLER_MAGNETIC,
      EquipmentType.CHILLER_SCREW,
    ],
    tags: ['hvac', 'cooling', 'optimization', 'controls'],
  },
  {
    id: 'chiller-replacements',
    name: 'Chiller replacements (magnetic-bearing, centrifugal, screw)',
    category: MeasureCategory.HVAC_COOLING,
    relatedEquipment: [
      EquipmentType.CHILLER_MAGNETIC,
      EquipmentType.CHILLER_CENTRIFUGAL,
      EquipmentType.CHILLER_SCREW,
    ],
    tags: ['hvac', 'cooling', 'replacement', 'high-impact'],
  },
  {
    id: 'chiller-conversion',
    name: 'Chiller conversion (gas absorption → electric)',
    category: MeasureCategory.HVAC_COOLING,
    relatedEquipment: [EquipmentType.CHILLER_ABSORPTION],
    tags: ['hvac', 'cooling', 'electrification', 'decarbonization'],
  },
  {
    id: 'heat-pump-chillers',
    name: 'Heat-pump chillers (HPCD)',
    category: MeasureCategory.HVAC_COOLING,
    relatedEquipment: [EquipmentType.HEAT_PUMP_WATER],
    tags: ['hvac', 'cooling', 'heat-pump', 'efficient'],
  },
  {
    id: 'economizer-repair',
    name: 'Economizer repair/upgrade',
    category: MeasureCategory.HVAC_COOLING,
    relatedEquipment: [EquipmentType.ECONOBIZER],
    tags: ['hvac', 'cooling', 'free-cooling', 'low-cost'],
  },
  {
    id: 'demand-controlled-ventilation',
    name: 'Demand-controlled ventilation (DCV)',
    category: MeasureCategory.HVAC_COOLING,
    tags: ['hvac', 'ventilation', 'controls', 'iaq'],
  },
  {
    id: 'co2-sensors',
    name: 'CO₂ sensors for ventilation control',
    category: MeasureCategory.HVAC_COOLING,
    tags: ['hvac', 'sensors', 'ventilation', 'iaq'],
  },
  {
    id: 'high-efficiency-dx-coils',
    name: 'High-efficiency DX coils',
    category: MeasureCategory.HVAC_COOLING,
    tags: ['hvac', 'cooling', 'components'],
  },
  {
    id: 'vfd-fans-ahus-chillers',
    name: 'VFDs on fans, AHUs, chillers, cooling towers',
    category: MeasureCategory.HVAC_COOLING,
    relatedEquipment: [EquipmentType.VFD],
    tags: ['hvac', 'controls', 'vfd', 'variable-speed', 'high-savings'],
  },
  {
    id: 'cooling-tower-upgrades',
    name: 'Cooling tower upgrades (variable-speed fans, drift eliminators)',
    category: MeasureCategory.HVAC_COOLING,
    relatedEquipment: [EquipmentType.COOLING_TOWER, EquipmentType.VFD],
    tags: ['hvac', 'cooling', 'tower', 'optimization'],
  },
  {
    id: 'adiabatic-cooling',
    name: 'Adiabatic cooling reuse systems',
    category: MeasureCategory.HVAC_COOLING,
    tags: ['hvac', 'cooling', 'water-efficiency'],
  },
  {
    id: 'condenser-water-pump',
    name: 'Condenser water pump upgrades',
    category: MeasureCategory.HVAC_COOLING,
    tags: ['hvac', 'cooling', 'pumps'],
  },
  {
    id: 'thermal-storage',
    name: 'Thermal storage (ice bank, chilled water storage)',
    category: MeasureCategory.HVAC_COOLING,
    relatedEquipment: [EquipmentType.THERMAL_STORAGE],
    tags: ['hvac', 'cooling', 'storage', 'demand-shift'],
  },

  // ============================================================================
  // HVAC — HEATING SYSTEM IMPROVEMENTS
  // ============================================================================
  {
    id: 'boiler-retrofits',
    name: 'Boiler retrofits (high efficiency condensing boilers)',
    category: MeasureCategory.HVAC_HEATING,
    relatedEquipment: [EquipmentType.BOILER_CONDENSING],
    tags: ['hvac', 'heating', 'retrofit', 'efficient'],
  },
  {
    id: 'boiler-replacements',
    name: 'Boiler replacements',
    category: MeasureCategory.HVAC_HEATING,
    relatedEquipment: [
      EquipmentType.BOILER_HOT_WATER,
      EquipmentType.BOILER_STEAM,
      EquipmentType.BOILER_CONDENSING,
    ],
    tags: ['hvac', 'heating', 'replacement'],
  },
  {
    id: 'heat-pump-water-heaters',
    name: 'Heat-pump water heaters (HPWH)',
    category: MeasureCategory.HVAC_HEATING,
    relatedEquipment: [EquipmentType.HPWH],
    tags: ['hvac', 'heating', 'water', 'heat-pump', 'electrification'],
  },
  {
    id: 'heat-pumps-replace-furnaces',
    name: 'Heat-pump systems replacing gas furnaces',
    category: MeasureCategory.HVAC_HEATING,
    relatedEquipment: [EquipmentType.HEAT_PUMP_AIR],
    tags: ['hvac', 'heating', 'heat-pump', 'electrification', 'decarbonization'],
  },
  {
    id: 'heat-pump-chiller-boiler',
    name: 'Heat-pump chiller/boiler combos',
    category: MeasureCategory.HVAC_HEATING,
    relatedEquipment: [EquipmentType.HEAT_PUMP_WATER],
    tags: ['hvac', 'heating', 'cooling', 'heat-pump'],
  },
  {
    id: 'hot-water-reset',
    name: 'Hot-water reset controls',
    category: MeasureCategory.HVAC_HEATING,
    tags: ['hvac', 'heating', 'controls', 'optimization'],
  },
  {
    id: 'hydronic-balancing',
    name: 'Hydronic balancing',
    category: MeasureCategory.HVAC_HEATING,
    tags: ['hvac', 'heating', 'optimization'],
  },
  {
    id: 'low-loss-header',
    name: 'Low-loss header optimization',
    category: MeasureCategory.HVAC_HEATING,
    tags: ['hvac', 'heating', 'optimization'],
  },
  {
    id: 'infrared-heating',
    name: 'Infrared heating (warehouse, manufacturing)',
    category: MeasureCategory.HVAC_HEATING,
    tags: ['hvac', 'heating', 'warehouse', 'industrial'],
  },
  {
    id: 'gas-to-electric-conversion',
    name: 'Gas-to-electric conversion (full electrification)',
    category: MeasureCategory.HVAC_HEATING,
    tags: ['hvac', 'heating', 'electrification', 'decarbonization', 'pg&e-priority'],
  },
  {
    id: 'radiant-heating',
    name: 'Radiant heating upgrades',
    category: MeasureCategory.HVAC_HEATING,
    tags: ['hvac', 'heating', 'upgrade'],
  },
  {
    id: 'steam-trap-replacement',
    name: 'Steam trap replacement programs',
    category: MeasureCategory.HVAC_HEATING,
    relatedEquipment: [EquipmentType.BOILER_STEAM],
    tags: ['hvac', 'heating', 'steam', 'maintenance'],
  },
  {
    id: 'steam-to-hot-water',
    name: 'Steam-to-hot water conversion',
    category: MeasureCategory.HVAC_HEATING,
    tags: ['hvac', 'heating', 'conversion', 'efficiency'],
  },
  {
    id: 'thermal-decarbonization',
    name: 'Thermal-decarbonization planning (roadmap)',
    category: MeasureCategory.HVAC_HEATING,
    tags: ['hvac', 'heating', 'decarbonization', 'planning'],
  },

  // ============================================================================
  // AIR HANDLING & VENTILATION
  // ============================================================================
  {
    id: 'ahu-replacement',
    name: 'AHU replacement',
    category: MeasureCategory.AIR_HANDLING,
    tags: ['hvac', 'air-handling', 'replacement'],
  },
  {
    id: 'ahu-vfds',
    name: 'AHU VFDs',
    category: MeasureCategory.AIR_HANDLING,
    relatedEquipment: [EquipmentType.VFD],
    tags: ['hvac', 'air-handling', 'vfd', 'high-savings'],
  },
  {
    id: 'fan-upgrades',
    name: 'Fan upgrades (ECM motors, high-efficiency fans)',
    category: MeasureCategory.AIR_HANDLING,
    tags: ['hvac', 'air-handling', 'motors', 'efficient'],
  },
  {
    id: 'ventilation-optimization',
    name: 'Ventilation optimization (ASHRAE 62.1 compliant)',
    category: MeasureCategory.AIR_HANDLING,
    tags: ['hvac', 'ventilation', 'iaq', 'code-compliance'],
  },
  {
    id: 'duct-sealing',
    name: 'Duct sealing',
    category: MeasureCategory.AIR_HANDLING,
    tags: ['hvac', 'air-handling', 'low-cost'],
  },
  {
    id: 'oa-economizer',
    name: 'Outside-air economizer optimization',
    category: MeasureCategory.AIR_HANDLING,
    tags: ['hvac', 'air-handling', 'free-cooling'],
  },
  {
    id: 'airflow-recommissioning',
    name: 'Airflow recommissioning',
    category: MeasureCategory.AIR_HANDLING,
    tags: ['hvac', 'air-handling', 'commissioning'],
  },
  {
    id: 'zoning-redesign',
    name: 'Zoning redesign',
    category: MeasureCategory.AIR_HANDLING,
    tags: ['hvac', 'air-handling', 'design'],
  },
  {
    id: 'static-pressure-reset',
    name: 'Static pressure reset',
    category: MeasureCategory.AIR_HANDLING,
    tags: ['hvac', 'air-handling', 'controls', 'optimization'],
  },
  {
    id: 'building-pressurization',
    name: 'Building pressurization correction',
    category: MeasureCategory.AIR_HANDLING,
    tags: ['hvac', 'air-handling', 'optimization'],
  },
  {
    id: 'filtration-upgrades',
    name: 'Filtration upgrades (MERV13+ with efficient fans)',
    category: MeasureCategory.AIR_HANDLING,
    tags: ['hvac', 'air-handling', 'iaq', 'healthcare'],
  },

  // ============================================================================
  // BUILDING AUTOMATION / CONTROLS
  // ============================================================================
  {
    id: 'bms-ems-installation',
    name: 'BMS/EMS installation (BACnet, Niagara, Ignition, KMC, JCI, Siemens, Honeywell)',
    category: MeasureCategory.BUILDING_AUTOMATION,
    relatedEquipment: [EquipmentType.BMS_EMS],
    tags: ['controls', 'automation', 'building-management', 'advanced'],
  },
  {
    id: 'retro-commissioning',
    name: 'Retro-commissioning (RCx)',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: ['controls', 'commissioning', 'optimization'],
  },
  {
    id: 'automated-demand-response',
    name: 'Automated demand response (ADR)',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: ['controls', 'demand-response', 'grid-interactive'],
  },
  {
    id: 'global-scheduling',
    name: 'Global scheduling & occupancy alignment',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: ['controls', 'automation', 'scheduling'],
  },
  {
    id: 'fault-detection',
    name: 'Fault detection & diagnostics (FDD)',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: ['controls', 'diagnostics', 'maintenance'],
  },
  {
    id: 'energy-dashboards',
    name: 'Energy dashboards & M&V systems',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: ['controls', 'monitoring', 'measurement'],
  },
  {
    id: 'runtime-optimization',
    name: 'Equipment runtime optimization',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: ['controls', 'optimization'],
  },
  {
    id: 'reset-strategies',
    name: 'Reset strategies: supply air temp, chilled-water temp, hot-water temp, static pressure',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: ['controls', 'optimization', 'advanced'],
  },
  {
    id: 'setpoint-optimization',
    name: 'Setpoint optimization',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: ['controls', 'optimization'],
  },
  {
    id: 'smart-thermostats',
    name: 'Smart thermostats for small facilities',
    category: MeasureCategory.BUILDING_AUTOMATION,
    relatedEquipment: [EquipmentType.SMART_THERMOSTAT],
    tags: ['controls', 'thermostats', 'simple'],
  },
  {
    id: 'smart-meters',
    name: 'Smart meters & submeters (circuit-level)',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: ['controls', 'monitoring', 'measurement'],
  },
  {
    id: 'ai-optimization',
    name: 'AI-based optimization (EverWatt AI controls)',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: ['controls', 'ai', 'advanced', 'future'],
  },

  // ============================================================================
  // BUILDING ENVELOPE
  // ============================================================================
  {
    id: 'roof-insulation',
    name: 'Roof insulation upgrades',
    category: MeasureCategory.BUILDING_ENVELOPE,
    tags: ['envelope', 'insulation', 'low-cost'],
  },
  {
    id: 'wall-insulation',
    name: 'Wall insulation upgrades',
    category: MeasureCategory.BUILDING_ENVELOPE,
    tags: ['envelope', 'insulation'],
  },
  {
    id: 'window-tinting',
    name: 'Window tinting',
    category: MeasureCategory.BUILDING_ENVELOPE,
    tags: ['envelope', 'windows', 'solar-gain'],
  },
  {
    id: 'high-performance-glazing',
    name: 'High-performance glazing',
    category: MeasureCategory.BUILDING_ENVELOPE,
    tags: ['envelope', 'windows', 'upgrade'],
  },
  {
    id: 'low-e-window-film',
    name: 'Low-E window film',
    category: MeasureCategory.BUILDING_ENVELOPE,
    tags: ['envelope', 'windows', 'low-cost'],
  },
  {
    id: 'cool-roof-coating',
    name: 'Cool roof coating',
    category: MeasureCategory.BUILDING_ENVELOPE,
    tags: ['envelope', 'roof', 'cooling-load'],
  },
  {
    id: 'air-sealing',
    name: 'Air sealing',
    category: MeasureCategory.BUILDING_ENVELOPE,
    tags: ['envelope', 'infiltration', 'low-cost'],
  },
  {
    id: 'vestibules',
    name: 'Vestibules for main entrances',
    category: MeasureCategory.BUILDING_ENVELOPE,
    tags: ['envelope', 'infiltration'],
  },
  {
    id: 'exterior-shading',
    name: 'Exterior shading devices',
    category: MeasureCategory.BUILDING_ENVELOPE,
    tags: ['envelope', 'solar-gain', 'design'],
  },
  {
    id: 'door-sweeps',
    name: 'Door sweeps and weather stripping',
    category: MeasureCategory.BUILDING_ENVELOPE,
    tags: ['envelope', 'infiltration', 'low-cost'],
  },
  {
    id: 'skylight-upgrades',
    name: 'Skylight upgrades (diffused daylight)',
    category: MeasureCategory.BUILDING_ENVELOPE,
    tags: ['envelope', 'daylighting', 'lighting'],
  },

  // ============================================================================
  // WATER & PLUMBING EFFICIENCY
  // ============================================================================
  {
    id: 'low-flow-faucets',
    name: 'Low-flow faucets',
    category: MeasureCategory.WATER_PLUMBING,
    tags: ['water', 'plumbing', 'low-cost'],
  },
  {
    id: 'low-flow-toilets',
    name: 'Low-flow toilets',
    category: MeasureCategory.WATER_PLUMBING,
    tags: ['water', 'plumbing'],
  },
  {
    id: 'low-flow-urinals',
    name: 'Low-flow urinals',
    category: MeasureCategory.WATER_PLUMBING,
    tags: ['water', 'plumbing'],
  },
  {
    id: 'showerhead-upgrades',
    name: 'Showerhead upgrades (hospitality / gyms)',
    category: MeasureCategory.WATER_PLUMBING,
    tags: ['water', 'plumbing', 'hospitality'],
  },
  {
    id: 'leak-detection',
    name: 'Leak detection systems',
    category: MeasureCategory.WATER_PLUMBING,
    tags: ['water', 'monitoring', 'prevention'],
  },
  {
    id: 'hot-water-recirculation',
    name: 'Hot-water recirculation optimization',
    category: MeasureCategory.WATER_PLUMBING,
    tags: ['water', 'heating', 'optimization'],
  },
  {
    id: 'hpwh-commercial',
    name: 'Heat-pump water heaters (commercial grade)',
    category: MeasureCategory.WATER_PLUMBING,
    tags: ['water', 'heating', 'heat-pump', 'electrification'],
  },
  {
    id: 'boiler-to-hpwh',
    name: 'Boiler-to-HPWH conversion',
    category: MeasureCategory.WATER_PLUMBING,
    tags: ['water', 'heating', 'conversion', 'electrification'],
  },
  {
    id: 'cooling-tower-water',
    name: 'Cooling tower water efficiency',
    category: MeasureCategory.WATER_PLUMBING,
    tags: ['water', 'cooling', 'tower'],
  },
  {
    id: 'graywater-reuse',
    name: 'Graywater reuse systems',
    category: MeasureCategory.WATER_PLUMBING,
    tags: ['water', 'reuse', 'sustainability'],
  },
  {
    id: 'rainwater-harvesting',
    name: 'Rainwater harvesting for irrigation',
    category: MeasureCategory.WATER_PLUMBING,
    tags: ['water', 'harvesting', 'irrigation'],
  },
  {
    id: 'dishwashing-upgrades',
    name: 'Commercial dishwashing system upgrades',
    category: MeasureCategory.WATER_PLUMBING,
    tags: ['water', 'commercial', 'hospitality'],
  },

  // ============================================================================
  // ELECTRICAL & MOTORS
  // ============================================================================
  {
    id: 'ecm-motors',
    name: 'ECM motors for fans, pumps',
    category: MeasureCategory.ELECTRICAL_MOTORS,
    tags: ['motors', 'efficient', 'fans', 'pumps'],
  },
  {
    id: 'vfd-retrofits',
    name: 'VFD retrofits for pumps, fans, compressors',
    category: MeasureCategory.ELECTRICAL_MOTORS,
    tags: ['vfd', 'motors', 'variable-speed', 'high-savings'],
  },
  {
    id: 'soft-start-controllers',
    name: 'Soft-start motor controllers',
    category: MeasureCategory.ELECTRICAL_MOTORS,
    tags: ['motors', 'controls', 'protection'],
  },
  {
    id: 'premium-efficiency-motors',
    name: 'Premium-efficiency motors',
    category: MeasureCategory.ELECTRICAL_MOTORS,
    tags: ['motors', 'efficient', 'replacement'],
  },
  {
    id: 'air-compressor-optimization',
    name: 'Air-compressor optimization',
    category: MeasureCategory.ELECTRICAL_MOTORS,
    tags: ['compressed-air', 'industrial', 'optimization'],
  },
  {
    id: 'air-leak-reduction',
    name: 'Air-leak reduction programs',
    category: MeasureCategory.ELECTRICAL_MOTORS,
    tags: ['compressed-air', 'industrial', 'low-cost'],
  },
  {
    id: 'refrigeration-compressor',
    name: 'Refrigeration compressor upgrades',
    category: MeasureCategory.ELECTRICAL_MOTORS,
    tags: ['refrigeration', 'compressor', 'grocery'],
  },
  {
    id: 'refrigeration-gaskets',
    name: 'Refrigeration door gaskets, curtains',
    category: MeasureCategory.ELECTRICAL_MOTORS,
    tags: ['refrigeration', 'grocery', 'low-cost'],
  },
  {
    id: 'compressor-heat-recovery',
    name: 'Compressor heat recovery',
    category: MeasureCategory.ELECTRICAL_MOTORS,
    tags: ['refrigeration', 'heat-recovery', 'waste-heat'],
  },
  {
    id: 'elevator-modernization',
    name: 'Elevator modernization (regen drives)',
    category: MeasureCategory.ELECTRICAL_MOTORS,
    tags: ['elevator', 'regenerative', 'efficient'],
  },
  {
    id: 'power-factor-correction',
    name: 'Power factor correction',
    category: MeasureCategory.ELECTRICAL_MOTORS,
    tags: ['electrical', 'power-quality', 'demand'],
  },
  {
    id: 'transformer-replacement',
    name: 'Transformer replacement',
    category: MeasureCategory.ELECTRICAL_MOTORS,
    tags: ['electrical', 'distribution', 'efficient'],
  },
  {
    id: 'ups-efficiency',
    name: 'UPS efficiency upgrades',
    category: MeasureCategory.ELECTRICAL_MOTORS,
    tags: ['electrical', 'ups', 'data-center'],
  },

  // ============================================================================
  // GAS-TO-ELECTRIC DECARBONIZATION
  // ============================================================================
  {
    id: 'gas-absorption-to-electric',
    name: 'Gas absorption chiller → electric chiller',
    category: MeasureCategory.GAS_TO_ELECTRIC,
    tags: ['decarbonization', 'electrification', 'chiller', 'pg&e-priority'],
  },
  {
    id: 'steam-boiler-to-hp',
    name: 'Steam boiler → heat-pump chiller/boiler',
    category: MeasureCategory.GAS_TO_ELECTRIC,
    tags: ['decarbonization', 'electrification', 'heating', 'pg&e-priority'],
  },
  {
    id: 'gas-water-heater-to-hpwh',
    name: 'Gas water heater → HPWH',
    category: MeasureCategory.GAS_TO_ELECTRIC,
    tags: ['decarbonization', 'electrification', 'water-heating', 'pg&e-priority'],
  },
  {
    id: 'gas-rtu-to-heat-pump',
    name: 'Gas rooftop units → heat pumps',
    category: MeasureCategory.GAS_TO_ELECTRIC,
    tags: ['decarbonization', 'electrification', 'rtu', 'pg&e-priority'],
  },
  {
    id: 'gas-furnaces-to-vrf',
    name: 'Gas furnaces → VRF',
    category: MeasureCategory.GAS_TO_ELECTRIC,
    tags: ['decarbonization', 'electrification', 'heating', 'pg&e-priority'],
  },
  {
    id: 'gas-kitchen-makeup-air',
    name: 'Gas kitchen hood make-up air → electric w/ VFD',
    category: MeasureCategory.GAS_TO_ELECTRIC,
    tags: ['decarbonization', 'electrification', 'kitchen', 'pg&e-priority'],
  },
  {
    id: 'gas-appliances-to-electric',
    name: 'Gas appliances → induction or electric',
    category: MeasureCategory.GAS_TO_ELECTRIC,
    tags: ['decarbonization', 'electrification', 'appliances', 'pg&e-priority'],
  },
  {
    id: 'thermal-storage-heat-pumps',
    name: 'Thermal storage + heat pumps',
    category: MeasureCategory.GAS_TO_ELECTRIC,
    tags: ['decarbonization', 'storage', 'heat-pump', 'pg&e-priority'],
  },
  {
    id: 'whole-building-electrification',
    name: 'Whole-building electrification studies',
    category: MeasureCategory.GAS_TO_ELECTRIC,
    tags: ['decarbonization', 'electrification', 'planning', 'pg&e-priority'],
  },
  {
    id: 'central-plant-electrification',
    name: 'Central plant electrification',
    category: MeasureCategory.GAS_TO_ELECTRIC,
    tags: ['decarbonization', 'electrification', 'central-plant', 'pg&e-priority'],
  },
  {
    id: 'reheat-electrification',
    name: 'Reheat electrification',
    category: MeasureCategory.GAS_TO_ELECTRIC,
    tags: ['decarbonization', 'electrification', 'reheat', 'pg&e-priority'],
  },
  {
    id: 'dhw-electrification',
    name: 'Domestic hot water electrification',
    category: MeasureCategory.GAS_TO_ELECTRIC,
    tags: ['decarbonization', 'electrification', 'water-heating', 'pg&e-priority'],
  },

  // ============================================================================
  // REFRIGERATION (Food service, grocery, lab)
  // ============================================================================
  {
    id: 'anti-sweat-heater-controls',
    name: 'Anti-sweat heater controls',
    category: MeasureCategory.REFRIGERATION,
    tags: ['refrigeration', 'grocery', 'controls', 'low-cost'],
  },
  {
    id: 'high-efficiency-evap-fans',
    name: 'High-efficiency evaporator fans',
    category: MeasureCategory.REFRIGERATION,
    tags: ['refrigeration', 'grocery', 'fans', 'efficient'],
  },
  {
    id: 'night-curtains',
    name: 'Night curtains',
    category: MeasureCategory.REFRIGERATION,
    tags: ['refrigeration', 'grocery', 'low-cost'],
  },
  {
    id: 'floating-head-pressure',
    name: 'Floating head pressure controls',
    category: MeasureCategory.REFRIGERATION,
    tags: ['refrigeration', 'grocery', 'controls', 'optimization'],
  },
  {
    id: 'ec-fan-motors',
    name: 'EC fan motors',
    category: MeasureCategory.REFRIGERATION,
    tags: ['refrigeration', 'grocery', 'motors', 'efficient'],
  },
  {
    id: 'led-case-lighting',
    name: 'LED case lighting',
    category: MeasureCategory.REFRIGERATION,
    tags: ['refrigeration', 'lighting', 'grocery', 'led'],
  },
  {
    id: 'smart-defrost-controls',
    name: 'Smart defrost controls',
    category: MeasureCategory.REFRIGERATION,
    tags: ['refrigeration', 'grocery', 'controls', 'optimization'],
  },

  // ============================================================================
  // PUMPS & DISTRIBUTION SYSTEMS
  // ============================================================================
  {
    id: 'chw-pump-vfds',
    name: 'Chilled-water pump VFDs',
    category: MeasureCategory.PUMPS_DISTRIBUTION,
    tags: ['pumps', 'vfd', 'cooling', 'high-savings'],
  },
  {
    id: 'hw-pump-vfds',
    name: 'Hot-water pump VFDs',
    category: MeasureCategory.PUMPS_DISTRIBUTION,
    tags: ['pumps', 'vfd', 'heating', 'high-savings'],
  },
  {
    id: 'condenser-water-pump-opt',
    name: 'Condenser water pump optimization',
    category: MeasureCategory.PUMPS_DISTRIBUTION,
    tags: ['pumps', 'cooling', 'optimization'],
  },
  {
    id: 'pump-replacements',
    name: 'Pump replacements',
    category: MeasureCategory.PUMPS_DISTRIBUTION,
    tags: ['pumps', 'replacement', 'efficient'],
  },
  {
    id: 'loop-temp-reset',
    name: 'Loop temperature reset',
    category: MeasureCategory.PUMPS_DISTRIBUTION,
    tags: ['pumps', 'controls', 'optimization'],
  },
  {
    id: 'variable-primary-flow',
    name: 'Variable primary flow upgrades',
    category: MeasureCategory.PUMPS_DISTRIBUTION,
    tags: ['pumps', 'design', 'advanced'],
  },
  {
    id: 'hydronic-balancing-pumps',
    name: 'Hydronic balancing',
    category: MeasureCategory.PUMPS_DISTRIBUTION,
    tags: ['pumps', 'balancing', 'optimization'],
  },
  {
    id: 'picvs',
    name: 'Pressure-independent control valves (PICVs)',
    category: MeasureCategory.PUMPS_DISTRIBUTION,
    tags: ['pumps', 'valves', 'controls', 'advanced'],
  },

  // ============================================================================
  // RENEWABLES & STORAGE
  // ============================================================================
  {
    id: 'solar-pv',
    name: 'Solar PV',
    category: MeasureCategory.RENEWABLES_STORAGE,
    tags: ['renewable', 'solar', 'generation'],
  },
  {
    id: 'solar-thermal',
    name: 'Solar thermal (water, pool, process)',
    category: MeasureCategory.RENEWABLES_STORAGE,
    tags: ['renewable', 'solar', 'water-heating'],
  },
  {
    id: 'battery-storage',
    name: 'Battery storage (BESS)',
    category: MeasureCategory.RENEWABLES_STORAGE,
    tags: ['storage', 'battery', 'peak-shaving', 'demand-response'],
  },
  {
    id: 'peak-shaving-batteries',
    name: 'Peak shaving batteries',
    category: MeasureCategory.RENEWABLES_STORAGE,
    tags: ['storage', 'battery', 'peak-shaving', 'demand-charge'],
  },
  {
    id: 'microgrid-controls',
    name: 'Microgrid controls',
    category: MeasureCategory.RENEWABLES_STORAGE,
    tags: ['storage', 'microgrid', 'advanced'],
  },
  {
    id: 'chp-replacement',
    name: 'CHP replacement with renewables',
    category: MeasureCategory.RENEWABLES_STORAGE,
    tags: ['renewable', 'chp', 'replacement'],
  },
  {
    id: 'ev-charging-infrastructure',
    name: 'EV charging infrastructure',
    category: MeasureCategory.RENEWABLES_STORAGE,
    tags: ['ev', 'charging', 'electrification'],
  },
  {
    id: 'building-integrated-pv',
    name: 'Building-integrated PV',
    category: MeasureCategory.RENEWABLES_STORAGE,
    tags: ['renewable', 'solar', 'integration'],
  },
  {
    id: 'geb',
    name: 'Grid-interactive efficient buildings (GEB)',
    category: MeasureCategory.RENEWABLES_STORAGE,
    tags: ['storage', 'grid-interactive', 'advanced', 'future'],
  },

  // ============================================================================
  // TRANSPORTATION / EV
  // ============================================================================
  {
    id: 'ev-charging',
    name: 'EV charging',
    category: MeasureCategory.TRANSPORTATION_EV,
    tags: ['ev', 'charging', 'electrification'],
  },
  {
    id: 'fleet-electrification',
    name: 'Fleet electrification',
    category: MeasureCategory.TRANSPORTATION_EV,
    tags: ['ev', 'fleet', 'electrification'],
  },
  {
    id: 'smart-ev-charging',
    name: 'Smart EV charging load management',
    category: MeasureCategory.TRANSPORTATION_EV,
    tags: ['ev', 'charging', 'controls', 'demand-management'],
  },
  {
    id: 'v2g',
    name: 'V2G (future-ready)',
    category: MeasureCategory.TRANSPORTATION_EV,
    tags: ['ev', 'v2g', 'future', 'grid-services'],
  },
  {
    id: 'parking-garage-ventilation',
    name: 'Parking-garage ventilation controls',
    category: MeasureCategory.TRANSPORTATION_EV,
    tags: ['ev', 'ventilation', 'parking'],
  },

  // ============================================================================
  // PROCESS / INDUSTRIAL
  // ============================================================================
  {
    id: 'compressed-air-optimization',
    name: 'Compressed air optimization',
    category: MeasureCategory.PROCESS_INDUSTRIAL,
    tags: ['industrial', 'compressed-air', 'optimization'],
  },
  {
    id: 'air-leak-audits',
    name: 'Air leak audits',
    category: MeasureCategory.PROCESS_INDUSTRIAL,
    tags: ['industrial', 'compressed-air', 'low-cost'],
  },
  {
    id: 'high-efficiency-industrial-motors',
    name: 'High-efficiency industrial motors',
    category: MeasureCategory.PROCESS_INDUSTRIAL,
    tags: ['industrial', 'motors', 'efficient'],
  },
  {
    id: 'heat-recovery-industrial',
    name: 'Heat recovery',
    category: MeasureCategory.PROCESS_INDUSTRIAL,
    tags: ['industrial', 'heat-recovery', 'waste-heat'],
  },
  {
    id: 'process-chiller-upgrades',
    name: 'Process chiller upgrades',
    category: MeasureCategory.PROCESS_INDUSTRIAL,
    tags: ['industrial', 'process', 'cooling'],
  },
  {
    id: 'process-boiler-upgrades',
    name: 'Process boiler upgrades',
    category: MeasureCategory.PROCESS_INDUSTRIAL,
    tags: ['industrial', 'process', 'heating'],
  },
  {
    id: 'waste-heat-utilization',
    name: 'Waste heat utilization',
    category: MeasureCategory.PROCESS_INDUSTRIAL,
    tags: ['industrial', 'heat-recovery', 'waste-heat'],
  },
  {
    id: 'variable-load-process',
    name: 'Variable-load process systems',
    category: MeasureCategory.PROCESS_INDUSTRIAL,
    tags: ['industrial', 'process', 'controls'],
  },
  {
    id: 'industrial-refrigeration',
    name: 'Industrial refrigeration optimization',
    category: MeasureCategory.PROCESS_INDUSTRIAL,
    tags: ['industrial', 'refrigeration', 'optimization'],
  },
  {
    id: 'conveyor-vfds',
    name: 'Conveyor VFDs',
    category: MeasureCategory.PROCESS_INDUSTRIAL,
    tags: ['industrial', 'conveyor', 'vfd'],
  },
  {
    id: 'industrial-oven',
    name: 'Industrial oven improvements',
    category: MeasureCategory.PROCESS_INDUSTRIAL,
    tags: ['industrial', 'process-heating'],
  },
  {
    id: 'makeup-air-control',
    name: 'Make-up air system control',
    category: MeasureCategory.PROCESS_INDUSTRIAL,
    tags: ['industrial', 'ventilation', 'controls'],
  },
  {
    id: 'industrial-fans-pumps',
    name: 'Industrial fans & pumps upgrades',
    category: MeasureCategory.PROCESS_INDUSTRIAL,
    tags: ['industrial', 'fans', 'pumps'],
  },

  // ============================================================================
  // HEALTHCARE-SPECIFIC MEASURES
  // ============================================================================
  {
    id: 'or-ahu-setbacks',
    name: 'Operating room AHU setbacks',
    category: MeasureCategory.HEALTHCARE_SPECIFIC,
    tags: ['healthcare', 'or', 'hvac', 'setback'],
  },
  {
    id: 'or-air-change-reduction',
    name: 'OR air-change-rate reduction strategies (code-compliant)',
    category: MeasureCategory.HEALTHCARE_SPECIFIC,
    tags: ['healthcare', 'or', 'hvac', 'advanced'],
  },
  {
    id: 'heat-recovery-chillers-reheat',
    name: 'Heat-recovery chillers for reheat loops',
    category: MeasureCategory.HEALTHCARE_SPECIFIC,
    tags: ['healthcare', 'hvac', 'heat-recovery', 'reheat'],
  },
  {
    id: 'isolation-room-pressurization',
    name: 'Isolation room pressurization control',
    category: MeasureCategory.HEALTHCARE_SPECIFIC,
    tags: ['healthcare', 'hvac', 'pressurization', 'iaq'],
  },
  {
    id: 'central-plant-optimization-hc',
    name: 'Central plant optimization',
    category: MeasureCategory.HEALTHCARE_SPECIFIC,
    tags: ['healthcare', 'hvac', 'central-plant'],
  },
  {
    id: 'high-efficiency-sterilizers',
    name: 'High-efficiency sterilizers',
    category: MeasureCategory.HEALTHCARE_SPECIFIC,
    tags: ['healthcare', 'equipment', 'sterilization'],
  },
  {
    id: 'lab-fume-hood-vav',
    name: 'Lab fume hood VAV systems',
    category: MeasureCategory.HEALTHCARE_SPECIFIC,
    tags: ['healthcare', 'lab', 'ventilation', 'vav'],
  },
  {
    id: 'lab-exhaust-vfds',
    name: 'Lab exhaust VFDs',
    category: MeasureCategory.HEALTHCARE_SPECIFIC,
    tags: ['healthcare', 'lab', 'ventilation', 'vfd'],
  },
  {
    id: 'supply-return-tracking',
    name: 'Supply/return tracking for 24/7 units',
    category: MeasureCategory.HEALTHCARE_SPECIFIC,
    tags: ['healthcare', 'hvac', 'monitoring', 'controls'],
  },
  {
    id: 'medical-equipment-plug-load',
    name: 'Medical equipment plug-load management',
    category: MeasureCategory.HEALTHCARE_SPECIFIC,
    tags: ['healthcare', 'plug-load', 'controls'],
  },
  {
    id: 'data-center-cooling-hc',
    name: 'Data center/surgical suite cooling optimization',
    category: MeasureCategory.HEALTHCARE_SPECIFIC,
    tags: ['healthcare', 'data-center', 'cooling'],
  },

  // ============================================================================
  // MEASUREMENT, VERIFICATION & TRAINING
  // ============================================================================
  {
    id: 'real-time-monitoring',
    name: 'Real-time energy monitoring',
    category: MeasureCategory.MEASUREMENT_VERIFICATION,
    tags: ['monitoring', 'measurement', 'mv'],
  },
  {
    id: 'interval-data-analysis',
    name: 'Interval-data analysis',
    category: MeasureCategory.MEASUREMENT_VERIFICATION,
    tags: ['monitoring', 'measurement', 'data-analysis'],
  },
  {
    id: 'staff-training',
    name: 'Staff training programs',
    category: MeasureCategory.MEASUREMENT_VERIFICATION,
    tags: ['training', 'education'],
  },
  {
    id: 'commissioning',
    name: 'Commissioning (Cx)',
    category: MeasureCategory.MEASUREMENT_VERIFICATION,
    tags: ['commissioning', 'quality-assurance'],
  },
  {
    id: 'retro-commissioning',
    name: 'Recommissioning (RCx)',
    category: MeasureCategory.MEASUREMENT_VERIFICATION,
    tags: ['commissioning', 'optimization'],
  },
  {
    id: 'continuous-commissioning',
    name: 'Continuous commissioning',
    category: MeasureCategory.MEASUREMENT_VERIFICATION,
    tags: ['commissioning', 'ongoing'],
  },
  {
    id: 'lifecycle-cost-analysis',
    name: 'Lifecycle cost analysis',
    category: MeasureCategory.MEASUREMENT_VERIFICATION,
    tags: ['analysis', 'financial'],
  },
  {
    id: 'asset-level-benchmarking',
    name: 'Asset-level benchmarking',
    category: MeasureCategory.MEASUREMENT_VERIFICATION,
    tags: ['benchmarking', 'analysis'],
  },
  {
    id: 'energy-audits',
    name: 'Energy audits (ASHRAE Level 1, 2, 3)',
    category: MeasureCategory.MEASUREMENT_VERIFICATION,
    tags: ['audit', 'analysis', 'ashrae'],
  },
,
  {
    id: 'electrification',
    name: 'Electrification',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: [],
  },
  {
    id: 'financing-structures',
    name: 'Financing structures',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: [],
  },
  {
    id: 'induction-fixtures',
    name: 'Induction fixtures',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'led-downlights-can-retrofits',
    name: 'LED downlights & can retrofits',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'troffer-retrofit-kits',
    name: 'Troffer retrofit kits',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'downlight-retrofit-kits',
    name: 'Downlight retrofit kits',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'emergency-conversion-kits',
    name: 'Emergency conversion kits',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'zoning-scheduling',
    name: 'Zoning & scheduling',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'cleaning-lenses-optics',
    name: 'Cleaning lenses & optics',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'condenser-water-pumps',
    name: 'Condenser water pumps',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'cooling-tower-fans',
    name: 'Cooling tower fans',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'chiller-plant-optimization-sequences',
    name: 'Chiller plant optimization sequences',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'filter-coil-maintenance-schedules',
    name: 'Filter & coil maintenance schedules',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'steam-boilers',
    name: 'Steam boilers',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'condensing-hot-water-boilers',
    name: 'Condensing hot water boilers',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'blowdown-heat-recovery',
    name: 'Blowdown heat recovery',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'boiler-economizers',
    name: 'Boiler economizers',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'hot-water-reset',
    name: 'Hot water reset',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'condensate-return-improvements',
    name: 'Condensate return improvements',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'pipe-insulation-upgrades',
    name: 'Pipe insulation upgrades',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'seasonal-boiler-shutdown-where-possible',
    name: 'Seasonal boiler shutdown where possible',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'boiler-tuning-and-combustion-checks',
    name: 'Boiler tuning and combustion checks',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'temperature-setpoint-policies-in-winter',
    name: 'Temperature setpoint policies in winter',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'pneumatic-vav-systems',
    name: 'Pneumatic VAV systems',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'old-maus',
    name: 'Old MAUs',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'general-exhaust',
    name: 'General exhaust',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'kitchen-hoods',
    name: 'Kitchen hoods',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'garage-exhaust',
    name: 'Garage exhaust',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'lab-fume-hoods',
    name: 'Lab fume hoods',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'industrial-process-exhaust',
    name: 'Industrial process exhaust',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'doas-units',
    name: 'DOAS units',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'vav-fume-hood-systems',
    name: 'VAV fume hood systems',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'dckv-retrofits-for-kitchens',
    name: 'DCKV retrofits for kitchens',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'lab-hood-sash-flow-controls',
    name: 'Lab hood sash & flow controls',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: [],
  },
  {
    id: 'duct-sealing-insulation',
    name: 'Duct sealing & insulation',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: [],
  },
  {
    id: 'vav-box-actuator-sensor-upgrades',
    name: 'VAV box actuator & sensor upgrades',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: [],
  },
  {
    id: 'kitchen-staff-training-on-hood-operation',
    name: 'Kitchen staff training on hood operation',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: [],
  },
  {
    id: 'pneumatic-control-systems',
    name: 'Pneumatic control systems',
    category: MeasureCategory.HVAC_COOLING,
    tags: [],
  },
  {
    id: 'standalone-stats',
    name: 'Standalone stats',
    category: MeasureCategory.HVAC_COOLING,
    tags: [],
  },
  {
    id: 'room-controllers-smart-stats',
    name: 'Room controllers & smart stats',
    category: MeasureCategory.HVAC_COOLING,
    tags: [],
  },
  {
    id: 'control-reprogramming-sequence-optimization',
    name: 'Control reprogramming & sequence optimization',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'sensor-actuator-replacements',
    name: 'Sensor & actuator replacements',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'network-gateway-upgrades',
    name: 'Network & gateway upgrades',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'equipment-sequencing',
    name: 'Equipment sequencing',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'global-schedules-occupancy-modes',
    name: 'Global schedules & occupancy modes',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'automated-dr-integration',
    name: 'Automated DR integration',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'gas-storage-water-heaters',
    name: 'Gas storage water heaters',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'gas-tankless-heaters',
    name: 'Gas tankless heaters',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'commercial-hpwh-systems',
    name: 'Commercial HPWH systems',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'electric-dhw-boilers',
    name: 'Electric DHW boilers',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'vfd-recirc-pumps',
    name: 'VFD recirc pumps',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'recirc-loop-balancing',
    name: 'Recirc loop balancing',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'thermostatic-mixing-valve-optimization',
    name: 'Thermostatic mixing valve optimization',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'smart-leak-detection',
    name: 'Smart leak detection',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'leak-repair-logging',
    name: 'Leak repair & logging',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'hfc-rack-systems-with-fixed-head-pressure',
    name: 'HFC rack systems with fixed head pressure',
    category: MeasureCategory.REFRIGERATION,
    tags: [],
  },
  {
    id: 'old-evaporator-fans',
    name: 'Old evaporator fans',
    category: MeasureCategory.REFRIGERATION,
    tags: [],
  },
  {
    id: 'fluorescent-case-lighting',
    name: 'Fluorescent case lighting',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'racks-with-floating-head-suction',
    name: 'Racks with floating head & suction',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'vfd-compressors-condenser-fans',
    name: 'VFD compressors & condenser fans',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'ec-evaporator-fans',
    name: 'EC evaporator fans',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'strip-curtains',
    name: 'Strip curtains',
    category: MeasureCategory.REFRIGERATION,
    tags: [],
  },
  {
    id: 'case-door-retrofits',
    name: 'Case door retrofits',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: [],
  },
  {
    id: 'heat-reclaim-for-dhw-or-reheat',
    name: 'Heat reclaim for DHW or reheat',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: [],
  },
  {
    id: 'product-loading-practices',
    name: 'Product loading practices',
    category: MeasureCategory.WATER_PLUMBING,
    tags: [],
  },
  {
    id: 'leaky-doors-envelopes',
    name: 'Leaky doors & envelopes',
    category: MeasureCategory.BUILDING_ENVELOPE,
    tags: [],
  },
  {
    id: 'vestibule-additions',
    name: 'Vestibule additions',
    category: MeasureCategory.BUILDING_ENVELOPE,
    tags: [],
  },
  {
    id: 'regular-inspection-of-seals',
    name: 'Regular inspection of seals',
    category: MeasureCategory.BUILDING_ENVELOPE,
    tags: [],
  },
  {
    id: 'legacy-ups',
    name: 'Legacy UPS',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'nema-premium-motors',
    name: 'NEMA Premium motors',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'ec-motors',
    name: 'EC motors',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'soft-starters',
    name: 'Soft starters',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'harmonic-filters',
    name: 'Harmonic filters',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'load-balancing-across-phases',
    name: 'Load balancing across phases',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'voltage-optimization',
    name: 'Voltage optimization',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'motor-maintenance-lubrication',
    name: 'Motor maintenance & lubrication',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'avoid-oversized-motor-selection-in-new-design',
    name: 'Avoid oversized motor selection in new design',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'leaky-compressed-air-networks',
    name: 'Leaky compressed air networks',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'vfd-compressors',
    name: 'VFD compressors',
    category: MeasureCategory.BUILDING_AUTOMATION,
    tags: [],
  },
  {
    id: 'leak-detection-repair-programs',
    name: 'Leak detection & repair programs',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'pressure-setpoint-optimization-narrowing-band',
    name: 'Pressure setpoint optimization & narrowing band',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'staged-compressor-sequencing',
    name: 'Staged compressor sequencing',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'heat-recovery-from-compressors',
    name: 'Heat recovery from compressors',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'operator-training-on-compressed-air-abuse',
    name: 'Operator training on compressed air abuse',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'routine-leak-checks',
    name: 'Routine leak checks',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'geared-traction-elevators',
    name: 'Geared traction elevators',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'hydraulic-elevators',
    name: 'Hydraulic elevators',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'gearless-traction-with-regen-drives',
    name: 'Gearless traction with regen drives',
    category: MeasureCategory.MOTORS_DRIVES,
    tags: [],
  },
  {
    id: 'led-cab-lighting-efficient-fans',
    name: 'LED cab lighting & efficient fans',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'regenerative-drive-retrofits',
    name: 'Regenerative drive retrofits',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'lighting-fan-controls-in-cabs',
    name: 'Lighting & fan controls in cabs',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'older-dish-machines',
    name: 'Older dish machines',
    category: MeasureCategory.LIGHTING_CONTROLS,
    tags: [],
  },
  {
    id: 'kitchen-refrigeration-led-ec-motor-retrofits',
    name: 'Kitchen refrigeration LED & EC motor retrofits',
    category: MeasureCategory.REFRIGERATION,
    tags: [],
  },
  {
    id: 'staff-training-on-hood-equipment-shutoff-when-idle',
    name: 'Staff training on hood & equipment shutoff when idle',
    category: MeasureCategory.REFRIGERATION,
    tags: [],
  },
  {
    id: 'gas-pool-heaters',
    name: 'Gas pool heaters',
    category: MeasureCategory.REFRIGERATION,
    tags: [],
  },
  {
    id: 'heat-pump-pool-heaters',
    name: 'Heat pump pool heaters',
    category: MeasureCategory.REFRIGERATION,
    tags: [],
  },
  {
    id: 'vfd-pool-pumps',
    name: 'VFD pool pumps',
    category: MeasureCategory.REFRIGERATION,
    tags: [],
  },
  {
    id: 'dc-fast-chargers',
    name: 'DC fast chargers',
    category: MeasureCategory.REFRIGERATION,
    tags: [],
  },
  {
    id: 'dr-participation',
    name: 'DR participation',
    category: MeasureCategory.REFRIGERATION,
    tags: [],
  },
  {
    id: 'solar-thermal',
    name: 'Solar thermal',
    category: MeasureCategory.RENEWABLE_ENERGY,
    tags: [],
  },
];

/**
 * Get measures by category
 */
export function getMeasuresByCategory(category: MeasureCategory): EnergyMeasure[] {
  return MASTER_MEASURES.filter(m => m.category === category);
}

/**
 * Get measures by equipment type
 */
export function getMeasuresByEquipment(equipmentType: EquipmentType): EnergyMeasure[] {
  return MASTER_MEASURES.filter(m => 
    m.relatedEquipment?.includes(equipmentType)
  );
}

/**
 * Search measures by name or tags
 */
export function searchMeasures(query: string): EnergyMeasure[] {
  const lowerQuery = query.toLowerCase();
  return MASTER_MEASURES.filter(m => 
    m.name.toLowerCase().includes(lowerQuery) ||
    m.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

