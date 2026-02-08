import React from 'react';
import { ArrowLeft, Award, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NMECSavingsReport: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
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
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">NMEC Savings Report</h1>
              <p className="text-sm text-gray-500">Placeholder module</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-5xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Purpose</h2>
            <p className="text-sm text-gray-700">
              Produce the final normalized savings report for an NMEC project, including baseline/post periods, normalization,
              adjustments, and summary tables suitable for incentive program submission.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-700" />
              Status
            </h3>
            <p className="text-sm text-gray-700">
              This report is scaffolded as a module route. Calculations + export templates will be added when the NMEC pipeline is
              finalized.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

