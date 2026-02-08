/**
 * Rate Calculation Functions
 * Calculate costs based on utility rates and usage data
 */

import type { 
  UtilityRate, 
  TOURate, 
  TieredRate, 
  DemandRate, 
  BlendedRate,
  RateCalculationResult,
  AnnualRateCalculationResult,
  TimeOfUsePeriod,
  IntervalDataPoint,
} from './types';
import { parseDate, isSameDay, startOfDay, endOfDay } from '../date';
import { formatDate } from '../format';

/**
 * Get season for a given date
 */
function getSeason(date: Date): 'Summer' | 'Winter' | 'Spring' | 'Fall' {
  const month = date.getMonth() + 1; // 1-12
  if (month >= 6 && month <= 9) return 'Summer';
  if (month >= 12 || month <= 2) return 'Winter';
  if (month >= 3 && month <= 5) return 'Spring';
  return 'Fall';
}

/**
 * Check if date is a weekend
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Check if date is a holiday (simplified - can be enhanced)
 */
function isHoliday(date: Date): boolean {
  // Common holidays - can be expanded
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  
  // New Year's Day
  if (month === 1 && day === 1) return true;
  // Independence Day
  if (month === 7 && day === 4) return true;
  // Christmas
  if (month === 12 && day === 25) return true;
  
  // Add more holidays as needed
  return false;
}

/**
 * Get day type for a date
 */
