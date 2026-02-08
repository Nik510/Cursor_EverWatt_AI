import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataSearch } from '../../components/DataSearch';

const QUICK_QUERIES: Array<{ label: string; query: string }> = [
  { label: 'Troubleshooting (trend-based)', query: 'troubleshooting trend' },
  { label: 'Command vs feedback', query: 'command feedback status' },
  { label: 'Hunting / oscillation', query: 'hunting oscillation' },
  { label: 'SAT reset problems', query: 'SAT reset comfort' },
  { label: 'Economizer not economizing', query: 'economizer mixed air' },
  { label: 'Sensor drift / bias', query: 'sensor drift bias' },
  { label: 'ASHRAE (overview)', query: 'ASHRAE' },
  { label: 'Guideline 36', query: 'Guideline 36' },
];

export const AcademyStandards: React.FC = () => {
  const navigate = useNavigate();
  const [seed, setSeed] = React.useState(QUICK_QUERIES[0]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/academy')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Engineering Standards Library
              </h1>
              <p className="text-sm text-slate-600">
                Search across EverWatt’s embedded knowledge base (including ASHRAE-integrated HVAC content).
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex flex-wrap gap-2">
            {QUICK_QUERIES.map((q) => {
              const active = q.query === seed.query;
              return (
                <button
                  key={q.query}
                  type="button"
                  onClick={() => setSeed(q)}
                  className={[
                    'px-3 py-2 rounded-xl text-sm font-semibold border transition-colors',
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {q.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <DataSearch
              key={seed.query}
              initialQuery={seed.query}
              initialCategory="hvac"
              initialType="training"
              placeholder="Search troubleshooting + references (e.g., hunting, stuck damper, SAT reset, economizer, sensor bias)..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

