import React, { useMemo, useState } from 'react';
import { ChevronRight, Fan, Gauge, Thermometer, Wind } from 'lucide-react';

type NodeId = 'oa' | 'mixing' | 'filters' | 'coils' | 'supplyFan' | 'ductStatic' | 'vavBoxes' | 'reheat' | 'zones' | 'returnFan';

type Node = {
  id: NodeId;
  title: string;
  icon: React.ReactNode;
  whatItIs: string;
  fieldSignals: string[];
  whyItMatters: string;
  salesAngle: string;
  nextActions: string[];
};

export interface AirsideSystemMapProps {
  title?: string;
  subtitle?: string;
}

const NODES: Node[] = [
  {
    id: 'oa',
    title: 'Outdoor Air',
    icon: <Wind className="w-5 h-5" />,
    whatItIs: 'Ventilation air for IAQ; over-ventilation drives heating/cooling cost.',
    fieldSignals: ['OA damper stuck open', 'CO2 sensors missing/flatlined', 'Ventilation rates not matched to occupancy'],
    whyItMatters: 'OA is expensive: you must heat/cool/dehumidify it.',
    salesAngle: '“We stop conditioning more outdoor air than you need.”',
    nextActions: ['Confirm minimum OA strategy', 'Validate CO2 sensor operation (DCV)'],
  },
  {
    id: 'mixing',
    title: 'Economizer / Mixing Box',
    icon: <Wind className="w-5 h-5" />,
    whatItIs: 'Uses “free cooling” by increasing OA when conditions are favorable.',
    fieldSignals: ['Economizer disabled', 'Actuators failed', 'Mixed air temperature unstable'],
    whyItMatters: 'Free cooling can offset compressor/chiller energy substantially.',
    salesAngle: '“Fixing economizers is often a fast payback control repair.”',
    nextActions: ['Check enable conditions and sensors', 'Verify damper travel and linkage'],
  },
  {
    id: 'filters',
    title: 'Filters',
    icon: <Wind className="w-5 h-5" />,
    whatItIs: 'Protect coils and maintain IAQ; pressure drop impacts fan kW.',
    fieldSignals: ['High ΔP across filters', 'Dirty filters', 'Frequent replacements'],
    whyItMatters: 'High ΔP increases fan power and can reduce airflow.',
    salesAngle: '“Better maintenance reduces energy and avoids comfort calls.”',
    nextActions: ['Record filter type and replacement interval', 'Measure/filter ΔP'],
  },
  {
    id: 'coils',
    title: 'Heating/Cooling Coils',
    icon: <Thermometer className="w-5 h-5" />,
    whatItIs: 'Conditions air (temperature + humidity).',
    fieldSignals: ['Low ΔT symptoms', 'Coil fouling', 'Simultaneous heat/cool (reheat waste)'],
    whyItMatters: 'Bad control causes reheat and inflated plant loads.',
    salesAngle: '“We eliminate fighting controls (heat and cool at the same time).”',
    nextActions: ['Trend SAT and valve positions', 'Inspect coil cleanliness'],
  },
  {
    id: 'supplyFan',
    title: 'Supply Fan / VFD',
    icon: <Fan className="w-5 h-5" />,
    whatItIs: 'Moves air; fan laws mean speed control is the savings lever.',
    fieldSignals: ['Constant speed fan', 'Inlet vanes/dampers throttling', 'VFD present but fixed speed'],
    whyItMatters: 'Power ∝ speed³ for variable loads; resets unlock savings.',
    salesAngle: '“VFD + reset often saves 10–30%+ fan energy.”',
    nextActions: ['Capture VFD model/settings', 'Check if static reset is enabled'],
  },
  {
    id: 'ductStatic',
    title: 'Duct Static Pressure',
    icon: <Gauge className="w-5 h-5" />,
    whatItIs: 'Control target for fan speed; too high = wasted kW.',
    fieldSignals: ['Static setpoint fixed high', 'No “most-open damper” strategy', 'Frequent overrides'],
    whyItMatters: 'Resetting static to the minimum that satisfies zones saves big kWh.',
    salesAngle: '“No hardware needed—controls tuning can cut fan cost fast.”',
    nextActions: ['Find critical zone (most-open VAV)', 'Implement static reset curve'],
  },
  {
    id: 'vavBoxes',
    title: 'VAV Boxes',
    icon: <Wind className="w-5 h-5" />,
    whatItIs: 'Zone terminals that modulate airflow to maintain temperature.',
    fieldSignals: ['Many boxes stuck at min/max', 'Bad airflow sensors', 'Hunting dampers'],
    whyItMatters: 'Bad VAV behavior drives high static setpoints and reheat waste.',
    salesAngle: '“Fixing VAV boxes reduces complaints and enables fan savings.”',
    nextActions: ['Trend damper % open and airflow', 'Spot-check calibration'],
  },
  {
    id: 'reheat',
    title: 'Reheat (if present)',
    icon: <Thermometer className="w-5 h-5" />,
    whatItIs: 'Heats air after cooling to control zone temp/humidity.',
    fieldSignals: ['Simultaneous cooling + reheat', 'Hot water valves open in summer', 'High reheat energy'],
    whyItMatters: 'Reheat is “paying twice”. Controls and SAT reset reduce it.',
    salesAngle: '“We cut wasted reheat while keeping comfort.”',
    nextActions: ['Check SAT reset vs humidity needs', 'Verify reheat lockouts'],
  },
  {
    id: 'zones',
    title: 'Zones / Spaces',
    icon: <Thermometer className="w-5 h-5" />,
    whatItIs: 'Where comfort is experienced; complaints reveal control faults.',
    fieldSignals: ['Hot/cold calls', 'Thermostats overridden', 'Poor scheduling'],
    whyItMatters: 'Comfort drives operations; tuning must protect occupants.',
    salesAngle: '“Comfort + savings: fewer complaints and lower bills.”',
    nextActions: ['Capture problem zones', 'Confirm occupancy schedules'],
  },
  {
    id: 'returnFan',
    title: 'Return/Exhaust',
    icon: <Fan className="w-5 h-5" />,
    whatItIs: 'Maintains building pressure and ventilation balance.',
    fieldSignals: ['Exhaust always on', 'Building pressure issues', 'Return fan fixed speed'],
    whyItMatters: 'Pressure imbalance increases infiltration and energy waste.',
    salesAngle: '“We stabilize the building and reduce unnecessary exhaust.”',
    nextActions: ['Check building pressure setpoints', 'Verify exhaust schedules'],
  },
];

