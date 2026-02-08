/**
 * AI Facility Analyzer
 * Matches facility profiles to vertical market data and generates AI-powered recommendations
 */

import { VerticalMarket, VerticalProfile } from '../data/knowledge-base/types';
import { getVerticalProfile } from '../data/knowledge-base/verticals';
import { batteryMeasures, hvacMeasures, EEMeasure } from '../data/training/ee-measures';
import type {
  FacilityType,
  FacilityProfile,
  ClimateZone,
  KnownEquipmentType,
  PrimaryEnergyConcern,
} from '../types/energy-intelligence';
import type { UsageMetrics } from './ai-insights';

// =============================================================================
// Type Definitions
// =============================================================================

export interface PriorityRecommendation {
  measureId: string;
  measureName: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
  estimatedSavingsPercent: [number, number];
  paybackYearsRange: [number, number];
  salesHook: string;
}

export interface FacilityAnalysis {
  verticalProfile: VerticalProfile | null;
  matchedMeasures: EEMeasure[];
  priorityRecommendations: PriorityRecommendation[];
  buildingInsights: string[];
  decarbonizationPath: string[];
  redFlags: string[];
  operationalNotes: string[];
}

// =============================================================================
// Mapping Functions
// =============================================================================

/**
 * Map facility type to vertical market enum
 */
function mapFacilityTypeToVertical(facilityType: FacilityType): VerticalMarket | null {
  const mapping: Record<FacilityType, VerticalMarket | null> = {
    hospital: VerticalMarket.HOSPITAL,
    office: VerticalMarket.OFFICE,
    manufacturing: VerticalMarket.MANUFACTURING,
    retail: VerticalMarket.RETAIL,
    warehouse: VerticalMarket.WAREHOUSE,
    school: VerticalMarket.SCHOOL,
    hotel: VerticalMarket.HOTEL,
    data_center: VerticalMarket.DATA_CENTER,
    laboratory: VerticalMarket.LABORATORY,
    grocery: VerticalMarket.GROCERY,
    senior_living: VerticalMarket.HOSPITAL, // Similar profile
    multifamily: VerticalMarket.HOTEL, // Similar profile
    restaurant: VerticalMarket.RETAIL, // Similar profile
    cold_storage: VerticalMarket.GROCERY, // Similar refrigeration focus
    other: null,
  };
  return mapping[facilityType];
}

/**
 * Get climate-specific recommendations
 */
function getClimateRecommendations(climateZone: ClimateZone | null): {
  insights: string[];
  priority: 'cooling' | 'heating' | 'balanced';
} {
  if (!climateZone) {
    return { insights: [], priority: 'balanced' };
  }

  // California climate zones: 1-5 coastal (mild), 6-10 inland valleys, 11-16 inland/desert
  if (climateZone <= 5) {
    return {
      insights: [
        'Mild coastal climate reduces HVAC loads significantly',
        'Economizer operation highly effective in this climate',
        'Minimal heating requirements - focus on cooling optimization',
        'Fog and marine layer affect solar generation consistency',
      ],
      priority: 'cooling',
    };
  } else if (climateZone <= 10) {
    return {
      insights: [
        'Significant cooling loads in summer months',
        'Temperature swings create demand charge spikes',
        'High potential for thermal mass strategies',
        'Evening cool-down enables pre-cooling strategies',
      ],
      priority: 'cooling',
    };
  } else {
    return {
      insights: [
        'Extreme cooling loads during summer require robust HVAC',
        'Heating loads significant in winter months',
        'Large TOU differentials favor battery storage',
        'Solar production excellent but loads also peak midday',
        'Demand management critical due to afternoon peaks',
      ],
      priority: 'balanced',
    };
  }
}

/**
 * Get equipment-specific insights
 */
