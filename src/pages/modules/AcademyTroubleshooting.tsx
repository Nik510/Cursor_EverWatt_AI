import React from 'react';
import { ArrowLeft, Search, Wrench, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TroubleshootingPlaybook } from '../../data/academy/troubleshooting-playbooks';
import { TROUBLESHOOTING_PLAYBOOKS } from '../../data/academy/troubleshooting-playbooks';

function pillForSeverity(sev: TroubleshootingPlaybook['severity']) {
  switch (sev) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
    default:
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
}

export const AcademyTroubleshooting: React.FC = () => {
  const navigate = useNavigate();
  const [q, setQ] = React.useState('');
  const [active, setActive] = React.useState<TroubleshootingPlaybook | null>(null);

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return TROUBLESHOOTING_PLAYBOOKS;
    return TROUBLESHOOTING_PLAYBOOKS.filter((p) => {
      const hay = [
        p.title,
        p.severity,
        ...p.systems,
        ...p.symptoms,
        ...p.likelyCauses,
        ...p.tags,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(query);
    });
  }, [q]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/academy')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-slate-900 rounded-xl flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Troubleshooting Library
                </h1>
                <p className="text-sm text-slate-600">
                  Symptom-first playbooks with trend signatures, safe mitigations, and verification.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search symptoms, equipment, tags (e.g., reheat, hunting, economizer, SAT)..."
                className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Playbooks ({filtered.length})
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActive(p)}
                  className={[
                    'w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors',
                    active?.id === p.id ? 'bg-indigo-50' : 'bg-white',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900">{p.title}</div>
                      <div className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {p.symptoms[0] ?? '—'}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-lg border ${pillForSeverity(p.severity)}`}>
                          {p.severity.toUpperCase()}
                        </span>
                        {p.systems.slice(0, 4).map((s) => (
                          <span
                            key={s}
                            className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 whitespace-nowrap">
                      {p.recommendedTrends.length} trends
                    </div>
                  </div>
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="px-6 py-10 text-sm text-slate-600">
                  No playbooks match your search.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            {active ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="text-xl font-extrabold text-slate-900">{active.title}</div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-lg border ${pillForSeverity(active.severity)}`}>
                      {active.severity.toUpperCase()}
                    </span>
                  </div>
                  {(active.owner || active.lastReviewedAt) && (
                    <div className="text-xs text-slate-500 mt-2">
                      {active.owner ? <span>Owner: {active.owner}</span> : null}
                      {active.owner && active.lastReviewedAt ? <span> • </span> : null}
                      {active.lastReviewedAt ? <span>Last reviewed: {active.lastReviewedAt}</span> : null}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {active.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-1 text-xs rounded-lg bg-slate-100 text-slate-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Symptoms</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                    {active.symptoms.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Likely causes (ranked)</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                    {active.likelyCauses.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5" />
                    <div>
                      <div className="font-bold text-amber-900">Safety + change control</div>
                      <div className="text-sm text-amber-900/80 mt-1">
                        Trend first. Avoid sequence edits in the field. Any override/setpoint change must have a rollback step and explicit stop conditions.
                      </div>
                    </div>
                  </div>
                </div>

                {active.stopConditions && active.stopConditions.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="text-xs font-bold text-red-700 uppercase tracking-wider">Stop conditions (escalate)</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-red-900 space-y-1">
                      {active.stopConditions.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fast triage</div>
                  <div className="mt-2 space-y-3">
                    {active.fastTriage.map((t) => (
                      <div key={t.label} className="rounded-xl border border-slate-200 p-4">
                        <div className="font-bold text-slate-900">{t.label}</div>
                        <div className="text-sm text-slate-700 mt-1">{t.whatToLookFor}</div>
                        {t.stopCondition && (
                          <div className="text-xs text-slate-500 mt-2">
                            Stop condition: {t.stopCondition}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recommended trends</div>
                  <div className="mt-2 rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="text-left px-4 py-2">Point</th>
                          <th className="text-left px-4 py-2">Meaning</th>
                          <th className="text-left px-4 py-2">Interval</th>
                        </tr>
                      </thead>
                      <tbody>
                        {active.recommendedTrends.map((tp) => (
                          <tr key={tp.point} className="border-t border-slate-200">
                            <td className="px-4 py-2 font-mono text-xs text-slate-900">{tp.point}</td>
                            <td className="px-4 py-2 text-slate-700">{tp.meaning}</td>
                            <td className="px-4 py-2 text-slate-600">{tp.interval ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mitigations (lowest risk first)</div>
                  <div className="mt-2 space-y-3">
                    {active.mitigations.map((m) => (
                      <div key={m.step} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-bold text-slate-900">{m.risk.toUpperCase()} RISK</div>
                        </div>
                        <div className="text-sm text-slate-700 mt-2">{m.step}</div>
                        <div className="text-xs text-slate-500 mt-2">Rollback: {m.rollback}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verification</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                    {active.verification.map((v) => (
                      <li key={`${v.verify}-${v.when}`}>
                        {v.verify} <span className="text-slate-500">({v.when})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-600">
                Select a playbook to view triage steps, trend points, mitigations, and verification.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

