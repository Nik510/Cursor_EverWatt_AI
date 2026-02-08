/**
 * Enhanced Chiller Training Content
 * Comprehensive training material with dual perspectives:
 * - Engineer-grade technical explanations
 * - Sales/Auditor-tailored insights with trade secrets
 */

import type React from 'react';
import type { TechPageData } from './lighting-content';

// Extended interface for enhanced content with dual perspectives
export interface EnhancedChillerContent extends TechPageData {
  engineerPerspective?: {
    title: string;
    sections: {
      section: string;
      technicalExplanation: string;
      formulas?: { name: string; formula: string; explanation: string }[];
      references?: string[];
    }[];
  };
  salesPerspective?: {
    title: string;
    sections: {
      section: string;
      salesPitch: string;
      tradeSecrets: string[];
      commonObjections: { objection: string; response: string }[];
      realWorldExamples: { scenario: string; solution: string; savings: string }[];
    }[];
  };
  deepDive?: {
    concept: string;
    engineerExplanation: string;
    salesExplanation: string;
    fieldTips: string[];
    commonMistakes: string[];
  }[];
}

// Enhanced content data object
export const enhancedChillerData = {
  engineerPerspective: {
    title: "Engineer-Grade Technical Deep Dive",
    sections: [
      {
        section: "Lift Calculation & Optimization",
        technicalExplanation: `**Lift (ΔT_Lift)** is the thermodynamic driving force in the refrigeration cycle. It represents the temperature difference between the condensing temperature and the evaporating temperature, measured at the refrigerant side of the heat exchangers.

**Fundamental Formula:**
Lift = T_Condenser - T_Evaporator

**Typical Values:**
- Legacy System: 95°F condenser - 40°F evaporator = 55°F lift
- Optimized System: 75°F condenser - 48°F evaporator = 27°F lift

**Energy Impact:**
The Carnot efficiency for a heat pump shows that every 1°F reduction in lift results in approximately 1.5-2.5% reduction in compressor power consumption. A 10°F lift reduction yields 15-25% energy savings.

**Approach Temperature:**
- Condenser Approach = T_Condenser - T_CondenserWaterLeaving (Typical: 3-5°F for shell-and-tube)
- Evaporator Approach = T_ChilledWaterLeaving - T_Evaporator (Typical: 2-4°F for proper design)

**Optimization Strategy:**
1. Raise chilled water temperature from 42°F to 46-48°F (reduces lift by 4-6°F)
2. Lower condenser water temperature from 85°F to 75-78°F (reduces lift by 7-10°F)
3. Combined optimization: 20-25% energy reduction`,
        formulas: [
          {
            name: "Lift",
            formula: "Lift = T_Condenser - T_Evaporator",
            explanation: "Temperature difference driving the refrigeration cycle. Minimize for efficiency."
          },
          {
            name: "Carnot COP",
            formula: "COP_Carnot = T_Evaporator / (T_Condenser - T_Evaporator) [Absolute Temp in Rankine]",
            explanation: "Theoretical maximum efficiency. Real systems achieve 40-60% of Carnot efficiency."
          },
          {
            name: "Power Consumption",
            formula: "kW = (Tons × 12,000 BTU/ton) / (COP × 3,412 BTU/kWh)",
            explanation: "Actual power consumption based on COP. Lower COP = higher power requirement."
          },
          {
            name: "Energy Savings from Lift Reduction",
            formula: "Savings % ≈ 2% × ΔLift (°F)",
            explanation: "Approximate rule: Every 1°F reduction in lift saves ~2% compressor energy."
          },
          {
            name: "IPLV Calculation (ASHRAE Standard 90.1)",
            formula: "IPLV = 0.01×EER₁₀₀ + 0.42×EER₇₅ + 0.45×EER₅₀ + 0.12×EER₂₅",
            explanation: "Weighted average efficiency at part-load conditions. More realistic than full-load efficiency."
          }
        ],
        references: [
          "ASHRAE Handbook - Fundamentals (2021)",
          "ASHRAE Standard 90.1 - Energy Standard for Buildings",
          "Carrier System Design Manual - Chiller Optimization",
          "Trane Engineering Bulletin - Lift Reduction Strategies",
          "ASHRAE Guideline 36 - High-Performance Sequences of Operation"
        ]
      },
      {
        section: "Chilled Water Temperature Reset Strategy",
        technicalExplanation: `**Thermodynamic Basis:**
Raising chilled water temperature reduces the evaporating temperature, which reduces lift and compressor work. The relationship is approximately linear: 1°F increase in chilled water = 1.5-2% reduction in compressor power.

**Heat Transfer Analysis:**
Q = UA × ΔT_LMTD
Where Q = heat transfer rate, U = overall heat transfer coefficient, A = surface area, ΔT_LMTD = log mean temperature difference.

**Comfort Considerations:**
Most commercial buildings use air handlers with cooling coils. The coil approach temperature (difference between leaving air and chilled water) is typically 8-12°F. Therefore:
- 42°F chilled water → ~50-54°F supply air
- 48°F chilled water → ~56-60°F supply air

For comfort cooling, 56-60°F supply air is acceptable if:
- Space has adequate airflow
- Humidity is controlled (45-55% RH target)
- Load is not extreme

**Implementation Strategy:**
1. Baseline current operation (space temps, load profile, comfort complaints)
2. Implement reset schedule based on:
   - Outdoor air temperature (economizer mode when OAT < return water temp)
   - Return water temperature (indicator of load)
   - Space temperature feedback (ensure comfort maintained)
3. Typical reset: 42°F at peak load, 48°F at part-load
4. Monitor and adjust based on comfort feedback

**Capacity Impact:**
Higher chilled water temperature may require increased flow rate to maintain cooling capacity:
m_new = m_old × (ΔT_old / ΔT_new)

**Limitations:**
- Process loads requiring specific temperatures (<42°F)
- High latent loads requiring low coil temperatures for dehumidification
- Poorly maintained coils (need cleaning before optimization)`,
        formulas: [
          {
            name: "Heat Transfer Rate",
            formula: "Q = m × c_p × ΔT",
            explanation: "Mass flow rate × specific heat × temperature difference. Basis for coil sizing."
          },
          {
            name: "Flow Rate Adjustment",
            formula: "m_new = m_old × (ΔT_old / ΔT_new)",
            explanation: "To maintain capacity with higher supply temp, increase flow rate proportionally."
          },
          {
            name: "Coil Approach Temperature",
            formula: "Approach = T_SupplyAir - T_ChilledWater",
            explanation: "Typical: 8-12°F for properly sized coils. Higher approach = less effective heat transfer."
          }
        ]
      },
      {
        section: "Condenser Water Optimization & Cooling Tower Performance",
        technicalExplanation: `**Cooling Tower Performance Metrics:**
The cooling tower's ability to reject heat depends on:
- Wet-bulb temperature (ambient psychrometric conditions)
- Tower approach (Leaving Water Temp - Wet Bulb Temp) - Lower is better (3-5°F typical)
- Range (Entering - Leaving Water Temp) - 10-15°F typical for efficient operation
- Fan operation and fill condition
- Water flow rate

**Tower Effectiveness:**
Effectiveness = Range / (Range + Approach)
Higher effectiveness = better performance

**Optimal Strategy:**
- Target condenser water leaving temp: 75-80°F (vs typical 85°F)
- Use VFD on tower fan to maintain optimal approach (3-5°F)
- Clean tower fill annually
- Balance chemical treatment for scale prevention

**Energy Trade-offs:**
Total system energy = Chiller energy + Tower fan energy + Pump energy

Optimal condenser water temperature minimizes this sum:
- Lower condenser temp → Less chiller energy, More fan energy
- Higher condenser temp → More chiller energy, Less fan energy

Typical optimum: 75-80°F leaving water temperature (varies with load and ambient conditions).

**VFD Implementation:**
- Control based on approach temperature, not just leaving water temp
- Maintain 3-5°F approach at all loads
- Use two-speed or VFD fans (30-50% energy savings vs fixed speed)
- Fan power ∝ (speed)³ (cubic relationship)`,
        formulas: [
          {
            name: "Tower Approach",
            formula: "Approach = T_Leaving - T_WetBulb",
            explanation: "Lower approach = better tower performance (typically 3-5°F at design conditions)"
          },
          {
            name: "Tower Range",
            formula: "Range = T_Entering - T_Leaving",
            explanation: "Typical range: 10-15°F for efficient operation. Higher range = more heat rejection per unit flow."
          },
          {
            name: "Fan Power (Cubic Law)",
            formula: "P_fan ∝ (N)³",
            explanation: "Fan power is proportional to speed cubed. Cut speed in half = 1/8th the power."
          },
          {
            name: "System Energy Optimization",
            formula: "Minimize: E_chiller(T_cond) + E_fan(T_cond) + E_pump",
            explanation: "Find condenser temperature that minimizes total system energy consumption."
          }
        ]
      }
    ]
  },
  salesPerspective: {
    title: "Sales & Audit Intelligence: Making You Look Smart",
    sections: [
      {
        section: "The Lift Reduction Sales Pitch",
        salesPitch: `**The Hook:**
"Your chiller is like a car going uphill. The steeper the hill (higher lift), the more gas (energy) it burns. We can flatten that hill by 10-15°F, and you'll save 15-25% on chiller energy immediately - with zero capital investment."

**The Script:**
1. "Let me check your current settings..." [Look at BMS/controls - shows you know what you're doing]
2. "I see you're running 42°F chilled water and 85°F condenser water. That's a 43°F lift."
3. "Here's what 90% of facilities don't know: You can raise that chilled water to 46-48°F and lower the condenser to 75-78°F."
4. "That cuts your lift to 28-30°F - saving you 15-25% on the largest energy user in your building."
5. "Best part? This is a controls change. No equipment needed. Just smarter operation."
6. "Want to see the exact settings? I can walk your facilities team through it right now, or we can handle it as part of a comprehensive optimization project."

**The Close:**
"Would you like me to show you the exact settings to change, or would you prefer we handle the optimization as part of a comprehensive energy audit? Either way, you're looking at $20k-50k per year in savings on a typical 500-ton system."`,
        tradeSecrets: [
          "Most facilities run chillers at 42°F because 'that's what we've always done' - but modern buildings can handle 46-48°F easily. Check their maintenance logs - if they're cleaning coils frequently, they're probably over-cooling.",
          "The #1 missed opportunity: VFD on cooling tower fans. Saves 30-50% on tower energy AND enables lower condenser temps (which saves chiller energy). Fast payback - usually 1-2 years.",
          "Don't just look at full-load efficiency. 95% of operating hours are part-load (40-60% load). IPLV matters WAY more than NPLV or full-load ratings.",
          "If they have multiple chillers, always check sequencing logic. Bad sequencing can waste 20%+ energy. Ask to see their chiller run logs - if chillers are short-cycling, sequencing is wrong.",
          "Pro tip: Ask to see their energy bills. Peak demand charges are often 50-70% of total bill. Chiller optimization directly reduces peak. Show them the demand charge line and say 'We can cut this by 15-30%.'",
          "Field secret: Look at their tower approach temperature. If it's >7°F, their tower is dirty or undersized. Clean tower = lower condenser temps = less chiller energy. Easy win.",
          "The magic question: 'What's your IPLV?' If they don't know, that's a red flag. Their chiller is probably running at 0.8-0.9 kW/ton when not at full load, not the 0.65 they think."
        ],
        commonObjections: [
          {
            objection: "We can't raise chilled water temp - our spaces will be too warm",
            response: "I hear that concern. Let's test it. We'll raise it 1°F per week and monitor space temps. In 90% of buildings, 46-48°F supply temp works perfectly - you might be surprised. The key is checking comfort, not assuming. Worst case, we lower it back. Best case, you save 20% on chiller energy. What do you have to lose?"
          },
          {
            objection: "We need cold water for process loads",
            response: "Great catch. If you have specific process loads that need 42°F water, we can split the loop - one loop for comfort cooling (48°F) and one for process (42°F). The majority of your load is likely comfort cooling, so you still get most of the savings. Let's look at your load profile - what percentage is process vs comfort?"
          },
          {
            objection: "This sounds too good to be true - why hasn't anyone suggested this?",
            response: "Most energy auditors don't understand chiller optimization. They focus on lighting and basic HVAC controls, but miss the biggest energy user. This is field engineer knowledge - the kind of optimization that happens during commissioning, not during typical energy audits. You're getting expert-level analysis. Plus, a lot of consultants want to sell equipment - we're showing you how to save money without buying anything first."
          },
          {
            objection: "Our engineer set it at 42°F for a reason",
            response: "Absolutely - engineers are conservative, and 42°F is a safe default. But building codes actually allow up to 50°F for comfort cooling. We're not suggesting anything outside of industry standards - just optimizing within the acceptable range. Plus, we'll monitor comfort the whole time. If your engineer has concerns, I'm happy to explain the technical basis. This is proven optimization - not experimental."
          },
          {
            objection: "We don't have budget for new controls or equipment",
            response: "That's the beauty - this is free. We're just changing setpoints in your existing BMS. Zero capital investment. If you want to add VFDs later, those pay back in 1-2 years, but the lift optimization is immediate and costs nothing. Let's start there and see the savings, then we can talk about equipment upgrades."
          }
        ],
        realWorldExamples: [
          {
            scenario: "500-ton office building, 1990s chiller running 0.75 kW/ton full-load, 0.90 kW/ton part-load",
            solution: "Raised chilled water from 42°F to 46°F, added VFD to tower fans, optimized condenser water reset schedule, improved chiller sequencing",
            savings: "$28,000/year (22% reduction), $8,000 peak demand reduction, total: $36,000/year. Payback: Immediate (no-cost optimization)"
          },
          {
            scenario: "1000-ton hospital, 3 chillers with poor sequencing logic",
            solution: "Optimized chiller sequencing logic (prevented short-cycling), implemented chilled water reset (42-48°F), added tower VFDs, optimized condenser water reset",
            savings: "$85,000/year (18% reduction), improved reliability (fewer maintenance calls), better part-load efficiency"
          },
          {
            scenario: "Manufacturing facility with 42°F requirement for one process area",
            solution: "Split loop design - 48°F for comfort zones (80% of load), 42°F for process areas. Optimized tower operation for lower condenser temps",
            savings: "$45,000/year (15% on comfort load), zero impact on process requirements, improved process reliability"
          },
          {
            scenario: "Retail building, 300-ton system, constant-speed tower fans",
            solution: "Added VFDs to tower fans, optimized condenser water temperature, raised chilled water to 46°F, cleaned tower fill",
            savings: "$18,000/year (20% reduction), $5,000 from tower VFD alone. VFD payback: 14 months"
          }
        ]
      },
      {
        section: "Making the Technical Talk Work for You",
        salesPitch: `**When They Ask "What's Lift?"**
"The difference between how hot the condenser water is and how cold the chilled water is. Think of it like climbing a hill - the bigger the difference, the harder the chiller works. Right now you're climbing a 43°F hill. We're going to make that hill 15°F smaller. Same work done, way less energy."

**When They Ask "What's IPLV?"**
"That's the efficiency when it's not running full blast. Here's the thing - your chiller is almost never at 100% load. It's usually running at 40-60%. IPLV tells you what you're actually getting. Your old chiller might say 0.65 kW/ton on the nameplate, but its IPLV is probably 0.85-0.90 kW/ton - that's what you're really paying for. New magnetic-bearing chillers have IPLV of 0.35 kW/ton - that's the real difference."

**When They Ask "Why Should I Care About kW/Ton?"**
"Every kW you save is money. If you're at 0.8 kW/ton and we get you to 0.35 kW/ton, that's 0.45 kW saved per ton. On a 500-ton system running 2,000 hours a year, that's 450,000 kWh saved. At $0.12/kWh, that's $54,000 per year. Plus peak demand reduction - that's another $15,000-20,000. Total: $70k per year."

**When They Ask "What's COP?"**
"COP is how many BTUs of cooling you get for each BTU of electricity. Old chiller: 5.0 COP (5 BTUs cooling per BTU of electricity). New magnetic-bearing: 10.0 COP (10 BTUs cooling per BTU). Double the efficiency. That means half the energy for the same cooling."

**The Power Move:**
Always convert technical terms to dollars. "0.5 kW/ton improvement" means nothing. "$50,000 per year savings" means everything.`,
        tradeSecrets: [
          "Never say 'kilowatts per ton' to a non-technical person. Say 'the amount of electricity it takes to make one ton of cooling.' Use analogies.",
          "Always convert to dollars. '0.5 kW/ton improvement' → '$50,000 per year savings' → 'That's a free employee.' Make it tangible.",
          "Show them their energy bills. Point to the peak demand charge line. 'See this $45,000? Chiller optimization cuts this by 20-30%.' Visual is powerful.",
          "Use analogies: 'Your chiller is like a refrigerator for a skyscraper. We're making it more efficient.' 'Lift is like climbing a hill - we're making the hill smaller.'",
          "The secret weapon: Ask to see their maintenance logs. If they're changing oil frequently, that's a legacy chiller - huge opportunity. If they're cleaning coils constantly, they're over-cooling.",
          "The credibility builder: Ask technical questions they can't answer. 'What's your IPLV?' 'What's your tower approach?' Shows you're the expert.",
          "Always have a calculator ready. When they say 'How much would we save?' - pull it out and calculate in real-time. Shows confidence and expertise."
        ],
        commonObjections: [],
        realWorldExamples: []
      }
    ]
  },
  deepDive: [
    {
      concept: "Lift (Temperature Difference) - The Fundamental Concept",
      engineerExplanation: `**Thermodynamic Definition:**
Lift is the temperature difference across which the refrigeration cycle must operate. It directly determines the compressor work required via the Carnot efficiency relationship.

**Mathematical Relationship:**
W_compressor ∝ (T_Hot - T_Cold) / T_Cold

Where temperatures are in absolute units (Rankine or Kelvin). For every 1°F reduction in lift, compressor power decreases by approximately 1.5-2.5%, assuming constant load.

**Measurement Points:**
- Evaporator: Measure at refrigerant saturation temperature (typically 2-4°F below chilled water leaving temp)
- Condenser: Measure at refrigerant saturation temperature (typically 3-5°F above condenser water leaving temp)

**Typical Lift Values:**
- Legacy system (poor operation): 50-55°F lift
- Standard operation: 40-45°F lift  
- Optimized system: 25-30°F lift
- Maximum practical reduction: 20-25°F

**Components of Lift:**
Lift = (Condenser Water Temp + Approach) - (Chilled Water Temp - Approach)
= T_CondWater + Approach_Cond - T_ChillWater + Approach_Evap

Where approaches are typically 3-5°F each.`,
      salesExplanation: `**In Plain English:**
Lift is how hard your chiller has to work. If the condenser water is really hot (85°F) and the chilled water is really cold (42°F), that's a 43°F difference - your chiller is climbing a steep hill. We can make that hill smaller by raising the chilled water a bit (to 46-48°F) and lowering the condenser water (to 75-78°F).

**Why It Matters:**
Every degree you reduce lift saves about 2% energy. So if we reduce lift by 10°F, you save 20%. On a $100,000/year chiller energy bill, that's $20,000 saved - every year, forever.

**The Analogy:**
Your chiller is like a water pump pushing water uphill. The higher the hill (lift), the more power the pump needs. We're going to lower the hill by 10-15 feet, and the pump uses way less energy to do the same work.

**The Money:**
On a 500-ton system, reducing lift by 10°F saves about 100 kW. That's 100 kW × 2,000 hours × $0.12/kWh = $24,000 per year. Plus peak demand reduction - another $6,000-8,000.`,
      fieldTips: [
        "Always measure lift at the refrigerant side using pressure gauges, not just water temperatures. Use pressure-temperature charts for accuracy.",
        "Check lift at different load conditions - it varies significantly with load and ambient conditions. Track it over time.",
        "If lift is higher than design (typically >45°F), check for fouled heat exchangers, improper flow rates, or control issues.",
        "For best results, monitor lift continuously via BMS and trend it. Set up alarms if lift exceeds 45°F.",
        "Remember: Lift optimization has the biggest impact at part-load conditions, when most chillers operate most of the time."
      ],
      commonMistakes: [
        "Assuming 42°F chilled water is always needed - most buildings can easily handle 46-48°F for comfort cooling",
        "Not optimizing condenser water - letting it run at fixed high temperature (85°F) when it could be 75-78°F",
        "Ignoring part-load conditions - lift optimization matters most when chiller isn't at full load (which is 95% of the time)",
        "Not accounting for approach temperatures when calculating lift - always add 3-5°F to water temps for refrigerant temps",
        "Setting fixed temperatures instead of using reset schedules based on load and ambient conditions"
      ]
    },
    {
      concept: "IPLV vs NPLV vs Full-Load Efficiency - Why IPLV Matters",
      engineerExplanation: `**NPLV (Nominal Part-Load Value):**
ASHRAE Standard 90.1 defines NPLV using specific weighting factors:
NPLV = 0.01×EER₁₀₀ + 0.42×EER₇₅ + 0.45×EER₅₀ + 0.12×EER₂₅

This assumes:
- 1% of operating hours at 100% load
- 42% at 75% load
- 45% at 50% load  
- 12% at 25% load

**IPLV (Integrated Part-Load Value):**
Similar calculation but uses actual building load profile. More accurate for specific applications. Formula is the same, but weighting factors match actual operation.

**Full-Load Efficiency:**
Measured at 100% load, 44°F leaving chilled water, 85°F entering condenser water. This condition rarely occurs in real operation - typically <5% of operating hours.

**Key Insight:**
Centrifugal chillers have poor part-load efficiency due to:
- Surge limitations at low loads (must unload using hot gas bypass or vane positioning)
- Fixed-speed compressors (legacy systems)
- Unloading inefficiencies (power doesn't drop linearly with load)

Modern variable-speed chillers maintain high efficiency down to 10-20% load.`,
      salesExplanation: `**The Problem:**
Manufacturers love to quote full-load efficiency (0.6 kW/ton sounds great!), but your chiller almost never runs at full load. It runs at 40-60% most of the time.

**The Solution:**
IPLV shows you the REAL efficiency - what you actually pay for. That same chiller with a 0.6 kW/ton full-load rating might have a 0.85-0.90 kW/ton IPLV. That's what matters.

**Why This Kills Sales:**
Competitor: "Your current chiller is 0.8 kW/ton, and this new one is 0.6 kW/ton. That's only 0.2 kW/ton improvement - doesn't seem like much."

WRONG. Look at IPLV:
- Old chiller IPLV: 0.95 kW/ton (terrible part-load - runs inefficient when not at full load)
- New chiller IPLV: 0.35 kW/ton (excellent part-load - maintains efficiency)
- Real improvement: 0.6 kW/ton = 63% better efficiency!

**The Money:**
At 50% load (where most chillers operate):
- Old: 500 tons × 50% × 0.95 kW/ton = 237.5 kW
- New: 500 tons × 50% × 0.35 kW/ton = 87.5 kW
- Savings: 150 kW = $36,000/year (at $0.12/kWh, 2,000 hours)

**The Close:**
"Don't let anyone sell you on full-load numbers. Ask for IPLV. That's what you'll actually pay for. The difference is usually 2-3x bigger than they're telling you."`,
      fieldTips: [
        "Always request IPLV data from manufacturers - it's required by ASHRAE 90.1 for new equipment",
        "Compare IPLV, not just full-load efficiency when evaluating replacements",
        "For existing chillers, calculate approximate IPLV based on load profile and part-load performance curves from manufacturer",
        "Variable-speed chillers dramatically improve IPLV - sometimes 2x better than fixed-speed at part-load",
        "If IPLV data isn't available, assume legacy chillers have IPLV 30-40% worse than full-load rating"
      ],
      commonMistakes: [
        "Comparing only full-load efficiency between chillers - this is misleading",
        "Assuming full-load efficiency represents actual operation - it doesn't",
        "Not understanding that most chillers operate at 40-60% load, not 100%",
        "Ignoring that legacy chillers have much worse IPLV than modern variable-speed units",
        "Not asking for IPLV during equipment selection - always request this data"
      ]
    }
  ]
};

