/**
 * Equipment Fit Assessment
 * Business logic for evaluating whether a facility is a good fit for various
 * energy efficiency and clean energy technologies
 */

import type { 
  FitAssessment, 
  TechnologyFitResult, 
  HVACSystemType,
  ManualFacilityData,
} from '../types/energy-intelligence';

// =============================================================================
// Constants
// =============================================================================

const MINIMUM_PEAK_DEMAND_FOR_BATTERY = 50; // kW
const MINIMUM_HVAC_TONS_FOR_OPTIMIZATION = 20; // tons
const LARGE_LOAD_THRESHOLD = 200; // kW peak
const SMALL_LOAD_THRESHOLD = 50; // kW peak

const SPLIT_SYSTEM_TYPES: HVACSystemType[] = ['split_system', 'mini_split', 'ptac'];
const PACKAGED_UNIT_TYPES: HVACSystemType[] = ['packaged_rtu', 'chiller', 'vrf'];

// =============================================================================
// Main Assessment Function
// =============================================================================

export interface AssessmentInput {
  hvacType: HVACSystemType | null;
  hvacSizeTons: number | null;
  hasRoofEquipment: boolean | null;
  peakDemandKw: number;
  squareFootage: number | null;
  hasExistingSolar: boolean | null;
  solarSystemSizeKw: number | null;
  avgMonthlyKwh: number | null;
  buildingAge: number | null;
  occupancyType: string | null;
}

