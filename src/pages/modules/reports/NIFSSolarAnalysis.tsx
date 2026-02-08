import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Upload, Calculator, Download, AlertCircle, CheckCircle, Plus, X, FileSpreadsheet } from 'lucide-react';
import { calculateNIFSEligibility, validateUsageData, calculateProjectTotal, type UsageDataPoint, type MeterData, type ProjectData, type NIFSResult } from '../../../modules/nifs';
import { useToast } from '../../../contexts/ToastContext';
import { downloadNIFSExcel } from '../../../utils/nifs-excel-export';
import Papa from 'papaparse';

type Step = 1 | 2 | 3;

export const NIFSSolarAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [projectData, setProjectData] = useState<ProjectData>({
    projectName: '',
    totalProjectSavings: 0,
    meters: [],
  });

  // Step 1: Project Initialization
  const handleProjectInit = () => {
    if (projectData.projectName && projectData.totalProjectSavings > 0) {
      setCurrentStep(2);
    } else {
      toast({ type: 'error', title: 'Validation Error', message: 'Please fill in both project name and total savings' });
    }
  };

  // Step 2: Add Meter
  const handleAddMeter = (meterId: string, hasSolar: boolean, allocatedSavings: number, usageData?: UsageDataPoint[]) => {
    if (!meterId) {
      toast({ type: 'error', title: 'Validation Error', message: 'Please enter a Service Account ID' });
      return;
    }

    if (hasSolar && (!usageData || usageData.length === 0)) {
      toast({ type: 'error', title: 'Validation Error', message: 'Please provide usage history for meters with solar' });
      return;
    }

    let result: NIFSResult | undefined;

    if (hasSolar && usageData) {
      const validation = validateUsageData(usageData);
      if (!validation.isValid) {
        toast({ type: 'error', title: 'Validation Error', message: validation.error || 'Invalid usage data' });
        return;
      }

      result = calculateNIFSEligibility(meterId, allocatedSavings, usageData);
    } else {
      // Non-solar meter gets full remaining savings
      result = {
        meterId,
        totalRequested: allocatedSavings,
        totalEligible: allocatedSavings,
        savingsLost: 0,
        breakdown: [],
        monthlyTarget: allocatedSavings / 12,
      };
    }

    const newMeter: MeterData = {
      id: meterId,
      hasSolar,
      allocatedSavings,
      usageData,
      result,
    };

    setProjectData(prev => ({
      ...prev,
      meters: [...prev.meters, newMeter],
    }));

    toast({ type: 'success', title: 'Success', message: `Meter ${meterId} added successfully` });
  };

  // Remove meter
  const handleRemoveMeter = (index: number) => {
    setProjectData(prev => ({
      ...prev,
      meters: prev.meters.filter((_, i) => i !== index),
    }));
  };

  // Calculate remaining savings
  const allocatedSavings = projectData.meters.reduce((sum, m) => sum + m.allocatedSavings, 0);
  const remainingSavings = projectData.totalProjectSavings - allocatedSavings;

  // Project totals
  const projectTotal = projectData.meters.length > 0
    ? calculateProjectTotal(projectData.meters.map(m => m.result!).filter(Boolean))
    : null;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/reports')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Sun className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">NIFS Solar Analysis</h1>
                <p className="text-sm text-gray-500">OBF Qualification Analysis for Solar Projects</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-4">
          {[1, 2, 3].map((step) => (
            <button
              key={step}
              onClick={() => setCurrentStep(step as Step)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentStep === step
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Step {step}: {step === 1 ? 'Project Init' : step === 2 ? 'Meter Analysis' : 'Export'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          {currentStep === 1 && <Step1ProjectInit projectData={projectData} setProjectData={setProjectData} onNext={handleProjectInit} />}
          {currentStep === 2 && (
            <Step2MeterAnalysis
              projectData={projectData}
              remainingSavings={remainingSavings}
              onAddMeter={handleAddMeter}
              onRemoveMeter={handleRemoveMeter}
              onNext={() => setCurrentStep(3)}
              onBack={() => setCurrentStep(1)}
            />
          )}
          {currentStep === 3 && (
            <Step3Export
              projectData={projectData}
              projectTotal={projectTotal}
              onBack={() => setCurrentStep(2)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Step 1: Project Initialization
const Step1ProjectInit: React.FC<{
  projectData: ProjectData;
  setProjectData: React.Dispatch<React.SetStateAction<ProjectData>>;
  onNext: () => void;
}> = ({ projectData, setProjectData, onNext }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Project Initialization</h2>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
          <input
            type="text"
            value={projectData.projectName}
            onChange={(e) => setProjectData(prev => ({ ...prev, projectName: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter project name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Total Estimated Project Savings (kWh)</label>
          <input
            type="number"
            value={projectData.totalProjectSavings || ''}
            onChange={(e) => setProjectData(prev => ({ ...prev, totalProjectSavings: parseFloat(e.target.value) || 0 }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 48088"
            min="0"
            step="100"
          />
        </div>
        <button
          onClick={onNext}
          disabled={!projectData.projectName || projectData.totalProjectSavings <= 0}
          className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Next: Meter Analysis →
        </button>
      </div>
    </div>
  );
};

// Step 2: Meter Analysis
const Step2MeterAnalysis: React.FC<{
  projectData: ProjectData;
  remainingSavings: number;
  onAddMeter: (meterId: string, hasSolar: boolean, allocatedSavings: number, usageData?: UsageDataPoint[]) => void;
  onRemoveMeter: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ projectData, remainingSavings, onAddMeter, onRemoveMeter, onNext, onBack }) => {
  const [newMeterId, setNewMeterId] = useState('');
  const [hasSolar, setHasSolar] = useState(false);
  const [allocatedSavings, setAllocatedSavings] = useState(0);
  const [usageData, setUsageData] = useState<UsageDataPoint[]>([]);
  const [showAddMeter, setShowAddMeter] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const text = await file.text();
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as any[];
          
          // Try to find date and usage columns
          const dateCol = Object.keys(data[0] || {}).find(col => 
            col.toLowerCase().includes('date') && (col.toLowerCase().includes('end') || col.toLowerCase().includes('bill'))
          );
          const usageCol = Object.keys(data[0] || {}).find(col => 
            col.toLowerCase().includes('usage') && col.toLowerCase().includes('total')
          ) || Object.keys(data[0] || {}).find(col => col.toLowerCase().includes('kwh'));

          if (!dateCol || !usageCol) {
            toast({ type: 'error', title: 'Error', message: 'Could not find date and usage columns in CSV' });
            return;
          }

          const parsed: UsageDataPoint[] = [];
          for (const row of data) {
            if (!row[dateCol] || !row[usageCol]) continue;
            const date = new Date(row[dateCol]);
            const kwh = parseFloat(String(row[usageCol]).replace(/,/g, ''));
            if (!isNaN(date.getTime()) && !isNaN(kwh)) {
              parsed.push({
                date: date.toISOString().split('T')[0],
                kwh,
              });
            }
          }

          if (parsed.length >= 12) {
            setUsageData(parsed.slice(-12).sort((a, b) => a.date.localeCompare(b.date)));
            toast({ type: 'success', title: 'Success', message: `Extracted ${parsed.length} months of usage data` });
          } else {
            toast({ type: 'error', title: 'Error', message: `Only found ${parsed.length} months, need 12` });
          }
        },
      });
    } else {
      toast({ type: 'error', title: 'Error', message: 'PDF parsing not yet implemented. Please use CSV format.' });
    }
  };

  const handleAdd = () => {
    const savings = hasSolar ? allocatedSavings : Math.max(remainingSavings, projectData.totalProjectSavings);
    onAddMeter(newMeterId, hasSolar, savings, hasSolar ? usageData : undefined);
    setNewMeterId('');
    setHasSolar(false);
    setAllocatedSavings(0);
    setUsageData([]);
    setShowAddMeter(false);
  };

  const totalAllocated = projectData.meters.reduce((sum, m) => sum + m.allocatedSavings, 0);
  const canProceed = projectData.meters.length > 0 && Math.abs(totalAllocated - projectData.totalProjectSavings) < 0.01;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">Total Project Savings:</span>
          <span className="font-semibold">{projectData.totalProjectSavings.toLocaleString()} kWh</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-gray-700">Allocated:</span>
          <span className="font-semibold">{totalAllocated.toLocaleString()} kWh</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-gray-700">Remaining:</span>
          <span className="font-semibold">{remainingSavings.toLocaleString()} kWh</span>
        </div>
      </div>

      {/* Add Meter Form */}
      {showAddMeter ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Meter</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Account ID (SAID)</label>
              <input
                type="text"
                value={newMeterId}
                onChange={(e) => setNewMeterId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter SAID"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="hasSolar"
                checked={hasSolar}
                onChange={(e) => {
                  setHasSolar(e.target.checked);
                  if (!e.target.checked) {
                    setUsageData([]);
                  }
                }}
                className="w-5 h-5"
              />
              <label htmlFor="hasSolar" className="text-sm font-medium text-gray-700">Has Solar on this meter?</label>
            </div>
            {hasSolar && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Allocated Savings (kWh)</label>
                  <input
                    type="number"
                    value={allocatedSavings || ''}
                    onChange={(e) => setAllocatedSavings(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max={remainingSavings > 0 ? remainingSavings : projectData.totalProjectSavings}
                    step="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload Usage Report (CSV)</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                {usageData.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Extracted Usage Data ({usageData.length} months)</p>
                    <div className="max-h-48 overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Date</th>
                            <th className="text-right p-2">Usage (kWh)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usageData.map((row, i) => (
                            <tr key={i} className="border-b">
                              <td className="p-2">{row.date}</td>
                              <td className="p-2 text-right">{row.kwh.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Add Meter
              </button>
              <button
                onClick={() => {
                  setShowAddMeter(false);
                  setNewMeterId('');
                  setHasSolar(false);
                  setAllocatedSavings(0);
                  setUsageData([]);
                }}
                className="py-2 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddMeter(true)}
          className="w-full py-3 px-6 bg-white border-2 border-dashed border-gray-300 rounded-lg text-gray-700 font-medium hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add New Meter
        </button>
      )}

      {/* Existing Meters */}
      {projectData.meters.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Current Meters</h3>
          {projectData.meters.map((meter, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900">Meter {index + 1}: {meter.id}</h4>
                  <p className="text-sm text-gray-600">{meter.hasSolar ? '☀️ Has Solar' : '⚡ No Solar'}</p>
                </div>
                <button
                  onClick={() => onRemoveMeter(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {meter.result && (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Requested:</span>
                    <p className="font-semibold">{meter.result.totalRequested.toLocaleString()} kWh</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Eligible:</span>
                    <p className="font-semibold text-green-600">{meter.result.totalEligible.toLocaleString()} kWh</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Lost:</span>
                    <p className="font-semibold text-red-600">{meter.result.savingsLost.toLocaleString()} kWh</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="py-2 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Next: Review & Export →
        </button>
      </div>
    </div>
  );
};

// Step 3: Export
const Step3Export: React.FC<{
  projectData: ProjectData;
  projectTotal: ReturnType<typeof calculateProjectTotal> | null;
  onBack: () => void;
}> = ({ projectData, projectTotal, onBack }) => {
  const { toast } = useToast();

  const handleExport = () => {
    try {
      downloadNIFSExcel(projectData);
      toast({ type: 'success', title: 'Success', message: 'Excel file generated and downloaded' });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({ type: 'error', title: 'Export Failed', message: 'Failed to generate Excel file. Please try again.' });
    }
  };

  if (!projectTotal) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-600">No project data available</p>
        <button onClick={onBack} className="mt-4 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg">← Back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Export</h2>
        
        {/* Summary Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Total Requested</p>
            <p className="text-2xl font-bold">{projectTotal.totalRequested.toLocaleString()} kWh</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Total Eligible</p>
            <p className="text-2xl font-bold text-green-600">{projectTotal.totalEligible.toLocaleString()} kWh</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Savings Lost</p>
            <p className="text-2xl font-bold text-red-600">{projectTotal.totalSavingsLost.toLocaleString()} kWh</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Efficiency</p>
            <p className="text-2xl font-bold text-purple-600">
              {projectTotal.totalRequested > 0
                ? ((projectTotal.totalEligible / projectTotal.totalRequested) * 100).toFixed(1)
                : 0}%
            </p>
          </div>
        </div>

        {/* Meter Breakdown */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Meter Breakdown</h3>
          {projectData.meters.map((meter, index) => (
            meter.result && (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">{meter.id}</h4>
                {meter.result.breakdown.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Bill Date</th>
                          <th className="text-right p-2">Grid Usage</th>
                          <th className="text-right p-2">Target Savings</th>
                          <th className="text-right p-2">Eligible Savings</th>
                          <th className="text-left p-2">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {meter.result.breakdown.map((row, i) => (
                          <tr key={i} className="border-b">
                            <td className="p-2">{row.billDate}</td>
                            <td className="p-2 text-right">{row.gridUsage.toLocaleString()}</td>
                            <td className="p-2 text-right">{row.targetSavings.toLocaleString()}</td>
                            <td className="p-2 text-right">{row.eligibleSavings.toLocaleString()}</td>
                            <td className="p-2 text-xs text-gray-600">{row.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          ))}
        </div>

        <div className="flex gap-3 mt-8 pt-6 border-t">
          <button
            onClick={onBack}
            className="py-2 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
          >
            ← Back
          </button>
          <button
            onClick={handleExport}
            className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Generate Excel Report
          </button>
        </div>
      </div>
    </div>
  );
};
