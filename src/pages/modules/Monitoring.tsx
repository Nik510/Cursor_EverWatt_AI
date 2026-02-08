import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft } from 'lucide-react';
import { MonitoringDashboard } from './monitoring/MonitoringDashboard';

export const Monitoring: React.FC = () => {
  const navigate = useNavigate();

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
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Live Monitoring</h1>
                <p className="text-sm text-gray-500">Real-Time Performance</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium">
            Live
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <MonitoringDashboard />
      </div>
    </div>
  );
};