export function assessEquipmentFit(input: AssessmentInput): FitAssessment {
  const reasons: string[] = [];
  const recommendations: string[] = [];
  const excluded: string[] = [];
  const warnings: string[] = [];
  
  let scoreDeductions = 0;
  let scoreBonus = 0;
  
  const {
    hvacType,
    hvacSizeTons,
    hasRoofEquipment,
    peakDemandKw,
    squareFootage,
    hasExistingSolar,
    solarSystemSizeKw,
    avgMonthlyKwh,
    buildingAge,
  } = input;
  
  // =========================================================================
  // HVAC System Assessment
  // =========================================================================
  
  // BUSINESS RULE: Split systems are not a good fit for HVAC optimization
  if (hvacType && SPLIT_SYSTEM_TYPES.includes(hvacType)) {
    reasons.push('Split/mini-split systems require full replacement for efficiency gains - high payback, low margin');
    excluded.push('HVAC Optimization');
    excluded.push('HVAC Controls Upgrade');
    scoreDeductions += 20;
    warnings.push('HVAC optimization not recommended for split systems');
  }
  
  // BUSINESS RULE: Packaged units are great candidates
  if (hvacType && PACKAGED_UNIT_TYPES.includes(hvacType)) {
    reasons.push('Packaged HVAC units are excellent candidates for controls optimization');
    scoreBonus += 15;
    recommendations.push('Consider advanced HVAC controls and optimization');
  }
  
  // BUSINESS RULE: Large roof equipment (car-sized+) = optimization opportunity
  if (hasRoofEquipment === true && hvacSizeTons && hvacSizeTons >= MINIMUM_HVAC_TONS_FOR_OPTIMIZATION) {
    reasons.push(`Large packaged units (${hvacSizeTons} tons) visible on roof - high optimization potential`);
    scoreBonus += 20;
    recommendations.push('Prioritize HVAC optimization - significant savings potential');
  } else if (hasRoofEquipment === true && (!hvacSizeTons || hvacSizeTons < MINIMUM_HVAC_TONS_FOR_OPTIMIZATION)) {
    reasons.push('Roof equipment visible but may be undersized for optimization projects');
    warnings.push('Verify HVAC tonnage before proceeding with optimization proposal');
  }
  
  // BUSINESS RULE: No visible roof equipment might indicate split systems
  if (hasRoofEquipment === false && !hvacType) {
    warnings.push('No visible roof equipment - facility may have split systems or ground-level equipment');
    recommendations.push('Verify HVAC system type during site visit');
  }
  
  // =========================================================================
  // Load Size Assessment
  // =========================================================================
  
  // BUSINESS RULE: Small loads under 50kW peak have limited savings
  if (peakDemandKw < SMALL_LOAD_THRESHOLD) {
    reasons.push('Small load profile - battery and large HVAC projects may not be cost-effective');
    excluded.push('Battery Storage');
    excluded.push('Demand Response');
    scoreDeductions += 25;
    warnings.push('Small facility - focus on lighting and simple efficiency measures');
  }
  
  // BUSINESS RULE: Medium loads (50-200kW) are standard candidates
  if (peakDemandKw >= SMALL_LOAD_THRESHOLD && peakDemandKw < LARGE_LOAD_THRESHOLD) {
    reasons.push('Medium load profile - good candidate for standard efficiency measures');
    recommendations.push('Evaluate lighting, HVAC controls, and potentially battery storage');
  }
  
  // BUSINESS RULE: Large loads (200kW+) are priority targets
  if (peakDemandKw >= LARGE_LOAD_THRESHOLD) {
    reasons.push('Large load profile - high priority target for comprehensive energy solutions');
    scoreBonus += 20;
    recommendations.push('Consider full energy audit with battery, HVAC, and demand response');
  }
  
  // BUSINESS RULE: Battery storage needs minimum 50kW peak to be viable
  if (peakDemandKw < MINIMUM_PEAK_DEMAND_FOR_BATTERY) {
    if (!excluded.includes('Battery Storage')) {
      excluded.push('Battery Storage');
    }
  }
  
  // =========================================================================
  // Solar Assessment
  // =========================================================================
  
  if (hasExistingSolar === true && solarSystemSizeKw) {
    reasons.push(`Existing solar (${solarSystemSizeKw} kW) - battery storage can maximize self-consumption`);
    scoreBonus += 10;
    recommendations.push('Evaluate battery storage for solar optimization and backup');
  }
  
  if (hasExistingSolar === false && squareFootage && squareFootage > 10000) {
    recommendations.push('Large roof area may support solar PV installation');
  }
  
  // =========================================================================
  // Building Age Assessment
  // =========================================================================
  
  if (buildingAge && buildingAge > 20) {
    reasons.push('Older building likely has efficiency upgrade opportunities');
    scoreBonus += 5;
    recommendations.push('Evaluate envelope improvements and equipment upgrades');
  }
  
  if (buildingAge && buildingAge > 40) {
    warnings.push('Very old building - may need code compliance upgrades');
    recommendations.push('Consider comprehensive retrofit assessment');
  }
  
  // =========================================================================
  // Usage Pattern Assessment (if data available)
  // =========================================================================
  
  if (avgMonthlyKwh && peakDemandKw) {
    const hoursPerMonth = 730;
    const impliedLoadFactor = avgMonthlyKwh / (peakDemandKw * hoursPerMonth);
    
    if (impliedLoadFactor < 0.3) {
      reasons.push('Low load factor indicates peaky usage - good demand management opportunity');
      scoreBonus += 10;
      recommendations.push('Demand response and peak shaving strategies recommended');
    } else if (impliedLoadFactor > 0.6) {
      reasons.push('High load factor indicates consistent operation - energy efficiency focus');
      recommendations.push('Focus on baseload efficiency improvements');
    }
  }
  
  // =========================================================================
  // Calculate Final Score
  // =========================================================================
  
  // Start with base score of 70
  let fitScore = 70 + scoreBonus - scoreDeductions;
  
  // Clamp to 0-100 range
  fitScore = Math.max(0, Math.min(100, fitScore));
  
  // Determine if good fit overall
  const isGoodFit = fitScore >= 60 && excluded.length < 3;
  
  // Add general recommendations based on fit
  if (isGoodFit && recommendations.length === 0) {
    recommendations.push('Facility appears to be a good candidate - schedule site assessment');
  } else if (!isGoodFit) {
    recommendations.push('Limited opportunity - consider referring to partner or declining');
  }
  
  return {
    isGoodFit,
    fitScore,
    reasons,
    recommendations,
    excludedTechnologies: [...new Set(excluded)], // Remove duplicates
    warnings,
  };
}

// =============================================================================
// Individual Technology Assessment
// =============================================================================

