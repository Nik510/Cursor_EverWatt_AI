import React, { useEffect, useState } from 'react';

export interface HVACOptimizationCalculatorProps {
  initial?: {
    baselineAnnualKwh?: number;
    ratePerKwh?: number;
    savingsPercent?: number;
    projectCost?: number;
  };
}

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const HVACOptimizationCalculator: React.FC<HVACOptimizationCalculatorProps> = ({ initial }) => {
  const [baselineAnnualKwh, setBaselineAnnualKwh] = useState(String(initial?.baselineAnnualKwh ?? 250000));
  const [ratePerKwh, setRatePerKwh] = useState(String(initial?.ratePerKwh ?? 0.12));
  const [savingsPercent, setSavingsPercent] = useState(String(initial?.savingsPercent ?? 20));
  const [projectCost, setProjectCost] = useState(String(initial?.projectCost ?? 40000));
  const [result, setResult] = useState<{
    savedKwh: number;
    savedCost: number;
    paybackYears: number | null;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch calculation from backend
  useEffect(() => {
    const base = Math.max(0, num(baselineAnnualKwh));
    const rate = Math.max(0, num(ratePerKwh));
    const pct = Math.min(100, Math.max(0, num(savingsPercent)));
    const cost = Math.max(0, num(projectCost));

    if (base === 0 && rate === 0 && pct === 0 && cost === 0) {
      setResult(null);
      return;
    }

    let cancelled = false;
    setIsCalculating(true);
    (async () => {
      try {
        const response = await fetch('/api/training/calculate-hvac-optimization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baselineAnnualKwh: base, ratePerKwh: rate, savingsPercent: pct, projectCost: cost }),
        });
        if (!response.ok) throw new Error('Calculation failed');
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Calculation failed');
        if (!cancelled) {
          setResult({
            savedKwh: data.result.savedKwh,
            savedCost: data.result.savedCost,
            paybackYears: data.result.paybackYears,
          });
        }
      } catch (err) {
        console.error('Failed to calculate HVAC optimization:', err);
        if (!cancelled) setResult(null);
      } finally {
        if (!cancelled) setIsCalculating(false);
      }
    })();

    return () => { cancelled = true; };
  }, [baselineAnnualKwh, ratePerKwh, savingsPercent, projectCost]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="text-sm">
          <div className="font-semibold text-slate-700 mb-1">Baseline HVAC (kWh/yr)</div>
          <input
            value={baselineAnnualKwh}
            onChange={(e) => setBaselineAnnualKwh(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
        <label className="text-sm">
          <div className="font-semibold text-slate-700 mb-1">$/kWh</div>
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
        <label className="text-sm">
          <div className="font-semibold text-slate-700 mb-1">Project cost ($)</div>
          <input
            value={projectCost}
            onChange={(e) => setProjectCost(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
      </div>

      {isCalculating && (
        <div className="text-center text-slate-600 py-4">Calculating...</div>
      )}
      {!isCalculating && result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Energy savings</div>
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
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Simple payback</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {result.paybackYears !== null ? result.paybackYears.toFixed(1) : '—'} yrs
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


