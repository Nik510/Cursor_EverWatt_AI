import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, Droplets, Gauge, Wind } from 'lucide-react';

type NodeId =
  | 'compressor'
  | 'aftercooler'
  | 'dryer'
  | 'receiver'
  | 'filters'
  | 'headers'
  | 'drops'
  | 'enduses'
  | 'condensate';

type Node = {
  id: NodeId;
  title: string;
  icon: React.ReactNode;
  whatItIs: string;
  fieldSignals: string[];
  whyItMatters: string;
  howToSell: string;
  nextActions: string[];
};

export interface CompressedAirSystemMapProps {
  title?: string;
  subtitle?: string;
}

const NODES: Node[] = [
  {
    id: 'compressor',
    title: 'Compressor',
    icon: <Gauge className="w-5 h-5" />,
    whatItIs: 'Creates compressed air (electricity -> pressure). Part-load control dominates cost.',
    fieldSignals: ['Always-on / never unloaded', 'High discharge temp', 'Frequent cycling', 'Running at high setpoint (e.g. 120+ psi)'],
    whyItMatters: 'Most kWh is here. Bad staging/unload time wastes 10–30%+.',
    howToSell: '“We reduce wasted run time and lower pressure safely—same production, lower bill.”',
    nextActions: ['Capture nameplate + controller screenshots', 'Record setpoint and load/unload %', 'Confirm base/trim strategy'],
  },
  {
    id: 'aftercooler',
    title: 'Aftercooler',
    icon: <Wind className="w-5 h-5" />,
    whatItIs: 'Removes heat after compression; reduces moisture burden on dryers/filters.',
    fieldSignals: ['Hot piping downstream', 'High moisture carryover', 'Fans not running or fouled coil'],
    whyItMatters: 'Hot air holds more water; wet air causes tool failures and pressure drop.',
    howToSell: '“Fixing moisture upstream improves reliability and reduces maintenance calls.”',
    nextActions: ['Check temperature drop across cooler', 'Inspect coil cleanliness and fan/VFD status'],
  },
  {
    id: 'dryer',
    title: 'Dryer',
    icon: <Droplets className="w-5 h-5" />,
    whatItIs: 'Controls dew point (refrigerated vs desiccant). Often oversized or misapplied.',
    fieldSignals: ['Dew point lower than required', 'Bypassed or alarmed dryer', 'High pressure drop across dryer'],
    whyItMatters: 'Over-drying wastes energy; under-drying causes downtime.',
    howToSell: '“Match dew point to process needs—stop paying for unnecessary dryness.”',
    nextActions: ['Document dryer type and dew point setting', 'Measure ΔP across dryer/filters'],
  },
  {
    id: 'receiver',
    title: 'Receiver / Storage',
    icon: <Gauge className="w-5 h-5" />,
    whatItIs: 'Buffer tank that reduces cycling and stabilizes pressure.',
    fieldSignals: ['Small/no storage for variable demand', 'Big pressure swings', 'Compressor short cycling'],
    whyItMatters: 'Proper storage enables better sequencing and lower pressure.',
    howToSell: '“A simple tank can reduce cycling and enable control savings.”',
    nextActions: ['Record receiver size and cut-in/cut-out', 'Check automatic drains on receiver'],
  },
  {
    id: 'filters',
    title: 'Filters',
    icon: <Wind className="w-5 h-5" />,
    whatItIs: 'Protects equipment; clogged filters create pressure drop (hidden kWh).',
    fieldSignals: ['High ΔP gauge', 'Dirty elements', 'Frequent replacements'],
    whyItMatters: 'Every PSI of drop must be “re-bought” by the compressor.',
    howToSell: '“Maintenance discipline here reduces energy and improves reliability.”',
    nextActions: ['Measure ΔP across filters', 'Document filter change schedule'],
  },
  {
    id: 'headers',
    title: 'Headers / Main',
    icon: <Wind className="w-5 h-5" />,
    whatItIs: 'Main distribution piping; sizing and layout drive pressure stability.',
    fieldSignals: ['Long runs with undersized pipe', 'Known low-pressure zones', 'Multiple tees and dead-ends'],
    whyItMatters: 'Distribution losses force higher plant setpoints.',
    howToSell: '“We lower the setpoint by fixing pressure drop—not by risking tools.”',
    nextActions: ['Measure pressure at compressor and at farthest critical load', 'Map critical loads and required pressure'],
  },
  {
    id: 'drops',
    title: 'Drops & Regulators',
    icon: <Gauge className="w-5 h-5" />,
    whatItIs: 'Point-of-use regulators and drop legs; common leak and misuse points.',
    fieldSignals: ['Hissing at quick-connects', 'Regulators set wide-open', 'No drip legs / water in tools'],
    whyItMatters: 'Leaks and misuse often live here; fix = immediate savings.',
    howToSell: '“We stop paying to compress air you vent to the room.”',
    nextActions: ['Walkdown with ultrasonic leak detector', 'Tag and estimate leak sizes'],
  },
  {
    id: 'enduses',
    title: 'End Uses',
    icon: <AlertTriangle className="w-5 h-5" />,
    whatItIs: 'Tools, blow-off, actuators. Inappropriate uses drive demand.',
    fieldSignals: ['Open blow-off', 'Air used for cooling or sweeping', 'High-pressure requirement based on one tool'],
    whyItMatters: 'Eliminating bad end uses can reduce baseload dramatically.',
    howToSell: '“We reduce demand first—then you can possibly shut off a compressor.”',
    nextActions: ['Identify inappropriate uses', 'Consider engineered nozzles or electric alternatives'],
  },
  {
    id: 'condensate',
    title: 'Condensate & Drains',
    icon: <Droplets className="w-5 h-5" />,
    whatItIs: 'Automatic drains remove water; failed drains can leak air continuously.',
    fieldSignals: ['Timer drains stuck open', 'Water in lines', 'Oil/water separator issues'],
    whyItMatters: 'A single failed drain can be a massive “hidden leak”.',
    howToSell: '“This is a reliability + waste fix—quick ROI.”',
    nextActions: ['Check drain type (zero-loss vs timer)', 'Listen for constant venting'],
  },
];

