import React, { useMemo } from 'react';
import type { ChecklistItem } from '../../data/pge/pge-obf-pathways';
import type { ChecklistState } from './SubmissionChecklist';

const PHASE_ORDER: Array<ChecklistItem['phase']> = [
  'pre-submission',
  'submission',
  'post-approval',
  'installation',
  'performance',
];

function phaseLabel(phase: ChecklistItem['phase']): string {
  return phase
    .split('-')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

export interface TimelineVisualizationProps {
  title?: string;
  checklistItems?: ChecklistItem[];
  checklistState?: ChecklistState;
  /** Optional free-form timeline strings (e.g. from pathway.typicalTimeline) */
  timelineNotes?: Array<{ label: string; value: string }>;
}

export const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({
  title = 'Timeline',
  checklistItems = [],
  checklistState = {},
  timelineNotes = [],
}) => {
  const phaseStats = useMemo(() => {
    const byPhase: Record<string, { total: number; done: number }> = {};
    PHASE_ORDER.forEach((p) => (byPhase[p] = { total: 0, done: 0 }));
    checklistItems.forEach((i) => {
      byPhase[i.phase] = byPhase[i.phase] || { total: 0, done: 0 };
      byPhase[i.phase].total += 1;
      if (checklistState[i.id]) byPhase[i.phase].done += 1;
    });
    return byPhase;
  }, [checklistItems, checklistState]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="text-lg font-bold text-slate-900 mb-4">{title}</div>

      {(timelineNotes.length || 0) > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {timelineNotes.map((t) => (
            <div key={t.label} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-600 mb-1">{t.label}</div>
              <div className="text-sm font-bold text-slate-900">{t.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {PHASE_ORDER.map((phase) => {
          const stats = phaseStats[phase] || { total: 0, done: 0 };
          const pct = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);
          return (
            <div key={phase} className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">{phaseLabel(phase)}</div>
                  <div className="text-xs text-slate-500">
                    {stats.done}/{stats.total} checklist items complete
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-700">{pct}%</div>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-3">
                <div className="h-full bg-indigo-600" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


