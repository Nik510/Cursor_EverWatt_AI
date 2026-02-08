/**
 * Boiler Training Content
 * Comprehensive training material for commercial boilers
 */

import type React from 'react';
import type { TechPageData } from './lighting-content';

export const boilerContent: TechPageData = {
  title: "Commercial Boilers",
  subtitle: "Heating efficiency and electrification opportunities. Know your steam from your hot water.",
  introduction: {
    whatItIs: "A commercial boiler is a heating system that generates hot water or steam by burning fuel (natural gas, oil, or sometimes electricity) and transferring that heat to water. Hot water boilers circulate heated water through pipes to radiators, air handlers, or other heat emitters throughout a building. Steam boilers create pressurized steam that flows through pipes, condenses in heat exchangers, and returns as condensate. Boilers are the primary heating source for most commercial buildings in cold and moderate climates, and they're also critical for process heating in manufacturing, hospitals (sterilization), and other facilities.",
    whereItIsSeen: [
      "Office buildings and commercial facilities",
      "Hospitals and healthcare facilities (steam for sterilization, hot water for heating)",
      "Schools and universities",
      "Manufacturing and industrial facilities",
      "Hotels and hospitality",
      "Large residential buildings (apartments, condominiums)",
      "Any building in climates requiring space heating"
    ],
    typicalLocations: [
      "Mechanical rooms (basement or ground floor, often separate from cooling equipment)",
      "Boiler rooms (marked 'Boiler Room' or 'Heating Plant')",
      "Adjacent to fuel storage (gas lines, oil tanks)",
      "Steam systems have visible steam traps, condensate return pumps, and pressure relief valves",
      "Hot water systems have circulating pumps and expansion tanks",
      "Often multiple boilers for redundancy (primary + backup)"
    ],
    keyConcepts: [
      "AFUE (Annual Fuel Utilization Efficiency): Percentage of fuel energy converted to useful heat. Non-condensing: 80-85% AFUE. Condensing: 90-98% AFUE. This is THE efficiency metric that matters.",
      "Condensing Technology: Captures latent heat from water vapor in exhaust gases by cooling flue below dew point (~140°F). This is how modern boilers achieve 95%+ efficiency vs 82% for old boilers.",
      "Return Water Temperature: Critical for condensing operation. Must be < 140°F for condensing to occur. If return water is 160°F, even a condensing boiler won't condense - it operates as non-condensing.",
      "Stack Temperature: Temperature of exhaust gases leaving boiler. Non-condensing: 350°F+ (hot, wasting energy). Condensing: < 140°F (cool, heat captured). Check with IR thermometer - easy diagnosis.",
      "Hot Water vs Steam: Hot water systems are more efficient (less distribution losses). Steam systems have 15-20% distribution losses (steam traps, condensation) but provide high temperatures needed for some processes.",
      "Electrification Opportunity: Heat pump chillers can provide both heating and cooling, replacing gas boilers. California utilities offer significant rebates for electrification."
    ],
    whyItMatters: "Boilers are major energy consumers, especially in cold climates where heating dominates energy use. A typical 500 MBH (500,000 BTU/hr) boiler operating 3,000 hours per year at 82% AFUE consumes about $60,000 worth of natural gas annually. Upgrading to a 95% AFUE condensing boiler saves 13% of that energy - about $8,000 per year. Plus, steam systems have additional inefficiencies (trap losses, distribution losses) that can waste another 15-20% of energy. The bigger opportunity: electrification. Replacing gas boilers with heat pump chillers eliminates gas consumption entirely, qualifies for utility rebates, and provides both heating AND cooling from one system. This is the future of commercial heating.",
    commonApplications: [
      "Space heating for commercial buildings (offices, schools, hospitals)",
      "Process heating for manufacturing (steam at specific temperatures/pressures)",
      "Sterilization and humidification (hospitals - steam systems)",
      "Domestic hot water generation (combined systems)",
      "Heat recovery from other processes",
      "District heating systems (central plant serving multiple buildings)"
    ]
  },
  chiefEngineerQuote: "Boilers are either condensing or non-condensing - and the difference is massive. A condensing boiler captures latent heat from flue gases, achieving 95%+ efficiency. A non-condensing boiler throws away 20% of your energy as exhaust heat. But here's the real play: electrification. Replacing a gas boiler with a heat pump chiller that can heat AND cool? That's the future. PG&E is pushing hard for this - the rebates are there.",
  
  compressorTypes: [
    { 
      name: "Steam Boiler", 
      desc: "High-pressure steam generation", 
      range: "75-85% AFUE", 
      application: "Hospitals, large facilities, legacy systems", 
      color: "slate" 
    },
    { 
      name: "Hot Water (Non-Condensing)", 
      desc: "Standard efficiency hot water boiler", 
      range: "80-85% AFUE", 
      application: "Older installations, return water > 140°F", 
      color: "purple" 
    },
    { 
      name: "Condensing Boiler", 
      desc: "High-efficiency condensing technology", 
      range: "90-98% AFUE", 
      application: "Modern installations, low return temps", 
      color: "emerald" 
    },
    { 
      name: "Heat Pump Chiller", 
      desc: "Reversible heat pump (heat + cool)", 
      range: "COP 4.0-5.5", 
      application: "Electrification, modern plants", 
      color: "blue" 
    },
  ],

  compressorComparison: [
    {
      name: "Non-Condensing Hot Water Boiler",
      desc: "Standard efficiency boiler, 15-25 years old",
      pros: [
        "Reliable operation",
        "Handles high return water temps",
        "Simple maintenance",
      ],
      cons: [
        "Low efficiency (80-85% AFUE)",
        "High flue gas temperature",
        "Energy waste in exhaust",
        "Gas consumption",
        "Emissions (CO₂, NOx)",
      ],
      bestFor: "Replacement target - upgrade to condensing or electrify",
      visualId: "Cast iron or steel, visible flue stack, return water temp > 140°F",
    },
    {
      name: "Condensing Boiler",
      desc: "High-efficiency condensing boiler",
      pros: [
        "High efficiency (90-98% AFUE)",
        "Captures latent heat from flue",
        "Lower emissions",
        "Modulating burner",
        "Compact design",
      ],
      cons: [
        "Requires low return water temps (< 140°F)",
        "Condensate drain needed",
        "Higher initial cost",
      ],
      bestFor: "New installations, replacements, efficiency upgrades",
      visualId: "Modern design, plastic condensate drain, modulating burner, high efficiency rating",
    },
    {
      name: "Steam Boiler",
      desc: "High-pressure steam generation system",
      pros: [
        "High temperature capability",
        "Good for sterilization",
        "Established technology",
      ],
      cons: [
        "Low efficiency (75-85%)",
        "High maintenance (steam traps, blowdown)",
        "Safety concerns (pressure)",
        "Energy losses in distribution",
        "Electrification opportunity",
      ],
      bestFor: "Target for steam-to-hot-water conversion or electrification",
      visualId: "Large pressure vessel, steam pressure gauge, distribution piping, blowdown system",
    },
  ],

  schematicTitle: "Boiler Efficiency: Condensing vs Non-Condensing",
  
  cycleSteps: [
    { 
      step: 1, 
      title: "Fuel Input", 
      text: "Gas or oil fuel enters burner. Energy content: 100% input." 
    },
    { 
      step: 2, 
      title: "Combustion", 
      text: "Fuel burns, producing heat. Also creates hot exhaust gases (CO₂, H₂O vapor)." 
    },
    { 
      step: 3, 
      title: "Heat Transfer", 
      text: "Heat transfers to water. Non-condensing: 80% efficient. Condensing: 95%+ by capturing latent heat." 
    },
    { 
      step: 4, 
      title: "Exhaust Loss", 
      text: "Non-condensing: 15-20% lost as hot exhaust. Condensing: < 5% loss, captures water vapor heat." 
    },
  ],
  
  tooltipData: {
    burner: { 
      title: "BURNER", 
      desc: "Combusts fuel. Modulating burners adjust output based on demand.", 
      stats: "Efficiency: 95-98% combustion", 
      style: { top: '20px', left: '20px', borderColor: '#ef4444' } 
    },
    heatExchanger: { 
      title: "HEAT EXCHANGER", 
      desc: "Transfers heat from combustion to water. Condensing type captures flue gas latent heat.", 
      stats: "Non-condensing: 80-85% | Condensing: 90-98%", 
      style: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', borderColor: '#3b82f6' } 
    },
    flue: { 
      title: "FLUE/EXHAUST", 
      desc: "Exhaust gases exit. Non-condensing: Hot (350°F+). Condensing: Cool (100°F), latent heat captured.", 
      stats: "Heat loss: 15-20% (non-condensing) | < 5% (condensing)", 
      style: { top: '20px', right: '20px', borderColor: '#fbbf24' } 
    },
    returnWater: { 
      title: "RETURN WATER TEMP", 
      desc: "Critical for condensing efficiency. Must be < 140°F for condensing to work.", 
      stats: "Optimal: < 130°F for maximum efficiency", 
      style: { bottom: '20px', left: '20px', borderColor: '#60a5fa' } 
    },
  },
  
  realWorldImage: {
    src: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=80&w=1000&auto=format&fit=crop",
    alt: "Commercial Boiler System",
    caption: "Fig 1. High-efficiency condensing boiler with modulating burner and advanced controls."
  },
  
  vocabulary: [
    { 
      term: "AFUE (Annual Fuel Utilization Efficiency)", 
      definition: "Percentage of fuel energy converted to useful heat over a year.", 
      salesHook: "Old boiler: 80% AFUE wastes 20% of your gas bill. Condensing boiler: 95% AFUE saves $5k-10k/year on a typical installation." 
    },
    { 
      term: "Condensing", 
      definition: "Captures latent heat from water vapor in exhaust gases by cooling below dew point.", 
      salesHook: "This is why condensing boilers are 15-20% more efficient. The 'secret sauce' is the heat exchanger design that cools exhaust below 140°F." 
    },
    { 
      term: "Return Water Temperature", 
      definition: "Temperature of water returning from heating system.", 
      salesHook: "Critical for condensing efficiency. If return water is > 140°F, you lose condensing benefit. Reset strategies optimize this." 
    },
    { 
      term: "Hot Water Reset", 
      definition: "Varies supply water temperature based on outdoor temperature.", 
      salesHook: "Reduces return water temp, enables condensing, saves 10-15% energy. Simple control upgrade." 
    },
    { 
      term: "Modulating Burner", 
      definition: "Variable output burner that adjusts firing rate to match load.", 
      salesHook: "Old on/off burners cycle constantly, wasting energy. Modulating burners match load precisely, saving 5-10%." 
    },
  ],
  
  retrofitStrategy: {
    title: "Boiler Optimization & Electrification",
    oldWay: { 
      title: "The Legacy Approach", 
      desc: "Fixed operation, reactive maintenance, gas-fired.", 
      items: [
        "Fixed hot water setpoint",
        "On/off burner cycling",
        "No optimization",
        "Gas-fired (emissions)",
        "Steam systems (high losses)",
      ] 
    },
    newWay: { 
      title: "The Modern Approach", 
      desc: "Optimized controls, condensing efficiency, or electrification.", 
      items: [
        "Hot water reset controls",
        "Modulating burners",
        "Condensing boiler technology",
        "Heat pump chillers (electrification)",
        "Steam-to-hot-water conversion",
      ] 
    },
    utilityBenefit: { 
      title: "Electrification Incentives", 
      desc: "PG&E and utilities are pushing hard for electrification. Replacing gas boilers with heat pumps qualifies for significant rebates and reduces carbon footprint." 
    },
  },
  
  identificationGuide: [
    { feature: "Type", standard: "Non-Condensing (80-85% AFUE)", highEff: "Condensing (90-98% AFUE)" },
    { feature: "Flue Temp", standard: "350°F+ (hot exhaust)", highEff: "< 140°F (cool exhaust)" },
    { feature: "Return Water", standard: "> 140°F", highEff: "< 130°F" },
    { feature: "Burner", standard: "On/Off cycling", highEff: "Modulating variable output" },
    { feature: "Controls", standard: "Basic setpoint", highEff: "Reset strategies, optimization" },
  ],

  bestPractices: {
    title: "Boiler Best Practices & Optimization Strategies",
    sections: [
      {
        heading: "Optimization vs Replacement Decision",
        content: "Boiler optimization often provides 50-70% of replacement benefits at 10-20% of the cost. Always optimize first - implement reset strategies, verify return water temps, and check if condensing can be enabled before considering replacement.",
        items: [
          "Implement hot water reset strategy (reduces return water temp, enables condensing, saves 10-15%, zero/low cost)",
          "Verify return water temperature - if < 140°F, non-condensing boiler might benefit from optimization",
          "Check burner operation - modulating vs on/off (on/off wastes 5-10%)",
          "Evaluate boiler age - <20 years: optimize; >25 years with poor efficiency: consider replacement",
          "Steam systems: Consider steam-to-hot-water conversion (20-30% savings, better than boiler replacement alone)"
        ]
      },
      {
        heading: "Hot Water Reset Strategy",
        content: "The most impactful boiler optimization is implementing outdoor reset - varying supply water temperature based on outdoor temperature. This lowers return water temperature, enabling condensing operation and reducing distribution losses.",
        items: [
          "Install outdoor temperature sensor (if not present)",
          "Program reset schedule: 70°F outdoor = 120°F supply, 0°F outdoor = 180°F supply",
          "Monitor return water temperature - should drop to < 140°F on warmer days",
          "Verify condensing is actually occurring (check stack temperature - should be < 140°F)",
          "Low cost upgrade - often just control programming, may need sensor"
        ]
      },
      {
        heading: "Return Water Temperature Optimization",
        content: "Critical for condensing operation. If return water is > 140°F, condensing boilers won't condense. Must optimize system to lower return water temperature.",
        items: [
          "Measure return water temperature first (must be < 140°F for condensing)",
          "Implement hot water reset to lower supply temp (which lowers return temp)",
          "Check for bypass flows or short-circuiting (increases return temp)",
          "Balance system - unbalanced systems have higher return temps",
          "Consider variable flow - higher flow rates reduce temperature rise"
        ]
      },
      {
        heading: "Steam System Optimization",
        content: "Steam systems are the biggest opportunity. Converting steam to hot water saves 20-30% energy by eliminating steam trap losses and distribution losses, plus enables condensing operation.",
        items: [
          "Evaluate steam trap losses (5-10% of boiler output lost through failed traps)",
          "Assess distribution losses (steam systems lose 15-20% in piping)",
          "Check if all loads actually need steam (most are just space heating - don't need steam)",
          "Consider split system: Hot water for comfort (condensing boiler), steam for process only",
          "Steam-to-hot-water conversion often better ROI than boiler replacement alone"
        ]
      }
    ]
  },

  roiAndLowHangingFruit: {
    typicalROI: [
      {
        project: "Hot Water Reset Implementation",
        payback: "< 1 year (often zero cost)",
        annualSavings: "$8k-15k per boiler",
        notes: "500 MBH boiler, $60k/year gas bill. Reset lowers return water temp, enables condensing, saves 13-15% energy. Often just control programming."
      },
      {
        project: "Non-Condensing → Condensing Boiler",
        payback: "4-6 years",
        annualSavings: "$8k-12k per boiler",
        notes: "500 MBH boiler: 82% → 95% AFUE saves 13% of gas bill. $50k installed cost. Only if return water < 140°F."
      },
      {
        project: "Steam-to-Hot-Water Conversion",
        payback: "5-8 years",
        annualSavings: "$25k-50k per system",
        notes: "Eliminates steam trap losses (5-10%) and distribution losses (15-20%). Total 20-30% savings. Enables condensing operation. Bigger project but huge savings."
      },
      {
        project: "Gas Boiler → Heat Pump Chiller (Electrification)",
        payback: "3-8 years (with rebates)",
        annualSavings: "$20k-50k per system",
        notes: "Replaces gas boiler with heat pump that heats AND cools. Qualifies for PG&E rebates ($500/ton). Net cost often similar to boiler replacement after rebates."
      },
      {
        project: "On/Off → Modulating Burner",
        payback: "2-4 years",
        annualSavings: "$3k-8k per boiler",
        notes: "Modulating burners match load, reducing cycling losses. 5-10% efficiency improvement. Often part of boiler replacement or upgrade."
      }
    ],
    lowHangingFruit: [
      {
        opportunity: "Implement Hot Water Reset",
        effort: "Low",
        savings: "10-15% energy reduction",
        payback: "< 1 year (often free)",
        description: "Vary supply temperature based on outdoor temp. Lowers return water temp, enables condensing on condensing boilers. Often just programming existing controls."
      },
      {
        opportunity: "Verify Return Water Temperature",
        effort: "Low",
        savings: "Identifies optimization opportunity",
        payback: "Immediate",
        notes: "If return water > 140°F, condensing boiler won't condense. This check identifies if reset strategy is needed."
      },
      {
        opportunity: "Check Stack Temperature",
        effort: "Low",
        savings: "Identifies efficiency issues",
        payback: "Immediate",
        description: "IR thermometer check. > 300°F = non-condensing or not condensing. < 140°F = condensing properly. Easy diagnosis tool."
      },
      {
        opportunity: "Steam Trap Maintenance/Replacement",
        effort: "Medium",
        savings: "5-10% of boiler output",
        payback: "1-3 years",
        description: "Failed steam traps waste 5-10% of boiler output. Maintenance program or replacement. Consider if many traps are failed, steam-to-hot-water conversion might be better."
      },
      {
        opportunity: "System Balancing",
        effort: "Low",
        savings: "5-10% efficiency improvement",
        payback: "Immediate",
        description: "Unbalanced systems have higher return water temps (prevents condensing) and distribution losses. Balancing improves efficiency."
      },
      {
        opportunity: "Convert Steam to Hot Water (Partial)",
        effort: "High",
        savings: "20-30% on converted loads",
        payback: "5-8 years",
        description: "Split system: Hot water for comfort (condensing boiler), steam for process only. Most buildings only need steam for small process loads. Big savings opportunity."
      }
    ]
  },

  optimizationVsReplacement: {
    optimizationOpportunities: [
      "Hot water reset implementation (10-15% savings, often zero cost)",
      "Return water temperature optimization (enables condensing, saves 13-15%)",
      "System balancing (5-10% improvement, low cost)",
      "Steam trap maintenance or steam-to-hot-water conversion (5-30% savings)",
      "Verify and maintain proper operation (5-10% efficiency recovery)",
      "Modulating burner upgrade (5-10% improvement if currently on/off)"
    ],
    whenToReplace: [
      "Boiler is >25 years old with poor efficiency (82% AFUE or less)",
      "Return water temp consistently > 140°F and can't be optimized (condensing won't work)",
      "Multiple major failures (heat exchanger, burner, controls - indicates end of life)",
      "Steam system with extensive trap/distribution losses (conversion may be better than replacement)",
      "Electrification goals require eliminating gas (heat pump chiller replacement)",
      "Building load has changed significantly (undersized or oversized boiler)"
    ],
    optimizationBenefits: "Much lower cost (10-20% of replacement cost), faster implementation (often weeks vs months), maintains existing infrastructure, extends boiler life. Most boilers can improve 10-20% efficiency through optimization. Best for boilers <20 years old or when return water can be optimized to < 140°F.",
    replacementBenefits: "Maximum efficiency (95%+ AFUE condensing vs 82% non-condensing), eliminates ongoing maintenance issues, new warranty, modern controls, enables electrification. Better long-term value for very old (>25 years) or severely degraded boilers. However, optimization should be exhausted first, and electrification may provide better value than gas boiler replacement."
  }
};