function getEquipmentInsights(equipment: KnownEquipmentType[]): {
  insights: string[];
  opportunities: string[];
} {
  const insights: string[] = [];
  const opportunities: string[] = [];

  if (equipment.includes('chillers')) {
    insights.push('Chiller plant identified - typically largest single load');
    opportunities.push('Chiller plant optimization (10-25% savings potential)');
    opportunities.push('Chilled water reset strategies');
  }

  if (equipment.includes('rtus')) {
    insights.push('Packaged RTUs on roof - common inefficiency source');
    opportunities.push('RTU replacement with high-efficiency heat pumps');
    opportunities.push('Economizer controls and maintenance');
  }

  if (equipment.includes('boilers')) {
    insights.push('Gas boilers present - electrification opportunity');
    opportunities.push('Heat pump water heater conversion');
    opportunities.push('Condensing boiler upgrade if keeping gas');
  }

  if (equipment.includes('lighting_fluorescent')) {
    insights.push('Fluorescent lighting still in use - fast payback LED opportunity');
    opportunities.push('LED retrofit with controls (50-70% lighting savings)');
  }

  if (equipment.includes('compressed_air')) {
    insights.push('Compressed air system - often 20-30% of industrial load');
    opportunities.push('VFD compressor upgrade');
    opportunities.push('Leak detection and repair program');
  }

  if (equipment.includes('refrigeration')) {
    insights.push('Refrigeration loads typically run 24/7');
    opportunities.push('Anti-sweat heater controls');
    opportunities.push('EC motor upgrades for evaporator fans');
  }

  if (equipment.includes('solar_pv')) {
    insights.push('Existing solar - battery storage adds value through self-consumption');
    opportunities.push('Battery storage for solar self-consumption optimization');
  }

  return { insights, opportunities };
}

/**
 * Get operating schedule insights
 */
function getScheduleInsights(schedule: FacilityProfile['operatingSchedule']): string[] {
  if (!schedule) return [];

  switch (schedule) {
    case '24_7':
      return [
        '24/7 operation maximizes equipment efficiency projects',
        'High load factor typical - focus on baseload optimization',
        'Battery storage may see frequent cycling',
      ];
    case 'business_hours':
      return [
        'Strong demand peaks during business hours',
        'Off-hours setback strategies have high potential',
        'TOU optimization valuable with on-peak business hours',
      ];
    case 'extended_hours':
      return [
        'Extended operation hours improve project paybacks',
        'Potential for demand limiting during peak rate periods',
      ];
    case 'seasonal':
      return [
        'Seasonal operation affects equipment sizing decisions',
        'Consider HVAC system commissioning at season transitions',
        'Annual maintenance programs critical',
      ];
    default:
      return [];
  }
}

/**
 * Get building age insights
 */
function getBuildingAgeInsights(age: FacilityProfile['buildingAge']): string[] {
  if (!age) return [];

  switch (age) {
    case 'pre_1980':
      return [
        'Building predates energy codes - significant upgrade potential',
        'HVAC equipment likely needs replacement',
        'Envelope improvements may have strong ROI',
        'Legacy controls likely absent or obsolete',
      ];
    case '1980_2000':
      return [
        'T12 to LED lighting conversion likely applicable',
        'HVAC equipment may be original - end of useful life',
        'Building automation system upgrade opportunity',
      ];
    case '2000_2010':
      return [
        'Equipment approaching replacement age',
        'Controls upgrade may unlock savings without equipment change',
        'LED lighting retrofit still valuable if not done',
      ];
    case 'post_2010':
      return [
        'Modern construction - focus on operational optimization',
        'Commissioning and retro-commissioning priorities',
        'Controls optimization and analytics',
      ];
    default:
      return [];
  }
}

/**
 * Get primary concern recommendations
 */
