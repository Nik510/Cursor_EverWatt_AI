import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export type SRateDailyCharge = {
  date: string; // YYYY-MM-DD
  peakCharge: number;
  partPeakCharge: number;
  total: number;
};

type Props = {
  dailyCharges: SRateDailyCharge[];
  baselineCharges?: SRateDailyCharge[];
  optimizedCharges?: SRateDailyCharge[];
  height?: number;
};

export const SRateDailyBreakdown: React.FC<Props> = ({ dailyCharges, baselineCharges, optimizedCharges, height = 280 }) => {
  const data = useMemo(() => {
    const map = (arr?: SRateDailyCharge[]) => {
      const m = new Map<string, SRateDailyCharge>();
      (arr ?? []).forEach((d) => m.set(d.date, d));
      return m;
    };
    const cur = map(dailyCharges);
    const base = map(baselineCharges);
    const opt = map(optimizedCharges);

    const dates = Array.from(new Set([...(cur.keys() as any), ...(base.keys() as any), ...(opt.keys() as any)])).sort();
    return dates.slice(-31).map((date) => ({
      date,
      currentTotal: cur.get(date)?.total ?? 0,
      baselineTotal: base.get(date)?.total ?? null,
      optimizedTotal: opt.get(date)?.total ?? null,
      currentPeak: cur.get(date)?.peakCharge ?? 0,
      currentPart: cur.get(date)?.partPeakCharge ?? 0,
    }));
  }, [dailyCharges, baselineCharges, optimizedCharges]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <div className="text-sm font-semibold text-gray-900">Option S Daily Demand Charges</div>
      <div className="text-xs text-gray-600 mb-3">
        Daily Peak + Part-Peak demand charges (last ~31 days shown if available). Use this to see whether savings come from many days (good) or a few outliers.
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} interval="preserveStartEnd" />
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }}
            formatter={(value: any, name) => [`$${Number(value).toFixed(2)}`, name]}
          />
          <Legend />
          <Bar dataKey="currentPeak" name="Peak (daily)" stackId="cur" fill="#8b5cf6" />
          <Bar dataKey="currentPart" name="Part-Peak (daily)" stackId="cur" fill="#c4b5fd" />
          {/* Optional comparison lines as bars (not stacked) */}
          {baselineCharges?.length ? <Bar dataKey="baselineTotal" name="Baseline total" fill="#ef4444" opacity={0.35} /> : null}
          {optimizedCharges?.length ? <Bar dataKey="optimizedTotal" name="Optimized total" fill="#10b981" opacity={0.35} /> : null}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};


