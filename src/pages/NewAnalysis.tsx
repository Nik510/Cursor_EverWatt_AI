import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUpload } from '../components/FileUpload';
import { AiChat } from '../components/ai/AiChat';
import { BatteryRecommendationCard, type BatteryRecommendation } from '../components/BatteryRecommendationCard';
import { CustomerInformationForm, type CustomerInformation, validateCustomerInformation } from '../components/CustomerInformationForm';
import {
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  Loader2,
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis as RXAxis,
  YAxis as RYAxis,
  Tooltip as RTooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { CatalogBatteryRow } from '../shared/types/batteryCatalog';
import { getBatteriesCatalog } from '../shared/api/batteries';

// Tabs for data upload section
 type DataTab = 'interval' | 'usage' | 'battery' | 'srate';

// Analysis steps
 type AnalysisStep = 'customer' | 'upload' | 'processing' | 'results';

export const NewAnalysis: React.FC = () => {
  const [step, setStep] = useState<AnalysisStep>('customer');
  const [activeTab, setActiveTab] = useState<DataTab>('interval');
  const navigate = useNavigate();

  // Customer info
  const [customerInfo, setCustomerInfo] = useState<CustomerInformation>({
    companyName: '',
    facilityName: '',
    siteLocation: '',
    facilityType: '',
    climateZone: '',
    rateSchedule: '',
    serviceAgreementId: '',
    industry: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    primaryContactName: '',
    primaryContactTitle: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
    utilityCompany: '',
    accountNumber: '',
    projectName: '',
    analysisDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [customerInfoErrors, setCustomerInfoErrors] = useState<Record<string, string>>({});

  // Files
  const [intervalFile, setIntervalFile] = useState<File | null>(null);
  const [monthlyBillFile, setMonthlyBillFile] = useState<File | null>(null);
  const [usageStats, setUsageStats] = useState<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    percentageAbsorbed: number;
  } | null>(null);
  const [usageIdentifiers, setUsageIdentifiers] = useState<{
    saId?: string;
    accountNumber?: string;
    meterNumber?: string;
    rateCode?: string;
    serviceProvider?: string;
    billingName?: string;
    siteAddress?: string;
  } | null>(null);
  const [usageDemandRate, setUsageDemandRate] = useState<number | null>(null);
  const [intervalData, setIntervalData] = useState<Array<{ timestamp: string; kw: number; temperature?: number }>>([]);
  const [regression, setRegression] = useState<{ slope: number; intercept: number; r2: number; count: number } | null>(null);
  const [processingInterval, setProcessingInterval] = useState(false);
  const [processingUsage, setProcessingUsage] = useState(false);

  // Analysis state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  // Battery selection
  const [batteries, setBatteries] = useState<CatalogBatteryRow[]>([]);
  const [loadingBatteries, setLoadingBatteries] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedBattery, setSelectedBattery] = useState<CatalogBatteryRow | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  // Results
  const [recommendations, setRecommendations] = useState<BatteryRecommendation[]>([]);
  const [summary, setSummary] = useState<{
    demandRate?: number;
    batteriesAnalyzed?: number;
    originalPeakKw?: number;
    bestPeakReductionKw?: number;
    bestAnnualSavings?: number;
  } | null>(null);

  // Load catalog on mount
  useEffect(() => {
    loadBatteryCatalogList();
  }, []);

  const loadBatteryCatalogList = async () => {
    setLoadingBatteries(true);
    setCatalogError(null);
    try {
      const data = await getBatteriesCatalog();
      if (data.success && data.batteries && data.batteries.length > 0) setBatteries(data.batteries);
      else {
        setCatalogError('Battery catalog is empty. Please load a real catalog.');
        setBatteries([]);
      }
    } catch (err) {
      console.warn('Battery catalog load failed', err);
      setCatalogError('Could not load battery catalog.');
      setBatteries([]);
    } finally {
      setLoadingBatteries(false);
    }
  };

  const handleProcessUsage = async () => {
    if (!monthlyBillFile) {
      setError('Please upload a usage data file first.');
      return;
    }
    setProcessingUsage(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('usageFile', monthlyBillFile);

      let response: Response;
      try {
        response = await fetch('/api/process-usage', {
          method: 'POST',
          body: formData,
        });
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
        if (
          fetchError instanceof TypeError ||
          message.includes('Failed to fetch') ||
          message.toLowerCase().includes('network')
        ) {
          throw new Error(
            'Cannot connect to server. Please ensure the backend server is running on port 3001. Start it with: npm run dev:server or npm run server'
          );
        }
        throw fetchError;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to process usage file');
      }

      if (data?.success) {
        setUsageStats(data.statistics ?? null);
        setUsageDemandRate(typeof data.demandRate === 'number' ? data.demandRate : null);
        setUsageIdentifiers(data.identifiers ?? null);
      }
    } catch (err) {
      console.error('Usage processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process usage file');
    } finally {
      setProcessingUsage(false);
    }
  };

  // Persist customer info before uploads
  const handleCustomerInfoNext = async () => {
    const errors = validateCustomerInformation(customerInfo);
    if (Object.keys(errors).length > 0) {
      setCustomerInfoErrors(errors);
      return;
    }
    setCustomerInfoErrors({});

    setIsSaving(true);
    try {
      if (analysisId) {
        const update = await fetch(`/api/analyses/${analysisId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerInfo, status: 'draft' }),
        });
        if (!update.ok) throw new Error('Failed to save customer info');
      } else {
        const create = await fetch('/api/analyses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerInfo, status: 'draft' }),
        });
        if (!create.ok) throw new Error('Failed to create analysis');
        const created = await create.json();
        setAnalysisId(created.analysis.id);
      }
      setStep('upload');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer information');
    } finally {
      setIsSaving(false);
    }
  };

  // Run analysis (server side) using uploaded files
  const handleAnalyze = async () => {
    if (!intervalFile || !monthlyBillFile) {
      setError('Please upload both interval data and monthly bills.');
      return;
    }

    setIsProcessing(true);
    setStep('processing');
    setError(null);

    try {
      // Ensure analysis record exists
      let currentId = analysisId;
      if (!currentId) {
        const create = await fetch('/api/analyses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerInfo, status: 'processing' }),
        });
        if (!create.ok) throw new Error('Failed to create analysis');
        const created = await create.json();
        currentId = created.analysis.id;
        setAnalysisId(currentId);
      }

      const formData = new FormData();
      formData.append('intervalFile', intervalFile);
      formData.append('monthlyBillFile', monthlyBillFile);
      if (currentId) formData.append('analysisId', currentId);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || 'Failed to analyze');

      if (data.success && data.recommendations) {
        const mapped: BatteryRecommendation[] = data.recommendations.map((rec: any) => ({
          modelName: rec.modelName,
          manufacturer: rec.manufacturer,
          capacityKwh: rec.capacityKwh,
          maxPowerKw: rec.maxPowerKw,
          peakReductionKw: rec.peakReductionKw,
          annualSavings: rec.annualSavings,
          systemCost: rec.systemCost,
          paybackYears: rec.paybackYears,
          roundTripEfficiency: rec.roundTripEfficiency,
          warranty: rec.warranty,
        }));

        setRecommendations(mapped);
        const summaryData = {
          demandRate: data.demandRate,
          batteriesAnalyzed: data.summary?.batteriesAnalyzed,
          originalPeakKw: data.summary?.originalPeakKw,
          bestPeakReductionKw: mapped.length > 0 ? Math.max(...mapped.map((r) => r.peakReductionKw)) : 0,
          bestAnnualSavings: mapped.length > 0 ? Math.max(...mapped.map((r) => r.annualSavings)) : 0,
        };
        setSummary(summaryData);

        if (currentId) {
          await fetch(`/api/analyses/${currentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerInfo,
              status: 'completed',
              recommendations: mapped,
              summary: summaryData,
              intervalFile: { name: intervalFile.name, size: intervalFile.size, uploadedAt: new Date().toISOString() },
              monthlyBillFile: { name: monthlyBillFile.name, size: monthlyBillFile.size, uploadedAt: new Date().toISOString() },
            }),
          });
        }
        setStep('results');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while analyzing your files');
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process interval data for regression preview
  const handleProcessInterval = async () => {
    if (!intervalFile) {
      setError('Please upload an interval data file first.');
      return;
    }
    setProcessingInterval(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('intervalFile', intervalFile);
      const response = await fetch('/api/process-interval', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to process interval file');
      }
      const data = await response.json();
      if (data.intervals) {
        const parsed = data.intervals.map((item: any) => ({
          timestamp: item.timestamp,
          kw: item.kw || item.demand,
          temperature: item.temperature_f ?? item.temperature ?? undefined,
        }));
        setIntervalData(parsed);
        computeRegression(parsed);
      }
    } catch (err) {
      console.error('Interval processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process interval file');
    } finally {
      setProcessingInterval(false);
    }
  };

  const computeRegression = (points: Array<{ kw: number; temperature?: number }>) => {
    const rows = points.filter((p) => typeof p.kw === 'number' && typeof p.temperature === 'number');
    if (rows.length < 3) {
      setRegression(null);
      return;
    }
    const n = rows.length;
    const sumX = rows.reduce((s, r) => s + (r.temperature as number), 0);
    const sumY = rows.reduce((s, r) => s + r.kw, 0);
    const sumXY = rows.reduce((s, r) => s + (r.temperature as number) * r.kw, 0);
    const sumX2 = rows.reduce((s, r) => s + (r.temperature as number) ** 2, 0);
    const sumY2 = rows.reduce((s, r) => s + r.kw ** 2, 0);

    const denominator = n * sumX2 - sumX ** 2;
    if (denominator === 0) {
      setRegression(null);
      return;
    }
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    const r2Numerator = (n * sumXY - sumX * sumY) ** 2;
    const r2Denominator = (n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2);
    const r2 = r2Denominator === 0 ? 0 : r2Numerator / r2Denominator;
    setRegression({ slope, intercept, r2, count: n });
  };

  // Derived UI helpers
  const batteryCards = (loadingBatteries ? [] : batteries).map((b) => ({
    key: `${b.manufacturer}-${b.modelName}`,
    title: b.modelName,
    subtitle: b.manufacturer,
    capacity: b.capacityKwh,
    power: b.powerKw,
    efficiency: b.efficiency,
    warranty: b.warrantyYears,
    price: b.price1_10,
    data: b,
  }));

  const temperatureValues = useMemo(
    () => intervalData.filter((d) => typeof d.temperature === 'number').map((d) => d.temperature as number),
    [intervalData]
  );
  const tempMin = temperatureValues.length ? Math.min(...temperatureValues) : 0;
  const tempMax = temperatureValues.length ? Math.max(...temperatureValues) : 0;

  const canAnalyze = !!intervalFile && !!monthlyBillFile && !isProcessing;
  const hasRegressionData = regression && regression.count > 3;
  const aiAnalysisContext = useMemo(() => {
    const parts: string[] = [];
    parts.push('Page: NewAnalysis (Phase 1 data entry)');
    parts.push(`Current step: ${step}`);
    parts.push(`Active tab: ${activeTab}`);
    parts.push(`Interval file uploaded: ${intervalFile ? 'yes' : 'no'}`);
    parts.push(`Usage file uploaded: ${monthlyBillFile ? 'yes' : 'no'}`);
    parts.push(`Regression computed: ${hasRegressionData ? 'yes' : 'no'}`);
    if (customerInfo?.serviceAgreementId) parts.push(`Electric SAID: ${customerInfo.serviceAgreementId}`);
    if (customerInfo?.utilityCompany) parts.push(`Utility: ${customerInfo.utilityCompany}`);
    if (customerInfo?.companyName) parts.push(`Customer: ${customerInfo.companyName}`);
    if (usageStats?.percentageAbsorbed != null) parts.push(`Usage absorbed: ${usageStats.percentageAbsorbed.toFixed(1)}%`);
    return parts.join('\n');
  }, [
    activeTab,
    customerInfo?.companyName,
    customerInfo?.serviceAgreementId,
    customerInfo?.utilityCompany,
    hasRegressionData,
    intervalFile,
    monthlyBillFile,
    step,
    usageStats?.percentageAbsorbed,
  ]);

  return (
    <div className="p-6 lg:p-10 bg-gray-50 min-h-screen space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 text-gray-700">
        <button className="p-2 rounded-lg hover:bg-gray-200" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">New Battery Storage Analysis</h1>
          <p className="text-sm text-gray-600">Phase 1: Data Entry - Upload data and configure project</p>
        </div>
      </div>

      {/* 3-phase banner */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-[220px]">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 text-sm font-semibold">1</div>
          <div>
            <p className="text-sm font-semibold text-blue-900">Phase 1: Data Entry</p>
            <p className="text-xs text-blue-700">Upload files, configure project settings</p>
          </div>
        </div>
        <div className="flex items-start gap-3 flex-1 min-w-[220px]">
          <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 text-sm font-semibold">2</div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Phase 2: Initial Analysis</p>
            <p className="text-xs text-gray-600">AI analyzes data, calculates savings</p>
          </div>
        </div>
        <div className="flex items-start gap-3 flex-1 min-w-[220px]">
          <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 text-sm font-semibold">3</div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Phase 3: Cost Markup</p>
            <p className="text-xs text-gray-600">Add costs, markup - see live ROI</p>
          </div>
        </div>
      </div>

      {/* Client Information */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Client Information</h2>
        <CustomerInformationForm
          data={customerInfo}
          onChange={setCustomerInfo}
          errors={customerInfoErrors}
        />
        <div className="flex justify-between items-center pt-2">
          <div className="text-sm text-gray-600">This information is saved before analysis.</div>
          <button
            onClick={handleCustomerInfoNext}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 flex items-center gap-2"
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />} Continue to File Upload
          </button>
        </div>
      </div>

      {/* Financing Structure */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-3">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900"><DollarSign className="w-5 h-5 text-emerald-600" /> Financing Structure</div>
        <p className="text-sm text-gray-600">Select financing approach before analysis</p>
        <div className="border rounded-lg p-4 bg-gray-50 border-gray-200">
          <p className="text-sm font-medium text-gray-800">Standard Financing Analysis</p>
          <p className="text-xs text-gray-600 mt-1">Analysis will calculate ROI based on actual battery savings including demand charge reduction, energy arbitrage, and potential S-Rate benefits.</p>
        </div>
      </div>

      {/* Data Upload & Battery Selection */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
        <div className="flex flex-wrap gap-3 text-sm font-semibold text-gray-700">
          {(['interval','usage','battery','srate'] as DataTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === tab ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
            >
              {tab === 'interval' && 'Interval Data'}
              {tab === 'usage' && 'Usage Data'}
              {tab === 'battery' && 'Battery Selection'}
              {tab === 'srate' && 'S-Rate Analysis'}
            </button>
          ))}
        </div>

        {activeTab === 'interval' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              15-minute interval data shows peak demand patterns. Required columns: timestamp, demand_kw. Optional: energy_kwh, temperature_f, Electric SAID. Formats: CSV, XLS, XLSX.
            </div>
            <FileUpload
              label="Upload Interval Data"
              description="15-minute or hourly interval readings"
              acceptedFormats=".csv,.xlsx,.xls"
              onFileSelect={setIntervalFile}
              file={intervalFile || undefined}
            />
            <div className="flex justify-end">
              <button
                onClick={handleProcessInterval}
                disabled={!intervalFile || processingInterval}
                className={`px-5 py-2 rounded-lg font-semibold ${(!intervalFile || processingInterval) ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {processingInterval && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />}
                Process Interval & Run Regression
              </button>
            </div>

            {hasRegressionData && (
              <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Weather Correlation</p>
                    <p className="text-xs text-gray-500">Power vs temperature (linear regression)</p>
                  </div>
                  <div className="text-xs text-gray-600">
                    R²: {regression?.r2.toFixed(3)} | Slope: {regression?.slope.toFixed(3)} kW/°F | n={regression?.count}
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid stroke="#e5e7eb" />
                      <RXAxis dataKey="temperature" name="Temp (°F)" unit="°F" tick={{ fontSize: 12 }} />
                      <RYAxis dataKey="kw" name="Demand" unit=" kW" tick={{ fontSize: 12 }} />
                      <RTooltip formatter={(value: number, name: string) => [`${value.toFixed(2)}`, name]} />
                      <Scatter data={intervalData.filter(d => typeof d.temperature === 'number')} fill="#2563eb" />
                      {regression && temperatureValues.length > 0 && (
                        <ReferenceLine
                          ifOverflow="extendDomain"
                          stroke="#10b981"
                          strokeDasharray="4 4"
                          y={undefined}
                          segment={[
                            { x: tempMin, y: regression.intercept + regression.slope * tempMin },
                            { x: tempMax, y: regression.intercept + regression.slope * tempMax },
                          ]}
                        />
                      )}
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {!processingInterval && intervalData.length > 0 && !hasRegressionData && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
                No temperature data found in interval file; regression not computed. Include a temperature column to view correlation.
              </div>
            )}
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-900">
              Monthly usage validates energy patterns and demand charge percentages. Suggested columns: bill_end_date, total_usage_kwh, total_bill_amount, Electric SAID. Formats: CSV, XLS, XLSX, PDF.
            </div>
            <FileUpload
              label="Upload Usage Data"
              description="Monthly kWh consumption and demand charges"
              acceptedFormats=".csv,.xlsx,.xls,.pdf"
              onFileSelect={(file) => {
                setError(null);
                setUsageStats(null);
                setUsageDemandRate(null);
                setUsageIdentifiers(null);
                setMonthlyBillFile(file);
              }}
              file={monthlyBillFile || undefined}
            />
            <div className="flex justify-end">
              <button
                onClick={handleProcessUsage}
                disabled={!monthlyBillFile || processingUsage}
                className={`px-5 py-2 rounded-lg font-semibold ${
                  (!monthlyBillFile || processingUsage) ? 'bg-gray-200 text-gray-500' : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {processingUsage && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />}
                Validate Usage & Confirm Rows
              </button>
            </div>
            {usageStats && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-800">Usage Data Processed</p>
                    <p className="text-xs text-green-700">Rows read and absorption check</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-green-600">Total Rows</p>
                    <p className="font-semibold text-green-900">{usageStats.totalRows.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">Valid Rows</p>
                    <p className="font-semibold text-green-900">{usageStats.validRows.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">Invalid Rows</p>
                    <p className="font-semibold text-green-900">{usageStats.invalidRows.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">Absorbed</p>
                    <p className="font-semibold text-green-900">{usageStats.percentageAbsorbed.toFixed(1)}%</p>
                  </div>
                </div>
                {(usageDemandRate !== null || usageIdentifiers) && (
                  <div className="border-t border-green-200 pt-3 space-y-2">
                    {usageDemandRate !== null && (
                      <p className="text-xs text-green-700">
                        Demand rate detected: ${usageDemandRate.toFixed(2)}/kW-month
                      </p>
                    )}
                    {usageIdentifiers && Object.values(usageIdentifiers).some(Boolean) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-green-700">
                        {usageIdentifiers.saId && <p><span className="font-semibold">SAID:</span> {usageIdentifiers.saId}</p>}
                        {usageIdentifiers.accountNumber && <p><span className="font-semibold">Account #:</span> {usageIdentifiers.accountNumber}</p>}
                        {usageIdentifiers.meterNumber && <p><span className="font-semibold">Meter #:</span> {usageIdentifiers.meterNumber}</p>}
                        {usageIdentifiers.rateCode && <p><span className="font-semibold">Rate Code:</span> {usageIdentifiers.rateCode}</p>}
                        {usageIdentifiers.serviceProvider && <p><span className="font-semibold">Utility:</span> {usageIdentifiers.serviceProvider}</p>}
                        {usageIdentifiers.billingName && <p><span className="font-semibold">Billing Name:</span> {usageIdentifiers.billingName}</p>}
                        {usageIdentifiers.siteAddress && <p><span className="font-semibold">Site:</span> {usageIdentifiers.siteAddress}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'battery' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI recommended battery models based on your data.</p>
                <p className="text-xs text-gray-500">Select a model or adjust quantity.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Quantity</span>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-20 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {loadingBatteries && <div className="text-sm text-gray-600 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading battery catalog...</div>}
            {catalogError && <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">{catalogError}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {batteryCards.map((card) => (
                <button
                  key={card.key}
                  onClick={() => setSelectedBattery(card.data)}
                  className={`text-left border rounded-xl p-4 shadow-sm transition-all ${selectedBattery?.modelName === card.data.modelName ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:shadow-md'}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{card.title}</p>
                      <p className="text-xs text-gray-500">{card.subtitle}</p>
                    </div>
                    {selectedBattery?.modelName === card.data.modelName && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 mt-3">
                    <div><span className="text-gray-500 text-xs">Capacity</span><p className="font-semibold">{card.capacity} kWh</p></div>
                    <div><span className="text-gray-500 text-xs">Power</span><p className="font-semibold">{card.power} kW</p></div>
                    <div><span className="text-gray-500 text-xs">Efficiency</span><p className="font-semibold">{Math.round(card.efficiency * 100)}%</p></div>
                    <div><span className="text-gray-500 text-xs">Warranty</span><p className="font-semibold">{card.warranty} years</p></div>
                  </div>
                  <div className="mt-3 text-right text-lg font-semibold text-gray-900">${card.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </button>
              ))}
            </div>
            {!loadingBatteries && batteryCards.length === 0 && (
              <div className="text-sm text-gray-600">No battery models available.</div>
            )}
          </div>
        )}

        {activeTab === 'srate' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
              PG&E's battery-specific tariff designed to maximize storage savings. Wider spread between peak and off-peak rates, lower demand charges by design. AI will estimate additional savings once interval and usage data are uploaded.
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">{error}</div>
      )}

      {/* Internal AI Assistant */}
      <div className="h-[620px]">
        <AiChat
          title="Internal AI Assistant"
          systemPrompt="You are EverWatt's internal assistant. Help the team interpret what this page is doing, explain computations and assumptions, and point to relevant code and docs. Cite sources as (path#chunkIndex). If you are missing repo context, say so and tell the user to run the repo embedding ingestion script."
          analysisContext={aiAnalysisContext}
        />
      </div>

      {/* Results */}
      {step === 'results' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">Demand Rate</p>
              <p className="text-xl font-bold text-gray-900">{summary?.demandRate ? `$${summary.demandRate.toFixed(2)}/kW` : '—'}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">Batteries Analyzed</p>
              <p className="text-xl font-bold text-gray-900">{summary?.batteriesAnalyzed ?? recommendations.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">Best Peak Reduction</p>
              <p className="text-xl font-bold text-gray-900">{summary?.bestPeakReductionKw ? `${summary.bestPeakReductionKw.toFixed(1)} kW` : '—'}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">Best Annual Savings</p>
              <p className="text-xl font-bold text-gray-900">{summary?.bestAnnualSavings ? `$${summary.bestAnnualSavings.toLocaleString()}` : '—'}</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Battery Recommendations</h2>
            {recommendations.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center text-yellow-800">
                No battery recommendations found. This may indicate insufficient reduction or a processing issue.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {recommendations.map((rec, index) => (
                  <BatteryRecommendationCard
                    key={rec.modelName}
                    recommendation={rec}
                    rank={index + 1}
                    onSelect={() => setSelectedBattery(null)}
                    isSelected={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      {step !== 'results' && (
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div className="text-sm text-gray-600">Upload interval and usage data before running analysis.</div>
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100" onClick={() => navigate('/dashboard')}>Cancel</button>
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className={`px-5 py-2 rounded-lg font-semibold flex items-center gap-2 ${canAnalyze ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500'}`}
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />} Create & Continue to Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
