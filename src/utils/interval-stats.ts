/**
 * Interval Statistics Utility
 * Calculates comprehensive statistics from interval load data
 */

import type { LoadInterval } from '../modules/battery/types';

export interface IntervalStats {
  totalPoints: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  daysCount: number;
  intervalResolution: '15-min' | '30-min' | '60-min' | 'unknown';
  intervalMinutes: number;
  missingDataPercent: number;
  peakDemand: {
    kw: number;
    timestamp: Date;
  };
  minDemand: {
    kw: number;
    timestamp: Date;
  };
  avgDemand: number;
  loadFactor: number;
  totalEnergyKwh: number;
  dataQualityScore: number;
}

export interface PeakEventStats {
  totalEvents: number;
  longestEventDuration: number; // in minutes
  maxEventsPerDay: number;
  percentile95EventEnergy: number; // kWh
  eventFrequencyByHour: number[]; // 24-element array
  avgEventDuration: number; // in minutes
  avgEventEnergy: number; // kWh
}

export interface PeakEvent {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  peakKw: number;
  energyKwh: number;
}

/**
 * Calculate comprehensive interval statistics
 */
export function calculateIntervalStats(intervals: LoadInterval[]): IntervalStats {
  if (!intervals || intervals.length === 0) {
    return {
      totalPoints: 0,
      dateRange: { start: new Date(), end: new Date() },
      daysCount: 0,
      intervalResolution: 'unknown',
      intervalMinutes: 0,
      missingDataPercent: 100,
      peakDemand: { kw: 0, timestamp: new Date() },
      minDemand: { kw: 0, timestamp: new Date() },
      avgDemand: 0,
      loadFactor: 0,
      totalEnergyKwh: 0,
      dataQualityScore: 0,
    };
  }

  // Parse timestamps and filter valid intervals
  const validIntervals = intervals
    .map(i => ({
      timestamp: i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp),
      kw: typeof i.kw === 'number' ? i.kw : parseFloat(String(i.kw)) || 0,
    }))
    .filter(i => !isNaN(i.timestamp.getTime()) && isFinite(i.kw))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (validIntervals.length === 0) {
    return {
      totalPoints: intervals.length,
      dateRange: { start: new Date(), end: new Date() },
      daysCount: 0,
      intervalResolution: 'unknown',
      intervalMinutes: 0,
      missingDataPercent: 100,
      peakDemand: { kw: 0, timestamp: new Date() },
      minDemand: { kw: 0, timestamp: new Date() },
      avgDemand: 0,
      loadFactor: 0,
      totalEnergyKwh: 0,
      dataQualityScore: 0,
    };
  }

  const start = validIntervals[0].timestamp;
  const end = validIntervals[validIntervals.length - 1].timestamp;
  
  // Detect interval resolution
  const intervalMinutes = detectResolution(validIntervals);
  const resolution = getResolutionLabel(intervalMinutes);
  
  // Calculate unique days
  const uniqueDays = new Set(validIntervals.map(i => i.timestamp.toISOString().slice(0, 10)));
  const daysCount = uniqueDays.size;
  
  // Find peak and min
  let peakDemand = { kw: -Infinity, timestamp: validIntervals[0].timestamp };
  let minDemand = { kw: Infinity, timestamp: validIntervals[0].timestamp };
  let sum = 0;
  
  for (const interval of validIntervals) {
    if (interval.kw > peakDemand.kw) {
      peakDemand = { kw: interval.kw, timestamp: interval.timestamp };
    }
    if (interval.kw < minDemand.kw) {
      minDemand = { kw: interval.kw, timestamp: interval.timestamp };
    }
    sum += interval.kw;
  }
  
  const avgDemand = sum / validIntervals.length;
  const loadFactor = peakDemand.kw > 0 ? avgDemand / peakDemand.kw : 0;
  
  // Calculate total energy (kW * hours)
  const hoursPerInterval = intervalMinutes / 60;
  const totalEnergyKwh = sum * hoursPerInterval;
  
  // Calculate missing data percentage
  const spanMs = end.getTime() - start.getTime();
  const expectedIntervals = Math.max(1, Math.floor(spanMs / (intervalMinutes * 60 * 1000)) + 1);
  const missingDataPercent = Math.max(0, ((expectedIntervals - validIntervals.length) / expectedIntervals) * 100);
  
  // Calculate data quality score (0-100)
  let qualityScore = 100;
  qualityScore -= Math.min(50, missingDataPercent); // Penalize missing data
  qualityScore -= validIntervals.filter(i => i.kw < 0).length / validIntervals.length * 20; // Penalize negative values
  qualityScore = Math.max(0, Math.min(100, qualityScore));
  
  return {
    totalPoints: validIntervals.length,
    dateRange: { start, end },
    daysCount,
    intervalResolution: resolution,
    intervalMinutes,
    missingDataPercent,
    peakDemand,
    minDemand,
    avgDemand,
    loadFactor,
    totalEnergyKwh,
    dataQualityScore: Math.round(qualityScore),
  };
}

