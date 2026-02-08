/**
 * Training Dashboard
 * Personal dashboard for progress + recommended next steps.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, BookOpen, Target } from 'lucide-react';
import { fetchAllModules } from '../../api/ee-training';
import type { TrainingModule } from '../../backend/ee-training/types';
import { useAdmin } from '../../contexts/AdminContext';
import { getCertificates } from '../../utils/certification-storage';
import { getModuleProgress, getTrainingProgressStore } from '../../utils/training-progress';
import { LearningPathView } from '../../components/ee-training/progress/LearningPathView';
import { ProgressIndicator } from '../../components/ee-training/progress/ProgressIndicator';

function computeOverall(modules: TrainingModule[]) {
  let totalSections = 0;
  let completedSections = 0;
  let timeSpentSec = 0;

  for (const m of modules) {
    const p = getModuleProgress(m);
    totalSections += p.totalSections;
    completedSections += p.completedSections;
    timeSpentSec += p.timeSpentSec;
  }

  const percent = totalSections ? Math.round((completedSections / totalSections) * 100) : 0;
  return { totalSections, completedSections, percent, timeSpentSec };
}

function formatHours(seconds: number) {
  const hrs = seconds / 3600;
  if (hrs < 1) return `${Math.max(1, Math.round(seconds / 60))} min`;
  return `${hrs.toFixed(1)} hrs`;
}

export const TrainingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAdmin();

  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const includeHidden = isAuthenticated && isAdmin;
        const res = await fetchAllModules(includeHidden);
        setModules(res.modules);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated, isAdmin]);

  const overall = useMemo(() => computeOverall(modules), [modules]);

  const continueTarget = useMemo(() => {
    const store = getTrainingProgressStore();
    const entries = Object.values(store.modules)
      .filter((m) => m.lastViewedAt)
      .sort((a, b) => (b.lastViewedAt ?? '').localeCompare(a.lastViewedAt ?? ''));
    const top = entries[0];
    return top ? { moduleId: top.moduleId, sectionId: top.lastSectionId ?? null } : null;
  }, [modules.length]);

  const certCount = useMemo(() => getCertificates().length, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/ee-training')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Training Dashboard</h1>
                <p className="text-sm text-gray-500">Progress, next steps, and certifications</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/ee-training/certification')}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-pink-600 text-white rounded-lg font-semibold hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Award className="w-4 h-4" />
            Certifications
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-slate-600">
            Loading dashboard...
          </div>
        ) : (
          <>
            {/* Overall stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Overall Progress</div>
                <div className="mt-3">
                  <ProgressIndicator percent={overall.percent} />
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  {overall.completedSections} / {overall.totalSections} sections complete
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Time Spent</div>
                <div className="mt-2 text-3xl font-extrabold text-slate-900">
                  {formatHours(overall.timeSpentSec)}
                </div>
                <div className="mt-1 text-sm text-slate-600">Across all training modules</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Certificates Earned</div>
                <div className="mt-2 text-3xl font-extrabold text-slate-900">{certCount}</div>
                <div className="mt-1 text-sm text-slate-600">Saved to this browser</div>
              </div>
            </div>

            {/* Continue learning */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Continue</div>
                  <div className="text-lg font-extrabold text-slate-900 mt-1">Pick up where you left off</div>
                  <div className="text-sm text-slate-600 mt-1">
                    Jump directly back into the last module you viewed.
                  </div>
                </div>
                <button
                  disabled={!continueTarget}
                  onClick={() =>
                    continueTarget &&
                    navigate('/ee-training', { state: { moduleId: continueTarget.moduleId } })
                  }
                  className="px-4 py-2 rounded-xl font-semibold text-sm border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Continue learning
                </button>
              </div>
            </div>

            {/* Learning Path */}
            <LearningPathView
              modules={modules}
              onSelectModule={(moduleId) => navigate('/ee-training', { state: { moduleId } })}
            />

            {/* Module list */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 bg-gradient-to-r from-slate-50 via-indigo-50 to-pink-50 border-b border-slate-200">
                <div className="font-extrabold text-slate-900">All Modules</div>
                <div className="text-sm text-slate-600 mt-1">Your progress per module</div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {modules.map((m) => {
                  const prog = getModuleProgress(m);
                  return (
                    <div key={m.id} className="p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-xl">{m.icon || '📚'}</div>
                            <div className="font-extrabold text-slate-900 line-clamp-2">{m.title}</div>
                          </div>
                          <div className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {m.subtitle || m.description || ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/ee-training', { state: { moduleId: m.id } })}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                        >
                          Open
                        </button>
                      </div>
                      <div className="mt-3">
                        <ProgressIndicator percent={prog.percent} compact />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};


