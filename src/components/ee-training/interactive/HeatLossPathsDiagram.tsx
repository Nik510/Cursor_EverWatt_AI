import React, { useMemo, useState } from 'react';
import { DoorOpen, Flame, Snowflake, Sun, Wind } from 'lucide-react';

type PathId = 'roof' | 'walls' | 'windows' | 'infiltration' | 'thermal-bridges' | 'solar-gain';

type Path = {
  id: PathId;
  title: string;
  icon: React.ReactNode;
  whatItIs: string;
  whatIRLooksLike: string[];
  whyItMatters: string;
  nextActions: string[];
};

export interface HeatLossPathsDiagramProps {
  title?: string;
  subtitle?: string;
}

const PATHS: Path[] = [
  {
    id: 'roof',
    title: 'Roof',
    icon: <Sun className="w-5 h-5" />,
    whatItIs: 'Largest surface area in many buildings; insulation and reflectivity drive gains/losses.',
    whatIRLooksLike: ['Hot roof spots in summer (poor reflectivity)', 'Warm patches in winter (missing insulation)', 'Heat leaking at penetrations'],
    whyItMatters: 'Roof issues can dominate cooling load and cause comfort problems on top floors.',
    nextActions: ['Identify roof type and insulation', 'Check penetrations and parapets', 'Consider cool roof + added insulation'],
  },
  {
    id: 'walls',
    title: 'Walls',
    icon: <Flame className="w-5 h-5" />,
    whatItIs: 'Opaque assemblies; continuous insulation reduces thermal bridging.',
    whatIRLooksLike: ['Stud lines visible (thermal bridges)', 'Warm/cold bands at slab edges', 'Moisture anomalies near leaks'],
    whyItMatters: 'Walls drive conductive losses and can create hot/cold zones near perimeter.',
    nextActions: ['Determine assembly (metal stud, CMU, curtain wall)', 'Target worst facades first', 'Seal penetrations'],
  },
  {
    id: 'windows',
    title: 'Windows/Glazing',
    icon: <Snowflake className="w-5 h-5" />,
    whatItIs: 'High-U surfaces; SHGC drives solar gain.',
    whatIRLooksLike: ['Hot glass surfaces in sun', 'Cold edges/drafts near frames', 'Seal failures showing temperature gradients'],
    whyItMatters: 'Windows can drive peak cooling load and occupant discomfort.',
    nextActions: ['Identify single vs double pane', 'Consider films/shading for solar facades', 'Fix seals and frames'],
  },
  {
    id: 'infiltration',
    title: 'Air Leakage (Infiltration)',
    icon: <Wind className="w-5 h-5" />,
    whatItIs: 'Uncontrolled outdoor air entering the building (stack effect, wind, door operation).',
    whatIRLooksLike: ['Cold streaks at door frames in winter', 'Hot streaks in summer at cracks', 'Drafts near loading docks and vestibules'],
    whyItMatters: 'Infiltration is “invisible load” that forces HVAC to work harder.',
    nextActions: ['Walk perimeter for drafts', 'Check vestibules/door closers', 'Seal major leaks before upsizing HVAC'],
  },
  {
    id: 'thermal-bridges',
    title: 'Thermal Bridging',
    icon: <Flame className="w-5 h-5" />,
    whatItIs: 'Highly conductive paths that bypass insulation (slab edges, metal framing).',
    whatIRLooksLike: ['Repeating hot/cold patterns at framing', 'Bright bands at slab edges', 'Cold corners/columns'],
    whyItMatters: 'Bridges reduce effective R-value and create condensation risk.',
    nextActions: ['Identify bridges (slab edges, curtain wall anchors)', 'Prioritize continuous insulation where feasible'],
  },
  {
    id: 'solar-gain',
    title: 'Solar Gain',
    icon: <Sun className="w-5 h-5" />,
    whatItIs: 'Sunlight driving cooling load, especially on west/south facades.',
    whatIRLooksLike: ['Hot perimeter zones in afternoon', 'Glass heating interior surfaces', 'Blinds permanently closed'],
    whyItMatters: 'Solar gain drives peaks, complaints, and oversizing.',
    nextActions: ['Map sun-exposed facades', 'Consider shading/film', 'Validate comfort complaints vs solar timing'],
  },
];

export const HeatLossPathsDiagram: React.FC<HeatLossPathsDiagramProps> = ({ title, subtitle }) => {
  const [selected, setSelected] = useState<PathId>('infiltration');
  const path = useMemo(() => PATHS.find((p) => p.id === selected)!, [selected]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-pink-600 text-white">
        <div className="font-extrabold tracking-tight">{title ?? 'Heat Loss/Gain Paths (Envelope Map)'}</div>
        <div className="text-xs text-white/85 mt-1">
          {subtitle ?? 'Pick a path to see what to look for (including IR patterns) and what to do next.'}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Paths</div>
          <div className="space-y-2">
            {PATHS.map((p) => {
              const active = p.id === selected;
              const icon =
                p.id === 'infiltration' ? <DoorOpen className="w-5 h-5" /> : p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  className={[
                    'w-full text-left px-4 py-3 rounded-2xl border transition-colors',
                    active ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-pink-600 text-white flex items-center justify-center">
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900">{p.title}</div>
                      <div className="text-xs text-slate-600 mt-1 line-clamp-2">{p.whatItIs}</div>
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
                {path.icon}
              </div>
              <div className="min-w-0">
                <div className="text-lg font-extrabold text-slate-900">{path.title}</div>
                <div className="text-sm text-slate-600 mt-1">{path.whatItIs}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">What IR “looks like”</div>
                <ul className="space-y-1 text-sm text-slate-700">
                  {path.whatIRLooksLike.map((s) => (
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
                  {path.nextActions.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-1">Why it matters</div>
              <div>{path.whyItMatters}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatLossPathsDiagram;