export const chillerContent: TechPageData = {
  title: "Water-Cooled Chillers",
  subtitle: "The heart of commercial cooling. Efficiency upgrades deliver massive savings.",
  introduction: {
    whatItIs: "A water-cooled chiller is a central cooling system that removes heat from a building by circulating chilled water through air handlers and fan coil units. It uses a refrigeration cycle - a compressor pressurizes refrigerant, which rejects heat to condenser water (cooled by a cooling tower) and then expands to absorb heat from the building's chilled water loop. Think of it as a 'refrigerator for a skyscraper' - it cools water instead of air, and that cold water cools the entire building.",
    whereItIsSeen: [
      "Large commercial buildings (office towers, hospitals, universities)",
      "Data centers and server rooms",
      "Manufacturing facilities with process cooling needs",
      "Shopping malls and retail centers",
      "Hotels and hospitality facilities",
      "Large residential buildings (high-rises, condominiums)",
      "Any building over ~100,000 sq ft with central cooling"
    ],
    typicalLocations: [
      "Mechanical rooms (basement, ground floor, or rooftop penthouses)",
      "Central plant rooms (often marked 'Chiller Plant' or 'Mechanical Equipment Room')",
      "Near cooling towers (usually on roof or ground level outside building)",
      "Often multiple chillers in the same room (primary + backup, or staged capacity)",
      "Connected to chilled water pumps and distribution piping throughout building"
    ],
    keyConcepts: [
      "kW/Ton: Power consumption per ton of cooling (lower = more efficient). Industry standard: 0.6-0.8 kW/ton (legacy) vs 0.30-0.40 kW/ton (modern).",
      "Lift: Temperature difference between condenser and evaporator. Lower lift = less energy required. This is THE key optimization opportunity.",
      "IPLV (Integrated Part-Load Value): Real-world efficiency at part-load conditions. Most chillers operate at 40-60% load, not full-load - IPLV tells you what you're actually paying for.",
      "Chilled Water Loop: Water is cooled to 42-48°F, circulated through building to air handlers, returns at 54-60°F. This loop is separate from condenser water loop.",
      "Condenser Water Loop: Hot water (85-95°F) from chiller condenser is sent to cooling tower, cooled to 75-85°F, and returned. This loop rejects heat to atmosphere.",
      "Part-Load Operation: Chillers rarely run at 100% load. Most operate 40-60% of capacity most of the time. Part-load efficiency matters more than full-load efficiency."
    ],
    whyItMatters: "Chillers are typically the largest single energy consumer in commercial buildings, accounting for 30-40% of total energy use. A 500-ton chiller running 2,000 hours per year at 0.8 kW/ton consumes 800,000 kWh annually - at $0.12/kWh, that's $96,000 per year just for cooling. Optimizing chiller efficiency (through lift reduction, modern equipment, or better controls) can save 15-30% of this energy - $15k-30k per year on a typical system. Plus, peak demand reduction from chiller optimization directly reduces the highest cost line item on energy bills (demand charges).",
    commonApplications: [
      "Comfort cooling for office buildings, hospitals, schools",
      "Process cooling for manufacturing, data centers, laboratories",
      "Combined cooling and heating (heat recovery chillers)",
      "District cooling systems (central plant serving multiple buildings)",
      "Retrofit projects replacing old, inefficient chillers",
      "New construction with high-efficiency requirements (LEED, energy codes)"
    ]
  },
  chiefEngineerQuote: "Chillers consume 30-40% of a building's total energy. A 20-year-old centrifugal chiller running at 0.8 kW/ton can be replaced with a magnetic-bearing chiller at 0.35 kW/ton. That's a 56% reduction in energy. But it's not just about replacement - lift reduction, optimal control sequencing, and proper maintenance can squeeze another 10-15% out of existing equipment. If you're not talking about IPLV and part-load efficiency, you're missing the biggest opportunity.",
  
  compressorTypes: [
    { 
      name: "Centrifugal (Legacy)", 
      desc: "20+ year old standard efficiency chillers", 
      range: "0.65 - 0.85 kW/ton", 
      application: "Large central plants, 200+ tons", 
      color: "slate" 
    },
    { 
      name: "Magnetic-Bearing Centrifugal", 
      desc: "Modern high-efficiency, oil-free operation", 
      range: "0.30 - 0.40 kW/ton", 
      application: "Large central plants, premium efficiency", 
      color: "emerald" 
    },
    { 
      name: "Screw Compressor", 
      desc: "Positive displacement, good part-load", 
      range: "0.50 - 0.65 kW/ton", 
      application: "Medium-large systems, 100-500 tons", 
      color: "blue" 
    },
    { 
      name: "Scroll Compressor", 
      desc: "Small to medium systems", 
      range: "0.60 - 0.75 kW/ton", 
      application: "Small-medium systems, < 150 tons", 
      color: "purple" 
    },
    { 
      name: "Absorption Chiller", 
      desc: "Gas-fired or waste heat driven", 
      range: "1.0 - 1.2 kW/ton", 
      application: "Waste heat utilization, steam available", 
      color: "purple" 
    },
  ],

  compressorComparison: [
    {
      name: "Legacy Centrifugal",
      desc: "Standard efficiency centrifugal chiller, 20+ years old",
      pros: [
        "Proven technology",
        "Reliable operation",
        "Good full-load efficiency",
      ],
      cons: [
        "Poor part-load efficiency",
        "High maintenance (oil changes, bearings)",
        "Loud operation",
        "Short cycling issues",
        "Outdated controls",
      ],
      bestFor: "Existing installations awaiting replacement",
      visualId: "Large metal box, visible compressor access, older control panel",
    },
    {
      name: "Magnetic-Bearing Centrifugal",
      desc: "Modern oil-free, variable-speed centrifugal chiller",
      pros: [
        "Highest efficiency (0.30-0.40 kW/ton)",
        "Excellent part-load performance",
        "No oil maintenance",
        "Quiet operation",
        "Advanced controls",
        "Variable-speed capability",
      ],
      cons: [
        "Higher initial cost",
        "Requires clean power",
        "Newer technology (less field history)",
      ],
      bestFor: "New installations, major replacements, premium efficiency projects",
      visualId: "Modern compact design, digital controls, variable-speed drive visible",
    },
    {
      name: "Gas Absorption",
      desc: "Gas-fired or waste-heat driven chiller",
      pros: [
        "Uses waste heat",
        "Can use steam",
        "Good for heat recovery",
      ],
      cons: [
        "Lower efficiency (1.0-1.2 kW/ton equivalent)",
        "Higher operating costs",
        "Gas infrastructure required",
        "Maintenance intensive",
        "Emissions (CO₂, NOx)",
      ],
      bestFor: "Decarbonization target - convert to electric",
      visualId: "Gas connection visible, exhaust stack, steam/hot water input",
    },
  ],

  schematicTitle: "Chiller Plant Operation: Lift Reduction Strategy",
  
  cycleSteps: [
    { 
      step: 1, 
      title: "High Lift (Baseline)", 
      text: "Legacy chiller runs at high condenser water temp (85°F), low chilled water temp (42°F). High lift = high energy." 
    },
    { 
      step: 2, 
      title: "Lift Reduction", 
      text: "Optimize: Raise chilled water temp (48°F) and lower condenser temp (75°F). Reduces lift by 10-15°F." 
    },
    { 
      step: 3, 
      title: "VFD on Tower Fan", 
      text: "Variable-speed tower fan maintains optimal condenser water temp based on load and ambient conditions." 
    },
    { 
      step: 4, 
      title: "Savings", 
      text: "10-15% energy reduction from lift optimization alone. Combined with VFD: 20-30% total savings." 
    },
  ],
  
  tooltipData: {
    chiller: { 
      title: "CENTRIFUGAL CHILLER", 
      desc: "The workhorse. Compressor increases refrigerant pressure, condensing in the condenser coil.", 
      stats: "Efficiency: 0.35-0.85 kW/ton | Capacity: 200-2000 tons", 
      style: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', borderColor: '#3b82f6' } 
    },
    condenser: { 
      title: "CONDENSER", 
      desc: "Rejects heat to cooling tower water. Lower temp = lower lift = less energy.", 
      stats: "Typical: 75-85°F | Optimal: 70-75°F", 
      style: { top: '20px', right: '20px', borderColor: '#ef4444' } 
    },
    evaporator: { 
      title: "EVAPORATOR", 
      desc: "Produces chilled water. Higher temp = lower lift = less energy (but ensure comfort).", 
      stats: "Standard: 42-44°F | Optimized: 45-48°F", 
      style: { bottom: '20px', left: '20px', borderColor: '#60a5fa' } 
    },
    tower: { 
      title: "COOLING TOWER", 
      desc: "Rejects heat to atmosphere. VFD fan maintains optimal condenser water temp.", 
      stats: "VFD Savings: 30-50% | Critical for lift reduction", 
      style: { bottom: '20px', right: '20px', borderColor: '#fbbf24' } 
    },
  },
  
  realWorldImage: {
    src: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1000&auto=format&fit=crop",
    alt: "Commercial Chiller Plant",
    caption: "Fig 1. Large centrifugal chiller in mechanical room with cooling tower connections."
  },
  
  vocabulary: [
    { 
      term: "Lift", 
      definition: "Temperature difference between condenser and evaporator. Lower lift = less energy required.", 
      salesHook: "Every 1°F reduction in lift saves 1-2% energy. Optimizing from 42°F to 48°F chilled water and 85°F to 75°F condenser water saves 15-20% immediately." 
    },
    { 
      term: "IPLV (Integrated Part-Load Value)", 
      definition: "Weighted efficiency at part-load conditions. Real-world efficiency metric.", 
      salesHook: "Don't just quote full-load efficiency. Legacy chillers have terrible IPLV (0.9 kW/ton). Modern magnetic-bearing chillers: 0.35 kW/ton IPLV. That's the real savings." 
    },
    { 
      term: "COP (Coefficient of Performance)", 
      definition: "Cooling output (BTU) divided by energy input (BTU). Higher = more efficient.", 
      salesHook: "Old chiller: 5.0 COP. New magnetic-bearing: 10.0 COP. Double the efficiency means half the energy." 
    },
    { 
      term: "kW/Ton", 
      definition: "Power input per ton of cooling. Lower = more efficient.", 
      salesHook: "Industry standard used to be 0.6-0.8 kW/ton. We're now installing 0.30-0.35 kW/ton systems. That's a 50%+ reduction." 
    },
    { 
      term: "Variable Primary Flow", 
      definition: "Chilled water pump runs at variable speed based on load.", 
      salesHook: "Saves 30-50% on pump energy. Required for modern high-efficiency systems." 
    },
  ],
  
  retrofitStrategy: {
    title: "Strategic Chiller Optimization",
    oldWay: { 
      title: "The 'Set It and Forget It' Approach", 
      desc: "Fixed setpoints, constant-speed operation, reactive maintenance.", 
      items: [
        "Fixed 42°F chilled water setpoint",
        "Constant-speed cooling tower fan",
        "No optimization sequencing",
        "Reactive maintenance (wait for failure)",
      ] 
    },
    newWay: { 
      title: "The Optimized Plant", 
      desc: "Dynamic setpoints, variable-speed everything, predictive optimization.", 
      items: [
        "Optimized chilled water reset (42-48°F based on load)",
        "VFD cooling tower fans",
        "Optimal chiller sequencing",
        "Predictive maintenance (monitor performance)",
        "Demand limiting during peak periods",
      ] 
    },
    utilityBenefit: { 
      title: "Why This Matters", 
      desc: "Chiller plants are the largest energy consumers. 15-30% optimization savings on a 1000-ton plant = $50k-100k/year. Plus peak demand reduction." 
    },
  },
  
  identificationGuide: [
    { feature: "Age", standard: "15-30 years old", highEff: "< 5 years old" },
    { feature: "Efficiency", standard: "0.65-0.85 kW/ton", highEff: "0.30-0.40 kW/ton" },
    { feature: "IPLV", standard: "0.85-1.0 kW/ton", highEff: "0.30-0.40 kW/ton" },
    { feature: "Controls", standard: "Pneumatic/Old digital", highEff: "Advanced BMS integration" },
    { feature: "Compressor", standard: "Fixed-speed, oil-lubricated", highEff: "Variable-speed, magnetic-bearing" },
    { feature: "Tower Fans", standard: "Constant-speed", highEff: "VFD variable-speed" },
    { feature: "Chilled Water Reset", standard: "Fixed 42°F", highEff: "42-48°F optimized reset" },
    { feature: "Condenser Water", standard: "Fixed 85°F", highEff: "75-80°F optimized reset" },
  ],

  bestPractices: {
    title: "Chiller Best Practices & Optimization Strategies",
    sections: [
      {
        heading: "Optimization vs Replacement Decision",
        content: "Most chiller efficiency gains come from optimization, not replacement. A 20-year-old chiller can often achieve 60-70% of new chiller efficiency through proper optimization. Always optimize first, then evaluate replacement if optimization isn't sufficient.",
        items: [
          "Optimize operating temperatures first (lift reduction saves 15-25% with zero capital cost)",
          "Implement VFDs on tower fans and pumps (30-50% savings on those components)",
          "Upgrade controls and sequencing (5-15% improvement from optimal operation)",
          "Evaluate chiller age and condition - <15 years old: optimize; >25 years: consider replacement",
          "Calculate optimization ROI first - often <2 year payback vs 5-10 years for replacement"
        ]
      },
      {
        heading: "Temperature Setpoint Optimization",
        content: "The single most impactful optimization is lift reduction through temperature setpoint adjustments. This requires no capital investment and provides immediate energy savings.",
        items: [
          "Raise chilled water setpoint from 42°F to 46-48°F (saves 5-10% energy)",
          "Lower condenser water setpoint from 85°F to 75-78°F (saves 5-10% energy)",
          "Implement reset strategies based on load and outdoor temperature",
          "Monitor and verify setpoints are actually being maintained",
          "Work with facilities staff - they often resist changing 'proven' setpoints"
        ]
      },
      {
        heading: "VFD Installation Strategy",
        content: "VFDs on cooling tower fans and chilled water pumps provide the best ROI of any chiller plant upgrade. Install VFDs before considering chiller replacement.",
        items: [
          "VFD on tower fan: 30-50% fan energy savings, enables optimal condenser water temp",
          "VFD on chilled water pump: 40-60% pump energy savings (if variable flow is possible)",
          "VFD on chiller compressor: 20-35% compressor savings (if not already variable-speed)",
          "Prioritize tower fan VFD first - biggest impact and lowest cost",
          "Ensure proper control strategy - maintain optimal temperatures, not just reduce speed"
        ]
      },
      {
        heading: "Maintenance & Commissioning",
        content: "Regular maintenance and proper commissioning can recover 5-15% efficiency that's been lost over time. This is free money - often the chiller just needs proper care.",
        items: [
          "Annual tube cleaning (fouled tubes reduce heat transfer efficiency)",
          "Refrigerant charge verification (over/under charge reduces efficiency)",
          "Calibrate sensors and controls (wrong readings lead to inefficient operation)",
          "Verify sequencing logic (multiple chillers operating sub-optimally)",
          "Check for air in system (reduces heat transfer, wastes energy)"
        ]
      }
    ]
  },

  roiAndLowHangingFruit: {
    typicalROI: [
      {
        project: "Lift Optimization (Setpoint Adjustment)",
        payback: "Immediate (zero cost)",
        annualSavings: "$15k-30k per chiller",
        notes: "500-ton chiller: Raise ChW 42°F→48°F, lower CondW 85°F→75°F. Saves 15-20% energy. No capital cost. Just need facilities staff buy-in."
      },
      {
        project: "VFD on Cooling Tower Fan",
        payback: "1-2 years",
        annualSavings: "$5k-15k per tower",
        notes: "30-50hp fan, 30-50% energy reduction. Also enables optimal condenser water temp, saving additional chiller energy (5-10%)."
      },
      {
        project: "VFD on Chilled Water Pump",
        payback: "2-4 years",
        annualSavings: "$10k-25k per pump",
        notes: "40-100hp pump, 40-60% energy reduction. Requires variable flow system design (not always possible with old systems)."
      },
      {
        project: "Chiller Controls Upgrade",
        payback: "3-5 years",
        annualSavings: "$5k-20k per chiller",
        notes: "Better sequencing, optimal loading, reset strategies. 5-15% efficiency improvement."
      },
      {
        project: "Full Chiller Replacement",
        payback: "8-12 years",
        annualSavings: "$50k-150k per chiller",
        notes: "500-ton chiller: 0.8 kW/ton → 0.35 kW/ton. $100k-500k installed cost. Only consider after optimization is exhausted."
      }
    ],
    lowHangingFruit: [
      {
        opportunity: "Adjust Chilled Water Setpoint",
        effort: "Low",
        savings: "5-10% energy reduction (free)",
        payback: "Immediate",
        description: "Raise setpoint from 42°F to 46-48°F. Most buildings can handle this. Zero cost, immediate savings. Often facilities staff resist - need to prove comfort won't be affected."
      },
      {
        opportunity: "Implement Condenser Water Reset",
        effort: "Low",
        savings: "5-10% energy reduction (free)",
        payback: "Immediate",
        description: "Lower condenser water setpoint based on load and ambient conditions. Target 75-78°F instead of fixed 85°F. Zero cost optimization."
      },
      {
        opportunity: "Clean Chiller Tubes",
        effort: "Low",
        savings: "5-15% efficiency recovery",
        payback: "Immediate",
        notes: "Fouled tubes reduce heat transfer. Annual cleaning is standard maintenance but often skipped. Low cost, immediate efficiency gain."
      },
      {
        opportunity: "VFD on Tower Fan",
        effort: "Medium",
        savings: "30-50% fan energy + 5-10% chiller energy",
        payback: "1-2 years",
        description: "Best ROI upgrade for chiller plants. Enables optimal condenser water temp control. Typical 30-50hp fan saves $5k-15k/year. Also improves chiller efficiency."
      },
      {
        opportunity: "Fix Chiller Sequencing",
        effort: "Low",
        savings: "5-10% efficiency improvement",
        payback: "Immediate",
        description: "Many plants run multiple chillers when one could handle load. Or run oversized chiller at low load (poor efficiency). Simple control fix."
      },
      {
        opportunity: "Verify Refrigerant Charge",
        effort: "Low",
        savings: "5-10% efficiency recovery",
        payback: "Immediate",
        description: "Over or under-charged refrigerant reduces efficiency. Quick check and adjustment. Standard maintenance that's often skipped."
      }
    ]
  },

  optimizationVsReplacement: {
    optimizationOpportunities: [
      "Lift reduction through setpoint optimization (15-25% savings, zero cost)",
      "VFD on cooling tower fan (30-50% fan savings + 5-10% chiller savings, 1-2 year payback)",
      "VFD on chilled water pump (40-60% pump savings, 2-4 year payback)",
      "Controls upgrade and optimal sequencing (5-15% improvement, 3-5 year payback)",
      "Regular maintenance and tube cleaning (5-15% efficiency recovery, low cost)",
      "Refrigerant charge verification and adjustment (5-10% recovery, immediate)",
      "Optimal chiller loading and sequencing (5-10% improvement, immediate)"
    ],
    whenToReplace: [
      "Chiller is >25 years old (diminishing returns on optimization)",
      "Multiple major component failures (compressor, tubes, controls - indicates end of life)",
      "Optimization has been exhausted and efficiency still poor (0.8+ kW/ton after optimization)",
      "Refrigerant phase-out requirements (R-22, R-123 systems need replacement)",
      "Building load has changed significantly (undersized or oversized chiller)",
      "Energy codes require higher efficiency (new construction, major renovation)"
    ],
    optimizationBenefits: "Lower upfront cost (often 10-20% of replacement cost), faster implementation, extends chiller life, maintains existing infrastructure. Most chillers can achieve 60-70% of new chiller efficiency through optimization. Best for chillers <20 years old.",
    replacementBenefits: "Maximum efficiency (0.30-0.40 kW/ton vs 0.65-0.85 kW/ton), eliminates ongoing maintenance issues, new warranty, modern controls, qualifies for utility rebates. Better long-term value for very old (>25 years) or severely degraded chillers. However, optimization should always be exhausted first."
  }
};

// Export enhanced data
export const chillerEnhancedData = enhancedChillerData;

