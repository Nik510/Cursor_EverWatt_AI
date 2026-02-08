/**
 * LIGHTING BEST PRACTICES GUIDE
 * Comprehensive best practices for lighting auditors, sales, engineers
 * 
 * This includes maintenance, optimization, common issues, troubleshooting,
 * and professional-grade recommendations.
 */

export interface BestPracticeCategory {
  category: string;
  title: string;
  sections: {
    heading: string;
    content: string;
    items?: string[];
    engineerNotes?: string;
    salesNotes?: string;
    auditorNotes?: string;
  }[];
}

export const LIGHTING_BEST_PRACTICES: BestPracticeCategory[] = [
  {
    category: 'identification',
    title: 'Identification Best Practices',
    sections: [
      {
        heading: 'Visual Identification Checklist',
        content: 'Use systematic approach to identify bulb types in the field:',
        items: [
          '1. Check physical size and shape',
          '2. Identify base type (screw, pin, etc.)',
          '3. Look for wattage and model markings',
          '4. Check for ballast requirement',
          '5. Note color temperature appearance',
          '6. Test warm-up time if possible',
          '7. Check fixture type and mounting',
          '8. Document operating hours',
        ],
        engineerNotes: 'Take photos of bulbs, fixtures, and nameplates. Document ballast types and fixture ages.',
        salesNotes: 'Use identification to determine replacement urgency and cost. Old inefficient bulbs = faster ROI.',
        auditorNotes: 'Accurate identification is critical for correct savings calculations. When in doubt, remove bulb to check markings.',
      },
      {
        heading: 'Common Identification Mistakes',
        content: 'Avoid these common errors:',
        items: [
          'Confusing T8 and T12 (measure diameter: T8 = 1", T12 = 1.5")',
          'Mixing up PAR and BR (PAR = hard glass, BR = soft glass)',
          'Not checking if LED or traditional (LED = instant-on, cooler)',
          'Missing ballast type (magnetic vs electronic)',
          'Assuming all CFLs are the same (screw-in vs pin-base)',
        ],
      },
      {
        heading: 'Tools for Identification',
        content: 'Essential tools for field identification:',
        items: [
          'Measuring tape (for tube diameter)',
          'Camera (photograph all bulbs and fixtures)',
          'Flashlight (to see markings)',
          'Ladder (to access fixtures safely)',
          'Voltage tester (check if ballast present)',
          'Lux meter (measure light levels)',
        ],
      },
    ],
  },
  
  {
    category: 'replacement',
    title: 'Replacement Strategy Best Practices',
    sections: [
      {
        heading: 'Priority Replacement Order',
        content: 'Replace in this order for maximum ROI:',
        items: [
          '1. High-hours inefficient (warehouse HID, parking lot HPS)',
          '2. Critical inefficiencies (incandescent, T12, mercury vapor)',
          '3. High-hours fluorescent (office T8/T12)',
          '4. Decorative/low-hours (can wait)',
        ],
        engineerNotes: 'Calculate annual kWh savings for each location. Prioritize highest annual savings first, not just wattage reduction.',
        salesNotes: 'Lead with highest ROI opportunities. Show cumulative savings across multiple phases.',
      },
      {
        heading: 'Group Relamping Strategy',
        content: 'Best practices for coordinated replacement:',
        items: [
          'Replace all bulbs in a fixture at once',
          'Replace all fixtures in a room/zone together',
          'Plan replacements during low-occupancy periods',
          'Document all replacements for warranty',
          'Test sample before full deployment',
        ],
        engineerNotes: 'Group relamping reduces labor costs by 60-70% vs spot replacement. Schedule during off-hours.',
      },
      {
        heading: 'Fixture vs Bulb Replacement',
        content: 'When to replace fixture vs retrofit bulb:',
        items: [
          'Replace fixture if: age >15 years, poor condition, not LED-ready',
          'Retrofit bulb if: fixture <10 years, good condition, compatible',
          'Always consider full fixture for high-bay (better distribution)',
          'Evaluate cost difference (fixture vs labor for retrofit)',
        ],
        engineerNotes: 'Fixture replacement provides better light distribution, integrated controls, and warranty. Bulb retrofit is lower upfront cost.',
        salesNotes: 'Fixture replacement = larger project = better commission. But offer both options to match customer budget.',
      },
    ],
  },
  
  {
    category: 'controls',
    title: 'Controls & Optimization Best Practices',
    sections: [
      {
        heading: 'Networked Controls Implementation',
        content: 'Controls can add 20-40% additional savings beyond LED retrofit:',
        items: [
          'Occupancy sensors: 30-50% savings in low-occupancy areas',
          'Daylight harvesting: 40-60% savings in perimeter zones',
          'Scheduling: 20-30% savings for after-hours',
          'Dimming: 10-20% additional savings with reduced output',
          'Demand response: Avoid peak demand charges',
        ],
        engineerNotes: 'Install controls during LED retrofit to avoid double installation costs. Use industry-standard protocols (0-10V, DALI, Zigbee).',
        salesNotes: 'Controls double the ROI story. LED saves 50%, controls add 30% more = 65% total savings.',
      },
      {
        heading: 'Occupancy Sensor Placement',
        content: 'Proper sensor placement is critical:',
        items: [
          'Ceiling mount: 8-12ft height, 360° coverage',
          'Wall mount: 6-8ft height, covers movement patterns',
          'Avoid obstructions (beams, equipment)',
          'Use multiple sensors for large spaces',
          'Test coverage before final installation',
        ],
        engineerNotes: 'PIR sensors detect motion, ultrasonic detects presence. Use combination for best results. Set timeout to 15-20 minutes.',
      },
      {
        heading: 'Daylight Harvesting Setup',
        content: 'Maximize daylight harvesting savings:',
        items: [
          'Install photosensors within 15ft of windows',
          'Set setpoint to 50 foot-candles (adjustable)',
          'Zone lighting by daylight availability',
          'Use 0-10V dimming for smooth control',
          'Test at different times of day',
        ],
        engineerNotes: 'Closed-loop sensors measure reflected light. Open-loop measure incoming daylight. Closed-loop is more accurate.',
      },
    ],
  },
  
  {
    category: 'maintenance',
    title: 'Maintenance Best Practices',
    sections: [
      {
        heading: 'Preventive Maintenance Schedule',
        content: 'Recommended maintenance intervals:',
        items: [
          'Monthly: Check for burned-out bulbs, clean fixtures',
          'Quarterly: Clean lenses/reflectors, check sensors',
          'Annually: Group relamping (if not LED), ballast check',
          'LED: Minimal maintenance (50,000+ hour lifespan)',
        ],
        engineerNotes: 'LED fixtures reduce maintenance by 90% vs traditional. Focus maintenance budget on controls and sensors.',
      },
      {
        heading: 'Cleaning Procedures',
        content: 'Proper cleaning improves light output:',
        items: [
          'Turn off power before cleaning',
          'Use appropriate cleaning solutions (avoid harsh chemicals)',
          'Clean lenses, reflectors, and diffusers',
          'Check for damage during cleaning',
          'Document cleaning schedule',
        ],
        engineerNotes: 'Dirty fixtures can lose 20-30% light output. Clean annually minimum.',
      },
      {
        heading: 'Troubleshooting Common Issues',
        content: 'Systematic troubleshooting approach:',
        items: [
          'Flickering: Check ballast, wiring, dimmer compatibility',
          'Won\'t start: Check ballast, bulb, power supply',
          'Dim output: Clean fixtures, check voltage, replace if old',
          'Color shift: Bulb nearing end of life, replace',
          'Sensors not working: Check placement, coverage, settings',
        ],
        engineerNotes: 'Document all issues and solutions. Pattern recognition helps identify systemic problems.',
      },
    ],
  },
  
  {
    category: 'financial',
    title: 'Financial Analysis Best Practices',
    sections: [
      {
        heading: 'ROI Calculation Best Practices',
        content: 'Accurate ROI requires comprehensive analysis:',
        items: [
          'Include labor costs in replacement cost',
          'Calculate annual operating hours accurately',
          'Use actual utility rates (not averages)',
          'Factor in maintenance savings (LED vs traditional)',
          'Include utility rebates and incentives',
          'Consider 10-year NPV, not just payback',
        ],
        engineerNotes: 'Use actual metered data when available. Don\'t assume 8760 hours/year - most commercial is 3000-4000 hours.',
        salesNotes: 'Always show both simple payback AND 10-year NPV. NPV shows true value over time.',
      },
      {
        heading: 'Utility Rebate Optimization',
        content: 'Maximize rebate opportunities:',
        items: [
          'Research utility rebates before ordering',
          'Meet Energy Star requirements',
          'Document all installations for rebate submission',
          'Apply for rebates within 90 days of completion',
          'Consider prescriptive vs custom rebate paths',
        ],
        salesNotes: 'Rebates can improve payback by 6-12 months. Include rebate application in your service.',
      },
      {
        heading: 'Financing Options',
        content: 'Offer multiple financing options:',
        items: [
          'Cash purchase: Best ROI, immediate ownership',
          'Energy Service Agreement (ESA): No upfront cost, shared savings',
          'Equipment lease: Monthly payments, tax benefits',
          'Municipal/CEFO financing: Low interest, long terms',
        ],
        salesNotes: 'Offering financing closes more deals. ESA is popular for customers with budget constraints.',
      },
    ],
  },
  
  {
    category: 'safety',
    title: 'Safety Best Practices',
    sections: [
      {
        heading: 'Installation Safety',
        content: 'Critical safety procedures:',
        items: [
          'Always turn off power at breaker before working',
          'Use appropriate PPE (gloves, eye protection)',
          'Follow ladder safety protocols',
          'Check for exposed wiring or damage',
          'Verify fixture compatibility before installation',
        ],
        engineerNotes: 'Electrical safety is non-negotiable. Follow NEC codes. When in doubt, call licensed electrician.',
      },
      {
        heading: 'Disposal & Environmental',
        content: 'Proper disposal is required:',
        items: [
          'CFL and fluorescent: Contains mercury - must recycle',
          'HID bulbs: May contain mercury or other materials',
          'LED: Usually recyclable, check local regulations',
          'Old ballasts: May contain PCB - special disposal required',
          'Document disposal for compliance',
        ],
        engineerNotes: 'Many utilities offer free recycling programs. Use certified recyclers for hazardous materials.',
      },
    ],
  },
  
  {
    category: 'quality',
    title: 'Quality & Performance Best Practices',
    sections: [
      {
        heading: 'Specification Requirements',
        content: 'Minimum quality standards:',
        items: [
          'LED: Minimum 80 CRI, >100 lm/W efficiency',
          'Warranty: Minimum 5-year for LED fixtures',
          'Energy Star certified: Required for rebates',
          'DLC listed: For commercial applications',
          '0-10V or DALI dimming: For controls compatibility',
        ],
        engineerNotes: 'Don\'t compromise on quality to save $5/bulb. Cheap LEDs fail early, voiding any savings.',
        salesNotes: 'Quality specs protect your reputation. Recommend only products you\'d install in your own building.',
      },
      {
        heading: 'Color Quality Considerations',
        content: 'Color quality affects occupant satisfaction:',
        items: [
          'CRI 80+: Standard quality',
          'CRI 90+: Premium quality (offices, retail)',
          'Color temperature: Match application (3000K warm, 4000K neutral, 5000K cool)',
          'Tunable white: Premium feature for circadian lighting',
        ],
        engineerNotes: 'CRI matters most in retail and offices where color accuracy is important. Warehouses can use lower CRI.',
      },
      {
        heading: 'Lighting Design Best Practices',
        content: 'Proper design maximizes effectiveness:',
        items: [
          'Meet IES recommended light levels for space type',
          'Avoid overlighting (wastes energy)',
          'Use layered lighting (ambient + task)',
          'Consider glare reduction',
          'Maintain uniform light distribution',
        ],
        engineerNotes: 'Overlighting is common. Use IES Handbook lighting levels. Higher light levels don\'t always mean better.',
      },
    ],
  },
];

/**
 * Get best practices by category
 */
export function getBestPracticesByCategory(category: string): BestPracticeCategory | undefined {
  return LIGHTING_BEST_PRACTICES.find(bp => bp.category === category);
}

/**
 * Get all engineer notes
 */
export function getAllEngineerNotes(): string[] {
  const notes: string[] = [];
  LIGHTING_BEST_PRACTICES.forEach(category => {
    category.sections.forEach(section => {
      if (section.engineerNotes) {
        notes.push(`${category.title} - ${section.heading}: ${section.engineerNotes}`);
      }
    });
  });
  return notes;
}

/**
 * Get all sales notes
 */
export function getAllSalesNotes(): string[] {
  const notes: string[] = [];
  LIGHTING_BEST_PRACTICES.forEach(category => {
    category.sections.forEach(section => {
      if (section.salesNotes) {
        notes.push(`${category.title} - ${section.heading}: ${section.salesNotes}`);
      }
    });
  });
  return notes;
}

