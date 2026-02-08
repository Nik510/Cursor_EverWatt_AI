/**
 * VRF Training Content
 * Variable Refrigerant Flow systems training
 */

import type React from 'react';
import type { TechPageData } from './lighting-content';

export const vrfContent: TechPageData = {
  title: "VRF / VRV Heat Pump Systems",
  subtitle: "Zone-level comfort with central efficiency. The modern approach to HVAC.",
  introduction: {
    whatItIs: "VRF (Variable Refrigerant Flow) or VRV (Variable Refrigerant Volume) is an advanced HVAC technology that provides zone-level heating and cooling using refrigerant as the heat transfer medium instead of water or air. A single outdoor condensing unit connects via small refrigerant pipes to multiple indoor units (ceiling cassettes, wall-mounted, ducted), each serving a different zone. The system varies refrigerant flow to match each zone's exact demand. Heat Recovery VRF systems can simultaneously heat some zones while cooling others, transferring heat between zones for maximum efficiency. Think of it as 'multiple split systems in one efficient package' with the ability to transfer energy between zones.",
    whereItIsSeen: [
      "Office buildings (zone-level control, simultaneous heating/cooling needs)",
      "Hotels and hospitality (individual room control, quiet operation)",
      "Schools and universities (classroom-level control, varying schedules)",
      "Retail stores (different zones, display areas, offices)",
      "Healthcare facilities (patient rooms, offices, procedure rooms)",
      "Mid-rise residential buildings (condos, apartments)",
      "Buildings replacing gas RTUs or furnaces (electrification)"
    ],
    typicalLocations: [
      "Outdoor units on roof or ground level (condensing units, similar to traditional RTUs)",
      "Indoor units in occupied spaces (ceiling cassettes, wall-mounted units, concealed ducted units)",
      "Refrigerant piping running through building (small-diameter copper pipes, smaller than water pipes)",
      "Control panels and zone controllers (wall-mounted, wireless remotes, building management system integration)",
      "Typically multiple indoor units per outdoor unit (2-40+ zones per outdoor unit)"
    ],
    keyConcepts: [
      "COP (Coefficient of Performance): Heating or cooling output / electrical input. VRF achieves COP 4.5-6.0 at part-load (vs 0.95 AFUE for gas = 4-6x more efficient for heating).",
      "Heat Recovery: 3-pipe system allows simultaneous heating and cooling. Heat from cooling zones transfers to heating zones (50-70% transfer efficiency). This is the 'killer feature' that traditional systems can't match.",
      "Variable Capacity: Compressor adjusts output to match total load across all zones. No wasted energy on unoccupied or satisfied zones. Most systems operate at 40-60% capacity most of the time.",
      "Zone-Level Control: Each indoor unit independently controls temperature for its zone. Perfect for buildings with varying schedules and loads. No more over-cooling or over-heating to compensate for problem zones.",
      "Part-Load Efficiency: VRF excels at part-load operation (80% of operating time). Traditional systems lose efficiency at part-load. VRF maintains high COP (4.5-6.0) even at 30% load.",
      "Electrification: VRF provides both heating and cooling electrically, replacing gas furnaces/boilers. Qualifies for utility electrification rebates. Zero on-site emissions."
    ],
    whyItMatters: "VRF systems provide 30-50% energy savings compared to traditional HVAC systems, especially at part-load operation. A typical office building replacing gas RTUs with VRF heat recovery can save $40,000-80,000 per year on energy costs. Plus, the ability to simultaneously heat and cool different zones (heat recovery) provides comfort and efficiency that traditional systems can't match. For electrification projects, VRF heat pumps replace gas heating with 4-6x more efficient electric heating (COP 4.5-6.0 vs 0.95 AFUE), qualifying for significant utility rebates. The zone-level control improves occupant comfort and eliminates the 'hot zone/cold zone' problems common with traditional systems.",
    commonApplications: [
      "Office building HVAC retrofits (replace multiple RTUs with one VRF system)",
      "Gas-to-electric conversions (replace gas furnaces/RTUs with VRF heat pumps)",
      "New construction with zone-level control requirements",
      "Buildings with simultaneous heating/cooling needs (perimeter vs interior zones)",
      "Retrofit projects requiring individual room/zone control",
      "Electrification projects (utility rebate programs)"
    ]
  },
  chiefEngineerQuote: "VRF is not just an HVAC system - it's a paradigm shift. Each zone gets exactly what it needs, when it needs it. Simultaneous heating and cooling means one zone can heat while another cools, transferring energy between zones. At part load (which is 80% of operating time), VRF systems achieve COP 5.0-6.0. That's 50% better than traditional systems. If you're replacing gas RTUs or furnaces, VRF is the electrification play.",
  
  compressorTypes: [
    { 
      name: "VRF Heat Pump", 
      desc: "Can heat or cool, but not simultaneously", 
      range: "COP 3.5-5.0", 
      application: "Small-medium buildings, single zone", 
      color: "blue" 
    },
    { 
      name: "VRF Heat Recovery", 
      desc: "Simultaneous heating and cooling", 
      range: "COP 4.5-6.0", 
      application: "Medium-large buildings, multiple zones", 
      color: "emerald" 
    },
    { 
      name: "VRF Air-Cooled", 
      desc: "Outdoor units, no water loop", 
      range: "COP 3.0-4.5", 
      application: "Most applications, roof-mounted", 
      color: "purple" 
    },
    { 
      name: "VRF Water-Cooled", 
      desc: "Water loop connection, higher efficiency", 
      range: "COP 4.5-6.0", 
      application: "Large buildings, central plants", 
      color: "indigo" 
    },
  ],

  schematicTitle: "VRF System: Simultaneous Heating & Cooling",
  
  cycleSteps: [
    { 
      step: 1, 
      title: "Zone Demand", 
      text: "Each zone calls for heating or cooling independently. System responds to actual need." 
    },
    { 
      step: 2, 
      title: "Heat Recovery", 
      text: "Heat from cooling zones transfers to heating zones. Energy recycling = efficiency." 
    },
    { 
      step: 3, 
      title: "Variable Capacity", 
      text: "Compressor adjusts output to match total load. No wasted energy on unoccupied zones." 
    },
    { 
      step: 4, 
      title: "Savings", 
      text: "30-50% energy savings vs. traditional systems, especially at part load." 
    },
  ],
  
  tooltipData: {
    outdoor: { 
      title: "OUTDOOR UNIT", 
      desc: "Variable-speed compressor, multiple modules for capacity. Air or water-cooled.", 
      stats: "Capacity: 5-60 tons | Variable-speed compressor", 
      style: { top: '20px', left: '50%', transform: 'translateX(-50%)', borderColor: '#3b82f6' } 
    },
    indoor: { 
      title: "INDOOR UNITS", 
      desc: "Ceiling cassettes, wall-mounted, ducted. Each zone independently controlled.", 
      stats: "Types: Ceiling, Wall, Ducted | Individual control", 
      style: { bottom: '20px', left: '20px', borderColor: '#60a5fa' } 
    },
    refrigerant: { 
      title: "REFRIGERANT PIPING", 
      desc: "Small-diameter refrigerant lines connect outdoor to indoor units.", 
      stats: "Smaller than water pipes | Flexible routing", 
      style: { top: '50%', right: '20px', borderColor: '#fbbf24' } 
    },
    heatRecovery: { 
      title: "HEAT RECOVERY", 
      desc: "3-pipe system allows simultaneous heating and cooling, transferring energy between zones.", 
      stats: "Energy transfer efficiency: 50-70%", 
      style: { bottom: '20px', right: '20px', borderColor: '#ef4444' } 
    },
  },
  
  realWorldImage: {
    src: "https://images.unsplash.com/photo-1560452992-8ff52d9f0fc8?q=80&w=1000&auto=format&fit=crop",
    alt: "VRF System Installation",
    caption: "Fig 1. VRF outdoor condensing units on rooftop with refrigerant distribution to multiple indoor units."
  },
  
  vocabulary: [
    { 
      term: "VRF / VRV", 
      definition: "Variable Refrigerant Flow / Variable Refrigerant Volume. Capacity varies to match load.", 
      salesHook: "Unlike traditional on/off systems, VRF runs continuously at exactly the right capacity. No wasted energy." 
    },
    { 
      term: "Heat Recovery", 
      definition: "3-pipe system allowing simultaneous heating and cooling by transferring heat between zones.", 
      salesHook: "Zone A needs cooling while Zone B needs heating? VRF transfers the heat. That's efficiency you can't get with traditional systems." 
    },
    { 
      term: "COP (Coefficient of Performance)", 
      definition: "Heating or cooling output divided by energy input. VRF achieves 4.5-6.0 at part load.", 
      salesHook: "Gas furnace: 0.95 AFUE. VRF heat pump: 4.5 COP. That's 4x more efficient for heating. Electrification pays." 
    },
    { 
      term: "Part-Load Factor", 
      definition: "Efficiency multiplier at part-load conditions. VRF excels here (1.1-1.3x multiplier).", 
      salesHook: "Buildings operate at part-load 80% of the time. VRF's part-load efficiency advantage means real-world savings of 30-50%." 
    },
    { 
      term: "Zone Control", 
      definition: "Individual temperature control per zone without multiple systems.", 
      salesHook: "One VRF system replaces 10 RTUs, each with their own compressor. One efficient compressor vs. 10 less-efficient ones." 
    },
  ],
  
  retrofitStrategy: {
    title: "VRF: The Electrification Play",
    oldWay: { 
      title: "Traditional Gas Systems", 
      desc: "Gas RTUs, furnaces, separate cooling. Inefficient and emissions-heavy.", 
      items: [
        "Gas RTUs (80% AFUE)",
        "Gas furnaces (80-85% AFUE)",
        "Separate AC systems",
        "Zone control limitations",
        "High emissions",
      ] 
    },
    newWay: { 
      title: "VRF Electrification", 
      desc: "Single efficient system for heating and cooling. Electric, no emissions.", 
      items: [
        "VRF heat recovery system",
        "COP 4.5-6.0 (vs 0.95 for gas)",
        "Simultaneous heating/cooling",
        "Zone-level control",
        "Zero on-site emissions",
        "Qualifies for electrification rebates",
      ] 
    },
    utilityBenefit: { 
      title: "PG&E Electrification Priority", 
      desc: "Replacing gas heating with VRF heat pumps is a top priority for utilities. Rebates can cover 30-50% of project cost." 
    },
  },
  
  identificationGuide: [
    { feature: "System Type", standard: "Gas RTU + Separate AC", highEff: "VRF Heat Recovery" },
    { feature: "Efficiency (Heating)", standard: "0.80-0.85 AFUE (gas)", highEff: "4.5-6.0 COP (VRF)" },
    { feature: "Zoning", standard: "Limited by RTU count", highEff: "Unlimited zones per system" },
    { feature: "Operation", standard: "On/Off cycling", highEff: "Variable capacity, continuous" },
    { feature: "Emissions", standard: "On-site CO₂, NOx", highEff: "Zero on-site emissions" },
  ],

  bestPractices: {
    title: "VRF Best Practices & Optimization Strategies",
    sections: [
      {
        heading: "Optimization vs Replacement Decision",
        content: "VRF systems are relatively new technology (most installed <15 years old), so optimization opportunities are limited. However, existing VRF systems can often be optimized through controls, zoning adjustments, and proper maintenance. For buildings with old gas RTUs or furnaces, VRF replacement provides massive efficiency gains (4-6x for heating).",
        items: [
          "Optimize existing VRF: Controls upgrades, proper zoning, maintenance (5-15% improvement possible)",
          "VRF replacement for gas RTUs: 4-6x heating efficiency gain (0.85 AFUE → 4.5-6.0 COP), 30-50% cooling savings",
          "Evaluate heat recovery capability - simultaneous heating/cooling can save 20-30% vs separate systems",
          "Check for proper zoning - over-zoning or under-zoning reduces efficiency",
          "VRF is ideal for buildings with varying schedules and simultaneous heating/cooling needs"
        ]
      },
      {
        heading: "Controls and Zoning Optimization",
        content: "Proper controls and zoning are critical for VRF efficiency. Over-zoning wastes energy, under-zoning reduces comfort. Optimize zone boundaries and schedules for maximum efficiency.",
        items: [
          "Review zone boundaries - combine rarely-used adjacent zones, separate zones with different schedules",
          "Implement occupancy-based controls - reduce capacity in unoccupied zones (20-30% savings)",
          "Optimize setpoint schedules - avoid unnecessary heating/cooling during unoccupied hours",
          "Integrate with BMS for optimal coordination across building systems",
          "Verify heat recovery operation - ensure 3-pipe systems are transferring heat between zones"
        ]
      },
      {
        heading: "Heat Recovery Strategy",
        content: "The 'killer feature' of VRF is heat recovery - simultaneously heating some zones while cooling others, transferring energy between zones. This provides 20-30% additional savings beyond the base efficiency gain.",
        items: [
          "Identify buildings with simultaneous heating/cooling needs (perimeter vs interior zones)",
          "3-pipe heat recovery systems transfer 50-70% of rejected heat to heating zones",
          "Plan zone layout to maximize heat recovery opportunities",
          "Monitor heat recovery operation - verify system is actually transferring heat between zones",
          "Heat recovery can eliminate need for separate heating system in many applications"
        ]
      },
      {
        heading: "Maintenance and Commissioning",
        content: "VRF systems require proper maintenance to maintain efficiency. Dirty coils, refrigerant leaks, and poor commissioning can reduce efficiency by 10-20%.",
        items: [
          "Regular coil cleaning (indoor and outdoor units)",
          "Refrigerant charge verification (under/over charge reduces efficiency)",
          "Filter replacement (dirty filters reduce airflow and efficiency)",
          "Verify proper commissioning - incorrect refrigerant piping or controls setup reduces efficiency",
          "Check for refrigerant leaks (environmental and efficiency concern)"
        ]
      }
    ]
  },

  roiAndLowHangingFruit: {
    typicalROI: [
      {
        project: "Gas RTU → VRF Heat Pump Replacement",
        payback: "5-8 years (3-5 years with rebates)",
        annualSavings: "$40k-80k per building",
        notes: "50,000 sq ft office: Replace 10 gas RTUs (200k BTU each) with VRF. Gas cost: $80k/year → Electric: $20k/year. $60k savings. $300k-400k installed cost. With PG&E rebates ($500/ton): $150k-200k net cost. 3-5 year payback."
      },
      {
        project: "VRF Controls Optimization",
        payback: "1-2 years",
        annualSavings: "$5k-15k per system",
        notes: "Optimize zoning, schedules, and occupancy controls. 10-20% efficiency improvement. Low cost upgrade ($10k-30k)."
      },
      {
        project: "Gas Furnace → VRF Heat Pump (Electrification)",
        payback: "4-7 years (with rebates)",
        annualSavings: "$15k-30k per building",
        notes: "Mid-rise residential or small commercial. Replace gas furnace (80% AFUE) with VRF (4.5-6.0 COP). 4-6x heating efficiency. Qualifies for electrification rebates. $100k-200k installed, $50k-100k after rebates."
      },
      {
        project: "Add Heat Recovery to VRF System",
        payback: "2-4 years",
        annualSavings: "$10k-20k per system",
        notes: "Upgrade 2-pipe to 3-pipe system for heat recovery. 20-30% additional savings when simultaneous heating/cooling occurs. $40k-80k upgrade cost."
      },
      {
        project: "VRF Maintenance Program",
        payback: "< 1 year",
        annualSavings: "$3k-8k per system (efficiency recovery)",
        notes: "Regular maintenance recovers 10-20% efficiency lost to dirty coils, improper charge, etc. Annual cost: $2k-5k. Immediate efficiency gain."
      }
    ],
    lowHangingFruit: [
      {
        opportunity: "Optimize Zone Setpoints",
        effort: "Low",
        savings: "10-15% energy reduction",
        payback: "Immediate (free)",
        description: "Review and adjust zone setpoints. Eliminate unnecessary heating/cooling. Implement setback schedules. Often facilities staff have zones set too cold/hot for comfort."
      },
      {
        opportunity: "Implement Occupancy-Based Controls",
        effort: "Low",
        savings: "20-30% in unoccupied zones",
        payback: "< 1 year",
        notes: "Add occupancy sensors or schedule-based setback. Reduces capacity in unoccupied zones. Low cost upgrade ($5k-15k per system)."
      },
      {
        opportunity: "Optimize Zone Boundaries",
        effort: "Low",
        savings: "5-10% efficiency improvement",
        payback: "Immediate (free)",
        description: "Review zone layout. Combine rarely-used adjacent zones. Separate zones with different schedules or loads. Simple controls adjustment."
      },
      {
        opportunity: "VRF Maintenance Program",
        effort: "Low",
        savings: "10-20% efficiency recovery",
        payback: "< 1 year",
        description: "Coil cleaning, filter replacement, refrigerant charge check. Recovers efficiency lost to poor maintenance. Annual cost: $2k-5k."
      },
      {
        opportunity: "Verify Heat Recovery Operation",
        effort: "Low",
        savings: "Identifies 20-30% opportunity",
        payback: "Immediate",
        description: "Check if 3-pipe systems are actually transferring heat between zones. If not operating, repair enables 20-30% savings when simultaneous heating/cooling occurs."
      },
      {
        opportunity: "Replace Gas RTUs with VRF (Electrification)",
        effort: "High",
        savings: "40-60% total energy savings",
        payback: "5-8 years (3-5 with rebates)",
        description: "Biggest opportunity for buildings with old gas RTUs. VRF provides 4-6x heating efficiency and 30-50% cooling savings. Qualifies for significant utility rebates. Best ROI for electrification projects."
      }
    ]
  },

  optimizationVsReplacement: {
    optimizationOpportunities: [
      "Controls optimization (zone setpoints, schedules, occupancy) - 10-20% savings, low cost",
      "Zone boundary optimization (combine/separate zones as needed) - 5-10% improvement, free",
      "Maintenance program (coil cleaning, refrigerant charge) - 10-20% efficiency recovery, low cost",
      "Heat recovery verification/repair (if 3-pipe system) - 20-30% savings when operating, low cost",
      "BMS integration for optimal coordination - 5-10% improvement, medium cost"
    ],
    whenToReplace: [
      "Building has gas RTUs or furnaces (VRF provides 4-6x heating efficiency, 30-50% cooling savings)",
      "Electrification goals require eliminating gas (VRF heat pumps qualify for rebates)",
      "Multiple zones with varying schedules and loads (VRF provides superior zone control)",
      "Simultaneous heating/cooling needs (VRF heat recovery provides unique capability)",
      "Old HVAC system is >20 years old and inefficient (VRF provides 30-50% total savings)",
      "Building requires zone-level control but has limited RTU locations (VRF uses small refrigerant pipes)"
    ],
    optimizationBenefits: "Lower cost (10-20% of replacement cost), faster implementation (weeks vs months), extends system life, maintains existing infrastructure. Best for VRF systems <10 years old or when seeking incremental improvements.",
    replacementBenefits: "Maximum efficiency (4-6x heating efficiency vs gas, 30-50% cooling savings), eliminates gas dependency (electrification), superior zone control, simultaneous heating/cooling capability, qualifies for utility rebates. Better long-term value for buildings with gas heating or old inefficient systems. Best ROI when replacing gas RTUs or furnaces."
  }
};

