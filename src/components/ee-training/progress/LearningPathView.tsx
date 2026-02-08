import React, { useMemo, useState } from 'react';
import { ArrowRight, Target } from 'lucide-react';
import type { TrainingModule } from '../../../backend/ee-training/types';
import { getModuleProgress } from '../../../utils/training-progress';
import { ProgressIndicator } from './ProgressIndicator';

type Role = 'sales' | 'engineer' | 'field';

export interface LearningPathViewProps {
  modules: TrainingModule[];
  onSelectModule?: (moduleId: string) => void;
  initialRole?: Role;
  initialIndustryFocus?: string;
}

function scoreModule(opts: {
  module: TrainingModule;
  role: Role;
  industryFocus: string;
  completedPercent: number;
}): { score: number; reason: string } {
  const { module, role, industryFocus, completedPercent } = opts;
  const tags = (module.metadata?.tags ?? []).map(String).map((t) => t.toLowerCase());
  const title = `${module.title} ${module.subtitle ?? ''} ${module.description ?? ''}`.toLowerCase();
  const focus = industryFocus.trim().toLowerCase();

  let score = 0;
  const reasons: string[] = [];

  // Prefer incomplete modules.
  if (completedPercent < 100) {
    score += 30;
    reasons.push('Not completed yet');
  } else {
    score -= 20;
  }

  // Always recommend Industry-Specific Guide near the top.
  if (module.id === 'industry-specific') {
    score += 80;
    reasons.push('Best industry context and discovery prompts');
  }

  // Role bias.
  if (role === 'sales') {
    if (module.id === 'sales-tips-tricks') {
      score += 70;
      reasons.push('Sales-first discovery + positioning');
    }
    if (tags.includes('field') || tags.includes('sales') || tags.includes('overview')) {
      score += 15;
      reasons.push('Sales-friendly content');
    }
    if (module.metadata?.difficulty === 'advanced') score -= 10;
  }

  if (role === 'engineer') {
    if (tags.includes('engineering') || tags.includes('controls') || tags.includes('hvac')) {
      score += 15;
      reasons.push('Engineering-heavy content');
    }
  }

  if (role === 'field') {
    if (tags.includes('field') || tags.includes('checklist') || tags.includes('walkthrough')) {
      score += 15;
      reasons.push('Field execution content');
    }
  }

  // Industry focus bias (simple match).
  if (focus) {
    const hit = tags.some((t) => t.includes(focus)) || title.includes(focus);
    if (hit) {
      score += 35;
      reasons.push(`Matches industry focus: ${industryFocus}`);
    }
  }

  // Estimated time preference: shorter first for sales.
  const est = typeof module.metadata?.estimatedTime === 'number' ? module.metadata.estimatedTime : null;
  if (role === 'sales' && est !== null && est <= 20) {
    score += 10;
    reasons.push('Quick win module');
  }

  // Deterministic tie-breaker: order.
  score += Math.max(0, 10 - (module.order ?? 0) * 0.01);

  return { score, reason: reasons.slice(0, 2).join(' · ') || 'Recommended' };
}

export const LearningPathView: React.FC<LearningPathViewProps> = ({
  modules,
  onSelectModule,
  initialRole = 'sales',
  initialIndustryFocus = '',
}) => {
  const [role, setRole] = useState<Role>(initialRole);
  const [industryFocus, setIndustryFocus] = useState(initialIndustryFocus);

  const recommendations = useMemo(() => {
    const scored = modules
      .map((m) => {
        const prog = getModuleProgress(m);
        const { score, reason } = scoreModule({
          module: m,
          role,
          industryFocus,
          completedPercent: prog.percent,
        });
        return { module: m, score, reason, prog };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return scored;
  }, [modules, role, industryFocus]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-pink-600 text-white">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" />
          <div className="font-extrabold tracking-tight">Recommended Learning Path</div>
        </div>
        <div className="text-xs text-white/85 mt-1">
          Personalized by role + industry focus (optional)
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-2">Role</div>
          {(['sales', 'engineer', 'field'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={[
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                role === r
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
              ].join(' ')}
            >
              {r === 'sales' ? 'Sales' : r === 'engineer' ? 'Engineer' : 'Field'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">
            Industry focus
          </div>
          <input
            value={industryFocus}
            onChange={(e) => setIndustryFocus(e.target.value)}
            placeholder="Optional (e.g., healthcare, manufacturing, k12)"
            className="flex-1 min-w-[220px] px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
        </div>

        <div className="space-y-3">
          {recommendations.map(({ module, reason, prog }) => (
            <div
              key={module.id}
              className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-colors bg-white"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-xl">{module.icon || '📚'}</div>
                    <div className="font-extrabold text-slate-900 line-clamp-2">{module.title}</div>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">{reason}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectModule?.(module.id)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  Open
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3">
                <ProgressIndicator percent={prog.percent} compact />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


