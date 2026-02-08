import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

export type SRateChargeBreakdown = {
  dailyDemandCharge: number;
  monthlyDemandCharge: number;
  totalDemandCharge: number;
};

type Props = {
  baselineCharges: SRateChargeBreakdown;
  batteryCharges: SRateChargeBreakdown;
  optimizedCharges?: SRateChargeBreakdown;
  height?: number;
};

export const SRateSavingsWaterfall: React.FC<Props> = ({ baselineCharges, batteryCharges, optimizedCharges, height = 240 }) => {
  const data = useMemo(() => {
    const rows = [
      { name: 'Baseline daily', value: baselineCharges.dailyDemandCharge, fill: '#ef4444' },
      { name: 'Baseline monthly', value: baselineCharges.monthlyDemandCharge, fill: '#ef4444' },
      { name: 'Battery daily', value: batteryCharges.dailyDemandCharge, fill: '#10b981' },
      { name: 'Battery monthly', value: batteryCharges.monthlyDemandCharge, fill: '#10b981' },
    ];
    if (optimizedCharges) {
      rows.push({ name: 'Optimized daily', value: optimizedCharges.dailyDemandCharge, fill: '#3b82f6' });
      rows.push({ name: 'Optimized monthly', value: optimizedCharges.monthlyDemandCharge, fill: '#3b82f6' });
    }
    rows.push({ name: 'Baseline total', value: baselineCharges.totalDemandCharge, fill: '#111827' });
    rows.push({ name: 'Battery total', value: batteryCharges.totalDemandCharge, fill: '#111827' });
    if (optimizedCharges) rows.push({ name: 'Optimized total', value: optimizedCharges.totalDemandCharge, fill: '#111827' });
    return rows;
  }, [baselineCharges, batteryCharges, optimizedCharges]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <div className="text-sm font-semibold text-gray-900">Option S Demand Charge Components</div>
      <div className="text-xs text-gray-600 mb-3">
        Breaks Option S demand charges into daily accumulation and monthly components. Option S often “wins” by reducing the impact of a single monthly spike.
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} interval={0} angle={-10} textAnchor="end" height={55} />
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
          <Tooltip formatter={(v: any) => `$${Number(v).toFixed(2)}`} />
          <Bar dataKey="value" isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={(d as any).fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};