/**
 * Detect peak events where demand exceeds threshold
 */
export function detectPeakEvents(
  intervals: LoadInterval[],
  thresholdKw: number
): PeakEvent[] {
  if (!intervals || intervals.length === 0) return [];

  const validIntervals = intervals
    .map(i => ({
      timestamp: i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp),
      kw: typeof i.kw === 'number' ? i.kw : parseFloat(String(i.kw)) || 0,
    }))
    .filter(i => !isNaN(i.timestamp.getTime()) && isFinite(i.kw))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const intervalMinutes = detectResolution(validIntervals);
  const events: PeakEvent[] = [];
  let currentEvent: {
    startTime: Date;
    intervals: Array<{ timestamp: Date; kw: number }>;
  } | null = null;

  for (let i = 0; i < validIntervals.length; i++) {
    const interval = validIntervals[i];
    const isAboveThreshold = interval.kw > thresholdKw;

    if (isAboveThreshold) {
      if (!currentEvent) {
        currentEvent = {
          startTime: interval.timestamp,
          intervals: [],
        };
      }
      currentEvent.intervals.push(interval);
    } else if (currentEvent) {
      // End current event
      const lastInterval = currentEvent.intervals[currentEvent.intervals.length - 1];
      events.push({
        startTime: currentEvent.startTime,
        endTime: lastInterval.timestamp,
        durationMinutes: currentEvent.intervals.length * intervalMinutes,
        peakKw: Math.max(...currentEvent.intervals.map(i => i.kw)),
        energyKwh: currentEvent.intervals.reduce((sum, i) => sum + i.kw, 0) * (intervalMinutes / 60),
      });
      currentEvent = null;
    }
  }

  // Close any remaining event
  if (currentEvent && currentEvent.intervals.length > 0) {
    const lastInterval = currentEvent.intervals[currentEvent.intervals.length - 1];
    events.push({
      startTime: currentEvent.startTime,
      endTime: lastInterval.timestamp,
      durationMinutes: currentEvent.intervals.length * intervalMinutes,
      peakKw: Math.max(...currentEvent.intervals.map(i => i.kw)),
      energyKwh: currentEvent.intervals.reduce((sum, i) => sum + i.kw, 0) * (intervalMinutes / 60),
    });
  }

  return events;
}

/**
 * Calculate peak event statistics
 */
export function calculatePeakEventStats(events: PeakEvent[]): PeakEventStats {
  const emptyStats: PeakEventStats = {
    totalEvents: 0,
    longestEventDuration: 0,
    maxEventsPerDay: 0,
    percentile95EventEnergy: 0,
    eventFrequencyByHour: new Array(24).fill(0),
    avgEventDuration: 0,
    avgEventEnergy: 0,
  };

  if (!events || events.length === 0) {
    return emptyStats;
  }

  // Longest event
  const longestEventDuration = Math.max(...events.map(e => e.durationMinutes));
  
  // Events per day
  const eventsByDay = new Map<string, number>();
  for (const event of events) {
    const dayKey = event.startTime.toISOString().slice(0, 10);
    eventsByDay.set(dayKey, (eventsByDay.get(dayKey) || 0) + 1);
  }
  const maxEventsPerDay = eventsByDay.size > 0 ? Math.max(...eventsByDay.values()) : 0;
  
  // Event frequency by hour
  const eventFrequencyByHour = new Array(24).fill(0);
  for (const event of events) {
    const hour = event.startTime.getHours();
    eventFrequencyByHour[hour]++;
  }
  
  // Average duration and energy
  const totalDuration = events.reduce((sum, e) => sum + e.durationMinutes, 0);
  const totalEnergy = events.reduce((sum, e) => sum + e.energyKwh, 0);
  const avgEventDuration = totalDuration / events.length;
  const avgEventEnergy = totalEnergy / events.length;
  
  // 95th percentile event energy
  const sortedEnergies = events.map(e => e.energyKwh).sort((a, b) => a - b);
  const p95Index = Math.floor(sortedEnergies.length * 0.95);
  const percentile95EventEnergy = sortedEnergies[Math.min(p95Index, sortedEnergies.length - 1)];
  
  return {
    totalEvents: events.length,
    longestEventDuration,
    maxEventsPerDay,
    percentile95EventEnergy,
    eventFrequencyByHour,
    avgEventDuration,
    avgEventEnergy,
  };
}

