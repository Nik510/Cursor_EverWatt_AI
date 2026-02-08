/**
 * Chart Data Aggregation Utilities
 * Aggregates interval data by different time periods (daily, weekly, monthly, quarterly, yearly)
 * and extracts peaks/lows for visualization
 */

import type { LoadInterval } from '../modules/battery/types';

export type ChartViewMode = 'raw' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'peaks' | 'lows';

export interface AggregatedDataPoint {
  timestamp: Date;
  label: string;
  demand: number;
  afterBattery?: number;
  soc?: number;
  count: number; // Number of intervals aggregated
}

/**
 * Aggregate intervals by time period
 */
export function aggregateByViewMode(
  intervals: LoadInterval[],
  afterKw?: number[],
  socHistory?: number[],
  mode: ChartViewMode = 'raw'
): AggregatedDataPoint[] {
  if (mode === 'raw' || intervals.length === 0) {
    return intervals.map((interval, idx) => ({
      timestamp: interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp),
      label: formatTimestamp(interval.timestamp, mode),
      demand: interval.kw,
      afterBattery: afterKw?.[idx],
      soc: socHistory?.[idx],
      count: 1,
    }));
  }

  const grouped = new Map<string, {
    intervals: LoadInterval[];
    indices: number[];
  }>();

  // Group intervals by time period
  intervals.forEach((interval, idx) => {
    const ts = interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp);
    const key = getTimeKey(ts, mode);
    
    if (!grouped.has(key)) {
      grouped.set(key, { intervals: [], indices: [] });
    }
    grouped.get(key)!.intervals.push(interval);
    grouped.get(key)!.indices.push(idx);
  });

  // Aggregate each group
  const result: AggregatedDataPoint[] = [];
  for (const [key, group] of grouped.entries()) {
    const peakIdx = group.intervals.reduce((maxIdx, _, i, arr) => 
      arr[i].kw > arr[maxIdx].kw ? i : maxIdx, 0
    );
    const peakInterval = group.intervals[peakIdx];
    const peakOriginalIdx = group.indices[peakIdx];
    
    // For peaks mode, only include peak intervals
    if (mode === 'peaks') {
      const isPeak = group.intervals.every((i) => i.kw <= peakInterval.kw);
      if (isPeak) {
        result.push({
          timestamp: peakInterval.timestamp instanceof Date ? peakInterval.timestamp : new Date(peakInterval.timestamp),
          label: formatTimestamp(peakInterval.timestamp, mode),
          demand: peakInterval.kw,
          afterBattery: afterKw?.[peakOriginalIdx],
          soc: socHistory?.[peakOriginalIdx],
          count: group.intervals.length,
        });
      }
    }
    // For lows mode, only include minimum intervals
    else if (mode === 'lows') {
      const lowIdx = group.intervals.reduce((minIdx, _, i, arr) => 
        arr[i].kw < arr[minIdx].kw ? i : minIdx, 0
      );
      const lowInterval = group.intervals[lowIdx];
      const lowOriginalIdx = group.indices[lowIdx];
      result.push({
        timestamp: lowInterval.timestamp instanceof Date ? lowInterval.timestamp : new Date(lowInterval.timestamp),
        label: formatTimestamp(lowInterval.timestamp, mode),
        demand: lowInterval.kw,
        afterBattery: afterKw?.[lowOriginalIdx],
        soc: socHistory?.[lowOriginalIdx],
        count: group.intervals.length,
      });
    }
    // For other modes, use average or peak depending on mode
    else {
      const avgDemand = group.intervals.reduce((sum, i) => sum + i.kw, 0) / group.intervals.length;
      const avgAfterKw = group.indices.length > 0 && afterKw
        ? group.indices.reduce((sum, idx) => sum + (afterKw[idx] ?? 0), 0) / group.indices.length
        : undefined;
      const avgSoc = group.indices.length > 0 && socHistory
        ? group.indices.reduce((sum, idx) => sum + (socHistory[idx] ?? 0), 0) / group.indices.length
        : undefined;

      result.push({
        timestamp: peakInterval.timestamp instanceof Date ? peakInterval.timestamp : new Date(peakInterval.timestamp),
        label: formatTimestamp(peakInterval.timestamp, mode),
        demand: avgDemand,
        afterBattery: avgAfterKw,
        soc: avgSoc,
        count: group.intervals.length,
      });
    }
  }

  return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function getTimeKey(timestamp: Date, mode: ChartViewMode): string {
  const year = timestamp.getFullYear();
  const month = timestamp.getMonth() + 1;
  const week = getWeekNumber(timestamp);
  const quarter = Math.floor(month / 3) + 1;
  const day = timestamp.getDate();
  const hour = timestamp.getHours();

  switch (mode) {
    case 'daily':
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    case 'weekly':
      return `${year}-W${String(week).padStart(2, '0')}`;
    case 'monthly':
      return `${year}-${String(month).padStart(2, '0')}`;
    case 'quarterly':
      return `${year}-Q${quarter}`;
    case 'yearly':
      return String(year);
    case 'peaks':
    case 'lows':
      // For peaks/lows, group by day to find daily peaks/lows
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    default:
      return timestamp.toISOString();
  }
}

function formatTimestamp(timestamp: Date | string, mode: ChartViewMode): string {
  const ts = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  switch (mode) {
    case 'daily':
      return ts.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    case 'weekly':
      const week = getWeekNumber(ts);
      return `${ts.getFullYear()} Week ${week}`;
    case 'monthly':
      return ts.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    case 'quarterly':
      const quarter = Math.floor(ts.getMonth() / 3) + 1;
      return `Q${quarter} ${ts.getFullYear()}`;
    case 'yearly':
      return String(ts.getFullYear());
    case 'peaks':
      return ts.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' (Peak)';
    case 'lows':
      return ts.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' (Low)';
    default:
      return ts.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

