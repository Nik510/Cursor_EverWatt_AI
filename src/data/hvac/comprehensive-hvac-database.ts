/**
 * COMPREHENSIVE HVAC DATABASE
 * Detailed information for all HVAC equipment types
 * Generated: 2025-12-11T17:46:09.105Z
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

export const comprehensiveHVACDatabase: DetailedHVACEquipment[] = [
  {
    "id": "centrifugal-chiller",
    "name": "Centrifugal chiller",
    "category": "COOLING SYSTEMS",
    "subcategory": "Electric Chillers",
    "identification": {
      "physicalCharacteristics": [
        "Large cylindrical compressor housing",
        "Centrifugal impeller design",
        "Water-cooled condenser",
        "Typically 200+ tons capacity"
      ],
      "keyComponents": [
        "Centrifugal compressor",
        "Evaporator",
        "Condenser",
        "Expansion device"
      ],
      "typicalSizes": "200-2000+ tons",
      "nameplateInfo": [
        "Model number",
        "Tonnage",
        "EER or kW/ton",
        "Refrigerant type",
        "Year"
      ],
      "howToIdentify": [
        "Look for centrifugal compressor (large, cylindrical)",
        "Check nameplate for model",
        "Water-cooled condenser",
        "Large capacity (typically 200+ tons)"
      ],
      "typicalManufacturers": [
        "Trane",
        "Carrier",
        "York",
        "McQuay",
        "Daikin"
      ]
    },
    "specifications": {
      "capacityRange": "200-2000+ tons",
      "efficiencyRange": "0.50-0.70 kW/ton (EER 17-24)",
      "efficiencyMetrics": [
        "kW/ton",
        "EER",
        "COP"
      ],
      "typicalEfficiency": "0.60 kW/ton (EER 20)",
      "powerRange": "100-1400+ kW",
      "operatingConditions": "Water-cooled, typically 44°F CHW, 85°F CWS"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "VFD centrifugal or magnetic-bearing",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "High",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "20-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "standard",
    "name": "Standard",
    "category": "COOLING SYSTEMS",
    "subcategory": "Electric Chillers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "two-stage",
    "name": "Two-stage",
    "category": "COOLING SYSTEMS",
    "subcategory": "Electric Chillers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "vfd-centrifugal",
    "name": "VFD centrifugal",
    "category": "COOLING SYSTEMS",
    "subcategory": "Electric Chillers",
    "identification": {
      "physicalCharacteristics": [
        "Large cylindrical compressor housing",
        "Centrifugal impeller design",
        "Water-cooled condenser",
        "Typically 200+ tons capacity"
      ],
      "keyComponents": [
        "Centrifugal compressor",
        "Evaporator",
        "Condenser",
        "Expansion device"
      ],
      "typicalSizes": "200-2000+ tons",
      "nameplateInfo": [
        "Model number",
        "Tonnage",
        "EER or kW/ton",
        "Refrigerant type",
        "Year"
      ],
      "howToIdentify": [
        "Look for centrifugal compressor (large, cylindrical)",
        "Check nameplate for model",
        "Water-cooled condenser",
        "Large capacity (typically 200+ tons)"
      ],
      "typicalManufacturers": [
        "Trane",
        "Carrier",
        "York",
        "McQuay",
        "Daikin"
      ]
    },
    "specifications": {
      "capacityRange": "200-2000+ tons",
      "efficiencyRange": "0.50-0.70 kW/ton (EER 17-24)",
      "efficiencyMetrics": [
        "kW/ton",
        "EER",
        "COP"
      ],
      "typicalEfficiency": "0.60 kW/ton (EER 20)",
      "powerRange": "100-1400+ kW",
      "operatingConditions": "Water-cooled, typically 44°F CHW, 85°F CWS"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Magnetic-bearing centrifugal",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Optimize",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "20-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "magnetic-bearing-centrifugal",
    "name": "Magnetic-bearing centrifugal",
    "category": "COOLING SYSTEMS",
    "subcategory": "Electric Chillers",
    "identification": {
      "physicalCharacteristics": [
        "Large cylindrical compressor housing",
        "Centrifugal impeller design",
        "Water-cooled condenser",
        "Typically 200+ tons capacity"
      ],
      "keyComponents": [
        "Centrifugal compressor",
        "Evaporator",
        "Condenser",
        "Expansion device"
      ],
      "typicalSizes": "200-2000+ tons",
      "nameplateInfo": [
        "Model number",
        "Tonnage",
        "EER or kW/ton",
        "Refrigerant type",
        "Year"
      ],
      "howToIdentify": [
        "Look for centrifugal compressor (large, cylindrical)",
        "Check nameplate for model",
        "Water-cooled condenser",
        "Large capacity (typically 200+ tons)"
      ],
      "typicalManufacturers": [
        "Trane",
        "Carrier",
        "York",
        "McQuay",
        "Daikin"
      ]
    },
    "specifications": {
      "capacityRange": "200-2000+ tons",
      "efficiencyRange": "0.50-0.70 kW/ton (EER 17-24)",
      "efficiencyMetrics": [
        "kW/ton",
        "EER",
        "COP"
      ],
      "typicalEfficiency": "0.60 kW/ton (EER 20)",
      "powerRange": "100-1400+ kW",
      "operatingConditions": "Water-cooled, typically 44°F CHW, 85°F CWS"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Keep or optimize controls",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Optimize",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "20-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "screw-chiller",
    "name": "Screw chiller",
    "category": "COOLING SYSTEMS",
    "subcategory": "Electric Chillers",
    "identification": {
      "physicalCharacteristics": [
        "Helical screw compressor",
        "Twin-screw or single-screw design",
        "Air-cooled or water-cooled",
        "Smaller than centrifugal"
      ],
      "keyComponents": [
        "Screw compressor",
        "Evaporator",
        "Condenser",
        "Oil separator"
      ],
      "typicalSizes": "50-500 tons",
      "nameplateInfo": [
        "Model",
        "Tonnage",
        "EER",
        "Refrigerant"
      ],
      "howToIdentify": [
        "Screw compressor (helical design)",
        "Smaller than centrifugal",
        "Oil system visible"
      ],
      "typicalManufacturers": [
        "Trane",
        "Carrier",
        "York",
        "McQuay",
        "Daikin"
      ]
    },
    "specifications": {
      "capacityRange": "50-500 tons",
      "efficiencyRange": "0.55-0.75 kW/ton (EER 16-22)",
      "efficiencyMetrics": [
        "kW/ton",
        "EER",
        "COP"
      ],
      "typicalEfficiency": "0.65 kW/ton (EER 18.5)",
      "powerRange": "30-375 kW",
      "operatingConditions": "Air-cooled or water-cooled"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "VFD screw or high-efficiency screw",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "High",
      "typicalPaybackYears": "4-8 years",
      "energySavingsPercent": "15-25%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "air-cooled-screw",
    "name": "Air-cooled screw",
    "category": "COOLING SYSTEMS",
    "subcategory": "Electric Chillers",
    "identification": {
      "physicalCharacteristics": [
        "Helical screw compressor",
        "Twin-screw or single-screw design",
        "Air-cooled or water-cooled",
        "Smaller than centrifugal"
      ],
      "keyComponents": [
        "Screw compressor",
        "Evaporator",
        "Condenser",
        "Oil separator"
      ],
      "typicalSizes": "50-500 tons",
      "nameplateInfo": [
        "Model",
        "Tonnage",
        "EER",
        "Refrigerant"
      ],
      "howToIdentify": [
        "Screw compressor (helical design)",
        "Smaller than centrifugal",
        "Oil system visible"
      ],
      "typicalManufacturers": [
        "Trane",
        "Carrier",
        "York",
        "McQuay",
        "Daikin"
      ]
    },
    "specifications": {
      "capacityRange": "50-500 tons",
      "efficiencyRange": "0.55-0.75 kW/ton (EER 16-22)",
      "efficiencyMetrics": [
        "kW/ton",
        "EER",
        "COP"
      ],
      "typicalEfficiency": "0.65 kW/ton (EER 18.5)",
      "powerRange": "30-375 kW",
      "operatingConditions": "Air-cooled or water-cooled"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "VFD screw or high-efficiency screw",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "High",
      "typicalPaybackYears": "4-8 years",
      "energySavingsPercent": "15-25%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "water-cooled-screw",
    "name": "Water-cooled screw",
    "category": "COOLING SYSTEMS",
    "subcategory": "Electric Chillers",
    "identification": {
      "physicalCharacteristics": [
        "Helical screw compressor",
        "Twin-screw or single-screw design",
        "Air-cooled or water-cooled",
        "Smaller than centrifugal"
      ],
      "keyComponents": [
        "Screw compressor",
        "Evaporator",
        "Condenser",
        "Oil separator"
      ],
      "typicalSizes": "50-500 tons",
      "nameplateInfo": [
        "Model",
        "Tonnage",
        "EER",
        "Refrigerant"
      ],
      "howToIdentify": [
        "Screw compressor (helical design)",
        "Smaller than centrifugal",
        "Oil system visible"
      ],
      "typicalManufacturers": [
        "Trane",
        "Carrier",
        "York",
        "McQuay",
        "Daikin"
      ]
    },
    "specifications": {
      "capacityRange": "50-500 tons",
      "efficiencyRange": "0.55-0.75 kW/ton (EER 16-22)",
      "efficiencyMetrics": [
        "kW/ton",
        "EER",
        "COP"
      ],
      "typicalEfficiency": "0.65 kW/ton (EER 18.5)",
      "powerRange": "30-375 kW",
      "operatingConditions": "Air-cooled or water-cooled"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "VFD screw or high-efficiency screw",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "High",
      "typicalPaybackYears": "4-8 years",
      "energySavingsPercent": "15-25%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "vfd-screw",
    "name": "VFD screw",
    "category": "COOLING SYSTEMS",
    "subcategory": "Electric Chillers",
    "identification": {
      "physicalCharacteristics": [
        "Helical screw compressor",
        "Twin-screw or single-screw design",
        "Air-cooled or water-cooled",
        "Smaller than centrifugal"
      ],
      "keyComponents": [
        "Screw compressor",
        "Evaporator",
        "Condenser",
        "Oil separator"
      ],
      "typicalSizes": "50-500 tons",
      "nameplateInfo": [
        "Model",
        "Tonnage",
        "EER",
        "Refrigerant"
      ],
      "howToIdentify": [
        "Screw compressor (helical design)",
        "Smaller than centrifugal",
        "Oil system visible"
      ],
      "typicalManufacturers": [
        "Trane",
        "Carrier",
        "York",
        "McQuay",
        "Daikin"
      ]
    },
    "specifications": {
      "capacityRange": "50-500 tons",
      "efficiencyRange": "0.55-0.75 kW/ton (EER 16-22)",
      "efficiencyMetrics": [
        "kW/ton",
        "EER",
        "COP"
      ],
      "typicalEfficiency": "0.65 kW/ton (EER 18.5)",
      "powerRange": "30-375 kW",
      "operatingConditions": "Air-cooled or water-cooled"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "High",
      "typicalPaybackYears": "4-8 years",
      "energySavingsPercent": "15-25%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "scroll-chiller",
    "name": "Scroll chiller",
    "category": "COOLING SYSTEMS",
    "subcategory": "Electric Chillers",
    "identification": {
      "physicalCharacteristics": [
        "Scroll compressor (spiral design)",
        "Smaller than screw",
        "Often modular/multi-scroll",
        "Packaged design"
      ],
      "keyComponents": [
        "Scroll compressor(s)",
        "Evaporator",
        "Condenser"
      ],
      "typicalSizes": "5-150 tons",
      "nameplateInfo": [
        "Model",
        "Tonnage",
        "EER"
      ],
      "howToIdentify": [
        "Scroll compressor (spiral, not screw)",
        "Smaller capacity",
        "Packaged design"
      ],
      "typicalManufacturers": [
        "Trane",
        "Carrier",
        "McQuay",
        "Daikin"
      ]
    },
    "specifications": {
      "capacityRange": "5-150 tons",
      "efficiencyRange": "0.60-0.80 kW/ton (EER 15-20)",
      "efficiencyMetrics": [
        "kW/ton",
        "EER"
      ],
      "typicalEfficiency": "0.70 kW/ton (EER 17)",
      "powerRange": "3-105 kW",
      "operatingConditions": "Air-cooled or water-cooled"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "High-efficiency scroll or VRF",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium-High",
      "typicalPaybackYears": "4-7 years",
      "energySavingsPercent": "20-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "modular-multi-scroll",
    "name": "Modular multi-scroll",
    "category": "COOLING SYSTEMS",
    "subcategory": "Electric Chillers",
    "identification": {
      "physicalCharacteristics": [
        "Scroll compressor (spiral design)",
        "Smaller than screw",
        "Often modular/multi-scroll",
        "Packaged design"
      ],
      "keyComponents": [
        "Scroll compressor(s)",
        "Evaporator",
        "Condenser"
      ],
      "typicalSizes": "5-150 tons",
      "nameplateInfo": [
        "Model",
        "Tonnage",
        "EER"
      ],
      "howToIdentify": [
        "Scroll compressor (spiral, not screw)",
        "Smaller capacity",
        "Packaged design"
      ],
      "typicalManufacturers": [
        "Trane",
        "Carrier",
        "McQuay",
        "Daikin"
      ]
    },
    "specifications": {
      "capacityRange": "5-150 tons",
      "efficiencyRange": "0.60-0.80 kW/ton (EER 15-20)",
      "efficiencyMetrics": [
        "kW/ton",
        "EER"
      ],
      "typicalEfficiency": "0.70 kW/ton (EER 17)",
      "powerRange": "3-105 kW",
      "operatingConditions": "Air-cooled or water-cooled"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "High-efficiency scroll or VRF",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium-High",
      "typicalPaybackYears": "4-7 years",
      "energySavingsPercent": "20-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "packaged-air-cooled-scroll",
    "name": "Packaged air-cooled scroll",
    "category": "COOLING SYSTEMS",
    "subcategory": "Electric Chillers",
    "identification": {
      "physicalCharacteristics": [
        "Scroll compressor (spiral design)",
        "Smaller than screw",
        "Often modular/multi-scroll",
        "Packaged design"
      ],
      "keyComponents": [
        "Scroll compressor(s)",
        "Evaporator",
        "Condenser"
      ],
      "typicalSizes": "5-150 tons",
      "nameplateInfo": [
        "Model",
        "Tonnage",
        "EER"
      ],
      "howToIdentify": [
        "Scroll compressor (spiral, not screw)",
        "Smaller capacity",
        "Packaged design"
      ],
      "typicalManufacturers": [
        "Trane",
        "Carrier",
        "McQuay",
        "Daikin"
      ]
    },
    "specifications": {
      "capacityRange": "5-150 tons",
      "efficiencyRange": "0.60-0.80 kW/ton (EER 15-20)",
      "efficiencyMetrics": [
        "kW/ton",
        "EER"
      ],
      "typicalEfficiency": "0.70 kW/ton (EER 17)",
      "powerRange": "3-105 kW",
      "operatingConditions": "Air-cooled or water-cooled"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "High-efficiency scroll or VRF",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium-High",
      "typicalPaybackYears": "4-7 years",
      "energySavingsPercent": "20-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "reciprocating-chiller-legacy-",
    "name": "Reciprocating chiller (legacy)",
    "category": "COOLING SYSTEMS",
    "subcategory": "Electric Chillers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "free-cooling-economizer-chillers",
    "name": "Free-cooling / economizer chillers",
    "category": "COOLING SYSTEMS",
    "subcategory": "Electric Chillers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "direct-fired-absorption-libr-",
    "name": "Direct-fired absorption (LiBr)",
    "category": "COOLING SYSTEMS",
    "subcategory": "Absorption / Gas / Engine Chillers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "double-effect-absorption",
    "name": "Double-effect absorption",
    "category": "COOLING SYSTEMS",
    "subcategory": "Absorption / Gas / Engine Chillers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "steam-absorption",
    "name": "Steam absorption",
    "category": "COOLING SYSTEMS",
    "subcategory": "Absorption / Gas / Engine Chillers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "natural-gas-engine-driven-chiller",
    "name": "Natural gas engine-driven chiller",
    "category": "COOLING SYSTEMS",
    "subcategory": "Absorption / Gas / Engine Chillers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "chp-integrated-chiller",
    "name": "CHP integrated chiller",
    "category": "COOLING SYSTEMS",
    "subcategory": "Absorption / Gas / Engine Chillers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "air-source-heat-pump-chiller",
    "name": "Air-source heat pump chiller",
    "category": "COOLING SYSTEMS",
    "subcategory": "Heat Pump Chillers (Belong under COOLING)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "water-source-heat-pump-chiller",
    "name": "Water-source heat pump chiller",
    "category": "COOLING SYSTEMS",
    "subcategory": "Heat Pump Chillers (Belong under COOLING)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "reversible-heat-pump-chiller-4-pipe-",
    "name": "Reversible heat pump chiller (4-pipe)",
    "category": "COOLING SYSTEMS",
    "subcategory": "Heat Pump Chillers (Belong under COOLING)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "heat-recovery-chiller-simultaneous-heat-cooling-",
    "name": "Heat-recovery chiller (simultaneous heat + cooling)",
    "category": "COOLING SYSTEMS",
    "subcategory": "Heat Pump Chillers (Belong under COOLING)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "high-temp-heat-pump-chiller-boiler-130-180-f-",
    "name": "High-temp heat pump chiller-boiler (130–180°F)",
    "category": "COOLING SYSTEMS",
    "subcategory": "Heat Pump Chillers (Belong under COOLING)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "co-transcritical-heat-pump-chiller",
    "name": "CO₂ transcritical heat pump chiller",
    "category": "COOLING SYSTEMS",
    "subcategory": "Heat Pump Chillers (Belong under COOLING)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "vfd-tower-fans",
    "name": "VFD tower fans",
    "category": "COOLING SYSTEMS",
    "subcategory": "Cooling Towers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "ec-fan-motors",
    "name": "EC fan motors",
    "category": "COOLING SYSTEMS",
    "subcategory": "Cooling Towers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "drift-eliminators",
    "name": "Drift eliminators",
    "category": "COOLING SYSTEMS",
    "subcategory": "Cooling Towers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "fill-media-upgrades",
    "name": "Fill media upgrades",
    "category": "COOLING SYSTEMS",
    "subcategory": "Cooling Towers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "nozzle-upgrades",
    "name": "Nozzle upgrades",
    "category": "COOLING SYSTEMS",
    "subcategory": "Cooling Towers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "basin-heaters-optimization",
    "name": "Basin heaters optimization",
    "category": "COOLING SYSTEMS",
    "subcategory": "Cooling Towers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "side-stream-filtration",
    "name": "Side-stream filtration",
    "category": "COOLING SYSTEMS",
    "subcategory": "Cooling Towers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "water-treatment-optimization",
    "name": "Water treatment optimization",
    "category": "COOLING SYSTEMS",
    "subcategory": "Cooling Towers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "chw-pumps-primary-",
    "name": "CHW pumps (primary)",
    "category": "COOLING SYSTEMS",
    "subcategory": "Cooling Distribution",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "chw-pumps-secondary-",
    "name": "CHW pumps (secondary)",
    "category": "COOLING SYSTEMS",
    "subcategory": "Cooling Distribution",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "pump-vfds",
    "name": "Pump VFDs",
    "category": "COOLING SYSTEMS",
    "subcategory": "Cooling Distribution",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "pump-impeller-trimming",
    "name": "Pump impeller trimming",
    "category": "COOLING SYSTEMS",
    "subcategory": "Cooling Distribution",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "variable-primary-flow-conversion",
    "name": "Variable primary flow conversion",
    "category": "COOLING SYSTEMS",
    "subcategory": "Cooling Distribution",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "picvs-pressure-independent-control-valves-",
    "name": "PICVs (pressure independent control valves)",
    "category": "COOLING SYSTEMS",
    "subcategory": "Cooling Distribution",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "hydronic-balancing",
    "name": "Hydronic balancing",
    "category": "COOLING SYSTEMS",
    "subcategory": "Cooling Distribution",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "chw-t-optimization",
    "name": "CHW ΔT optimization",
    "category": "COOLING SYSTEMS",
    "subcategory": "Cooling Distribution",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "Office buildings",
        "Hospitals",
        "Data centers",
        "Manufacturing"
      ],
      "buildingTypes": [
        "Commercial",
        "Institutional",
        "Industrial"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "condensing-boilers-high-efficiency-",
    "name": "Condensing boilers (high-efficiency)",
    "category": "HEATING SYSTEMS",
    "subcategory": "Boilers",
    "identification": {
      "physicalCharacteristics": [
        "Condensing heat exchanger",
        "Plastic vent (PVC)",
        "High efficiency rating",
        "Condensate drain"
      ],
      "keyComponents": [
        "Condensing heat exchanger",
        "Burner",
        "Pump",
        "Controls"
      ],
      "typicalSizes": "50-2000+ MBH",
      "nameplateInfo": [
        "Model",
        "MBH",
        "AFUE",
        "Year"
      ],
      "howToIdentify": [
        "PVC vent (not metal)",
        "Condensate drain visible",
        "High AFUE (90%+)"
      ],
      "typicalManufacturers": [
        "Burnham",
        "Weil-McLain",
        "Lochinvar",
        "Viessmann"
      ]
    },
    "specifications": {
      "capacityRange": "50-2000+ MBH",
      "efficiencyRange": "AFUE 90-98%",
      "efficiencyMetrics": [
        "AFUE",
        "Thermal efficiency"
      ],
      "typicalEfficiency": "AFUE 95%",
      "operatingConditions": "Low return water temp for condensing"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Keep or optimize controls",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Optimize",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "high-turndown-burner-retrofits",
    "name": "High-turndown burner retrofits",
    "category": "HEATING SYSTEMS",
    "subcategory": "Boilers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "steam-boilers",
    "name": "Steam boilers",
    "category": "HEATING SYSTEMS",
    "subcategory": "Boilers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "boiler-economizers",
    "name": "Boiler economizers",
    "category": "HEATING SYSTEMS",
    "subcategory": "Boilers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "blowdown-heat-recovery",
    "name": "Blowdown heat recovery",
    "category": "HEATING SYSTEMS",
    "subcategory": "Boilers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "boiler-sequencing-optimization",
    "name": "Boiler sequencing optimization",
    "category": "HEATING SYSTEMS",
    "subcategory": "Boilers",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "packaged-heat-pumps-rtu-heat-pumps-",
    "name": "Packaged heat pumps (RTU heat pumps)",
    "category": "HEATING SYSTEMS",
    "subcategory": "Heat Pumps (HEATING CATEGORY)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "split-system-heat-pumps",
    "name": "Split-system heat pumps",
    "category": "HEATING SYSTEMS",
    "subcategory": "Heat Pumps (HEATING CATEGORY)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "vrf-vrv-heat-pump-systems",
    "name": "VRF/VRV heat pump systems",
    "category": "HEATING SYSTEMS",
    "subcategory": "Heat Pumps (HEATING CATEGORY)",
    "identification": {
      "physicalCharacteristics": [
        "Outdoor condensing unit",
        "Multiple indoor units",
        "Refrigerant piping",
        "Variable refrigerant flow"
      ],
      "keyComponents": [
        "Outdoor unit",
        "Indoor units",
        "Refrigerant piping",
        "Controls"
      ],
      "typicalSizes": "5-100+ tons",
      "nameplateInfo": [
        "Model",
        "Tonnage",
        "COP",
        "Year"
      ],
      "howToIdentify": [
        "Multiple indoor units connected to one outdoor",
        "Refrigerant piping (not water)",
        "Variable capacity"
      ],
      "typicalManufacturers": [
        "Daikin",
        "Mitsubishi",
        "LG",
        "Fujitsu",
        "Carrier"
      ]
    },
    "specifications": {
      "capacityRange": "5-100+ tons",
      "efficiencyRange": "COP 3.5-5.5 (heating), EER 12-19 (cooling)",
      "efficiencyMetrics": [
        "COP",
        "EER",
        "IPLV"
      ],
      "typicalEfficiency": "COP 4.5, EER 15",
      "operatingConditions": "Air-source or water-source"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Keep or optimize controls",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Optimize",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "water-source-heat-pumps",
    "name": "Water-source heat pumps",
    "category": "HEATING SYSTEMS",
    "subcategory": "Heat Pumps (HEATING CATEGORY)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "air-to-water-heat-pumps",
    "name": "Air-to-water heat pumps",
    "category": "HEATING SYSTEMS",
    "subcategory": "Heat Pumps (HEATING CATEGORY)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "ground-source-heat-pumps",
    "name": "Ground-source heat pumps",
    "category": "HEATING SYSTEMS",
    "subcategory": "Heat Pumps (HEATING CATEGORY)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "heat-pump-water-heaters-hpwh-",
    "name": "Heat pump water heaters (HPWH)",
    "category": "HEATING SYSTEMS",
    "subcategory": "Heat Pumps (HEATING CATEGORY)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "high-temp-industrial-heat-pumps",
    "name": "High-temp industrial heat pumps",
    "category": "HEATING SYSTEMS",
    "subcategory": "Heat Pumps (HEATING CATEGORY)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "heat-pump-make-up-air-units",
    "name": "Heat pump make-up air units",
    "category": "HEATING SYSTEMS",
    "subcategory": "Heat Pumps (HEATING CATEGORY)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "heat-pump-boiler-replacements",
    "name": "Heat pump boiler replacements",
    "category": "HEATING SYSTEMS",
    "subcategory": "Heat Pumps (HEATING CATEGORY)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "hw-pumps-primary-secondary-",
    "name": "HW pumps (primary/secondary)",
    "category": "HEATING SYSTEMS",
    "subcategory": "Heating Distribution",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "pump-vfds",
    "name": "Pump VFDs",
    "category": "HEATING SYSTEMS",
    "subcategory": "Heating Distribution",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "hydronic-loop-balancing",
    "name": "Hydronic loop balancing",
    "category": "HEATING SYSTEMS",
    "subcategory": "Heating Distribution",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "reheat-coil-optimization",
    "name": "Reheat coil optimization",
    "category": "HEATING SYSTEMS",
    "subcategory": "Heating Distribution",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "pipe-insulation",
    "name": "Pipe insulation",
    "category": "HEATING SYSTEMS",
    "subcategory": "Heating Distribution",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "steam-to-hot-water-conversion",
    "name": "Steam-to-hot-water conversion",
    "category": "HEATING SYSTEMS",
    "subcategory": "Heating Distribution",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "ahu-replacements",
    "name": "AHU replacements",
    "category": "HEATING SYSTEMS",
    "subcategory": "Air Handling Units (AHUs)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "fan-wall-retrofits",
    "name": "Fan wall retrofits",
    "category": "HEATING SYSTEMS",
    "subcategory": "Air Handling Units (AHUs)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "ecm-supply-return-fans",
    "name": "ECM supply/return fans",
    "category": "HEATING SYSTEMS",
    "subcategory": "Air Handling Units (AHUs)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "vfd-upgrades",
    "name": "VFD upgrades",
    "category": "HEATING SYSTEMS",
    "subcategory": "Air Handling Units (AHUs)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "coil-cleaning-replacement",
    "name": "Coil cleaning / replacement",
    "category": "HEATING SYSTEMS",
    "subcategory": "Air Handling Units (AHUs)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "filter-upgrades-merv-13-16-",
    "name": "Filter upgrades (MERV 13–16)",
    "category": "HEATING SYSTEMS",
    "subcategory": "Air Handling Units (AHUs)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "humidification-upgrades",
    "name": "Humidification upgrades",
    "category": "HEATING SYSTEMS",
    "subcategory": "Air Handling Units (AHUs)",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "doas-systems",
    "name": "DOAS systems",
    "category": "HEATING SYSTEMS",
    "subcategory": "Ventilation Systems",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "erv-energy-recovery-ventilator-",
    "name": "ERV (energy recovery ventilator)",
    "category": "HEATING SYSTEMS",
    "subcategory": "Ventilation Systems",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "hrv-heat-recovery-ventilator-",
    "name": "HRV (heat recovery ventilator)",
    "category": "HEATING SYSTEMS",
    "subcategory": "Ventilation Systems",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "enthalpy-wheels",
    "name": "Enthalpy wheels",
    "category": "HEATING SYSTEMS",
    "subcategory": "Ventilation Systems",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "heat-pipes",
    "name": "Heat pipes",
    "category": "HEATING SYSTEMS",
    "subcategory": "Ventilation Systems",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "runaround-heat-recovery-loops",
    "name": "Runaround heat recovery loops",
    "category": "HEATING SYSTEMS",
    "subcategory": "Ventilation Systems",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "co-demand-controlled-ventilation-dcv-",
    "name": "CO₂ demand-controlled ventilation (DCV)",
    "category": "HEATING SYSTEMS",
    "subcategory": "Ventilation Controls",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "occupancy-based-ventilation",
    "name": "Occupancy-based ventilation",
    "category": "HEATING SYSTEMS",
    "subcategory": "Ventilation Controls",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "outdoor-air-reset",
    "name": "Outdoor air reset",
    "category": "HEATING SYSTEMS",
    "subcategory": "Ventilation Controls",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "vav-calibration",
    "name": "VAV calibration",
    "category": "HEATING SYSTEMS",
    "subcategory": "Ventilation Controls",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "night-setback-modes",
    "name": "Night setback modes",
    "category": "HEATING SYSTEMS",
    "subcategory": "Ventilation Controls",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "lab-fume-hood-vav-controls",
    "name": "Lab fume hood VAV controls",
    "category": "HEATING SYSTEMS",
    "subcategory": "Exhaust Systems",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "lab-exhaust-vfd-systems",
    "name": "Lab exhaust VFD systems",
    "category": "HEATING SYSTEMS",
    "subcategory": "Exhaust Systems",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  },
  {
    "id": "kitchen-hood-vfd-systems",
    "name": "Kitchen hood VFD systems",
    "category": "HEATING SYSTEMS",
    "subcategory": "Exhaust Systems",
    "identification": {
      "physicalCharacteristics": [],
      "keyComponents": [],
      "typicalSizes": "Varies",
      "nameplateInfo": [],
      "howToIdentify": [],
      "typicalManufacturers": []
    },
    "specifications": {
      "capacityRange": "Varies by application",
      "efficiencyRange": "Varies",
      "efficiencyMetrics": [],
      "typicalEfficiency": "Varies",
      "operatingConditions": "Standard"
    },
    "applications": {
      "typicalLocations": [
        "All building types"
      ],
      "buildingTypes": [
        "Commercial",
        "Residential"
      ],
      "useCases": [],
      "commonConfigurations": []
    },
    "replacement": {
      "recommendedUpgrade": "Evaluate on case-by-case basis",
      "upgradeReason": "Improve efficiency and reduce energy costs",
      "whenToUpgrade": {},
      "priority": "Medium",
      "typicalPaybackYears": "5-10 years",
      "energySavingsPercent": "10-30%",
      "notes": []
    },
    "bestPractices": {
      "maintenance": [
        "Regular inspection",
        "Clean coils/filters",
        "Check refrigerant charge (if applicable)",
        "Monitor performance"
      ],
      "optimization": [
        "Optimize setpoints",
        "Proper sequencing",
        "Maintain equipment",
        "Control optimization"
      ],
      "commonIssues": [],
      "troubleshooting": []
    }
  }
];

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
