/**
 * LIGHTING REPLACEMENT LOGIC ENGINE
 * Company-specific replacement recommendations with decision trees
 * 
 * This provides intelligent, context-aware replacement recommendations
 * based on multiple factors: age, hours of operation, efficiency, cost, etc.
 */

import type { BulbType } from './bulb-types';

export interface ReplacementDecision {
  currentType: string;
  recommendedType: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low' | 'Keep';
  reasoning: string;
  paybackYears: string;
  energySavingsPercent: string;
  whenToReplace: string;
  estimatedCost?: string;
  companySpecificNotes?: string;
}

export interface ReplacementContext {
  bulbType: string;
  ageYears?: number;
  hoursPerDay?: number;
  daysPerYear?: number;
  energyCost?: number; // $/kWh
  currentWattage?: number;
  fixtureCondition?: 'Good' | 'Fair' | 'Poor';
  dimmingRequired?: boolean;
  colorQualityImportant?: boolean;
  budget?: 'Low' | 'Medium' | 'High';
  companyPreferences?: string[];
}

/**
 * COMPANY-SPECIFIC REPLACEMENT RULES
 * Edit these to customize for your company
 */
export const COMPANY_REPLACEMENT_RULES = {
  // Preferred vendors (company-specific)
  preferredVendors: {
    led: ['Philips', 'Cree', 'GE'],
    fixtures: ['Acuity', 'Lithonia', 'Eaton'],
  },
  
  // Minimum efficiency thresholds (lm/W)
  minimumEfficiency: {
    led: 100, // lm/W minimum for new LED installations
    fluorescent: 80, // Keep existing if >80 lm/W
  },
  
  // Payback thresholds
  paybackThresholds: {
    critical: 2, // years - replace immediately
    high: 3, // years - high priority
    medium: 5, // years - medium priority
    low: 7, // years - low priority
  },
  
  // Replacement priorities by application
  applicationPriorities: {
    'warehouse-highbay': 'Critical', // High hours, high wattage
    'outdoor-parking': 'High', // Security, long hours
    'office-general': 'Medium', // Moderate hours
    'residential': 'Medium', // Lower priority
    'decorative': 'Low', // Aesthetic, lower hours
  },
  
  // Energy cost sensitivity
  energyCostMultiplier: {
    low: 0.08, // $/kWh - lower urgency
    medium: 0.12, // $/kWh - standard
    high: 0.20, // $/kWh - high urgency
  },
  
  // Custom notes
  companyNotes: {
    general: 'All replacements must meet Energy Star standards',
    warranty: 'Minimum 5-year warranty required',
    controls: 'Consider networked controls for new installations',
    rebates: 'Check utility rebates before ordering',
  },
};

/**
 * Replacement Logic Decision Tree
 */
