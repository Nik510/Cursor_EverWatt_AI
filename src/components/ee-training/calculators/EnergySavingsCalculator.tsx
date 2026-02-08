import React, { useEffect, useState } from 'react';

export interface EnergySavingsCalculatorProps {
  initial?: {
    baselineKwh?: number;
    improvedKwh?: number;
    ratePerKwh?: number;
  };
}

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const EnergySavingsCalculator: React.FC<EnergySavingsCalculatorProps> = ({ initial }) => {
  const [baselineKwh, setBaselineKwh] = useState(String(initial?.baselineKwh ?? 120000));
  const [improvedKwh, setImprovedKwh] = useState(String(initial?.improvedKwh ?? 90000));
  const [ratePerKwh, setRatePerKwh] = useState(String(initial?.ratePerKwh ?? 0.12));
  const [result, setResult] = useState<{
    base: number;
    improved: number;
    rate: number;
    savedKwh: number;
    savedPct: number;
    savedCost: number;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch calculation from backend
  useEffect(() => {
    const base = Math.max(0, num(baselineKwh));
    const improved = Math.max(0, num(improvedKwh));
    const rate = Math.max(0, num(ratePerKwh));
    
    if (base === 0 && improved === 0 && rate === 0) {
      setResult(null);
      return;
    }

    let cancelled = false;
    setIsCalculating(true);
    (async () => {
      try {
        const response = await fetch('/api/training/calculate-energy-savings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baselineKwh: base, improvedKwh: improved, ratePerKwh: rate }),
        });
        if (!response.ok) throw new Error('Calculation failed');
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Calculation failed');
        if (!cancelled) {
          setResult({
            base: data.result.baselineKwh,
            improved: data.result.improvedKwh,
            rate: data.result.ratePerKwh,
            savedKwh: data.result.savedKwh,
            savedPct: data.result.savedPct,
            savedCost: data.result.savedCost,
          });
        }
      } catch (err) {
        console.error('Failed to calculate energy savings:', err);
        if (!cancelled) setResult(null);
      } finally {
        if (!cancelled) setIsCalculating(false);
      }
    })();

    return () => { cancelled = true; };
  }, [baselineKwh, improvedKwh, ratePerKwh]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-sm">
          <div className="font-semibold text-slate-700 mb-1">Baseline (kWh/yr)</div>
          <input
            value={baselineKwh}
            onChange={(e) => setBaselineKwh(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
        <label className="text-sm">
          <div className="font-semibold text-slate-700 mb-1">Improved (kWh/yr)</div>
          <input
            value={improvedKwh}
            onChange={(e) => setImprovedKwh(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
        <label className="text-sm">
          <div className="font-semibold text-slate-700 mb-1">Utility rate ($/kWh)</div>
          <input
            value={ratePerKwh}
            onChange={(e) => setRatePerKwh(e.target.value)}
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
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Savings</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {Math.round(result.savedKwh).toLocaleString()} kWh
            </div>
            <div className="text-sm text-slate-600 mt-1">{result.savedPct.toFixed(1)}%</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Cost savings</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              ${Math.round(result.savedCost).toLocaleString()}
            </div>
            <div className="text-sm text-slate-600 mt-1">per year</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sanity check</div>
            <div className="text-sm text-slate-700 mt-1">
              Baseline: {Math.round(result.base).toLocaleString()} kWh
            </div>
            <div className="text-sm text-slate-700">
              Improved: {Math.round(result.improved).toLocaleString()} kWh
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


