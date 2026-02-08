import React, { useMemo, useState } from 'react';
import { CalendarClock, Leaf, ShieldAlert, Thermometer, Wind } from 'lucide-react';

type LoopId = 'scheduling' | 'optimal-start' | 'economizer' | 'sat-reset' | 'static-reset' | 'alarms-overrides';

type Loop = {
  id: LoopId;
  title: string;
  icon: React.ReactNode;
  whatItIs: string;
  commonFailureModes: string[];
  whyItMatters: string;
  salesAngle: string;
  nextActions: string[];
};

export interface HVACControlLoopsExplainerProps {
  title?: string;
  subtitle?: string;
}

const LOOPS: Loop[] = [
  {
    id: 'scheduling',
    title: 'Scheduling',
    icon: <CalendarClock className="w-5 h-5" />,
    whatItIs: 'Align equipment run times with real occupancy (including holidays and after-hours use).',
    commonFailureModes: ['Schedules drift over years', 'Manual overrides never cleared', 'Cleaning shifts not modeled'],
    whyItMatters: 'Running systems unoccupied is often the single biggest waste lever.',
    salesAngle: '“We stop paying for HVAC when nobody’s there—without affecting comfort.”',
    nextActions: ['Export schedules for main AHUs/RTUs', 'Identify top offenders by runtime vs occupancy', 'Add auto-expiring overrides'],
  },
  {
    id: 'optimal-start',
    title: 'Optimal Start/Stop',
    icon: <Thermometer className="w-5 h-5" />,
    whatItIs: 'Starts equipment only as early as needed to hit setpoint by occupancy time, and stops early when possible.',
    commonFailureModes: ['Disabled after tenant complaints', 'Bad zone sensors', 'Aggressive warm-up that overshoots'],
    whyItMatters: 'Cuts pre-occupancy runtime while preserving comfort.',
    salesAngle: '“Same comfort at 8am, less runtime at 6am.”',
    nextActions: ['Review warm-up trends and complaints', 'Tune target/limits and sensor selection'],
  },
  {
    id: 'economizer',
    title: 'Economizer Enable/Lockout',
    icon: <Leaf className="w-5 h-5" />,
    whatItIs: 'Uses outdoor air for free cooling when conditions allow; locks out when too hot/humid.',
    commonFailureModes: ['Bad temp/humidity sensors', 'Stuck dampers', 'Disabled due to humidity issues'],
    whyItMatters: 'Free cooling can replace compressor/chiller runtime in shoulder seasons.',
    salesAngle: '“Fixing economizers is a classic high-ROI controls repair.”',
    nextActions: ['Verify sensors', 'Check damper travel', 'Confirm enable logic matches climate'],
  },
  {
    id: 'sat-reset',
    title: 'Supply Air Temp (SAT) Reset',
    icon: <Thermometer className="w-5 h-5" />,
    whatItIs: 'Resets SAT based on zone demand/humidity to reduce reheat and improve plant efficiency.',
    commonFailureModes: ['SAT fixed low (55°F) year-round', 'Humidity constraints ignored', 'Simultaneous cooling + reheat'],
    whyItMatters: 'SAT reset reduces reheat and can reduce chilled water demand.',
    salesAngle: '“We reduce the HVAC ‘fight’—cooling then reheating.”',
    nextActions: ['Trend SAT, reheat valve %, zone demands', 'Implement reset with humidity guardrails'],
  },
  {
    id: 'static-reset',
    title: 'Duct Static Pressure Reset',
    icon: <Wind className="w-5 h-5" />,
    whatItIs: 'Resets duct static to the minimum needed based on the most-open VAV damper.',
    commonFailureModes: ['Static fixed high', 'No critical zone logic', 'Bad static sensor location'],
    whyItMatters: 'Fan kW drops dramatically when static setpoints are lowered.',
    salesAngle: '“Fan savings without replacing equipment—controls tuning.”',
    nextActions: ['Identify critical zones', 'Validate sensor placement', 'Trend fan speed vs damper position'],
  },
  {
    id: 'alarms-overrides',
    title: 'Overrides, Alarms, and Persistence',
    icon: <ShieldAlert className="w-5 h-5" />,
    whatItIs: 'Ensure faults/overrides are visible, expire automatically, and savings persist over time.',
    commonFailureModes: ['Overrides left on for months', 'Alarms ignored', 'No KPI dashboard to detect regression'],
    whyItMatters: 'The best optimization fails if it doesn’t persist.',
    salesAngle: '“We keep savings from slipping back after commissioning.”',
    nextActions: ['Audit override points', 'Add auto-expire + alerting', 'Define 3–5 KPIs to monitor weekly'],
  },
];

export const HVACControlLoopsExplainer: React.FC<HVACControlLoopsExplainerProps> = ({ title, subtitle }) => {
  const [selected, setSelected] = useState<LoopId>('scheduling');
  const loop = useMemo(() => LOOPS.find((l) => l.id === selected)!, [selected]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-pink-600 text-white">
        <div className="font-extrabold tracking-tight">{title ?? 'HVAC Controls: Decision Levers & Failure Modes'}</div>
        <div className="text-xs text-white/85 mt-1">
          {subtitle ?? 'Pick a control loop to see what it does, common failure modes, and next actions.'}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Control loops</div>
          <div className="space-y-2">
            {LOOPS.map((l) => {
              const active = l.id === selected;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelected(l.id)}
                  className={[
                    'w-full text-left px-4 py-3 rounded-2xl border transition-colors',
                    active ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-pink-600 text-white flex items-center justify-center">
                      {l.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900">{l.title}</div>
                      <div className="text-xs text-slate-600 mt-1 line-clamp-2">{l.whatItIs}</div>
                    </div>
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
                {loop.icon}
              </div>
              <div className="min-w-0">
                <div className="text-lg font-extrabold text-slate-900">{loop.title}</div>
                <div className="text-sm text-slate-600 mt-1">{loop.whatItIs}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Common failure modes</div>
                <ul className="space-y-1 text-sm text-slate-700">
                  {loop.commonFailureModes.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Next actions</div>
                <ul className="space-y-1 text-sm text-slate-700">
                  {loop.nextActions.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-sm font-semibold text-slate-900">Why it matters</div>
              <div className="text-sm text-slate-700 mt-1">{loop.whyItMatters}</div>
              <div className="text-sm font-semibold text-slate-900 mt-3">Sales angle</div>
              <div className="text-sm text-slate-700 mt-1">{loop.salesAngle}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HVACControlLoopsExplainer;


