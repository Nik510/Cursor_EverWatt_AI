import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Rocket,
  Save,
  CalendarClock,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { FileUpload } from '../../../components/FileUpload';
import { DemandProfileChart } from '../../../components/charts/DemandProfileChart';
import { Phase2ResultsPage } from '../../../pages/Phase2ResultsPage';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { catalogToBatterySpec } from '../../../utils/battery-catalog-loader';
import type { BatterySpec, LoadProfile, SimulationResult } from '../../../modules/battery/types';
import type { CatalogBatteryRow } from '../../../utils/battery-catalog-loader';
import { PeakEventTimeline } from '../../../components/charts/PeakEventTimeline';
import { BatteryPerformanceHeatmap } from '../../../components/charts/BatteryPerformanceHeatmap';
import { BatteryUtilizationGauges } from '../../../components/charts/BatteryUtilizationGauges';
import { ConstraintWaterfallChart } from '../../../components/charts/ConstraintWaterfallChart';
import { PeakEventScatterPlot } from '../../../components/charts/PeakEventScatterPlot';
import { BatteryReasonBadges } from '../../../components/BatteryReasonBadges';
import { useToast } from '../../../contexts/ToastContext';
import { logger } from '../../../services/logger';
import { BestRecommendation } from '../../../components/battery/MultiTierComparison';
import { aggregateByViewMode, type ChartViewMode } from '../../../utils/chart-aggregation';
import { ChartViewToggle } from '../../../components/charts/ChartViewToggle';
import { buildDrRows } from '../../../modules/battery/buildDrRows';
import { fitScoreLabel } from '../../../modules/battery/dr-fit-score';
import { gradeBatteryEconomics, type BatteryEconomicsResult } from '../../../utils/economics/battery-economics';

interface BatteryCalculationResult {
  result: SimulationResult;
  battery: BatterySpec;
  batteryInfo: CatalogBatteryRow;
  threshold: number;
  demandRate: number;
  annualSavings: number;
  systemCost: number;
  effectiveCost: number;
  paybackYears: number;
  economics?: BatteryEconomicsResult;
  cefoLoanInfo?: {
    loanAmount: number;
    financedAmount: number;
    outOfPocket: number;
  };
}

type DataTab = 'interval' | 'usage' | 'battery' | 'srate';

type FacilityType =
  | 'Commercial'
  | 'Industrial'
  | 'Retail'
  | 'Healthcare'
  | 'Education'
  | 'Municipal'
  | 'Agricultural'
  | 'Multifamily Residential'
  | 'Office'
  | 'Restaurant'
  | 'Warehouse'
  | '';

