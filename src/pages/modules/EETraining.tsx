/**
 * EE Training Module
 * Main entry point for Energy Efficiency Training
 * All content is loaded from backend - no hard-coded data
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Loader2, Search, X, Award, Target } from 'lucide-react';
import { fetchAllModules } from '../../api/ee-training';
import type { TrainingModule } from '../../backend/ee-training/types';
import { AdminControls } from '../../components/admin/AdminControls';
import { useAdmin } from '../../contexts/AdminContext';
import { AiChat } from '../../components/ai/AiChat';
import { ModuleExplorerView } from '../../components/ee-training/ModuleExplorerView';
import { getModuleProgress } from '../../utils/training-progress';
import { ProgressIndicator } from '../../components/ee-training/progress/ProgressIndicator';

export const EETraining: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isAdmin } = useAdmin();
  const [moduleSearch, setModuleSearch] = useState('');
  const [chatOpen, setChatOpen] = useState(false);

  // Load modules on mount
  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      setLoading(true);
      setError(null);
      // Include hidden modules if admin
      const includeHidden = isAuthenticated && isAdmin;
      const response = await fetchAllModules(includeHidden);
      setModules(response.modules);
      const requestedModuleId = (location.state as any)?.moduleId as string | undefined;
      setSelectedModuleId((prev) => prev ?? requestedModuleId ?? response.modules?.[0]?.id ?? null);
    } catch (err) {
      console.error('Error loading modules:', err);
      setError('Failed to load training modules. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredModules = React.useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter((m) => {
      const hay = `${m.title} ${m.subtitle ?? ''} ${m.description ?? ''} ${(m.metadata?.tags ?? []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [modules, moduleSearch]);

  const selectedModule = React.useMemo(() => {
    return modules.find((m) => m.id === selectedModuleId) ?? null;
  }, [modules, selectedModuleId]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">EE Training</h1>
                <p className="text-sm text-gray-500">Unified training experience (Sales Basics + Deep Dive)</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/ee-training/certification')}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-pink-600 text-white rounded-lg font-semibold hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Award className="w-4 h-4" />
              Certifications
            </button>
            <button
              onClick={() => navigate('/ee-training/dashboard')}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Target className="w-4 h-4" />
              Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading training modules...</p>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
              <p className="text-gray-700 mb-4">{error}</p>
              <button
                onClick={loadModules}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex">
            {/* Left nav: modules */}
            <div className="w-80 bg-white border-r border-slate-200 overflow-y-auto">
              <div className="p-5 border-b border-slate-200">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Modules</div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                    placeholder="Search modules..."
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="p-4 space-y-2">
                {filteredModules.map((m) => {
                  const isActive = m.id === selectedModuleId;
                         const prog = getModuleProgress(m);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedModuleId(m.id)}
                      className={[
                        'w-full text-left px-4 py-3 rounded-2xl border transition-all',
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white border-transparent shadow-md'
                          : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${
                          isActive ? 'bg-white/15' : 'bg-gradient-to-br from-indigo-600 to-pink-600 text-white'
                        }`}>
                          {m.icon || '📚'}
                        </div>
                        <div className="min-w-0">
                          <div
                            title={m.title}
                            className={`font-extrabold tracking-tight leading-snug ${isActive ? 'text-white' : 'text-slate-900'} line-clamp-2`}
                          >
                            {m.title}
                          </div>
                          <div
                            title={m.subtitle || m.description || ''}
                            className={`text-xs leading-snug ${isActive ? 'text-white/85' : 'text-slate-600'} line-clamp-2 mt-1`}
                          >
                            {m.subtitle || m.description || ''}
                          </div>
                                 <div className="mt-2">
                                   <ProgressIndicator
                                     percent={prog.percent}
                                     compact
                                   />
                                 </div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {filteredModules.length === 0 && (
                  <div className="text-sm text-slate-500 p-4">
                    No modules match your search.
                  </div>
                )}
              </div>
            </div>

            {/* Main */}
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-7xl mx-auto p-8">
                {selectedModule ? (
                  <ModuleExplorerView
                    module={selectedModule}
                    initialMode="sales"
                    onOpenChat={() => setChatOpen(true)}
                  />
                ) : (
                  <div className="text-slate-600">Select a module to begin.</div>
                )}
              </div>
            </main>
          </div>
        )}
      </div>

      {/* Admin Controls */}
      <AdminControls />

      {/* Chat overlay */}
      {chatOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setChatOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="font-bold text-slate-900">AI Training Assistant</div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="flex-1 p-4 bg-slate-50">
              <AiChat
                title="AI Training Assistant"
                systemPrompt="You are an energy efficiency training assistant. Be concise, practical, and cite assumptions. If asked for calculations, show the steps and units."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
