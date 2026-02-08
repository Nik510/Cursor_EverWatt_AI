/**
 * MASTER ENERGY EFFICIENCY DATABASE
 * Complete catalog of ALL energy efficiency measures
 * 
 * Source: ALL EE MEASURES 2.0.docx
 * Generated: 2025-12-11T17:43:43.061Z
 */

export interface EEMeasure {
  id: string;
  name: string;
  category?: string;
  subcategory?: string;
  keywords: string[];
}

export interface EESubcategory {
  id: string;
  name: string;
  measures: Array<{
    id: string;
    name: string;
    keywords: string[];
  }>;
}

export interface EECategory {
  id: string;
  name: string;
  subcategories: EESubcategory[];
}

export interface MasterEEDatabase {
  metadata: {
    version: string;
    extractedAt: string;
    sourceFile: string;
    totalMeasures: number;
    totalCategories: number;
    totalSubcategories: number;
  };
  categories: EECategory[];
  allMeasures: EEMeasure[];
}

export const masterEEDatabase: MasterEEDatabase = {
  "metadata": {
    "version": "2.0",
    "extractedAt": "2025-12-11T17:43:43.029Z",
    "sourceFile": "ALL EE MEASURES 2.0.docx",
    "totalMeasures": 222,
    "totalCategories": 8,
    "totalSubcategories": 36
  },
  "categories": [
    {
      "id": "cooling-systems",
      "name": "COOLING SYSTEMS",
      "subcategories": [
        {
          "id": "electric-chillers",
          "name": "Electric Chillers",
          "measures": [
            {
              "id": "measure-23",
              "name": "Centrifugal chiller",
              "keywords": [
                "chiller"
              ]
            },
            {
              "id": "measure-24",
              "name": "Standard",
              "keywords": []
            },
            {
              "id": "measure-25",
              "name": "Two-stage",
              "keywords": []
            },
            {
              "id": "measure-26",
              "name": "VFD centrifugal",
              "keywords": [
                "vfd"
              ]
            },
            {
              "id": "measure-27",
              "name": "Magnetic-bearing centrifugal",
              "keywords": []
            },
            {
              "id": "measure-28",
              "name": "Screw chiller",
              "keywords": [
                "chiller"
              ]
            },
            {
              "id": "measure-29",
              "name": "Air-cooled screw",
              "keywords": []
            },
            {
              "id": "measure-30",
              "name": "Water-cooled screw",
              "keywords": []
            },
            {
              "id": "measure-31",
              "name": "VFD screw",
              "keywords": [
                "vfd"
              ]
            },
            {
              "id": "measure-32",
              "name": "Scroll chiller",
              "keywords": [
                "chiller"
              ]
            },
            {
              "id": "measure-33",
              "name": "Modular multi-scroll",
              "keywords": []
            },
            {
              "id": "measure-34",
              "name": "Packaged air-cooled scroll",
              "keywords": []
            },
            {
              "id": "measure-35",
              "name": "Reciprocating chiller (legacy)",
              "keywords": [
                "chiller"
              ]
            },
            {
              "id": "measure-36",
              "name": "Free-cooling / economizer chillers",
              "keywords": []
            }
          ]
        },
        {
          "id": "absorption-gas-engine-chillers",
          "name": "Absorption / Gas / Engine Chillers",
          "measures": [
            {
              "id": "measure-37",
              "name": "Direct-fired absorption (LiBr)",
              "keywords": []
            },
            {
              "id": "measure-38",
              "name": "Double-effect absorption",
              "keywords": []
            },
            {
              "id": "measure-39",
              "name": "Steam absorption",
              "keywords": []
            },
            {
              "id": "measure-40",
              "name": "Natural gas engine-driven chiller",
              "keywords": [
                "chiller"
              ]
            },
            {
              "id": "measure-41",
              "name": "CHP integrated chiller",
              "keywords": [
                "chiller"
              ]
            }
          ]
        },
        {
          "id": "heat-pump-chillers-belong-under-cooling-",
          "name": "Heat Pump Chillers (Belong under COOLING)",
          "measures": [
            {
              "id": "measure-42",
              "name": "Air-source heat pump chiller",
              "keywords": [
                "chiller"
              ]
            },
            {
              "id": "measure-43",
              "name": "Water-source heat pump chiller",
              "keywords": [
                "chiller"
              ]
            },
            {
              "id": "measure-44",
              "name": "Reversible heat pump chiller (4-pipe)",
              "keywords": [
                "chiller"
              ]
            },
            {
              "id": "measure-45",
              "name": "Heat-recovery chiller (simultaneous heat + cooling)",
              "keywords": [
                "chiller"
              ]
            },
            {
              "id": "measure-46",
              "name": "High-temp heat pump chiller-boiler (130–180°F)",
              "keywords": []
            },
            {
              "id": "measure-47",
              "name": "CO₂ transcritical heat pump chiller",
              "keywords": [
                "chiller"
              ]
            }
          ]
        },
        {
          "id": "cooling-towers",
          "name": "Cooling Towers",
          "measures": [
            {
              "id": "measure-48",
              "name": "VFD tower fans",
              "keywords": [
                "vfd"
              ]
            },
            {
              "id": "measure-49",
              "name": "EC fan motors",
              "keywords": [
                "ec"
              ]
            },
            {
              "id": "measure-50",
              "name": "Drift eliminators",
              "keywords": []
            },
            {
              "id": "measure-51",
              "name": "Fill media upgrades",
              "keywords": []
            },
            {
              "id": "measure-52",
              "name": "Nozzle upgrades",
              "keywords": []
            },
            {
              "id": "measure-53",
              "name": "Basin heaters optimization",
              "keywords": [
                "optimization"
              ]
            },
            {
              "id": "measure-54",
              "name": "Side-stream filtration",
              "keywords": []
            },
            {
              "id": "measure-55",
              "name": "Water treatment optimization",
              "keywords": [
                "optimization"
              ]
            }
          ]
        },
        {
          "id": "cooling-distribution",
          "name": "Cooling Distribution",
          "measures": [
            {
              "id": "measure-56",
              "name": "CHW pumps (primary)",
              "keywords": []
            },
            {
              "id": "measure-57",
              "name": "CHW pumps (secondary)",
              "keywords": []
            },
            {
              "id": "measure-58",
              "name": "Pump VFDs",
              "keywords": []
            },
            {
              "id": "measure-59",
              "name": "Pump impeller trimming",
              "keywords": []
            },
            {
              "id": "measure-60",
              "name": "Variable primary flow conversion",
              "keywords": []
            },
            {
              "id": "measure-61",
              "name": "PICVs (pressure independent control valves)",
              "keywords": []
            },
            {
              "id": "measure-62",
              "name": "Hydronic balancing",
              "keywords": []
            },
            {
              "id": "measure-63",
              "name": "CHW ΔT optimization",
              "keywords": [
                "optimization"
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "heating-systems",
      "name": "HEATING SYSTEMS",
      "subcategories": [
        {
          "id": "boilers",
          "name": "Boilers",
          "measures": [
            {
              "id": "measure-64",
              "name": "Condensing boilers (high-efficiency)",
              "keywords": []
            },
            {
              "id": "measure-65",
              "name": "High-turndown burner retrofits",
              "keywords": []
            },
            {
              "id": "measure-66",
              "name": "Steam boilers",
              "keywords": []
            },
            {
              "id": "measure-67",
              "name": "Boiler economizers",
              "keywords": [
                "boiler"
              ]
            },
            {
              "id": "measure-68",
              "name": "Blowdown heat recovery",
              "keywords": []
            },
            {
              "id": "measure-69",
              "name": "Boiler sequencing optimization",
              "keywords": [
                "boiler",
                "optimization"
              ]
            }
          ]
        },
        {
          "id": "heat-pumps-heating-category-",
          "name": "Heat Pumps (HEATING CATEGORY)",
          "measures": [
            {
              "id": "measure-70",
              "name": "Packaged heat pumps (RTU heat pumps)",
              "keywords": []
            },
            {
              "id": "measure-71",
              "name": "Split-system heat pumps",
              "keywords": []
            },
            {
              "id": "measure-72",
              "name": "VRF/VRV heat pump systems",
              "keywords": []
            },
            {
              "id": "measure-73",
              "name": "Water-source heat pumps",
              "keywords": []
            },
            {
              "id": "measure-74",
              "name": "Air-to-water heat pumps",
              "keywords": []
            },
            {
              "id": "measure-75",
              "name": "Ground-source heat pumps",
              "keywords": []
            },
            {
              "id": "measure-76",
              "name": "Heat pump water heaters (HPWH)",
              "keywords": [
                "hpwh"
              ]
            },
            {
              "id": "measure-77",
              "name": "High-temp industrial heat pumps",
              "keywords": []
            },
            {
              "id": "measure-78",
              "name": "Heat pump make-up air units",
              "keywords": []
            },
            {
              "id": "measure-79",
              "name": "Heat pump boiler replacements",
              "keywords": [
                "boiler"
              ]
            }
          ]
        },
        {
          "id": "heating-distribution",
          "name": "Heating Distribution",
          "measures": [
            {
              "id": "measure-80",
              "name": "HW pumps (primary/secondary)",
              "keywords": []
            },
            {
              "id": "measure-81",
              "name": "Pump VFDs",
              "keywords": []
            },
            {
              "id": "measure-82",
              "name": "Hydronic loop balancing",
              "keywords": []
            },
            {
              "id": "measure-83",
              "name": "Reheat coil optimization",
              "keywords": [
                "optimization"
              ]
            },
            {
              "id": "measure-84",
              "name": "Pipe insulation",
              "keywords": [
                "insulation"
              ]
            },
            {
              "id": "measure-85",
              "name": "Steam-to-hot-water conversion",
              "keywords": []
            }
          ]
        },
        {
          "id": "air-handling-units-ahus-",
          "name": "Air Handling Units (AHUs)",
          "measures": [
            {
              "id": "measure-86",
              "name": "AHU replacements",
              "keywords": [
                "ahu"
              ]
            },
            {
              "id": "measure-87",
              "name": "Fan wall retrofits",
              "keywords": []
            },
            {
              "id": "measure-88",
              "name": "ECM supply/return fans",
              "keywords": [
                "ecm"
              ]
            },
            {
              "id": "measure-89",
              "name": "VFD upgrades",
              "keywords": [
                "vfd"
              ]
            },
            {
              "id": "measure-90",
              "name": "Coil cleaning / replacement",
              "keywords": [
                "replacement"
              ]
            },
            {
              "id": "measure-91",
              "name": "Filter upgrades (MERV 13–16)",
              "keywords": []
            },
            {
              "id": "measure-92",
              "name": "Humidification upgrades",
              "keywords": []
            }
          ]
        },
        {
          "id": "ventilation-systems",
          "name": "Ventilation Systems",
          "measures": [
            {
              "id": "measure-93",
              "name": "DOAS systems",
              "keywords": [
                "doas"
              ]
            },
            {
              "id": "measure-94",
              "name": "ERV (energy recovery ventilator)",
              "keywords": [
                "erv"
              ]
            },
            {
              "id": "measure-95",
              "name": "HRV (heat recovery ventilator)",
              "keywords": [
                "hrv"
              ]
            },
            {
              "id": "measure-96",
              "name": "Enthalpy wheels",
              "keywords": []
            },
            {
              "id": "measure-97",
              "name": "Heat pipes",
              "keywords": []
            },
            {
              "id": "measure-98",
              "name": "Runaround heat recovery loops",
              "keywords": []
            }
          ]
        },
        {
          "id": "ventilation-controls",
          "name": "Ventilation Controls",
          "measures": [
            {
              "id": "measure-99",
              "name": "CO₂ demand-controlled ventilation (DCV)",
              "keywords": []
            },
            {
              "id": "measure-100",
              "name": "Occupancy-based ventilation",
              "keywords": []
            },
            {
              "id": "measure-101",
              "name": "Outdoor air reset",
              "keywords": []
            },
            {
              "id": "measure-102",
              "name": "VAV calibration",
              "keywords": []
            },
            {
              "id": "measure-103",
              "name": "Night setback modes",
              "keywords": []
            }
          ]
        },
        {
          "id": "exhaust-systems",
          "name": "Exhaust Systems",
          "measures": [
            {
              "id": "measure-104",
              "name": "Lab fume hood VAV controls",
              "keywords": [
                "controls"
              ]
            },
            {
              "id": "measure-105",
              "name": "Lab exhaust VFD systems",
              "keywords": [
                "vfd"
              ]
            },
            {
              "id": "measure-106",
              "name": "Kitchen hood VFD systems",
              "keywords": [
                "vfd"
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "air-distribution-ventilation",
      "name": "AIR DISTRIBUTION & VENTILATION",
      "subcategories": [
        {
          "id": "air-handling-units-ahus-",
          "name": "Air Handling Units (AHUs)",
          "measures": [
            {
              "id": "measure-86",
              "name": "AHU replacements",
              "keywords": [
                "ahu"
              ]
            },
            {
              "id": "measure-87",
              "name": "Fan wall retrofits",
              "keywords": []
            },
            {
              "id": "measure-88",
              "name": "ECM supply/return fans",
              "keywords": [
                "ecm"
              ]
            },
            {
              "id": "measure-89",
              "name": "VFD upgrades",
              "keywords": [
                "vfd"
              ]
            },
            {
              "id": "measure-90",
              "name": "Coil cleaning / replacement",
              "keywords": [
                "replacement"
              ]
            },
            {
              "id": "measure-91",
              "name": "Filter upgrades (MERV 13–16)",
              "keywords": []
            },
            {
              "id": "measure-92",
              "name": "Humidification upgrades",
              "keywords": []
            }
          ]
        },
        {
          "id": "ventilation-systems",
          "name": "Ventilation Systems",
          "measures": [
            {
              "id": "measure-93",
              "name": "DOAS systems",
              "keywords": [
                "doas"
              ]
            },
            {
              "id": "measure-94",
              "name": "ERV (energy recovery ventilator)",
              "keywords": [
                "erv"
              ]
            },
            {
              "id": "measure-95",
              "name": "HRV (heat recovery ventilator)",
              "keywords": [
                "hrv"
              ]
            },
            {
              "id": "measure-96",
              "name": "Enthalpy wheels",
              "keywords": []
            },
            {
              "id": "measure-97",
              "name": "Heat pipes",
              "keywords": []
            },
            {
              "id": "measure-98",
              "name": "Runaround heat recovery loops",
              "keywords": []
            }
          ]
        },
        {
          "id": "ventilation-controls",
          "name": "Ventilation Controls",
          "measures": [
            {
              "id": "measure-99",
              "name": "CO₂ demand-controlled ventilation (DCV)",
              "keywords": []
            },
            {
              "id": "measure-100",
              "name": "Occupancy-based ventilation",
              "keywords": []
            },
            {
              "id": "measure-101",
              "name": "Outdoor air reset",
              "keywords": []
            },
            {
              "id": "measure-102",
              "name": "VAV calibration",
              "keywords": []
            },
            {
              "id": "measure-103",
              "name": "Night setback modes",
              "keywords": []
            }
          ]
        },
        {
          "id": "exhaust-systems",
          "name": "Exhaust Systems",
          "measures": [
            {
              "id": "measure-104",
              "name": "Lab fume hood VAV controls",
              "keywords": [
                "controls"
              ]
            },
            {
              "id": "measure-105",
              "name": "Lab exhaust VFD systems",
              "keywords": [
                "vfd"
              ]
            },
            {
              "id": "measure-106",
              "name": "Kitchen hood VFD systems",
              "keywords": [
                "vfd"
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "hvac-controls",
      "name": "HVAC CONTROLS",
      "subcategories": [
        {
          "id": "bms-ems-platforms",
          "name": "BMS/EMS Platforms",
          "measures": [
            {
              "id": "measure-107",
              "name": "KMC Controls",
              "keywords": [
                "controls"
              ]
            },
            {
              "id": "measure-108",
              "name": "Siemens",
              "keywords": []
            },
            {
              "id": "measure-109",
              "name": "Honeywell",
              "keywords": []
            },
            {
              "id": "measure-110",
              "name": "Johnson Controls",
              "keywords": [
                "controls"
              ]
            },
            {
              "id": "measure-111",
              "name": "Tridium Niagara",
              "keywords": []
            },
            {
              "id": "measure-112",
              "name": "Ignition SCADA",
              "keywords": []
            },
            {
              "id": "measure-113",
              "name": "Distech",
              "keywords": []
            },
            {
              "id": "measure-114",
              "name": "Automated Logic",
              "keywords": []
            },
            {
              "id": "measure-115",
              "name": "Schneider EcoStruxure",
              "keywords": []
            }
          ]
        },
        {
          "id": "control-strategies",
          "name": "Control Strategies",
          "measures": [
            {
              "id": "measure-116",
              "name": "SAT reset",
              "keywords": []
            },
            {
              "id": "measure-117",
              "name": "CHW reset",
              "keywords": []
            },
            {
              "id": "measure-118",
              "name": "HW reset",
              "keywords": []
            },
            {
              "id": "measure-119",
              "name": "Outside air reset",
              "keywords": []
            },
            {
              "id": "measure-120",
              "name": "Static pressure reset",
              "keywords": []
            },
            {
              "id": "measure-121",
              "name": "Optimal start/stop",
              "keywords": []
            },
            {
              "id": "measure-122",
              "name": "Equipment scheduling optimization",
              "keywords": [
                "optimization"
              ]
            },
            {
              "id": "measure-123",
              "name": "Load shedding",
              "keywords": []
            }
          ]
        },
        {
          "id": "advanced-controls",
          "name": "Advanced Controls",
          "measures": [
            {
              "id": "measure-124",
              "name": "Fault detection and diagnostics (FDD)",
              "keywords": []
            },
            {
              "id": "measure-125",
              "name": "AI-based optimization (EverWatt.AI)",
              "keywords": [
                "optimization"
              ]
            },
            {
              "id": "measure-126",
              "name": "DR automation",
              "keywords": []
            },
            {
              "id": "measure-127",
              "name": "Weather-integrated predictive logic",
              "keywords": []
            },
            {
              "id": "measure-128",
              "name": "Circuit-level metering",
              "keywords": []
            }
          ]
        }
      ]
    },
    {
      "id": "electrification-measures",
      "name": "ELECTRIFICATION MEASURES",
      "subcategories": [
        {
          "id": "heating-electrification",
          "name": "Heating Electrification",
          "measures": [
            {
              "id": "measure-129",
              "name": "Gas boiler → heat pump chiller",
              "keywords": [
                "boiler",
                "chiller"
              ]
            },
            {
              "id": "measure-130",
              "name": "Gas boiler → electric boiler",
              "keywords": [
                "boiler"
              ]
            },
            {
              "id": "measure-131",
              "name": "Gas furnace → heat pump",
              "keywords": []
            },
            {
              "id": "measure-132",
              "name": "Gas RTU → electric heat pump RTU",
              "keywords": []
            },
            {
              "id": "measure-133",
              "name": "Gas MAU → electric MAU",
              "keywords": []
            },
            {
              "id": "measure-134",
              "name": "Steam heating → high-temp heat pump",
              "keywords": []
            }
          ]
        },
        {
          "id": "cooling-electrification",
          "name": "Cooling Electrification",
          "measures": [
            {
              "id": "measure-135",
              "name": "Absorption chiller → electric chiller",
              "keywords": [
                "chiller"
              ]
            },
            {
              "id": "measure-136",
              "name": "Engine-driven chiller → electric chiller",
              "keywords": [
                "chiller"
              ]
            }
          ]
        },
        {
          "id": "domestic-hot-water-electrification",
          "name": "Domestic Hot Water Electrification",
          "measures": [
            {
              "id": "measure-137",
              "name": "Gas water heater → HPWH",
              "keywords": [
                "hpwh"
              ]
            },
            {
              "id": "measure-138",
              "name": "Gas booster → electric booster",
              "keywords": []
            },
            {
              "id": "measure-139",
              "name": "Steam → heat pump DHW system",
              "keywords": []
            }
          ]
        },
        {
          "id": "cooking-electrification",
          "name": "Cooking Electrification",
          "measures": [
            {
              "id": "measure-140",
              "name": "Gas range → induction",
              "keywords": []
            },
            {
              "id": "measure-141",
              "name": "Gas fryer → electric fryer",
              "keywords": []
            },
            {
              "id": "measure-142",
              "name": "Gas oven → electric convection oven",
              "keywords": []
            },
            {
              "id": "measure-143",
              "name": "Gas broiler → electric salamander",
              "keywords": []
            }
          ]
        },
        {
          "id": "infrastructure-upgrades-for-electrification",
          "name": "Infrastructure Upgrades for Electrification",
          "measures": [
            {
              "id": "measure-144",
              "name": "Panelboard replacement",
              "keywords": [
                "replacement"
              ]
            },
            {
              "id": "measure-145",
              "name": "Service upgrade",
              "keywords": [
                "upgrade"
              ]
            },
            {
              "id": "measure-146",
              "name": "Transformer replacement",
              "keywords": [
                "replacement"
              ]
            },
            {
              "id": "measure-147",
              "name": "Electrified reheat systems",
              "keywords": []
            },
            {
              "id": "measure-148",
              "name": "Distribution redesign (4-pipe to 2-pipe HP system)",
              "keywords": []
            }
          ]
        },
        {
          "id": "insulation",
          "name": "Insulation",
          "measures": [
            {
              "id": "measure-149",
              "name": "Roof insulation",
              "keywords": [
                "insulation"
              ]
            },
            {
              "id": "measure-150",
              "name": "Wall insulation",
              "keywords": [
                "insulation"
              ]
            },
            {
              "id": "measure-151",
              "name": "Pipe insulation",
              "keywords": [
                "insulation"
              ]
            },
            {
              "id": "measure-152",
              "name": "Duct insulation",
              "keywords": [
                "insulation"
              ]
            }
          ]
        },
        {
          "id": "windows",
          "name": "Windows",
          "measures": [
            {
              "id": "measure-153",
              "name": "Double-pane windows",
              "keywords": []
            },
            {
              "id": "measure-154",
              "name": "Triple-pane windows",
              "keywords": []
            },
            {
              "id": "measure-155",
              "name": "Low-E film",
              "keywords": []
            },
            {
              "id": "measure-156",
              "name": "Security tint film",
              "keywords": []
            },
            {
              "id": "measure-157",
              "name": "Window replacement",
              "keywords": [
                "replacement"
              ]
            },
            {
              "id": "measure-158",
              "name": "Skylights / solar tubes",
              "keywords": [
                "solar"
              ]
            }
          ]
        },
        {
          "id": "air-sealing",
          "name": "Air Sealing",
          "measures": [
            {
              "id": "measure-159",
              "name": "Door sweeps",
              "keywords": []
            },
            {
              "id": "measure-160",
              "name": "Weather stripping",
              "keywords": []
            },
            {
              "id": "measure-161",
              "name": "Envelope leak sealing",
              "keywords": []
            },
            {
              "id": "measure-162",
              "name": "Vestibule addition",
              "keywords": []
            }
          ]
        },
        {
          "id": "roofing",
          "name": "Roofing",
          "measures": [
            {
              "id": "measure-163",
              "name": "Cool roof coating",
              "keywords": []
            },
            {
              "id": "measure-164",
              "name": "Reflective membranes",
              "keywords": []
            },
            {
              "id": "measure-165",
              "name": "Green roof",
              "keywords": []
            }
          ]
        },
        {
          "id": "display-case-refrigeration",
          "name": "Display / Case Refrigeration",
          "measures": [
            {
              "id": "measure-166",
              "name": "EC evaporator fan motors",
              "keywords": [
                "ec"
              ]
            },
            {
              "id": "measure-167",
              "name": "LED case lighting",
              "keywords": [
                "led"
              ]
            },
            {
              "id": "measure-168",
              "name": "Anti-sweat heater controls",
              "keywords": [
                "controls"
              ]
            },
            {
              "id": "measure-169",
              "name": "Night curtains",
              "keywords": []
            },
            {
              "id": "measure-170",
              "name": "Door gasket upgrades",
              "keywords": []
            }
          ]
        },
        {
          "id": "rack-systems",
          "name": "Rack Systems",
          "measures": [
            {
              "id": "measure-171",
              "name": "Floating head pressure controls",
              "keywords": [
                "controls"
              ]
            },
            {
              "id": "measure-172",
              "name": "Floating suction pressure",
              "keywords": []
            },
            {
              "id": "measure-173",
              "name": "VFD compressors",
              "keywords": [
                "vfd"
              ]
            },
            {
              "id": "measure-174",
              "name": "Heat reclaim",
              "keywords": []
            },
            {
              "id": "measure-175",
              "name": "Defrost optimization",
              "keywords": [
                "optimization"
              ]
            },
            {
              "id": "measure-176",
              "name": "Refrigeration controls upgrade",
              "keywords": [
                "refrigeration",
                "controls",
                "upgrade"
              ]
            }
          ]
        },
        {
          "id": "walk-in-coolers-freezers",
          "name": "Walk-in Coolers / Freezers",
          "measures": [
            {
              "id": "measure-177",
              "name": "Strip curtains",
              "keywords": []
            },
            {
              "id": "measure-178",
              "name": "ECM fans",
              "keywords": [
                "ecm"
              ]
            },
            {
              "id": "measure-179",
              "name": "High-efficiency doors",
              "keywords": []
            },
            {
              "id": "measure-180",
              "name": "Insulation upgrades",
              "keywords": [
                "insulation"
              ]
            },
            {
              "id": "measure-181",
              "name": "Low-flow fixtures",
              "keywords": []
            },
            {
              "id": "measure-182",
              "name": "Auto-faucets",
              "keywords": []
            },
            {
              "id": "measure-183",
              "name": "Auto-flush valves",
              "keywords": []
            },
            {
              "id": "measure-184",
              "name": "HPWH systems",
              "keywords": [
                "hpwh"
              ]
            },
            {
              "id": "measure-185",
              "name": "Hot-water recirculation optimization",
              "keywords": [
                "optimization"
              ]
            },
            {
              "id": "measure-186",
              "name": "Steam-to-DHW conversion",
              "keywords": []
            },
            {
              "id": "measure-187",
              "name": "Irrigation controllers",
              "keywords": []
            },
            {
              "id": "measure-188",
              "name": "Leak detection systems",
              "keywords": []
            },
            {
              "id": "measure-189",
              "name": "Water-cooled to air-cooled conversions",
              "keywords": []
            }
          ]
        }
      ]
    },
    {
      "id": "motors-electrical-systems",
      "name": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategories": [
        {
          "id": "motors",
          "name": "Motors",
          "measures": [
            {
              "id": "measure-190",
              "name": "NEMA Premium motors",
              "keywords": []
            },
            {
              "id": "measure-191",
              "name": "ECM motors",
              "keywords": [
                "ecm"
              ]
            },
            {
              "id": "measure-192",
              "name": "Right-sizing motors",
              "keywords": []
            },
            {
              "id": "measure-193",
              "name": "Soft starters",
              "keywords": []
            },
            {
              "id": "measure-194",
              "name": "Motor VFDs",
              "keywords": []
            }
          ]
        },
        {
          "id": "electrical-infrastructure",
          "name": "Electrical Infrastructure",
          "measures": [
            {
              "id": "measure-195",
              "name": "High-efficiency transformers",
              "keywords": []
            },
            {
              "id": "measure-196",
              "name": "Load balancing",
              "keywords": []
            },
            {
              "id": "measure-197",
              "name": "Power factor correction",
              "keywords": []
            },
            {
              "id": "measure-198",
              "name": "Harmonic filtering",
              "keywords": []
            },
            {
              "id": "measure-199",
              "name": "Smart panels",
              "keywords": []
            },
            {
              "id": "measure-200",
              "name": "Submetering",
              "keywords": []
            }
          ]
        },
        {
          "id": "storage",
          "name": "Storage",
          "measures": [
            {
              "id": "measure-201",
              "name": "Battery energy storage systems (BESS)",
              "keywords": [
                "battery",
                "bess"
              ]
            },
            {
              "id": "measure-202",
              "name": "Peak shaving batteries",
              "keywords": []
            },
            {
              "id": "measure-203",
              "name": "Load shifting batteries",
              "keywords": []
            }
          ]
        },
        {
          "id": "renewables",
          "name": "Renewables",
          "measures": [
            {
              "id": "measure-204",
              "name": "Solar PV",
              "keywords": [
                "solar"
              ]
            },
            {
              "id": "measure-205",
              "name": "Solar thermal",
              "keywords": [
                "solar"
              ]
            },
            {
              "id": "measure-206",
              "name": "Microgrid controls",
              "keywords": [
                "controls"
              ]
            },
            {
              "id": "measure-207",
              "name": "Hybrid inverter systems",
              "keywords": []
            }
          ]
        },
        {
          "id": "thermal-storage",
          "name": "Thermal Storage",
          "measures": [
            {
              "id": "measure-208",
              "name": "Ice storage",
              "keywords": []
            },
            {
              "id": "measure-209",
              "name": "Chilled water storage",
              "keywords": []
            },
            {
              "id": "measure-210",
              "name": "PCM thermal storage",
              "keywords": []
            }
          ]
        },
        {
          "id": "compressed-air",
          "name": "Compressed Air",
          "measures": [
            {
              "id": "measure-211",
              "name": "Leak detection",
              "keywords": []
            },
            {
              "id": "measure-212",
              "name": "Compressor replacement (VFD/two-stage)",
              "keywords": [
                "replacement"
              ]
            },
            {
              "id": "measure-213",
              "name": "Zero-loss drains",
              "keywords": []
            },
            {
              "id": "measure-214",
              "name": "Heat recovery",
              "keywords": []
            },
            {
              "id": "measure-215",
              "name": "Setpoint optimization",
              "keywords": [
                "optimization"
              ]
            }
          ]
        },
        {
          "id": "process-loads",
          "name": "Process Loads",
          "measures": [
            {
              "id": "measure-216",
              "name": "Oven upgrades",
              "keywords": []
            },
            {
              "id": "measure-217",
              "name": "Process chiller optimization",
              "keywords": [
                "chiller",
                "optimization"
              ]
            },
            {
              "id": "measure-218",
              "name": "Industrial refrigeration",
              "keywords": [
                "refrigeration"
              ]
            },
            {
              "id": "measure-219",
              "name": "Pump VFDs",
              "keywords": []
            },
            {
              "id": "measure-220",
              "name": "Industrial fans (ECM/VFD)",
              "keywords": []
            },
            {
              "id": "measure-221",
              "name": "OR setback controls",
              "keywords": [
                "controls"
              ]
            },
            {
              "id": "measure-222",
              "name": "OR ACH reduction",
              "keywords": []
            },
            {
              "id": "measure-223",
              "name": "Lab VAV hood control",
              "keywords": []
            },
            {
              "id": "measure-224",
              "name": "Lab exhaust VFDs",
              "keywords": []
            },
            {
              "id": "measure-225",
              "name": "Isolation room pressurization",
              "keywords": []
            },
            {
              "id": "measure-226",
              "name": "Heat recovery chillers for reheat loops",
              "keywords": []
            },
            {
              "id": "measure-227",
              "name": "MRI chiller optimization",
              "keywords": [
                "chiller",
                "optimization"
              ]
            },
            {
              "id": "measure-228",
              "name": "Sterilizer reclaim systems",
              "keywords": []
            },
            {
              "id": "measure-229",
              "name": "Medical air/vacuum optimization",
              "keywords": [
                "optimization"
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "data-center-measures",
      "name": "DATA CENTER MEASURES",
      "subcategories": [
        {
          "id": "general",
          "name": "General",
          "measures": [
            {
              "id": "measure-230",
              "name": "Hot aisle containment",
              "keywords": []
            },
            {
              "id": "measure-231",
              "name": "Cold aisle containment",
              "keywords": []
            },
            {
              "id": "measure-232",
              "name": "CRAH/CRAC VFD retrofits",
              "keywords": [
                "vfd"
              ]
            },
            {
              "id": "measure-233",
              "name": "Free cooling",
              "keywords": []
            },
            {
              "id": "measure-234",
              "name": "Liquid cooling",
              "keywords": []
            },
            {
              "id": "measure-235",
              "name": "IT Efficiency",
              "keywords": [
                "efficiency"
              ]
            },
            {
              "id": "measure-236",
              "name": "Server virtualization",
              "keywords": []
            },
            {
              "id": "measure-237",
              "name": "Server consolidation",
              "keywords": []
            },
            {
              "id": "measure-238",
              "name": "High-efficiency UPS",
              "keywords": []
            }
          ]
        }
      ]
    },
    {
      "id": "plug-load",
      "name": "PLUG LOAD",
      "subcategories": [
        {
          "id": "general",
          "name": "General",
          "measures": [
            {
              "id": "measure-239",
              "name": "Smart plugs",
              "keywords": []
            },
            {
              "id": "measure-240",
              "name": "PC power management",
              "keywords": []
            },
            {
              "id": "measure-241",
              "name": "Vending machine controllers",
              "keywords": []
            },
            {
              "id": "measure-242",
              "name": "Lab freezer replacements",
              "keywords": []
            },
            {
              "id": "measure-243",
              "name": "Appliance replacement",
              "keywords": [
                "replacement"
              ]
            },
            {
              "id": "measure-244",
              "name": "Copier/printer consolidation",
              "keywords": []
            }
          ]
        }
      ]
    }
  ],
  "allMeasures": [
    {
      "id": "measure-23",
      "name": "Centrifugal chiller",
      "category": "COOLING SYSTEMS",
      "subcategory": "Electric Chillers",
      "keywords": [
        "chiller"
      ]
    },
    {
      "id": "measure-24",
      "name": "Standard",
      "category": "COOLING SYSTEMS",
      "subcategory": "Electric Chillers",
      "keywords": []
    },
    {
      "id": "measure-25",
      "name": "Two-stage",
      "category": "COOLING SYSTEMS",
      "subcategory": "Electric Chillers",
      "keywords": []
    },
    {
      "id": "measure-26",
      "name": "VFD centrifugal",
      "category": "COOLING SYSTEMS",
      "subcategory": "Electric Chillers",
      "keywords": [
        "vfd"
      ]
    },
    {
      "id": "measure-27",
      "name": "Magnetic-bearing centrifugal",
      "category": "COOLING SYSTEMS",
      "subcategory": "Electric Chillers",
      "keywords": []
    },
    {
      "id": "measure-28",
      "name": "Screw chiller",
      "category": "COOLING SYSTEMS",
      "subcategory": "Electric Chillers",
      "keywords": [
        "chiller"
      ]
    },
    {
      "id": "measure-29",
      "name": "Air-cooled screw",
      "category": "COOLING SYSTEMS",
      "subcategory": "Electric Chillers",
      "keywords": []
    },
    {
      "id": "measure-30",
      "name": "Water-cooled screw",
      "category": "COOLING SYSTEMS",
      "subcategory": "Electric Chillers",
      "keywords": []
    },
    {
      "id": "measure-31",
      "name": "VFD screw",
      "category": "COOLING SYSTEMS",
      "subcategory": "Electric Chillers",
      "keywords": [
        "vfd"
      ]
    },
    {
      "id": "measure-32",
      "name": "Scroll chiller",
      "category": "COOLING SYSTEMS",
      "subcategory": "Electric Chillers",
      "keywords": [
        "chiller"
      ]
    },
    {
      "id": "measure-33",
      "name": "Modular multi-scroll",
      "category": "COOLING SYSTEMS",
      "subcategory": "Electric Chillers",
      "keywords": []
    },
    {
      "id": "measure-34",
      "name": "Packaged air-cooled scroll",
      "category": "COOLING SYSTEMS",
      "subcategory": "Electric Chillers",
      "keywords": []
    },
    {
      "id": "measure-35",
      "name": "Reciprocating chiller (legacy)",
      "category": "COOLING SYSTEMS",
      "subcategory": "Electric Chillers",
      "keywords": [
        "chiller"
      ]
    },
    {
      "id": "measure-36",
      "name": "Free-cooling / economizer chillers",
      "category": "COOLING SYSTEMS",
      "subcategory": "Electric Chillers",
      "keywords": []
    },
    {
      "id": "measure-37",
      "name": "Direct-fired absorption (LiBr)",
      "category": "COOLING SYSTEMS",
      "subcategory": "Absorption / Gas / Engine Chillers",
      "keywords": []
    },
    {
      "id": "measure-38",
      "name": "Double-effect absorption",
      "category": "COOLING SYSTEMS",
      "subcategory": "Absorption / Gas / Engine Chillers",
      "keywords": []
    },
    {
      "id": "measure-39",
      "name": "Steam absorption",
      "category": "COOLING SYSTEMS",
      "subcategory": "Absorption / Gas / Engine Chillers",
      "keywords": []
    },
    {
      "id": "measure-40",
      "name": "Natural gas engine-driven chiller",
      "category": "COOLING SYSTEMS",
      "subcategory": "Absorption / Gas / Engine Chillers",
      "keywords": [
        "chiller"
      ]
    },
    {
      "id": "measure-41",
      "name": "CHP integrated chiller",
      "category": "COOLING SYSTEMS",
      "subcategory": "Absorption / Gas / Engine Chillers",
      "keywords": [
        "chiller"
      ]
    },
    {
      "id": "measure-42",
      "name": "Air-source heat pump chiller",
      "category": "COOLING SYSTEMS",
      "subcategory": "Heat Pump Chillers (Belong under COOLING)",
      "keywords": [
        "chiller"
      ]
    },
    {
      "id": "measure-43",
      "name": "Water-source heat pump chiller",
      "category": "COOLING SYSTEMS",
      "subcategory": "Heat Pump Chillers (Belong under COOLING)",
      "keywords": [
        "chiller"
      ]
    },
    {
      "id": "measure-44",
      "name": "Reversible heat pump chiller (4-pipe)",
      "category": "COOLING SYSTEMS",
      "subcategory": "Heat Pump Chillers (Belong under COOLING)",
      "keywords": [
        "chiller"
      ]
    },
    {
      "id": "measure-45",
      "name": "Heat-recovery chiller (simultaneous heat + cooling)",
      "category": "COOLING SYSTEMS",
      "subcategory": "Heat Pump Chillers (Belong under COOLING)",
      "keywords": [
        "chiller"
      ]
    },
    {
      "id": "measure-46",
      "name": "High-temp heat pump chiller-boiler (130–180°F)",
      "category": "COOLING SYSTEMS",
      "subcategory": "Heat Pump Chillers (Belong under COOLING)",
      "keywords": []
    },
    {
      "id": "measure-47",
      "name": "CO₂ transcritical heat pump chiller",
      "category": "COOLING SYSTEMS",
      "subcategory": "Heat Pump Chillers (Belong under COOLING)",
      "keywords": [
        "chiller"
      ]
    },
    {
      "id": "measure-48",
      "name": "VFD tower fans",
      "category": "COOLING SYSTEMS",
      "subcategory": "Cooling Towers",
      "keywords": [
        "vfd"
      ]
    },
    {
      "id": "measure-49",
      "name": "EC fan motors",
      "category": "COOLING SYSTEMS",
      "subcategory": "Cooling Towers",
      "keywords": [
        "ec"
      ]
    },
    {
      "id": "measure-50",
      "name": "Drift eliminators",
      "category": "COOLING SYSTEMS",
      "subcategory": "Cooling Towers",
      "keywords": []
    },
    {
      "id": "measure-51",
      "name": "Fill media upgrades",
      "category": "COOLING SYSTEMS",
      "subcategory": "Cooling Towers",
      "keywords": []
    },
    {
      "id": "measure-52",
      "name": "Nozzle upgrades",
      "category": "COOLING SYSTEMS",
      "subcategory": "Cooling Towers",
      "keywords": []
    },
    {
      "id": "measure-53",
      "name": "Basin heaters optimization",
      "category": "COOLING SYSTEMS",
      "subcategory": "Cooling Towers",
      "keywords": [
        "optimization"
      ]
    },
    {
      "id": "measure-54",
      "name": "Side-stream filtration",
      "category": "COOLING SYSTEMS",
      "subcategory": "Cooling Towers",
      "keywords": []
    },
    {
      "id": "measure-55",
      "name": "Water treatment optimization",
      "category": "COOLING SYSTEMS",
      "subcategory": "Cooling Towers",
      "keywords": [
        "optimization"
      ]
    },
    {
      "id": "measure-56",
      "name": "CHW pumps (primary)",
      "category": "COOLING SYSTEMS",
      "subcategory": "Cooling Distribution",
      "keywords": []
    },
    {
      "id": "measure-57",
      "name": "CHW pumps (secondary)",
      "category": "COOLING SYSTEMS",
      "subcategory": "Cooling Distribution",
      "keywords": []
    },
    {
      "id": "measure-58",
      "name": "Pump VFDs",
      "category": "COOLING SYSTEMS",
      "subcategory": "Cooling Distribution",
      "keywords": []
    },
    {
      "id": "measure-59",
      "name": "Pump impeller trimming",
      "category": "COOLING SYSTEMS",
      "subcategory": "Cooling Distribution",
      "keywords": []
    },
    {
      "id": "measure-60",
      "name": "Variable primary flow conversion",
      "category": "COOLING SYSTEMS",
      "subcategory": "Cooling Distribution",
      "keywords": []
    },
    {
      "id": "measure-61",
      "name": "PICVs (pressure independent control valves)",
      "category": "COOLING SYSTEMS",
      "subcategory": "Cooling Distribution",
      "keywords": []
    },
    {
      "id": "measure-62",
      "name": "Hydronic balancing",
      "category": "COOLING SYSTEMS",
      "subcategory": "Cooling Distribution",
      "keywords": []
    },
    {
      "id": "measure-63",
      "name": "CHW ΔT optimization",
      "category": "COOLING SYSTEMS",
      "subcategory": "Cooling Distribution",
      "keywords": [
        "optimization"
      ]
    },
    {
      "id": "measure-64",
      "name": "Condensing boilers (high-efficiency)",
      "category": "HEATING SYSTEMS",
      "subcategory": "Boilers",
      "keywords": []
    },
    {
      "id": "measure-65",
      "name": "High-turndown burner retrofits",
      "category": "HEATING SYSTEMS",
      "subcategory": "Boilers",
      "keywords": []
    },
    {
      "id": "measure-66",
      "name": "Steam boilers",
      "category": "HEATING SYSTEMS",
      "subcategory": "Boilers",
      "keywords": []
    },
    {
      "id": "measure-67",
      "name": "Boiler economizers",
      "category": "HEATING SYSTEMS",
      "subcategory": "Boilers",
      "keywords": [
        "boiler"
      ]
    },
    {
      "id": "measure-68",
      "name": "Blowdown heat recovery",
      "category": "HEATING SYSTEMS",
      "subcategory": "Boilers",
      "keywords": []
    },
    {
      "id": "measure-69",
      "name": "Boiler sequencing optimization",
      "category": "HEATING SYSTEMS",
      "subcategory": "Boilers",
      "keywords": [
        "boiler",
        "optimization"
      ]
    },
    {
      "id": "measure-70",
      "name": "Packaged heat pumps (RTU heat pumps)",
      "category": "HEATING SYSTEMS",
      "subcategory": "Heat Pumps (HEATING CATEGORY)",
      "keywords": []
    },
    {
      "id": "measure-71",
      "name": "Split-system heat pumps",
      "category": "HEATING SYSTEMS",
      "subcategory": "Heat Pumps (HEATING CATEGORY)",
      "keywords": []
    },
    {
      "id": "measure-72",
      "name": "VRF/VRV heat pump systems",
      "category": "HEATING SYSTEMS",
      "subcategory": "Heat Pumps (HEATING CATEGORY)",
      "keywords": []
    },
    {
      "id": "measure-73",
      "name": "Water-source heat pumps",
      "category": "HEATING SYSTEMS",
      "subcategory": "Heat Pumps (HEATING CATEGORY)",
      "keywords": []
    },
    {
      "id": "measure-74",
      "name": "Air-to-water heat pumps",
      "category": "HEATING SYSTEMS",
      "subcategory": "Heat Pumps (HEATING CATEGORY)",
      "keywords": []
    },
    {
      "id": "measure-75",
      "name": "Ground-source heat pumps",
      "category": "HEATING SYSTEMS",
      "subcategory": "Heat Pumps (HEATING CATEGORY)",
      "keywords": []
    },
    {
      "id": "measure-76",
      "name": "Heat pump water heaters (HPWH)",
      "category": "HEATING SYSTEMS",
      "subcategory": "Heat Pumps (HEATING CATEGORY)",
      "keywords": [
        "hpwh"
      ]
    },
    {
      "id": "measure-77",
      "name": "High-temp industrial heat pumps",
      "category": "HEATING SYSTEMS",
      "subcategory": "Heat Pumps (HEATING CATEGORY)",
      "keywords": []
    },
    {
      "id": "measure-78",
      "name": "Heat pump make-up air units",
      "category": "HEATING SYSTEMS",
      "subcategory": "Heat Pumps (HEATING CATEGORY)",
      "keywords": []
    },
    {
      "id": "measure-79",
      "name": "Heat pump boiler replacements",
      "category": "HEATING SYSTEMS",
      "subcategory": "Heat Pumps (HEATING CATEGORY)",
      "keywords": [
        "boiler"
      ]
    },
    {
      "id": "measure-80",
      "name": "HW pumps (primary/secondary)",
      "category": "HEATING SYSTEMS",
      "subcategory": "Heating Distribution",
      "keywords": []
    },
    {
      "id": "measure-81",
      "name": "Pump VFDs",
      "category": "HEATING SYSTEMS",
      "subcategory": "Heating Distribution",
      "keywords": []
    },
    {
      "id": "measure-82",
      "name": "Hydronic loop balancing",
      "category": "HEATING SYSTEMS",
      "subcategory": "Heating Distribution",
      "keywords": []
    },
    {
      "id": "measure-83",
      "name": "Reheat coil optimization",
      "category": "HEATING SYSTEMS",
      "subcategory": "Heating Distribution",
      "keywords": [
        "optimization"
      ]
    },
    {
      "id": "measure-84",
      "name": "Pipe insulation",
      "category": "HEATING SYSTEMS",
      "subcategory": "Heating Distribution",
      "keywords": [
        "insulation"
      ]
    },
    {
      "id": "measure-85",
      "name": "Steam-to-hot-water conversion",
      "category": "HEATING SYSTEMS",
      "subcategory": "Heating Distribution",
      "keywords": []
    },
    {
      "id": "measure-86",
      "name": "AHU replacements",
      "category": "AIR DISTRIBUTION & VENTILATION",
      "subcategory": "Air Handling Units (AHUs)",
      "keywords": [
        "ahu"
      ]
    },
    {
      "id": "measure-87",
      "name": "Fan wall retrofits",
      "category": "AIR DISTRIBUTION & VENTILATION",
      "subcategory": "Air Handling Units (AHUs)",
      "keywords": []
    },
    {
      "id": "measure-88",
      "name": "ECM supply/return fans",
      "category": "AIR DISTRIBUTION & VENTILATION",
      "subcategory": "Air Handling Units (AHUs)",
      "keywords": [
        "ecm"
      ]
    },
    {
      "id": "measure-89",
      "name": "VFD upgrades",
      "category": "AIR DISTRIBUTION & VENTILATION",
      "subcategory": "Air Handling Units (AHUs)",
      "keywords": [
        "vfd"
      ]
    },
    {
      "id": "measure-90",
      "name": "Coil cleaning / replacement",
      "category": "AIR DISTRIBUTION & VENTILATION",
      "subcategory": "Air Handling Units (AHUs)",
      "keywords": [
        "replacement"
      ]
    },
    {
      "id": "measure-91",
      "name": "Filter upgrades (MERV 13–16)",
      "category": "AIR DISTRIBUTION & VENTILATION",
      "subcategory": "Air Handling Units (AHUs)",
      "keywords": []
    },
    {
      "id": "measure-92",
      "name": "Humidification upgrades",
      "category": "AIR DISTRIBUTION & VENTILATION",
      "subcategory": "Air Handling Units (AHUs)",
      "keywords": []
    },
    {
      "id": "measure-93",
      "name": "DOAS systems",
      "category": "AIR DISTRIBUTION & VENTILATION",
      "subcategory": "Ventilation Systems",
      "keywords": [
        "doas"
      ]
    },
    {
      "id": "measure-94",
      "name": "ERV (energy recovery ventilator)",
      "category": "AIR DISTRIBUTION & VENTILATION",
      "subcategory": "Ventilation Systems",
      "keywords": [
        "erv"
      ]
    },
    {
      "id": "measure-95",
      "name": "HRV (heat recovery ventilator)",
      "category": "AIR DISTRIBUTION & VENTILATION",
      "subcategory": "Ventilation Systems",
      "keywords": [
        "hrv"
      ]
    },
    {
      "id": "measure-96",
      "name": "Enthalpy wheels",
      "category": "AIR DISTRIBUTION & VENTILATION",
      "subcategory": "Ventilation Systems",
      "keywords": []
    },
    {
      "id": "measure-97",
      "name": "Heat pipes",
      "category": "AIR DISTRIBUTION & VENTILATION",
      "subcategory": "Ventilation Systems",
      "keywords": []
    },
    {
      "id": "measure-98",
      "name": "Runaround heat recovery loops",
      "category": "AIR DISTRIBUTION & VENTILATION",
      "subcategory": "Ventilation Systems",
      "keywords": []
    },
    {
      "id": "measure-99",
      "name": "CO₂ demand-controlled ventilation (DCV)",
      "category": "HEATING SYSTEMS",
      "subcategory": "Ventilation Controls",
      "keywords": []
    },
    {
      "id": "measure-100",
      "name": "Occupancy-based ventilation",
      "category": "HEATING SYSTEMS",
      "subcategory": "Ventilation Controls",
      "keywords": []
    },
    {
      "id": "measure-101",
      "name": "Outdoor air reset",
      "category": "HEATING SYSTEMS",
      "subcategory": "Ventilation Controls",
      "keywords": []
    },
    {
      "id": "measure-102",
      "name": "VAV calibration",
      "category": "HEATING SYSTEMS",
      "subcategory": "Ventilation Controls",
      "keywords": []
    },
    {
      "id": "measure-103",
      "name": "Night setback modes",
      "category": "HEATING SYSTEMS",
      "subcategory": "Ventilation Controls",
      "keywords": []
    },
    {
      "id": "measure-104",
      "name": "Lab fume hood VAV controls",
      "category": "AIR DISTRIBUTION & VENTILATION",
      "subcategory": "Exhaust Systems",
      "keywords": [
        "controls"
      ]
    },
    {
      "id": "measure-105",
      "name": "Lab exhaust VFD systems",
      "category": "AIR DISTRIBUTION & VENTILATION",
      "subcategory": "Exhaust Systems",
      "keywords": [
        "vfd"
      ]
    },
    {
      "id": "measure-106",
      "name": "Kitchen hood VFD systems",
      "category": "AIR DISTRIBUTION & VENTILATION",
      "subcategory": "Exhaust Systems",
      "keywords": [
        "vfd"
      ]
    },
    {
      "id": "measure-107",
      "name": "KMC Controls",
      "category": "HVAC CONTROLS",
      "subcategory": "BMS/EMS Platforms",
      "keywords": [
        "controls"
      ]
    },
    {
      "id": "measure-108",
      "name": "Siemens",
      "category": "HVAC CONTROLS",
      "subcategory": "BMS/EMS Platforms",
      "keywords": []
    },
    {
      "id": "measure-109",
      "name": "Honeywell",
      "category": "HVAC CONTROLS",
      "subcategory": "BMS/EMS Platforms",
      "keywords": []
    },
    {
      "id": "measure-110",
      "name": "Johnson Controls",
      "category": "HVAC CONTROLS",
      "subcategory": "BMS/EMS Platforms",
      "keywords": [
        "controls"
      ]
    },
    {
      "id": "measure-111",
      "name": "Tridium Niagara",
      "category": "HVAC CONTROLS",
      "subcategory": "BMS/EMS Platforms",
      "keywords": []
    },
    {
      "id": "measure-112",
      "name": "Ignition SCADA",
      "category": "HVAC CONTROLS",
      "subcategory": "BMS/EMS Platforms",
      "keywords": []
    },
    {
      "id": "measure-113",
      "name": "Distech",
      "category": "HVAC CONTROLS",
      "subcategory": "BMS/EMS Platforms",
      "keywords": []
    },
    {
      "id": "measure-114",
      "name": "Automated Logic",
      "category": "HVAC CONTROLS",
      "subcategory": "BMS/EMS Platforms",
      "keywords": []
    },
    {
      "id": "measure-115",
      "name": "Schneider EcoStruxure",
      "category": "HVAC CONTROLS",
      "subcategory": "BMS/EMS Platforms",
      "keywords": []
    },
    {
      "id": "measure-116",
      "name": "SAT reset",
      "category": "HVAC CONTROLS",
      "subcategory": "Control Strategies",
      "keywords": []
    },
    {
      "id": "measure-117",
      "name": "CHW reset",
      "category": "HVAC CONTROLS",
      "subcategory": "Control Strategies",
      "keywords": []
    },
    {
      "id": "measure-118",
      "name": "HW reset",
      "category": "HVAC CONTROLS",
      "subcategory": "Control Strategies",
      "keywords": []
    },
    {
      "id": "measure-119",
      "name": "Outside air reset",
      "category": "HVAC CONTROLS",
      "subcategory": "Control Strategies",
      "keywords": []
    },
    {
      "id": "measure-120",
      "name": "Static pressure reset",
      "category": "HVAC CONTROLS",
      "subcategory": "Control Strategies",
      "keywords": []
    },
    {
      "id": "measure-121",
      "name": "Optimal start/stop",
      "category": "HVAC CONTROLS",
      "subcategory": "Control Strategies",
      "keywords": []
    },
    {
      "id": "measure-122",
      "name": "Equipment scheduling optimization",
      "category": "HVAC CONTROLS",
      "subcategory": "Control Strategies",
      "keywords": [
        "optimization"
      ]
    },
    {
      "id": "measure-123",
      "name": "Load shedding",
      "category": "HVAC CONTROLS",
      "subcategory": "Control Strategies",
      "keywords": []
    },
    {
      "id": "measure-124",
      "name": "Fault detection and diagnostics (FDD)",
      "category": "HVAC CONTROLS",
      "subcategory": "Advanced Controls",
      "keywords": []
    },
    {
      "id": "measure-125",
      "name": "AI-based optimization (EverWatt.AI)",
      "category": "HVAC CONTROLS",
      "subcategory": "Advanced Controls",
      "keywords": [
        "optimization"
      ]
    },
    {
      "id": "measure-126",
      "name": "DR automation",
      "category": "HVAC CONTROLS",
      "subcategory": "Advanced Controls",
      "keywords": []
    },
    {
      "id": "measure-127",
      "name": "Weather-integrated predictive logic",
      "category": "HVAC CONTROLS",
      "subcategory": "Advanced Controls",
      "keywords": []
    },
    {
      "id": "measure-128",
      "name": "Circuit-level metering",
      "category": "HVAC CONTROLS",
      "subcategory": "Advanced Controls",
      "keywords": []
    },
    {
      "id": "measure-129",
      "name": "Gas boiler → heat pump chiller",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Heating Electrification",
      "keywords": [
        "boiler",
        "chiller"
      ]
    },
    {
      "id": "measure-130",
      "name": "Gas boiler → electric boiler",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Heating Electrification",
      "keywords": [
        "boiler"
      ]
    },
    {
      "id": "measure-131",
      "name": "Gas furnace → heat pump",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Heating Electrification",
      "keywords": []
    },
    {
      "id": "measure-132",
      "name": "Gas RTU → electric heat pump RTU",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Heating Electrification",
      "keywords": []
    },
    {
      "id": "measure-133",
      "name": "Gas MAU → electric MAU",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Heating Electrification",
      "keywords": []
    },
    {
      "id": "measure-134",
      "name": "Steam heating → high-temp heat pump",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Heating Electrification",
      "keywords": []
    },
    {
      "id": "measure-135",
      "name": "Absorption chiller → electric chiller",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Cooling Electrification",
      "keywords": [
        "chiller"
      ]
    },
    {
      "id": "measure-136",
      "name": "Engine-driven chiller → electric chiller",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Cooling Electrification",
      "keywords": [
        "chiller"
      ]
    },
    {
      "id": "measure-137",
      "name": "Gas water heater → HPWH",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Domestic Hot Water Electrification",
      "keywords": [
        "hpwh"
      ]
    },
    {
      "id": "measure-138",
      "name": "Gas booster → electric booster",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Domestic Hot Water Electrification",
      "keywords": []
    },
    {
      "id": "measure-139",
      "name": "Steam → heat pump DHW system",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Domestic Hot Water Electrification",
      "keywords": []
    },
    {
      "id": "measure-140",
      "name": "Gas range → induction",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Cooking Electrification",
      "keywords": []
    },
    {
      "id": "measure-141",
      "name": "Gas fryer → electric fryer",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Cooking Electrification",
      "keywords": []
    },
    {
      "id": "measure-142",
      "name": "Gas oven → electric convection oven",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Cooking Electrification",
      "keywords": []
    },
    {
      "id": "measure-143",
      "name": "Gas broiler → electric salamander",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Cooking Electrification",
      "keywords": []
    },
    {
      "id": "measure-144",
      "name": "Panelboard replacement",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Infrastructure Upgrades for Electrification",
      "keywords": [
        "replacement"
      ]
    },
    {
      "id": "measure-145",
      "name": "Service upgrade",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Infrastructure Upgrades for Electrification",
      "keywords": [
        "upgrade"
      ]
    },
    {
      "id": "measure-146",
      "name": "Transformer replacement",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Infrastructure Upgrades for Electrification",
      "keywords": [
        "replacement"
      ]
    },
    {
      "id": "measure-147",
      "name": "Electrified reheat systems",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Infrastructure Upgrades for Electrification",
      "keywords": []
    },
    {
      "id": "measure-148",
      "name": "Distribution redesign (4-pipe to 2-pipe HP system)",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Infrastructure Upgrades for Electrification",
      "keywords": []
    },
    {
      "id": "measure-149",
      "name": "Roof insulation",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Insulation",
      "keywords": [
        "insulation"
      ]
    },
    {
      "id": "measure-150",
      "name": "Wall insulation",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Insulation",
      "keywords": [
        "insulation"
      ]
    },
    {
      "id": "measure-151",
      "name": "Pipe insulation",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Insulation",
      "keywords": [
        "insulation"
      ]
    },
    {
      "id": "measure-152",
      "name": "Duct insulation",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Insulation",
      "keywords": [
        "insulation"
      ]
    },
    {
      "id": "measure-153",
      "name": "Double-pane windows",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Windows",
      "keywords": []
    },
    {
      "id": "measure-154",
      "name": "Triple-pane windows",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Windows",
      "keywords": []
    },
    {
      "id": "measure-155",
      "name": "Low-E film",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Windows",
      "keywords": []
    },
    {
      "id": "measure-156",
      "name": "Security tint film",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Windows",
      "keywords": []
    },
    {
      "id": "measure-157",
      "name": "Window replacement",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Windows",
      "keywords": [
        "replacement"
      ]
    },
    {
      "id": "measure-158",
      "name": "Skylights / solar tubes",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Windows",
      "keywords": [
        "solar"
      ]
    },
    {
      "id": "measure-159",
      "name": "Door sweeps",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Air Sealing",
      "keywords": []
    },
    {
      "id": "measure-160",
      "name": "Weather stripping",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Air Sealing",
      "keywords": []
    },
    {
      "id": "measure-161",
      "name": "Envelope leak sealing",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Air Sealing",
      "keywords": []
    },
    {
      "id": "measure-162",
      "name": "Vestibule addition",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Air Sealing",
      "keywords": []
    },
    {
      "id": "measure-163",
      "name": "Cool roof coating",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Roofing",
      "keywords": []
    },
    {
      "id": "measure-164",
      "name": "Reflective membranes",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Roofing",
      "keywords": []
    },
    {
      "id": "measure-165",
      "name": "Green roof",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Roofing",
      "keywords": []
    },
    {
      "id": "measure-166",
      "name": "EC evaporator fan motors",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Display / Case Refrigeration",
      "keywords": [
        "ec"
      ]
    },
    {
      "id": "measure-167",
      "name": "LED case lighting",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Display / Case Refrigeration",
      "keywords": [
        "led"
      ]
    },
    {
      "id": "measure-168",
      "name": "Anti-sweat heater controls",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Display / Case Refrigeration",
      "keywords": [
        "controls"
      ]
    },
    {
      "id": "measure-169",
      "name": "Night curtains",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Display / Case Refrigeration",
      "keywords": []
    },
    {
      "id": "measure-170",
      "name": "Door gasket upgrades",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Display / Case Refrigeration",
      "keywords": []
    },
    {
      "id": "measure-171",
      "name": "Floating head pressure controls",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Rack Systems",
      "keywords": [
        "controls"
      ]
    },
    {
      "id": "measure-172",
      "name": "Floating suction pressure",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Rack Systems",
      "keywords": []
    },
    {
      "id": "measure-173",
      "name": "VFD compressors",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Rack Systems",
      "keywords": [
        "vfd"
      ]
    },
    {
      "id": "measure-174",
      "name": "Heat reclaim",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Rack Systems",
      "keywords": []
    },
    {
      "id": "measure-175",
      "name": "Defrost optimization",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Rack Systems",
      "keywords": [
        "optimization"
      ]
    },
    {
      "id": "measure-176",
      "name": "Refrigeration controls upgrade",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Rack Systems",
      "keywords": [
        "refrigeration",
        "controls",
        "upgrade"
      ]
    },
    {
      "id": "measure-177",
      "name": "Strip curtains",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Walk-in Coolers / Freezers",
      "keywords": []
    },
    {
      "id": "measure-178",
      "name": "ECM fans",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Walk-in Coolers / Freezers",
      "keywords": [
        "ecm"
      ]
    },
    {
      "id": "measure-179",
      "name": "High-efficiency doors",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Walk-in Coolers / Freezers",
      "keywords": []
    },
    {
      "id": "measure-180",
      "name": "Insulation upgrades",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Walk-in Coolers / Freezers",
      "keywords": [
        "insulation"
      ]
    },
    {
      "id": "measure-181",
      "name": "Low-flow fixtures",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Walk-in Coolers / Freezers",
      "keywords": []
    },
    {
      "id": "measure-182",
      "name": "Auto-faucets",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Walk-in Coolers / Freezers",
      "keywords": []
    },
    {
      "id": "measure-183",
      "name": "Auto-flush valves",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Walk-in Coolers / Freezers",
      "keywords": []
    },
    {
      "id": "measure-184",
      "name": "HPWH systems",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Walk-in Coolers / Freezers",
      "keywords": [
        "hpwh"
      ]
    },
    {
      "id": "measure-185",
      "name": "Hot-water recirculation optimization",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Walk-in Coolers / Freezers",
      "keywords": [
        "optimization"
      ]
    },
    {
      "id": "measure-186",
      "name": "Steam-to-DHW conversion",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Walk-in Coolers / Freezers",
      "keywords": []
    },
    {
      "id": "measure-187",
      "name": "Irrigation controllers",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Walk-in Coolers / Freezers",
      "keywords": []
    },
    {
      "id": "measure-188",
      "name": "Leak detection systems",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Walk-in Coolers / Freezers",
      "keywords": []
    },
    {
      "id": "measure-189",
      "name": "Water-cooled to air-cooled conversions",
      "category": "ELECTRIFICATION MEASURES",
      "subcategory": "Walk-in Coolers / Freezers",
      "keywords": []
    },
    {
      "id": "measure-190",
      "name": "NEMA Premium motors",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Motors",
      "keywords": []
    },
    {
      "id": "measure-191",
      "name": "ECM motors",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Motors",
      "keywords": [
        "ecm"
      ]
    },
    {
      "id": "measure-192",
      "name": "Right-sizing motors",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Motors",
      "keywords": []
    },
    {
      "id": "measure-193",
      "name": "Soft starters",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Motors",
      "keywords": []
    },
    {
      "id": "measure-194",
      "name": "Motor VFDs",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Motors",
      "keywords": []
    },
    {
      "id": "measure-195",
      "name": "High-efficiency transformers",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Electrical Infrastructure",
      "keywords": []
    },
    {
      "id": "measure-196",
      "name": "Load balancing",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Electrical Infrastructure",
      "keywords": []
    },
    {
      "id": "measure-197",
      "name": "Power factor correction",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Electrical Infrastructure",
      "keywords": []
    },
    {
      "id": "measure-198",
      "name": "Harmonic filtering",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Electrical Infrastructure",
      "keywords": []
    },
    {
      "id": "measure-199",
      "name": "Smart panels",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Electrical Infrastructure",
      "keywords": []
    },
    {
      "id": "measure-200",
      "name": "Submetering",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Electrical Infrastructure",
      "keywords": []
    },
    {
      "id": "measure-201",
      "name": "Battery energy storage systems (BESS)",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Storage",
      "keywords": [
        "battery",
        "bess"
      ]
    },
    {
      "id": "measure-202",
      "name": "Peak shaving batteries",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Storage",
      "keywords": []
    },
    {
      "id": "measure-203",
      "name": "Load shifting batteries",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Storage",
      "keywords": []
    },
    {
      "id": "measure-204",
      "name": "Solar PV",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Renewables",
      "keywords": [
        "solar"
      ]
    },
    {
      "id": "measure-205",
      "name": "Solar thermal",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Renewables",
      "keywords": [
        "solar"
      ]
    },
    {
      "id": "measure-206",
      "name": "Microgrid controls",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Renewables",
      "keywords": [
        "controls"
      ]
    },
    {
      "id": "measure-207",
      "name": "Hybrid inverter systems",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Renewables",
      "keywords": []
    },
    {
      "id": "measure-208",
      "name": "Ice storage",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Thermal Storage",
      "keywords": []
    },
    {
      "id": "measure-209",
      "name": "Chilled water storage",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Thermal Storage",
      "keywords": []
    },
    {
      "id": "measure-210",
      "name": "PCM thermal storage",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Thermal Storage",
      "keywords": []
    },
    {
      "id": "measure-211",
      "name": "Leak detection",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Compressed Air",
      "keywords": []
    },
    {
      "id": "measure-212",
      "name": "Compressor replacement (VFD/two-stage)",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Compressed Air",
      "keywords": [
        "replacement"
      ]
    },
    {
      "id": "measure-213",
      "name": "Zero-loss drains",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Compressed Air",
      "keywords": []
    },
    {
      "id": "measure-214",
      "name": "Heat recovery",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Compressed Air",
      "keywords": []
    },
    {
      "id": "measure-215",
      "name": "Setpoint optimization",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Compressed Air",
      "keywords": [
        "optimization"
      ]
    },
    {
      "id": "measure-216",
      "name": "Oven upgrades",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Process Loads",
      "keywords": []
    },
    {
      "id": "measure-217",
      "name": "Process chiller optimization",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Process Loads",
      "keywords": [
        "chiller",
        "optimization"
      ]
    },
    {
      "id": "measure-218",
      "name": "Industrial refrigeration",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Process Loads",
      "keywords": [
        "refrigeration"
      ]
    },
    {
      "id": "measure-219",
      "name": "Pump VFDs",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Process Loads",
      "keywords": []
    },
    {
      "id": "measure-220",
      "name": "Industrial fans (ECM/VFD)",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Process Loads",
      "keywords": []
    },
    {
      "id": "measure-221",
      "name": "OR setback controls",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Process Loads",
      "keywords": [
        "controls"
      ]
    },
    {
      "id": "measure-222",
      "name": "OR ACH reduction",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Process Loads",
      "keywords": []
    },
    {
      "id": "measure-223",
      "name": "Lab VAV hood control",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Process Loads",
      "keywords": []
    },
    {
      "id": "measure-224",
      "name": "Lab exhaust VFDs",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Process Loads",
      "keywords": []
    },
    {
      "id": "measure-225",
      "name": "Isolation room pressurization",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Process Loads",
      "keywords": []
    },
    {
      "id": "measure-226",
      "name": "Heat recovery chillers for reheat loops",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Process Loads",
      "keywords": []
    },
    {
      "id": "measure-227",
      "name": "MRI chiller optimization",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Process Loads",
      "keywords": [
        "chiller",
        "optimization"
      ]
    },
    {
      "id": "measure-228",
      "name": "Sterilizer reclaim systems",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Process Loads",
      "keywords": []
    },
    {
      "id": "measure-229",
      "name": "Medical air/vacuum optimization",
      "category": "MOTORS & ELECTRICAL SYSTEMS",
      "subcategory": "Process Loads",
      "keywords": [
        "optimization"
      ]
    },
    {
      "id": "measure-230",
      "name": "Hot aisle containment",
      "category": "DATA CENTER MEASURES",
      "keywords": []
    },
    {
      "id": "measure-231",
      "name": "Cold aisle containment",
      "category": "DATA CENTER MEASURES",
      "keywords": []
    },
    {
      "id": "measure-232",
      "name": "CRAH/CRAC VFD retrofits",
      "category": "DATA CENTER MEASURES",
      "keywords": [
        "vfd"
      ]
    },
    {
      "id": "measure-233",
      "name": "Free cooling",
      "category": "DATA CENTER MEASURES",
      "keywords": []
    },
    {
      "id": "measure-234",
      "name": "Liquid cooling",
      "category": "DATA CENTER MEASURES",
      "keywords": []
    },
    {
      "id": "measure-235",
      "name": "IT Efficiency",
      "category": "DATA CENTER MEASURES",
      "keywords": [
        "efficiency"
      ]
    },
    {
      "id": "measure-236",
      "name": "Server virtualization",
      "category": "DATA CENTER MEASURES",
      "keywords": []
    },
    {
      "id": "measure-237",
      "name": "Server consolidation",
      "category": "DATA CENTER MEASURES",
      "keywords": []
    },
    {
      "id": "measure-238",
      "name": "High-efficiency UPS",
      "category": "DATA CENTER MEASURES",
      "keywords": []
    },
    {
      "id": "measure-239",
      "name": "Smart plugs",
      "category": "PLUG LOAD",
      "keywords": []
    },
    {
      "id": "measure-240",
      "name": "PC power management",
      "category": "PLUG LOAD",
      "keywords": []
    },
    {
      "id": "measure-241",
      "name": "Vending machine controllers",
      "category": "PLUG LOAD",
      "keywords": []
    },
    {
      "id": "measure-242",
      "name": "Lab freezer replacements",
      "category": "PLUG LOAD",
      "keywords": []
    },
    {
      "id": "measure-243",
      "name": "Appliance replacement",
      "category": "PLUG LOAD",
      "keywords": [
        "replacement"
      ]
    },
    {
      "id": "measure-244",
      "name": "Copier/printer consolidation",
      "category": "PLUG LOAD",
      "keywords": []
    }
  ]
};

/**
 * Get all measures for a specific category
 */
export function getMeasuresByCategory(categoryName: string): EEMeasure[] {
  return masterEEDatabase.allMeasures.filter(m => 
    m.category?.toLowerCase() === categoryName.toLowerCase()
  );
}

/**
 * Get all measures for a specific subcategory
 */
export function getMeasuresBySubcategory(subcategoryName: string): EEMeasure[] {
  return masterEEDatabase.allMeasures.filter(m => 
    m.subcategory?.toLowerCase() === subcategoryName.toLowerCase()
  );
}

/**
 * Search measures by keyword
 */
export function searchMeasures(query: string): EEMeasure[] {
  const lowerQuery = query.toLowerCase();
  return masterEEDatabase.allMeasures.filter(m => 
    m.name.toLowerCase().includes(lowerQuery) ||
    m.keywords.some(k => k.toLowerCase().includes(lowerQuery)) ||
    m.category?.toLowerCase().includes(lowerQuery) ||
    m.subcategory?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get category by ID
 */
export function getCategoryById(id: string): EECategory | undefined {
  return masterEEDatabase.categories.find(c => c.id === id);
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  return Array.from(new Set(
    masterEEDatabase.allMeasures
      .map(m => m.category)
      .filter((c): c is string => !!c)
  ));
}

/**
 * Get all unique subcategories
 */
export function getAllSubcategories(): string[] {
  return Array.from(new Set(
    masterEEDatabase.allMeasures
      .map(m => m.subcategory)
      .filter((s): s is string => !!s)
  ));
}
