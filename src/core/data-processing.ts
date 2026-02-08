/**
 * Core data processing utilities
 * Handles interval data validation, unit detection, gap identification
 */

import type { IntervalDataPoint, DataQuality } from './types';

/**
 * Detects units from data (kW vs MW)
 * Assumes data is in consistent units
 */
export function detectUnits(data: IntervalDataPoint[]): 'kW' | 'MW' | 'unknown' {
  if (data.length === 0) return 'unknown';
  
  const maxDemand = Math.max(...data.map(d => d.demand));
  
  // Heuristic: if max demand > 1000, likely MW; otherwise kW
  if (maxDemand > 1000) {
    return 'MW';
  }
  return 'kW';
}

/**
 * Validates interval data quality
 */
export function validateDataQuality(
  data: IntervalDataPoint[],
  expectedIntervalMinutes: number = 15
): DataQuality {
  const gaps: Array<{ start: Date; end: Date }> = [];
  const outliers: number[] = [];
  
  if (data.length === 0) {
    return {
      isValid: false,
      gaps: [],
      outliers: [],
      unitDetected: 'unknown',
      sampleRate: 0,
    };
  }
  
  // Sort by timestamp
  const sorted = [...data].sort((a, b) => {
    const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime();
    const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime();
    return timeA - timeB;
  });
  
  // Detect gaps
  for (let i = 1; i < sorted.length; i++) {
    const prevTimestamp = sorted[i - 1].timestamp;
    const currTimestamp = sorted[i].timestamp;
    
    const prevDate = typeof prevTimestamp === 'string' ? new Date(prevTimestamp) : prevTimestamp;
    const currDate = typeof currTimestamp === 'string' ? new Date(currTimestamp) : currTimestamp;
    
    const prevTime = prevDate.getTime();
    const currTime = currDate.getTime();
    
    const diffMinutes = (currTime - prevTime) / (1000 * 60);
    
    if (diffMinutes > expectedIntervalMinutes * 1.5) {
      gaps.push({
        start: prevDate,
        end: currDate,
      });
    }
  }
  
  // Detect outliers (using IQR method)
  const demands = sorted.map(d => d.demand);
  const q1 = percentile(demands, 0.25);
  const q3 = percentile(demands, 0.75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  demands.forEach((demand, idx) => {
    if (demand < lowerBound || demand > upperBound) {
      outliers.push(idx);
    }
  });
  
  // Calculate expected vs actual sample rate
  const firstTime = typeof sorted[0].timestamp === 'string'
    ? new Date(sorted[0].timestamp).getTime()
    : sorted[0].timestamp.getTime();
  const lastTime = typeof sorted[sorted.length - 1].timestamp === 'string'
    ? new Date(sorted[sorted.length - 1].timestamp).getTime()
    : sorted[sorted.length - 1].timestamp.getTime();
  
  const totalMinutes = (lastTime - firstTime) / (1000 * 60);
  const expectedSamples = Math.floor(totalMinutes / expectedIntervalMinutes);
  const sampleRate = expectedSamples > 0 ? sorted.length / expectedSamples : 0;
  
  return {
    isValid: gaps.length === 0 && sampleRate > 0.95,
    gaps,
    outliers,
    unitDetected: detectUnits(sorted),
    sampleRate,
  };
}

/**
 * Calculate percentile
 */
function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

/**
 * Convert units if needed
 */
export function convertUnits(
  data: IntervalDataPoint[],
  targetUnit: 'kW' | 'MW'
): IntervalDataPoint[] {
  const currentUnit = detectUnits(data);
  
  if (currentUnit === targetUnit) return data;
  
  const multiplier = currentUnit === 'MW' && targetUnit === 'kW' ? 1000 :
                     currentUnit === 'kW' && targetUnit === 'MW' ? 0.001 : 1;
  
  return data.map(point => ({
    ...point,
    demand: point.demand * multiplier,
    energy: point.energy ? point.energy * multiplier : undefined,
  }));
}