/**
 * Calculate TOU (Time-of-Use) distribution
 */
export function calculateTOUDistribution(intervals: LoadInterval[]): {
  onPeakKwh: number;
  offPeakKwh: number;
  partialPeakKwh: number;
  superOffPeakKwh: number;
  onPeakPercent: number;
  offPeakPercent: number;
  partialPeakPercent: number;
  superOffPeakPercent: number;
} {
  if (!intervals || intervals.length === 0) {
    return {
      onPeakKwh: 0,
      offPeakKwh: 0,
      partialPeakKwh: 0,
      superOffPeakKwh: 0,
      onPeakPercent: 0,
      offPeakPercent: 0,
      partialPeakPercent: 0,
      superOffPeakPercent: 0,
    };
  }

  const intervalMinutes = detectResolution(intervals.map(i => ({
    timestamp: i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp),
    kw: typeof i.kw === 'number' ? i.kw : parseFloat(String(i.kw)) || 0,
  })));
  const hoursPerInterval = intervalMinutes / 60;

  let onPeakKwh = 0;
  let offPeakKwh = 0;
  let partialPeakKwh = 0;
  let superOffPeakKwh = 0;

  for (const interval of intervals) {
    const timestamp = interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp);
    const kw = typeof interval.kw === 'number' ? interval.kw : parseFloat(String(interval.kw)) || 0;
    const kwh = kw * hoursPerInterval;
    
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay(); // 0 = Sunday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const month = timestamp.getMonth(); // 0-11
    const isSummer = month >= 5 && month <= 9; // June - October

    // Simplified TOU periods (PG&E B-19/B-20 style)
    if (isWeekend) {
      // Weekends: mostly off-peak with some super off-peak
      if (hour >= 0 && hour < 9) {
        superOffPeakKwh += kwh;
      } else {
        offPeakKwh += kwh;
      }
    } else if (isSummer) {
      // Summer weekdays
      if (hour >= 16 && hour < 21) {
        onPeakKwh += kwh;
      } else if ((hour >= 14 && hour < 16) || (hour >= 21 && hour < 23)) {
        partialPeakKwh += kwh;
      } else if (hour >= 0 && hour < 9) {
        superOffPeakKwh += kwh;
      } else {
        offPeakKwh += kwh;
      }
    } else {
      // Winter weekdays
      if (hour >= 16 && hour < 21) {
        onPeakKwh += kwh;
      } else if ((hour >= 9 && hour < 16) || (hour >= 21 && hour < 23)) {
        partialPeakKwh += kwh;
      } else {
        offPeakKwh += kwh;
      }
    }
  }

  const totalKwh = onPeakKwh + offPeakKwh + partialPeakKwh + superOffPeakKwh;

  return {
    onPeakKwh,
    offPeakKwh,
    partialPeakKwh,
    superOffPeakKwh,
    onPeakPercent: totalKwh > 0 ? (onPeakKwh / totalKwh) * 100 : 0,
    offPeakPercent: totalKwh > 0 ? (offPeakKwh / totalKwh) * 100 : 0,
    partialPeakPercent: totalKwh > 0 ? (partialPeakKwh / totalKwh) * 100 : 0,
    superOffPeakPercent: totalKwh > 0 ? (superOffPeakKwh / totalKwh) * 100 : 0,
  };
}

/**
 * Calculate monthly demand patterns
 */
