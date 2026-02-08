import React, { useMemo } from 'react';
import type { BatterySpec, PeakEvent, SimulationResult, LoadInterval } from '../../modules/battery/types';
import { ResponsiveContainer, ScatterChart, CartesianGrid, XAxis, YAxis, Tooltip, Scatter, Legend } from 'recharts';

type Props = {
  peakEvents: PeakEvent[];
  simulationResult: SimulationResult;
  battery: BatterySpec;
  /** Needed to compute per-event capture rate from intervals. If omitted, we fall back to event totalExcessKwh only. */
  thresholdKw?: number;
  intervals?: LoadInterval[];
  height?: number;
};

function safeDate(ts: Date | string): Date {
  const d = ts instanceof Date ? ts : new Date(ts);
  return Number.isFinite(d.getTime()) ? d : new Date(0);
}

export const PeakEventScatterPlot: React.FC<Props> = ({ peakEvents, simulationResult, thresholdKw, intervals, height = 280 }) => {
  const afterKw =
    simulationResult.new_intervals_kw && simulationResult.new_intervals_kw.length
      ? simulationResult.new_intervals_kw
      : simulationResult.final_load_profile?.intervals?.map((i) => i.kw) ?? [];

  const data = useMemo(() => {
    return (peakEvents ?? []).map((e, idx) => {
      const dur = e.durationHours;
      const avgExcessKw = dur > 0 ? e.totalExcessKwh / dur : 0;

      let captureRate: number | null = null;
      if (thresholdKw != null && intervals && intervals.length === afterKw.length) {
        const start = safeDate(e.start).getTime();
        const end = safeDate(e.end).getTime();
        let excessKwh = 0;
        let capturedKwh = 0;
        const intervalHours = 0.25;
        for (let i = 0; i < intervals.length; i++) {
          const ts = safeDate(intervals[i].timestamp).getTime();
          if (ts < start || ts > end) continue;
          const before = intervals[i].kw;
          const after = afterKw[i] ?? before;
          const excess = Math.max(0, before - thresholdKw);
          const shaved = Math.min(excess, Math.max(0, before - after));
          excessKwh += excess * intervalHours;
          capturedKwh += shaved * intervalHours;
        }
        captureRate = excessKwh > 0 ? capturedKwh / excessKwh : 0;
      }

      return {
        idx,
        durationHours: dur,
        magnitudeKw: avgExcessKw,
        captureRate: captureRate == null ? 0 : captureRate,
        label: `${safeDate(e.start).toLocaleDateString()} (${dur.toFixed(2)}h)`,
      };
    });
  }, [peakEvents, thresholdKw, intervals, afterKw]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <div className="text-sm font-semibold text-gray-900">Peak Events: Duration vs Magnitude</div>
      <div className="text-xs text-gray-600 mb-3">
        Each dot is a peak event. Short/high events are power-limited; long events are energy-limited. Color indicates capture rate.
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" dataKey="durationHours" name="Duration" unit=" h" stroke="#6b7280" />
          <YAxis type="number" dataKey="magnitudeKw" name="Avg Excess" unit=" kW" stroke="#6b7280" />
          <Tooltip
            contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }}
            formatter={(value: any, name) => {
              if (name === 'captureRate') return [`${(Number(value) * 100).toFixed(1)}%`, 'Capture rate'];
              return [Number(value).toFixed(2), name];
            }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
          />
          <Legend />
          <Scatter name="Peak events" data={data} fill="#3b82f6" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};


