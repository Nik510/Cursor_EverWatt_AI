import React, { useEffect, useMemo, useState } from 'react';
import type { ChecklistItem } from '../../data/pge/pge-obf-pathways';

export type ChecklistState = Record<string, boolean>;

export function checklistStorageKey(key: string): string {
  return `everwatt:obf:checklist:${key}`;
}

export function loadChecklistState(key: string): ChecklistState {
  try {
    const raw = localStorage.getItem(checklistStorageKey(key));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ChecklistState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveState(key: string, state: ChecklistState): void {
  try {
    localStorage.setItem(checklistStorageKey(key), JSON.stringify(state));
  } catch {
    // ignore
  }
}

export interface SubmissionChecklistProps {
  /** Typically: `pge:${pathwayId}` */
  persistKey: string;
  title?: string;
  items: ChecklistItem[];
  onStateChange?: (state: ChecklistState) => void;
}

export const SubmissionChecklist: React.FC<SubmissionChecklistProps> = ({
  persistKey,
  title,
  items,
  onStateChange,
}) => {
  const [state, setState] = useState<ChecklistState>({});

  useEffect(() => {
    setState(loadChecklistState(persistKey));
  }, [persistKey]);

  useEffect(() => {
    saveState(persistKey, state);
    onStateChange?.(state);
  }, [persistKey, state]);

  const grouped = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    items.forEach((i) => {
      const key = i.phase;
      if (!groups[key]) groups[key] = [];
      groups[key].push(i);
    });
    return groups;
  }, [items]);

  const progress = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => !!state[i.id]).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, pct };
  }, [items, state]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-lg font-bold text-slate-900">{title || 'Submission Checklist'}</div>
          <div className="text-sm text-slate-500">
            {progress.done}/{progress.total} complete ({progress.pct}%)
          </div>
        </div>
        <button
          onClick={() => setState({})}
          className="text-sm px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          Reset
        </button>
      </div>

      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-5">
        <div className="h-full bg-emerald-600" style={{ width: `${progress.pct}%` }} />
      </div>

      <div className="space-y-5">
        {Object.entries(grouped).map(([phase, phaseItems]) => (
          <div key={phase}>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">{phase.replace('-', ' ')}</div>
            <div className="space-y-2">
              {phaseItems.map((i) => {
                const checked = !!state[i.id];
                return (
                  <label
                    key={i.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setState((prev) => ({ ...prev, [i.id]: e.target.checked }))}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{i.item}</div>
                      {i.whyItMatters && <div className="text-sm text-slate-600 mt-1">{i.whyItMatters}</div>}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {items.length === 0 && <div className="text-sm text-slate-600">No checklist items defined for this pathway yet.</div>}
      </div>
    </div>
  );
};


