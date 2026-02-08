/**
 * PG&E OBF Pathway Detail Page
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';
import { pgeOBFPathways, type PGEOBFPathwayType } from '../data/pge/pge-obf-pathways';
import { DocumentTemplateManager } from '../components/obf/DocumentTemplateManager';
import { SubmissionChecklist, loadChecklistState, type ChecklistState } from '../components/obf/SubmissionChecklist';
import { TimelineVisualization } from '../components/obf/TimelineVisualization';

function isValidPathwayId(id: string | undefined): id is PGEOBFPathwayType {
  return id === 'prescriptive' || id === 'custom' || id === 'site-specific-nmec';
}

export const PGEOBFPathwayDetail: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();

  const pathwayId = isValidPathwayId(params.pathwayId) ? params.pathwayId : undefined;
  const pathway = pathwayId ? pgeOBFPathways[pathwayId] : undefined;

  const persistKey = useMemo(() => (pathwayId ? `pge:${pathwayId}` : 'pge:unknown'), [pathwayId]);
  const [checklistState, setChecklistState] = useState<ChecklistState>({});

  useEffect(() => {
    setChecklistState(loadChecklistState(persistKey));
  }, [persistKey]);

  if (!pathwayId || !pathway) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <button
            onClick={() => navigate('/utilities')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Utilities & Programs</span>
          </button>
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="text-2xl font-bold text-slate-900">Unknown pathway</div>
            <p className="text-slate-600 mt-2">Valid pathways: prescriptive, custom, site-specific-nmec</p>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 inline-flex px-2 py-1 rounded">
                PG&E • On-Bill Financing • Pathway Detail
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mt-2">{pathway.name}</h1>
              <p className="text-slate-600 mt-2 max-w-3xl">{pathway.description}</p>
            </div>
            <button
              onClick={() => navigate(`/utilities/obf/workflow?pathway=${pathwayId}`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ClipboardList className="w-4 h-4" />
              Start workflow
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:col-span-2">
            <div className="text-lg font-bold text-slate-900 mb-3">Best For</div>
            <div className="text-slate-700">{pathway.useCase}</div>

            <div className="mt-6">
              <div className="text-lg font-bold text-slate-900 mb-3">Eligibility Criteria</div>
              <ul className="text-sm text-slate-700 space-y-2">
                {pathway.eligibilityCriteria.map((c) => (
                  <li key={c} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <TimelineVisualization
            title="Timeline (with checklist progress)"
            checklistItems={pathway.checklist || []}
            checklistState={checklistState}
            timelineNotes={[
              { label: 'Pre-Submission', value: pathway.typicalTimeline.preSubmission },
              { label: 'Review', value: pathway.typicalTimeline.review },
              { label: 'Approval', value: pathway.typicalTimeline.approval },
              { label: 'Installation', value: pathway.typicalTimeline.installation },
              ...(pathway.typicalTimeline.performance ? [{ label: 'Performance', value: pathway.typicalTimeline.performance }] : []),
            ]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DocumentTemplateManager persistKey={persistKey} documents={pathway.requiredDocuments} />
          <SubmissionChecklist
            persistKey={persistKey}
            items={pathway.checklist || []}
            onStateChange={(s) => setChecklistState(s)}
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="text-lg font-bold text-slate-900 mb-3">Submission Process</div>
          <ol className="space-y-3">
            {pathway.submissionProcess
              .slice()
              .sort((a, b) => a.step - b.step)
              .map((s) => (
                <li key={s.step} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        Step {s.step}: {s.description}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Responsible: <span className="font-semibold">{s.responsibleParty}</span>
                        {s.estimatedTime ? ` • Est: ${s.estimatedTime}` : ''}
                      </div>
                      {(s.deliverables?.length || 0) > 0 && (
                        <ul className="text-sm text-slate-700 mt-2 space-y-1">
                          {s.deliverables!.slice(0, 6).map((d) => (
                            <li key={d} className="flex items-start gap-2">
                              <span className="text-blue-700 mt-0.5">•</span>
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </li>
              ))}
          </ol>
        </div>

        {(pathway.commonIssues?.length || 0) > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div className="text-lg font-bold text-slate-900">Common Issues (and how to avoid them)</div>
            </div>
            <div className="space-y-3">
              {pathway.commonIssues!.map((i) => (
                <div key={i.issue} className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                  <div className="text-sm font-bold text-slate-900">{i.issue}</div>
                  <div className="text-sm text-slate-700 mt-1">
                    <span className="font-semibold">Impact:</span> {i.impact}
                  </div>
                  <div className="text-sm text-slate-700 mt-1">
                    <span className="font-semibold">Prevention:</span> {i.prevention}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(pathway.bestPractices?.length || 0) > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="text-lg font-bold text-slate-900 mb-3">Best Practices</div>
            <ul className="text-sm text-slate-700 space-y-2">
              {pathway.bestPractices!.map((bp) => (
                <li key={bp} className="flex items-start gap-2">
                  <span className="text-emerald-700 mt-0.5">•</span>
                  <span>{bp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {pathway.energyInsightAccess && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="text-lg font-bold text-slate-900 mb-3">Energy Insight (3P submission)</div>
            <div className="text-sm text-slate-700">
              {pathway.energyInsightAccess.can3PSubmit ? (
                <div className="text-green-700 font-semibold">✓ 3P partners can submit this pathway via Energy Insight</div>
              ) : (
                <div className="text-slate-700 font-semibold">Direct to PG&E</div>
              )}
            </div>
            <div className="mt-3">
              <div className="text-sm font-semibold text-slate-800 mb-2">Workflow (preview)</div>
              <ul className="text-sm text-slate-700 space-y-1">
                {pathway.energyInsightAccess.workflow.slice(0, 6).map((w) => (
                  <li key={w} className="flex items-start gap-2">
                    <span className="text-blue-700 mt-0.5">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {(pathway.resources?.length || 0) > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="text-lg font-bold text-slate-900 mb-3">Resources</div>
            <div className="space-y-2">
              {pathway.resources!.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-3 border border-slate-200 rounded-xl p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{r.label}</div>
                    {r.notes && <div className="text-xs text-slate-500 mt-1">{r.notes}</div>}
                    {r.referencePath && <div className="text-xs text-slate-500 mt-1">Ref: {r.referencePath}</div>}
                  </div>
                  {r.url ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900"
                    >
                      Open <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500">No URL</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


