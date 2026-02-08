import React from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DemandDataPoint {
  time: string;
  demand: number;
  afterBattery?: number;
  shavedKw?: number;
}

interface DemandProfileChartProps {
  data: DemandDataPoint[];
  height?: number;
  /** Max number of points to render (prevents UI freezes on large interval series). */
  maxPoints?: number;
}

export const DemandProfileChart: React.FC<DemandProfileChartProps> = ({ data, height = 300, maxPoints = 2000 }) => {
  const sampleRate = data.length > maxPoints ? Math.ceil(data.length / maxPoints) : 1;

  const chartData: DemandDataPoint[] = [];
  for (let idx = 0; idx < data.length; idx += sampleRate) {
    const d = data[idx];
    const shaved = d.afterBattery !== undefined ? Math.max(d.demand - d.afterBattery, 0) : undefined;
    chartData.push({ ...d, shavedKw: shaved });
  }
  // Ensure last point is included for context
  if (data.length > 0 && (data.length - 1) % sampleRate !== 0) {
    const d = data[data.length - 1];
    const shaved = d.afterBattery !== undefined ? Math.max(d.demand - d.afterBattery, 0) : undefined;
    chartData.push({ ...d, shavedKw: shaved });
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="time" 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          label={{ value: 'kW', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
          }}
          formatter={(value: number, name) => [`${value.toFixed(0)} kW`, name]}
        />
        <Legend />
        {chartData[0]?.shavedKw !== undefined && (
          <Area
            type="monotone"
            dataKey="shavedKw"
            name="Shaved by Battery"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.25}
          />
        )}
        <Line 
          type="monotone" 
          dataKey="demand" 
          stroke="#3b82f6" 
          strokeWidth={2}
          name="Original Demand"
          dot={false}
        />
        {chartData[0]?.afterBattery !== undefined && (
          <Line 
            type="monotone" 
            dataKey="afterBattery" 
            stroke="#10b981" 
            strokeWidth={2}
            name="After Battery"
            dot={false}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

