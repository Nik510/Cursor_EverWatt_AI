import React, { useMemo } from 'react';
import type { LoadInterval, PeakEvent, SimulationResult } from '../../modules/battery/types';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
} from 'recharts';

type Props = {
  intervals: LoadInterval[];
  peakEvents: PeakEvent[];
  socHistory: number[];
  simulationResult: SimulationResult;
  height?: number;
  onEventClick?: (event: PeakEvent) => void;
  /** Max number of points to render (prevents UI freezes on large interval series). */
  maxPoints?: number;
};

function safeDate(ts: Date | string): Date {
  const d = ts instanceof Date ? ts : new Date(ts);
  return Number.isFinite(d.getTime()) ? d : new Date(0);
}

export const PeakEventTimeline: React.FC<Props> = ({
  intervals,
  peakEvents,
  socHistory,
  simulationResult,
  height = 320,
  onEventClick,
  maxPoints = 2000,
}) => {
  const afterKw =
    simulationResult.new_intervals_kw && simulationResult.new_intervals_kw.length
      ? simulationResult.new_intervals_kw
      : simulationResult.final_load_profile?.intervals?.map((i) => i.kw) ?? [];

  const data = useMemo(() => {
    const sampleRate = intervals.length > maxPoints ? Math.ceil(intervals.length / maxPoints) : 1;
    const out: Array<{
      /** x-axis position in the sampled series */
      x: number;
      /** original interval index */
      originalIdx: number;
      ts: Date;
      demandKw: number;
      afterKw: number;
      socPct: number | null;
    }> = [];

    for (let idx = 0; idx < intervals.length; idx += sampleRate) {
      const i = intervals[idx];
      const ts = safeDate(i.timestamp);
      out.push({
        x: out.length,
        originalIdx: idx,
        ts,
        demandKw: i.kw,
        afterKw: afterKw[idx] ?? i.kw,
        socPct: socHistory[idx] != null ? socHistory[idx] * 100 : null,
      });
    }
    if (intervals.length > 0 && (intervals.length - 1) % sampleRate !== 0) {
      const idx = intervals.length - 1;
      const i = intervals[idx];
      const ts = safeDate(i.timestamp);
      out.push({
        x: out.length,
        originalIdx: idx,
        ts,
        demandKw: i.kw,
        afterKw: afterKw[idx] ?? i.kw,
        socPct: socHistory[idx] != null ? socHistory[idx] * 100 : null,
      });
    }

    return out;
  }, [intervals, afterKw, socHistory, maxPoints]);

  const eventRanges = useMemo(() => {
    if (!peakEvents?.length || data.length === 0) return [];
    const tsArr = data.map((d) => d.ts.getTime());

    return peakEvents
      .map((e) => {
        const start = safeDate(e.start).getTime();
        const end = safeDate(e.end).getTime();
        // Find closest indices (inclusive) in the sampled series
        let startIdx = 0;
        let endIdx = tsArr.length - 1;
        for (let i = 0; i < tsArr.length; i++) {
          if (tsArr[i] >= start) {
            startIdx = i;
            break;
          }
        }
        for (let i = tsArr.length - 1; i >= 0; i--) {
          if (tsArr[i] <= end) {
            endIdx = i;
            break;
          }
        }
        return { startIdx, endIdx, event: e };
      })
      .filter((r) => r.endIdx >= r.startIdx);
  }, [peakEvents, data]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm font-semibold text-gray-900">Peak Events Timeline</div>
          <div className="text-xs text-gray-600">
            Baseline vs post-dispatch kW with SOC overlay. Highlighted bands indicate detected peak events.
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 10, right: 50, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
          <XAxis
            dataKey="x"
            tickFormatter={(x: number) => {
              const d = data[x];
              if (!d) return '';
              const date = d.ts;
              // Show date and time for better readability
              return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            }}
            interval="preserveStartEnd"
            stroke="#6b7280"
            style={{ fontSize: '11px' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            yAxisId="kw"
            stroke="#6b7280"
            style={{ fontSize: '11px' }}
            label={{ value: 'kW', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '12px' } }}
            width={60}
          />
          <YAxis
            yAxisId="soc"
            orientation="right"
            domain={[0, 100]}
            stroke="#8b5cf6"
            style={{ fontSize: '11px' }}
            label={{ value: 'SOC (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: '12px' } }}
            width={60}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px' }}
            labelFormatter={(x) => {
              const d = data[Number(x)];
              return d ? d.ts.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            }}
            formatter={(value: any, name) => {
              if (name === 'SOC') return [`${Number(value).toFixed(1)}%`, name];
              return [`${Number(value).toFixed(1)} kW`, name];
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />

          {eventRanges.map((r, i) => (
            <ReferenceArea
              key={i}
              x1={r.startIdx}
              x2={r.endIdx}
              yAxisId="kw"
              fill="#fbbf24"
              fillOpacity={0.15}
              stroke="#f59e0b"
              strokeOpacity={0.3}
              strokeWidth={1}
              ifOverflow="extendDomain"
              onClick={() => onEventClick?.(r.event)}
              style={{ cursor: onEventClick ? 'pointer' : 'default' }}
            />
          ))}

          {/* Only show original demand when it's significantly different */}
          <Line 
            yAxisId="kw" 
            type="monotone" 
            dataKey="demandKw" 
            name="Original Demand" 
            stroke="#ef4444" 
            strokeWidth={1.5} 
            dot={false}
            strokeDasharray="5 5"
            opacity={0.7}
          />
          <Line 
            yAxisId="kw" 
            type="monotone" 
            dataKey="afterKw" 
            name="After Battery" 
            stroke="#10b981" 
            strokeWidth={2.5} 
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="soc"
            type="monotone"
            dataKey="socPct"
            name="SOC"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};


