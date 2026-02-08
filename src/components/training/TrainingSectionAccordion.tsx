import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Wand2 } from 'lucide-react';

export type TrainingAudienceRole = 'sales' | 'engineer' | 'field';

export interface TrainingSectionItem {
  id: string;
  title: string;
  icon?: string;
  summary?: string;
  content: string;
  estimatedTime?: number;
  roles?: TrainingAudienceRole[];
  tags?: string[];
}

export interface TrainingSectionAccordionProps {
  sections: TrainingSectionItem[];
  mode: 'overview' | 'deep';
  roleFilter: TrainingAudienceRole | 'all';
  onGenerateDeepDive?: (title: string) => void;
  autoExpandId?: string | null;
}

export const TrainingSectionAccordion: React.FC<TrainingSectionAccordionProps> = ({
  sections,
  mode,
  roleFilter,
  onGenerateDeepDive,
  autoExpandId,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (roleFilter === 'all') return sections;
    return sections.filter((s) => (s.roles ?? []).includes(roleFilter));
  }, [roleFilter, sections]);

  useEffect(() => {
    if (!autoExpandId) return;
    setExpanded((prev) => {
      if (prev.has(autoExpandId)) return prev;
      const next = new Set(prev);
      next.add(autoExpandId);
      return next;
    });
  }, [autoExpandId]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {filtered.map((section) => {
        const isOpen = expanded.has(section.id) || mode === 'overview';
        return (
          <div key={section.id} id={section.id} className="scroll-mt-24 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(section.id)}
              className="w-full px-6 py-5 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start gap-3 text-left">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-pink-600 text-white flex items-center justify-center shadow-md">
                  <span className="text-xl">{section.icon ?? '📘'}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-900">{section.title}</h3>
                    {section.estimatedTime ? (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                        {section.estimatedTime} min
                      </span>
                    ) : null}
                    {(section.roles ?? []).length > 0 ? (
                      <div className="flex items-center gap-1">
                        {(section.roles ?? []).map((r) => (
                          <span
                            key={r}
                            className={[
                              'text-xs font-semibold px-2 py-1 rounded-full border',
                              r === 'engineer'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : r === 'sales'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200',
                            ].join(' ')}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {section.summary ? <p className="text-sm text-slate-600 mt-1">{section.summary}</p> : null}
                </div>
              </div>

              <div className="pt-1 text-slate-400">
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>

            {isOpen && (
              <div className="px-6 pb-6 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-end gap-2 mb-3">
                  {onGenerateDeepDive ? (
                    <button
                      type="button"
                      onClick={() => onGenerateDeepDive(section.title)}
                      className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                    >
                      <Wand2 className="w-4 h-4" />
                      Generate deep dive
                    </button>
                  ) : null}
                </div>
                <div className="prose prose-slate max-w-none">
                  <div className="whitespace-pre-wrap text-slate-800 leading-relaxed">
                    {section.content}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};


