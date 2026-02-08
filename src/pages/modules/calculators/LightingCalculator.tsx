import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lightbulb, TrendingUp, ArrowRight, Settings, AlertCircle, Loader2 } from 'lucide-react';
import { SavingsTrendChart } from '../../../components/charts/SavingsTrendChart';
import { useToast } from '../../../contexts/ToastContext';
import { logger } from '../../../services/logger';
import { validateLightingSystem } from '../../../utils/validation';

interface LightingSystem {
  type: 'retrofit' | 'controls';
  name: string;
  currentWattage: number; // watts per fixture
  proposedWattage: number; // watts per fixture
  fixtureCount: number;
  operatingHours: number; // hours per year
  energyCost: number; // $/kWh
  controlsSavings?: number; // % savings from controls (0-100)
}

interface CalculationResult {
  annualSavings: number;
  paybackYears: number;
  projectCost: number;
  npv10: number;
  co2Reduction: number; // tons/year
  kwhReduction: number;
}

export const LightingCalculator: React.FC = () => {
  const [searchParams] = useSearchParams();
  const auditId = useMemo(() => searchParams.get('auditId') || undefined, [searchParams]);
  const analysisId = useMemo(() => searchParams.get('analysisId') || undefined, [searchParams]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<'retrofit' | 'controls'>('retrofit');
  const [systems, setSystems] = useState<LightingSystem[]>([]);
  const [results, setResults] = useState<CalculationResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({});
  const [projectSummary, setProjectSummary] = useState<{ companyName?: string; siteLocation?: string } | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);

  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;
    const run = async () => {
      setLoadingProject(true);
      try {
        const res = await fetch(`/api/analyses/${encodeURIComponent(analysisId)}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.analysis?.customerInfo) return;
        if (cancelled) return;
        const info = json.analysis.customerInfo as any;
        setProjectSummary({
          companyName: typeof info.companyName === 'string' ? info.companyName : undefined,
          siteLocation: typeof info.siteLocation === 'string' ? info.siteLocation : undefined,
        });
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingProject(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const handleAddRetrofit = () => {
    const newSystem: LightingSystem = {
      type: 'retrofit',
      name: 'LED Retrofit',
      currentWattage: 32, // T8 fluorescent
      proposedWattage: 18, // LED T8
      fixtureCount: 100,
      operatingHours: 4000, // 24/7 operation
      energyCost: 0.12, // $/kWh
    };
    setSystems([...systems, newSystem]);
  };

  const handleAddControls = () => {
    const newSystem: LightingSystem = {
      type: 'controls',
      name: 'Networked Controls',
      currentWattage: 18, // LED baseline
      proposedWattage: 18, // Same wattage
      fixtureCount: 100,
      operatingHours: 4000,
      energyCost: 0.12,
      controlsSavings: 30, // 30% savings from occupancy/dimming
    };
    setSystems([...systems, newSystem]);
  };

  const calculateSavings = (system: LightingSystem): CalculationResult => {
    let annualSavings = 0;
    let projectCost = 0;
    let kwhReduction = 0;

    if (system.type === 'retrofit') {
      // Retrofit: Energy reduction from lower wattage
      const currentEnergy = (system.currentWattage * system.fixtureCount * system.operatingHours) / 1000; // kWh
      const proposedEnergy = (system.proposedWattage * system.fixtureCount * system.operatingHours) / 1000; // kWh
      kwhReduction = currentEnergy - proposedEnergy;
      annualSavings = kwhReduction * system.energyCost;
      
      // Estimate project cost: $50-100 per fixture for LED retrofit
      projectCost = system.fixtureCount * 75;
    } else if (system.type === 'controls') {
      // Controls: Energy reduction from occupancy/dimming (same wattage, less runtime)
      const baselineEnergy = (system.currentWattage * system.fixtureCount * system.operatingHours) / 1000; // kWh
      const savingsPercent = system.controlsSavings || 30;
      kwhReduction = baselineEnergy * (savingsPercent / 100);
      annualSavings = kwhReduction * system.energyCost;
      
      // Estimate project cost: $100-200 per fixture for networked controls
      projectCost = system.fixtureCount * 150;
    }

    const paybackYears = projectCost / annualSavings;
    
    // Simple NPV calculation (10 years, 5% discount rate)
    const discountRate = 0.05;
    let npv10 = 0;
    for (let year = 1; year <= 10; year++) {
      npv10 += annualSavings / Math.pow(1 + discountRate, year);
    }
    npv10 -= projectCost;

    // CO2: ~0.4 kg CO2 per kWh (grid average)
    const co2Reduction = (kwhReduction * 0.4) / 1000; // tons CO2

    return {
      annualSavings,
      paybackYears,
      projectCost,
      npv10,
      co2Reduction,
      kwhReduction,
    };
  };

  const handleCalculate = async () => {
    if (systems.length === 0) {
      toast({ type: 'warning', message: 'Please add at least one lighting system to analyze.' });
      return;
    }

    // Validate all systems
    const errors: Record<number, string[]> = {};
    systems.forEach((system, index) => {
      const validation = validateLightingSystem({
        type: system.type,
        currentWattage: system.currentWattage,
        proposedWattage: system.proposedWattage,
        fixtureCount: system.fixtureCount,
        operatingHours: system.operatingHours,
        energyCost: system.energyCost,
        controlsSavings: system.controlsSavings,
      });
      if (!validation.isValid) {
        errors[index] = validation.errors;
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast({ type: 'error', title: 'Validation errors', message: 'Please fix validation errors before calculating.' });
      return;
    }

    setValidationErrors({});

    try {
      const response = await fetch('/api/calculate/lighting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ systems }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to calculate lighting savings');
      }

      if (data.success && data.aggregate) {
        setResults({
          annualSavings: data.aggregate.annualSavings,
          paybackYears: data.aggregate.paybackYears,
          projectCost: data.aggregate.projectCost,
          npv10: data.aggregate.npv10,
          co2Reduction: data.aggregate.co2Reduction,
          kwhReduction: data.aggregate.kwhReduction,
        });
        setShowResults(true);
        
        // Optionally save to backend
        try {
          await fetch('/api/calculations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'lighting',
              data,
              auditId,
            }),
          });
        } catch (err) {
          logger.warn('Failed to save calculation to backend:', err);
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      logger.error('Calculation error:', err);
      toast({ type: 'error', title: 'Calculation failed', message: err instanceof Error ? err.message : 'An error occurred while calculating savings' });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {analysisId && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500">Current analysis</p>
            <p className="text-sm font-semibold text-gray-900">
              {loadingProject ? (
                <span className="inline-flex items-center gap-2 text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading project…
                </span>
              ) : (
                <>
                  {projectSummary?.companyName || 'Untitled Project'}
                  {projectSummary?.siteLocation ? ` — ${projectSummary.siteLocation}` : ''}
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => navigate(`/calculator/start?analysisId=${encodeURIComponent(analysisId)}`)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
          >
            Edit customer info
          </button>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Lighting Retrofit Calculator</h1>
        <p className="text-gray-600">
          Calculate savings from LED retrofits and networked controls
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* System Type Selection */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Lighting System</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setSelectedType('retrofit')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  selectedType === 'retrofit'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <Lightbulb className={`w-10 h-10 mx-auto mb-3 ${
                    selectedType === 'retrofit' ? 'text-yellow-600' : 'text-gray-400'
                  }`} />
                  <p className="font-semibold text-gray-900 mb-1">LED Retrofit</p>
                  <p className="text-xs text-gray-600">Replace existing fixtures with LED</p>
                </div>
              </button>
              <button
                onClick={() => setSelectedType('controls')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  selectedType === 'controls'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <Settings className={`w-10 h-10 mx-auto mb-3 ${
                    selectedType === 'controls' ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <p className="font-semibold text-gray-900 mb-1">Networked Controls</p>
                  <p className="text-xs text-gray-600">Add occupancy sensors & dimming</p>
                </div>
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                {selectedType === 'retrofit' ? 'LED Retrofit' : 'Networked Controls'}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedType === 'retrofit' ? (
                  <>
                    <div>
                      <p className="text-gray-600">Current (T8 Fluorescent):</p>
                      <p className="font-semibold text-gray-900">32W per fixture</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Proposed (LED T8):</p>
                      <p className="font-semibold text-gray-900">18W per fixture</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Fixtures:</p>
                      <p className="font-semibold text-gray-900">100 fixtures</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Operating Hours:</p>
                      <p className="font-semibold text-gray-900">4,000 hrs/year</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-gray-600">Baseline (LED):</p>
                      <p className="font-semibold text-gray-900">18W per fixture</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Controls Savings:</p>
                      <p className="font-semibold text-gray-900">30% (occupancy/dimming)</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Fixtures:</p>
                      <p className="font-semibold text-gray-900">100 fixtures</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Operating Hours:</p>
                      <p className="font-semibold text-gray-900">4,000 hrs/year</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={selectedType === 'retrofit' ? handleAddRetrofit : handleAddControls}
              className="w-full py-3 px-4 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2"
            >
              <Lightbulb className="w-5 h-5" />
              Add {selectedType === 'retrofit' ? 'LED Retrofit' : 'Networked Controls'}
            </button>
          </div>

          {/* Systems List */}
          {systems.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Systems to Analyze ({systems.length})
              </h2>
              <div className="space-y-3">
                {systems.map((system, index) => {
                  const result = calculateSavings(system);
                  return (
                    <div key={index} className={`rounded-lg p-4 flex items-center justify-between ${
                      validationErrors[index] ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50'
                    }`}>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{system.name}</h3>
                        <p className="text-sm text-gray-600">
                          {system.fixtureCount} fixtures • 
                          Est. Savings: ${result.annualSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}/year
                        </p>
                        {validationErrors[index] && (
                          <div className="mt-2 flex items-start gap-1 text-sm text-red-600">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <ul className="list-disc list-inside">
                              {validationErrors[index].map((error, i) => (
                                <li key={i}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSystems(systems.filter((_, i) => i !== index));
                          const newErrors = { ...validationErrors };
                          delete newErrors[index];
                          setValidationErrors(newErrors);
                        }}
                        className="text-red-600 hover:text-red-700 text-sm font-medium ml-4"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Calculate Button */}
          {systems.length > 0 && (
            <button
              onClick={handleCalculate}
              className="w-full py-4 px-6 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-semibold text-lg hover:from-yellow-700 hover:to-orange-700 transition-all flex items-center justify-center gap-3 shadow-lg"
            >
              <TrendingUp className="w-6 h-6" />
              Calculate Total Savings
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-1">
          {showResults && results ? (
            <div className="bg-white rounded-xl border-2 border-yellow-200 p-6 shadow-lg sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
                Results
              </h2>
              
              <div className="space-y-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Annual Savings</p>
                  <p className="text-3xl font-bold text-green-600">
                    ${results.annualSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Project Cost</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${results.projectCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">Payback Period</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {results.paybackYears.toFixed(1)} years
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-gray-600 mb-1">Energy Reduction</p>
                  <p className="text-2xl font-bold text-slate-600">
                    {results.kwhReduction.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh/year
                  </p>
                </div>

                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <p className="text-sm text-gray-600 mb-1">CO₂ Reduction</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {results.co2Reduction.toFixed(1)} tons/year
                  </p>
                </div>
              </div>

              {/* Savings Trend Chart */}
              {results && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">10-Year Savings Projection</h3>
                  <SavingsTrendChart
                    data={Array.from({ length: 10 }, (_, i) => ({
                      year: i + 1,
                      annualSavings: results.annualSavings,
                      cumulativeSavings: results.annualSavings * (i + 1),
                    }))}
                    height={200}
                  />
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setSystems([]);
                    setResults(null);
                    setShowResults(false);
                  }}
                  className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Start New Analysis
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Results</h2>
              <p className="text-gray-500 text-sm">
                Add systems and click "Calculate Total Savings" to see results here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-yellow-50 rounded-xl border border-yellow-200 p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-3">💡 How to Use</h3>
        <div className="space-y-2 text-sm text-yellow-800">
          <p><strong>LED Retrofit:</strong> Calculate savings from replacing existing fixtures (T8, T12, CFL, etc.) with LED equivalents.</p>
          <p><strong>Networked Controls:</strong> Calculate additional savings from occupancy sensors, dimming, and scheduling on existing LED systems.</p>
          <p><strong>Combined Analysis:</strong> Add both retrofit and controls to see total savings potential.</p>
          <p className="mt-4 text-xs text-yellow-700">
            <strong>Tip:</strong> LED retrofits typically have 2-4 year payback. Controls add 20-40% additional savings with 3-5 year payback.
          </p>
        </div>
      </div>
    </div>
  );
};

