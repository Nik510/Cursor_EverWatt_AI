import React, { useMemo, useState } from 'react';
import { Camera, CheckCircle, Lightbulb, Ruler, Tag } from 'lucide-react';

type FixtureId =
  | 'troffer'
  | 'strip'
  | 'highbay'
  | 'downlight'
  | 'linear-pendant'
  | 'wallpack'
  | 'shoebox'
  | 'canopy';

type FixtureCard = {
  id: FixtureId;
  title: string;
  whereUsed: string;
  baselineClues: string[];
  whatToPhotograph: string[];
  gotchas: string[];
  salesAngle: string;
};

export interface FixtureIDAuditGuideProps {
  title?: string;
  subtitle?: string;
}

const FIXTURES: FixtureCard[] = [
  {
    id: 'troffer',
    title: '2x4 / 2x2 Troffer',
    whereUsed: 'Offices, classrooms, corridors',
    baselineClues: ['T8/T12 fluorescent', 'Prismatic lens', 'Magnetic ballast (older)'],
    whatToPhotograph: ['Fixture type and size', 'Lamp/ballast label (if accessible)', 'Ceiling height', 'Controls present (occupancy/daylight)'],
    gotchas: ['Emergency fixtures', 'Air-handling troffers', 'Dimming compatibility (0-10V/DALI)'],
    salesAngle: 'High volume + long hours + easy incentives = strong ROI.',
  },
  {
    id: 'strip',
    title: 'Linear Strip / Wrap',
    whereUsed: 'Back-of-house, storage, corridors',
    baselineClues: ['T8/T12 lamps', 'Wraparound diffuser', 'Often no controls'],
    whatToPhotograph: ['Fixture count per area', 'Hours of operation', 'Any occupancy sensors'],
    gotchas: ['Cold temp environments', 'Low ceilings (glare)'],
    salesAngle: 'Great “bundle” with occupancy sensors for big stacked savings.',
  },
  {
    id: 'highbay',
    title: 'High-bay (HID or LED)',
    whereUsed: 'Warehouses, gyms, manufacturing',
    baselineClues: ['400W HID metal halide', 'Long warm-up time', 'Often always-on'],
    whatToPhotograph: ['Mounting height', 'Fixture wattage', 'Aisle/zone layout', 'Skylights (daylight)'],
    gotchas: ['Forklift glare', 'Sensor placement and aisle zoning'],
    salesAngle: 'Huge watts * hours. Controls can be worth more than fixtures.',
  },
  {
    id: 'downlight',
    title: 'Downlight / Can',
    whereUsed: 'Retail, lobbies, hospitality',
    baselineClues: ['Halogen/MR16', 'Hot fixtures', 'High maintenance'],
    whatToPhotograph: ['Lamp type (MR16/BR30/etc.)', 'Trim size', 'Dimming type (phase/0-10V)'],
    gotchas: ['Color quality requirements (CRI, CCT)', 'Dimming flicker'],
    salesAngle: 'Lead with maintenance + lighting quality improvement.',
  },
  {
    id: 'linear-pendant',
    title: 'Linear Pendant',
    whereUsed: 'Modern offices, schools',
    baselineClues: ['T5/T8 or early LED', 'Long runs', 'Potential daylight zones'],
    whatToPhotograph: ['Run length', 'Driver info', 'Control zones'],
    gotchas: ['Direct/indirect distribution', 'Glare and uplight requirements'],
    salesAngle: 'Commissioning + task tuning is where savings hide.',
  },
  {
    id: 'wallpack',
    title: 'Wall Pack',
    whereUsed: 'Exterior perimeter, back doors',
    baselineClues: ['HPS/metal halide', 'Always-on dusk-to-dawn'],
    whatToPhotograph: ['Fixture model/wattage', 'Photocell present?', 'Mounting height'],
    gotchas: ['Light trespass', 'Security requirements'],
    salesAngle: 'Easy exterior win: LED + photocell + scheduling.',
  },
  {
    id: 'shoebox',
    title: 'Pole / Shoebox',
    whereUsed: 'Parking lots',
    baselineClues: ['HPS fixtures', 'Large wattages', 'Many hours'],
    whatToPhotograph: ['Pole height', 'Spacing', 'Fixture wattage', 'Controls (photocell/timer)'],
    gotchas: ['Uniformity requirements', 'Glare and neighborhood constraints'],
    salesAngle: 'Bundle with controls + safety story (better light, fewer outages).',
  },
  {
    id: 'canopy',
    title: 'Canopy',
    whereUsed: 'Gas stations, covered entries, loading areas',
    baselineClues: ['High hours', 'Often fluorescent/HID'],
    whatToPhotograph: ['Fixture type', 'Mounting height', 'Hours (often 24/7)'],
    gotchas: ['Harsh environments (dust, moisture)', 'Emergency lighting'],
    salesAngle: 'High hours = quick payback.',
  },
];

export const FixtureIDAuditGuide: React.FC<FixtureIDAuditGuideProps> = ({ title, subtitle }) => {
  const [selected, setSelected] = useState<FixtureId>('troffer');
  const card = useMemo(() => FIXTURES.find((f) => f.id === selected)!, [selected]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-pink-600 text-white">
        <div className="font-extrabold tracking-tight">{title ?? 'Fixture ID Audit Guide'}</div>
        <div className="text-xs text-white/85 mt-1">
          {subtitle ?? 'Pick a fixture family to see what to photograph, baseline clues, and common gotchas.'}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Fixture families</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FIXTURES.map((f) => {
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
                    <Lightbulb className="w-4 h-4" />
                    <span className="line-clamp-2">{f.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="p-5 rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-extrabold text-slate-900">{card.title}</div>
                <div className="text-sm text-slate-600 mt-1">{card.whereUsed}</div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                <Tag className="w-3.5 h-3.5" />
                Field-ready
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Baseline clues
                </div>
                <ul className="space-y-1 text-sm text-slate-700">
                  {card.baselineClues.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Camera className="w-4 h-4" /> What to photograph
                </div>
                <ul className="space-y-1 text-sm text-slate-700">
                  {card.whatToPhotograph.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Ruler className="w-4 h-4" />
                Common gotchas
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {card.gotchas.map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>

              <div className="text-sm font-semibold text-slate-900 mt-4">Sales angle</div>
              <div className="text-sm text-slate-700 mt-1">{card.salesAngle}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixtureIDAuditGuide;