function getPrimaryConcernRecommendations(concern: PrimaryEnergyConcern | null): PriorityRecommendation[] {
  if (!concern) return [];

  const recommendations: PriorityRecommendation[] = [];

  switch (concern) {
    case 'demand_charges':
      recommendations.push({
        measureId: 'battery-peak-shaving',
        measureName: 'Battery Peak Shaving',
        category: 'battery',
        priority: 'high',
        rationale: 'Directly addresses demand charge reduction goal',
        estimatedSavingsPercent: [15, 40],
        paybackYearsRange: [4, 8],
        salesHook: 'Reduce monthly demand charges by 20-40% with no operational changes',
      });
      break;

    case 'usage_reduction':
      recommendations.push({
        measureId: 'led-retrofit',
        measureName: 'LED Lighting Retrofit',
        category: 'lighting',
        priority: 'high',
        rationale: 'Fast payback, large kWh reduction',
        estimatedSavingsPercent: [40, 70],
        paybackYearsRange: [1, 3],
        salesHook: 'Cut lighting costs in half while improving light quality',
      });
      recommendations.push({
        measureId: 'hvac-optimization',
        measureName: 'HVAC Optimization',
        category: 'hvac',
        priority: 'high',
        rationale: 'HVAC typically 40-60% of usage in commercial buildings',
        estimatedSavingsPercent: [10, 25],
        paybackYearsRange: [2, 5],
        salesHook: 'Optimize your largest energy consumer without equipment replacement',
      });
      break;

    case 'decarbonization':
      recommendations.push({
        measureId: 'electrification',
        measureName: 'Building Electrification',
        category: 'hvac',
        priority: 'high',
        rationale: 'Eliminate on-site gas combustion',
        estimatedSavingsPercent: [20, 40],
        paybackYearsRange: [5, 12],
        salesHook: 'Achieve carbon neutrality goals while reducing operating costs',
      });
      recommendations.push({
        measureId: 'heat-pump-conversion',
        measureName: 'Heat Pump Conversion',
        category: 'hvac',
        priority: 'high',
        rationale: 'Replace gas heating with efficient electric heat pumps',
        estimatedSavingsPercent: [30, 50],
        paybackYearsRange: [6, 10],
        salesHook: 'Modern heat pumps deliver 3-4x efficiency of gas heating',
      });
      break;

    case 'backup_power':
      recommendations.push({
        measureId: 'battery-backup',
        measureName: 'Battery Backup System',
        category: 'battery',
        priority: 'high',
        rationale: 'Provides resiliency while also reducing demand charges',
        estimatedSavingsPercent: [10, 25],
        paybackYearsRange: [5, 10],
        salesHook: 'Protect critical operations AND save on monthly bills',
      });
      break;

    case 'rate_optimization':
      recommendations.push({
        measureId: 'battery-arbitrage',
        measureName: 'TOU Arbitrage with Battery',
        category: 'battery',
        priority: 'high',
        rationale: 'Shift load from expensive on-peak to cheap off-peak',
        estimatedSavingsPercent: [5, 15],
        paybackYearsRange: [6, 12],
        salesHook: 'Make money from rate differentials automatically',
      });
      break;

    case 'sustainability_goals':
      recommendations.push({
        measureId: 'solar-battery',
        measureName: 'Solar + Storage',
        category: 'battery',
        priority: 'high',
        rationale: 'Maximize renewable energy self-consumption',
        estimatedSavingsPercent: [20, 35],
        paybackYearsRange: [5, 8],
        salesHook: 'Generate and store your own clean energy on-site',
      });
      break;

    case 'regulatory_compliance':
      recommendations.push({
        measureId: 'title24-compliance',
        measureName: 'Title 24 Compliance Package',
        category: 'controls',
        priority: 'high',
        rationale: 'Meet California energy code requirements',
        estimatedSavingsPercent: [15, 30],
        paybackYearsRange: [3, 7],
        salesHook: 'Ensure compliance while capturing energy savings',
      });
      break;
  }

  return recommendations;
}

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Analyze facility profile and generate AI-powered recommendations
 */
