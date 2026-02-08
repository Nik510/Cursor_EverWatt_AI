import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, MessageSquare, Sparkles } from 'lucide-react';
import type { TrainingModule, TrainingSection } from '../../backend/ee-training/types';
import { ContentBlockRenderer } from './ContentBlockRenderer';
import { ProgressIndicator } from './progress/ProgressIndicator';
import { addSectionTime, getModuleProgress, getSectionProgress, markSectionViewed, toggleSectionCompleted } from '../../utils/training-progress';

type TrainingMode = 'sales' | 'deep';

function getStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}

function getSectionRoles(section: TrainingSection): string[] {
  return getStringArray(section.metadata?.roles);
}

function getSectionTags(section: TrainingSection): string[] {
  return getStringArray(section.metadata?.tags);
}

function getSectionDifficulty(section: TrainingSection): string | null {
  const d = section.metadata?.difficulty;
  return typeof d === 'string' ? d : null;
}

function filterSectionsForMode(sections: TrainingSection[], mode: TrainingMode): TrainingSection[] {
  const sorted = [...sections].sort((a, b) => a.order - b.order);
  if (mode === 'deep') return sorted;

  // Sales Basics:
  // - Always include Quick Overview if present
  // - Prefer overview/sales/selection/field tagged content to keep it concise
  // - Fall back to sales-role sections (non-advanced) if tagging is missing
  return sorted.filter((s) => {
    if (s.id === 'quick-overview') return true;

    const roles = getSectionRoles(s);
    const tags = getSectionTags(s);
    const difficulty = getSectionDifficulty(s);
    const est = typeof s.metadata?.estimatedTime === 'number' ? s.metadata.estimatedTime : null;

    // Tag-driven inclusions (preferred)
    if (tags.includes('overview')) return true;
    if (tags.includes('sales')) return true;
    if (tags.includes('selection')) return true;
    if (tags.includes('field')) return true;

    // Explicit safety net: always include sales strategies if present
    if (s.id === 'sales-strategies') return true;

    // Fallback: if a section claims sales relevance, include if not advanced and not huge
    if (roles.includes('sales')) {
      if (difficulty === 'advanced') return false;
      if (est !== null && est > 30) return false;
      return true;
    }

    return false;
  });
}

export interface ModuleExplorerViewProps {
  module: TrainingModule;
  initialMode?: TrainingMode;
  onOpenChat?: () => void;
}

export const ModuleExplorerView: React.FC<ModuleExplorerViewProps> = ({
  module,
  initialMode = 'sales',
  onOpenChat,
}) => {
  const [mode, setMode] = useState<TrainingMode>(initialMode);
  const [progressRev, setProgressRev] = useState(0);

  const activeSectionIdRef = useRef<string | null>(null);
  const activeSectionStartMsRef = useRef<number | null>(null);

  const visibleSections = useMemo(() => {
    return filterSectionsForMode(module.sections ?? [], mode);
  }, [mode, module.sections]);

  const moduleProgress = useMemo(() => {
    // progressRev forces recalculation after toggles
    void progressRev;
    return getModuleProgress(module);
  }, [module, progressRev]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Track which section is being viewed (IntersectionObserver) and time spent.
  useEffect(() => {
    const ids = visibleSections.map((s) => s.id);
    if (ids.length === 0) return;

    // Ensure any previous active section time is flushed when module/mode changes.
    if (activeSectionIdRef.current && activeSectionStartMsRef.current) {
      const deltaSec = Math.floor((Date.now() - activeSectionStartMsRef.current) / 1000);
      addSectionTime(module.id, activeSectionIdRef.current, deltaSec);
    }
    activeSectionIdRef.current = null;
    activeSectionStartMsRef.current = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));

        const top = visible[0];
        const nextId = (top?.target as HTMLElement | undefined)?.id ?? null;
        if (!nextId) return;
        if (nextId === activeSectionIdRef.current) return;

        // flush previous time
        if (activeSectionIdRef.current && activeSectionStartMsRef.current) {
          const deltaSec = Math.floor((Date.now() - activeSectionStartMsRef.current) / 1000);
          addSectionTime(module.id, activeSectionIdRef.current, deltaSec);
        }

        activeSectionIdRef.current = nextId;
        activeSectionStartMsRef.current = Date.now();
        markSectionViewed(module.id, nextId);
      },
      { root: null, threshold: [0.25, 0.5, 0.75] }
    );

    // Observe after paint.
    const handle = window.requestAnimationFrame(() => {
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    });

    return () => {
      window.cancelAnimationFrame(handle);
      observer.disconnect();
      if (activeSectionIdRef.current && activeSectionStartMsRef.current) {
        const deltaSec = Math.floor((Date.now() - activeSectionStartMsRef.current) / 1000);
        addSectionTime(module.id, activeSectionIdRef.current, deltaSec);
      }
      activeSectionIdRef.current = null;
      activeSectionStartMsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module.id, mode, visibleSections.map((s) => s.id).join('|')]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Content */}
      <div className="lg:col-span-9">
        <div className="mb-6 flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-pink-600 text-white flex items-center justify-center shadow-md text-2xl">
                {module.icon || '📚'}
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-extrabold text-slate-900">{module.title}</h1>
                {module.subtitle ? <p className="text-slate-500 mt-1">{module.subtitle}</p> : null}
              </div>
            </div>
            <div className="mt-4 max-w-sm">
              <ProgressIndicator
                label="Module progress"
                percent={moduleProgress.percent}
                showPercent
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setMode('sales')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  mode === 'sales'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sales Basics
              </button>
              <button
                type="button"
                onClick={() => setMode('deep')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  mode === 'deep'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Deep Dive
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenChat}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              AI Assistant
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {visibleSections.map((section) => (
            // progressRev ensures rerender when completion toggled
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-5 bg-gradient-to-r from-slate-50 via-indigo-50 to-pink-50 border-b border-slate-200">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-pink-600 text-white flex items-center justify-center shadow-md text-xl">
                      {section.icon || '📄'}
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">{section.title}</h2>
                      {section.subtitle ? <p className="text-sm text-slate-600 mt-1">{section.subtitle}</p> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {section.metadata?.estimatedTime ? (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                        {section.metadata.estimatedTime} min
                      </span>
                    ) : null}
                    {getSectionDifficulty(section) ? (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                        {getSectionDifficulty(section)}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        toggleSectionCompleted(module.id, section.id);
                        setProgressRev((v) => v + 1);
                      }}
                      className={[
                        'text-xs font-semibold px-3 py-1 rounded-full border transition-colors flex items-center gap-1',
                        (getSectionProgress(module.id, section.id)?.completed ?? false)
                          ? 'bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                      ].join(' ')}
                      title="Mark this section complete"
                    >
                      {(getSectionProgress(module.id, section.id)?.completed ?? false) ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          Completed
                        </>
                      ) : (
                        'Mark complete'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {section.content
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((block) => (
                    <ContentBlockRenderer key={block.id} block={block} />
                  ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Sticky TOC */}
      <aside className="lg:col-span-3">
        <div className="lg:sticky lg:top-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-pink-600 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <div className="font-bold">Jump to Section</div>
              </div>
              <div className="text-xs text-white/80 mt-1">
                {mode === 'sales' ? 'Sales-first path' : 'Full technical path'}
              </div>
            </div>
            <div className="p-4 space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto">
              {visibleSections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 border border-slate-200"
                >
                  {s.icon ? `${s.icon} ` : ''}{s.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};


