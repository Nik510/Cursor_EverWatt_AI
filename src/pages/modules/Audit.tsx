import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, ArrowLeft, Plus, FileText, Search, Camera } from 'lucide-react';
import { AuditForm } from './audit/AuditForm';
import { AuditList } from '../../components/audit/AuditList';

export const Audit: React.FC = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

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
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Audit & Assessment</h1>
                <p className="text-sm text-gray-500">Site Data Collection</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Audit
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {showForm ? (
            <div>
              <button
                onClick={() => setShowForm(false)}
                className="mb-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Audit List
              </button>
              <AuditForm />
            </div>
          ) : (
            <>
              {/* Audit Tool Overview */}
              <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">On-Site Audit Tool</h2>
                <p className="text-gray-500">Capture all necessary building and equipment data</p>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Capabilities:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Camera className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Equipment Photography</h4>
                    <p className="text-sm text-gray-600">Capture equipment images with automatic identification</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Data Forms</h4>
                    <p className="text-sm text-gray-600">Structured forms for HVAC, lighting, and building data</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Search className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Equipment Library</h4>
                    <p className="text-sm text-gray-600">Reference database for equipment specifications</p>
                    <button 
                      onClick={() => navigate('/technology-explorer', { state: { tech: 'master-database' } })}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      → Browse Equipment Database
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ClipboardCheck className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Integration</h4>
                    <p className="text-sm text-gray-600">Seamlessly send data to calculators and report and document generator</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Integration Points:</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Energy Solutions Calculator</h4>
                    <p className="text-sm text-gray-600">Audit data automatically populates calculator inputs</p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View Calculator →
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Report and Document Generator</h4>
                    <p className="text-sm text-gray-600">Generate audit reports, M&V reports, and proposals from collected data</p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View Reports →
                  </button>
                </div>
              </div>
            </div>
          </div>

              <AuditList onNewAudit={() => setShowForm(true)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

