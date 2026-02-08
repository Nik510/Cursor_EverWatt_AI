import React, { useMemo, useState } from 'react';
import { AlertTriangle, Fan, Layers, Thermometer, Wind } from 'lucide-react';

type TopicId = 'containment' | 'bypass' | 'recirc' | 'setpoints' | 'fan-energy';

type Topic = {
  id: TopicId;
  title: string;
  icon: React.ReactNode;
  whatItIs: string;
  symptoms: string[];
  whyItMatters: string;
  nextActions: string[];
};

export interface DataCenterAirflowContainmentProps {
  title?: string;
  subtitle?: string;
}

const TOPICS: Topic[] = [
  {
    id: 'containment',
    title: 'Hot/Cold Aisle Containment',
    icon: <Layers className="w-5 h-5" />,
    whatItIs: 'Physically separates hot exhaust air from cold supply air to reduce mixing.',
    symptoms: ['Hot spots despite “enough” cooling', 'Large supply airflow but poor inlet temps', 'Return air too cold'],
    whyItMatters: 'Mixing forces lower supply temps and higher fan power. Containment enables higher setpoints and lower airflow.',
    nextActions: ['Look for missing blanking panels and gaps', 'Check aisle doors/roof and cable cutouts', 'Verify return path integrity'],
  },
  {
    id: 'bypass',
    title: 'Bypass Air (Over-supply)',
    icon: <Wind className="w-5 h-5" />,
    whatItIs: 'Cold air that never reaches server inlets (leaks around racks/tiles).',
    symptoms: ['Very cold floor tiles', 'Cold aisle temps low but servers still hot', 'Perforated tiles in low-load areas'],
    whyItMatters: 'Bypass wastes fan energy and reduces effective cooling capacity.',
    nextActions: ['Move/remove perforated tiles from low-load zones', 'Add grommets/brushes for cable openings', 'Seal floor leaks'],
  },
  {
    id: 'recirc',
    title: 'Recirculation (Hot air back to inlets)',
    icon: <AlertTriangle className="w-5 h-5" />,
    whatItIs: 'Hot exhaust air finding its way back to cold aisle/server intakes.',
    symptoms: ['High server inlet temps near top of racks', 'Hot spots at ends of aisles', 'No containment and poor tile layout'],
    whyItMatters: 'Recirc forces lower supply temperatures and can cause equipment throttling.',
    nextActions: ['Add blanking panels', 'Improve containment at ends/tops', 'Balance airflow to match IT load distribution'],
  },
  {
    id: 'setpoints',
    title: 'Temperature Setpoints',
    icon: <Thermometer className="w-5 h-5" />,
    whatItIs: 'Server inlet and supply air temperature targets (within ASHRAE ranges).',
    symptoms: ['Supply setpoint kept very low “for safety”', 'Large safety margins without inlet measurements'],
    whyItMatters: 'Raising supply temps reduces compressor/chiller lift and improves economizer hours.',
    nextActions: ['Measure server inlet temps across racks', 'Confirm ASHRAE allowable ranges for equipment', 'Raise setpoints gradually with monitoring'],
  },
  {
    id: 'fan-energy',
    title: 'Fan Energy (Airflow Control)',
    icon: <Fan className="w-5 h-5" />,
    whatItIs: 'CRAC/CRAH/InRow fans and airflow distribution; VFD control and pressure strategies.',
    symptoms: ['Fans at high speed with low IT load', 'High differential pressure targets', 'No coordinated control'],
    whyItMatters: 'Fan power can be a major overhead; speed reductions yield big savings.',
    nextActions: ['Trend fan speed/kW vs IT load', 'Implement pressure/airflow resets', 'Fix airflow path first (containment) then reduce fan speed'],
  },
];

export const DataCenterAirflowContainment: React.FC<DataCenterAirflowContainmentProps> = ({ title, subtitle }) => {
  const [selected, setSelected] = useState<TopicId>('containment');
  const topic = useMemo(() => TOPICS.find((t) => t.id === selected)!, [selected]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-pink-600 text-white">
        <div className="font-extrabold tracking-tight">{title ?? 'Data Center Airflow & Containment'}</div>
        <div className="text-xs text-white/85 mt-1">
          {subtitle ?? 'Click a topic: containment, bypass/recirc, setpoints, and fan energy.'}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Topics</div>
          <div className="space-y-2">
            {TOPICS.map((t) => {
              const active = t.id === selected;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t.id)}
                  className={[
                    'w-full text-left px-4 py-3 rounded-2xl border transition-colors',
                    active ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-pink-600 text-white flex items-center justify-center">
                      {t.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900">{t.title}</div>
                      <div className="text-xs text-slate-600 mt-1 line-clamp-2">{t.whatItIs}</div>
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
                {topic.icon}
              </div>
              <div className="min-w-0">
                <div className="text-lg font-extrabold text-slate-900">{topic.title}</div>
                <div className="text-sm text-slate-600 mt-1">{topic.whatItIs}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Symptoms / field signals</div>
                <ul className="space-y-1 text-sm text-slate-700">
                  {topic.symptoms.map((s) => (
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
                  {topic.nextActions.map((s) => (
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
              <div>{topic.whyItMatters}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataCenterAirflowContainment;