export function assessTechnologyFit(
  technology: string,
  input: AssessmentInput
): TechnologyFitResult {
  const reasons: string[] = [];
  let fitScore = 70;
  let excludeReason: string | null = null;
  
  switch (technology.toLowerCase()) {
    case 'battery storage':
    case 'battery':
      if (input.peakDemandKw < MINIMUM_PEAK_DEMAND_FOR_BATTERY) {
        excludeReason = `Peak demand (${input.peakDemandKw} kW) below minimum threshold (${MINIMUM_PEAK_DEMAND_FOR_BATTERY} kW)`;
        fitScore = 20;
      } else {
        fitScore = Math.min(100, 50 + (input.peakDemandKw / 10));
        reasons.push(`Peak demand of ${input.peakDemandKw} kW supports battery economics`);
      }
      break;
      
    case 'hvac optimization':
    case 'hvac controls':
      if (input.hvacType && SPLIT_SYSTEM_TYPES.includes(input.hvacType)) {
        excludeReason = 'Split systems not suitable for controls optimization';
        fitScore = 15;
      } else if (input.hvacSizeTons && input.hvacSizeTons >= MINIMUM_HVAC_TONS_FOR_OPTIMIZATION) {
        fitScore = Math.min(100, 60 + input.hvacSizeTons);
        reasons.push(`${input.hvacSizeTons} ton system is excellent optimization candidate`);
      } else if (input.hasRoofEquipment) {
        fitScore = 65;
        reasons.push('Roof equipment visible - verify tonnage for optimization');
      }
      break;
      
    case 'solar':
    case 'solar pv':
      if (input.hasExistingSolar) {
        excludeReason = 'Facility already has solar installation';
        fitScore = 20;
      } else if (input.squareFootage && input.squareFootage > 10000) {
        fitScore = 80;
        reasons.push('Large facility with potential roof space for solar');
      } else {
        fitScore = 50;
        reasons.push('Solar potential depends on available roof/ground space');
      }
      break;
      
    case 'lighting':
    case 'led retrofit':
      // Lighting is almost always applicable
      fitScore = 75;
      if (input.buildingAge && input.buildingAge > 15) {
        fitScore = 85;
        reasons.push('Older building likely has lighting upgrade opportunities');
      }
      break;
      
    case 'demand response':
      if (input.peakDemandKw < SMALL_LOAD_THRESHOLD) {
        excludeReason = 'Facility too small for demand response programs';
        fitScore = 25;
      } else if (input.peakDemandKw >= LARGE_LOAD_THRESHOLD) {
        fitScore = 85;
        reasons.push('Large load makes facility attractive for DR programs');
      }
      break;
      
    default:
      fitScore = 50;
      reasons.push('Technology fit assessment not available - manual review needed');
  }
  
  return {
    technology,
    isApplicable: excludeReason === null && fitScore >= 50,
    fitScore,
    reasons,
    excludeReason,
  };
}

// =============================================================================
// Batch Assessment for All Technologies
// =============================================================================

export function assessAllTechnologies(input: AssessmentInput): TechnologyFitResult[] {
  const technologies = [
    'Battery Storage',
    'HVAC Optimization',
    'HVAC Controls',
    'Solar PV',
    'LED Lighting',
    'Demand Response',
  ];
  
  return technologies.map(tech => assessTechnologyFit(tech, input));
}

// =============================================================================
// Helper to convert ManualFacilityData to AssessmentInput
// =============================================================================

export function manualInputsToAssessmentInput(
  manualInputs: ManualFacilityData,
  peakDemandFromInterval?: number
): AssessmentInput {
  return {
    hvacType: manualInputs.hvacType,
    hvacSizeTons: manualInputs.hvacSizeTons,
    hasRoofEquipment: manualInputs.hasRoofEquipment,
    peakDemandKw: peakDemandFromInterval ?? manualInputs.peakDemandKw ?? 0,
    squareFootage: manualInputs.squareFootage,
    hasExistingSolar: manualInputs.hasExistingSolar,
    solarSystemSizeKw: manualInputs.solarSystemSizeKw,
    avgMonthlyKwh: manualInputs.avgMonthlyKwh,
    buildingAge: manualInputs.buildingAge,
    occupancyType: manualInputs.occupancyType,
  };
}

// =============================================================================
// Generate Fit Summary for Display
// =============================================================================

export function generateFitSummary(assessment: FitAssessment): string {
  if (assessment.fitScore >= 80) {
    return 'Excellent candidate - high priority for sales engagement';
  } else if (assessment.fitScore >= 60) {
    return 'Good candidate - standard qualification process';
  } else if (assessment.fitScore >= 40) {
    return 'Marginal candidate - limited opportunities available';
  } else {
    return 'Poor fit - consider declining or referring out';
  }
}

export function getFitScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

export function getFitScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100';
  if (score >= 60) return 'bg-blue-100';
  if (score >= 40) return 'bg-yellow-100';
  return 'bg-red-100';
}