export function calculateReplacement(context: ReplacementContext): ReplacementDecision {
  const {
    bulbType,
    ageYears = 5,
    hoursPerDay = 10,
    daysPerYear = 365,
    energyCost = 0.12,
    currentWattage,
    fixtureCondition = 'Good',
    dimmingRequired = false,
    colorQualityImportant = false,
    budget = 'Medium',
  } = context;

  // Calculate annual operating hours
  const annualHours = hoursPerDay * daysPerYear;
  const isHighHours = annualHours > 4000; // >4000 hrs/year = high hours
  
  // Determine priority based on bulb type
  let priority: ReplacementDecision['priority'] = 'Medium';
  let recommendedType = 'LED Equivalent';
  let reasoning = '';
  let paybackYears = '3-5';
  let energySavingsPercent = '50%';
  let whenToReplace = 'During next maintenance cycle';
  
  // CRITICAL PRIORITY: Old inefficient technologies
  if (bulbType.toLowerCase().includes('incandescent') && !bulbType.toLowerCase().includes('led')) {
    priority = 'Critical';
    recommendedType = 'LED A19 or equivalent';
    reasoning = 'Incandescent bulbs are extremely inefficient (10-17 lm/W). LED provides 85-90% energy savings with 25x longer lifespan.';
    paybackYears = '1-2 years';
    energySavingsPercent = '85-90%';
    whenToReplace = 'Immediately - no reason to delay';
  }
  
  else if (bulbType.toLowerCase().includes('t12')) {
    priority = 'Critical';
    recommendedType = 'LED T8 Tube or T8 LED Fixture';
    reasoning = 'T12 is the oldest, least efficient fluorescent (50-70 lm/W). LED T8 provides 50-60% savings.';
    paybackYears = '2-4 years';
    energySavingsPercent = '50-60%';
    whenToReplace = ageYears > 10 ? 'Immediately' : 'During next relamping cycle';
  }
  
  else if (bulbType.toLowerCase().includes('mercury vapor')) {
    priority = 'Critical';
    recommendedType = 'LED Fixture';
    reasoning = 'Mercury vapor is being phased out, very inefficient (30-60 lm/W), contains mercury.';
    paybackYears = '1-3 years';
    energySavingsPercent = '70-80%';
    whenToReplace = 'Immediately - being phased out';
  }
  
  // HIGH PRIORITY: High-hours applications or inefficient technologies
  else if (bulbType.toLowerCase().includes('metal halide') || bulbType.toLowerCase().includes('hps')) {
    priority = isHighHours ? 'Critical' : 'High';
    recommendedType = 'LED High-Bay or LED Area Light';
    reasoning = `HID lighting provides good output but wastes 50-70% energy vs LED. ${isHighHours ? 'High operating hours make this critical.' : ''}`;
    paybackYears = '2-5 years';
    energySavingsPercent = '50-70%';
    whenToReplace = isHighHours ? 'Immediately' : 'When bulb or ballast fails';
  }
  
  else if (bulbType.toLowerCase().includes('cfl')) {
    priority = 'High';
    recommendedType = 'LED Equivalent';
    reasoning = 'CFL was interim solution. LED provides 50% additional savings, instant-on, no mercury, better color quality.';
    paybackYears = '1-3 years';
    energySavingsPercent = '50% vs CFL, 80% vs incandescent';
    whenToReplace = ageYears > 5 ? 'Immediately' : 'During next relamping';
  }
  
  else if (bulbType.toLowerCase().includes('t8') && !bulbType.toLowerCase().includes('led')) {
    priority = isHighHours ? 'High' : 'Medium';
    recommendedType = 'LED T8 Tube (ballast bypass)';
    reasoning = `LED T8 provides 40-50% energy savings. ${isHighHours ? 'High operating hours make this high priority.' : 'Medium priority for moderate hours.'}`;
    paybackYears = '2-5 years';
    energySavingsPercent = '40-50%';
    whenToReplace = isHighHours || ageYears > 10 ? 'During next relamping' : 'When ballast fails';
  }
  
  else if (bulbType.toLowerCase().includes('t5') && !bulbType.toLowerCase().includes('led')) {
    priority = 'Medium';
    recommendedType = 'LED T5 Tube or LED Fixture';
    reasoning = 'T5 is already efficient (90-105 lm/W) but LED still provides 30-40% additional savings.';
    paybackYears = '3-6 years';
    energySavingsPercent = '30-40%';
    whenToReplace = ageYears > 8 ? 'During next relamping' : 'When ballast fails';
  }
  
  // HALOGEN - High priority due to heat and inefficiency
  else if (bulbType.toLowerCase().includes('halogen') && !bulbType.toLowerCase().includes('led')) {
    priority = 'High';
    recommendedType = 'LED Equivalent';
    reasoning = 'Halogen provides slightly better efficiency than incandescent but still wastes 80-85% energy vs LED.';
    paybackYears = '1-3 years';
    energySavingsPercent = '80-85%';
    whenToReplace = 'Immediately for high-hours applications, otherwise during next relamping';
  }
  
  // LED - Usually keep, but may upgrade
  else if (bulbType.toLowerCase().includes('led')) {
    priority = 'Keep';
    
    // Check if upgrade is warranted
    if (currentWattage && ageYears > 5) {
      const estimatedEfficiency = currentWattage > 0 ? 800 / currentWattage : 0; // Rough estimate
      if (estimatedEfficiency < COMPANY_REPLACEMENT_RULES.minimumEfficiency.led) {
        priority = 'Low';
        recommendedType = 'High-Efficiency LED';
        reasoning = 'Existing LED may be older, less efficient technology. Upgrade to high-efficiency LED (>100 lm/W) for additional savings.';
        paybackYears = '5-8 years';
        energySavingsPercent = '20-30%';
        whenToReplace = 'When existing LED fails or during major renovation';
      } else {
        recommendedType = 'Keep Current LED';
        reasoning = 'Existing LED meets efficiency standards. Focus on controls and optimization rather than replacement.';
        paybackYears = 'N/A';
        energySavingsPercent = 'Already efficient';
        whenToReplace = 'No replacement needed. Consider adding controls.';
      }
    } else {
      recommendedType = 'Keep Current LED';
      reasoning = 'LED is the target technology. Consider optimization (controls, scheduling) rather than replacement.';
      paybackYears = 'N/A';
      energySavingsPercent = 'Already efficient';
      whenToReplace = 'No replacement needed';
    }
  }
  
  // Adjust priority based on operating hours
  if (isHighHours && priority !== 'Critical' && priority !== 'Keep') {
    if (priority === 'Medium') priority = 'High';
    if (priority === 'Low') priority = 'Medium';
  }
  
  // Adjust priority based on energy cost
  if (energyCost > COMPANY_REPLACEMENT_RULES.energyCostMultiplier.high) {
    if (priority !== 'Critical' && priority !== 'Keep') {
      if (priority === 'Low') priority = 'Medium';
      if (priority === 'Medium') priority = 'High';
    }
    paybackYears = String(Number(paybackYears.split('-')[0]) * 0.8) + ' years'; // Faster payback
  }
  
  // Adjust based on fixture condition
  if (fixtureCondition === 'Poor' && priority !== 'Keep') {
    recommendedType = 'LED Fixture Replacement';
    reasoning += ' Fixture condition poor - consider full fixture replacement for best results.';
  }
  
  // Add company-specific notes
  let companySpecificNotes = '';
  if (COMPANY_REPLACEMENT_RULES.companyNotes.general) {
    companySpecificNotes += COMPANY_REPLACEMENT_RULES.companyNotes.general + '. ';
  }
  if (COMPANY_REPLACEMENT_RULES.companyNotes.controls && priority !== 'Keep') {
    companySpecificNotes += COMPANY_REPLACEMENT_RULES.companyNotes.controls + '. ';
  }
  if (COMPANY_REPLACEMENT_RULES.companyNotes.rebates) {
    companySpecificNotes += COMPANY_REPLACEMENT_RULES.companyNotes.rebates + '. ';
  }
  
  return {
    currentType: bulbType,
    recommendedType,
    priority,
    reasoning: reasoning + (companySpecificNotes ? ' ' + companySpecificNotes : ''),
    paybackYears,
    energySavingsPercent,
    whenToReplace,
    companySpecificNotes: companySpecificNotes.trim() || undefined,
  };
}