export function calculateMonthlyDemandPattern(intervals: LoadInterval[]): Array<{
  month: string;
  monthIndex: number;
  peakKw: number;
  avgKw: number;
  totalKwh: number;
}> {
  if (!intervals || intervals.length === 0) return [];

  const intervalMinutes = detectResolution(intervals.map(i => ({
    timestamp: i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp),
    kw: typeof i.kw === 'number' ? i.kw : parseFloat(String(i.kw)) || 0,
  })));
  const hoursPerInterval = intervalMinutes / 60;

  const monthlyData = new Map<string, { peak: number; sum: number; count: number; monthIndex: number }>();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (const interval of intervals) {
    const timestamp = interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp);
    const kw = typeof interval.kw === 'number' ? interval.kw : parseFloat(String(interval.kw)) || 0;
    
    if (isNaN(timestamp.getTime()) || !isFinite(kw)) continue;

    const monthIndex = timestamp.getMonth();
    const year = timestamp.getFullYear();
    const key = `${year}-${monthIndex}`;

    const existing = monthlyData.get(key) || { peak: 0, sum: 0, count: 0, monthIndex };
    existing.peak = Math.max(existing.peak, kw);
    existing.sum += kw;
    existing.count++;
    monthlyData.set(key, existing);
  }

  return Array.from(monthlyData.entries())
    .map(([key, data]) => ({
      month: `${monthNames[data.monthIndex]} ${key.split('-')[0].slice(2)}`,
      monthIndex: data.monthIndex,
      peakKw: data.peak,
      avgKw: data.count > 0 ? data.sum / data.count : 0,
      totalKwh: data.sum * hoursPerInterval,
    }))
    .sort((a, b) => {
      const [yearA, monthA] = Object.keys(monthlyData).find(k => monthlyData.get(k)?.monthIndex === a.monthIndex)?.split('-').map(Number) || [0, 0];
      const [yearB, monthB] = Object.keys(monthlyData).find(k => monthlyData.get(k)?.monthIndex === b.monthIndex)?.split('-').map(Number) || [0, 0];
      return (yearA * 12 + monthA) - (yearB * 12 + monthB);
    });
}

/**
 * Calculate weekday vs weekend comparison
 */
export function calculateWeekdayWeekendComparison(intervals: LoadInterval[]): {
  weekday: { avgKw: number; peakKw: number; totalKwh: number };
  weekend: { avgKw: number; peakKw: number; totalKwh: number };
} {
  if (!intervals || intervals.length === 0) {
    return {
      weekday: { avgKw: 0, peakKw: 0, totalKwh: 0 },
      weekend: { avgKw: 0, peakKw: 0, totalKwh: 0 },
    };
  }

  const intervalMinutes = detectResolution(intervals.map(i => ({
    timestamp: i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp),
    kw: typeof i.kw === 'number' ? i.kw : parseFloat(String(i.kw)) || 0,
  })));
  const hoursPerInterval = intervalMinutes / 60;

  let weekdaySum = 0, weekdayCount = 0, weekdayPeak = 0;
  let weekendSum = 0, weekendCount = 0, weekendPeak = 0;

  for (const interval of intervals) {
    const timestamp = interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp);
    const kw = typeof interval.kw === 'number' ? interval.kw : parseFloat(String(interval.kw)) || 0;
    
    if (isNaN(timestamp.getTime()) || !isFinite(kw)) continue;

    const dayOfWeek = timestamp.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      weekendSum += kw;
      weekendCount++;
      weekendPeak = Math.max(weekendPeak, kw);
    } else {
      weekdaySum += kw;
      weekdayCount++;
      weekdayPeak = Math.max(weekdayPeak, kw);
    }
  }

  return {
    weekday: {
      avgKw: weekdayCount > 0 ? weekdaySum / weekdayCount : 0,
      peakKw: weekdayPeak,
      totalKwh: weekdaySum * hoursPerInterval,
    },
    weekend: {
      avgKw: weekendCount > 0 ? weekendSum / weekendCount : 0,
      peakKw: weekendPeak,
      totalKwh: weekendSum * hoursPerInterval,
    },
  };
}

/**
 * Detect interval resolution from data
 */
function detectResolution(intervals: Array<{ timestamp: Date; kw: number }>): number {
  if (intervals.length < 2) return 15; // default

  // Sample multiple gaps to determine resolution
  const gaps: number[] = [];
  for (let i = 1; i < Math.min(intervals.length, 100); i++) {
    const diff = (intervals[i].timestamp.getTime() - intervals[i - 1].timestamp.getTime()) / 60000;
    if (diff > 0 && diff < 120) { // Only consider reasonable gaps
      gaps.push(diff);
    }
  }

  if (gaps.length === 0) return 15;

  // Find the most common gap
  const gapCounts = new Map<number, number>();
  for (const gap of gaps) {
    const rounded = Math.round(gap / 5) * 5; // Round to nearest 5 minutes
    gapCounts.set(rounded, (gapCounts.get(rounded) || 0) + 1);
  }

  let mostCommon = 15;
  let maxCount = 0;
  for (const [gap, count] of gapCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = gap;
    }
  }

  return mostCommon;
}

/**
 * Get resolution label
 */
function getResolutionLabel(minutes: number): '15-min' | '30-min' | '60-min' | 'unknown' {
  if (minutes <= 17) return '15-min';
  if (minutes <= 35) return '30-min';
  if (minutes <= 65) return '60-min';
  return 'unknown';
}