export const BatteryCalculator: React.FC = () => {
  const { toast } = useToast();

  type IntervalApiRow = { timestamp: string; kw?: number; demand?: number; temperature?: number };
  type ProcessIntervalApiResponse =
    | {
        success?: boolean;
        intervals: IntervalApiRow[];
        statistics: { totalRows: number; validRows: number; invalidRows: number; percentageAbsorbed: number };
        peakKw?: number;
      }
    | { error?: string; message?: string; success?: boolean };

  type MonthlyBillApiRow = {
    date: string;
    totalUsageKwh?: number;
    peakDemandKw?: number;
    totalCost?: number;
    onPeakKwh?: number;
    partialPeakKwh?: number;
    offPeakKwh?: number;
    superOffPeakKwh?: number;
    rateCode?: string;
  };
  type UsageIdentifiers = {
    saId?: string;
    accountNumber?: string;
    meterNumber?: string;
    rateCode?: string;
    billingName?: string;
    siteAddress?: string;
    serviceProvider?: string;
  };
  type ProcessUsageApiResponse =
    | {
        success: true;
        demandRate: number;
        baseline: { averageMonthlyCost: number; averageMonthlyUsage: number; averagePeakDemand: number; totalMonths: number; touBreakdown?: unknown };
        statistics?: { totalRows: number; validRows: number; invalidRows: number; percentageAbsorbed: number };
        monthlyBills?: MonthlyBillApiRow[];
        identifiers?: UsageIdentifiers;
      }
    | { success: false; error?: string; message?: string };
  
  // Client/Project info
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clientName, setClientName] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [serviceAgreementId, setServiceAgreementId] = useState('');
  const [facilityType, setFacilityType] = useState<FacilityType>('');
  const [climateZone, setClimateZone] = useState('');
  const [rateSchedule, setRateSchedule] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<1 | 2>(1);

  // Data tabs and uploads
  const [activeTab, setActiveTab] = useState<DataTab>('interval');
  const [intervalFile, setIntervalFile] = useState<File | null>(null);
  const [usageFile, setUsageFile] = useState<File | null>(null);

  const MAX_INTERVAL_MB = 50;
  const MAX_USAGE_MB = 25;

  const isFileTooLarge = (file: File, maxMb: number): boolean => file.size > maxMb * 1024 * 1024;

  const readJsonSafe = async (res: Response): Promise<any> => {
    const text = await res.text().catch(() => '');
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }
  };

  // Battery data
  const [batteries, setBatteries] = useState<CatalogBatteryRow[]>([]);
  const [selectedBattery, setSelectedBattery] = useState<CatalogBatteryRow | null>(null);
  const [loadingBatteries, setLoadingBatteries] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<Array<{
    modelName: string;
    manufacturer: string;
    capacityKwh: number;
    maxPowerKw: number;
    peakReductionKw: number;
    annualSavings: number;
    systemCost: number;
    paybackYears: number;
    // Portfolio selection (new)
    pricingTier?: string;
    totalUnits?: number;
    thresholdKw?: number;
    annualizedCapex?: number;
    objectiveValue?: number;
    portfolio?: Array<{
      modelName: string;
      manufacturer: string;
      quantity: number;
      unitPowerKw: number;
      unitCapacityKwh: number;
      unitEfficiency: number;
      unitPrice: number;
      lineCost: number;
    }>;
    best?: {
      mode: 'STANDARD' | 'S_RATE';
      annualSavings: number;
      paybackYears: number;
    };
    sRate?: {
      isEligible: boolean;
      annualDemandCharge: number;
      annualSavings: number;
      paybackYears: number;
    };
    capDiscovery?: {
      guaranteedCapKw: number;
      perMonth: Array<{
        monthKey: string;
        peakBeforeKw: number;
        capKw: number;
        peakAfterKw: number;
        feasible: boolean;
      }>;
    };
  }>>([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const [aiSelectedBattery, setAiSelectedBattery] = useState<CatalogBatteryRow | null>(null);
  const [selectedAiRecommendation, setSelectedAiRecommendation] = useState<{
    modelName: string;
    manufacturer: string;
    capacityKwh: number;
    maxPowerKw: number;
    peakReductionKw: number;
    annualSavings: number;
    systemCost: number;
    paybackYears: number;
    pricingTier?: string;
    totalUnits?: number;
    thresholdKw?: number;
    annualizedCapex?: number;
    objectiveValue?: number;
    portfolio?: Array<{
      modelName: string;
      manufacturer: string;
      quantity: number;
      unitPowerKw: number;
      unitCapacityKwh: number;
      unitEfficiency: number;
      unitPrice: number;
      lineCost: number;
    }>;
  } | null>(null);

  // Simulation
  const [loadProfile, setLoadProfile] = useState<LoadProfile | null>(null);
  const [originalPeak, setOriginalPeak] = useState(0);
  const [threshold, setThreshold] = useState(0);
  const [demandRate, setDemandRate] = useState(15);
  const [baselineData, setBaselineData] = useState<{
    averageMonthlyCost: number;
    averageMonthlyUsage: number;
    averagePeakDemand: number;
    totalMonths: number;
  } | null>(null);
  const [usageProcessed, setUsageProcessed] = useState(false);
  const [intervalStats, setIntervalStats] = useState<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    percentageAbsorbed: number;
  } | null>(null);
  const [usageStats, setUsageStats] = useState<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    percentageAbsorbed: number;
  } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [calculationResult, setCalculationResult] = useState<BatteryCalculationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  // Backend-computed analysis results (diagnostics, peak events, downsampled chart data)
  const [analysisResults, setAnalysisResults] = useState<{
    diagnostic: any;
    peakEvents: any[];
    chartData: {
      intervals: Array<{ timestamp: string; kw: number }>;
      afterKw: number[];
      socHistory: number[];
    };
  } | null>(null);
  
  // Comprehensive data for Phase 2 dashboard
  const [comprehensiveUsageData, setComprehensiveUsageData] = useState<Array<{
    billEndDate: Date;
    totalUsageKwh: number;
    peakDemandKw: number;
    totalCost: number;
    onPeakKwh?: number;
    partialPeakKwh?: number;
    offPeakKwh?: number;
    superOffPeakKwh?: number;
    rateCode?: string;
  }> | null>(null);
  const [customerIdentifiers, setCustomerIdentifiers] = useState<{
    saId: string;
    accountNumber: string;
    meterNumber: string;
    rateCode: string;
    billingName: string;
    siteAddress: string;
    serviceProvider: string;
  } | null>(null);
  const [showPhase2, setShowPhase2] = useState(false);
  
  // Analysis mode and demand response settings
  const [analysisMode, setAnalysisMode] = useState<'single' | 'multi-tier'>('single');
  const [demandResponseEnabled, setDemandResponseEnabled] = useState(false);
  const [demandResponseParams, setDemandResponseParams] = useState({
    capacityPaymentPerKwMonth: 10, // $/kW-month
    paymentUnit: 'per_kw_event' as 'per_kw_event' | 'per_kwh',
    eventPayment: 1.0, // $/kW-event or $/kWh depending on unit
    estimatedEventsPerYear: 12,
    minimumCommitmentKw: 50,
    // Hybrid fee defaults (can be hidden in UI for now)
    everwattFeePerKwYear: 30,
    everwattFeePct: 0.2,
  });
  const [demandResponsePanel, setDemandResponsePanel] = useState<any>(null);
  
  // Multi-tier analysis results
  const [multiTierResults, setMultiTierResults] = useState<any>(null);
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>('raw');
  
  // Helper to get aggregated chart data based on view mode
  const getAggregatedChartData = (data: any[], mode: ChartViewMode) => {
    if (mode === 'raw' || !loadProfile) return data;
    const intervals = loadProfile.intervals;
    const afterKw = data.map((d) => d.afterBattery).filter((v): v is number => v !== undefined);
    const aggregated = aggregateByViewMode(intervals, afterKw, undefined, mode);
    return aggregated.map((agg) => ({
      time: agg.label,
      original: agg.demand,
      afterBattery: agg.afterBattery,
      soc: agg.soc,
    }));
  };

  // Load catalog
  useEffect(() => {
    loadBatteryCatalogList();
  }, []);

  // Track if we just processed a file to prevent API reload from overwriting it
  const [justProcessedFile, setJustProcessedFile] = useState(false);
  // Ref to track the last successfully processed file to prevent it from being cleared
  const lastProcessedIntervalFileRef = useRef<File | null>(null);
  // Ref to track if we're currently setting a file to prevent race conditions
  const isSettingFileRef = useRef(false);

  // If navigated back from Financials, reload the saved analysis by id.
  useEffect(() => {
    const analysisId = searchParams.get('analysisId');
    // Only run if there's an analysisId in the URL (user navigated here with a specific analysis)
    if (!analysisId) return;
    // Don't reload if we just processed a file (prevent overwriting new data)
    if (justProcessedFile) {
      console.log('Skipping reload: just processed file');
      return;
    }
    // Don't reload if projectId already matches and we have data
    if (projectId === analysisId && loadProfile) {
      console.log('Skipping reload: project matches and has loadProfile');
      return;
    }
    // Don't reload if we're currently processing (analysis in progress or file upload)
    if (isProcessing) {
      console.log('Skipping reload: currently processing');
      return;
    }
    // Don't reload if we already have calculation results (just completed analysis)
    if (calculationResult) {
      console.log('Skipping reload: has calculation result');
      return;
    }
    // Don't reload if we're in the middle of uploading/processing files
    // But allow reload if we just processed a file (data is already loaded)
    if (intervalFile && !justProcessedFile && !loadProfile) {
      console.log('Skipping reload: interval file uploaded but not yet processed');
      return;
    }
    // Don't reload if we're currently setting a file (prevent race condition)
    if (isSettingFileRef.current) {
      console.log('Skipping reload: currently setting a file');
      return;
    }
    if (usageFile && !justProcessedFile && !usageProcessed) {
      console.log('Skipping reload: usage file uploaded but not yet processed');
      return;
    }
    // Don't reload if we have loadProfile but projectId doesn't match URL (we're working on a different project)
    if (loadProfile && projectId && projectId !== analysisId) {
      console.log('Skipping reload: working on different project');
      return;
    }
    
    console.log('Loading analysis from URL:', analysisId);

    let cancelled = false;
    const run = async () => {
      try {
        setProjectId(analysisId);
        const res = await fetch(`/api/analyses/${analysisId}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.analysis) return;
        if (cancelled) return;

        const a = json.analysis as any;
        const report = a.analysisReportData ?? a;

        // Customer info
        if (a.customerInfo?.companyName) setClientName(String(a.customerInfo.companyName));
        if (a.customerInfo?.siteLocation) setSiteLocation(String(a.customerInfo.siteLocation));
        if (a.customerInfo?.serviceAgreementId) setServiceAgreementId(String(a.customerInfo.serviceAgreementId));
        if (a.customerInfo?.facilityType) setFacilityType(a.customerInfo.facilityType as FacilityType);
        if (a.customerInfo?.climateZone) setClimateZone(String(a.customerInfo.climateZone));
        if (a.customerInfo?.rateSchedule) setRateSchedule(String(a.customerInfo.rateSchedule));

        // Interval + usage data
        // Handle both array format (legacy) and object format (current)
        const intervalData = report.intervalData;
        if (intervalData) {
          let intervals: Array<{ timestamp: Date; kw: number; temperature?: number }> = [];
          if (Array.isArray(intervalData)) {
            // Legacy format: intervalData is directly an array
            intervals = intervalData.map((i: any) => ({
              timestamp: new Date(i.timestamp),
              kw: Number(i.kw) || 0,
              temperature: typeof i.temperature === 'number' ? i.temperature : undefined,
            }));
          } else if (intervalData.intervals && Array.isArray(intervalData.intervals)) {
            // Current format: intervalData is an object with intervals property
            intervals = intervalData.intervals.map((i: any) => ({
              timestamp: new Date(i.timestamp),
              kw: Number(i.kw) || 0,
              temperature: typeof i.temperature === 'number' ? i.temperature : undefined,
            }));
          }
          
          if (intervals.length > 0) {
            setLoadProfile({ intervals });
            const peak = Math.max(...intervals.map((i: any) => i.kw));
            setOriginalPeak(peak);
            // Threshold will be optimized by backend
            setThreshold(0);
          }
        }

        if (Array.isArray(report.usageData)) {
          setComprehensiveUsageData(
            report.usageData.map((u: any) => ({
              billEndDate: new Date(u.billEndDate),
              totalUsageKwh: Number(u.totalUsageKwh) || 0,
              peakDemandKw: Number(u.peakDemandKw) || 0,
              totalCost: Number(u.totalCost) || 0,
              onPeakKwh: u.onPeakKwh,
              partialPeakKwh: u.partialPeakKwh,
              offPeakKwh: u.offPeakKwh,
              superOffPeakKwh: u.superOffPeakKwh,
              rateCode: u.rateCode,
            }))
          );
          setUsageProcessed(true);
        }

        // Calculation result + recommendations
        if (report.calculationResult) {
          setCalculationResult(report.calculationResult as BatteryCalculationResult);
          if (typeof report.calculationResult.demandRate === 'number') setDemandRate(report.calculationResult.demandRate);

          const info = report.calculationResult.batteryInfo;
          if (info?.modelName && info?.manufacturer && Array.isArray(batteries) && batteries.length > 0) {
            const matchingBattery = batteries.find(
              (b) => b.modelName === info.modelName && b.manufacturer === info.manufacturer
            );
            if (matchingBattery) setSelectedBattery(matchingBattery);
          }
        }

        if (Array.isArray(report.aiRecommendations)) {
          setAiRecommendations(report.aiRecommendations);
        }
      } catch {
        // ignore
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [searchParams, projectId, loadProfile, batteries, isProcessing, calculationResult, intervalFile, usageFile, justProcessedFile, usageProcessed]);

  // Create project when user starts entering data
  useEffect(() => {
    if (!projectId && (clientName || siteLocation)) {
      saveProjectData({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientName, siteLocation]);

  // NOTE: We intentionally DO NOT auto-process usage uploads.
  // Users must click "Process Usage & Confirm Rows" so all heavy computations stay on the backend.

  // Auto-select AI recommended battery when both batteries and recommendations are available
  useEffect(() => {
    if (aiRecommendations.length > 0 && batteries.length > 0 && !selectedBattery && !selectedAiRecommendation) {
      const bestRec = aiRecommendations[0];
      // If the AI returned a portfolio, select it directly (no single-SKU mapping).
      if (Array.isArray((bestRec as any).portfolio) && (bestRec as any).portfolio.length > 0) {
        setSelectedAiRecommendation(bestRec);
        setAiSelectedBattery(null);
        setSelectedBattery(null);
        if (typeof (bestRec as any).thresholdKw === 'number' && (bestRec as any).thresholdKw > 0) {
          setThreshold((bestRec as any).thresholdKw);
        }
        return;
      }

      const matchingBattery = batteries.find((b) => b.modelName === bestRec.modelName && b.manufacturer === bestRec.manufacturer);
      if (matchingBattery) {
        setSelectedAiRecommendation(bestRec);
        setAiSelectedBattery(matchingBattery);
        setSelectedBattery(matchingBattery);
      }
    }
  }, [aiRecommendations, batteries, selectedBattery, selectedAiRecommendation]);

  // Update threshold when peak changes
  useEffect(() => {
    if (originalPeak > 0) {
      // Threshold will be optimized by backend
      setThreshold(0);
    }
  }, [originalPeak]);

  const facilityTypes: FacilityType[] = [
    'Commercial',
    'Industrial',
    'Retail',
    'Healthcare',
    'Education',
    'Municipal',
    'Agricultural',
    'Multifamily Residential',
    'Office',
    'Restaurant',
    'Warehouse',
    '',
  ];

  const climateZones = [
    'Zone 1','Zone 2','Zone 3','Zone 4','Zone 5','Zone 6','Zone 7','Zone 8','Zone 9','Zone 10','Zone 11','Zone 12','Zone 13','Zone 14','Zone 15','Zone 16'
  ];

  const rateSchedules = [
    'B-19 Medium General Demand-Metered TOU (B-19)',
    'B-20 Large General Demand-Metered TOU (B-20)',
    'E-19 Medium General Demand-Metered TOU (Legacy) (E-19)',
    'E-20 Large General Demand-Metered TOU (Legacy) (E-20)',
    'E-20 TOU (E-20)',
    'E-19 TOU (E-19)',
    'Core Commercial (G-NR1)',
    'B-19 Secondary (B19S)',
    'B-19S with Option S (B19S-S)',
    'A-10 Secondary TOU (A10S)',
  ];

  const loadBatteryCatalogList = async () => {
    setLoadingBatteries(true);
    setError(null);
    try {
      let response: Response;
      try {
        response = await fetch('/api/batteries/catalog');
      } catch (fetchError) {
        // Network error - server might not be running
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        if (
          fetchError instanceof TypeError ||
          errorMessage.includes('fetch') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('network')
        ) {
          setError(
            'Cannot connect to server. Please ensure the backend server is running on port 3001. ' +
            'Start it with: npm run dev:server or npm run server'
          );
          setBatteries([]);
          setLoadingBatteries(false);
          return;
        }
        throw fetchError;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.batteries && data.batteries.length > 0) {
          setBatteries(data.batteries);
        } else {
          const errorMsg = data?.message || data?.error || 'Battery catalog is empty. Please load a real catalog.';
          setError(errorMsg);
          setBatteries([]);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.message || errorData?.error || 'Failed to load battery catalog from API.';
        setError(errorMsg);
        setBatteries([]);
      }
    } catch (err) {
      console.error('Error loading battery catalog:', err);
      const errorMessage = err instanceof Error ? err.message : 'Could not load battery catalog.';
      setError(errorMessage);
      setBatteries([]);
    } finally {
      setLoadingBatteries(false);
    }
  };

  // NOTE: We intentionally DO NOT auto-process interval uploads.
  // Users must click "Validate Interval & Confirm Rows" so all heavy computations stay on the backend
  // and the UI state remains deterministic/auditable.

  const handleProcessInterval = async () => {
    if (!intervalFile) {
      setError('Please upload an interval data file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('intervalFile', intervalFile);

      let response: Response;
      try {
        response = await fetch('/api/process-interval', {
          method: 'POST',
          body: formData,
        });
      } catch (fetchError) {
        // Network error - server might not be running
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        if (
          fetchError instanceof TypeError ||
          errorMessage.includes('fetch') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('network')
        ) {
          throw new Error(
            'Cannot connect to server. Please ensure the backend server is running on port 3001. ' +
            'Start it with: npm run dev:server or npm run server'
          );
        }
        throw fetchError;
      }

      const data = await readJsonSafe(response);

      if (!response.ok) {
        const errorMsg = data?.message || data?.error || `Server returned ${response.status}: ${response.statusText}`;
        console.error('Server error response:', { status: response.status, data });
        throw new Error(errorMsg);
      }

      const typed = data as ProcessIntervalApiResponse;
      
      // Check for error response first (even if status is 200)
      if ('error' in typed && typed.error) {
        console.error('Error in response data:', typed);
        throw new Error(typed.error || typed.message || 'Failed to process interval file');
      }
      
      // Validate response structure
      if (!('intervals' in typed) || !Array.isArray(typed.intervals)) {
        console.error('Invalid response structure - missing intervals array:', typed);
        throw new Error('Server returned invalid response format. Expected intervals array. Check server logs for details.');
      }
      
      if (!('statistics' in typed) || !typed.statistics) {
        console.error('Missing statistics in response:', typed);
        throw new Error('Server response missing statistics. Please check server logs.');
      }
      
      // Log success for debugging
      console.log('Interval data processed successfully:', {
        intervalCount: typed.intervals.length,
        statistics: typed.statistics,
        peakKw: typed.peakKw
      });
      
      const intervals = typed.intervals.map((item) => ({
        timestamp: new Date(item.timestamp),
        kw: typeof item.kw === 'number' ? item.kw : (typeof item.demand === 'number' ? item.demand : (item.kw || item.demand || 0)),
        temperature: typeof (item as any).temperature === 'number' ? (item as any).temperature : undefined,
      }));

      if (intervals.length === 0) {
        throw new Error('No valid interval rows were returned after parsing. Check timestamp + demand columns.');
      }

      const profile: LoadProfile = { intervals };
      setLoadProfile(profile);
      setJustProcessedFile(true); // Mark that we just processed a file
      // Store reference to successfully processed file
      if (intervalFile) {
        lastProcessedIntervalFileRef.current = intervalFile;
      }

      const peak = Math.max(...intervals.map((i) => i.kw));
      if (!Number.isFinite(peak) || peak <= 0) {
        throw new Error('Parsed interval data did not produce a valid peak kW. Check the demand column and units.');
      }
      setOriginalPeak(peak);
      // Threshold will be optimized by backend
      setThreshold(0);

      // Store statistics
      setIntervalStats(typed.statistics);

      // Save to project (will update status to 'partial' or 'ready')
      await saveProjectData({
        intervalData: {
          intervals: typed.intervals,
          statistics: typed.statistics,
          peakKw: typed.peakKw,
        },
      });

      // Automatically get AI battery recommendations if we have demand rate
      if (demandRate > 0) {
        await getAiBatteryRecommendations(intervals, demandRate);
      }

      // Clear the flag after a short delay to allow state to settle
      // NOTE: We keep intervalFile set so the UI shows the uploaded file
      setTimeout(() => {
        setJustProcessedFile(false);
      }, 2000);
    } catch (err) {
      console.error('File processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process interval file';
      setError(errorMessage);
      // Don't clear the file on error - let user see what they uploaded
      // Only clear if it's a network error (server not running)
      if (errorMessage.includes('Cannot connect to server')) {
        // Keep file but show error
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const saveProjectData = async (data: Record<string, unknown>): Promise<string | null> => {
    try {
      // Determine project status based on what data we have
      // If status is explicitly provided (e.g., 'completed'), use it
      let status = data.status;
      if (!status) {
        if (loadProfile && usageProcessed && selectedBattery) {
          status = 'ready'; // Has all data needed for analysis
        } else if (loadProfile || usageProcessed) {
          status = 'partial'; // Has some data but not complete
        } else {
          status = 'draft';
        }
      }

      const projectData = {
        customerInfo: {
          companyName: clientName || 'Untitled Project',
          siteLocation,
          serviceAgreementId,
          facilityType,
          climateZone,
          rateSchedule,
        },
        status,
        ...data,
      };

      if (projectId) {
        // Update existing project
        const response = await fetch(`/api/analyses/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to update project:', errorData);
        } else {
          logger.debug('Project updated:', projectId);
          // Ensure analysisId is in the URL so a refresh/HMR reload can rehydrate state.
          const currentUrlId = searchParams.get('analysisId');
          if (!currentUrlId || currentUrlId !== projectId) {
            navigate(`/calculator/battery?analysisId=${encodeURIComponent(projectId)}`, { replace: true });
          }
          return projectId;
        }
      } else {
        // Create new project
        const response = await fetch('/api/analyses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        });
        if (response.ok) {
          const result = await response.json();
          const newProjectId = result.analysis?.id || null;
          setProjectId(newProjectId);
          logger.debug('Project created:', newProjectId);
          if (newProjectId) {
            // Put analysisId into URL immediately so any reload doesn't lose the uploaded/processed state.
            navigate(`/calculator/battery?analysisId=${encodeURIComponent(newProjectId)}`, { replace: true });
          }
          return newProjectId;
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to create project:', errorData);
        }
      }
    } catch (err) {
      console.error('Error saving project data:', err);
      // Don't show error to user - silent save failure is OK
    }
    return projectId;
  };

  const handleProcessUsage = async () => {
    if (!usageFile) {
      setError('Please upload a usage data file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('usageFile', usageFile);

      let response: Response;
      try {
        response = await fetch('/api/process-usage', {
          method: 'POST',
          body: formData,
        });
      } catch (fetchError) {
        // Network error - server might not be running
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        if (
          fetchError instanceof TypeError ||
          errorMessage.includes('fetch') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('network')
        ) {
          throw new Error(
            'Cannot connect to server. Please ensure the backend server is running on port 3001. ' +
            'Start it with: npm run dev:server or npm run server'
          );
        }
        throw fetchError;
      }

      const data = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to process usage file');
      }

      const typed = data as ProcessUsageApiResponse;
      if (typed.success) {
        setDemandRate(typed.demandRate);
        setBaselineData(typed.baseline);
        setUsageProcessed(true);
        setJustProcessedFile(true); // Mark that we just processed a file
        
        // Store statistics
        if (typed.statistics) {
          setUsageStats(typed.statistics);
        }
        
        // Store comprehensive data for Phase 2 dashboard - ALL TOU data included
        if (typed.monthlyBills) {
          setComprehensiveUsageData(
            typed.monthlyBills.map((bill) => ({
              billEndDate: new Date(bill.date),
              totalUsageKwh: bill.totalUsageKwh || 0,
              peakDemandKw: bill.peakDemandKw || 0,
              totalCost: bill.totalCost || 0,
              onPeakKwh: bill.onPeakKwh || 0,
              partialPeakKwh: bill.partialPeakKwh || 0,
              offPeakKwh: bill.offPeakKwh || 0,
              superOffPeakKwh: bill.superOffPeakKwh || 0,
              rateCode: bill.rateCode || '',
            }))
          );
          logger.debug('Stored monthly bills with TOU breakdown', { count: typed.monthlyBills.length });
        }
        
        // Store customer identifiers from file
        if (typed.identifiers) {
          setCustomerIdentifiers({
            saId: typed.identifiers.saId || '',
            accountNumber: typed.identifiers.accountNumber || '',
            meterNumber: typed.identifiers.meterNumber || '',
            rateCode: typed.identifiers.rateCode || '',
            billingName: typed.identifiers.billingName || '',
            siteAddress: typed.identifiers.siteAddress || '',
            serviceProvider: typed.identifiers.serviceProvider || '',
          });
          // Auto-populate fields from file data
          if (typed.identifiers.billingName && !clientName) {
            setClientName(typed.identifiers.billingName);
          }
          if (typed.identifiers.siteAddress && !siteLocation) {
            setSiteLocation(typed.identifiers.siteAddress);
          }
          if (typed.identifiers.saId && !serviceAgreementId) {
            setServiceAgreementId(typed.identifiers.saId);
          }
        }

        // Save to project (will update status to 'partial' or 'ready')
        await saveProjectData({
          usageData: {
            monthlyBills: typed.monthlyBills,
            demandRate: typed.demandRate,
            baseline: typed.baseline,
            statistics: typed.statistics,
            identifiers: typed.identifiers,
            touBreakdown: typed.baseline?.touBreakdown,
          },
        });

        // If we already have interval data processed, re-run AI recommendations with correct demand rate
        if (loadProfile && loadProfile.intervals.length > 0) {
          const intervals = loadProfile.intervals.map(i => ({
            timestamp: i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp),
            kw: i.kw,
          }));
          await getAiBatteryRecommendations(intervals, typed.demandRate);
        }

        // Clear the flag after a short delay to allow state to settle
        setTimeout(() => {
          setJustProcessedFile(false);
        }, 1000);
      }
    } catch (err) {
      console.error('Usage processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process usage file');
    } finally {
      setIsProcessing(false);
    }
  };

  const getAiBatteryRecommendations = async (intervals: Array<{ timestamp: Date; kw: number }>, rate?: number): Promise<any[] | null> => {
    setIsRecommending(true);
    setError(null);
    setWarning(null);

    const effectiveDemandRate = rate || demandRate;

    try {
      const response = await fetch('/api/batteries/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intervals: intervals.map(i => ({
            timestamp: i.timestamp.toISOString(),
            kw: i.kw,
          })),
          demandRate: effectiveDemandRate,
          rateCode: customerIdentifiers?.rateCode || rateSchedule || '',
          serviceProvider: customerIdentifiers?.serviceProvider || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get battery recommendations');
      }

      const data = await response.json();
      if (data.success && data.recommendations && data.recommendations.length > 0) {
        if (Array.isArray(data.warnings) && data.warnings.length > 0) {
          setWarning(data.warnings.join(' '));
        }
        setAiRecommendations(data.recommendations);

        // Auto-select the best battery (first in sorted list - best payback)
        // Wait for batteries to load if they haven't yet
        if (batteries.length === 0) {
          // If batteries aren't loaded yet, wait a bit and try again
          setTimeout(() => {
            const bestRec = data.bestRecommendation;
            if (bestRec && batteries.length > 0) {
              const matchingBattery = batteries.find(
                b => b.modelName === bestRec.modelName && b.manufacturer === bestRec.manufacturer
              );
              if (matchingBattery) {
                setAiSelectedBattery(matchingBattery);
                setSelectedBattery(matchingBattery);
              }
            }
          }, 500);
        } else {
          const bestRec = data.bestRecommendation;
          if (bestRec) {
            const matchingBattery = batteries.find(
              b => b.modelName === bestRec.modelName && b.manufacturer === bestRec.manufacturer
            );
            if (matchingBattery) {
              setAiSelectedBattery(matchingBattery);
              setSelectedBattery(matchingBattery);
            }
          }
        }
        return data.recommendations;
      } else {
        // If the backend can’t produce anything, show a real reason instead of a confusing blanket message.
        const msg =
          data?.analysis?.batteriesEvaluated && data?.analysis?.batteriesPassed === 0
            ? `No batteries passed validation gates (${data.analysis.batteriesEvaluated} evaluated).`
            : 'No battery recommendations available for this dataset.';
        setError(msg);
        return null;
      }
    } catch (err) {
      console.error('Battery recommendation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get AI battery recommendations');
      return null;
    } finally {
      setIsRecommending(false);
    }
  };

  const handleCalculate = async () => {
    if (!loadProfile) {
      setError('Please process interval data first');
      return;
    }
    const isPortfolioRec = (rec: any): boolean => Array.isArray(rec?.portfolio) && rec.portfolio.length > 0;
    let portfolioRec: any | null = isPortfolioRec(selectedAiRecommendation) ? selectedAiRecommendation : null;
    let batteryToUse: CatalogBatteryRow | null = selectedBattery ?? aiSelectedBattery;

    // Multi-tier mode does not require a battery selection (backend chooses).
    if (analysisMode === 'single') {
      // If nothing selected, try to fetch AI picks once.
      if (!batteryToUse && !portfolioRec) {
        const recs = await getAiBatteryRecommendations(
          loadProfile.intervals.map((i) => ({
            timestamp: i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp),
            kw: i.kw,
          })),
          demandRate
        );
        const best = Array.isArray(recs) && recs.length > 0 ? recs[0] : null;
        if (best) {
          portfolioRec = isPortfolioRec(best) ? best : null;
          setSelectedAiRecommendation(best as any);

          // If the best AI recommendation is a single SKU, map it to a catalog battery for the UI.
          if (!portfolioRec) {
            const matchingBattery = batteries.find(
              (b) => b.modelName === (best as any).modelName && b.manufacturer === (best as any).manufacturer
            );
            if (matchingBattery) {
              batteryToUse = matchingBattery;
              setAiSelectedBattery(matchingBattery);
              setSelectedBattery(matchingBattery);
            }
          } else {
            setAiSelectedBattery(null);
            setSelectedBattery(null);
          }

          // Prefer the AI-provided threshold if present; otherwise let backend optimize.
          if (typeof (best as any).thresholdKw === 'number' && (best as any).thresholdKw > 0) {
            setThreshold((best as any).thresholdKw);
          } else {
            setThreshold(0);
          }
        }
      }

      if (!batteryToUse && !portfolioRec) {
        setError('Please select a battery model or choose an AI portfolio recommendation.');
        return;
      }
    }

    setIsProcessing(true);
    setError(null);
    setWarning(null);

    try {
      if (!loadProfile || !loadProfile.intervals || loadProfile.intervals.length === 0) {
        throw new Error('Invalid load profile data');
      }
      if (!usageProcessed) {
        setWarning(
          `Usage data not processed yet — using demand rate $${Number(demandRate ?? 0).toFixed(2)}/kW-month. Upload usage data for accurate savings/payback.`
        );
      }

      const buildBatterySpecFromPortfolio = (portfolio: any[]): BatterySpec => {
        const totalCapacityKwh = portfolio.reduce((s, u) => s + (Number(u.quantity) || 0) * (Number(u.unitCapacityKwh) || 0), 0);
        const totalPowerKw = portfolio.reduce((s, u) => s + (Number(u.quantity) || 0) * (Number(u.unitPowerKw) || 0), 0);
        const eta =
          totalCapacityKwh > 0
            ? portfolio.reduce((s, u) => s + (Number(u.quantity) || 0) * (Number(u.unitCapacityKwh) || 0) * (Number(u.unitEfficiency) || 0.9), 0) /
              totalCapacityKwh
            : 0.9;
        return {
          capacity_kwh: totalCapacityKwh,
          max_power_kw: totalPowerKw,
          round_trip_efficiency: eta,
          degradation_rate: 0.02,
          min_soc: 0.10,
          max_soc: 0.90,
          depth_of_discharge: 0.80,
        };
      };

      const hasSelectedPortfolio = !!portfolioRec;
      const batterySpec =
        analysisMode === 'single'
          ? hasSelectedPortfolio
            ? buildBatterySpecFromPortfolio(portfolioRec.portfolio)
            : (batteryToUse ? catalogToBatterySpec(batteryToUse, quantity) : null)
          : null;

      if (analysisMode === 'single' && !batterySpec) {
        throw new Error('Failed to create battery specification');
      }

      // Ensure we have a stable analysisId BEFORE calling /api/batteries/analyze,
      // so the backend can persist analysis_inputs.json + analysis_result.json keyed by analysisId.
      let analysisIdToUse = projectId || searchParams.get('analysisId') || null;
      if (!analysisIdToUse) {
        analysisIdToUse =
          (await saveProjectData({
            status: 'draft',
            customerInfo: {
              companyName: customerIdentifiers?.billingName || clientName || 'Unknown Customer',
              siteLocation: customerIdentifiers?.siteAddress || siteLocation || 'Unknown Location',
              serviceAgreementId: customerIdentifiers?.saId || serviceAgreementId || 'N/A',
              accountNumber: customerIdentifiers?.accountNumber || 'N/A',
              meterNumber: customerIdentifiers?.meterNumber || 'N/A',
              rateSchedule: customerIdentifiers?.rateCode || rateSchedule || '',
              utilityCompany: customerIdentifiers?.serviceProvider,
            },
          })) || null;
        if (analysisIdToUse) {
          setProjectId(analysisIdToUse);
          if (searchParams.get('analysisId') !== analysisIdToUse) {
            setSearchParams({ analysisId: analysisIdToUse });
          }
        }
      }

      // Call backend endpoint to perform all calculations
      const requestBody: any = {
        intervals: loadProfile.intervals.map(i => ({
          timestamp: i.timestamp instanceof Date ? i.timestamp.toISOString() : i.timestamp,
          kw: i.kw,
          temperature: typeof (i as any).temperature === 'number' ? (i as any).temperature : undefined,
        })),
        analysisMode,
        demandRatePerKwMonth: demandRate,
        maxChartPoints: 2000,
        analysisId: analysisIdToUse || undefined,
        customerInfo: {
          billingName: customerIdentifiers?.billingName || clientName || 'Unknown Customer',
          siteAddress: customerIdentifiers?.siteAddress || siteLocation || 'Unknown Location',
          saId: customerIdentifiers?.saId || serviceAgreementId || 'N/A',
          accountNumber: customerIdentifiers?.accountNumber || 'N/A',
          meterNumber: customerIdentifiers?.meterNumber || 'N/A',
          rateCode: customerIdentifiers?.rateCode || rateSchedule || '',
          serviceProvider: customerIdentifiers?.serviceProvider,
        },
        usageData: comprehensiveUsageData || [],
      };

      // For single mode, include battery spec
      if (analysisMode === 'single') {
        requestBody.batterySpec = batterySpec;
        requestBody.batteryMeta = hasSelectedPortfolio
          ? {
              label: (selectedAiRecommendation as any)?.modelName || 'Portfolio',
              portfolio: (portfolioRec as any)?.portfolio || (selectedAiRecommendation as any)?.portfolio,
              pricingTier: (selectedAiRecommendation as any)?.pricingTier,
              totalUnits: (selectedAiRecommendation as any)?.totalUnits,
              totalCapacityKwh: (batterySpec as any).capacity_kwh,
              totalPowerKw: (batterySpec as any).max_power_kw,
              systemCost: (selectedAiRecommendation as any)?.systemCost ?? undefined,
              annualSavings: undefined,
              paybackYears: undefined,
            }
          : batteryToUse
            ? {
                label: `${batteryToUse.manufacturer} ${batteryToUse.modelName} ×${quantity}`,
                modelName: batteryToUse.modelName,
                manufacturer: batteryToUse.manufacturer,
                quantity,
                totalCapacityKwh: (batterySpec as any).capacity_kwh,
                totalPowerKw: (batterySpec as any).max_power_kw,
              }
            : undefined;
        // Only pass threshold if explicitly set (non-zero), otherwise let backend optimize
        if (threshold > 0) {
          requestBody.thresholdKw = threshold;
        }
      }

      // Add demand response params if enabled
      if (demandResponseEnabled) {
        requestBody.demandResponse = {
          enabled: true,
          ...demandResponseParams,
        };
      }

      const analyzeResponse = await fetch('/api/batteries/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!analyzeResponse.ok) {
        throw new Error('Failed to analyze battery performance');
      }

      const analyzeData = await analyzeResponse.json();
      if (!analyzeData.success) {
        throw new Error(analyzeData.error || 'Analysis failed');
      }

      // analysisId is ensured above (before calling analyze)

      // Store DR panel (API now returns v2 under demandResponse; keep fallback to legacy)
      setDemandResponsePanel(analyzeData.demandResponse ?? analyzeData.demandResponseLegacy ?? null);


      // Handle AI best recommendation results
      if (analyzeData.analysisMode === 'multi-tier') {
        setMultiTierResults({ bestRecommendation: analyzeData.bestRecommendation });
        setAnalysisResults(null); // Clear single analysis results
        // Use the AI's best recommendation
        const recommendation = analyzeData.bestRecommendation.recommendation;
        const result = {
          original_peak: analyzeData.bestRecommendation.originalPeakKw,
          new_peak: recommendation.simulationResult.new_peak,
          savings_kwh: recommendation.simulationResult.savings_kwh,
          energy_discharged: recommendation.simulationResult.energy_discharged,
          energy_charged: recommendation.simulationResult.energy_charged,
          battery_soc_history: recommendation.simulationResult.chartData.socHistory,
          new_intervals_kw: recommendation.simulationResult.chartData.afterKw,
          final_load_profile: {
            intervals: recommendation.simulationResult.chartData.intervals.map((i: { timestamp: string; kw: number }) => ({
              timestamp: new Date(i.timestamp),
              kw: i.kw,
            })),
          },
        } as SimulationResult;

        const annualSavings = recommendation.financials.annualSavings;
        const systemCost = recommendation.batteryInfo.systemCost;
        const paybackYears = recommendation.financials.paybackYears;

        setCalculationResult({
          result,
          battery: recommendation.batterySpec,
          batteryInfo: {
            modelName: recommendation.batteryInfo.modelName,
            manufacturer: recommendation.batteryInfo.manufacturer,
            capacityKwh: recommendation.batteryInfo.totalCapacityKwh,
            powerKw: recommendation.batteryInfo.totalPowerKw,
            efficiency: recommendation.batterySpec.round_trip_efficiency,
            warrantyYears: 10, // Default
          } as CatalogBatteryRow,
          threshold: recommendation.thresholdKw,
          demandRate,
          annualSavings,
          systemCost,
          effectiveCost: systemCost,
          paybackYears,
        });
      } else {
        // Single battery analysis (existing logic)
        setMultiTierResults(null);
        // Store backend-computed results
        setAnalysisResults({
          diagnostic: analyzeData.diagnostic,
          peakEvents: analyzeData.peakEvents,
          chartData: analyzeData.simulationResult.chartData,
        });

      // Reconstruct simulation result for compatibility with existing code
      const result = {
        original_peak: analyzeData.simulationResult.original_peak,
        new_peak: analyzeData.simulationResult.new_peak,
        savings_kwh: analyzeData.simulationResult.savings_kwh,
        energy_discharged: analyzeData.simulationResult.energy_discharged,
        energy_charged: analyzeData.simulationResult.energy_charged,
        battery_soc_history: analyzeData.simulationResult.chartData.socHistory,
        new_intervals_kw: analyzeData.simulationResult.chartData.afterKw,
        final_load_profile: {
          intervals: analyzeData.simulationResult.chartData.intervals.map((i: { timestamp: string; kw: number }) => ({
            timestamp: new Date(i.timestamp),
            kw: i.kw,
          })),
        },
      } as SimulationResult;

      // Use backend-precomputed monthly peak reduction
      const { reductionKwMonthSum, monthsCount } = analyzeData.simulationResult.monthlyPeakReduction;
      const annualizeFactor = monthsCount > 0 ? 12 / monthsCount : 1;
      const annualSavings = (reductionKwMonthSum * annualizeFactor) * demandRate;

      // Explain "no shaving" cases clearly
      const peakReduction = result.original_peak - result.new_peak;
        const intervalsAboveThreshold = loadProfile.intervals.filter((i) => i.kw > threshold).length;
      if (intervalsAboveThreshold === 0) {
        setWarning(
          `No intervals exceeded the target threshold (${threshold.toFixed(1)} kW), so the battery never discharged. Try lowering the target threshold or selecting a higher-power battery.`
        );
      } else if (peakReduction <= 0.1 || reductionKwMonthSum <= 0.1) {
        // Check SOC at the true peak interval to detect “battery empty when it matters”
        const peakIdx = loadProfile.intervals.reduce((bestIdx, cur, idx, arr) => (cur.kw > arr[bestIdx].kw ? idx : bestIdx), 0);
        const socAtPeak = result.battery_soc_history?.[peakIdx];
        const socPct = socAtPeak != null && Number.isFinite(socAtPeak) ? socAtPeak * 100 : null;
        const extra =
          socPct == null
            ? ''
            : socPct <= 11
              ? ` Battery was near minimum SOC at the billing peak (${socPct.toFixed(1)}%).`
              : ` Battery SOC at billing peak was ${socPct.toFixed(1)}%.`;
        setWarning(
          `This run produced ~0 kW-month demand-charge reduction (the billing peak didn’t move).${extra} This usually means the battery is underpowered/undersized for the worst event duration, or the cap/threshold is set too low/high for the site.`
        );
      }

      const hasSelectedPortfolio =
        !!selectedAiRecommendation &&
        Array.isArray((selectedAiRecommendation as any).portfolio) &&
        (selectedAiRecommendation as any).portfolio.length > 0;

      let systemCost = 0;
      if (hasSelectedPortfolio && typeof (selectedAiRecommendation as any).systemCost === 'number') {
        systemCost = (selectedAiRecommendation as any).systemCost;
      } else if (batteryToUse) {
        // Tier buckets: 1-10, 11-20, 21-50, 50+ (where 50+ means >50)
        let unitPrice = batteryToUse.price1_10;
        if (quantity > 50) unitPrice = batteryToUse.price50Plus;
        else if (quantity > 20) unitPrice = batteryToUse.price21_50;
        else if (quantity > 10) unitPrice = batteryToUse.price11_20;
        systemCost = unitPrice * quantity;
      }

      const economics = gradeBatteryEconomics({
        materialCost: systemCost,
        annualSavings,
        assumptions: { paybackCapYears: 10, preferredMargin: 0.5 },
      });
      const effectiveCost = economics.effectiveInstalledCost;
      const paybackYears = economics.financial.adjustedPayback;

      const batteryInfoForResult: CatalogBatteryRow = hasSelectedPortfolio
        ? ({
            modelName: selectedAiRecommendation?.modelName || 'Portfolio',
            manufacturer: 'Portfolio',
            capacityKwh: (batterySpec as any).capacity_kwh,
            powerKw: (batterySpec as any).max_power_kw,
            cRate: ((batterySpec as any).max_power_kw && (batterySpec as any).capacity_kwh)
              ? (batterySpec as any).max_power_kw / (batterySpec as any).capacity_kwh
              : 0,
            efficiency: (batterySpec as any).round_trip_efficiency ?? 0.9,
            warrantyYears: 10,
            price1_10: systemCost,
            price11_20: systemCost,
            price21_50: systemCost,
            price50Plus: systemCost,
            active: true,
          } as any)
        : (batteryToUse as CatalogBatteryRow);

      const calcResult = {
        result,
        battery: (batterySpec as any) || (batteryToUse ? catalogToBatterySpec(batteryToUse, quantity) : ({} as any)),
        batteryInfo: batteryInfoForResult,
        threshold,
        demandRate,
        annualSavings,
        systemCost,
        effectiveCost,
        paybackYears,
        economics,
      };

      setCalculationResult(calcResult);
      
      // Prepare report-friendly analysis shape (used by AnalysisReportPage)
      const analysisDataForReport = {
        customerInfo: {
          billingName: customerIdentifiers?.billingName || clientName || 'Unknown Customer',
          siteAddress: customerIdentifiers?.siteAddress || siteLocation || 'Unknown Location',
          saId: customerIdentifiers?.saId || serviceAgreementId || 'N/A',
          accountNumber: customerIdentifiers?.accountNumber || 'N/A',
          meterNumber: customerIdentifiers?.meterNumber || 'N/A',
          rateCode: customerIdentifiers?.rateCode || rateSchedule || 'Unknown',
          serviceProvider: customerIdentifiers?.serviceProvider,
        },
        intervalData: loadProfile.intervals.map(i => ({
          timestamp: i.timestamp instanceof Date ? i.timestamp.toISOString() : i.timestamp,
          kw: i.kw,
        })),
        usageData: (comprehensiveUsageData || []).map(u => ({
          billEndDate: u.billEndDate instanceof Date ? u.billEndDate.toISOString() : u.billEndDate,
          totalUsageKwh: u.totalUsageKwh,
          peakDemandKw: u.peakDemandKw,
          totalCost: u.totalCost,
          onPeakKwh: u.onPeakKwh,
          partialPeakKwh: u.partialPeakKwh,
          offPeakKwh: u.offPeakKwh,
          superOffPeakKwh: u.superOffPeakKwh,
          rateCode: u.rateCode,
        })),
        calculationResult: {
          result: {
            original_peak: result.original_peak,
            new_peak: result.new_peak,
            savings_kwh: result.savings_kwh,
            // Persist full simulation series so Phase2/Report charts can render real dispatch
            final_load_profile: {
              intervals: result.final_load_profile?.intervals?.map((i) => ({
                timestamp: i.timestamp instanceof Date ? i.timestamp.toISOString() : i.timestamp,
                kw: i.kw,
              })) ?? [],
            },
            new_intervals_kw: result.new_intervals_kw,
            battery_soc_history: result.battery_soc_history,
            energy_discharged: result.energy_discharged,
            energy_charged: result.energy_charged,
          },
          battery: {
            capacity_kwh: (calcResult.battery as any).capacity_kwh,
            max_power_kw: (calcResult.battery as any).max_power_kw,
          },
          batteryInfo: {
            modelName: batteryInfoForResult.modelName,
            manufacturer: batteryInfoForResult.manufacturer,
            capacityKwh: batteryInfoForResult.capacityKwh,
            powerKw: batteryInfoForResult.powerKw,
            roundTripEfficiency: batteryInfoForResult.efficiency,
            warrantyYears: batteryInfoForResult.warrantyYears,
          },
          threshold,
          demandRate,
          annualSavings,
          systemCost,
          effectiveCost,
          paybackYears,
        },
        aiRecommendations: aiRecommendations.map(rec => ({
          modelName: rec.modelName,
          manufacturer: rec.manufacturer,
          capacityKwh: rec.capacityKwh,
          maxPowerKw: rec.maxPowerKw,
          peakReductionKw: rec.peakReductionKw,
          annualSavings: rec.annualSavings,
          systemCost: rec.systemCost,
          paybackYears: rec.paybackYears,
          pricingTier: rec.pricingTier,
          totalUnits: rec.totalUnits,
          thresholdKw: rec.thresholdKw,
          annualizedCapex: rec.annualizedCapex,
          objectiveValue: rec.objectiveValue,
          portfolio: (rec as any).portfolio,
          best: rec.best,
          sRate: rec.sRate,
          capDiscovery: rec.capDiscovery,
        })),
      };

      // Persist lightweight project metadata; the analysis snapshot is now persisted by the backend
      // under data/analyses/<analysisId>/analysis_result.json when analysisId is provided.
      const ensuredId =
        (await saveProjectData({
          status: 'completed',
          analysisReportData: analysisDataForReport, // keep for backward compatibility / audit
        })) || projectId;

      if (ensuredId) {
        setProjectId(ensuredId);
        if (searchParams.get('analysisId') !== ensuredId) {
          setSearchParams({ analysisId: ensuredId });
        }
      }
      
      // Also show Phase 2 dashboard (for inline view if user comes back)
      setShowPhase2(true);
      setActiveStep(2);

      // Note: project is saved above (includes calculationResult + status)
      }
    } catch (err) {
      console.error('Calculation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate');
    } finally {
      setIsProcessing(false);
    }
  };

  const chartData = useMemo(() => {
    if (!calculationResult || !loadProfile) return [];
    const originalIntervals = loadProfile.intervals;
    const finalIntervals = calculationResult.result.final_load_profile.intervals;
    const socHistory = calculationResult.result.battery_soc_history || [];

    return originalIntervals.map((orig, index) => {
      const final = finalIntervals[index] || orig;
      const soc = socHistory[index] !== undefined ? socHistory[index] * 100 : null;
      return {
        time:
          typeof orig.timestamp === 'string'
            ? new Date(orig.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : orig.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        original: orig.kw,
        afterBattery: final.kw,
        soc,
      };
    });
  }, [calculationResult, loadProfile]);

  const summaryCards = calculationResult
    ? [
        { label: 'Peak Reduction', value: `${(calculationResult.result.original_peak - calculationResult.result.new_peak).toFixed(1)} kW` },
        { label: 'Annual Savings', value: `$${calculationResult.annualSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
        { label: 'System Cost', value: `$${calculationResult.systemCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
        { label: 'Payback', value: calculationResult.paybackYears === Infinity ? 'N/A' : `${calculationResult.paybackYears.toFixed(1)} yrs` },
      ]
    : [];

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

  // Tariff engine requires billing periods to compute billing-correct savings.
  const canRun = !!loadProfile && usageProcessed && !isProcessing;
  const steps = [
    { id: 1 as const, title: 'Data Entry', desc: 'Upload data and configure project' },
    { id: 2 as const, title: 'Initial Analysis', desc: 'Peak shaving + battery selection' },
  ];

  return (
    <div className="p-6 lg:p-10 bg-gray-50 min-h-screen space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-lg hover:bg-gray-200 text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">New Battery Storage Analysis</h1>
            <p className="text-sm text-gray-600">Phase 1: Data Entry - Upload data and configure project</p>
          </div>
        </div>
      </div>

      {/* Flow stepper */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-wrap gap-3">
        {steps.map((step) => {
          const isActive = activeStep === step.id;
          const isDone = activeStep > step.id;
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`flex items-start gap-3 flex-1 min-w-[220px] text-left transition-colors ${
                isActive ? 'bg-blue-50 border border-blue-200 rounded-lg p-2' : 'p-2'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg border flex items-center justify-center text-sm font-semibold ${
                  isActive
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : isDone
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}
              >
                {step.id}
              </div>
              <div>
                <p className={`text-sm font-semibold ${isActive ? 'text-blue-900' : 'text-gray-800'}`}>{step.title}</p>
                <p className={`text-xs ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>{step.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Client Information */}
      <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wide">
        <CalendarClock className="w-4 h-4" /> Step 1: Data entry
      </div>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Client Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-700 font-medium">Client Name *</label>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Terraces of Los Gatos" />
          </div>
          <div>
            <label className="text-sm text-gray-700 font-medium">Site Location *</label>
            <input value={siteLocation} onChange={(e) => setSiteLocation(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="800 Blossom Hill Rd, Los Gatos, CA" />
          </div>
          <div>
            <label className="text-sm text-gray-700 font-medium">Electric SAID (Service Agreement ID)</label>
            <input value={serviceAgreementId} onChange={(e) => setServiceAgreementId(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="123456789" />
          </div>
          <div>
            <label className="text-sm text-gray-700 font-medium">Facility Type</label>
            <select value={facilityType} onChange={(e) => setFacilityType(e.target.value as FacilityType)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select facility type</option>
              {facilityTypes.filter(Boolean).map((ft) => (
                <option key={ft} value={ft}>{ft}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700 font-medium">California Climate Zone</label>
            <select value={climateZone} onChange={(e) => setClimateZone(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select CEC zone</option>
              {climateZones.map((cz) => (
                <option key={cz} value={cz}>{cz}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700 font-medium">PG&E Rate Schedule</label>
            <select value={rateSchedule} onChange={(e) => setRateSchedule(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select rate schedule</option>
              {rateSchedules.map((rate) => (
                <option key={rate} value={rate}>{rate}</option>
              ))}
            </select>
          </div>
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
              15-minute interval data shows peak demand patterns. Required columns: timestamp, demand_kw. Optional: energy_kwh, temperature_f, SAID. Formats: CSV, XLS, XLSX.
            </div>
            <FileUpload
              key="interval-upload"
              label="Upload Interval Data"
              description="15-minute or hourly interval readings"
              acceptedFormats=".csv,.xlsx,.xls"
              onFileSelect={(file) => {
                setError(null);
                if (!file) {
                  isSettingFileRef.current = true;
                  // Only clear if user explicitly removes it (not from a re-render)
                  // Check if we have a processed file - if so, restore it
                  if (lastProcessedIntervalFileRef.current && loadProfile) {
                    // File was cleared but we have processed data - restore the file reference
                    setIntervalFile(lastProcessedIntervalFileRef.current);
                    setTimeout(() => { isSettingFileRef.current = false; }, 100);
                    return;
                  }
                  // Otherwise, clear everything
                  setIntervalFile(null);
                  setLoadProfile(null);
                  setIntervalStats(null);
                  setOriginalPeak(0);
                  setThreshold(0);
                  lastProcessedIntervalFileRef.current = null;
                  setTimeout(() => { isSettingFileRef.current = false; }, 100);
                  return;
                }
                
                if (isFileTooLarge(file, MAX_INTERVAL_MB)) {
                  setError(`Interval file is too large. Please upload a file under ${MAX_INTERVAL_MB}MB.`);
                  return;
                }

                // Set flag to prevent the URL "reload analysis" effect from clobbering state
                isSettingFileRef.current = true;
                
                // Replace upload: reset dependent state so the new file processes cleanly
                // Clear ref for new file first
                lastProcessedIntervalFileRef.current = null;
                
                // Reset dependent state first
                setShowPhase2(false);
                setCalculationResult(null);
                setAiRecommendations([]);
                setAiSelectedBattery(null);
                setSelectedBattery(null);
                setLoadProfile(null);
                setIntervalStats(null);
                setOriginalPeak(0);
                setThreshold(0);
                
                // Set the file state (this drives the UI)
                setIntervalFile(file);
                
                // Clear flag after state has had a chance to commit
                setTimeout(() => { isSettingFileRef.current = false; }, 0);
              }}
              file={intervalFile || undefined}
            />
            <div className="flex justify-end">
              <button
                onClick={handleProcessInterval}
                disabled={!intervalFile || isProcessing}
                className={`px-5 py-2 rounded-lg font-semibold ${(!intervalFile || isProcessing) ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />}
                Validate Interval & Confirm Rows
              </button>
            </div>
            {isProcessing && intervalFile && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing interval data... Please wait.
              </div>
            )}
            {error && intervalFile && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                <p className="font-semibold">Upload Error:</p>
                <p>{error}</p>
                <p className="text-xs mt-2 text-red-700">
                  File: {intervalFile.name} ({(intervalFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}
            {intervalStats && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-800">Interval Data Processed</p>
                    <p className="text-xs text-green-700">Rows read and absorption check</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-green-600">Total Rows</p>
                    <p className="font-semibold text-green-900">{intervalStats.totalRows.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">Valid Rows</p>
                    <p className="font-semibold text-green-900">{intervalStats.validRows.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">Invalid Rows</p>
                    <p className="font-semibold text-green-900">{intervalStats.invalidRows.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">Absorbed</p>
                    <p className="font-semibold text-green-900">{intervalStats.percentageAbsorbed.toFixed(1)}%</p>
                  </div>
                </div>
                {loadProfile && (
                  <div className="border-t border-green-300 pt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-green-600">Peak Demand</p>
                      <p className="font-semibold text-green-900">
                        {originalPeak > 0 ? `${originalPeak.toFixed(1)} kW` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Intervals Processed</p>
                      <p className="font-semibold text-green-900">{loadProfile.intervals.length.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Threshold</p>
                      <p className="font-semibold text-green-900">
                        {threshold > 0 ? `${threshold.toFixed(1)} kW` : 'Auto (optimized)'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-900">
              Monthly usage validates energy patterns and demand charge percentages. Suggested columns: bill_end_date, total_usage_kwh, total_bill_amount, SAID. Formats: CSV, XLS, XLSX, PDF.
            </div>
            <FileUpload
              label="Upload Usage Data"
              description="Monthly kWh consumption and demand charges"
              acceptedFormats=".csv,.xlsx,.xls,.pdf"
              onFileSelect={(file) => {
                setError(null);
                if (!file) {
                  setUsageFile(null);
                  return;
                }
                if (isFileTooLarge(file, MAX_USAGE_MB)) {
                  setError(`Usage file is too large. Please upload a file under ${MAX_USAGE_MB}MB.`);
                  return;
                }
                // Replace upload: reset dependent state so the new file processes cleanly
                setShowPhase2(false);
                setUsageProcessed(false);
                setUsageStats(null);
                setBaselineData(null);
                setComprehensiveUsageData(null);
                setCustomerIdentifiers(null);
                setUsageFile(file);
              }}
              file={usageFile || undefined}
            />
            <div className="flex justify-end">
              <button
                onClick={handleProcessUsage}
                disabled={!usageFile || isProcessing}
                className={`px-5 py-2 rounded-lg font-semibold ${(!usageFile || isProcessing) ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />}
                Process Usage & Confirm Rows
              </button>
            </div>
            {isProcessing && usageFile && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing usage data...
              </div>
            )}
            {usageStats && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-green-800">Usage Data Processed</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
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
                {baselineData && (
                  <div className="border-t border-green-300 pt-3">
                    <p className="text-xs font-semibold text-green-700 mb-2">Baseline Analysis</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-green-600">Demand Rate</p>
                        <p className="font-semibold text-green-900">${demandRate.toFixed(2)}/kW/month</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-600">Avg Monthly Cost</p>
                        <p className="font-semibold text-green-900">${baselineData.averageMonthlyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-600">Avg Monthly Usage</p>
                        <p className="font-semibold text-green-900">{baselineData.averageMonthlyUsage.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-600">Avg Peak Demand</p>
                        <p className="font-semibold text-green-900">{baselineData.averagePeakDemand.toFixed(1)} kW</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'battery' && (
          <div className="space-y-4">
            {/* Analysis Mode Selection */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-4">
              <div>
                <label className="text-sm font-semibold text-indigo-900 mb-2 block">Analysis Mode</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setAnalysisMode('single')}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      analysisMode === 'single'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Single Battery
                  </button>
                  <button
                    onClick={() => setAnalysisMode('multi-tier')}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      analysisMode === 'multi-tier'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    AI Best Recommendation
                  </button>
                </div>
                <p className="text-xs text-indigo-700 mt-2">
                  {analysisMode === 'single'
                    ? 'Analyze a single battery configuration'
                    : 'Compare Conservative, Aggressive, and Extreme battery scenarios with defensible math'}
                </p>
              </div>

              {/* Demand Response Options */}
              <div className="border-t border-indigo-200 pt-4">
                <label className="text-sm font-semibold text-indigo-900 mb-2 block">Revenue Sources</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={demandResponseEnabled}
                      onChange={(e) => setDemandResponseEnabled(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-indigo-900">Include Demand Response Revenue</span>
                  </label>
                  {demandResponseEnabled && (
                    <div className="bg-white rounded-lg p-3 space-y-3 border border-indigo-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600">Capacity Payment ($/kW-month)</label>
                          <input
                            type="number"
                            value={demandResponseParams.capacityPaymentPerKwMonth}
                            onChange={(e) =>
                              setDemandResponseParams({
                                ...demandResponseParams,
                                capacityPaymentPerKwMonth: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full mt-1 border border-gray-300 rounded px-2 py-1 text-sm"
                            step="0.1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Event Payment Unit</label>
                          <select
                            value={demandResponseParams.paymentUnit}
                            onChange={(e) =>
                              setDemandResponseParams({
                                ...demandResponseParams,
                                paymentUnit: (e.target.value as any) || 'per_kw_event',
                              })
                            }
                            className="w-full mt-1 border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                          >
                            <option value="per_kw_event">$/kW per event</option>
                            <option value="per_kwh">$/kWh curtailed</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">
                            Event Payment ({demandResponseParams.paymentUnit === 'per_kwh' ? '$/kWh' : '$/kW per event'})
                          </label>
                          <input
                            type="number"
                            value={demandResponseParams.eventPayment}
                            onChange={(e) =>
                              setDemandResponseParams({
                                ...demandResponseParams,
                                eventPayment: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full mt-1 border border-gray-300 rounded px-2 py-1 text-sm"
                            step="0.1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Estimated Events/Year</label>
                          <input
                            type="number"
                            value={demandResponseParams.estimatedEventsPerYear}
                            onChange={(e) =>
                              setDemandResponseParams({
                                ...demandResponseParams,
                                estimatedEventsPerYear: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full mt-1 border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Minimum Commitment (kW)</label>
                          <input
                            type="number"
                            value={demandResponseParams.minimumCommitmentKw}
                            onChange={(e) =>
                              setDemandResponseParams({
                                ...demandResponseParams,
                                minimumCommitmentKw: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full mt-1 border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">
                        Typical values: Capacity $5-15/kW-month; Event $0.50-2.00/kW-event (or $/kWh varies); 10-20 events/year
                      </p>
                      {demandResponsePanel && (
                        <div className="mt-3 border-t border-gray-200 pt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                Demand Response (Optional Revenue Opportunity)
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                Enroll your battery to earn additional payments for grid support during occasional events.
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-indigo-700">
                              <span
                                title="Relative indicator (0–100) of how well this site matches Demand Response programs based on load shape, variability, and event-window performance. Higher scores indicate more reliable performance."
                              >
                                {(() => {
                                  const panelFitScore =
                                    typeof demandResponsePanel?.fit?.score === 'number'
                                      ? Number(demandResponsePanel.fit.score)
                                      : Number(demandResponsePanel.fitScore ?? 0) || 0;
                                  const panelFitLabel =
                                    demandResponsePanel?.fit?.label ??
                                    (typeof demandResponsePanel?.fitLabel === 'string'
                                      ? demandResponsePanel.fitLabel
                                      : fitScoreLabel(panelFitScore));
                                  return `DR Fit Score: ${panelFitScore.toFixed(0)}/100 (${panelFitLabel})`;
                                })()}
                              </span>
                            </p>
                          </div>
                          {(() => {
                            const panelFitReasons =
                              (Array.isArray(demandResponsePanel?.fit?.reasons) && demandResponsePanel.fit.reasons.length
                                ? demandResponsePanel.fit.reasons
                                : Array.isArray(demandResponsePanel?.fitReasons) && demandResponsePanel.fitReasons.length
                                  ? demandResponsePanel.fitReasons
                                  : Array.isArray(demandResponsePanel?.why)
                                    ? demandResponsePanel.why
                                    : []) as string[];
                            if (!panelFitReasons.length) return null;
                            return (
                              <ul className="text-xs text-gray-700 list-disc pl-4 space-y-1">
                                {panelFitReasons.slice(0, 4).map((w: string, idx: number) => (
                                  <li key={idx}>{w}</li>
                                ))}
                              </ul>
                            );
                          })()}
                          {(demandResponsePanel.deliverable || demandResponsePanel.deliverables) && (
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="bg-gray-50 rounded p-2 border">
                                <p className="text-gray-600">Ops deliverable</p>
                                <p className="font-semibold text-gray-900">
                                  {Number(
                                    demandResponsePanel.deliverable?.opsKw ??
                                      demandResponsePanel.deliverables?.deliverableOpsKw ??
                                      0
                                  ).toFixed(1)}{' '}
                                  kW
                                </p>
                              </div>
                              <div className="bg-gray-50 rounded p-2 border">
                                <p className="text-gray-600">Battery incremental</p>
                                <p className="font-semibold text-gray-900">
                                  {Number(
                                    demandResponsePanel.deliverable?.batteryKw ??
                                      demandResponsePanel.deliverables?.deliverableBatteryKw ??
                                      0
                                  ).toFixed(1)}{' '}
                                  kW
                                </p>
                              </div>
                              <div className="bg-gray-50 rounded p-2 border">
                                <p className="text-gray-600">Total firm</p>
                                <p className="font-semibold text-gray-900">
                                  {Number(
                                    demandResponsePanel.deliverable?.totalKw ??
                                      demandResponsePanel.deliverables?.deliverableTotalKw ??
                                      0
                                  ).toFixed(1)}{' '}
                                  kW
                                </p>
                              </div>
                            </div>
                          )}
                          {Array.isArray(demandResponsePanel.programs) && demandResponsePanel.programs.length > 0 && (
                            <div className="overflow-x-auto">
                              {(() => {
                                const panelFitScore =
                                  typeof demandResponsePanel?.fit?.score === 'number'
                                    ? Number(demandResponsePanel.fit.score)
                                    : Number(demandResponsePanel.fitScore ?? 0) || 0;
                                const panelFitLabel =
                                  demandResponsePanel?.fit?.label ??
                                  (typeof demandResponsePanel?.fitLabel === 'string'
                                    ? demandResponsePanel.fitLabel
                                    : fitScoreLabel(panelFitScore));
                                const panelFitReasons =
                                  (Array.isArray(demandResponsePanel?.fit?.reasons) && demandResponsePanel.fit.reasons.length
                                    ? demandResponsePanel.fit.reasons
                                    : Array.isArray(demandResponsePanel?.fitReasons) && demandResponsePanel.fitReasons.length
                                      ? demandResponsePanel.fitReasons
                                      : Array.isArray(demandResponsePanel?.why)
                                        ? demandResponsePanel.why
                                        : []) as string[];
                                const deliverableKw = Number(
                                  demandResponsePanel.deliverable?.totalKw ??
                                    demandResponsePanel.deliverables?.deliverableTotalKw ??
                                    0
                                );

                                const programs = (demandResponsePanel.programs as any[]).map((p: any) => {
                                  const v2Eligibility = p.eligibility;
                                  const v2Eligible =
                                    typeof v2Eligibility?.eligible === 'boolean' ? (v2Eligibility.eligible as boolean) : undefined;
                                  const legacyEligible = typeof p.eligible === 'boolean' ? (p.eligible as boolean) : undefined;
                                  const missingInputs = Array.isArray(v2Eligibility?.missingInputs)
                                    ? (v2Eligibility.missingInputs as string[])
                                    : [];

                                  const eligibilityBadge: 'Eligible' | 'Needs Inputs' | 'Not Eligible' =
                                    v2Eligible === true || legacyEligible === true
                                      ? 'Eligible'
                                      : v2Eligible === false && missingInputs.length > 0
                                        ? 'Needs Inputs'
                                        : 'Not Eligible';
                                  const eligible = eligibilityBadge === 'Eligible';

                                  const eligibilityReason =
                                    (Array.isArray(v2Eligibility?.reasons) && v2Eligibility.reasons[0]) ||
                                    (Array.isArray(p.eligibilityReasons) && p.eligibilityReasons[0]) ||
                                    (Array.isArray(v2Eligibility?.missingInputs) && v2Eligibility.missingInputs.length
                                      ? `Missing inputs: ${v2Eligibility.missingInputs.join(', ')}`
                                      : undefined);

                                  const m = p.money ?? undefined;

                                  const programFit = p.fit ?? undefined;
                                  const fitScore =
                                    typeof programFit?.score === 'number'
                                      ? Number(programFit.score)
                                      : Number(p.fitScore ?? panelFitScore) || panelFitScore;
                                  const fitLabel =
                                    programFit?.label ??
                                    (typeof p.fitLabel === 'string' ? p.fitLabel : panelFitLabel ?? fitScoreLabel(fitScore));
                                  const fitReasons =
                                    (Array.isArray(programFit?.reasons) && programFit.reasons.length
                                      ? programFit.reasons
                                      : Array.isArray(p.fitReasons) && p.fitReasons.length
                                        ? p.fitReasons
                                        : panelFitReasons) as string[];

                                  return {
                                    programId: String(p.program?.id ?? p.programId ?? p.programName ?? p.program?.name ?? 'program'),
                                    programName: String(p.program?.name ?? p.programName ?? 'Program'),
                                    eligible,
                                    eligibilityBadge,
                                    eligibilityReason,
                                    committedKw: Number(m?.committedKw ?? m?.committedKwRounded ?? 0) || 0,
                                    deliverableKw,
                                    annualCustomerGross: Number(m?.customerGross ?? m?.customerGrossAnnualUsd ?? 0) || 0,
                                    annualEverWattFee: Number(m?.everwattFee ?? m?.everwattFeeAnnualUsd ?? 0) || 0,
                                    fitScore,
                                    fitLabel,
                                    fitReasons,
                                  };
                                });

                                const rows = buildDrRows(programs);

                                return (
                                  <table className="w-full text-xs border border-gray-200 rounded">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="text-left p-2 border-b">Program</th>
                                        <th className="text-left p-2 border-b">Eligibility</th>
                                        <th
                                          className="text-right p-2 border-b"
                                          title="Firm kW reduction that can be committed during Demand Response events, based on conservative feasibility analysis."
                                        >
                                          Deliverable (kW)
                                        </th>
                                        <th
                                          className="text-right p-2 border-b"
                                          title="Enrollment amount used for program payments. Rounded down for reliability."
                                        >
                                          Committed (kW)
                                        </th>
                                        <th
                                          className="text-right p-2 border-b"
                                          title="Estimated annual program payments before EverWatt fees."
                                        >
                                          Gross DR ($/yr)
                                        </th>
                                        <th
                                          className="text-right p-2 border-b"
                                          title="Covers enrollment, telemetry, dispatch coordination, and performance management."
                                        >
                                          EverWatt Fee
                                        </th>
                                        <th className="text-right p-2 border-b" title="Estimated annual Demand Response revenue after fees.">
                                          Customer Net ($/yr)
                                        </th>
                                        <th
                                          className="text-right p-2 border-b"
                                          title="Relative indicator (0–100) of how well this site matches Demand Response programs based on load shape, variability, and event-window performance. Higher scores indicate more reliable performance."
                                        >
                                          Fit Score
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((r) => (
                                        <tr key={r.name} className="border-b last:border-b-0">
                                          <td className="p-2">
                                            <div className="text-gray-900">{r.name}</div>
                                            {r.footnote && <div className="text-[11px] text-gray-500 mt-0.5">{r.footnote}</div>}
                                          </td>
                                          <td className="p-2">
                                            {r.eligibilityBadge === 'Eligible' ? (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded border border-green-200 bg-green-50 text-green-800">
                                                Eligible
                                              </span>
                                            ) : r.eligibilityBadge === 'Needs Inputs' ? (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded border border-yellow-200 bg-yellow-50 text-yellow-900">
                                                Needs Inputs
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded border border-red-200 bg-red-50 text-red-800">
                                                Not Eligible
                                              </span>
                                            )}
                                          </td>
                                          <td className="p-2 text-right">{r.deliverableKw}</td>
                                          <td className="p-2 text-right">{r.committedKw}</td>
                                          <td className="p-2 text-right">{r.grossDr}</td>
                                          <td className="p-2 text-right">{r.everwattFee}</td>
                                          <td className="p-2 text-right">{r.customerNet}</td>
                                          <td className="p-2 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded border text-xs ${
                                                  r.fitLabel === 'Strong Fit'
                                                    ? 'bg-green-50 text-green-800 border-green-200'
                                                    : r.fitLabel === 'Good Fit'
                                                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                                                      : r.fitLabel === 'Marginal'
                                                        ? 'bg-yellow-50 text-yellow-900 border-yellow-200'
                                                        : 'bg-red-50 text-red-800 border-red-200'
                                                }`}
                                                title={r.fitReasons.length ? r.fitReasons.join(' • ') : undefined}
                                              >
                                                {r.fitLabel}
                                              </span>
                                              <span className="text-[11px] text-gray-600">{r.fitScore.toFixed(0)}/100</span>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                );
                              })()}
                            </div>
                          )}
                          <p className="text-xs text-gray-700">
                            Demand Response revenue is additive and assumes the committed kW can be reserved during event windows.
                          </p>
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs font-semibold text-gray-800">
                              How these numbers are calculated
                            </summary>
                            <div className="mt-2 text-xs text-gray-700 space-y-2">
                              <ul className="list-disc pl-4 space-y-1">
                                <li>Battery bill savings are computed using bill-optimized dispatch.</li>
                                <li>DR deliverable is computed using conservative, commitments-grade feasibility during event windows (P20).</li>
                                <li>DR events are occasional and may require operational coordination on event days.</li>
                              </ul>
                              <details>
                                <summary className="cursor-pointer text-xs font-semibold text-gray-800">
                                  Will Demand Response reduce my demand charge savings?
                                </summary>
                                <p className="mt-2 text-xs text-gray-700">
                                  Not in this estimate. Demand savings are calculated using normal bill-optimized dispatch. Demand Response is
                                  evaluated as an additional opportunity using conservative commitments.
                                </p>
                              </details>
                            </div>
                          </details>
                          {Boolean((demandResponsePanel as any)?.scenarios?.batteryPlusDrReserved) && (
                            <div className="mt-3 border-t border-gray-200 pt-3 space-y-2">
                              <p className="text-xs font-semibold text-gray-900">
                                Battery + Demand Response (Reserved Capacity) <span className="text-gray-600">(More conservative, commitments-grade)</span>
                              </p>
                              <p className="text-xs text-gray-700">
                                This scenario reserves part of the battery for Demand Response events, which may slightly reduce peak-shaving
                                savings but reflects how the system would be operated during DR enrollment.
                              </p>
                              <details>
                                <summary className="cursor-pointer text-xs font-semibold text-gray-800">How this scenario is calculated</summary>
                                <div className="mt-2 text-xs text-gray-700 space-y-2">
                                  <p>
                                    Battery + DR (Reserved Capacity) assumes a portion of the battery is reserved during Demand Response event windows
                                    to ensure the committed kW can be delivered reliably.
                                  </p>
                                  <ul className="list-disc pl-4 space-y-1">
                                    <li>Battery dispatch is recomputed with a DR reserve constraint during event hours</li>
                                    <li>Demand Response deliverable kW reflects commitments-grade feasibility</li>
                                    <li>Peak demand savings may be lower than the “Battery-only” scenario</li>
                                    <li>Total value reflects bill savings + DR payments, not double-counted</li>
                                  </ul>
                                  <p>This scenario represents how the system would be operated if Demand Response enrollment is contractually binding.</p>
                                </div>
                              </details>
                              <p className="text-[11px] text-gray-600">
                                Actual results depend on event frequency, operational coordination, and final program rules. This scenario prioritizes
                                reliability over maximum theoretical savings.
                              </p>
                            </div>
                          )}
                          <p className="text-[11px] text-gray-500">
                            Fee model: hybrid = max($
                            {Number(demandResponsePanel?.feeModel?.feePerKwYear ?? demandResponsePanel?.feeModel?.feePerKwYear ?? 30).toFixed(0)}
                            /kW-year,{` `}
                            {Math.round(Number(demandResponsePanel?.feeModel?.feePct ?? 0.2) * 100)}% of DR gross).
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Single Battery Mode */}
            {analysisMode === 'single' && (
              <div className="flex items-center justify-between">
                <div>
                  {aiSelectedBattery && selectedBattery === aiSelectedBattery ? (
                    <div>
                      <p className="text-sm font-semibold text-blue-600 flex items-center gap-2">
                        <Rocket className="w-4 h-4" />
                        AI Selected: {aiSelectedBattery.modelName} by {aiSelectedBattery.manufacturer}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Best payback period based on your peak demand profile. You can override this selection below.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600">AI recommended battery models based on your data.</p>
                      <p className="text-xs text-gray-500">Select a model or adjust quantity.</p>
                    </div>
                  )}
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
            )}

            {/* AI Best Recommendation Mode Info */}
            {analysisMode === 'multi-tier' && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <p className="text-sm font-semibold text-purple-900">AI Best Recommendation</p>
                </div>
                <p className="text-xs text-purple-800 mb-3">
                  The AI will evaluate multiple battery configurations using physics-based calculations and select the single best option based on:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-purple-800">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>ROI & Payback Period</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>10-Year NPV</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Cost Efficiency</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Peak Reduction</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Accuracy & Confidence</span>
                  </div>
                </div>
                <p className="text-xs text-purple-700 mt-3 font-semibold">
                  All calculations use defensible math and physics - no fake computations.
                </p>
              </div>
            )}

            {isRecommending && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                AI is analyzing your peak demand and selecting the optimal battery...
              </div>
            )}

            {aiRecommendations.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-green-800">AI Top Picks (sorted by best payback)</p>
                  <p className="text-xs text-green-700">Charts reflect the selected pick.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {aiRecommendations.slice(0, 3).map((rec, idx) => {
                    const hasPortfolio = Array.isArray((rec as any).portfolio) && (rec as any).portfolio.length > 0;
                    const matching = hasPortfolio
                      ? null
                      : batteries.find((b) => b.modelName === rec.modelName && b.manufacturer === rec.manufacturer);
                    const isSelected = selectedAiRecommendation
                      ? selectedAiRecommendation.modelName === rec.modelName && selectedAiRecommendation.manufacturer === rec.manufacturer
                      : (matching &&
                          selectedBattery &&
                          matching.modelName === selectedBattery.modelName &&
                          matching.manufacturer === selectedBattery.manufacturer);
                    const displaySavings = rec.best?.annualSavings ?? rec.annualSavings;
                    const displayPayback = rec.best?.paybackYears ?? rec.paybackYears;
                    const bestMode = rec.best?.mode ?? 'STANDARD';
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedAiRecommendation(rec);
                          if (typeof (rec as any).thresholdKw === 'number' && (rec as any).thresholdKw > 0) {
                            setThreshold((rec as any).thresholdKw);
                          } else {
                            // Let backend optimize if not provided
                            setThreshold(0);
                          }
                          if (matching) {
                            setSelectedBattery(matching);
                            setAiSelectedBattery(matching);
                          } else {
                            // Portfolio selection
                            setSelectedBattery(null);
                            setAiSelectedBattery(null);
                          }
                        }}
                        className={`text-left rounded-lg border p-3 transition-all ${
                          isSelected ? 'border-green-500 bg-white shadow-sm' : 'border-green-200 bg-white/70 hover:shadow'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-green-800">#{idx + 1} {rec.modelName}</p>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                        </div>
                        <p className="text-[11px] text-green-700">{hasPortfolio ? 'Portfolio' : rec.manufacturer}</p>
                        {bestMode === 'S_RATE' && (
                          <div className="mt-1 inline-flex text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                            Best via Option S
                          </div>
                        )}
                        {hasPortfolio && (
                          <div className="mt-2 text-[10px] text-gray-600 space-y-1">
                            {(rec as any).portfolio.slice(0, 3).map((u: any, i: number) => (
                              <div key={i}>
                                {u.quantity}× {u.modelName} ({u.unitPowerKw}kW / {u.unitCapacityKwh}kWh)
                              </div>
                            ))}
                            {(rec as any).portfolio.length > 3 && (
                              <div>+{(rec as any).portfolio.length - 3} more</div>
                            )}
                            {rec.pricingTier && <div>Tier: {rec.pricingTier}</div>}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-700 mt-2">
                          <div>
                            <p className="text-gray-500">Peak reduction</p>
                            <p className="font-semibold">{rec.peakReductionKw.toFixed(1)} kW</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Annual savings</p>
                            <p className="font-semibold">${displaySavings.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">System cost</p>
                            <p className="font-semibold">${rec.systemCost.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Payback</p>
                            <p className="font-semibold">{displayPayback.toFixed(1)} yrs</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2">Click to preview/compare; charts use selected.</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {loadingBatteries && <div className="text-sm text-gray-600 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading battery catalog...</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {batteryCards.map((card) => (
                <button
                  key={card.key}
                  onClick={() => {
                    setSelectedAiRecommendation(null);
                    setSelectedBattery(card.data);
                    setAiSelectedBattery(card.data);
                  }}
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
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Upload both interval and usage data to run S-Rate eligibility and savings. Typical additional savings: $20k - $50k annually.
              </p>
              {!loadProfile || !usageProcessed ? (
                <p className="text-xs text-amber-700 mt-2">Not enough data yet. Process interval + usage to unlock S-Rate analysis.</p>
              ) : (
                <p className="text-xs text-green-700 mt-2">Ready to run S-Rate once you click “Run Analysis”.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs font-semibold text-gray-800 uppercase tracking-wide">
        <BarChart3 className="w-4 h-4" /> Step 2: Initial system analysis
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="text-sm text-gray-600">
          {!loadProfile && 'Process interval data. '}
          {!usageProcessed && 'Process usage data to calculate billing-cycle savings (required). '}
          {!selectedBattery && 'AI will select optimal battery or choose manually. '}
          {loadProfile && (selectedBattery || selectedAiRecommendation) && 'Ready to run analysis.'}
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">Cancel</button>
          <button
            onClick={async () => {
              try {
                await saveProjectData({
                  intervalData: loadProfile ? {
                    intervals: loadProfile.intervals,
                    statistics: intervalStats,
                    peakKw: loadProfile.intervals.reduce((max, i) => Math.max(max, i.kw), 0),
                  } : undefined,
                  usageData: usageProcessed ? {
                    demandRate,
                    baseline: baselineData,
                    statistics: usageStats,
                  } : undefined,
                  selectedBattery: selectedBattery ? {
                    modelName: selectedBattery.modelName,
                    manufacturer: selectedBattery.manufacturer,
                    capacityKwh: selectedBattery.capacityKwh,
                    powerKw: selectedBattery.powerKw,
                  } : undefined,
                  calculationResult,
                });
                toast({ type: 'success', message: 'Project saved successfully.' });
              } catch (err) {
                logger.error('Save project error:', err);
                toast({ type: 'error', title: 'Save failed', message: 'Failed to save project.' });
              }
            }}
            disabled={!loadProfile && !usageProcessed}
            className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${(loadProfile || usageProcessed) ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-500'}`}
          >
            <Save className="w-4 h-4" /> Save Project
          </button>
          <button
            onClick={handleCalculate}
            disabled={!canRun}
            className={`px-5 py-2 rounded-lg font-semibold flex items-center gap-2 ${canRun ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500'}`}
          >
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />} Run Analysis
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">{error}</div>
      )}
      {warning && !error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 text-sm">{warning}</div>
      )}

      {/* Phase 2 Results Page - Full analysis with CVRMSE, S-Rate comparison, AI insights */}
      {/* AI Best Recommendation */}
      {multiTierResults && multiTierResults.bestRecommendation && (
        <div className="space-y-6">
          <BestRecommendation
            originalPeakKw={multiTierResults.bestRecommendation.originalPeakKw}
            recommendation={multiTierResults.bestRecommendation.recommendation}
            onSelect={() => {
              // Update calculationResult to show the AI's best recommendation
              const recommendation = multiTierResults.bestRecommendation.recommendation;
              const result = {
                original_peak: multiTierResults.bestRecommendation.originalPeakKw,
                new_peak: recommendation.simulationResult.new_peak,
                savings_kwh: recommendation.simulationResult.savings_kwh,
                energy_discharged: recommendation.simulationResult.energy_discharged,
                energy_charged: recommendation.simulationResult.energy_charged,
                battery_soc_history: recommendation.simulationResult.chartData.socHistory,
                new_intervals_kw: recommendation.simulationResult.chartData.afterKw,
                final_load_profile: {
                  intervals: recommendation.simulationResult.chartData.intervals.map((i: { timestamp: string; kw: number }) => ({
                    timestamp: new Date(i.timestamp),
                    kw: i.kw,
                  })),
                },
              } as SimulationResult;

              setCalculationResult({
                result,
                battery: recommendation.batterySpec,
                batteryInfo: {
                  modelName: recommendation.batteryInfo.modelName,
                  manufacturer: recommendation.batteryInfo.manufacturer,
                  capacityKwh: recommendation.batteryInfo.totalCapacityKwh,
                  powerKw: recommendation.batteryInfo.totalPowerKw,
                  efficiency: recommendation.batterySpec.round_trip_efficiency,
                  warrantyYears: 10,
                } as CatalogBatteryRow,
                threshold: recommendation.thresholdKw,
                demandRate,
                annualSavings: recommendation.financials.annualSavings,
                systemCost: recommendation.batteryInfo.systemCost,
                effectiveCost: recommendation.batteryInfo.systemCost,
                paybackYears: recommendation.financials.paybackYears,
              });
            }}
          />
        </div>
      )}

      {showPhase2 && calculationResult && loadProfile && (selectedBattery || selectedAiRecommendation || multiTierResults) && (
        <Phase2ResultsPage
          customerInfo={{
            billingName: customerIdentifiers?.billingName || clientName || 'Unknown Customer',
            siteAddress: customerIdentifiers?.siteAddress || siteLocation || 'Unknown Location',
            saId: customerIdentifiers?.saId || serviceAgreementId || 'N/A',
            accountNumber: customerIdentifiers?.accountNumber || 'N/A',
            meterNumber: customerIdentifiers?.meterNumber || 'N/A',
            rateCode: customerIdentifiers?.rateCode || rateSchedule || 'Unknown',
            serviceProvider: customerIdentifiers?.serviceProvider,
          }}
          intervalData={loadProfile.intervals.map(i => ({
            timestamp: i.timestamp,
            kw: i.kw,
          }))}
          usageData={comprehensiveUsageData || []}
          battery={selectedBattery ? {
            modelName: selectedBattery.modelName,
            manufacturer: selectedBattery.manufacturer,
            capacityKwh: selectedBattery.capacityKwh,
            powerKw: selectedBattery.powerKw,
            efficiency: selectedBattery.efficiency,
            warranty: selectedBattery.warrantyYears,
            price: calculationResult.systemCost,
          } : (calculationResult.batteryInfo ? {
            modelName: calculationResult.batteryInfo.modelName,
            manufacturer: calculationResult.batteryInfo.manufacturer,
            capacityKwh: calculationResult.batteryInfo.capacityKwh,
            powerKw: calculationResult.batteryInfo.powerKw,
            efficiency: calculationResult.batteryInfo.efficiency,
            warranty: calculationResult.batteryInfo.warrantyYears || 10,
            price: calculationResult.systemCost,
          } : {
            modelName: 'Unknown',
            manufacturer: 'Unknown',
            capacityKwh: 0,
            powerKw: 0,
            efficiency: 0.9,
            warranty: 10,
            price: calculationResult.systemCost,
          })}
          simulationResult={{
            originalPeak: calculationResult.result.original_peak,
            newPeak: calculationResult.result.new_peak,
            peakReduction: calculationResult.result.original_peak - calculationResult.result.new_peak,
            peakReductionPercent: ((calculationResult.result.original_peak - calculationResult.result.new_peak) / calculationResult.result.original_peak) * 100,
            threshold: calculationResult.threshold,
            finalLoadProfile: calculationResult.result.final_load_profile?.intervals?.map((i) => ({
              timestamp: i.timestamp,
              kw: i.kw,
            })),
          }}
          financials={{
            demandRate: calculationResult.demandRate,
            annualSavings: calculationResult.annualSavings,
            systemCost: calculationResult.systemCost,
            effectiveCost: calculationResult.effectiveCost,
            paybackYears: calculationResult.paybackYears,
          }}
        />
      )}

      {/* Basic Results Summary (fallback if Phase 2 data not ready) */}
      {calculationResult && !showPhase2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                <p className="text-xl font-bold text-gray-900">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Demand Profile Comparison</h3>
              <ChartViewToggle
                value={chartViewMode}
                onChange={setChartViewMode}
                availableModes={['raw', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'peaks', 'lows']}
              />
            </div>
            <DemandProfileChart
              data={getAggregatedChartData(chartData, chartViewMode).map((d) => ({
                time: d.label,
                demand: d.demand,
                afterBattery: d.afterBattery,
              }))}
              height={360}
            />
          </div>

          {calculationResult.result.battery_soc_history && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Battery State of Charge (SOC)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData.filter((d) => d.soc !== null)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} interval="preserveStartEnd" />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} domain={[0, 100]} label={{ value: 'SOC (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'SOC']} />
                  <Area type="monotone" dataKey="soc" stroke="#f59e0b" fill="#fbbf24" fillOpacity={0.6} strokeWidth={2} name="SOC" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {analysisResults && calculationResult?.battery && (
            (() => {
              // Use backend-computed results (no client-side calculations)
              const { diagnostic, peakEvents, chartData } = analysisResults;
              
              // Convert downsampled chart data to LoadInterval format for charts
              const chartIntervals = chartData.intervals.map(i => ({
                timestamp: new Date(i.timestamp),
                kw: i.kw,
              }));

              // Create a simulation result compatible object for chart components
              const chartSimulationResult = {
                ...calculationResult.result,
                new_intervals_kw: chartData.afterKw,
                battery_soc_history: chartData.socHistory,
                final_load_profile: {
                  intervals: chartIntervals,
                },
              } as SimulationResult;

              return (
                <div className="space-y-6">
                  <BatteryReasonBadges diagnostic={diagnostic} />
                  <BatteryUtilizationGauges diagnostic={diagnostic} />
                  <ConstraintWaterfallChart diagnostic={diagnostic} />
                  <PeakEventTimeline
                    intervals={chartIntervals}
                    peakEvents={peakEvents}
                    socHistory={chartData.socHistory}
                    simulationResult={chartSimulationResult}
                    height={320}
                  />
                  <PeakEventScatterPlot
                    peakEvents={peakEvents}
                    intervals={chartIntervals}
                    simulationResult={chartSimulationResult}
                    battery={calculationResult.battery}
                    thresholdKw={calculationResult.threshold}
                    height={280}
                  />
                  <BatteryPerformanceHeatmap
                    intervals={chartIntervals}
                    simulationResult={chartSimulationResult}
                    thresholdKw={calculationResult.threshold}
                    mode="discharge"
                  />
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Next: Financial add-ons & ROI (separate page) */}
      {calculationResult && projectId && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Step 3: Financials</p>
            <p className="text-sm text-gray-600">
              Proceed to add-ons, markup, CEFO, and financing. The selected battery’s savings stay fixed.
            </p>
          </div>
          <button
            onClick={() => navigate(`/calculator/battery/financials?analysisId=${encodeURIComponent(projectId)}`)}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
          >
            Continue to Financials
          </button>
        </div>
      )}
    </div>
  );
};
