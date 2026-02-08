import React, { useMemo, useState } from 'react';
import { Activity, Fan, Gauge, Waves } from 'lucide-react';

type LoadType = 'variable-torque' | 'constant-torque' | 'constant-power';

export interface VFDFitCheckerDiagramProps {
  title?: string;
  subtitle?: string;
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export const VFDFitCheckerDiagram: React.FC<VFDFitCheckerDiagramProps> = ({ title, subtitle }) => {
  const [loadType, setLoadType] = useState<LoadType>('variable-torque');
  const [speed, setSpeed] = useState(0.8); // 0..1

  const result = useMemo(() => {
    const s = Math.max(0.1, Math.min(1, speed));
    const powerFrac =
      loadType === 'variable-torque'
        ? Math.pow(s, 3)
        : loadType === 'constant-torque'
          ? s
          : 1; // constant power
    const savings = 1 - powerFrac;
    return { s, powerFrac, savings };
  }, [loadType, speed]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-pink-600 text-white">
        <div className="font-extrabold tracking-tight">{title ?? 'VFD Fit Checker'}</div>
        <div className="text-xs text-white/85 mt-1">
          {subtitle ?? 'Quick intuition: how speed reduction affects power for different load types.'}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Load type</div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setLoadType('variable-torque')}
              className={[
                'w-full px-4 py-3 rounded-2xl border text-left transition-colors',
                loadType === 'variable-torque'
                  ? 'bg-indigo-50 border-indigo-300'
                  : 'bg-white border-slate-200 hover:bg-slate-50',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-pink-600 text-white flex items-center justify-center">
                  <Fan className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-slate-900">Variable torque (fans/pumps)</div>
                  <div className="text-sm text-slate-600">Power ∝ speed³ (big savings)</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setLoadType('constant-torque')}
              className={[
                'w-full px-4 py-3 rounded-2xl border text-left transition-colors',
                loadType === 'constant-torque'
                  ? 'bg-indigo-50 border-indigo-300'
                  : 'bg-white border-slate-200 hover:bg-slate-50',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-pink-600 text-white flex items-center justify-center">
                  <Waves className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-slate-900">Constant torque (conveyors)</div>
                  <div className="text-sm text-slate-600">Power ∝ speed (moderate savings)</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setLoadType('constant-power')}
              className={[
                'w-full px-4 py-3 rounded-2xl border text-left transition-colors',
                loadType === 'constant-power'
                  ? 'bg-indigo-50 border-indigo-300'
                  : 'bg-white border-slate-200 hover:bg-slate-50',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-pink-600 text-white flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-slate-900">Constant power (some spindles)</div>
                  <div className="text-sm text-slate-600">Power ~ constant (controls benefits, not energy)</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="p-5 rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-4">
              <div className="font-extrabold text-slate-900 flex items-center gap-2">
                <Gauge className="w-5 h-5 text-slate-700" />
                Speed setting
              </div>
              <div className="text-sm font-semibold text-slate-700">{pct(result.s)}</div>
            </div>

            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={result.s}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full mt-3"
            />

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Power fraction</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">{pct(result.powerFrac)}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Estimated savings</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">{pct(result.savings)}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Best fit for VFD</div>
                <div className="text-sm font-semibold text-slate-700 mt-2">
                  {loadType === 'variable-torque'
                    ? 'Excellent (fans/pumps)'
                    : loadType === 'constant-torque'
                      ? 'Good (process dependent)'
                      : 'Limited (control reasons only)'}
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-1">Field shortcut</div>
              <div>
                If you see <strong>throttling valves</strong> (pumps) or <strong>inlet dampers</strong> (fans), a VFD is often a strong opportunity.
                For fans/pumps, the affinity law is the story: <strong>power falls with speed³</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VFDFitCheckerDiagram;


