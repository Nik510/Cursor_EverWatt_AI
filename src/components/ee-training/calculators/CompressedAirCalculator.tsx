import React, { useMemo, useState } from 'react';

export interface CompressedAirCalculatorProps {
  initial?: {
    compressorHp?: number;
    motorEfficiency?: number; // 0..1
    hoursPerYear?: number;
    ratePerKwh?: number;
    savingsPercent?: number; // 0..100
  };
}

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const CompressedAirCalculator: React.FC<CompressedAirCalculatorProps> = ({ initial }) => {
  const [compressorHp, setCompressorHp] = useState(String(initial?.compressorHp ?? 100));
  const [motorEfficiency, setMotorEfficiency] = useState(String(initial?.motorEfficiency ?? 0.9));
  const [hoursPerYear, setHoursPerYear] = useState(String(initial?.hoursPerYear ?? 6000));
  const [ratePerKwh, setRatePerKwh] = useState(String(initial?.ratePerKwh ?? 0.12));
  const [savingsPercent, setSavingsPercent] = useState(String(initial?.savingsPercent ?? 20));

  const result = useMemo(() => {
    const hp = Math.max(0, num(compressorHp));
    const eff = Math.min(1, Math.max(0.2, num(motorEfficiency) || 0.9));
    const hrs = Math.max(0, num(hoursPerYear));
    const rate = Math.max(0, num(ratePerKwh));
    const pct = Math.min(100, Math.max(0, num(savingsPercent)));

    // Rough conversion: 1 hp = 0.746 kW (shaft). Electrical kW ~ shaft/eff.
    const kw = (hp * 0.746) / eff;
    const baselineKwh = kw * hrs;
    const savedKwh = baselineKwh * (pct / 100);
    const savedCost = savedKwh * rate;

    return { kw, baselineKwh, savedKwh, savedCost };
  }, [compressorHp, motorEfficiency, hoursPerYear, ratePerKwh, savingsPercent]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <label className="text-sm">
          <div className="font-semibold text-slate-700 mb-1">Compressor HP</div>
          <input
            value={compressorHp}
            onChange={(e) => setCompressorHp(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
        <label className="text-sm">
          <div className="font-semibold text-slate-700 mb-1">Motor eff (0..1)</div>
          <input
            value={motorEfficiency}
            onChange={(e) => setMotorEfficiency(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
        <label className="text-sm">
          <div className="font-semibold text-slate-700 mb-1">Hours/year</div>
          <input
            value={hoursPerYear}
            onChange={(e) => setHoursPerYear(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
        <label className="text-sm">
          <div className="font-semibold text-slate-700 mb-1">Rate ($/kWh)</div>
          <input
            value={ratePerKwh}
            onChange={(e) => setRatePerKwh(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
        <label className="text-sm">
          <div className="font-semibold text-slate-700 mb-1">Savings (%)</div>
          <input
            value={savingsPercent}
            onChange={(e) => setSavingsPercent(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Baseline energy</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {Math.round(result.baselineKwh).toLocaleString()} kWh/yr
          </div>
          <div className="text-sm text-slate-600 mt-1">Approx {result.kw.toFixed(1)} kW</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Savings</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {Math.round(result.savedKwh).toLocaleString()} kWh/yr
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Cost savings</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            ${Math.round(result.savedCost).toLocaleString()}/yr
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-500">
        Assumption: electrical kW ≈ (HP × 0.746) / motor_eff. Use as a screening estimate.
      </div>
    </div>
  );
};


