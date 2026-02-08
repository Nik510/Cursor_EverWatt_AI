import React, { useEffect, useState } from 'react';
import type { FinancialAnalysis } from '../../../modules/financials/types';

export interface ROICalculatorProps {
  initial?: {
    initialCost?: number;
    annualSavings?: number;
    years?: number;
    discountRate?: number; // 0.08 = 8%
  };
}

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const ROICalculator: React.FC<ROICalculatorProps> = ({ initial }) => {
  const [initialCost, setInitialCost] = useState(String(initial?.initialCost ?? 50000));
  const [annualSavings, setAnnualSavings] = useState(String(initial?.annualSavings ?? 15000));
  const [years, setYears] = useState(String(initial?.years ?? 10));
  const [discountRate, setDiscountRate] = useState(String(initial?.discountRate ?? 0.08));
  const [analysis, setAnalysis] = useState<FinancialAnalysis | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch calculation from backend
  useEffect(() => {
    const cost = Math.max(0, num(initialCost));
    const savings = Math.max(0, num(annualSavings));
    const yrs = Math.max(1, Math.floor(num(years) || 10));
    const dr = Math.max(0, num(discountRate));

    if (cost === 0 && savings === 0) {
      setAnalysis(null);
      return;
    }

    let cancelled = false;
    setIsCalculating(true);
    (async () => {
      try {
        const response = await fetch('/api/training/calculate-roi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initialCost: cost, annualSavings: savings, years: yrs, discountRate: dr }),
        });
        if (!response.ok) throw new Error('Calculation failed');
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Calculation failed');
        if (!cancelled) setAnalysis(data.analysis);
      } catch (err) {
        console.error('Failed to calculate ROI:', err);
        if (!cancelled) setAnalysis(null);
      } finally {
        if (!cancelled) setIsCalculating(false);
      }
    })();

    return () => { cancelled = true; };
  }, [initialCost, annualSavings, years, discountRate]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="text-sm">
          <div className="font-semibold text-slate-700 mb-1">Initial cost ($)</div>
          <input
            value={initialCost}
            onChange={(e) => setInitialCost(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
        <label className="text-sm">
          <div className="font-semibold text-slate-700 mb-1">Annual savings ($/yr)</div>
          <input
            value={annualSavings}
            onChange={(e) => setAnnualSavings(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
        <label className="text-sm">
          <div className="font-semibold text-slate-700 mb-1">Analysis period (years)</div>
          <input
            value={years}
            onChange={(e) => setYears(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="numeric"
          />
        </label>
        <label className="text-sm">
          <div className="font-semibold text-slate-700 mb-1">Discount rate (0.08 = 8%)</div>
          <input
            value={discountRate}
            onChange={(e) => setDiscountRate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
      </div>

      {isCalculating && (
        <div className="text-center text-slate-600 py-4">Calculating...</div>
      )}
      {!isCalculating && analysis && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">NPV</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                ${Math.round(analysis.netPresentValue).toLocaleString()}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">IRR</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {analysis.internalRateOfReturn.toFixed(1)}%
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Simple payback</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {analysis.simplePayback.toFixed(1)} yrs
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Discounted payback</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {analysis.adjustedPayback.toFixed(1)} yrs
              </div>
            </div>
          </div>

          <details className="bg-white rounded-2xl border border-slate-200 p-4">
            <summary className="cursor-pointer font-semibold text-slate-800">Year-by-year breakdown</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="py-2 pr-4">Year</th>
                    <th className="py-2 pr-4">Savings</th>
                    <th className="py-2 pr-4">Cumulative</th>
                    <th className="py-2 pr-4">PV</th>
                    <th className="py-2 pr-4">Cumulative NPV</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.yearByYear.map((y) => (
                    <tr key={y.year} className="border-t border-slate-200">
                      <td className="py-2 pr-4">{y.year}</td>
                      <td className="py-2 pr-4">${Math.round(y.savings).toLocaleString()}</td>
                      <td className="py-2 pr-4">${Math.round(y.cumulativeSavings).toLocaleString()}</td>
                      <td className="py-2 pr-4">${Math.round(y.presentValue).toLocaleString()}</td>
                      <td className="py-2 pr-4">${Math.round(y.cumulativeNPV).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
};


