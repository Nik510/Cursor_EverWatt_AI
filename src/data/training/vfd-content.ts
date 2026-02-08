/**
 * VFD Training Content
 * Variable Frequency Drive training
 */

import type React from 'react';
import type { TechPageData } from './lighting-content';

export const vfdContent: TechPageData = {
  title: "Variable Frequency Drives (VFDs)",
  subtitle: "The 'Cubic Law of Power' delivers massive savings. If you're not using VFDs, you're throwing money away.",
  introduction: {
    whatItIs: "A Variable Frequency Drive (VFD) is an electronic device that controls the speed of AC electric motors by varying the frequency and voltage of the power supplied to the motor. Traditional motors run at fixed speed (60Hz = full speed), but most applications don't need full speed all the time. VFDs adjust motor speed to match actual demand - when a fan needs 60% airflow, the VFD runs the motor at 60% speed. Due to the Affinity Law (power is proportional to speed cubed), reducing speed dramatically reduces power consumption. A fan running at 50% speed uses only 12.5% of full-speed power. VFDs are retrofit devices - you install them on existing motors without replacing the motor or equipment.",
    whereItIsSeen: [
      "Fan motors (AHU fans, exhaust fans, supply fans, cooling tower fans)",
      "Pump motors (chilled water pumps, hot water pumps, condenser water pumps, booster pumps)",
      "Chiller compressors (variable-speed chiller compressors)",
      "Industrial motors (air compressors, conveyors, mixers)",
      "Any application where motors run continuously but demand varies"
    ],
    typicalLocations: [
      "Electrical rooms or mechanical rooms (VFD controller mounted on wall or in electrical panel)",
      "Near the motor being controlled (sometimes mounted directly on equipment)",
      "Often in groups (multiple VFDs in same room for multiple fans/pumps)",
      "Connected between electrical supply and motor (VFD receives power, sends variable power to motor)",
      "Control wires connect to building automation system or sensors"
    ],
    keyConcepts: [
      "Affinity Law (Cubic Law): Power is proportional to speed cubed (P ∝ n³). Flow is proportional to speed (Q ∝ n). This means 50% speed = 12.5% power. This is THE reason VFDs save so much energy.",
      "Frequency Control: VFD converts fixed 60Hz AC to variable frequency (10-60Hz). Lower frequency = lower speed. 30Hz = 50% speed, 60Hz = 100% speed.",
      "Part-Load Operation: Most fans and pumps operate at part-load 80% of the time. Constant-speed motors run at 100% power even when only 50% flow is needed. VFDs match speed to demand.",
      "Soft Start: VFDs gradually increase speed from 0 to setpoint, eliminating high inrush current (6-8x full-load current) that occurs with direct-on-line starting. Reduces motor wear, extends equipment life, improves power quality.",
      "Demand-Based Control: VFD speed controlled by demand signal (pressure, flow, temperature, or schedule). Example: Maintain 2\" static pressure in duct - as dampers close, pressure rises, VFD slows fan to maintain pressure.",
      "Payback: Typical VFD payback is 2-3 years. On a 50hp fan running 8,760 hours/year, VFD saves $2,500-5,000/year. VFD cost: $5,000-10,000 installed."
    ],
    whyItMatters: "VFDs are the single most cost-effective energy upgrade available. A typical 50hp fan motor consumes 37kW at full speed. Running 24/7 at full speed (when only 60% airflow is needed) wastes 40% of energy. A VFD reducing speed to 60% uses only 8kW (22% of full power). Savings: 29kW × 8,760 hours × $0.12/kWh = $30,000/year. VFD cost: $7,500. Payback: 3 months. Plus, soft starts reduce motor wear, extend equipment life, and eliminate power quality issues from high inrush current. VFDs are retrofit devices - you don't need to replace motors or equipment, just add the VFD controller.",
    commonApplications: [
      "AHU supply/return fans (maintain static pressure, reduce speed when dampers close)",
      "Exhaust fans (adjust speed based on occupancy or air quality sensors)",
      "Chilled water pumps (maintain differential pressure, reduce speed during low load)",
      "Hot water pumps (variable-speed pumping for efficiency)",
      "Cooling tower fans (maintain condenser water temperature, reduce speed in cool weather)",
      "Chiller compressors (variable-speed compressors for part-load efficiency)"
    ]
  },
  chiefEngineerQuote: "VFDs are the single most cost-effective energy upgrade you can make. The physics is simple: power is proportional to speed cubed. Reduce fan speed by 20%, power drops by 50%. Reduce by 50%, power drops to 12.5%. Most fans and pumps run at full speed 24/7, but only need that 10% of the time. A $5k VFD on a 50hp fan pays back in 2 years and saves $2,500/year forever. It's free money.",
  
  compressorTypes: [
    { 
      name: "Fan VFD", 
      desc: "Variable-speed fan control", 
      range: "30-50% savings", 
      application: "AHUs, exhaust fans, cooling towers", 
      color: "blue" 
    },
    { 
      name: "Pump VFD", 
      desc: "Variable-speed pump control", 
      range: "40-60% savings", 
      application: "Chilled water, hot water, condenser pumps", 
      color: "emerald" 
    },
    { 
      name: "Chiller VFD", 
      desc: "Variable-speed chiller compressor", 
      range: "20-35% savings", 
      application: "Large chillers, part-load optimization", 
      color: "purple" 
    },
    { 
      name: "Compressor VFD", 
      desc: "Air compressor variable-speed", 
      range: "25-40% savings", 
      application: "Industrial air compressors", 
      color: "purple" 
    },
  ],

  schematicTitle: "VFD Savings: The Affinity Law in Action",
  
  cycleSteps: [
    { 
      step: 1, 
      title: "Full Speed (Baseline)", 
      text: "Motor runs at 100% speed, consuming 100% power. Often unnecessary for actual load." 
    },
    { 
      step: 2, 
      title: "Speed Reduction", 
      text: "VFD reduces speed to match actual demand. 80% speed for 80% airflow requirement." 
    },
    { 
      step: 3, 
      title: "Cubic Law", 
      text: "Power = Speed³. 80% speed = 51% power. 50% speed = 12.5% power. Massive savings." 
    },
    { 
      step: 4, 
      title: "Payback", 
      text: "Typical payback: 2-3 years. Then it's pure savings for the life of the equipment." 
    },
  ],
  
  tooltipData: {
    motor: { 
      title: "AC MOTOR", 
      desc: "3-phase motor, traditionally runs at fixed speed (60Hz). VFD varies frequency to control speed.", 
      stats: "Typical: 1-100 hp | Efficiency: 90-95%", 
      style: { top: '50%', left: '30%', transform: 'translate(-50%, -50%)', borderColor: '#3b82f6' } 
    },
    vfd: { 
      title: "VFD CONTROLLER", 
      desc: "Converts fixed-frequency AC to variable frequency. Adjusts speed based on demand signal.", 
      stats: "Efficiency: 95-97% | Speed range: 10-100%", 
      style: { top: '20px', left: '50%', transform: 'translateX(-50%)', borderColor: '#22c55e' } 
    },
    fan: { 
      title: "FAN/PUMP", 
      desc: "Load device. Lower speed = dramatically lower power due to cubic relationship.", 
      stats: "Power ∝ Speed³ | 50% speed = 12.5% power", 
      style: { bottom: '20px', left: '50%', transform: 'translateX(-50%)', borderColor: '#ef4444' } 
    },
    control: { 
      title: "CONTROL SIGNAL", 
      desc: "Demand signal (pressure, flow, temperature) tells VFD what speed is needed.", 
      stats: "Signal: 0-10V or 4-20mA | Closed-loop control", 
      style: { top: '20px', right: '20px', borderColor: '#fbbf24' } 
    },
  },
  
  realWorldImage: {
    src: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=1000&auto=format&fit=crop",
    alt: "VFD Installation",
    caption: "Fig 1. Variable Frequency Drive controller mounted next to motor, providing variable-speed control."
  },
  
  vocabulary: [
    { 
      term: "Affinity Law", 
      definition: "Power is proportional to speed cubed (P ∝ n³). Flow is proportional to speed (Q ∝ n).", 
      salesHook: "This is why VFDs save so much. Cut speed in half, power drops to 12.5%. That's 87.5% savings. Real numbers." 
    },
    { 
      term: "Hertz (Hz)", 
      definition: "Electrical frequency. 60Hz = full speed. 30Hz = 50% speed.", 
      salesHook: "VFD adjusts frequency to control motor speed. Simple concept, massive impact." 
    },
    { 
      term: "VFD Efficiency", 
      definition: "VFD itself has 95-97% efficiency. Small loss, huge gains from speed reduction.", 
      salesHook: "Even with 3-5% VFD losses, the speed reduction savings are 30-50%. Net savings are enormous." 
    },
    { 
      term: "Soft Start", 
      definition: "VFD gradually increases speed, eliminating inrush current and mechanical stress.", 
      salesHook: "Soft starts reduce motor wear, extend equipment life, and prevent power quality issues." 
    },
    { 
      term: "Part-Load Operation", 
      definition: "Most equipment runs at part-load 80% of the time, where VFDs excel.", 
      salesHook: "Full-speed operation is only needed 10-20% of the time. VFDs match actual demand the other 80-90%." 
    },
  ],
  
  retrofitStrategy: {
    title: "VFD Retrofit Strategy",
    oldWay: { 
      title: "Constant-Speed Operation", 
      desc: "Motors run at full speed 24/7, controlled by dampers or valves.", 
      items: [
        "Full-speed motors",
        "Dampers/valves throttle flow",
        "Energy wasted in throttling",
        "High starting current",
        "Mechanical wear from constant speed",
      ] 
    },
    newWay: { 
      title: "Variable-Speed with VFD", 
      desc: "Speed matches demand, throttling devices stay open.", 
      items: [
        "Variable-speed motors",
        "Dampers/valves fully open",
        "No throttling losses",
        "Soft starts (low inrush)",
        "Reduced mechanical wear",
        "30-50% energy savings",
      ] 
    },
    utilityBenefit: { 
      title: "Fast Payback, High Savings", 
      desc: "VFDs have the fastest payback of any energy measure (2-3 years). Utilities love them because savings are guaranteed and verifiable." 
    },
  },
  
  identificationGuide: [
    { feature: "Control Method", standard: "Constant speed + dampers", highEff: "Variable speed + VFD" },
    { feature: "Power Consumption", standard: "100% at all times", highEff: "12.5-51% at part-load" },
    { feature: "Starting", standard: "High inrush current", highEff: "Soft start, low inrush" },
    { feature: "Throttling", standard: "Dampers/valves restrict flow", highEff: "Speed reduction, no throttling" },
    { feature: "Savings", standard: "0%", highEff: "30-50% typical" },
  ],

  bestPractices: {
    title: "VFD Best Practices & Optimization Strategies",
    sections: [
      {
        heading: "VFD Installation Strategy",
        content: "VFDs are retrofit devices - you install them on existing motors without replacing the motor or equipment. Priority installation order: cooling tower fans (biggest impact), AHU fans, pumps, then other motors. Focus on motors that run continuously but have variable demand.",
        items: [
          "Install VFDs on cooling tower fans first - enables optimal condenser water temp control, saves 30-50% fan energy plus 5-10% chiller energy",
          "Next: AHU supply/return fans - maintain static pressure, save 40-60% fan energy",
          "Then: Pumps (chilled water, hot water, condenser water) - maintain pressure/flow, save 40-60% pump energy",
          "Priority: Motors that run 24/7 or continuously (maximum hours = maximum savings)",
          "Skip: Motors that run at constant full load (no savings potential)"
        ]
      },
      {
        heading: "Control Strategy Optimization",
        content: "Proper control strategy is critical for VFD efficiency. The VFD should respond to demand signal (pressure, flow, temperature, or schedule). Poor control strategy wastes energy - VFD running at 90% speed when 60% is needed wastes 50% of potential savings.",
        items: [
          "Pressure control for fans - maintain static pressure in duct, reduce speed as dampers close",
          "Differential pressure control for pumps - maintain pressure difference, reduce speed during low load",
          "Temperature control for cooling tower fans - maintain condenser water temp, reduce speed in cool weather",
          "Schedule-based control - reduce speed during unoccupied hours (40-50% speed = 80% energy savings)",
          "Verify VFD is actually modulating - check run hours vs full-speed hours"
        ]
      },
      {
        heading: "Demand-Based Control",
        content: "The key to VFD efficiency is demand-based control - the VFD adjusts speed to match actual demand, not fixed setpoints. Example: AHU fan maintains 2\" static pressure. As zone dampers close (demand decreases), static pressure rises, VFD slows fan to maintain 2\" pressure.",
        items: [
          "Set proper control setpoints - too high wastes energy, too low reduces performance",
          "Use appropriate sensors - static pressure transducers for fans, differential pressure for pumps",
          "Avoid constant-speed operation - if VFD is always at 100%, it's not saving energy",
          "Implement reset strategies - adjust setpoints based on load or conditions (e.g., lower static pressure during low load)",
          "Monitor VFD operation - verify speed is actually modulating with demand"
        ]
      },
      {
        heading: "Maintenance and Commissioning",
        content: "VFDs require minimal maintenance, but proper commissioning is critical. Incorrect settings, poor control strategy, or mechanical issues can reduce savings by 20-50%.",
        items: [
          "Verify VFD is properly commissioned - correct motor parameters, control setpoints, and response curves",
          "Check for mechanical issues - loose belts, worn bearings, or poor alignment reduce efficiency",
          "Monitor VFD operation - verify speed is actually modulating, check for vibration or noise",
          "Review control sequences - ensure VFD responds correctly to demand signals",
          "Annual inspection - check connections, verify operation, review control settings"
        ]
      }
    ]
  },

  roiAndLowHangingFruit: {
    typicalROI: [
      {
        project: "VFD on Cooling Tower Fan",
        payback: "1-2 years",
        annualSavings: "$5k-15k per tower",
        notes: "30-50hp fan, 30-50% energy reduction. Also enables optimal condenser water temp, saving additional 5-10% chiller energy. Typical 50hp fan: $7,500 VFD, saves $5k-10k/year."
      },
      {
        project: "VFD on AHU Supply Fan",
        payback: "2-3 years",
        annualSavings: "$3k-10k per fan",
        notes: "20-50hp fan, 40-60% energy reduction. Maintains static pressure, reduces speed as dampers close. Typical 30hp fan: $6,000 VFD, saves $4k-6k/year."
      },
      {
        project: "VFD on Chilled Water Pump",
        payback: "2-4 years",
        annualSavings: "$5k-15k per pump",
        notes: "40-100hp pump, 40-60% energy reduction. Maintains differential pressure, reduces speed during low load. Requires variable flow system. Typical 60hp pump: $10,000 VFD, saves $8k-12k/year."
      },
      {
        project: "VFD on Hot Water Pump",
        payback: "2-4 years",
        annualSavings: "$3k-8k per pump",
        notes: "20-60hp pump, 40-60% energy reduction. Variable-speed pumping for efficiency. Typical 40hp pump: $7,500 VFD, saves $5k-7k/year."
      },
      {
        project: "Multiple VFDs (Fan + Pump Package)",
        payback: "2-3 years",
        annualSavings: "$15k-40k per system",
        notes: "AHU fan + pump VFDs. Combined savings and faster payback with package pricing. Typical package: $15k-25k, saves $10k-20k/year."
      }
    ],
    lowHangingFruit: [
      {
        opportunity: "VFD on Cooling Tower Fan",
        effort: "Medium",
        savings: "30-50% fan energy + 5-10% chiller energy",
        payback: "1-2 years",
        description: "Highest ROI VFD application. Enables optimal condenser water temp control (lowers lift), saving both fan and chiller energy. Typical 50hp fan: $7,500 VFD, saves $5k-10k/year."
      },
      {
        opportunity: "VFD on AHU Fan with Static Pressure Control",
        effort: "Medium",
        savings: "40-60% fan energy",
        payback: "2-3 years",
        notes: "Maintains static pressure, reduces speed as zone dampers close. Most AHU fans run at constant speed but don't need full airflow. Typical 30hp fan: $6,000 VFD, saves $4k-6k/year."
      },
      {
        opportunity: "VFD on Exhaust Fan with Occupancy Control",
        effort: "Low",
        savings: "50-70% fan energy",
        payback: "1-2 years",
        description: "Reduce speed during unoccupied hours or low occupancy. Simple schedule-based control. Typical 20hp fan: $5,000 VFD, saves $3k-5k/year."
      },
      {
        opportunity: "VFD on Pump with Differential Pressure Control",
        effort: "Medium",
        savings: "40-60% pump energy",
        payback: "2-4 years",
        description: "Maintains differential pressure, reduces speed during low load. Requires variable flow system (check if system allows). Typical 60hp pump: $10,000 VFD, saves $8k-12k/year."
      },
      {
        opportunity: "Verify VFD Control Strategy",
        effort: "Low",
        savings: "Recovers 20-50% of potential savings",
        payback: "Immediate (free)",
        description: "Many VFDs are installed but not properly controlled - running at constant speed or wrong setpoints. Review control sequences and adjust. Often free fix with big impact."
      },
      {
        opportunity: "Schedule-Based Speed Reduction",
        effort: "Low",
        savings: "50-70% during unoccupied hours",
        payback: "Immediate (free)",
        description: "Program VFD to reduce speed during unoccupied hours. 40-50% speed during unoccupied = 80% energy savings vs full speed. Simple programming adjustment."
      }
    ]
  },

  optimizationVsReplacement: {
    optimizationOpportunities: [
      "VFD installation on existing motors (retrofit, no motor replacement needed) - 30-60% energy savings, 2-3 year payback",
      "Control strategy optimization (demand-based control, reset strategies) - 10-30% additional savings, low cost",
      "Schedule-based speed reduction (unoccupied hours) - 50-70% savings during off-hours, free",
      "Proper commissioning and maintenance - recovers 10-20% efficiency, low cost",
      "Remove throttling devices (dampers/valves) - allows VFD to fully optimize, low cost"
    ],
    whenToReplace: [
      "Motor is at end of life (old, inefficient, frequent failures) - replace with high-efficiency motor + VFD",
      "Equipment replacement is needed anyway (fan, pump, chiller) - include VFD in replacement",
      "Motor is undersized or oversized - replace with properly sized motor + VFD",
      "Variable-speed equipment upgrade (e.g., variable-speed chiller) - integrated VFD solution",
      "Motor control upgrade required for other reasons - add VFD as part of upgrade"
    ],
    optimizationBenefits: "VFD is a retrofit device - install on existing motor without replacing motor or equipment. Lower cost than motor replacement, faster implementation, immediate energy savings. Typical 2-3 year payback. Best approach for most applications.",
    replacementBenefits: "Motor replacement + VFD provides maximum efficiency (high-efficiency motor + VFD), eliminates motor-related maintenance issues, new warranty. However, VFD alone on existing motor provides 90% of benefits at 50% of cost. Only replace motor if it's at end of life or undersized/oversized."
  }
};