// Enhanced boiler content with dual perspectives
export const enhancedBoilerData = {
  engineerPerspective: {
    title: "Engineer-Grade Technical Deep Dive",
    sections: [
      {
        section: "AFUE Calculation & Stack Loss Analysis",
        technicalExplanation: `**AFUE (Annual Fuel Utilization Efficiency)** represents the percentage of fuel energy converted to useful heat over an entire heating season, accounting for part-load operation, cycling losses, and standby losses.

**Fundamental Formula:**
AFUE = (Useful Heat Output / Fuel Energy Input) × 100%

**Stack Loss Calculation:**
Stack Loss (%) = [(T_Stack - T_Ambient) / (T_Stack - T_Ambient + 1,100)] × Excess Air Factor × 100

Where:
- T_Stack = Flue gas temperature leaving boiler (°F)
- T_Ambient = Combustion air temperature (°F)
- 1,100 = Constant representing heat of combustion
- Excess Air Factor = Typically 1.15-1.25 (15-25% excess air)

**Typical Efficiencies:**
- Non-Condensing (Hot Flue): 80-85% AFUE (15-20% stack loss)
- Condensing (Cool Flue): 90-98% AFUE (2-5% stack loss)
- Steam Boilers: 75-85% AFUE (higher losses due to distribution)

**Latent Heat Recovery:**
Condensing boilers recover latent heat from water vapor in flue gases:
Q_Latent = m_H2O × h_fg
Where h_fg ≈ 970 BTU/lb (latent heat of vaporization)

This represents ~10% of fuel energy that non-condensing boilers waste.`,
        formulas: [
          {
            name: "AFUE",
            formula: "AFUE = (Useful Heat Output / Fuel Energy Input) × 100%",
            explanation: "Annual efficiency accounting for all operating modes, cycling, and standby losses."
          },
          {
            name: "Stack Loss",
            formula: "Stack Loss (%) ≈ [(T_Stack - T_Ambient) / (T_Stack + 460)] × 0.5",
            explanation: "Approximate stack loss from hot exhaust gases. Lower stack temp = less loss."
          },
          {
            name: "Latent Heat Recovery",
            formula: "Q_Latent = m_H2O × 970 BTU/lb",
            explanation: "Heat recovered from condensing water vapor in flue gases. This is the 'condensing advantage'."
          },
          {
            name: "Fuel Savings from Efficiency",
            formula: "Fuel Savings = Current Fuel × (1 - AFUE_old/AFUE_new)",
            explanation: "Fuel consumption reduction from efficiency upgrade (e.g., 85% to 95% AFUE = 10.5% fuel savings)."
          }
        ],
        references: [
          "ASHRAE Handbook - HVAC Systems and Equipment",
          "AHRI Standard 1500 - Performance Rating of Commercial Space Heating Boilers",
          "DOE Building Energy Codes Program - Boiler Efficiency Standards",
          "Energy Star - Commercial Boiler Specifications"
        ]
      },
      {
        section: "Condensing Technology & Return Water Temperature",
        technicalExplanation: `**Condensing Principle:**
Condensing boilers recover latent heat by cooling flue gases below the dew point (typically 140°F for natural gas). When water vapor in exhaust condenses, it releases ~970 BTU/lb of latent heat.

**Dew Point Temperature:**
For natural gas: T_DewPoint ≈ 140°F (varies with fuel composition and excess air)

**Critical Relationship:**
For condensing to occur, return water temperature must be below the flue gas dew point:
T_ReturnWater < T_FlueGas_DewPoint

**Optimal Operating Conditions:**
- Maximum condensing: Return water < 130°F
- Partial condensing: Return water 130-140°F
- No condensing: Return water > 140°F (operates like non-condensing boiler)

**Heat Exchanger Design:**
Condensing boilers use:
- Stainless steel or aluminum heat exchangers (corrosion resistant to condensate)
- Extended surface area or secondary heat exchangers
- Larger heat transfer surface to maximize flue gas cooling

**Return Water Reset Strategy:**
To maximize condensing efficiency:
- Implement outdoor reset: Lower supply temp on warmer days
- Use variable flow: Higher flow rates allow lower return temps
- Optimize distribution: Reduce bypass flows and short-circuiting`,
        formulas: [
          {
            name: "Dew Point (Natural Gas)",
            formula: "T_DewPoint ≈ 140°F (at typical excess air)",
            explanation: "Temperature below which water vapor in flue gas condenses, releasing latent heat."
          },
          {
            name: "Condensing Efficiency",
            formula: "η_Condensing = η_Non-Condensing + Latent_Heat_Recovery",
            explanation: "Condensing efficiency adds ~10-15% from latent heat recovery to base efficiency."
          },
          {
            name: "Return Water Impact",
            formula: "If T_Return > T_DewPoint: No condensing benefit",
            explanation: "Return water temperature determines whether condensing occurs. Critical parameter."
          }
        ]
      },
      {
        section: "Hot Water Reset & System Optimization",
        technicalExplanation: `**Outdoor Reset Strategy:**
Supply water temperature is varied based on outdoor temperature to optimize system efficiency:
T_Supply = T_Max - [(T_Max - T_Min) × (T_Outdoor - T_Outdoor_Min) / (T_Outdoor_Max - T_Outdoor_Min)]

Typical reset schedule:
- T_Outdoor = 70°F: T_Supply = 120°F (minimum)
- T_Outdoor = 0°F: T_Supply = 180°F (maximum)

**Benefits:**
1. Lower return water temperature (enables condensing)
2. Reduced distribution losses
3. Improved comfort control
4. Reduced energy consumption (10-15% typical)

**Implementation:**
- Use outdoor temperature sensor
- Program reset schedule in BMS/controls
- Monitor return water temperature to verify condensing operation
- Adjust reset curve based on building characteristics

**Steam-to-Hot-Water Conversion:**
Converting steam systems to hot water:
- Eliminates steam trap losses (5-10% of boiler output)
- Reduces distribution losses (steam systems lose 15-20% in piping)
- Enables condensing operation (steam can't be condensed in boiler)
- Total efficiency improvement: 20-30%`,
        formulas: [
          {
            name: "Outdoor Reset",
            formula: "T_Supply = T_Max - [Slope × (T_Outdoor - T_Outdoor_Min)]",
            explanation: "Linear reset schedule. Lower outdoor temp = higher supply temp."
          },
          {
            name: "Energy Savings from Reset",
            formula: "Savings ≈ 1-2% per 1°F reduction in average supply temp",
            explanation: "Lower supply temperatures reduce losses and enable condensing."
          }
        ]
      }
    ]
  },
  salesPerspective: {
    title: "Sales & Audit Intelligence: Making You Look Smart",
    sections: [
      {
        section: "The Condensing Boiler Sales Pitch",
        salesPitch: `**The Hook:**
"Your boiler is throwing away 15-20% of your gas bill as hot exhaust. That's $8,000-12,000 per year going up the stack. A condensing boiler captures that heat and gets you to 95% efficiency. Plus, if you qualify for electrification rebates, we might be able to replace it with a heat pump that does heating AND cooling."

**The Script:**
1. "Let me check your stack temperature..." [Use infrared thermometer - shows expertise]
2. "I'm seeing 350°F exhaust. That's losing about 18% of your fuel energy."
3. "Here's what most facilities don't know: A condensing boiler can get that exhaust down to 100°F and capture that lost heat."
4. "That's the difference between 82% efficiency and 95% efficiency. On your gas bill, that's $10,000-15,000 per year savings."
5. "But here's the catch - you need return water under 140°F for it to work. Let's check your system..."
6. "I see your return water is 160°F. We can fix that with a reset strategy - optimize your supply temperature based on outdoor conditions. That alone saves 10-15%."
7. "Want to see the numbers? I can show you exactly what this saves and how the payback works."

**The Electrification Upsell:**
"If you're thinking long-term, there's another option: heat pump chillers that can heat AND cool. PG&E has rebates up to $500/ton. With your cooling needs, you might be able to replace both your chiller AND boiler with one system. Want me to run those numbers?"

**The Close:**
"We've got three options: 1) Optimize your existing boiler (fast payback, low cost), 2) Replace with condensing boiler (good efficiency, gas-fired), 3) Electrify with heat pump (future-proof, utility rebates). Which direction are you leaning?"`,
        tradeSecrets: [
          "The #1 missed opportunity: Return water temperature optimization. If return water is > 140°F, even a condensing boiler won't condense. Reset strategy is essential.",
          "Always check stack temperature first. If you see > 300°F exhaust, that's a non-condensing boiler wasting 15-20% of fuel. Easy diagnosis with IR thermometer.",
          "Steam systems are the biggest opportunity. Converting steam to hot water saves 20-30% energy (eliminates trap losses, distribution losses, enables condensing).",
          "The electrification angle is getting stronger. PG&E rebates for heat pump chillers can make electrification cheaper than boiler replacement. Check current rebate programs.",
          "Don't just look at AFUE ratings. Check if condensing is actually happening. If return water is too hot, a '95% AFUE' boiler might only be operating at 85%.",
          "Modulating burners matter more than people think. On/off burners waste energy cycling. Modulating saves 5-10% and improves comfort.",
          "The hidden cost: Steam trap maintenance. If they have steam, ask about trap maintenance costs. Steam-to-hot-water conversion eliminates this entirely."
        ],
        commonObjections: [
          {
            objection: "Our return water is too hot - condensing won't work",
            response: "That's exactly what we fix first. We implement a hot water reset strategy - lower your supply temperature on warmer days, which lowers your return temperature. Most systems can get return water down to 130°F easily. Then the condensing boiler works perfectly. We do this optimization first, then upgrade the boiler. Two wins."
          },
          {
            objection: "We need steam for sterilization/process",
            response: "Got it. Some loads definitely need steam. But here's what we see - 80% of your load is probably space heating, which doesn't need steam. We can split the system - hot water for comfort (with condensing boiler), steam for process loads only. You still get most of the savings. Let's map out your loads."
          },
          {
            objection: "Heat pumps don't work in cold climates",
            response: "That used to be true, but modern heat pumps work down to -10°F. Plus, in California, we rarely see those temperatures. But here's the real advantage - heat pump chillers can heat AND cool. So you're replacing two systems (boiler + chiller) with one. The economics are compelling, especially with utility rebates."
          },
          {
            objection: "We just replaced our boiler 5 years ago",
            response: "I understand - no one wants to replace equipment that's only 5 years old. But here's the thing - if it's a non-condensing boiler, you're throwing away $10k+ per year. Over 15 years, that's $150k. A condensing boiler might pay back in 3-4 years. The math still works. Plus, we can often find a buyer for the existing boiler (hospitals, facilities that need backup)."
          },
          {
            objection: "Electricity is more expensive than gas",
            response: "You're right about the rate, but here's the math: Gas is 80-85% efficient, electricity in a heat pump is 400-500% efficient (COP 4-5). So even if electricity costs 3x gas per unit, the heat pump uses 4x less energy. Plus, you're getting cooling too, and there are rebates. Let me show you the actual numbers for your facility."
          }
        ],
        realWorldExamples: [
          {
            scenario: "500 MBH non-condensing boiler, $60k/year gas bill, return water 160°F",
            solution: "Implemented hot water reset (lowered return to 130°F), replaced with condensing boiler",
            savings: "$12,000/year (20% reduction from 82% to 95% AFUE), payback: 4 years"
          },
          {
            scenario: "Hospital steam system, 2,000 MBH, high maintenance costs",
            solution: "Converted steam to hot water, installed condensing boilers, eliminated steam traps",
            savings: "$85,000/year (25% reduction), $30k/year maintenance savings (traps eliminated)"
          },
          {
            scenario: "Office building, separate boiler (heating) and chiller (cooling)",
            solution: "Replaced both with heat pump chiller, qualified for PG&E electrification rebates",
            savings: "$45,000/year, $150k rebate from utility, net cost: $50k (vs $200k for separate systems)"
          },
          {
            scenario: "Manufacturing facility, process needs steam but 70% load is space heating",
            solution: "Split system: Hot water loop for comfort (condensing boiler), steam for process only",
            savings: "$28,000/year (20% on comfort load), maintained process requirements"
          }
        ]
      },
      {
        section: "Making Technical Talk Work for Boilers",
        salesPitch: `**When They Ask "What's AFUE?"**
"It's the efficiency rating - what percentage of your gas actually becomes heat. Your current boiler is probably 82% AFUE, which means 18% of your gas bill goes up the stack as hot exhaust. A condensing boiler gets you to 95% AFUE - that's 13% more of your gas becoming heat instead of waste."

**When They Ask "What's Condensing?"**
"Natural gas creates water vapor when it burns. That water vapor has heat energy in it - about 10% of your total fuel energy. Non-condensing boilers let that heat escape up the stack. Condensing boilers cool the exhaust enough that the water vapor turns back to liquid, and when it does, it releases that heat. That's why they're 15-20% more efficient."

**When They Ask "Why Does Return Water Temperature Matter?"**
"For condensing to work, the return water has to be cool enough - under 140°F. If your return water is 160°F, even a condensing boiler won't condense. It'll run like a regular boiler. That's why we optimize your system first - lower the supply temperature, which lowers the return temperature, then the condensing boiler works as designed."

**The Power Move:**
Always measure stack temperature with an IR thermometer. When they see 350°F on the exhaust, point to it and say "That's $10,000 per year going up the stack. A condensing boiler gets that down to 100°F and captures that heat."`,
        tradeSecrets: [
          "Never say 'AFUE' without explaining it. Say 'efficiency rating' first, then define AFUE.",
          "Always convert efficiency to dollars. '13% more efficient' means nothing. '$12,000 per year savings' means everything.",
          "Use visual tools. IR thermometer to check stack temp. Simple temperature readings make you look like an expert.",
          "The electrification angle is your secret weapon. Most people don't know about heat pump chillers that can heat AND cool. This is cutting-edge.",
          "Steam systems are gold mines. If they have steam, the savings opportunity is huge (20-30%). Always explore steam-to-hot-water conversion.",
          "Ask about their maintenance costs. Steam trap maintenance can be $20k-50k per year. Conversion eliminates this entirely.",
          "The return water temperature check is your credibility builder. Ask 'What's your return water temperature?' If they don't know, you're the expert."
        ],
        commonObjections: [],
        realWorldExamples: []
      }
    ]
  },
  deepDive: [
    {
      concept: "AFUE (Annual Fuel Utilization Efficiency) - The Real Efficiency Metric",
      engineerExplanation: `**Technical Definition:**
AFUE accounts for:
- Combustion efficiency (typically 95-98% - fuel to heat conversion)
- Heat transfer efficiency (heat exchanger effectiveness)
- Stack losses (heat lost in exhaust gases)
- Standby losses (heat lost when boiler is off)
- Cycling losses (efficiency penalty from start/stop cycles)
- Part-load efficiency (efficiency at partial firing rates)

**Calculation Method:**
AFUE is measured over an entire heating season using standardized test procedures (AHRI 1500). It's more realistic than combustion efficiency alone.

**Typical Values:**
- Non-Condensing Hot Water: 80-85% AFUE
- Condensing Hot Water: 90-98% AFUE
- Steam Boilers: 75-85% AFUE (additional distribution losses)
- Modulating vs On/Off: 2-5% AFUE improvement from reduced cycling

**Impact of Operating Conditions:**
- High return water temp (> 140°F): Condensing boiler operates as non-condensing
- Proper reset strategy: Can improve AFUE by 2-3% through better part-load operation
- Proper sizing: Oversized boilers cycle more, reducing AFUE`,
      salesExplanation: `**In Plain English:**
AFUE is the efficiency rating you care about - what percentage of your gas bill actually becomes heat. If your boiler is 82% AFUE, that means 18% of your gas money is wasted (goes up the stack as hot exhaust).

**Why It Matters:**
Every 1% improvement in AFUE saves about 1% on your gas bill. So going from 82% to 95% AFUE saves 13% of your gas bill. On a $100,000/year gas bill, that's $13,000 saved - every year.

**The Reality Check:**
The nameplate might say "95% AFUE" but if your return water is too hot, it's not condensing and you're only getting 82-85% efficiency. That's why we check your system first and optimize before replacing.

**The Math:**
Old boiler: 82% AFUE = $100k gas bill
New boiler: 95% AFUE = $86k gas bill
Savings: $14k per year

At $50k installed cost, that's a 3.5 year payback. Over 15 years, that's $210k saved.`,
      fieldTips: [
        "Always verify AFUE is being achieved. Check return water temp - if > 140°F, condensing isn't happening.",
        "Measure stack temperature to diagnose efficiency. > 300°F = non-condensing, < 140°F = condensing.",
        "Check if boiler is properly sized. Oversized boilers cycle more, reducing AFUE.",
        "Verify combustion efficiency with stack analysis. Should be 95-98%. Lower indicates maintenance needed.",
        "Monitor part-load operation. Modulating burners maintain high efficiency at low loads, on/off burners don't."
      ],
      commonMistakes: [
        "Assuming nameplate AFUE is achieved without checking operating conditions",
        "Not checking return water temperature - critical for condensing operation",
        "Ignoring part-load efficiency - most boilers operate at part-load, not full-load",
        "Not accounting for distribution losses in steam systems when comparing efficiencies",
        "Assuming all condensing boilers achieve the same efficiency - they don't without proper operation"
      ]
    },
    {
      concept: "Condensing Technology - How It Actually Works",
      engineerExplanation: `**Thermodynamic Basis:**
Natural gas combustion: CH₄ + 2O₂ → CO₂ + 2H₂O + Heat

The water vapor (H₂O) in exhaust contains latent heat. When flue gases are cooled below the dew point (~140°F for natural gas), water vapor condenses, releasing latent heat (~970 BTU/lb).

**Heat Exchanger Design:**
Condensing boilers use corrosion-resistant materials (stainless steel, aluminum, or specialized coatings) because condensate is acidic (pH 3-5) due to CO₂ and NOx dissolution.

**Two-Stage Heat Exchange:**
1. Primary: Sensible heat transfer (gas to liquid)
2. Secondary: Latent heat transfer (condensation)

**Efficiency Gain:**
Base efficiency (non-condensing): 80-85%
+ Latent heat recovery: 10-15%
= Total condensing efficiency: 90-98%

**Operating Requirements:**
- Return water temperature < 140°F (preferably < 130°F)
- Extended heat exchanger surface area
- Proper condensate drainage and neutralization`,
      salesExplanation: `**In Plain English:**
When gas burns, it creates water vapor in the exhaust. That water vapor has heat energy trapped in it - about 10% of all the energy in your fuel. Regular boilers let that heat escape up the stack. Condensing boilers cool the exhaust enough that the water vapor turns back into liquid, and when it does, it releases that trapped heat. That's how they get from 82% to 95% efficiency.

**The Key Point:**
This only works if the return water is cool enough - under 140°F. If your return water is 160°F, even a condensing boiler won't condense. It'll just run like a regular boiler. That's why we optimize your system first.

**The Analogy:**
It's like a glass of ice water on a humid day. The glass sweats because water vapor in the air condenses on the cold glass. A condensing boiler does the same thing - the cool return water makes the hot exhaust 'sweat', and that sweat releases heat energy.

**The Numbers:**
On a $100k/year gas bill, that 13% efficiency gain (82% to 95%) saves $13k per year. The condensing boiler costs about $50k installed, so payback is about 4 years.`,
      fieldTips: [
        "Check return water temperature before recommending condensing boiler - must be < 140°F",
        "Look for condensate drain - condensing boilers have plastic condensate lines (regular boilers don't)",
        "Measure stack temperature - condensing boilers have cool exhaust (< 140°F vs 350°F+ for non-condensing)",
        "Verify heat exchanger material - condensing boilers use stainless steel or aluminum (corrosion resistant)",
        "Check if condensate neutralization is required - some jurisdictions require pH adjustment before drain discharge"
      ],
      commonMistakes: [
        "Installing condensing boiler without checking return water temperature first",
        "Not implementing reset strategy - return water stays too hot, condensing never occurs",
        "Assuming all condensing boilers are the same - efficiency varies significantly by manufacturer",
        "Ignoring condensate drainage requirements - can cause problems if not properly installed",
        "Not accounting for condensate neutralization costs in system design"
      ]
    },
    {
      concept: "Return Water Temperature - The Make-or-Break Factor",
      engineerExplanation: `**Critical Temperature:**
For condensing to occur: T_Return < T_DewPoint ≈ 140°F

**Heat Transfer Analysis:**
For effective condensing heat transfer:
ΔT = T_FlueGas - T_ReturnWater

To maximize condensation, minimize return water temperature. Optimal: < 130°F.

**Impact on Efficiency:**
- Return water 120°F: Maximum condensing (95-98% AFUE)
- Return water 130°F: Good condensing (92-95% AFUE)
- Return water 140°F: Marginal condensing (88-92% AFUE)
- Return water 150°F: No condensing (82-85% AFUE - operates as non-condensing)

**Optimization Strategies:**
1. Outdoor reset: Lower supply temp = lower return temp
2. Variable flow: Higher flow rates reduce temperature rise
3. System balancing: Eliminate bypass flows and short-circuiting
4. Load management: Stagger heating loads to reduce peak return temp`,
      salesExplanation: `**In Plain English:**
Return water temperature is the temperature of water coming back from your heating system. For a condensing boiler to actually condense (and get that 95% efficiency), the return water has to be under 140°F. If it's 160°F, the boiler won't condense - it'll just run like a regular 82% efficient boiler.

**Why It Matters:**
If you install a $50k condensing boiler but your return water is 160°F, you just wasted $20k because you're only getting 82% efficiency, not 95%. That's why we check your system first and optimize it.

**How We Fix It:**
We implement a "reset strategy" - we lower your supply water temperature when it's not super cold outside. On a 50°F day, you don't need 180°F water - 140°F works fine. Lower supply temp = lower return temp = condensing works = 95% efficiency.

**The Check:**
Ask your facilities person: "What's your return water temperature?" If they don't know or say "over 140°F", that's the first thing we fix.`,
      fieldTips: [
        "Always measure return water temperature before recommending condensing boiler",
        "Implement outdoor reset to optimize return water temperature",
        "Check for bypass flows or short-circuiting that increase return water temp",
        "Verify system is balanced - unbalanced systems have higher return temps",
        "Consider variable flow - higher flow rates reduce temperature rise across system"
      ],
      commonMistakes: [
        "Installing condensing boiler without checking return water temperature",
        "Not implementing reset strategy - return water stays too hot for condensing",
        "Ignoring system imbalances that cause high return water temps",
        "Assuming return water will automatically be low enough for condensing",
        "Not monitoring return water temperature after installation to verify condensing operation"
      ]
    },
    {
      concept: "Electrification with Heat Pump Chillers - The Future",
      engineerExplanation: `**Heat Pump Chiller Technology:**
Reversible heat pumps can provide both heating and cooling by reversing the refrigeration cycle. In heating mode, they extract heat from outdoor air/water and reject it to the building's hot water loop.

**COP (Coefficient of Performance):**
COP_Heating = Heat Output / Electrical Input
Typical: COP 4.0-5.5 (400-550% efficient)

**Comparison to Gas Boiler:**
- Gas boiler: 95% AFUE (efficient, but gas-fired)
- Heat pump: 400-500% COP (more efficient, electric)
- Energy cost comparison depends on gas vs electricity rates

**Hybrid Systems:**
Heat pump provides base heating load efficiently. Gas boiler provides peak/heating on coldest days. Optimal for California climate.

**Utility Incentives:**
PG&E and other utilities offer significant rebates for electrification:
- Up to $500/ton for heat pump chillers
- Demand response programs
- Time-of-use rate optimization`,
      salesExplanation: `**The Big Picture:**
Instead of a gas boiler for heating and a chiller for cooling, you can have ONE system that does both - a heat pump chiller. It heats in winter and cools in summer, all electric.

**The Efficiency:**
Even though electricity costs more per unit than gas, heat pumps are 400-500% efficient (COP 4-5) vs gas boilers at 95% efficient. So you use way less energy overall. Plus, you're getting both heating AND cooling.

**The Rebates:**
PG&E has massive rebates for electrification - up to $500 per ton. On a 500-ton system, that's $250,000 in rebates. That often makes electrification cheaper than replacing a gas boiler.

**The Future:**
California is pushing hard for electrification. Gas is being phased out. If you're going to replace equipment anyway, electrification is future-proof.

**The Math:**
Gas boiler replacement: $50k
Heat pump chiller (replaces boiler + chiller): $150k
Less PG&E rebate: -$100k
Net cost: $50k
Plus you get cooling too, and you're future-proof.

**The Close:**
"If you're thinking long-term, electrification is the way to go. The rebates are there now, but they won't be forever. And you're getting two systems (heating + cooling) for the price of one boiler replacement."`,
      fieldTips: [
        "Check current utility rebate programs - they change frequently",
        "Evaluate hybrid systems for California - heat pump for most load, gas for peak",
        "Consider building's cooling needs - if they need cooling too, heat pump chiller makes more sense",
        "Calculate energy costs carefully - electricity rate vs gas rate, consider time-of-use rates",
        "Check building's electrical capacity - heat pumps need significant electrical service"
      ],
      commonMistakes: [
        "Not checking utility rebates - they can make electrification cheaper than gas replacement",
        "Comparing only fuel costs without considering efficiency differences",
        "Assuming heat pumps don't work in California - they work great in our climate",
        "Not considering that heat pumps provide both heating and cooling - bigger value",
        "Ignoring that electrification is future-proof - gas is being phased out in California"
      ]
    }
  ]
};

// Export enhanced data
export const boilerEnhancedData = enhancedBoilerData;

