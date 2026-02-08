import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Droplet, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';
import { SavingsTrendChart } from '../../../components/charts/SavingsTrendChart';
import { useToast } from '../../../contexts/ToastContext';
import { logger } from '../../../services/logger';
import { validateHVACSystem } from '../../../utils/validation';

interface HVACSystem {
  type: 'chiller' | 'boiler' | 'vrf';
  name: string;
  currentEfficiency: number;
  proposedEfficiency: number;
  capacity: number; // tons for chiller, MBH for boiler, tons for VRF
  operatingHours: number;
  energyCost: number; // $/kWh or $/therm
  currentAnnualCost: number;
}

interface CalculationResult {
  annualSavings: number;
  paybackYears: number;
  projectCost: number;
  npv10: number;
  co2Reduction: number; // tons/year
}

export const HVACCalculator: React.FC = () => {
  const [searchParams] = useSearchParams();
  const auditId = useMemo(() => searchParams.get('auditId') || undefined, [searchParams]);
  const analysisId = useMemo(() => searchParams.get('analysisId') || undefined, [searchParams]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedSystem, setSelectedSystem] = useState<'chiller' | 'boiler' | 'vrf'>('chiller');
  const [systems, setSystems] = useState<HVACSystem[]>([]);
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

  const systemTemplates = {
    chiller: {
      name: 'Water-Cooled Chiller',
      currentEfficiency: 0.75, // kW/ton
      proposedEfficiency: 0.40, // kW/ton
      capacity: 500, // tons
      operatingHours: 3000, // hours/year
      energyCost: 0.12, // $/kWh
    },
    boiler: {
      name: 'Gas Boiler',
      currentEfficiency: 0.82, // AFUE
      proposedEfficiency: 0.95, // AFUE
      capacity: 500, // MBH
      operatingHours: 2000, // hours/year
      energyCost: 1.20, // $/therm
    },
    vrf: {
      name: 'VRF Heat Pump System',
      currentEfficiency: 0.85, // AFUE (gas RTU)
      proposedEfficiency: 4.5, // COP
      capacity: 100, // tons
      operatingHours: 3000, // hours/year
      energyCost: 0.12, // $/kWh
    },
  };

  const calculateSavings = (system: HVACSystem): CalculationResult => {
    let annualSavings = 0;
    let projectCost = 0;
    let co2Reduction = 0;

    if (system.type === 'chiller') {
      // Chiller: Energy = Capacity (tons) × Efficiency (kW/ton) × Hours
      const currentEnergy = system.capacity * system.currentEfficiency * system.operatingHours; // kWh
      const proposedEnergy = system.capacity * system.proposedEfficiency * system.operatingHours; // kWh
      const energyReduction = currentEnergy - proposedEnergy;
      annualSavings = energyReduction * system.energyCost;
      
      // Estimate project cost: $500-800 per ton for chiller replacement
      projectCost = system.capacity * 600;
      
      // CO2: ~0.4 kg CO2 per kWh (grid average)
      co2Reduction = (energyReduction * 0.4) / 1000; // tons CO2
    } else if (system.type === 'boiler') {
      // Boiler: Energy = Capacity (MBH) × Hours / Efficiency
      // 1 MBH = 100,000 BTU/hr = 0.1 MMBTU/hr
      const currentEnergy = (system.capacity * system.operatingHours * 0.1) / system.currentEfficiency; // MMBTU
      const proposedEnergy = (system.capacity * system.operatingHours * 0.1) / system.proposedEfficiency; // MMBTU
      const energyReduction = currentEnergy - proposedEnergy; // MMBTU
      const thermReduction = energyReduction * 10; // 1 MMBTU = 10 therms
      annualSavings = thermReduction * system.energyCost;
      
      // Estimate project cost: $100-150 per MBH for boiler replacement
      projectCost = system.capacity * 125;
      
      // CO2: ~5.3 kg CO2 per therm of natural gas
      co2Reduction = (thermReduction * 5.3) / 1000; // tons CO2
    } else if (system.type === 'vrf') {
      // VRF: Converting from gas (AFUE) to electric (COP)
      // Gas energy: Capacity × Hours / AFUE
      // Electric energy: Capacity × Hours / (COP × 3.412) [converting COP to efficiency]
      const gasEnergy = (system.capacity * system.operatingHours * 0.1) / system.currentEfficiency; // MMBTU
      const electricEnergy = (system.capacity * system.operatingHours * 0.1) / (system.proposedEfficiency * 3.412); // MMBTU equivalent
      const energyReduction = gasEnergy - electricEnergy; // MMBTU
      const thermReduction = energyReduction * 10; // therms saved
      const gasSavings = thermReduction * system.energyCost; // gas cost savings
      const electricCost = (system.capacity * system.operatingHours * 0.293) / system.proposedEfficiency * system.energyCost; // kWh × $/kWh
      annualSavings = gasSavings - electricCost; // net savings
      
      // Estimate project cost: $3000-4000 per ton for VRF installation
      projectCost = system.capacity * 3500;
      
      // CO2: Gas emissions minus electric emissions (assuming cleaner grid)
      const gasCO2 = (thermReduction * 5.3) / 1000; // tons CO2 from gas
      const electricCO2 = (electricEnergy * 10 * 0.4) / 1000; // tons CO2 from electric (grid average)
      co2Reduction = gasCO2 - electricCO2; // net reduction
    }

    const paybackYears = projectCost / annualSavings;
    
    // Simple NPV calculation (10 years, 5% discount rate)
    const discountRate = 0.05;
    let npv10 = 0;
    for (let year = 1; year <= 10; year++) {
      npv10 += annualSavings / Math.pow(1 + discountRate, year);
    }
    npv10 -= projectCost;

    return {
      annualSavings,
      paybackYears,
      projectCost,
      npv10,
      co2Reduction,
    };
  };

  const handleAddSystem = () => {
    const template = systemTemplates[selectedSystem];
    const newSystem: HVACSystem = {
      type: selectedSystem,
      name: template.name,
      currentEfficiency: template.currentEfficiency,
      proposedEfficiency: template.proposedEfficiency,
      capacity: template.capacity,
      operatingHours: template.operatingHours,
      energyCost: template.energyCost,
      currentAnnualCost: 0, // Will calculate
    };
    setSystems([...systems, newSystem]);
  };

  const handleCalculate = async () => {
    if (systems.length === 0) {
      toast({ type: 'warning', message: 'Please add at least one system to analyze.' });
      return;
    }

    // Validate all systems
    const errors: Record<number, string[]> = {};
    systems.forEach((system, index) => {
      const validation = validateHVACSystem({
        type: system.type,
        capacity: system.capacity,
        currentEfficiency: system.currentEfficiency,
        proposedEfficiency: system.proposedEfficiency,
        operatingHours: system.operatingHours,
        energyCost: system.energyCost,
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
      const response = await fetch('/api/calculate/hvac', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ systems }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to calculate HVAC savings');
      }

      if (data.success && data.aggregate) {
        setResults({
          annualSavings: data.aggregate.annualSavings,
          paybackYears: data.aggregate.paybackYears,
          projectCost: data.aggregate.projectCost,
          npv10: data.aggregate.npv10,
          co2Reduction: data.aggregate.co2Reduction,
        });
        setShowResults(true);
        
        // Optionally save to backend
        try {
          await fetch('/api/calculations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'hvac',
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">HVAC Optimization Calculator</h1>
        <p className="text-gray-600">
          Calculate savings from chiller, boiler, and VRF system upgrades
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* System Type Selection */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add System</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {(['chiller', 'boiler', 'vrf'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedSystem(type)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedSystem === type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <Droplet className={`w-8 h-8 mx-auto mb-2 ${
                      selectedSystem === type ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <p className="font-medium text-sm text-gray-900">
                      {type === 'chiller' ? 'Chiller' : type === 'boiler' ? 'Boiler' : 'VRF'}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">{systemTemplates[selectedSystem].name}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Current Efficiency:</p>
                  <p className="font-semibold text-gray-900">
                    {systemTemplates[selectedSystem].currentEfficiency}
                    {selectedSystem === 'chiller' ? ' kW/ton' : selectedSystem === 'boiler' ? ' AFUE' : ' AFUE (gas)'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Proposed Efficiency:</p>
                  <p className="font-semibold text-gray-900">
                    {systemTemplates[selectedSystem].proposedEfficiency}
                    {selectedSystem === 'chiller' ? ' kW/ton' : selectedSystem === 'boiler' ? ' AFUE' : ' COP (VRF)'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Capacity:</p>
                  <p className="font-semibold text-gray-900">
                    {systemTemplates[selectedSystem].capacity}
                    {selectedSystem === 'chiller' || selectedSystem === 'vrf' ? ' tons' : ' MBH'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Operating Hours:</p>
                  <p className="font-semibold text-gray-900">
                    {systemTemplates[selectedSystem].operatingHours.toLocaleString()} hrs/year
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleAddSystem}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Droplet className="w-5 h-5" />
              Add {systemTemplates[selectedSystem].name}
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
                    <div key={index} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{system.name}</h3>
                        <p className="text-sm text-gray-600">
                          {system.capacity} {system.type === 'boiler' ? 'MBH' : 'tons'} • 
                          Est. Savings: ${result.annualSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}/year
                        </p>
                      </div>
                      <button
                        onClick={() => setSystems(systems.filter((_, i) => i !== index))}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
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
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-3 shadow-lg"
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
            <div className="bg-white rounded-xl border-2 border-blue-200 p-6 shadow-lg sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-blue-600" />
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
                  <p className="text-sm text-gray-600 mb-1">NPV (10 years, 5%)</p>
                  <p className={`text-2xl font-bold ${
                    results.npv10 > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${results.npv10.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
      <div className="mt-8 bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 How to Use</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p><strong>1. Select System Type:</strong> Choose Chiller, Boiler, or VRF Heat Pump</p>
          <p><strong>2. Add Systems:</strong> Click "Add System" for each piece of equipment you want to analyze</p>
          <p><strong>3. Calculate:</strong> Review your systems and click "Calculate Total Savings"</p>
          <p><strong>4. Review Results:</strong> See annual savings, payback period, NPV, and CO₂ reduction</p>
          <p className="mt-4 text-xs text-blue-700">
            <strong>Note:</strong> Default values are provided as starting points. Adjust based on your actual equipment specifications.
          </p>
        </div>
      </div>
    </div>
  );
};

