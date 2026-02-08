import React, { useMemo } from 'react';
import type { LoadInterval } from '../../modules/battery/types';
import { HeatMap, type HeatMapCell } from '../ee-training/widgets/HeatMap';
import type { OptionSRates } from '../../utils/battery/s-rate-calculations';

type DispatchLike = {
  modifiedIntervals: LoadInterval[];
};

type Props = {
  intervals: LoadInterval[];
  sRateDispatch: DispatchLike;
  rates: OptionSRates;
  mode?: 'discharge' | 'charge';
  title?: string;
  subtitle?: string;
};

function safeDate(ts: Date | string): Date {
  const d = ts instanceof Date ? ts : new Date(ts);
  return Number.isFinite(d.getTime()) ? d : new Date(0);
}

export const SRateWindowHeatmap: React.FC<Props> = ({
  intervals,
  sRateDispatch,
  rates,
  mode = 'discharge',
  title,
  subtitle,
}) => {
  const rows = useMemo(() => {
    // show last 31 days if possible (row per day)
    const dayKeys: string[] = [];
    for (const i of intervals) {
      const d = safeDate(i.timestamp);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayKeys.push(k);
    }
    const unique = Array.from(new Set(dayKeys)).sort();
    const tail = unique.slice(-31);
    return tail.map((k) => ({ key: k, label: k.slice(5) })); // MM-DD
  }, [intervals]);

  const cols = useMemo(() => Array.from({ length: 24 }, (_, h) => ({ key: String(h), label: String(h).padStart(2, '0') })), []);

  const cells = useMemo(() => {
    const byDayHour = new Map<string, { sum: number; n: number }>();
    const after = sRateDispatch.modifiedIntervals;

    const baseByTs = new Map<number, number>();
    for (const i of intervals) baseByTs.set(safeDate(i.timestamp).getTime(), i.kw);

    for (const i of after) {
      const ts = safeDate(i.timestamp);
      const dk = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}`;
      const hour = ts.getHours();
      const base = baseByTs.get(ts.getTime());
      if (base == null) continue;
      const net = i.kw;
      const discharge = Math.max(0, base - net);
      const charge = Math.max(0, net - base);
      const v = mode === 'discharge' ? discharge : charge;
      const k = `${dk}|${hour}`;
      const cur = byDayHour.get(k) ?? { sum: 0, n: 0 };
      cur.sum += v;
      cur.n += 1;
      byDayHour.set(k, cur);
    }

    const out: HeatMapCell[] = [];
    for (const r of rows) {
      for (const c of cols) {
        const k = `${r.key}|${c.key}`;
        const v = byDayHour.get(k);
        const avg = v && v.n > 0 ? v.sum / v.n : 0;
        out.push({
          row: r.key,
          col: c.key,
          value: avg,
          tooltip: `${r.key} ${String(c.key).padStart(2, '0')}:00: ${avg.toFixed(2)} kW ${mode}`,
        });
      }
    }
    return out;
  }, [intervals, sRateDispatch, rows, cols, mode]);

  const peak = rates.peakHoursLocal ?? { startHour: 16, endHour: 21 };
  const part = rates.partPeakWindowsLocal ?? [
    { startHour: 14, endHour: 16 },
    { startHour: 21, endHour: 23 },
  ];
  const excl = rates.monthlyExclusionHoursLocal ?? { startHour: 9, endHour: 14 };

  const windowHint = `Peak ${peak.startHour}-${peak.endHour}, Part ${part.map((p) => `${p.startHour}-${p.endHour}`).join(', ')}, Excl ${excl.startHour}-${excl.endHour}`;

  return (
    <HeatMap
      title={title ?? `Option S Window Heatmap (${mode})`}
      subtitle={subtitle ?? `Average ${mode} kW by day and hour. ${windowHint}`}
      data={cells}
      rows={rows}
      cols={cols}
      colorScale="cool-warm"
      showValues={false}
      showLegend
      cellSize="sm"
      className="mt-0"
    />
  );
};


