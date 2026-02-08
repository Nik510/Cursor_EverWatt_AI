import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  BarChart3,
  TrendingUp,
  ClipboardSignature,
  Leaf,
  Sun,
  Award,
  Target,
  ClipboardCheck,
  Calculator,
  Zap,
  ArrowRight,
} from 'lucide-react';

type ReportTile = {
  id: string;
  title: string;
  description: string;
  route: string;
  badge?: string;
  icon: React.ReactNode;
  gradient: string;
};

export const ReportsHome: React.FC = () => {
  const navigate = useNavigate();

  const tiles: Array<{ section: string; items: ReportTile[] }> = [
    {
      section: 'Core Report Builders',
      items: [
        {
          id: 'energy-model',
          title: 'Energy Model Report',
          description: 'Baseline vs proposed scenario documentation. Export to PDF / Excel / Word.',
          route: '/reports?type=energy-model',
          badge: 'Beta',
          icon: <BarChart3 className="w-6 h-6 text-white" />,
          gradient: 'from-blue-600 to-cyan-700',
        },
        {
          id: 'savings',
          title: 'Savings Calculation Report',
          description: 'Payback / NPV style reporting using calculator results. Export to PDF / Excel / Word.',
          route: '/reports?type=savings',
          badge: 'Beta',
          icon: <Calculator className="w-6 h-6 text-white" />,
          gradient: 'from-emerald-600 to-green-700',
        },
        {
          id: 'proposal',
          title: 'Proposal Generator',
          description: 'Client-ready proposal combining findings, recommendations, and financials.',
          route: '/reports?type=proposal',
          badge: 'Beta',
          icon: <FileText className="w-6 h-6 text-white" />,
          gradient: 'from-orange-600 to-rose-700',
        },
        {
          id: 'change-order',
          title: 'Change Order Generator',
          description: 'Create, number, and export professional change orders (PDF/Word).',
          route: '/reports?type=change-order',
          badge: 'Active',
          icon: <ClipboardSignature className="w-6 h-6 text-white" />,
          gradient: 'from-slate-700 to-slate-900',
        },
      ],
    },
    {
      section: 'Measurement & Verification',
      items: [
        {
          id: 'mv-comparison',
          title: 'M&V Comparison Report',
          description: 'Before/after comparisons (monthly/quarterly/bi-annual/yearly) for energy, demand, and cost.',
          route: '/reports/mv-comparison',
          badge: 'Active',
          icon: <TrendingUp className="w-6 h-6 text-white" />,
          gradient: 'from-teal-600 to-emerald-700',
        },
      ],
    },
    {
      section: 'PG&E / NMEC / Utility Reporting',
      items: [
        {
          id: 'pge-energy-intel',
          title: 'PG&E Energy Intelligence Report',
          description: 'AI-assisted analysis with exports. Lives under Reports (no redirect).',
          route: '/reports/pge-energy-intelligence',
          badge: 'Beta',
          icon: <Zap className="w-6 h-6 text-white" />,
          gradient: 'from-purple-600 to-pink-700',
        },
        {
          id: 'pge-regression',
          title: 'PG&E Regression Report',
          description: 'PG&E-aligned regression report template and export.',
          route: '/reports/pge-regression',
          badge: 'Active',
          icon: <BarChart3 className="w-6 h-6 text-white" />,
          gradient: 'from-blue-700 to-indigo-800',
        },
        {
          id: 'regression-builder',
          title: 'Regression Report Builder',
          description: 'Build regression reports with charts, tables, and summary statistics.',
          route: '/reports/regression-analysis',
          badge: 'Active',
          icon: <TrendingUp className="w-6 h-6 text-white" />,
          gradient: 'from-indigo-600 to-purple-700',
        },
        {
          id: 'nmec-predictability',
          title: 'NMEC Predictability Report',
          description: 'Placeholder: baseline QA + GOF metrics report shell for NMEC / Option C workflows.',
          route: '/reports/nmec-predictability',
          badge: 'Placeholder',
          icon: <Target className="w-6 h-6 text-white" />,
          gradient: 'from-cyan-600 to-sky-700',
        },
        {
          id: 'nmec-mv-plan',
          title: 'NMEC M&V Plan',
          description: 'Placeholder: generate an NMEC M&V plan document (scope, boundary, adjustments, uncertainty).',
          route: '/reports/nmec-mv-plan',
          badge: 'Placeholder',
          icon: <ClipboardCheck className="w-6 h-6 text-white" />,
          gradient: 'from-sky-600 to-cyan-700',
        },
        {
          id: 'nmec-savings',
          title: 'NMEC Savings Report',
          description: 'Placeholder: final normalized savings report shell for incentive submissions.',
          route: '/reports/nmec-savings',
          badge: 'Placeholder',
          icon: <Award className="w-6 h-6 text-white" />,
          gradient: 'from-green-600 to-emerald-700',
        },
        {
          id: 'pge-tsb-pac',
          title: 'PG&E TSB & PAC Ratio',
          description: 'Placeholder: Total System Benefit (TSB) and PAC ratio calculations + export.',
          route: '/reports/pge-tsb-pac',
          badge: 'Placeholder',
          icon: <Calculator className="w-6 h-6 text-white" />,
          gradient: 'from-blue-800 to-slate-900',
        },
      ],
    },
    {
      section: 'Sustainability / ESG',
      items: [
        {
          id: 'carbon-footprint',
          title: 'Carbon Footprint Report',
          description: 'EPA-based avoided emissions (kWh + therms) with equivalencies and a recognition certificate.',
          route: '/reports/carbon-footprint',
          badge: 'Active',
          icon: <Leaf className="w-6 h-6 text-white" />,
          gradient: 'from-emerald-600 to-sky-600',
        },
      ],
    },
    {
      section: 'Solar / OBF',
      items: [
        {
          id: 'nifs-solar',
          title: 'NIFS Solar Analysis',
          description: 'OBF qualification analysis for solar projects with automated Excel generation.',
          route: '/reports/nifs-solar',
          badge: 'Active',
          icon: <Sun className="w-6 h-6 text-white" />,
          gradient: 'from-amber-500 to-yellow-600',
        },
      ],
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Documentation Studio</h1>
        <p className="text-gray-600 mt-2">
          Generate beautiful, client-ready reports and documents from audits, calculators, and manual inputs.
        </p>
      </div>

      {tiles.map((group) => (
        <div key={group.section}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">{group.section}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(t.route)}
                className="text-left bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg hover:border-blue-400 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center`}>
                    {t.icon}
                  </div>
                  {t.badge && (
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                      {t.badge}
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-base font-bold text-gray-900">{t.title}</div>
                  <div className="text-sm text-gray-600 mt-1">{t.description}</div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-blue-700 font-semibold text-sm">
                  Open <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

