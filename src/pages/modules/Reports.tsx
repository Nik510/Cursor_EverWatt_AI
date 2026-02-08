import React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';
import { ReportGenerator } from './reports/ReportGenerator';
import { NIFSSolarAnalysis } from './reports/NIFSSolarAnalysis';
import { MVComparisonReport } from './reports/MVComparisonReport';
import { ReportsHome } from './reports/ReportsHome';

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Check if we're on the NIFS Solar Analysis sub-route
  const isNIFSPage = location.pathname === '/reports/nifs-solar';
  const isMVPage = location.pathname === '/reports/mv-comparison';
  const isReportsRoot = location.pathname === '/reports';
  const hasTypeParam = Boolean(searchParams.get('type'));

  if (isNIFSPage) {
    return <NIFSSolarAnalysis />;
  }

  if (isMVPage) {
    return <MVComparisonReport />;
  }

  // If deep-linked to a specific generator via /reports?type=..., render the generator UI.
  if (isReportsRoot && hasTypeParam) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
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
                <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-gray-900 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Documentation Studio</h1>
                  <p className="text-sm text-gray-500">Report Builder</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <ReportGenerator />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
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
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-gray-900 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Documentation Studio</h1>
                <p className="text-sm text-gray-500">Reports &amp; Documents</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <ReportsHome />
      </div>
    </div>
  );
};

