import React, { useMemo } from 'react';
import type { BatteryEfficiencyDiagnostic } from '../../modules/battery/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

type Props = {
  diagnostic: BatteryEfficiencyDiagnostic;
  height?: number;
};

function severityWeight(sev: 'critical' | 'moderate' | 'minor'): number {
  if (sev === 'critical') return 3;
  if (sev === 'moderate') return 2;
  return 1;
}

export const ConstraintWaterfallChart: React.FC<Props> = ({ diagnostic, height = 260 }) => {
  const data = useMemo(() => {
    const excess = diagnostic.kpis.excessEnergyKwh;
    const captured = diagnostic.kpis.shavedEnergyKwh;
    const missed = Math.max(0, excess - captured);

    const factors = diagnostic.limitingFactors ?? [];
    const weights = factors.map((f) => severityWeight(f.severity));
    const wsum = weights.reduce((s, w) => s + w, 0) || 1;

    const breakdown = factors.slice(0, 4).map((f, idx) => ({
      name:
        f.factor === 'power_limit'
          ? 'Power limit'
          : f.factor === 'capacity_limit'
            ? 'Capacity limit'
            : f.factor === 'soc_limit'
              ? 'SOC limit'
              : f.factor === 'charging_opportunity'
                ? 'Charging headroom'
                : 'Efficiency loss',
      missedKwh: (missed * (weights[idx] ?? 1)) / wsum,
      note: f.recommendation,
    }));

    return [
      { name: 'Excess above target', kwh: excess, color: '#ef4444' },
      { name: 'Captured by battery', kwh: captured, color: '#10b981' },
      { name: 'Missed (total)', kwh: missed, color: '#f59e0b' },
      ...breakdown.map((b) => ({ name: b.name, kwh: b.missedKwh, color: '#8b5cf6', note: b.note })),
    ];
  }, [diagnostic]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <div className="text-sm font-semibold text-gray-900">Constraint Breakdown</div>
      <div className="text-xs text-gray-600 mb-3">
        How much excess energy above the target existed, how much was captured, and what likely constrained the remainder.
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} interval={0} angle={-12} textAnchor="end" height={55} />
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'kWh', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }}
            formatter={(value: any) => [`${Number(value).toFixed(1)} kWh`, 'Energy']}
            labelFormatter={(label) => String(label)}
          />
          <Legend />
          <Bar dataKey="kwh" name="Energy" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={(entry as any).color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {diagnostic.limitingFactors?.length ? (
        <div className="mt-3 text-xs text-gray-600">
          Top recommendation: <span className="text-gray-900 font-medium">{diagnostic.limitingFactors[0].recommendation}</span>
        </div>
      ) : null}
    </div>
  );
};


