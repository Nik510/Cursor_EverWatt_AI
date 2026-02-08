/**
 * Cooling Tower Training Content
 * Comprehensive training material for cooling towers
 */

import type React from 'react';
import type { TechPageData } from './lighting-content';

export const coolingTowerContent: TechPageData = {
  title: "Cooling Towers",
  subtitle: "Rejecting heat efficiently. The unsung hero of chiller plant efficiency.",
  introduction: {
    whatItIs: "A cooling tower is a heat rejection device that removes waste heat from a building's condenser water loop and rejects it to the atmosphere through evaporative cooling. In a typical chiller plant, the chiller's condenser rejects heat to condenser water (heating it from 75°F to 85-95°F). This hot condenser water flows to the cooling tower, where it's sprayed over fill media (structures that maximize surface area) while air is drawn through by a fan. Water evaporates, absorbing latent heat and cooling the remaining water. The cooled water (70-85°F) returns to the chiller condenser. Cooling towers enable chillers to operate efficiently by maintaining low condenser water temperatures. They're the 'radiator' of commercial cooling systems - rejecting heat that the chiller extracts from the building. Without cooling towers (or in air-cooled systems), chillers would need to reject heat directly to hot outside air, requiring much more energy.",
    whereItIsSeen: [
      "Buildings with water-cooled chillers (office towers, hospitals, data centers)",
      "Large commercial facilities (over ~200 tons cooling capacity)",
      "Manufacturing facilities with process cooling",
      "Central plants serving multiple buildings",
      "Any facility with water-cooled HVAC equipment"
    ],
    typicalLocations: [
      "Rooftop installations (most common - easy access, no space constraints)",
      "Ground-level installations (parking lots, exterior areas near building)",
      "Mechanical penthouses (high-rise buildings, integrated with chiller plant)",
      "Connected to chiller condenser water loop (hot water in, cool water out)",
      "Often multiple towers in same location (staged capacity, redundancy)",
      "Fan on top (drawn-air) or bottom (forced-air) depending on design"
    ],
    keyConcepts: [
      "Approach: Temperature difference between leaving water and entering wet-bulb temperature. Lower approach = better efficiency. Standard tower: 7-10°F approach. High-efficiency: 3-5°F approach.",
      "Range: Temperature difference between entering and leaving water (typically 10-20°F). Range tells you how much heat is being rejected. Combined with approach, determines tower efficiency.",
      "Wet-Bulb Temperature: The lowest temperature achievable through evaporative cooling (depends on humidity). Cooling towers can cool water to within 5-10°F of wet-bulb. Lower wet-bulb (dry climates) = better tower performance = lower chiller lift.",
      "Fill Media: Plastic or metal structures that maximize water-to-air contact surface area. Old/damaged fill reduces efficiency. High-efficiency fill can improve approach by 5-10°F, saving 5-10% chiller energy.",
      "VFD on Tower Fan: Variable-speed fan control maintains optimal condenser water temperature. Saves 30-50% on fan energy. Lower condenser water temp also saves 5-15% on chiller energy. Double savings.",
      "Water Treatment: Proper chemical treatment prevents scaling, fouling, and biological growth. Poor treatment reduces efficiency and increases maintenance. Critical for optimal performance."
    ],
    whyItMatters: "Cooling towers directly impact chiller efficiency. Every 1°F reduction in condenser water temperature saves 1-2% chiller energy. A well-maintained, optimized tower can maintain 70-75°F condenser water (vs 85°F for a poorly maintained tower), saving 10-15% on chiller energy. On a 500-ton chiller consuming $96,000/year in energy, that's $10k-15k/year savings just from tower optimization. Plus, VFDs on tower fans save another 30-50% on fan energy (typically $2k-5k/year). Total tower optimization savings: $12k-20k/year. And these are low-cost measures - VFD installation, fill cleaning/replacement, water treatment optimization. It's 'free money' that most facilities ignore because cooling towers aren't 'sexy' equipment.",
    commonApplications: [
      "Water-cooled chiller plants (rejecting heat from chiller condensers)",
      "Process cooling applications (manufacturing, industrial)",
      "Data center cooling (maintaining optimal condenser water temperature)",
      "District cooling systems (central plants serving multiple buildings)",
      "Tower optimization retrofits (VFD installation, fill upgrades, water treatment)",
      "Maintenance and efficiency improvements (cleaning, balancing, optimization)"
    ]
  },
  chiefEngineerQuote: "Cooling towers are where efficiency lives and dies. A poorly maintained tower means your chiller works harder. Every 1°F reduction in condenser water temperature saves 1-2% chiller energy. A VFD on the tower fan? That's 30-50% fan energy savings. And if you're not maintaining those towers - cleaning, balancing water chemistry, replacing fill - you're throwing away efficiency every day. It's not sexy, but it's free money.",
  
  compressorTypes: [
    { 
      name: "Open Cooling Tower", 
      desc: "Direct contact with air, most common", 
      range: "70-85°F approach", 
      application: "Most commercial applications", 
      color: "blue" 
    },
    { 
      name: "Closed-Circuit Tower", 
      desc: "Isolated fluid loop, no contamination", 
      range: "75-90°F approach", 
      application: "Critical facilities, clean systems", 
      color: "emerald" 
    },
    { 
      name: "VFD Tower Fan", 
      desc: "Variable-speed fan control", 
      range: "30-50% fan savings", 
      application: "All tower applications", 
      color: "purple" 
    },
    { 
      name: "High-Efficiency Fill", 
      desc: "Enhanced heat transfer media", 
      range: "5-10°F better approach", 
      application: "Retrofit upgrades", 
      color: "indigo" 
    },
  ],

  compressorComparison: [
    {
      name: "Standard Tower (Constant Speed)",
      desc: "Traditional cooling tower with constant-speed fan",
      pros: [
        "Simple operation",
        "Low initial cost",
        "Reliable",
      ],
      cons: [
        "Constant fan power consumption",
        "No optimization",
        "Poor part-load efficiency",
        "Condenser water temp varies with load",
        "Higher chiller lift",
      ],
      bestFor: "Replacement target - add VFD",
      visualId: "Large fan on top, constant-speed motor, basic controls",
    },
    {
      name: "VFD-Controlled Tower",
      desc: "Variable-speed fan maintains optimal condenser water temperature",
      pros: [
        "30-50% fan energy savings",
        "Optimal condenser water temp",
        "Lower chiller lift",
        "Better part-load efficiency",
        "Reduced noise",
        "Soft start capability",
      ],
      cons: [
        "Higher initial cost (VFD)",
        "Requires proper control strategy",
      ],
      bestFor: "All new installations, most retrofits",
      visualId: "VFD controller visible, variable-speed fan, advanced controls",
    },
    {
      name: "High-Efficiency Tower",
      desc: "Enhanced fill media, optimized design",
      pros: [
        "Better heat transfer",
        "Lower approach temperature",
        "Smaller footprint possible",
        "Reduced water consumption",
      ],
      cons: [
        "Higher initial cost",
        "May require more maintenance",
      ],
      bestFor: "New installations, major replacements",
      visualId: "Modern design, enhanced fill visible, efficient distribution",
    },
  ],

  schematicTitle: "Cooling Tower: Heat Rejection Cycle",
  
  cycleSteps: [
    { 
      step: 1, 
      title: "Hot Water In", 
      text: "Hot condenser water (85-95°F) enters tower from chiller." 
    },
    { 
      step: 2, 
      title: "Heat Transfer", 
      text: "Water flows over fill media, exposing maximum surface area to air." 
    },
    { 
      step: 3, 
      title: "Evaporation", 
      text: "Water evaporates, rejecting latent heat. Fan draws air through tower." 
    },
    { 
      step: 4, 
      title: "Cool Water Out", 
      text: "Cooled water (70-85°F) returns to chiller condenser. Lower temp = lower chiller lift = less energy." 
    },
  ],
  
  tooltipData: {
    tower: { 
      title: "COOLING TOWER", 
      desc: "Rejects heat from condenser water to atmosphere via evaporation.", 
      stats: "Approach: 5-10°F | Range: 10-20°F", 
      style: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', borderColor: '#3b82f6' } 
    },
    fan: { 
      title: "FAN", 
      desc: "Draws air through tower. VFD controls speed to maintain optimal condenser water temperature.", 
      stats: "VFD Savings: 30-50% | Variable-speed capability", 
      style: { top: '20px', left: '50%', transform: 'translateX(-50%)', borderColor: '#22c55e' } 
    },
    fill: { 
      title: "FILL MEDIA", 
      desc: "Enhances heat transfer by maximizing water-to-air contact surface area.", 
      stats: "High-efficiency fill: 5-10°F better approach", 
      style: { top: '50%', left: '20px', borderColor: '#fbbf24' } 
    },
    condenser: { 
      title: "CONDENSER WATER", 
      desc: "Hot water from chiller (85-95°F) enters, cooled water (70-85°F) returns. Lower return temp = lower chiller lift.", 
      stats: "Target: 70-75°F | Optimal for chiller efficiency", 
      style: { bottom: '20px', left: '50%', transform: 'translateX(-50%)', borderColor: '#ef4444' } 
    },
  },
  
  realWorldImage: {
    src: "https://images.unsplash.com/photo-1607799279861-4e7d98d3d9e1?q=80&w=1000&auto=format&fit=crop",
    alt: "Cooling Tower Installation",
    caption: "Fig 1. Large cooling tower with variable-speed fan for optimal heat rejection efficiency."
  },
  
  vocabulary: [
    { 
      term: "Approach", 
      definition: "Temperature difference between leaving water and entering wet-bulb temperature.", 
      salesHook: "Lower approach = better efficiency. Standard tower: 7-10°F. High-efficiency: 3-5°F. That's the difference between good and great." 
    },
    { 
      term: "Range", 
      definition: "Temperature difference between entering and leaving water. Typically 10-20°F.", 
      salesHook: "Range tells you how much heat is being rejected. Combined with approach, this determines tower efficiency." 
    },
    { 
      term: "Wet-Bulb Temperature", 
      definition: "Lowest temperature achievable through evaporative cooling. Depends on humidity.", 
      salesHook: "Cooling towers can cool water to within 5-10°F of wet-bulb. The lower the wet-bulb, the better your chiller efficiency." 
    },
    { 
      term: "Fill Media", 
      definition: "Plastic or metal structures that increase water-to-air contact surface area.", 
      salesHook: "Old fill gets clogged, reduces efficiency. High-efficiency fill can improve approach by 5-10°F. That's a 5-10% chiller energy savings." 
    },
    { 
      term: "Drift", 
      definition: "Water droplets carried away by air stream. Should be minimized (< 0.002%).", 
      salesHook: "Drift eliminators are critical. Lost water is lost money, plus you're wasting treatment chemicals." 
    },
  ],
  
  retrofitStrategy: {
    title: "Cooling Tower Optimization",
    oldWay: { 
      title: "Set It and Forget It", 
      desc: "Constant-speed operation, reactive maintenance, poor control.", 
      items: [
        "Constant-speed fan",
        "No optimization",
        "Reactive maintenance",
        "Poor water chemistry",
        "Clogged/damaged fill",
        "High condenser water temp",
      ] 
    },
    newWay: { 
      title: "Optimized Tower Operation", 
      desc: "Variable-speed control, preventive maintenance, optimal chemistry.", 
      items: [
        "VFD on tower fan",
        "Optimal condenser water temp control",
        "Regular fill cleaning/replacement",
        "Proper water chemistry",
        "Drift eliminator maintenance",
        "Lower chiller lift = less energy",
      ] 
    },
    utilityBenefit: { 
      title: "Double Savings", 
      desc: "VFD saves 30-50% on tower fan energy. Lower condenser water temp saves 5-15% on chiller energy. Both stack." 
    },
  },
  
  identificationGuide: [
    { feature: "Fan Control", standard: "Constant-speed", highEff: "VFD variable-speed" },
    { feature: "Approach", standard: "7-10°F", highEff: "3-5°F" },
    { feature: "Fill Condition", standard: "Clogged/damaged", highEff: "Clean, high-efficiency" },
    { feature: "Water Treatment", standard: "Reactive", highEff: "Preventive, optimized" },
    { feature: "Fan Energy", standard: "100% constant", highEff: "50-70% average (VFD)" },
  ],

  bestPractices: {
    title: "Cooling Tower Best Practices & Optimization Strategies",
    sections: [
      {
        heading: "Optimization vs Replacement Decision",
        content: "Most cooling tower efficiency gains come from optimization, not replacement. A well-maintained, optimized tower can achieve 90-95% of new tower efficiency. Focus on VFD installation, fill maintenance/upgrade, and water treatment optimization before considering replacement.",
        items: [
          "Optimize first: VFD on fan (30-50% fan savings + 5-10% chiller savings), fill cleaning/replacement, water treatment",
          "Replacement only if: Tower is severely damaged, undersized for load, or >30 years old with poor efficiency",
          "VFD installation provides biggest ROI - enables optimal condenser water temp, saves fan and chiller energy",
          "Fill maintenance is critical - clogged or damaged fill reduces efficiency by 10-20%",
          "Water treatment optimization prevents scaling/fouling, maintains efficiency"
        ]
      },
      {
        heading: "VFD on Tower Fan Strategy",
        content: "VFD on cooling tower fan is the single most impactful optimization. Variable-speed control maintains optimal condenser water temperature based on load and wet-bulb conditions. Saves 30-50% on fan energy AND 5-10% on chiller energy (by maintaining lower condenser water temp).",
        items: [
          "Install VFD to maintain optimal condenser water temp (typically 70-75°F vs 85°F fixed)",
          "Control based on load and wet-bulb - reduce fan speed in cool weather, increase in hot weather",
          "Set minimum speed (typically 30-40%) to maintain proper water distribution",
          "VFD enables lower condenser water temp = lower chiller lift = less chiller energy",
          "Typical 50hp fan: $7,500 VFD, saves $5k-10k/year fan energy + $5k-10k/year chiller energy"
        ]
      },
      {
        heading: "Fill Media Maintenance and Upgrade",
        content: "Fill media maximizes water-to-air contact surface area. Clogged, damaged, or outdated fill reduces efficiency significantly. High-efficiency fill can improve approach by 5-10°F, saving 5-10% chiller energy.",
        items: [
          "Clean fill annually - remove scale, debris, and biological growth",
          "Replace damaged fill - broken or collapsed fill reduces efficiency",
          "Upgrade to high-efficiency fill - modern fill designs improve approach by 5-10°F",
          "Verify fill condition - inspect for clogging, damage, or deterioration",
          "Fill replacement typically pays back in 2-3 years from chiller energy savings"
        ]
      },
      {
        heading: "Water Treatment and Maintenance",
        content: "Proper water treatment prevents scaling, fouling, and biological growth that reduce tower efficiency. Reactive treatment (only when problems occur) is less effective than preventive treatment. Optimize chemical treatment program for maximum efficiency.",
        items: [
          "Implement preventive water treatment - regular chemical addition, not reactive",
          "Monitor water chemistry - pH, alkalinity, conductivity, biological counts",
          "Blowdown control - remove concentrated water to prevent scaling (optimize blowdown rate)",
          "Periodic cleaning - remove scale and fouling from fill, basin, and heat transfer surfaces",
          "Proper treatment prevents 5-10% efficiency loss from fouling/scaling"
        ]
      }
    ]
  },

  roiAndLowHangingFruit: {
    typicalROI: [
      {
        project: "VFD on Cooling Tower Fan",
        payback: "1-2 years",
        annualSavings: "$10k-20k per tower",
        notes: "50hp fan, 30-50% fan energy savings ($5k-10k/year) plus 5-10% chiller energy savings ($5k-10k/year). VFD cost: $7,500. Double savings from one upgrade."
      },
      {
        project: "Fill Media Cleaning/Replacement",
        payback: "2-3 years",
        annualSavings: "$5k-10k per tower",
        notes: "Clean or replace clogged/damaged fill. Improves approach by 5-10°F, saves 5-10% chiller energy. Fill replacement cost: $15k-30k. Pays back in 2-3 years."
      },
      {
        project: "High-Efficiency Fill Upgrade",
        payback: "3-5 years",
        annualSavings: "$8k-15k per tower",
        notes: "Replace old fill with high-efficiency fill. Improves approach by 5-10°F, saves 5-10% chiller energy. Upgrade cost: $25k-50k. Pays back in 3-5 years."
      },
      {
        project: "Water Treatment Optimization",
        payback: "< 1 year",
        annualSavings: "$3k-8k per tower",
        notes: "Preventive water treatment program. Prevents 5-10% efficiency loss from fouling/scaling. Annual cost: $3k-5k. Immediate efficiency recovery."
      },
      {
        project: "Complete Tower Optimization Package",
        payback: "2-3 years",
        annualSavings: "$20k-40k per tower",
        notes: "VFD + fill upgrade + water treatment optimization. Combined savings. Package cost: $50k-80k. Comprehensive improvement."
      }
    ],
    lowHangingFruit: [
      {
        opportunity: "VFD on Tower Fan",
        effort: "Medium",
        savings: "30-50% fan + 5-10% chiller energy",
        payback: "1-2 years",
        description: "Highest ROI cooling tower upgrade. Maintains optimal condenser water temp, saving both fan and chiller energy. Typical 50hp fan: $7,500 VFD, saves $10k-20k/year combined."
      },
      {
        opportunity: "Fill Media Cleaning",
        effort: "Low",
        savings: "5-10% chiller energy recovery",
        payback: "< 1 year",
        notes: "Remove scale, debris, and biological growth from fill. Restores efficiency lost to fouling. Annual cleaning cost: $2k-5k. Immediate efficiency gain."
      },
      {
        opportunity: "Water Treatment Optimization",
        effort: "Low",
        savings: "5-10% efficiency recovery",
        payback: "< 1 year",
        description: "Implement preventive water treatment program. Prevents fouling and scaling that reduces efficiency. Annual cost: $3k-5k. Immediate efficiency recovery."
      },
      {
        opportunity: "Condenser Water Reset Optimization",
        effort: "Low",
        savings: "5-10% chiller energy",
        payback: "Immediate (free)",
        description: "Optimize condenser water setpoint based on load and wet-bulb. Lower setpoint in cool weather. Enables lower chiller lift. Free optimization."
      },
      {
        opportunity: "Tower Balancing and Flow Verification",
        effort: "Low",
        savings: "5-10% efficiency recovery",
        payback: "< 1 year",
        description: "Verify proper water distribution and air flow. Balance multiple cells. Ensure optimal operation. Low cost service ($2k-5k). Recovers lost efficiency."
      }
    ]
  },

  optimizationVsReplacement: {
    optimizationOpportunities: [
      "VFD on tower fan (30-50% fan savings + 5-10% chiller savings, 1-2 year payback)",
      "Fill media cleaning/replacement (5-10% chiller savings, 2-3 year payback)",
      "Water treatment optimization (5-10% efficiency recovery, <1 year payback)",
      "Condenser water reset optimization (5-10% chiller savings, free)",
      "Tower balancing and flow verification (5-10% efficiency recovery, low cost)",
      "High-efficiency fill upgrade (5-10% chiller savings, 3-5 year payback)"
    ],
    whenToReplace: [
      "Tower is severely damaged or structurally unsound",
      "Tower is significantly undersized for current load",
      "Tower is >30 years old and efficiency improvements are exhausted",
      "Multiple major components need replacement (cost approaches new tower)",
      "New tower design provides significant efficiency improvement unavailable through optimization"
    ],
    optimizationBenefits: "Much lower cost (10-30% of replacement cost), faster implementation (weeks vs months), maintains existing infrastructure, extends tower life. Most towers can achieve 90-95% of new tower efficiency through optimization. Best for towers <25 years old or when seeking incremental improvements.",
    replacementBenefits: "Maximum efficiency (newer designs may have better fill, controls, or materials), eliminates structural/maintenance issues, new warranty, modern controls. However, optimization provides 90% of benefits at 20% of cost. Only replace if tower is severely damaged, undersized, or >30 years old with poor efficiency after optimization attempts."
  }
};

