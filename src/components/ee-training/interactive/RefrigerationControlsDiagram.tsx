import React, { useMemo, useState } from 'react';
import { Snowflake, Thermometer, Wind } from 'lucide-react';

type ConceptId = 'floating-head' | 'suction' | 'defrost' | 'anti-sweat' | 'case-doors';

type Concept = {
  id: ConceptId;
  title: string;
  icon: React.ReactNode;
  whatItIs: string;
  typicalSavings: string;
  fieldSignals: string[];
  engineerNotes: string;
  salesAngle: string;
  nextActions: string[];
};

export interface RefrigerationControlsDiagramProps {
  title?: string;
  subtitle?: string;
}

const CONCEPTS: Concept[] = [
  {
    id: 'floating-head',
    title: 'Floating Head Pressure',
    icon: <Thermometer className="w-5 h-5" />,
    typicalSavings: '10–20% (site dependent)',
    whatItIs: 'Lower condenser/condensing pressure when ambient is cooler (instead of fixed head).',
    fieldSignals: ['Head pressure stays fixed on cool days', 'Condenser fans always full speed', 'No controls/trending visible'],
    engineerNotes: 'Lower condensing temperature reduces lift → reduces compressor kW. Needs stable control to avoid hunting.',
    salesAngle: '“Same cooling, less compressor work whenever outdoor air is cool.”',
    nextActions: ['Confirm control strategy (fixed vs floating)', 'Trend head pressure vs ambient', 'Check fan staging/VFD capability'],
  },
  {
    id: 'suction',
    title: 'Suction Optimization',
    icon: <Wind className="w-5 h-5" />,
    typicalSavings: '5–15%',
    whatItIs: 'Raise suction pressure (warmer evap temp) if product temps allow.',
    fieldSignals: ['Product temps are conservative', 'Evap coils heavily frosted', 'Excess superheat swings'],
    engineerNotes: 'Higher evap temperature reduces compressor ratio; must maintain product temp and avoid humidity/frost issues.',
    salesAngle: '“We reduce energy while protecting product—verify temps first.”',
    nextActions: ['Validate product temperature requirements', 'Review suction stability and superheat control'],
  },
  {
    id: 'defrost',
    title: 'Defrost Strategy',
    icon: <Snowflake className="w-5 h-5" />,
    typicalSavings: '5–20%',
    whatItIs: 'Reduce over-defrosting; consider demand/termination-based defrost.',
    fieldSignals: ['Defrost runs on fixed timer regardless of frost', 'Hot-gas defrost excessive', 'Heaters run too long'],
    engineerNotes: 'Defrost adds heat load and can destabilize temps; good termination sensors are key.',
    salesAngle: '“Less defrost waste, better temperature stability.”',
    nextActions: ['Check defrost schedule and termination', 'Inspect sensors and controls', 'Look for ice buildup patterns'],
  },
  {
    id: 'anti-sweat',
    title: 'Anti-sweat & Fan Controls',
    icon: <Thermometer className="w-5 h-5" />,
    typicalSavings: '3–10%',
    whatItIs: 'Control anti-sweat heaters and evaporator fan speed intelligently (humidity/door state).',
    fieldSignals: ['Heaters always on', 'Warm case surfaces', 'Evap fans run 24/7 at full speed'],
    engineerNotes: 'Anti-sweat is often a “silent load”. Controls reduce kWh and case heat pickup.',
    salesAngle: '“We cut hidden loads that don’t help product.”',
    nextActions: ['Check heater control mode (fixed vs humidity)', 'Identify ECM vs PSC fan motors'],
  },
  {
    id: 'case-doors',
    title: 'Case Doors / Covers',
    icon: <Wind className="w-5 h-5" />,
    typicalSavings: '15–35% (open cases)',
    whatItIs: 'Add doors/covers or improve gaskets to reduce infiltration.',
    fieldSignals: ['Open multi-decks', 'Worn gaskets', 'Frosting and cold air spilling'],
    engineerNotes: 'Infiltration increases latent and sensible load; doors reduce compressor runtime and improve comfort.',
    salesAngle: '“Doors protect product and cut energy—often a rebate-friendly upgrade.”',
    nextActions: ['Document case types and condition', 'Estimate hours and infiltration drivers', 'Confirm merchandising constraints'],
  },
];

export const RefrigerationControlsDiagram: React.FC<RefrigerationControlsDiagramProps> = ({ title, subtitle }) => {
  const [selected, setSelected] = useState<ConceptId>('floating-head');
  const concept = useMemo(() => CONCEPTS.find((c) => c.id === selected)!, [selected]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-pink-600 text-white">
        <div className="font-extrabold tracking-tight">{title ?? 'Refrigeration Controls & Setpoints'}</div>
        <div className="text-xs text-white/85 mt-1">
          {subtitle ?? 'Pick a lever to see field signals, engineering notes, and next steps.'}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Levers</div>
          <div className="space-y-2">
            {CONCEPTS.map((c) => {
              const active = c.id === selected;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c.id)}
                  className={[
                    'w-full text-left px-4 py-3 rounded-2xl border transition-colors',
                    active ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-pink-600 text-white flex items-center justify-center">
                      {c.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900">{c.title}</div>
                      <div className="text-xs text-slate-600 mt-1">Typical savings: {c.typicalSavings}</div>
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
                {concept.icon}
              </div>
              <div className="min-w-0">
                <div className="text-lg font-extrabold text-slate-900">{concept.title}</div>
                <div className="text-sm text-slate-600 mt-1">{concept.whatItIs}</div>
              </div>
              <div className="ml-auto text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                {concept.typicalSavings}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Field signals</div>
                <ul className="space-y-1 text-sm text-slate-700">
                  {concept.fieldSignals.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Next actions</div>
                <ul className="space-y-1 text-sm text-slate-700">
                  {concept.nextActions.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-sm font-semibold text-slate-900">Engineering notes</div>
              <div className="text-sm text-slate-700 mt-1">{concept.engineerNotes}</div>
              <div className="text-sm font-semibold text-slate-900 mt-3">Sales angle</div>
              <div className="text-sm text-slate-700 mt-1">{concept.salesAngle}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefrigerationControlsDiagram;


