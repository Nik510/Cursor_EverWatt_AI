/**
 * OBF Measure Eligibility Checker
 * - Searches PG&E prescriptive measures dataset
 * - Shows OBF eligibility guidance and pathway tie-in
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import {
  pgePrescriptiveMeasures,
  searchPgePrescriptiveMeasures,
  type PrescriptiveMeasure,
} from '../data/pge/prescriptive-measures';
import { pgeOBFPathways, type PGEOBFPathwayType } from '../data/pge/pge-obf-pathways';
import { obfEligibilityDatabase } from '../data/obf/obf-eligibility';

type EligibilityHit = {
  source: 'prescriptive-database' | 'obf-eligibility';
  title: string;
  category: string;
  eligible: boolean;
  pathway?: PGEOBFPathwayType;
  details: string;
  requirements?: string[];
  docsPreview?: string[];
};

function buildObfEligibilityHitsForPge(query: string): EligibilityHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const hits: EligibilityHit[] = [];
  obfEligibilityDatabase.forEach((m) => {
    const haystack = `${m.measureName} ${m.measureId} ${m.category} ${(m.requirements || []).join(' ')} ${(m.documentation || []).join(' ')}`.toLowerCase();
    if (!haystack.includes(q)) return;
    const pgeProgram = m.utilityPrograms.find((p) => p.utility === 'PGE' && p.eligible);
    hits.push({
      source: 'obf-eligibility',
      title: m.measureName,
      category: m.category,
      eligible: !!pgeProgram,
      pathway: pgeProgram?.pathway,
      details: m.eligibilityReason || (pgeProgram ? 'Eligible for PG&E OBF.' : 'Not eligible for PG&E OBF.'),
      requirements: m.requirements,
      docsPreview: m.documentation,
    });
  });

  // De-dup by title/category
  const key = (h: EligibilityHit) => `${h.title.toLowerCase()}::${h.category.toLowerCase()}`;
  const dedup = new Map<string, EligibilityHit>();
  hits.forEach((h) => dedup.set(key(h), h));
  return Array.from(dedup.values()).slice(0, 50);
}

function pathwayLabel(pathway?: PGEOBFPathwayType): string {
  if (!pathway) return '—';
  return pgeOBFPathways[pathway]?.name || pathway;
}

export const OBFMeasureChecker: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showPrescriptiveOnly, setShowPrescriptiveOnly] = useState(false);

  const prescriptiveResults: PrescriptiveMeasure[] = useMemo(() => {
    if (!query.trim()) return pgePrescriptiveMeasures.slice(0, 12);
    return searchPgePrescriptiveMeasures(query).slice(0, 50);
  }, [query]);

  const obfHits: EligibilityHit[] = useMemo(() => buildObfEligibilityHitsForPge(query), [query]);

  const combined: EligibilityHit[] = useMemo(() => {
    const hits: EligibilityHit[] = [];

    if (!showPrescriptiveOnly) {
      hits.push(...obfHits);
    }

    prescriptiveResults.forEach((m) => {
      hits.push({
        source: 'prescriptive-database',
        title: m.name,
        category: m.category,
        eligible: true,
        pathway: m.pathway === 'prescriptive' ? 'prescriptive' : 'custom',
        details: m.description,
        requirements: [
          ...(m.equipmentRequirements.minEfficiency ? [`Min efficiency: ${m.equipmentRequirements.minEfficiency}`] : []),
          ...((m.equipmentRequirements.standards || []).map((s) => `Standard: ${s}`)),
          ...((m.equipmentRequirements.specifications || []).map((s) => s)),
        ],
        docsPreview: [],
      });
    });

    // Basic de-dupe by title
    const seen = new Set<string>();
    return hits.filter((h) => {
      const k = h.title.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [obfHits, prescriptiveResults, showPrescriptiveOnly]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/utilities')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Utilities & Programs</span>
          </button>
          <h1 className="text-3xl font-bold text-slate-900">OBF Measure Checker</h1>
          <p className="text-slate-600 mt-2 max-w-3xl">
            Search measures and see PG&E OBF eligibility guidance + the likely submission pathway.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search (e.g., LED, VFD, chiller, boiler, controls)…"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={showPrescriptiveOnly}
                onChange={(e) => setShowPrescriptiveOnly(e.target.checked)}
              />
              Show prescriptive database only
            </label>
            <button
              onClick={() => navigate('/utilities/obf/selector')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Pathway Selector
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {combined.map((h) => {
            const icon = h.eligible ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            );

            return (
              <div key={`${h.source}:${h.title}`} className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 inline-flex px-2 py-1 rounded">
                      {h.category} • {h.source === 'prescriptive-database' ? 'Prescriptive DB' : 'OBF Eligibility DB'}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-2">{h.title}</h3>
                    <p className="text-slate-600 mt-2">{h.details}</p>
                  </div>
                  <div className="mt-1">{icon}</div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="text-xs font-semibold text-slate-600 mb-1">Eligible (PG&E OBF)</div>
                    <div className={`text-sm font-bold ${h.eligible ? 'text-green-700' : 'text-red-700'}`}>
                      {h.eligible ? 'Yes' : 'No / Unknown'}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="text-xs font-semibold text-slate-600 mb-1">Likely Pathway</div>
                    <div className="text-sm font-bold text-slate-900">{pathwayLabel(h.pathway)}</div>
                  </div>
                </div>

                {(h.requirements?.length || 0) > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-semibold text-slate-800 mb-2">Key Requirements (preview)</div>
                    <ul className="text-sm text-slate-600 space-y-1">
                      {h.requirements!.slice(0, 4).map((r, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-700 mt-0.5">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {h.pathway && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate(`/utilities/obf/pathway/${h.pathway}`)}
                      className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50"
                    >
                      View pathway details <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {combined.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-600">
            No matches. Try a different keyword (e.g., “LED”, “VFD”, “boiler”, “chiller”, “controls”).
          </div>
        )}
      </div>
    </div>
  );
};