/**
 * Calculate financial analysis for replacement
 */
export function calculateReplacementROI(
  currentWattage: number,
  replacementWattage: number,
  hoursPerYear: number,
  energyCost: number,
  replacementCost: number,
  installationCost: number = 0
): {
  annualSavings: number;
  paybackYears: number;
  tenYearSavings: number;
  roi: number;
} {
  const wattageReduction = currentWattage - replacementWattage;
  const annualEnergySavings = (wattageReduction * hoursPerYear) / 1000; // kWh
  const annualSavings = annualEnergySavings * energyCost;
  const totalCost = replacementCost + installationCost;
  const paybackYears = totalCost / annualSavings;
  const tenYearSavings = (annualSavings * 10) - totalCost;
  const roi = (tenYearSavings / totalCost) * 100;
  
  return {
    annualSavings,
    paybackYears,
    tenYearSavings,
    roi,
  };
}

/**
 * Get replacement priority by application type
 */
export function getPriorityByApplication(application: string): ReplacementDecision['priority'] {
  const appLower = application.toLowerCase();
  
  if (appLower.includes('warehouse') || appLower.includes('highbay') || appLower.includes('industrial')) {
    return COMPANY_REPLACEMENT_RULES.applicationPriorities['warehouse-highbay'] || 'Critical';
  }
  
  if (appLower.includes('parking') || appLower.includes('outdoor') || appLower.includes('security')) {
    return COMPANY_REPLACEMENT_RULES.applicationPriorities['outdoor-parking'] || 'High';
  }
  
  if (appLower.includes('office') || appLower.includes('general')) {
    return COMPANY_REPLACEMENT_RULES.applicationPriorities['office-general'] || 'Medium';
  }
  
  if (appLower.includes('decorative') || appLower.includes('chandelier')) {
    return COMPANY_REPLACEMENT_RULES.applicationPriorities['decorative'] || 'Low';
  }
  
  return 'Medium';
}

