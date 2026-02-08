import React from 'react';
import { ArrowLeft, Calculator, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PGETsbPacReport: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Back to module hub"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">PG&E TSB &amp; PAC Ratio Report</h1>
              <p className="text-sm text-gray-500">Placeholder module (formulas to be added)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-5xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">What this module will do</h2>
            <p className="text-sm text-gray-700">
              Compute <strong>Total System Benefit (TSB)</strong> and <strong>PAC ratio</strong> for PG&amp;E programs and generate a
              shareable report (PDF/Excel). This page is intentionally a placeholder until formulas + inputs are finalized.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Expected inputs (TBD)</h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>- Interval savings (kWh by timestamp) and/or demand impacts (kW)</li>
                <li>- Avoided cost values (time-dependent $/kWh, adders, demand components)</li>
                <li>- Project + program administrator costs</li>
                <li>- EUL, discount rate, NTG/realization factors (if applicable)</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Outputs (placeholder)</h3>
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-slate-600">Total System Benefit (TSB)</div>
                  <div className="text-2xl font-bold text-slate-900">TBD</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-slate-600">PAC Ratio</div>
                  <div className="text-2xl font-bold text-slate-900">TBD</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-700" />
              Report generation
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Export will be enabled once TSB/PAC calculations and required inputs are implemented.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled
                className="px-4 py-3 rounded-xl bg-gray-300 text-white font-semibold cursor-not-allowed"
              >
                Calculate
              </button>
              <button
                type="button"
                disabled
                className="px-4 py-3 rounded-xl bg-gray-300 text-white font-semibold cursor-not-allowed"
              >
                Export PDF / Excel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

