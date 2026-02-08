import React from 'react';
import { ArrowLeft, ExternalLink, GraduationCap, ShieldCheck, BookOpen, Wrench, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';
import { academyConfig } from '../../config/academy-config';
import { ACADEMY_ROLE_PATHS, defaultRoleForUser, type AcademyRoleId } from '../../data/academy/role-paths';
import { getSavedAcademyRole, setSavedAcademyRole } from '../../utils/academy-storage';

export const Academy: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, hasPermission } = useAdmin();

  const canSeeSales = isAuthenticated && hasPermission('editor');
  const [role, setRole] = React.useState<AcademyRoleId>(() => {
    return getSavedAcademyRole() ?? defaultRoleForUser(canSeeSales);
  });

  React.useEffect(() => {
    // If role is invalid for current user (e.g., not staff), fall back.
    if (role === 'sales' && !canSeeSales) {
      setRole(defaultRoleForUser(canSeeSales));
    }
  }, [canSeeSales, role]);

  React.useEffect(() => {
    setSavedAcademyRole(role);
  }, [role]);

  const rolePath = React.useMemo(() => {
    return ACADEMY_ROLE_PATHS.find((r) => r.id === role) ?? ACADEMY_ROLE_PATHS[0];
  }, [role]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Everwatt Academy</h1>
                <p className="text-sm text-slate-600">Separate portals for Engineering and Sales (no shared catalog).</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <UserRound className="w-5 h-5 text-indigo-700" />
                <h2 className="text-lg font-extrabold text-slate-900">Choose your path</h2>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                Pick your role to get a recommended sequence of learning and tools. Saved to this browser.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ACADEMY_ROLE_PATHS.filter((r) => (r.id === 'sales' ? canSeeSales : true)).map((r) => {
                const active = r.id === role;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={[
                      'px-3 py-2 rounded-xl text-sm font-semibold border transition-colors',
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {r.title}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 p-5 bg-gradient-to-br from-white to-slate-50">
              <div className="font-extrabold text-slate-900">{rolePath.title}</div>
              <div className="text-sm text-slate-600 mt-1">{rolePath.subtitle}</div>
              <div className="mt-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outcomes</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                  {rolePath.outcomes.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recommended next</div>
              <div className="mt-3 space-y-3">
                {rolePath.recommendedNext.map((n) => {
                  const href = n.externalUrl;
                  const isExternal = Boolean(href);
                  const isInternal = Boolean(n.route);
                  return (
                    <div key={`${n.label}-${n.route ?? n.externalUrl ?? ''}`} className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900">{n.label}</div>
                        <div className="text-sm text-slate-600 mt-1">{n.description}</div>
                      </div>
                      {isInternal ? (
                        <button
                          type="button"
                          onClick={() => navigate(n.route!)}
                          className="px-3 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors whitespace-nowrap"
                        >
                          Open
                        </button>
                      ) : isExternal ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors whitespace-nowrap inline-flex items-center gap-2"
                        >
                          Open <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : role === 'sales' ? (
                        <a
                          href={academyConfig.salesUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors whitespace-nowrap inline-flex items-center gap-2"
                        >
                          Open <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <a
                          href={academyConfig.engineeringUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors whitespace-nowrap inline-flex items-center gap-2"
                        >
                          Open <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-xl font-bold text-slate-900">Engineering Academy</h2>
                </div>
                <p className="text-slate-600 mt-2">
                  Invite-only, free training and certification geared toward healthcare engineers. Focused on operational
                  troubleshooting and confidence—not sales.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div className="flex flex-wrap gap-3">
                <a
                  href={academyConfig.engineeringUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Open Engineering Academy <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => navigate('/academy/standards')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-800 border border-slate-200 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Standards Library <BookOpen className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/academy/troubleshooting')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-800 border border-slate-200 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Troubleshooting Library <Wrench className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs text-slate-500 text-right">
                <div className="font-semibold text-slate-700">Access</div>
                <div>Invite-only</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Sales Academy</h2>
                <p className="text-slate-600 mt-2">
                  Internal enablement portal. Hidden from non-staff users by design.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              {canSeeSales ? (
                <a
                  href={academyConfig.salesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
                >
                  Open Sales Academy <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <div className="text-sm text-slate-500">
                  Not available for your current session.
                </div>
              )}

              <div className="text-xs text-slate-500 text-right">
                <div className="font-semibold text-slate-700">Access</div>
                <div>Internal only</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900">Why two portals?</h3>
          <p className="text-slate-600 mt-2">
            To prevent cross-audience leakage, Engineering and Sales training are intentionally isolated.
            No shared catalog, no shared search, and no cross-navigation.
          </p>
          <div className="mt-4 text-sm text-slate-600">
            This app also includes a standards-grounded Engineering reference library (ASHRAE-integrated training content) to support vendor-agnostic troubleshooting.
          </div>
        </div>
      </div>
    </div>
  );
};

