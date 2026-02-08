import React, { useMemo, useState } from 'react';
import { Clock, CloudSun, Network, Power, Users } from 'lucide-react';

type LayerId = 'scheduling' | 'occupancy' | 'daylight' | 'dimming' | 'nlc';

type Layer = {
  id: LayerId;
  title: string;
  icon: React.ReactNode;
  typicalSavings: string;
  whatItIs: string;
  fieldSignals: string[];
  engineeringNotes: string;
  salesTalkTrack: string;
  nextActions: string[];
};

export interface LightingControlsStackDiagramProps {
  title?: string;
  subtitle?: string;
}

const LAYERS: Layer[] = [
  {
    id: 'scheduling',
    title: 'Scheduling',
    icon: <Clock className="w-5 h-5" />,
    typicalSavings: '5–20%',
    whatItIs: 'Turns lights off (or down) when a space/building is closed.',
    fieldSignals: ['Lights on in empty areas', 'No timeclock / schedule screen', 'Cleaning crew overrides never reset'],
    engineeringNotes: '“Optimal start/stop” style schedules should match actual occupancy windows and holidays.',
    salesTalkTrack: '“This is the no-brainer: stop paying for lights when nobody is there.”',
    nextActions: ['Collect operating hours per area', 'Find existing controls/timeclocks', 'Identify after-hours occupancy patterns'],
  },
  {
    id: 'occupancy',
    title: 'Occupancy (Sensors)',
    icon: <Users className="w-5 h-5" />,
    typicalSavings: '10–30%',
    whatItIs: 'Auto-off/auto-dim based on motion/presence.',
    fieldSignals: ['Storerooms and restrooms always on', 'Manual switches only', 'Sensors present but disabled'],
    engineeringNotes: 'Sensor type matters (PIR vs dual-tech) and timeout settings drive savings vs annoyance.',
    salesTalkTrack: '“This is how we capture savings in low-use areas without asking people to change habits.”',
    nextActions: ['Map low-occupancy spaces', 'Check sensor coverage and settings', 'Confirm safety/egress requirements'],
  },
  {
    id: 'daylight',
    title: 'Daylight Harvesting',
    icon: <CloudSun className="w-5 h-5" />,
    typicalSavings: '5–20%',
    whatItIs: 'Dims lights near windows/skylights when natural light is available.',
    fieldSignals: ['Bright perimeter zones on sunny days', 'Skylights with no dimming', 'Photocells mis-aimed'],
    engineeringNotes: 'Needs dimmable drivers + calibrated photosensors; commission/verify setpoints.',
    salesTalkTrack: '“Free light is already coming in—harvesting means you don’t pay twice.”',
    nextActions: ['Identify skylights/windows and zones', 'Confirm dimming capability', 'Plan commissioning step'],
  },
  {
    id: 'dimming',
    title: 'Dimming / Task Tuning',
    icon: <Power className="w-5 h-5" />,
    typicalSavings: '5–15%',
    whatItIs: 'Sets “right-sized” light levels instead of max output everywhere.',
    fieldSignals: ['Over-lit spaces', 'Complaints about glare', 'No dimming controls on fixtures'],
    engineeringNotes: 'Often delivers savings with no capex if NLC exists; otherwise requires dimmable drivers.',
    salesTalkTrack: '“We keep it comfortable and still save—most spaces are over-lit today.”',
    nextActions: ['Capture desired lux/footcandle targets', 'Identify task areas vs corridors', 'Add commissioning checklist'],
  },
  {
    id: 'nlc',
    title: 'Networked Lighting Controls (NLC)',
    icon: <Network className="w-5 h-5" />,
    typicalSavings: '10–40% (stacked)',
    whatItIs: 'A control layer that enables schedules, zoning, occupancy, daylight, and measurement.',
    fieldSignals: ['No centralized dashboard', 'No zoning flexibility', 'Rebates require NLC but none installed'],
    engineeringNotes: 'Key for measurement/verification, demand response, and granular tuning over time.',
    salesTalkTrack: '“NLC often unlocks top rebates and makes savings persistent.”',
    nextActions: ['Confirm incentive requirements (DLC/NLC)', 'Decide wired vs wireless', 'Plan commissioning + training'],
  },
];

export const LightingControlsStackDiagram: React.FC<LightingControlsStackDiagramProps> = ({ title, subtitle }) => {
  const [selected, setSelected] = useState<LayerId>('scheduling');
  const layer = useMemo(() => LAYERS.find((l) => l.id === selected)!, [selected]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-pink-600 text-white">
        <div className="font-extrabold tracking-tight">{title ?? 'Lighting Controls Stack'}</div>
        <div className="text-xs text-white/85 mt-1">
          {subtitle ?? 'Pick a layer to see typical savings, field signals, and next actions.'}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Layers</div>
          <div className="space-y-2">
            {LAYERS.map((l) => {
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
                      <div className="text-xs text-slate-600 mt-1">Typical savings: {l.typicalSavings}</div>
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
                {layer.icon}
              </div>
              <div className="min-w-0">
                <div className="text-lg font-extrabold text-slate-900">{layer.title}</div>
                <div className="text-sm text-slate-600 mt-1">{layer.whatItIs}</div>
              </div>
              <div className="ml-auto text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                {layer.typicalSavings}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Field signals</div>
                <ul className="space-y-1 text-sm text-slate-700">
                  {layer.fieldSignals.map((s) => (
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
                  {layer.nextActions.map((s) => (
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
              <div className="text-sm text-slate-700 mt-1">{layer.engineeringNotes}</div>
              <div className="text-sm font-semibold text-slate-900 mt-3">Sales talk track</div>
              <div className="text-sm text-slate-700 mt-1">{layer.salesTalkTrack}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LightingControlsStackDiagram;

