/**
 * OBF Submission Workflow
 * Tracks step completion + checklist/doc progress for a selected pathway.
 *
 * Persistence:
 * - localStorage (per pathway) so users can return later without backend.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, ClipboardList, ExternalLink } from 'lucide-react';
import { pgeOBFPathways, type PGEOBFPathwayType } from '../data/pge/pge-obf-pathways';
import { DocumentTemplateManager } from '../components/obf/DocumentTemplateManager';
import { SubmissionChecklist, loadChecklistState, type ChecklistState } from '../components/obf/SubmissionChecklist';
import { TimelineVisualization } from '../components/obf/TimelineVisualization';

type StepState = Record<number, boolean>;

function isValidPathwayId(id: string | null): id is PGEOBFPathwayType {
  return id === 'prescriptive' || id === 'custom' || id === 'site-specific-nmec';
}

function stepStorageKey(pathwayId: PGEOBFPathwayType): string {
  return `everwatt:obf:workflowSteps:pge:${pathwayId}`;
}

function loadSteps(pathwayId: PGEOBFPathwayType): StepState {
  try {
    const raw = localStorage.getItem(stepStorageKey(pathwayId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StepState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveSteps(pathwayId: PGEOBFPathwayType, state: StepState): void {
  try {
    localStorage.setItem(stepStorageKey(pathwayId), JSON.stringify(state));
  } catch {
    // ignore
  }
}

export const OBFSubmissionWorkflow: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const pathwayId = isValidPathwayId(params.get('pathway')) ? (params.get('pathway') as PGEOBFPathwayType) : 'prescriptive';
  const pathway = pgeOBFPathways[pathwayId];
  const persistKey = `pge:${pathwayId}`;

  const [stepState, setStepState] = useState<StepState>({});
  const [checklistState, setChecklistState] = useState<ChecklistState>({});

  useEffect(() => {
    setStepState(loadSteps(pathwayId));
    setChecklistState(loadChecklistState(persistKey));
  }, [pathwayId, persistKey]);

  useEffect(() => {
    saveSteps(pathwayId, stepState);
  }, [pathwayId, stepState]);

  const sortedSteps = useMemo(() => pathway.submissionProcess.slice().sort((a, b) => a.step - b.step), [pathway.submissionProcess]);
  const stepProgress = useMemo(() => {
    const total = sortedSteps.length;
    const done = sortedSteps.filter((s) => !!stepState[s.step]).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, pct };
  }, [sortedSteps, stepState]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-50">
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
              <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 inline-flex px-2 py-1 rounded">
                PG&E • OBF • Submission Workflow
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mt-2">{pathway.name}</h1>
              <p className="text-slate-600 mt-2 max-w-3xl">{pathway.useCase}</p>
            </div>
            <button
              onClick={() => navigate(`/utilities/obf/pathway/${pathwayId}`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-50"
            >
              View pathway detail <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-700" />
              <div className="text-lg font-bold text-slate-900">Step Progress</div>
            </div>
            <div className="text-sm text-slate-600">
              {stepProgress.done}/{stepProgress.total} steps complete ({stepProgress.pct}%)
            </div>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-indigo-600" style={{ width: `${stepProgress.pct}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
            <div className="text-lg font-bold text-slate-900 mb-4">Submission Steps</div>
            <div className="space-y-3">
              {sortedSteps.map((s) => {
                const done = !!stepState[s.step];
                return (
                  <div key={s.step} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => setStepState((prev) => ({ ...prev, [s.step]: !done }))}
                            className="mt-0.5"
                            aria-label={done ? 'Mark step incomplete' : 'Mark step complete'}
                          >
                            {done ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              Step {s.step}: {s.description}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Responsible: <span className="font-semibold">{s.responsibleParty}</span>
                              {s.estimatedTime ? ` • Est: ${s.estimatedTime}` : ''}
                            </div>
                          </div>
                        </div>

                        {(s.deliverables?.length || 0) > 0 && (
                          <div className="mt-3">
                            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                              Deliverables
                            </div>
                            <ul className="text-sm text-slate-700 space-y-1">
                              {s.deliverables!.slice(0, 8).map((d) => (
                                <li key={d} className="flex items-start gap-2">
                                  <span className="text-indigo-700 mt-0.5">•</span>
                                  <span>{d}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <TimelineVisualization
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
          <div>
            {/* We re-render the checklist component so it can manage persistence; we also read state to feed timeline. */}
            <SubmissionChecklist
              persistKey={persistKey}
              items={pathway.checklist || []}
              onStateChange={(s) => setChecklistState(s)}
            />
            <div className="mt-3 text-xs text-slate-500">
              Checklist progress is saved locally in your browser (localStorage).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


