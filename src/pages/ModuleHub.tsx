/**
 * Module Hub - Main Landing Page
 * 
 * @see EVERWATT_AI_CORE_VISION.md - Core Vision & Guiding Compass
 * This hub provides access to all EverWatt.AI modules, each designed to support
 * vendor-agnostic optimization, provable results, and scalable expertise.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  TrendingUp,
  Settings,
  FolderKanban,
} from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { MODULES, isModuleEnabled } from '../modules/registry';

interface ModuleCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  status: 'stable' | 'beta' | 'labs' | 'coming-soon';
  route: string;
}

export const ModuleHub: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAdmin();

  const SHOW_LABS =
    String(import.meta.env.VITE_SHOW_LABS || '').trim().toLowerCase() === 'true' || import.meta.env.DEV;

  const enabledModules = MODULES.filter((m) => isModuleEnabled(m, import.meta.env || {}, SHOW_LABS));

  const iconFor = (id: string) => {
    if (id === 'project_builder') return <FolderKanban className="w-12 h-12" />;
    return <Sparkles className="w-12 h-12" />;
  };

  const gradientFor = (id: string) => {
    if (id === 'project_builder') return 'from-slate-700 to-slate-900';
    if (id === 'academy') return 'from-blue-600 to-indigo-700';
    if (id === 'reports') return 'from-emerald-600 to-emerald-800';
    if (id === 'monitoring') return 'from-purple-600 to-purple-800';
    if (id === 'audit') return 'from-amber-600 to-amber-800';
    return 'from-slate-600 to-slate-800';
  };

  const statusFor = (m: (typeof MODULES)[number]): ModuleCard['status'] => m.statusTag || 'stable';

  const modules: ModuleCard[] = enabledModules.map((m) => ({
    id: m.id,
    title: m.title,
    subtitle: m.statusTag ? m.statusTag.toUpperCase() : 'STABLE',
    description: m.description,
    icon: iconFor(m.id),
    color: 'slate',
    gradient: gradientFor(m.id),
    status: statusFor(m),
    route: m.routeBase,
  }));

  const handleModuleClick = (module: ModuleCard) => {
    if (module.status === 'coming-soon') {
      return; // Don't navigate if coming soon
    }
    navigate(module.route);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">EverWatt.AI</h1>
              <p className="text-slate-500">Vendor-Agnostic Energy Optimization Ecosystem</p>
              <p className="text-xs text-slate-400 mt-1">Learn from data • Provable results • Scale expertise</p>
            </div>
          </div>
          <p className="text-slate-600 mt-4 max-w-3xl">
            A plug-and-play, vendor-agnostic optimization layer that learns from building data 
            to continuously reduce energy and demand—at scale—with provable results. 
            Choose a module to begin.
          </p>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {!SHOW_LABS ? (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
            <span className="font-semibold">Modules enabled:</span> This hub is driven by `src/modules/registry.ts` + per-module env flags.
            Labs modules are hidden unless <span className="font-mono">VITE_SHOW_LABS=true</span>.
          </div>
        ) : (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
            <span className="font-semibold">Labs enabled:</span> Labs modules are visible on the hub (and still governed by per-module flags).
          </div>
        )}
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-900">Public:</span> Everwatt Academy is open access (no login) for training and enablement.
          </div>
          <button
            onClick={() => navigate('/academy')}
            className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-black"
          >
            Open Academy
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <div
              key={module.id}
              onClick={() => handleModuleClick(module)}
              className={`
                group relative bg-white rounded-2xl border-2 overflow-hidden
                transition-all duration-300 cursor-pointer
                ${
                  module.status === 'coming-soon'
                    ? 'border-slate-200 opacity-75 cursor-not-allowed'
                    : 'border-slate-200 hover:border-blue-500 hover:shadow-xl'
                }
              `}
            >
              {/* Gradient Header */}
              <div className={`bg-gradient-to-r ${module.gradient} p-6 text-white`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 bg-white/20 rounded-xl backdrop-blur-sm`}>
                    {module.icon}
                  </div>
                  {module.status === 'stable' && (
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">Stable</span>
                  )}
                  {module.status === 'beta' && (
                    <span className="px-3 py-1 bg-yellow-500/30 backdrop-blur-sm rounded-full text-xs font-semibold">Beta</span>
                  )}
                  {module.status === 'labs' && (
                    <span className="px-3 py-1 bg-fuchsia-500/30 backdrop-blur-sm rounded-full text-xs font-semibold">Labs</span>
                  )}
                  {module.status === 'coming-soon' && (
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
                      Coming Soon
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold mb-1">{module.title}</h2>
                <p className="text-white/90 text-sm">{module.subtitle}</p>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  {module.description}
                </p>

                {module.status === 'coming-soon' ? (
                  <div className="flex items-center text-slate-400 text-sm">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    <span>In Development</span>
                  </div>
                ) : (
                  <div className="flex items-center text-blue-600 font-semibold group-hover:text-blue-700">
                    <span className="text-sm">Open Module</span>
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </div>
                )}
              </div>

              {/* Hover Effect Overlay */}
              {module.status !== 'coming-soon' && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300 pointer-events-none" />
              )}
            </div>
          ))}
        </div>

        {/* Ecosystem Info */}
        <div className="mt-12 bg-white rounded-2xl border border-slate-200 p-8">
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Ecosystem Architecture
          </h3>
          <p className="text-slate-600 mb-4">
            For this ship slice, EverWatt focuses on a single auditable workflow: evidence → inbox → confirmed graph → decision ledger.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">?? Data Integration</h4>
              <p className="text-sm text-slate-600">
                Audit data flows to calculators. Calculator results feed reports. All modules share a common data layer.
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">?? Scalable Design</h4>
              <p className="text-sm text-slate-600">
                Modules can be deployed independently. Heavy compute (calculators) won't slow down training (AI Assistant).
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">?? API-First</h4>
              <p className="text-sm text-slate-600">
                Every module exposes APIs. Integrate with external systems, build custom workflows, extend functionality.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Controls */}
      {isAuthenticated && isAdmin && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => navigate('/admin')}
            className="bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-900 transition-colors flex items-center gap-2"
            title="Admin Dashboard"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

