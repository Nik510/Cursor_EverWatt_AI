import React, { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { pgeOBFPathways, type PGEOBFPathwayType } from '../../data/pge/pge-obf-pathways';

export interface PathwayComparisonProps {
  onSelectPathway?: (pathwayId: PGEOBFPathwayType) => void;
}

const ORDER: PGEOBFPathwayType[] = ['prescriptive', 'custom', 'site-specific-nmec'];

export const PathwayComparison: React.FC<PathwayComparisonProps> = ({ onSelectPathway }) => {
  const rows = useMemo(() => ORDER.map((id) => pgeOBFPathways[id]), []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="text-lg font-bold text-slate-900 mb-4">Pathway Comparison</div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {rows.map((p) => (
          <div key={p.id} className="border border-slate-200 rounded-2xl p-5 bg-slate-50">
            <div className="text-xs font-semibold text-blue-700 mb-2">PG&E OBF Pathway</div>
            <div className="text-xl font-bold text-slate-900">{p.name}</div>
            <div className="text-sm text-slate-600 mt-2">{p.description}</div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-700 mb-1">Best For</div>
              <div className="text-sm text-slate-700">{p.useCase}</div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <div className="text-xs font-semibold text-slate-600 mb-1">Review</div>
                <div className="text-sm font-bold text-slate-900">{p.typicalTimeline.review}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <div className="text-xs font-semibold text-slate-600 mb-1">Docs</div>
                <div className="text-sm font-bold text-slate-900">{p.requiredDocuments.filter((d) => d.required).length} required</div>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => onSelectPathway?.(p.id)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                View details <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