function getDayType(date: Date): 'Weekday' | 'Weekend' | 'Holiday' {
  if (isHoliday(date)) return 'Holiday';
  return isWeekend(date) ? 'Weekend' : 'Weekday';
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if a time falls within a period
 */
function isInTimePeriod(
  date: Date,
  period: TimeOfUsePeriod
): boolean {
  const time = date.getHours() * 60 + date.getMinutes();
  const start = parseTime(period.start);
  const end = parseTime(period.end);
  
  // Handle periods that cross midnight
  let inTime = false;
  if (start <= end) {
    inTime = time >= start && time < end;
  } else {
    inTime = time >= start || time < end;
  }
  
  // Check season
  if (period.season && period.season !== 'All') {
    const season = getSeason(date);
    if (period.season !== season) return false;
  }
  
  // Check day type
  if (period.dayType && period.dayType !== 'All') {
    const dayType = getDayType(date);
    if (period.dayType !== dayType) return false;
  }
  
  return inTime;
}

/**
 * Find applicable TOU period for a timestamp
 */
function findTOUPeriod(
  date: Date,
  periods: TimeOfUsePeriod[]
): TimeOfUsePeriod | null {
  for (const period of periods) {
    if (isInTimePeriod(date, period)) {
      return period;
    }
  }
  return null;
}

/**
 * Calculate TOU rate cost
 */
function calculateTOURate(
  rate: TOURate,
  intervalData: IntervalDataPoint[],
  month: number,
  year: number
): RateCalculationResult {
  const breakdown: RateCalculationResult['breakdown'] = [];
  let totalEnergyCost = 0;
  let totalEnergy = 0;
  const peakDemands: Record<string, number> = {};
  
  // Group intervals by period
  const periodGroups: Record<string, { energy: number; demand: number[] }> = {};
  
  for (const point of intervalData) {
    const date = typeof point.timestamp === 'string' 
      ? new Date(point.timestamp) 
      : point.timestamp;
    
    // Filter by month/year
    if (date.getMonth() + 1 !== month || date.getFullYear() !== year) {
      continue;
    }
    
    const period = findTOUPeriod(date, rate.touPeriods);
    if (!period) continue;
    
    const periodName = period.name;
    if (!periodGroups[periodName]) {
      periodGroups[periodName] = { energy: 0, demand: [] };
    }
    
    // Energy (kWh) - assume 15-minute intervals
    const energy = point.energy ?? point.demand * 0.25;
    periodGroups[periodName].energy += energy;
    periodGroups[periodName].demand.push(point.demand);
    totalEnergy += energy;
  }
  
  // Calculate costs by period
  for (const [periodName, data] of Object.entries(periodGroups)) {
    const period = rate.touPeriods.find(p => p.name === periodName);
    if (!period) continue;
    
    const energyCost = data.energy * period.energyRate;
    totalEnergyCost += energyCost;
    
    // Track peak demand for this period
    const peakDemand = Math.max(...data.demand);
    if (!peakDemands[periodName] || peakDemands[periodName] < peakDemand) {
      peakDemands[periodName] = peakDemand;
    }
    
    breakdown.push({
      period: periodName,
      energyKwh: data.energy,
      energyCost,
      demandKw: peakDemand,
    });
  }
  
  // Calculate demand charges
  let totalDemandCost = 0;
  if (rate.demandCharges) {
    for (const demandCharge of rate.demandCharges) {
      const applicablePeak = peakDemands[demandCharge.period || 'All'] || 
                            Math.max(...Object.values(peakDemands));
      
      if (applicablePeak > 0) {
        const demandCost = applicablePeak * demandCharge.rate;
        totalDemandCost += demandCost;
        
        // Add to breakdown
        const breakdownItem = breakdown.find(b => b.period === demandCharge.period);
        if (breakdownItem) {
          breakdownItem.demandCost = demandCost;
        } else {
          breakdown.push({
            period: demandCharge.name,
            energyKwh: 0,
            energyCost: 0,
            demandKw: applicablePeak,
            demandCost,
          });
        }
      }
    }
  }
  
  // Fixed charges
  const fixedCharges = (rate.fixedCharges || []).reduce((sum, fc) => sum + fc.amount, 0);
  
  // Minimum charge
  const subtotal = totalEnergyCost + totalDemandCost + fixedCharges;
  const totalCost = rate.minimumCharge ? Math.max(subtotal, rate.minimumCharge) : subtotal;
  
  return {
    totalCost,
    energyCost: totalEnergyCost,
    demandCost: totalDemandCost,
    fixedCharges,
    breakdown,
    month,
    year,
  };
}

/**
 * Calculate tiered rate cost
 */
function calculateTieredRate(
  rate: TieredRate,
  intervalData: IntervalDataPoint[],
  month: number,
  year: number
): RateCalculationResult {
  let totalEnergy = 0;
  const breakdown: RateCalculationResult['breakdown'] = [];
  
  // Sum total energy for the month
  for (const point of intervalData) {
    const date = typeof point.timestamp === 'string' 
      ? new Date(point.timestamp) 
      : point.timestamp;
    
    if (date.getMonth() + 1 !== month || date.getFullYear() !== year) {
      continue;
    }
    
    const energy = point.energy ?? point.demand * 0.25;
    totalEnergy += energy;
  }
  
  // Calculate cost by tier
  let totalEnergyCost = 0;
  let remainingEnergy = totalEnergy;
  let cumulativeEnergy = 0;
  
  for (const tier of rate.tiers.sort((a, b) => (a.tier || 0) - (b.tier || 0))) {
    if (remainingEnergy <= 0) break;
    
    let tierEnergy = 0;
    if (tier.threshold) {
      if (tier.thresholdType === 'cumulative') {
        // Energy up to this threshold
        tierEnergy = Math.min(remainingEnergy, Math.max(0, tier.threshold - cumulativeEnergy));
        cumulativeEnergy = tier.threshold;
      } else {
        // Incremental tier
        tierEnergy = Math.min(remainingEnergy, tier.threshold);
      }
    } else {
      // Last tier - all remaining energy
      tierEnergy = remainingEnergy;
    }
    
    const tierCost = tierEnergy * tier.rate;
    totalEnergyCost += tierCost;
    remainingEnergy -= tierEnergy;
    
    breakdown.push({
      period: tier.name || `Tier ${tier.tier}`,
      energyKwh: tierEnergy,
      energyCost: tierCost,
    });
  }
  
  // Calculate demand charges
  let totalDemandCost = 0;
  const peakDemand = Math.max(
    ...intervalData
      .filter(point => {
        const date = typeof point.timestamp === 'string' 
          ? new Date(point.timestamp) 
          : point.timestamp;
        return date.getMonth() + 1 === month && date.getFullYear() === year;
      })
      .map(point => point.demand)
  );
  
  if (rate.demandCharges && peakDemand > 0) {
    for (const demandCharge of rate.demandCharges) {
      totalDemandCost += peakDemand * demandCharge.rate;
    }
    
    breakdown.push({
      period: 'Demand',
      energyKwh: 0,
      energyCost: 0,
      demandKw: peakDemand,
      demandCost: totalDemandCost,
    });
  }
  
  // Fixed charges
  const fixedCharges = (rate.fixedCharges || []).reduce((sum, fc) => sum + fc.amount, 0);
  
  // Minimum charge
  const subtotal = totalEnergyCost + totalDemandCost + fixedCharges;
  const totalCost = rate.minimumCharge ? Math.max(subtotal, rate.minimumCharge) : subtotal;
  
  return {
    totalCost,
    energyCost: totalEnergyCost,
    demandCost: totalDemandCost,
    fixedCharges,
    breakdown,
    month,
    year,
  };
}

/**
 * Calculate demand rate cost
 */
function calculateDemandRate(
  rate: DemandRate,
  intervalData: IntervalDataPoint[],
  month: number,
  year: number
): RateCalculationResult {
  let totalEnergy = 0;
  let peakDemand = 0;
  
  for (const point of intervalData) {
    const date = typeof point.timestamp === 'string' 
      ? new Date(point.timestamp) 
      : point.timestamp;
    
    if (date.getMonth() + 1 !== month || date.getFullYear() !== year) {
      continue;
    }
    
    const energy = point.energy ?? point.demand * 0.25;
    totalEnergy += energy;
    peakDemand = Math.max(peakDemand, point.demand);
  }
  
  const energyCost = totalEnergy * rate.energyRate;
  
  // Calculate demand charges
  let totalDemandCost = 0;
  if (rate.demandCharges && peakDemand > 0) {
    for (const demandCharge of rate.demandCharges) {
      totalDemandCost += peakDemand * demandCharge.rate;
    }
  }
  
  // Fixed charges
  const fixedCharges = (rate.fixedCharges || []).reduce((sum, fc) => sum + fc.amount, 0);
  
  // Minimum charge
  const subtotal = energyCost + totalDemandCost + fixedCharges;
  const totalCost = rate.minimumCharge ? Math.max(subtotal, rate.minimumCharge) : subtotal;
  
  return {
    totalCost,
    energyCost,
    demandCost: totalDemandCost,
    fixedCharges,
    breakdown: [{
      period: 'All Hours',
      energyKwh: totalEnergy,
      energyCost,
      demandKw: peakDemand,
      demandCost: totalDemandCost,
    }],
    month,
    year,
  };
}

/**
 * Calculate blended rate cost
 */
function calculateBlendedRate(
  rate: BlendedRate,
  intervalData: IntervalDataPoint[],
  month: number,
  year: number
): RateCalculationResult {
  let totalEnergy = 0;
  let peakDemand = 0;
  
  for (const point of intervalData) {
    const date = typeof point.timestamp === 'string' 
      ? new Date(point.timestamp) 
      : point.timestamp;
    
    if (date.getMonth() + 1 !== month || date.getFullYear() !== year) {
      continue;
    }
    
    const energy = point.energy ?? point.demand * 0.25;
    totalEnergy += energy;
    peakDemand = Math.max(peakDemand, point.demand);
  }
  
  const energyCost = totalEnergy * rate.energyRate;
  
  // Calculate demand charges
  let totalDemandCost = 0;
  if (rate.demandCharges && peakDemand > 0) {
    for (const demandCharge of rate.demandCharges) {
      totalDemandCost += peakDemand * demandCharge.rate;
    }
  }
  
  // Fixed charges
  const fixedCharges = (rate.fixedCharges || []).reduce((sum, fc) => sum + fc.amount, 0);
  
  // Minimum charge
  const subtotal = energyCost + totalDemandCost + fixedCharges;
  const totalCost = rate.minimumCharge ? Math.max(subtotal, rate.minimumCharge) : subtotal;
  
  return {
    totalCost,
    energyCost,
    demandCost: totalDemandCost,
    fixedCharges,
    breakdown: [{
      period: 'All Hours',
      energyKwh: totalEnergy,
      energyCost,
      demandKw: peakDemand,
      demandCost: totalDemandCost,
    }],
    month,
    year,
  };
}

/**
 * Calculate monthly cost for any rate type
 */
export function calculateMonthlyCost(
  rate: UtilityRate,
  intervalData: IntervalDataPoint[],
  month: number,
  year: number
): RateCalculationResult {
  switch (rate.rateType) {
    case 'TOU':
      return calculateTOURate(rate, intervalData, month, year);
    case 'Tiered':
      return calculateTieredRate(rate, intervalData, month, year);
    case 'Demand':
      return calculateDemandRate(rate, intervalData, month, year);
    case 'Blended':
      return calculateBlendedRate(rate, intervalData, month, year);
    case 'RealTime':
    case 'CriticalPeak':
      // Fallback to blended calculation for now
      return calculateBlendedRate({ ...rate, rateType: 'Blended', energyRate: rate.baseRate || 0.15 }, intervalData, month, year);
    default:
      throw new Error(`Unsupported rate type: ${(rate as any).rateType}`);
  }
}

/**
 * Calculate annual cost
 */
export function calculateAnnualCost(
  rate: UtilityRate,
  intervalData: IntervalDataPoint[]
): AnnualRateCalculationResult {
  const monthlyBreakdown: RateCalculationResult[] = [];
  let totalCost = 0;
  let totalEnergyCost = 0;
  let totalDemandCost = 0;
  let totalFixedCharges = 0;
  let peakDemand = 0;
  let totalEnergy = 0;
  
  // Get year from first data point
  const firstDate = typeof intervalData[0]?.timestamp === 'string'
    ? new Date(intervalData[0].timestamp)
    : intervalData[0]?.timestamp;
  const year = firstDate?.getFullYear() || new Date().getFullYear();
  
  // Calculate for each month
  for (let month = 1; month <= 12; month++) {
    const monthly = calculateMonthlyCost(rate, intervalData, month, year);
    monthlyBreakdown.push(monthly);
    
    totalCost += monthly.totalCost;
    totalEnergyCost += monthly.energyCost;
    totalDemandCost += monthly.demandCost;
    totalFixedCharges += monthly.fixedCharges;
    
    // Track peak demand
    const monthPeak = Math.max(
      ...monthly.breakdown.map(b => b.demandKw || 0)
    );
    peakDemand = Math.max(peakDemand, monthPeak);
    
    // Track total energy
    totalEnergy += monthly.breakdown.reduce((sum, b) => sum + b.energyKwh, 0);
  }
  
  return {
    totalCost,
    energyCost: totalEnergyCost,
    demandCost: totalDemandCost,
    fixedCharges: totalFixedCharges,
    monthlyBreakdown,
    averageMonthlyCost: totalCost / 12,
    peakDemand,
    totalEnergy,
  };
}

/**
 * Calculate savings from peak shaving
 */
export function calculatePeakShavingSavings(
  rate: UtilityRate,
  originalPeakKw: number,
  newPeakKw: number,
  months: number = 12
): number {
  if (originalPeakKw <= newPeakKw) return 0;
  
  const demandReduction = originalPeakKw - newPeakKw;
  let monthlySavings = 0;
  
  // Calculate demand charge savings
  if (rate.rateType === 'TOU' && 'demandCharges' in rate && rate.demandCharges) {
    for (const demandCharge of rate.demandCharges) {
      monthlySavings += demandReduction * demandCharge.rate;
    }
  } else if (rate.rateType === 'Demand' && 'demandCharges' in rate && rate.demandCharges) {
    for (const demandCharge of rate.demandCharges) {
      monthlySavings += demandReduction * demandCharge.rate;
    }
  } else if (rate.rateType === 'Blended' && 'demandCharges' in rate && rate.demandCharges) {
    for (const demandCharge of rate.demandCharges) {
      monthlySavings += demandReduction * demandCharge.rate;
    }
  }
  
  return monthlySavings * months;
}
