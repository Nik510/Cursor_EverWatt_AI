/**
 * OBF Pathway Selector
 * Helps users choose PG&E OBF pathway based on project characteristics.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, HelpCircle, ArrowRight } from 'lucide-react';
import { pgeOBFPathways } from '../data/pge/pge-obf-pathways';
import { recommendPgeObfPathway, type ProjectScope, type YesNo } from '../utils/obf/pathway-selector';

export const OBFPathwaySelector: React.FC = () => {
  const navigate = useNavigate();

  const [scope, setScope] = useState<ProjectScope>('single-measure');
  const [onPrescriptiveList, setOnPrescriptiveList] = useState<YesNo>('unknown');
  const [hasIntervalData, setHasIntervalData] = useState<YesNo>('unknown');
  const [wantsInteractiveEffects, setWantsInteractiveEffects] = useState<YesNo>('unknown');

  const recommended = useMemo(
    () =>
      recommendPgeObfPathway({
        scope,
        onPrescriptiveList,
        hasIntervalData,
        wantsInteractiveEffects,
      }),
    [scope, onPrescriptiveList, hasIntervalData, wantsInteractiveEffects]
  );

  const pathway = pgeOBFPathways[recommended];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/utilities')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Utilities & Programs</span>
          </button>
          <h1 className="text-3xl font-bold text-slate-900">PG&E OBF Pathway Selector</h1>
          <p className="text-slate-600 mt-2 max-w-3xl">
            Answer a few questions to get a recommended submission pathway (Prescriptive, Custom, or Site-Specific NMEC).
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-4">
              <HelpCircle className="w-5 h-5 text-blue-700" />
              Project Questions
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Project Scope</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as ProjectScope)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="single-measure">Single measure (one primary upgrade)</option>
                  <option value="multiple-measures">Multiple measures (bundle of upgrades)</option>
                  <option value="whole-building">Whole-building retrofit (meter-based savings)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Is it on PG&E’s prescriptive measures list?
                </label>
                <select
                  value={onPrescriptiveList}
                  onChange={(e) => setOnPrescriptiveList(e.target.value as YesNo)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="unknown">Not sure</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Do you have 12 months of baseline interval data?
                </label>
                <select
                  value={hasIntervalData}
                  onChange={(e) => setHasIntervalData(e.target.value as YesNo)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="unknown">Not sure</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Site-Specific NMEC requires baseline interval data.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Do you need to capture interactive effects (whole-building impact)?
                </label>
                <select
                  value={wantsInteractiveEffects}
                  onChange={(e) => setWantsInteractiveEffects(e.target.value as YesNo)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="unknown">Not sure</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-700" />
              Recommendation
            </div>

            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
              <div className="text-xs font-semibold text-blue-700 mb-2">Recommended Pathway</div>
              <div className="text-2xl font-bold text-slate-900">{pathway.name}</div>
              <p className="text-slate-600 mt-2">{pathway.description}</p>

              <div className="mt-4">
                <div className="text-sm font-semibold text-slate-800 mb-1">Best For</div>
                <div className="text-sm text-slate-600">{pathway.useCase}</div>
              </div>

              {pathway.checklist && pathway.checklist.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-slate-800 mb-2">Quick Checklist (top 3)</div>
                  <ul className="text-sm text-slate-600 space-y-1">
                    {pathway.checklist.slice(0, 3).map((c) => (
                      <li key={c.id} className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span>{c.item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate(`/utilities/obf/pathway/${recommended}`)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                View Full Pathway Details <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/utilities/obf/checker')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-50"
              >
                Check Measure Eligibility
              </button>
            </div>

            <div className="mt-4 text-xs text-slate-500">
              This is guidance to accelerate triage. Final pathway depends on PG&E review and measure-specific rules.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


