/**
 * Utility Programs
 * Direct utility-sponsored programs including rebates, incentives, and demand response
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, ExternalLink, Filter, Search } from 'lucide-react';
import { utilityPrograms } from '../data/utility-programs';
import type { UtilityProgram, UtilityProgramCategory, UtilityProgramUtility } from '../data/utility-programs';

export const UtilityPrograms: React.FC = () => {
  const navigate = useNavigate();
  const [utility, setUtility] = useState<UtilityProgramUtility | 'all'>('all');
  const [category, setCategory] = useState<UtilityProgramCategory | 'all'>('all');
  const [query, setQuery] = useState('');

  const utilities = useMemo(() => {
    const set = new Set<string>();
    utilityPrograms.forEach((p) => set.add(p.utility));
    return Array.from(set).sort();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    utilityPrograms.forEach((p) => set.add(p.category));
    return Array.from(set).sort();
  }, []);

  const filtered = useMemo(() => {
    let items: UtilityProgram[] = utilityPrograms;
    if (utility !== 'all') items = items.filter((p) => p.utility === utility);
    if (category !== 'all') items = items.filter((p) => p.category === category);
    if (query) {
      const q = query.toLowerCase();
      items = items.filter((p) => {
        const text = `${p.name} ${p.summary} ${p.details || ''} ${(p.eligibility || []).join(' ')} ${(p.incentives || []).join(' ')}`.toLowerCase();
        return text.includes(q);
      });
    }
    return items;
  }, [utility, category, query]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/utilities')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Utilities & Programs</span>
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Utility Programs</h1>
              <p className="text-slate-500">Direct utility-sponsored programs and incentives</p>
            </div>
          </div>
          <p className="text-slate-600 max-w-3xl">
            Browse rebates, incentives, and demand response programs offered directly by PG&E, SCE, SDG&E, and other California utilities.
          </p>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
            <div className="font-semibold">Legacy/Beta surface (not DSIRE-audited)</div>
            <div className="mt-1">
              This page is a reference library and is not yet backed by versioned, provenance-tracked Program Snapshots. Do not treat as authoritative for compliance decisions.
            </div>
          </div>
        </div>
      </div>

      {/* Filters + List */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Filter className="w-4 h-4" />
              Filters
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search programs…"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <select
                value={utility}
                onChange={(e) => setUtility(e.target.value as any)}
                className="px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="all">All Utilities</option>
                {utilities.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 inline-flex px-2 py-1 rounded">
                    {p.utility} • {p.category}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-2">{p.name}</h3>
                  <p className="text-slate-600 mt-2">{p.summary}</p>
                </div>
              </div>

              {(p.eligibility?.length || 0) > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-slate-800 mb-1">Eligibility</div>
                  <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
                    {p.eligibility!.slice(0, 4).map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(p.incentives?.length || 0) > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-slate-800 mb-1">Incentives</div>
                  <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
                    {p.incentives!.slice(0, 4).map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(p.links?.length || 0) > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.links!.map((l) => (
                    <a
                      key={l.url}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-900"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {l.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-600">
            No programs found for your filters.
          </div>
        )}
      </div>
    </div>
  );
};
