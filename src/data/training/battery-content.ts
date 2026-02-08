/**
 * Battery Storage Training Content
 * Battery energy storage systems training
 */

import type React from 'react';
import type { TechPageData } from './lighting-content';

export const batteryContent: TechPageData = {
  title: "Battery Energy Storage Systems (BESS)",
  subtitle: "Peak shaving, demand charge reduction, and grid services. The future of commercial energy management.",
  introduction: {
    whatItIs: "Battery Energy Storage Systems (BESS) are large-scale battery installations that store electrical energy for later use. While batteries are commonly associated with backup power (UPS systems), commercial BESS systems are primarily used for 'peak shaving' - discharging during peak demand periods to reduce the building's maximum power draw from the grid. Demand charges (billed per kW of peak demand) are often the highest cost line item on commercial energy bills. By discharging batteries during peak periods, facilities can 'shave' their peak demand, reducing demand charges. Modern BESS systems also provide energy arbitrage (charge during low-cost periods, discharge during high-cost periods) and can participate in grid services programs. Systems range from 50kW/100kWh (small commercial) to multi-megawatt installations (large facilities, microgrids).",
    whereItIsSeen: [
      "Commercial buildings with high demand charges ($500+/kW/month)",
      "Manufacturing facilities (high peak demand, demand charges dominate costs)",
      "Data centers (critical backup power + peak shaving)",
      "Hospitals and healthcare (backup power + demand management)",
      "Retail and grocery stores (refrigeration creates peak loads)",
      "Office buildings with high peak demand",
      "Microgrid installations (islanding capability, grid services)"
    ],
    typicalLocations: [
      "Ground-mounted containers or prefabricated enclosures (most common)",
      "Parking lots or exterior areas (easy access, ventilation)",
      "Mechanical rooms or basements (smaller systems, requires fire suppression)",
      "Rooftop installations (limited by weight and access)",
      "Adjacent to electrical service entrance (minimizes wiring losses)",
      "Often co-located with solar PV systems (charge from solar, discharge for peak shaving)"
    ],
    keyConcepts: [
      "Peak Shaving: Battery discharges during peak demand periods (usually 2-4 hours) to reduce maximum kW draw. Reduces demand charges, which are billed on the highest 15-minute average kW each month.",
      "Round-Trip Efficiency: Energy output / Energy input (typically 85-95% for lithium-ion). Accounts for losses during charging and discharging. 95% efficiency means 100kWh stored = 95kWh available.",
      "C-Rate: Discharge rate relative to capacity. 1C = full capacity discharged in 1 hour. 0.5C = full capacity in 2 hours. Higher C-rate = more power (kW) from same capacity (kWh). Critical for peak shaving (need high power for short duration).",
      "State of Charge (SOC): Percentage of battery capacity currently stored. Typically operated between 10-90% SOC to maximize battery life. This is your 'usable capacity' (80% of nameplate).",
      "Demand Charge Economics: Demand charges range from $5-30/kW/month. Shaving 100kW at $20/kW/month = $2,000/month = $24,000/year savings. This is where BESS pays for itself.",
      "Energy Arbitrage: Charge during low-cost periods (off-peak, night), discharge during high-cost periods (on-peak, afternoon). Less common than peak shaving, but adds value."
    ],
    whyItMatters: "Demand charges are often the highest cost line item on commercial energy bills, especially for facilities with high peak demand. A typical commercial facility might have a 500kW peak demand and pay $20/kW/month in demand charges = $10,000/month = $120,000/year just in demand charges. A 250kW/500kWh battery system that shaves 200kW consistently saves $48,000/year. System cost: $300,000. Payback: 6 years. Plus, batteries provide backup power (critical for some facilities), can participate in demand response programs for additional revenue, and future-proof facilities for time-of-use rates and grid services. As battery costs continue to decrease, payback periods are getting shorter, making BESS one of the fastest-growing energy technologies.",
    commonApplications: [
      "Peak shaving for demand charge reduction (primary application)",
      "Backup power for critical facilities (hospitals, data centers)",
      "Energy arbitrage (charge low, discharge high - less common)",
      "Solar + storage (charge from solar, discharge for peak shaving or after sunset)",
      "Demand response participation (utility pays for load reduction)",
      "Grid services (frequency regulation, capacity - future revenue stream)"
    ]
  },
  chiefEngineerQuote: "Batteries aren't just for backup anymore. Peak shaving is where the money is. A $2,000/kW demand charge means shaving 100kW saves $200,000/year. A 1MWh battery system might cost $500k, but if it shaves 250kW consistently, that's $500k/year savings. 1-year payback. It's not magic - it's physics, it's economics, and it's happening now.",
  
  compressorTypes: [
    { 
      name: "Lithium-Ion", 
      desc: "Most common, high energy density", 
      range: "85-95% round-trip efficiency", 
      application: "Most commercial applications", 
      color: "blue" 
    },
    { 
      name: "Flow Battery", 
      desc: "Long duration, deep discharge", 
      range: "70-85% efficiency", 
      application: "Long-duration storage, 4+ hours", 
      color: "purple" 
    },
    { 
      name: "Sodium-Ion", 
      desc: "Emerging technology, lower cost", 
      range: "80-90% efficiency", 
      application: "Cost-sensitive applications", 
      color: "emerald" 
    },
  ],

  schematicTitle: "Peak Shaving Strategy: Demand Charge Reduction",
  
  cycleSteps: [
    { 
      step: 1, 
      title: "Peak Detection", 
      text: "Monitor building demand. When demand exceeds threshold, battery discharges to reduce peak." 
    },
    { 
      step: 2, 
      title: "Battery Discharge", 
      text: "Battery discharges power to grid, reducing facility demand. Shaves the peak demand curve." 
    },
    { 
      step: 3, 
      title: "Demand Reduction", 
      text: "Peak demand reduced by battery output. Example: 500kW peak → 400kW with 100kW battery." 
    },
    { 
      step: 4, 
      title: "Cost Savings", 
      text: "Demand charge reduction × demand rate × 12 months = annual savings. Fast payback." 
    },
  ],
  
  tooltipData: {
    battery: { 
      title: "BATTERY BANK", 
      desc: "Energy storage capacity (kWh) and power output (kW). Larger capacity = more peak shaving duration.", 
      stats: "Capacity: 100-5000 kWh | Power: 50-2000 kW", 
      style: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', borderColor: '#3b82f6' } 
    },
    inverter: { 
      title: "INVERTER/PCS", 
      desc: "Power conversion system. Converts DC battery to AC grid power. Efficiency: 95-97%.", 
      stats: "Efficiency: 95-97% | Bidirectional (charge/discharge)", 
      style: { bottom: '20px', left: '20px', borderColor: '#22c55e' } 
    },
    demand: { 
      title: "BUILDING DEMAND", 
      desc: "Facility power consumption. Peak demand determines demand charges.", 
      stats: "Peak: Measured in 15-min intervals | Demand charge: $/kW/month", 
      style: { top: '20px', left: '20px', borderColor: '#ef4444' } 
    },
    peakShaving: { 
      title: "PEAK SHAVING", 
      desc: "Battery discharges during peak periods, reducing maximum demand. Saves demand charges.", 
      stats: "Typical reduction: 50-500 kW | Savings: $/kW/month × reduction", 
      style: { top: '20px', right: '20px', borderColor: '#fbbf24' } 
    },
  },
  
  realWorldImage: {
    src: "https://images.unsplash.com/photo-1591488320449-011701bb6704?q=80&w=1000&auto=format&fit=crop",
    alt: "Battery Energy Storage System",
    caption: "Fig 1. Containerized battery energy storage system (BESS) installation for peak shaving."
  },
  
  vocabulary: [
    { 
      term: "Peak Shaving", 
      definition: "Discharging battery during peak demand periods to reduce maximum demand.", 
      salesHook: "Shave 100kW off your peak, save $200,000/year at $2,000/kW demand rate. That's real money." 
    },
    { 
      term: "Round-Trip Efficiency", 
      definition: "Energy out / Energy in. Accounts for charge/discharge losses. Typical: 85-95%.", 
      salesHook: "95% round-trip efficiency means you get 95kWh out for every 100kWh you put in. Industry-leading." 
    },
    { 
      term: "State of Charge (SOC)", 
      definition: "Percentage of battery capacity currently stored. 100% = full, 0% = empty.", 
      salesHook: "We keep SOC between 10-90% to maximize battery life. That's your usable capacity." 
    },
    { 
      term: "C-Rate", 
      definition: "Discharge rate relative to capacity. 1C = full capacity in 1 hour. 0.5C = full capacity in 2 hours.", 
      salesHook: "Higher C-rate means more power from same capacity. Critical for peak shaving applications." 
    },
    { 
      term: "Degradation", 
      definition: "Capacity loss over time. Typical: 2% per year. Important for long-term financial modeling.", 
      salesHook: "Our financial models account for degradation. Real-world performance, not theoretical." 
    },
  ],
  
  retrofitStrategy: {
    title: "Battery Storage: Peak Shaving ROI",
    oldWay: { 
      title: "Pay Full Demand Charges", 
      desc: "No peak management, pay maximum demand charges every month.", 
      items: [
        "Peak demand = full facility load",
        "No peak reduction",
        "Pay $/kW/month on peak",
        "No energy arbitrage",
        "No grid services",
      ] 
    },
    newWay: { 
      title: "Peak Shaving with Battery", 
      desc: "Battery reduces peak demand, saving demand charges. Can also provide grid services.", 
      items: [
        "Peak demand reduced by battery output",
        "30-50% peak reduction typical",
        "Save $/kW/month on reduced peak",
        "Energy arbitrage (charge low, discharge high)",
        "Grid services revenue (future)",
        "Backup power capability",
      ] 
    },
    utilityBenefit: { 
      title: "Grid Benefits", 
      desc: "Utilities benefit from peak load reduction. Batteries can also provide grid services like frequency regulation and demand response." 
    },
  },
  
  identificationGuide: [
    { feature: "Capacity", standard: "None (no storage)", highEff: "100-5000 kWh" },
    { feature: "Power", standard: "Grid only", highEff: "50-2000 kW discharge" },
    { feature: "Peak Reduction", standard: "0 kW", highEff: "50-500 kW typical" },
    { feature: "ROI", standard: "N/A", highEff: "5-10 year payback" },
    { feature: "Applications", standard: "Grid power only", highEff: "Peak shaving + backup + grid services" },
  ],

  bestPractices: {
    title: "Battery Storage Best Practices & Optimization Strategies",
    sections: [
      {
        heading: "Sizing and Optimization Strategy",
        content: "Battery sizing is critical for ROI. Oversizing wastes capital, undersizing limits savings. Target 30-50% of peak demand for shaving, ensuring battery can discharge during entire peak period. Analyze demand profile to identify peak periods and optimal discharge duration.",
        items: [
          "Analyze demand profile first - identify peak periods, duration, and magnitude",
          "Size for 30-50% peak shaving - most cost-effective sizing (diminishing returns beyond 50%)",
          "Ensure adequate capacity - battery must discharge for entire peak period (typically 2-4 hours)",
          "Match C-rate to peak duration - 0.5C (2-hour discharge) typical for peak shaving",
          "Consider future load growth - size with 10-20% margin for load increases"
        ]
      },
      {
        heading: "Control Strategy and Peak Shaving",
        content: "Effective peak shaving requires smart controls that predict and respond to demand. Battery should discharge during peak periods to prevent demand spikes, but not discharge unnecessarily. Advanced controls learn demand patterns and optimize discharge timing.",
        items: [
          "Predictive controls - use historical data to predict peak periods and pre-charge/discharge",
          "Real-time demand monitoring - discharge when demand approaches peak, stop when peak is shaved",
          "Avoid unnecessary discharge - only discharge during actual peak periods, not during low demand",
          "Reserve capacity for backup power if needed (if battery serves dual purpose)",
          "Coordinate with other systems - avoid discharging when chiller/hvac is starting (could create new peak)"
        ]
      },
      {
        heading: "Charging Strategy and Energy Arbitrage",
        content: "Optimal charging strategy maximizes battery availability during peak periods while minimizing energy costs. Charge during off-peak periods (night, early morning) when rates are lowest. If paired with solar, charge from solar during day, discharge for evening peak.",
        items: [
          "Charge during off-peak periods - lowest energy rates (typically night, early morning)",
          "Solar + storage - charge from solar during day, discharge for evening peak (4-8pm)",
          "Avoid charging during on-peak periods - defeats purpose of peak shaving",
          "Maintain state of charge - keep battery 80-90% charged before peak period starts",
          "Energy arbitrage - charge low ($0.10/kWh), discharge high ($0.20/kWh) if rate differential exists"
        ]
      },
      {
        heading: "Maintenance and Lifecycle Management",
        content: "Battery systems require minimal maintenance but proper operation is critical for longevity. Lithium-ion batteries degrade over time - capacity decreases ~2-3% per year. Operate within 10-90% SOC window to maximize life. Monitor performance and replace when capacity degrades below 70%.",
        items: [
          "Operate within 10-90% SOC range - maximizes battery life (avoid deep discharge/overcharge)",
          "Monitor capacity degradation - track usable capacity over time (expect ~2-3% per year)",
          "Thermal management - ensure proper cooling/venting (temperature affects life)",
          "Regular inspections - check connections, cooling systems, battery health",
          "Plan for replacement - batteries typically last 10-15 years before significant degradation"
        ]
      }
    ]
  },

  roiAndLowHangingFruit: {
    typicalROI: [
      {
        project: "500kW/1MWh Battery System (Peak Shaving)",
        payback: "6-8 years",
        annualSavings: "$48k-96k",
        notes: "Sizes for 250-400kW peak shaving. Demand charge: $20/kW/month. 250kW shaving = $60k/year savings. System cost: $350k-500k. Payback: 6-8 years. Shorter payback with higher demand charges or utility incentives."
      },
      {
        project: "250kW/500kWh Battery System (Small Commercial)",
        payback: "5-7 years",
        annualSavings: "$24k-48k",
        notes: "Sizes for 150-200kW peak shaving. Demand charge: $20/kW/month. 150kW shaving = $36k/year savings. System cost: $200k-300k. Payback: 5-7 years."
      },
      {
        project: "Solar + Storage (500kW Solar, 250kW/500kWh Battery)",
        payback: "4-6 years (combined)",
        annualSavings: "$60k-100k",
        notes: "Solar provides energy savings. Battery shaves peak demand (evening peak when solar not producing). Combined system qualifies for ITC and utility incentives. Payback: 4-6 years."
      },
      {
        project: "Battery System with Demand Response",
        payback: "5-7 years",
        annualSavings: "$30k-60k + DR revenue",
        notes: "Battery participates in utility demand response programs. Additional revenue stream ($50-200/kW-year). Reduces payback period by 10-20%."
      }
    ],
    lowHangingFruit: [
      {
        opportunity: "Demand Charge Analysis",
        effort: "Low",
        savings: "Identifies BESS opportunity",
        payback: "Immediate (free)",
        description: "Analyze utility bill - identify demand charges and peak demand. If demand charges >$10/kW/month and peak >200kW, BESS likely viable. Free analysis identifies opportunity."
      },
      {
        opportunity: "Load Profile Analysis",
        effort: "Low",
        savings: "Optimizes BESS sizing and ROI",
        payback: "Immediate (free)",
        notes: "Review 15-minute interval data to identify peak periods, duration, and magnitude. Optimizes battery sizing and discharge strategy. Free analysis."
      },
      {
        opportunity: "Battery Control Optimization",
        effort: "Low",
        savings: "10-20% additional savings",
        payback: "< 1 year",
        description: "If battery already installed, optimize control strategy. Many systems discharge too early or unnecessarily. Optimize timing and duration. Low-cost software upgrade."
      },
      {
        opportunity: "Solar + Storage Integration",
        effort: "Medium",
        savings: "Combined system improves ROI",
        payback: "4-6 years (combined)",
        description: "Pair battery with solar. Solar charges battery during day, battery discharges for evening peak. Combined system qualifies for ITC. Better ROI than standalone battery."
      },
      {
        opportunity: "Demand Response Participation",
        effort: "Low",
        savings: "$50-200/kW-year additional revenue",
        payback: "Reduces payback by 10-20%",
        description: "Register battery for utility demand response programs. Battery provides load reduction when called. Additional revenue stream. Low effort, incremental revenue."
      }
    ]
  },

  optimizationVsReplacement: {
    optimizationOpportunities: [
      "Control strategy optimization (discharge timing, duration, predictive controls) - 10-20% additional savings, low cost",
      "Charging strategy optimization (off-peak charging, solar integration) - 5-10% efficiency improvement, low cost",
      "Battery sizing verification - ensure battery is properly sized (oversized wastes capital, undersized limits savings)",
      "Coordination with other systems - avoid creating new peaks during discharge",
      "Demand response participation - additional revenue stream, low effort"
    ],
    whenToReplace: [
      "Battery capacity degraded below 70% (affects peak shaving capability)",
      "Battery is undersized for current load (cannot shave peak effectively)",
      "Technology upgrade required (newer batteries have better efficiency, lower cost)",
      "System failure or end of life (typically 10-15 years)",
      "Expansion needed (add more capacity for load growth or higher peak shaving)"
    ],
    optimizationBenefits: "Lower cost (controls optimization, strategy adjustment), faster implementation, maximizes existing investment. Best approach for existing systems or when seeking incremental improvements. Typical 10-20% additional savings from optimization.",
    replacementBenefits: "Newer technology (better efficiency, lower cost), increased capacity (for load growth), eliminates degradation concerns, new warranty. However, battery optimization can often achieve 80-90% of benefits at 10-20% of replacement cost. Only replace if capacity degraded below 70% or significant technology improvements available."
  }
};

