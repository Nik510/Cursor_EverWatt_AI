import React from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { Calculator as CalcIcon, ArrowLeft, Battery, Droplet, Lightbulb, LayoutGrid, Plus, Search } from 'lucide-react';
import { HVACCalculator } from './calculators/HVACCalculator';
import { LightingCalculator } from './calculators/LightingCalculator';
import { BatteryCalculator } from './calculators/BatteryCalculator';
import { BatteryFinancialsPage } from './calculators/BatteryFinancialsPage';
import { CalculatorStart } from './calculators/CalculatorStart';

export const Calculator: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeCalc, setActiveCalc] = React.useState<'start' | 'battery' | 'hvac' | 'lighting' | null>('start');

  const currentAnalysisId = React.useMemo(() => {
    try {
      return new URLSearchParams(location.search).get('analysisId');
    } catch {
      return null;
    }
  }, [location.search]);

  const withAnalysisId = React.useCallback(
    (route: string) => {
      if (!currentAnalysisId) return route;
      const join = route.includes('?') ? '&' : '?';
      return `${route}${join}analysisId=${encodeURIComponent(currentAnalysisId)}`;
    },
    [currentAnalysisId]
  );

  React.useEffect(() => {
    const path = location.pathname;
    if (path.includes('/calculator/hvac')) setActiveCalc('hvac');
    else if (path.includes('/calculator/lighting')) setActiveCalc('lighting');
    else if (path.includes('/calculator/battery')) setActiveCalc('battery');
    else setActiveCalc('start');
  }, [location.pathname]);

  const calculators = [
    {
      id: 'start',
      name: 'Start / Overview',
      description: 'Save customer info, then choose a measure',
      icon: <LayoutGrid className="w-6 h-6" />,
      color: 'slate',
      route: '/calculator/start',
    },
    {
      id: 'battery',
      name: 'Battery Storage',
      description: 'Size battery systems for peak shaving and demand charge reduction',
      icon: <Battery className="w-6 h-6" />,
      color: 'orange',
      route: '/calculator/battery',
    },
    {
      id: 'hvac',
      name: 'HVAC Optimization',
      description: 'Calculate savings from chiller, boiler, and VRF upgrades',
      icon: <Droplet className="w-6 h-6" />,
      color: 'blue',
      route: '/calculator/hvac',
    },
    {
      id: 'lighting',
      name: 'Lighting Retrofit',
      description: 'Analyze LED and controls savings potential',
      icon: <Lightbulb className="w-6 h-6" />,
      color: 'yellow',
      route: '/calculator/lighting',
    },
  ];

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
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <CalcIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <button
                  onClick={() => navigate(withAnalysisId('/calculator/start'))}
                  className="text-left"
                  title="Go to Start / Overview"
                >
                  <h1 className="text-xl font-bold text-gray-900 hover:underline">Energy Solutions Calculator</h1>
                </button>
                <p className="text-sm text-gray-500">Smart Analysis & Selection</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar - Calculator Selection */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Calculators</h3>
            <div className="space-y-2">
              {calculators.map((calc) => (
                <button
                  key={calc.id}
                  onClick={() => {
                    setActiveCalc(calc.id as any);
                    navigate(withAnalysisId(calc.route));
                  }}
                  className={`w-full text-left p-4 rounded-lg transition-colors ${
                    activeCalc === calc.id
                      ? 'bg-orange-50 border-2 border-orange-500'
                      : 'border-2 border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      calc.id === 'start' ? 'bg-slate-100 text-slate-700' :
                      calc.id === 'battery' ? 'bg-orange-100 text-orange-600' :
                      calc.id === 'hvac' ? 'bg-blue-100 text-blue-600' :
                      'bg-yellow-100 text-yellow-600'
                    }`}>
                      {calc.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm mb-1">{calc.name}</h4>
                      <p className="text-xs text-gray-600">{calc.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Quick Actions</h3>
              <button
                onClick={() => navigate('/calculator/start')}
                className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 flex items-center justify-center gap-2 mb-2"
              >
                <Plus className="w-4 h-4" />
                New Analysis
              </button>
              <button 
                onClick={() => navigate('/technology-explorer', { state: { tech: 'master-database' } })}
                className="w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium text-blue-700 flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                Equipment Database
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route index element={<Navigate to="start" replace />} />
            <Route path="start" element={<CalculatorStart />} />
            <Route path="battery" element={<BatteryCalculator />} />
            <Route path="battery/financials" element={<BatteryFinancialsPage />} />
            <Route path="hvac" element={<HVACCalculator />} />
            <Route path="lighting" element={<LightingCalculator />} />
            <Route path="*" element={<Navigate to="start" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

