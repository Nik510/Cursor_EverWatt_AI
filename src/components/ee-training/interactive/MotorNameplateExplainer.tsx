import React, { useMemo, useState } from 'react';
import { BadgeCheck, Hash, Info, Zap } from 'lucide-react';

type FieldId = 'hp' | 'voltage' | 'fla' | 'rpm' | 'eff' | 'sf' | 'frame' | 'ie';

type Field = {
  id: FieldId;
  label: string;
  whatItMeans: string;
  whyItMatters: string;
  fieldTip: string;
};

export interface MotorNameplateExplainerProps {
  title?: string;
  subtitle?: string;
}

const FIELDS: Field[] = [
  {
    id: 'hp',
    label: 'HP (Horsepower)',
    whatItMeans: 'Rated output power of the motor.',
    whyItMatters: 'Energy scales with kW × hours. HP helps size savings and rebates ($/HP).',
    fieldTip: 'Photograph the HP and note estimated runtime hours.',
  },
  {
    id: 'voltage',
    label: 'Voltage (V)',
    whatItMeans: 'Supply voltage (e.g., 460V, 208V).',
    whyItMatters: 'Determines VFD selection, wiring, and compatibility.',
    fieldTip: 'Capture voltage and phase; confirm panel feed if unclear.',
  },
  {
    id: 'fla',
    label: 'FLA (Full Load Amps)',
    whatItMeans: 'Current draw at rated load.',
    whyItMatters: 'Useful for sanity-checking motor size and for protection/overload settings.',
    fieldTip: 'Compare measured amps to FLA to see if motor is lightly loaded.',
  },
  {
    id: 'rpm',
    label: 'RPM',
    whatItMeans: 'Nominal speed (e.g., 1760 rpm = 4-pole).',
    whyItMatters: 'Helps identify pole count and application type; impacts fan/pump curves.',
    fieldTip: 'RPM + fan sheave size helps verify if motor is over-speeding/under-speeding.',
  },
  {
    id: 'eff',
    label: 'Efficiency (%)',
    whatItMeans: 'Electrical-to-mechanical efficiency at rated load.',
    whyItMatters: 'Premium efficiency upgrades yield small % gains, but big lifetime savings at high hours.',
    fieldTip: 'If efficiency is missing, record model number and look up datasheet.',
  },
  {
    id: 'sf',
    label: 'Service Factor (SF)',
    whatItMeans: 'Overload capability (e.g., 1.15).',
    whyItMatters: 'Indicates margin; can mask oversizing or temporary overload needs.',
    fieldTip: 'SF > 1.0 doesn’t mean “safe to overload forever”. Treat as margin.',
  },
  {
    id: 'frame',
    label: 'Frame',
    whatItMeans: 'Mechanical mounting dimensions (e.g., 184T).',
    whyItMatters: 'Critical for “drop-in” replacements.',
    fieldTip: 'Capture frame to avoid expensive mechanical rework.',
  },
  {
    id: 'ie',
    label: 'Efficiency Class (IE / NEMA)',
    whatItMeans: 'Standard class (IE3/NEMA Premium, IE4, etc.).',
    whyItMatters: 'Informs expected efficiency and rebate qualification.',
    fieldTip: 'If it says “NEMA Premium”, note it—replacement may not pencil.',
  },
];

export const MotorNameplateExplainer: React.FC<MotorNameplateExplainerProps> = ({ title, subtitle }) => {
  const [selected, setSelected] = useState<FieldId>('hp');
  const field = useMemo(() => FIELDS.find((f) => f.id === selected)!, [selected]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-pink-600 text-white">
        <div className="font-extrabold tracking-tight">{title ?? 'Motor Nameplate Explainer'}</div>
        <div className="text-xs text-white/85 mt-1">
          {subtitle ?? 'Click a field to understand what it means and what to capture on-site.'}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Nameplate fields</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FIELDS.map((f) => {
              const active = f.id === selected;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelected(f.id)}
                  className={[
                    'px-3 py-2 rounded-xl border text-sm font-semibold text-left transition-colors',
                    active ? 'bg-indigo-50 border-indigo-300 text-indigo-800' : 'bg-white border-slate-200 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    <span>{f.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="p-5 rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-pink-600 text-white flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-extrabold text-slate-900">{field.label}</div>
                <div className="text-sm text-slate-600 mt-1">{field.whatItMeans}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Why it matters
                </div>
                <div className="text-sm text-slate-700">{field.whyItMatters}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4" />
                  Field tip
                </div>
                <div className="text-sm text-slate-700">{field.fieldTip}</div>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Best practice: always capture a clear nameplate photo + controller/VFD photo + runtime estimate.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MotorNameplateExplainer;