export function analyzeFacility(
  facilityProfile: FacilityProfile,
  usageMetrics?: UsageMetrics | null
): FacilityAnalysis {
  const buildingInsights: string[] = [];
  const redFlags: string[] = [];
  const operationalNotes: string[] = [];
  let matchedMeasures: EEMeasure[] = [];
  const priorityRecommendations: PriorityRecommendation[] = [];
  const decarbonizationPath: string[] = [];

  // Get vertical profile
  let verticalProfile: VerticalProfile | null = null;
  if (facilityProfile.facilityType) {
    const vertical = mapFacilityTypeToVertical(facilityProfile.facilityType);
    if (vertical) {
      verticalProfile = getVerticalProfile(vertical) || null;
    }
  }

  // Add vertical-specific insights
  if (verticalProfile) {
    buildingInsights.push(`Facility type: ${verticalProfile.name}`);
    buildingInsights.push(verticalProfile.description);

    // Add key challenges as insights
    verticalProfile.keyChallenges.slice(0, 3).forEach(challenge => {
      operationalNotes.push(`Industry challenge: ${challenge}`);
    });

    // Add decarbonization path
    decarbonizationPath.push(verticalProfile.decarbonizationFocus);
    verticalProfile.electrificationOpportunities.forEach(opp => {
      decarbonizationPath.push(opp);
    });

    // Get priority measures from vertical
    verticalProfile.priorityMeasures.forEach(pm => {
      const allMeasures = [...batteryMeasures, ...hvacMeasures];
      const measure = allMeasures.find(m => 
        m.id === pm.measureId || m.name.toLowerCase().includes(pm.measureId.split('-').join(' '))
      );
      
      if (measure) {
        priorityRecommendations.push({
          measureId: pm.measureId,
          measureName: measure.name,
          category: measure.category,
          priority: pm.priority,
          rationale: pm.rationale,
          estimatedSavingsPercent: measure.typicalSavings.percentRange,
          paybackYearsRange: measure.typicalSavings.paybackYearsRange,
          salesHook: measure.salesHooks[0] || '',
        });
      }
    });
  }

  // Add climate-specific insights
  const climateInfo = getClimateRecommendations(facilityProfile.climateZone);
  climateInfo.insights.forEach(insight => buildingInsights.push(insight));

  // Add equipment insights
  if (facilityProfile.knownEquipment.length > 0) {
    const equipmentInfo = getEquipmentInsights(facilityProfile.knownEquipment);
    equipmentInfo.insights.forEach(insight => buildingInsights.push(insight));
    equipmentInfo.opportunities.forEach(opp => operationalNotes.push(opp));
  }

  // Add schedule insights
  const scheduleInsights = getScheduleInsights(facilityProfile.operatingSchedule);
  scheduleInsights.forEach(insight => operationalNotes.push(insight));

  // Add building age insights
  const ageInsights = getBuildingAgeInsights(facilityProfile.buildingAge);
  ageInsights.forEach(insight => {
    if (insight.includes('replacement') || insight.includes('obsolete')) {
      redFlags.push(insight);
    } else {
      buildingInsights.push(insight);
    }
  });

  // Add primary concern recommendations
  const concernRecs = getPrimaryConcernRecommendations(facilityProfile.primaryEnergyConcern);
  concernRecs.forEach(rec => priorityRecommendations.push(rec));

  // Add usage-based insights if available
  if (usageMetrics) {
    if (usageMetrics.loadFactor < 0.35) {
      buildingInsights.push(`Low load factor (${(usageMetrics.loadFactor * 100).toFixed(1)}%) indicates excellent peak shaving opportunity`);
      redFlags.push('Paying for capacity you rarely use - demand management critical');
    } else if (usageMetrics.loadFactor > 0.65) {
      buildingInsights.push(`High load factor (${(usageMetrics.loadFactor * 100).toFixed(1)}%) indicates consistent baseload`);
      operationalNotes.push('Focus on efficiency improvements over peak shaving');
    }

    if (usageMetrics.peakToAverageRatio > 2.5) {
      redFlags.push(`High peak-to-average ratio (${usageMetrics.peakToAverageRatio.toFixed(1)}x) - demand spikes driving costs`);
    }

    if (usageMetrics.weatherSensitivity > 0.7) {
      buildingInsights.push('High weather sensitivity indicates HVAC-dominated load profile');
      operationalNotes.push('HVAC optimization will have outsized impact');
    }
  }

  // Match EE measures based on profile
  const allMeasures = [...batteryMeasures, ...hvacMeasures];
  matchedMeasures = allMeasures.filter(measure => {
    // Include battery measures for demand charge concerns
    if (facilityProfile.primaryEnergyConcern === 'demand_charges' && measure.category === 'battery') {
      return true;
    }
    // Include HVAC measures for most facilities
    if (measure.category === 'hvac') {
      return true;
    }
    // Include lighting measures for offices, retail, warehouses
    if (measure.category === 'lighting' && 
        ['office', 'retail', 'warehouse', 'school'].includes(facilityProfile.facilityType || '')) {
      return true;
    }
    return false;
  });

  // Deduplicate and sort recommendations
  const seenMeasures = new Set<string>();
  const uniqueRecommendations = priorityRecommendations.filter(rec => {
    if (seenMeasures.has(rec.measureId)) return false;
    seenMeasures.add(rec.measureId);
    return true;
  });

  // Sort by priority
  uniqueRecommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return {
    verticalProfile,
    matchedMeasures,
    priorityRecommendations: uniqueRecommendations,
    buildingInsights: [...new Set(buildingInsights)],
    decarbonizationPath: [...new Set(decarbonizationPath)],
    redFlags: [...new Set(redFlags)],
    operationalNotes: [...new Set(operationalNotes)],
  };
}