export const CompressedAirSystemMap: React.FC<CompressedAirSystemMapProps> = ({ title, subtitle }) => {
  const [selected, setSelected] = useState<NodeId>('compressor');

  const node = useMemo(() => NODES.find((n) => n.id === selected)!, [selected]);

  const steps: NodeId[] = ['compressor', 'aftercooler', 'dryer', 'receiver', 'filters', 'headers', 'drops', 'enduses', 'condensate'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-pink-600 text-white">
        <div className="font-extrabold tracking-tight">{title ?? 'Compressed Air System Map'}</div>
        <div className="text-xs text-white/85 mt-1">
          {subtitle ?? 'Click each stage to learn what to look for, why it matters, and next actions.'}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Flow */}
        <div className="lg:col-span-7">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">System flow</div>
          <div className="flex flex-wrap items-center gap-2">
            {steps.map((id, idx) => {
              const n = NODES.find((x) => x.id === id)!;
              const active = id === selected;
              return (
                <React.Fragment key={id}>
                  <button
                    type="button"
                    onClick={() => setSelected(id)}
                    className={[
                      'px-3 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-colors',
                      active
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                    title={n.title}
                  >
                    <span className="text-slate-700">{n.icon}</span>
                    <span>{n.title}</span>
                  </button>
                  {idx < steps.length - 1 ? <ChevronRight className="w-4 h-4 text-slate-300" /> : null}
                </React.Fragment>
              );
            })}
          </div>

          <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-sm font-semibold text-slate-900 mb-2">Fast discovery (sales)</div>
            <ul className="list-disc pl-6 text-sm text-slate-700 space-y-1">
              <li>Are compressors running when production is idle?</li>
              <li>What pressure do tools really need vs what the system is set to?</li>
              <li>Do you hear leaks? Do you have a leak program?</li>
              <li>How often are dryers/filters serviced and what’s the ΔP?</li>
            </ul>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-5">
          <div className="p-5 rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-pink-600 text-white flex items-center justify-center">
                {node.icon}
              </div>
              <div className="min-w-0">
                <div className="text-lg font-extrabold text-slate-900">{node.title}</div>
                <div className="text-sm text-slate-600 mt-1">{node.whatItIs}</div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Field signals</div>
                <ul className="space-y-1 text-sm text-slate-700">
                  {node.fieldSignals.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Why it matters (engineering)</div>
                <div className="text-sm text-slate-700">{node.whyItMatters}</div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">How to sell it</div>
                <div className="text-sm text-slate-700">{node.howToSell}</div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Next actions</div>
                <ul className="space-y-1 text-sm text-slate-700">
                  {node.nextActions.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompressedAirSystemMap;