export const AirsideSystemMap: React.FC<AirsideSystemMapProps> = ({ title, subtitle }) => {
  const [selected, setSelected] = useState<NodeId>('supplyFan');
  const node = useMemo(() => NODES.find((n) => n.id === selected)!, [selected]);

  const flow: NodeId[] = ['oa', 'mixing', 'filters', 'coils', 'supplyFan', 'ductStatic', 'vavBoxes', 'reheat', 'zones', 'returnFan'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-pink-600 text-white">
        <div className="font-extrabold tracking-tight">{title ?? 'Airside System Map (AHU/RTU → VAV → Zones)'}</div>
        <div className="text-xs text-white/85 mt-1">
          {subtitle ?? 'Click each stage to see field signals, why it matters, and next actions.'}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">System flow</div>
          <div className="flex flex-wrap items-center gap-2">
            {flow.map((id, idx) => {
              const n = NODES.find((x) => x.id === id)!;
              const active = id === selected;
              return (
                <React.Fragment key={id}>
                  <button
                    type="button"
                    onClick={() => setSelected(id)}
                    className={[
                      'px-3 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-colors',
                      active ? 'bg-indigo-50 border-indigo-300 text-indigo-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <span className="text-slate-700">{n.icon}</span>
                    <span>{n.title}</span>
                  </button>
                  {idx < flow.length - 1 ? <ChevronRight className="w-4 h-4 text-slate-300" /> : null}
                </React.Fragment>
              );
            })}
          </div>

          <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-sm font-semibold text-slate-900 mb-2">Fast discovery (sales)</div>
            <ul className="list-disc pl-6 text-sm text-slate-700 space-y-1">
              <li>Do fans run full speed all day? Any VFDs?</li>
              <li>Are economizers enabled and working?</li>
              <li>Is there DCV (CO2)? Any sensors flatlined?</li>
              <li>Any comfort complaints or overrides stuck?</li>
            </ul>
          </div>
        </div>

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
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Why it matters</div>
                <div className="text-sm text-slate-700">{node.whyItMatters}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Sales angle</div>
                <div className="text-sm text-slate-700">{node.salesAngle}</div>
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

export default AirsideSystemMap;