/**
 * Generate a building profile summary (rule-based, or can be enhanced with OpenAI)
 */
export function generateBuildingProfileSummary(
  facilityProfile: FacilityProfile,
  analysis: FacilityAnalysis,
  usageMetrics?: UsageMetrics | null
): string {
  const parts: string[] = [];

  // Opening
  if (analysis.verticalProfile) {
    parts.push(`This ${analysis.verticalProfile.name.toLowerCase()} facility`);
  } else if (facilityProfile.facilityType) {
    parts.push(`This ${facilityProfile.facilityType.replace('_', ' ')} facility`);
  } else {
    parts.push('This facility');
  }

  // Building age context
  if (facilityProfile.buildingAge) {
    const ageText: Record<string, string> = {
      'pre_1980': 'built before 1980',
      '1980_2000': 'from the 1980s-2000s era',
      '2000_2010': 'built in the 2000s',
      'post_2010': 'with modern construction',
    };
    parts[0] += ` ${ageText[facilityProfile.buildingAge]}`;
  }

  // Operating pattern
  if (facilityProfile.operatingSchedule === '24_7') {
    parts.push('operates around the clock');
  } else if (facilityProfile.operatingSchedule === 'business_hours') {
    parts.push('operates during standard business hours');
  }

  // Climate context
  if (facilityProfile.climateZone) {
    if (facilityProfile.climateZone >= 11) {
      parts.push('faces significant cooling demands due to the hot inland climate');
    } else if (facilityProfile.climateZone <= 5) {
      parts.push('benefits from mild coastal climate conditions');
    }
  }

  // Usage metrics insight
  if (usageMetrics) {
    if (usageMetrics.loadFactor < 0.4) {
      parts.push(`The low load factor of ${(usageMetrics.loadFactor * 100).toFixed(0)}% indicates demand spikes that drive costs up.`);
    }
    if (usageMetrics.peakDemand > 500) {
      parts.push(`With peak demand of ${usageMetrics.peakDemand.toFixed(0)} kW, demand charges are likely a significant cost driver.`);
    }
  }

  // Key opportunity
  if (analysis.redFlags.length > 0) {
    parts.push(`Key issue: ${analysis.redFlags[0]}`);
  }

  // Top recommendation
  if (analysis.priorityRecommendations.length > 0) {
    const topRec = analysis.priorityRecommendations[0];
    parts.push(`Top opportunity: ${topRec.measureName} with typical savings of ${topRec.estimatedSavingsPercent[0]}-${topRec.estimatedSavingsPercent[1]}%.`);
  }

  return parts.join('. ').replace(/\.\./g, '.').trim();
}
