import React, { useMemo, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

type CoolingMapMode = 'overview' | 'deep';

type CoolingMapNode = {
  id: string;
  label: string;
  icon: string;
  sectionId: string;
  blurb: string;
  bullets: string[];
  position: { top: string; left: string };
  accent: 'blue' | 'indigo' | 'purple' | 'pink' | 'emerald' | 'teal' | 'orange';
};

const accentStyles: Record<CoolingMapNode['accent'], { ring: string; bg: string; text: string }> = {
  blue: { ring: 'ring-blue-300', bg: 'bg-blue-600', text: 'text-blue-700' },
  indigo: { ring: 'ring-indigo-300', bg: 'bg-indigo-600', text: 'text-indigo-700' },
  purple: { ring: 'ring-purple-300', bg: 'bg-purple-600', text: 'text-purple-700' },
  pink: { ring: 'ring-pink-300', bg: 'bg-pink-600', text: 'text-pink-700' },
  emerald: { ring: 'ring-emerald-300', bg: 'bg-emerald-600', text: 'text-emerald-700' },
  teal: { ring: 'ring-teal-300', bg: 'bg-teal-600', text: 'text-teal-700' },
  orange: { ring: 'ring-orange-300', bg: 'bg-orange-600', text: 'text-orange-700' },
};

export interface CoolingSystemMapProps {
  mode: CoolingMapMode;
  onJumpToSection?: (sectionId: string) => void;
  onGenerateDeepDive?: (title: string) => void;
}

export const CoolingSystemMap: React.FC<CoolingSystemMapProps> = ({
  mode,
  onJumpToSection,
  onGenerateDeepDive,
}) => {
  const nodes = useMemo<CoolingMapNode[]>(
    () => [
      {
        id: 'refrig',
        label: 'Refrigeration_Cycle',
        icon: '🔄',
        sectionId: 'refrigeration-cycle',
        blurb: 'The physics underneath every electric chiller.',
        bullets: [
          '4 steps: compression → condensation → expansion → evaporation',
          'Lower lift = lower kW/ton',
          'COP and kW/ton are two sides of the same story',
        ],
        position: { top: '18%', left: '10%' },
        accent: 'purple',
      },
      {
        id: 'chiller',
        label: 'Chillers',
        icon: '❄️',
        sectionId: 'electric-chillers',
        blurb: 'The prime mover: where most of the kWh lives.',
        bullets: [
          'Centrifugal dominates big plants (>200 tons)',
          'IPLV matters more than full-load',
          'Watch surge + staging at low load',
        ],
        position: { top: '45%', left: '20%' },
        accent: 'blue',
      },
      {
        id: 'airVsWater',
        label: 'Air_vs_Water',
        icon: '🌡️',
        sectionId: 'air-vs-water-cooled',
        blurb: 'Heat rejection choice drives efficiency + O&M.',
        bullets: [
          'Water-cooled: 30–40% lower operating cost (often)',
          'Air-cooled: simpler, no water treatment',
          'Breakeven often depends on annual hours',
        ],
        position: { top: '68%', left: '10%' },
        accent: 'indigo',
      },
      {
        id: 'tower',
        label: 'Cooling_Tower',
        icon: '🌊',
        sectionId: 'cooling-towers',
        blurb: 'Your lever for colder condenser water.',
        bullets: [
          'VFD fans = best ROI upgrade',
          'Approach and wet bulb tell the truth',
          'Lower CW temp typically saves 1.5–2% per °F',
        ],
        position: { top: '28%', left: '58%' },
        accent: 'teal',
      },
      {
        id: 'pumps',
        label: 'Pumps_ΔT',
        icon: '💧',
        sectionId: 'chilled-water-distribution',
        blurb: 'Flow is expensive. ΔT is your friend.',
        bullets: [
          'Power ∝ speed³ (affinity laws)',
          'Target ~10–14°F ΔT in many comfort systems',
          'VPF can cut pump energy 30–50%',
        ],
        position: { top: '58%', left: '62%' },
        accent: 'emerald',
      },
      {
        id: 'controls',
        label: 'Controls',
        icon: '🎛️',
        sectionId: 'controls-optimization',
        blurb: 'The savings engine: resets + staging + VFD logic.',
        bullets: [
          'CHW reset + CW reset = lift reduction',
          'Right staging avoids low-load inefficiency',
          'Trend data beats opinions',
        ],
        position: { top: '78%', left: '55%' },
        accent: 'orange',
      },
    ],
    []
  );

  const [selectedId, setSelectedId] = useState(nodes[0]?.id ?? '');
  const selected = nodes.find((n) => n.id === selectedId) ?? nodes[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Map */}
      <div className="lg:col-span-3">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 shadow-2xl">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.55),transparent_45%),radial-gradient(circle_at_75%_65%,rgba(236,72,153,0.45),transparent_40%),radial-gradient(circle_at_50%_90%,rgba(16,185,129,0.35),transparent_35%)]" />

          {/* “Pipes” */}
          <svg
            className="absolute inset-0 w-full h-full opacity-35"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M22 50 C 35 20, 55 20, 70 35" fill="none" stroke="rgba(99,102,241,0.7)" strokeWidth="2" />
            <path d="M25 55 C 40 70, 60 75, 78 60" fill="none" stroke="rgba(16,185,129,0.7)" strokeWidth="2" />
            <path d="M20 70 C 40 85, 65 88, 78 78" fill="none" stroke="rgba(236,72,153,0.7)" strokeWidth="2" />
          </svg>

          <div className="relative p-6 min-h-[360px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white">
                <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold">Cooling_System_Map</div>
                  <div className="text-xs text-white/70">
                    {mode === 'overview'
                      ? 'Click a node for the sales-first 30-second takeaway'
                      : 'Click a node to jump into deep training'}
                  </div>
                </div>
              </div>
              <div className="text-xs text-white/70 bg-white/10 border border-white/10 rounded-full px-3 py-1">
                {mode === 'overview' ? 'Quick_Overview' : 'Deep_Training'}
              </div>
            </div>

            {nodes.map((node) => {
              const isActive = node.id === selectedId;
              const styles = accentStyles[node.accent];
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedId(node.id)}
                  className={[
                    'absolute',
                    'group',
                    'rounded-2xl',
                    'text-left',
                    'transition-all',
                    'shadow-xl',
                    'ring-2',
                    styles.ring,
                    isActive ? 'scale-[1.02] ring-offset-2 ring-offset-slate-950' : 'opacity-90 hover:opacity-100 hover:scale-[1.02]',
                  ].join(' ')}
                  style={{ top: node.position.top, left: node.position.left }}
                >
                  <div className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl">
                    <div className="flex items-center gap-2 text-white">
                      <span className="text-lg">{node.icon}</span>
                      <span className="text-sm font-semibold">{node.label}</span>
                    </div>
                    <div className="text-xs text-white/70 mt-1 max-w-[220px] line-clamp-2">{node.blurb}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div className="lg:col-span-2">
        {selected && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-pink-50 border-b border-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selected.icon}</span>
                    <h3 className="text-lg font-bold text-slate-900">{selected.label}</h3>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{selected.blurb}</p>
                </div>
                <div className={`text-xs font-semibold px-3 py-1 rounded-full bg-white ${accentStyles[selected.accent].text} border border-slate-200`}>
                  {selected.sectionId}
                </div>
              </div>
            </div>

            <div className="p-5">
              <ul className="space-y-2">
                {selected.bullets.map((b, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-1 text-indigo-500">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => onJumpToSection?.(selected.sectionId)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md"
                >
                  Jump_to_Section <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onGenerateDeepDive?.(selected.label.replaceAll('_', ' '))}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-slate-900 bg-white border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50"
                >
                  Generate_Deep_Dive
                </button>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Tip: use {mode === 'overview' ? 'Deep Dive' : 'Sales Basics'} mode to match your time + audience.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


