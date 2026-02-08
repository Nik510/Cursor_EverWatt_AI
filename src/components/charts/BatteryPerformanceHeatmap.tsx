import React, { useMemo } from 'react';
import type { LoadInterval, SimulationResult } from '../../modules/battery/types';
import { HeatMap, type HeatMapCell } from '../ee-training/widgets/HeatMap';

type Props = {
  intervals: LoadInterval[];
  mode: 'demand' | 'discharge' | 'soc' | 'missed';
  simulationResult?: SimulationResult;
  /**
   * Optional: used for “missed” calculation.
   * If provided, missed = max(0, (demand-threshold) - shaved).
   */
  thresholdKw?: number;
  title?: string;
  subtitle?: string;
  onCellClick?: (cell: HeatMapCell) => void;
};

function safeDate(ts: Date | string): Date {
  const d = ts instanceof Date ? ts : new Date(ts);
  return Number.isFinite(d.getTime()) ? d : new Date(0);
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const BatteryPerformanceHeatmap: React.FC<Props> = ({
  intervals,
  mode,
  simulationResult,
  thresholdKw,
  title,
  subtitle,
  onCellClick,
}) => {
  const afterKw =
    simulationResult?.new_intervals_kw && simulationResult.new_intervals_kw.length
      ? simulationResult.new_intervals_kw
      : simulationResult?.final_load_profile?.intervals?.map((i) => i.kw) ?? null;
  const soc = simulationResult?.battery_soc_history ?? null;

  const { rows, cols, cells, minValue, maxValue } = useMemo(() => {
    const rows = DOW.map((label, idx) => ({ key: String(idx), label }));
    const cols = Array.from({ length: 24 }, (_, h) => ({ key: String(h), label: String(h).padStart(2, '0') }));

    // Aggregate values into day-of-week × hour buckets
    const sum = new Map<string, number>();
    const count = new Map<string, number>();

    for (let idx = 0; idx < intervals.length; idx++) {
      const ts = safeDate(intervals[idx].timestamp);
      const dow = ts.getDay();
      const hour = ts.getHours();
      const k = `${dow}-${hour}`;

      const demand = intervals[idx].kw ?? 0;
      const after = afterKw ? afterKw[idx] ?? demand : demand;
      const socPct = soc ? (soc[idx] ?? null) : null;

      let v = 0;
      if (mode === 'demand') v = demand;
      if (mode === 'discharge') v = Math.max(0, demand - after);
      if (mode === 'soc') v = socPct != null ? socPct * 100 : 0;
      if (mode === 'missed') {
        // Missed shaving above threshold (needs threshold); else show 0s.
        if (thresholdKw != null) {
          const excess = Math.max(0, demand - thresholdKw);
          const shaved = Math.max(0, demand - after);
          v = Math.max(0, excess - shaved);
        } else {
          v = 0;
        }
      }

      sum.set(k, (sum.get(k) ?? 0) + v);
      count.set(k, (count.get(k) ?? 0) + 1);
    }

    const cells: HeatMapCell[] = [];
    let minValue = Number.POSITIVE_INFINITY;
    let maxValue = Number.NEGATIVE_INFINITY;

    for (const r of rows) {
      for (const c of cols) {
        const k = `${r.key}-${c.key}`;
        const n = count.get(k) ?? 0;
        const avg = n > 0 ? (sum.get(k) ?? 0) / n : 0;
        minValue = Math.min(minValue, avg);
        maxValue = Math.max(maxValue, avg);
        cells.push({
          row: r.key,
          col: c.key,
          value: avg,
          label: mode === 'soc' ? `${avg.toFixed(0)}%` : `${avg.toFixed(0)}`,
          tooltip:
            mode === 'soc'
              ? `${DOW[Number(r.key)]} ${String(c.key).padStart(2, '0')}:00: SOC ~${avg.toFixed(1)}%`
              : `${DOW[Number(r.key)]} ${String(c.key).padStart(2, '0')}:00: ${avg.toFixed(1)} kW`,
        });
      }
    }

    if (!Number.isFinite(minValue)) minValue = 0;
    if (!Number.isFinite(maxValue)) maxValue = 1;

    return { rows, cols, cells, minValue, maxValue };
  }, [intervals, afterKw, soc, mode, thresholdKw]);

  const defaultTitle =
    mode === 'demand'
      ? 'Demand Heatmap'
      : mode === 'discharge'
        ? 'Battery Discharge Heatmap'
        : mode === 'soc'
          ? 'SOC Heatmap'
          : 'Missed Shave Heatmap';

  const defaultSubtitle =
    mode === 'demand'
      ? 'Average kW by hour of day and day of week.'
      : mode === 'discharge'
        ? 'Average discharge (kW reduced) by hour of day and day of week.'
        : mode === 'soc'
          ? 'Average SOC (%) by hour of day and day of week.'
          : 'Average unshaved excess above threshold (kW).';

  return (
    <HeatMap
      title={title ?? defaultTitle}
      subtitle={subtitle ?? defaultSubtitle}
      data={cells}
      rows={rows}
      cols={cols}
      minValue={minValue}
      maxValue={maxValue}
      colorScale={mode === 'soc' ? 'single' : 'cool-warm'}
      showValues={false}
      showLegend
      cellSize="sm"
      onCellClick={onCellClick}
    />
  );
};


