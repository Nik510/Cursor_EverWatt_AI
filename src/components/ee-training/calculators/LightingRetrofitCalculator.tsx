import React, { useMemo, useState } from 'react';

export interface LightingRetrofitCalculatorProps {
  initial?: {
    fixtureCount?: number;
    existingWatts?: number;
    newWatts?: number;
    hoursPerYear?: number;
    ratePerKwh?: number;
    installCostPerFixture?: number;
    rebatePerFixture?: number;
  };
}

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const LightingRetrofitCalculator: React.FC<LightingRetrofitCalculatorProps> = ({ initial }) => {
  const [fixtureCount, setFixtureCount] = useState(String(initial?.fixtureCount ?? 200));
  const [existingWatts, setExistingWatts] = useState(String(initial?.existingWatts ?? 100));
  const [newWatts, setNewWatts] = useState(String(initial?.newWatts ?? 45));
  const [hoursPerYear, setHoursPerYear] = useState(String(initial?.hoursPerYear ?? 4000));
  const [ratePerKwh, setRatePerKwh] = useState(String(initial?.ratePerKwh ?? 0.12));
  const [installCostPerFixture, setInstallCostPerFixture] = useState(String(initial?.installCostPerFixture ?? 80));
  const [rebatePerFixture, setRebatePerFixture] = useState(String(initial?.rebatePerFixture ?? 20));

  const result = useMemo(() => {
    const count = Math.max(0, Math.floor(num(fixtureCount)));
    const wOld = Math.max(0, num(existingWatts));
    const wNew = Math.max(0, num(newWatts));
    const hrs = Math.max(0, num(hoursPerYear));
    const rate = Math.max(0, num(ratePerKwh));
    const costPer = Math.max(0, num(installCostPerFixture));
    const rebatePer = Math.max(0, num(rebatePerFixture));

    const oldKw = (count * wOld) / 1000;
    const newKw = (count * wNew) / 1000;
    const oldKwh = oldKw * hrs;
    const newKwh = newKw * hrs;
    const savedKwh = Math.max(0, oldKwh - newKwh);
    const savedCost = savedKwh * rate;

    const netCost = Math.max(0, count * costPer - count * rebatePer);
    const paybackYears = savedCost > 0 ? netCost / savedCost : Infinity;

    return { oldKwh, newKwh, savedKwh, savedCost, netCost, paybackYears };
  }, [fixtureCount, existingWatts, newWatts, hoursPerYear, ratePerKwh, installCostPerFixture, rebatePerFixture]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        <label className="text-sm md:col-span-1">
          <div className="font-semibold text-slate-700 mb-1">Qty</div>
          <input
            value={fixtureCount}
            onChange={(e) => setFixtureCount(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="numeric"
          />
        </label>
        <label className="text-sm md:col-span-1">
          <div className="font-semibold text-slate-700 mb-1">Old W</div>
          <input
            value={existingWatts}
            onChange={(e) => setExistingWatts(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
        <label className="text-sm md:col-span-1">
          <div className="font-semibold text-slate-700 mb-1">New W</div>
          <input
            value={newWatts}
            onChange={(e) => setNewWatts(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
        <label className="text-sm md:col-span-1">
          <div className="font-semibold text-slate-700 mb-1">Hours/yr</div>
          <input
            value={hoursPerYear}
            onChange={(e) => setHoursPerYear(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
        <label className="text-sm md:col-span-1">
          <div className="font-semibold text-slate-700 mb-1">$/kWh</div>
          <input
            value={ratePerKwh}
            onChange={(e) => setRatePerKwh(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
        <label className="text-sm md:col-span-1">
          <div className="font-semibold text-slate-700 mb-1">Install $/fx</div>
          <input
            value={installCostPerFixture}
            onChange={(e) => setInstallCostPerFixture(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
        <label className="text-sm md:col-span-1">
          <div className="font-semibold text-slate-700 mb-1">Rebate $/fx</div>
          <input
            value={rebatePerFixture}
            onChange={(e) => setRebatePerFixture(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="decimal"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Net project cost</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            ${Math.round(result.netCost).toLocaleString()}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Simple payback</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {Number.isFinite(result.paybackYears) ? result.paybackYears.toFixed(1) : '—'} yrs
          </div>
        </div>
      </div>
    </div>
  );
};


