import React, { useMemo, useState } from 'react';
import { Calculator, Info } from 'lucide-react';
import { defaultUtilityPrograms, type UtilityProvider } from '../../data/obf/obf-eligibility';

function formatUSD(value: number): string {
  if (!Number.isFinite(value)) return '$0';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export interface OBFCalculatorProps {
  initialUtility?: UtilityProvider;
  initialProjectCost?: number;
}

/**
 * Simple OBF financing calculator:
 * - Assumes 0% interest for OBF
 * - Computes financed amount as min(projectCost, maxPerProject)
 * - Computes monthly payment as financed / termMonths
 */
export const OBFCalculator: React.FC<OBFCalculatorProps> = ({
  initialUtility = 'PGE',
  initialProjectCost = 150000,
}) => {
  const [utility, setUtility] = useState<UtilityProvider>(initialUtility);
  const [projectCost, setProjectCost] = useState<number>(initialProjectCost);
  const [termMonths, setTermMonths] = useState<number>(120);

  const program = defaultUtilityPrograms[utility];

  const maxPerProject = program.defaultMaxFinancing;
  const maxPerAccount = program.maxPerAccount;
  const minProjectCost = program.minProjectCost;

  const termOptions = useMemo(() => {
    const max = program.defaultMaxTerm;
    const options = [12, 24, 36, 48, 60, 84, 96, 120].filter((m) => m <= max);
    return options.length > 0 ? options : [max];
  }, [program.defaultMaxTerm]);

  const result = useMemo(() => {
    const eligibleByMin = projectCost >= minProjectCost;
    const financed = eligibleByMin ? Math.min(projectCost, maxPerProject) : 0;
    const monthly = financed > 0 && termMonths > 0 ? financed / termMonths : 0;
    const outOfPocket = eligibleByMin ? Math.max(0, projectCost - financed) : projectCost;

    return {
      eligibleByMin,
      financed,
      monthly,
      outOfPocket,
    };
  }, [projectCost, minProjectCost, maxPerProject, termMonths]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
          <Calculator className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-lg font-bold text-slate-900">OBF Financing Calculator</div>
          <div className="text-sm text-slate-500">Estimate financing amount and on-bill payment</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Utility</label>
          <select
            value={utility}
            onChange={(e) => setUtility(e.target.value as UtilityProvider)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          >
            {Object.keys(defaultUtilityPrograms).map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <div className="mt-2 text-xs text-slate-500 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              {program.programName} • {program.defaultInterestRate} • up to {Math.round(program.defaultMaxTerm / 12)} years
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Project Cost</label>
          <input
            type="number"
            value={Number.isFinite(projectCost) ? projectCost : 0}
            min={0}
            onChange={(e) => setProjectCost(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
          <div className="mt-2 text-xs text-slate-500">
            Min project cost: {formatUSD(minProjectCost)} • Max per project: {formatUSD(maxPerProject)}
            {typeof maxPerAccount === 'number' ? ` • Max per account: ${formatUSD(maxPerAccount)}` : ''}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Term</label>
          <select
            value={termMonths}
            onChange={(e) => setTermMonths(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          >
            {termOptions.map((m) => (
              <option key={m} value={m}>
                {m} months ({Math.round(m / 12)} years)
              </option>
            ))}
          </select>
          <div className="mt-2 text-xs text-slate-500">OBF is typically 0% interest and repaid on the bill.</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-600 mb-1">Financed Amount</div>
          <div className="text-2xl font-bold text-slate-900">{formatUSD(result.financed)}</div>
          {!result.eligibleByMin && (
            <div className="mt-2 text-xs text-amber-700">
              Below minimum project cost ({formatUSD(minProjectCost)}). Financing shown as $0.
            </div>
          )}
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-600 mb-1">Estimated Monthly On-Bill Payment</div>
          <div className="text-2xl font-bold text-slate-900">{formatUSD(result.monthly)}</div>
          <div className="mt-2 text-xs text-slate-500">0% interest assumed (simple principal / term).</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-600 mb-1">Out-of-Pocket (if any)</div>
          <div className="text-2xl font-bold text-slate-900">{formatUSD(result.outOfPocket)}</div>
          <div className="mt-2 text-xs text-slate-500">Amount above max per project (or below min threshold).</div>
        </div>
      </div>
    </div>
  );
};


