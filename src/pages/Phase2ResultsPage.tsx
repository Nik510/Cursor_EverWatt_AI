/**
 * Phase 2 Results Page - COMPREHENSIVE BATTERY ANALYSIS
 * 
 * PHASE 2: Feasibility & Savings (locked savings from analysis)
 * PHASE 3: Markup & ROI (tweak pricing / margin)
 * PHASE 3: Full Report with AI (future)
 * 
 * All graphs use REAL data from the interval/usage files
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Award,
  Battery,
  BatteryCharging,
  Brain,
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Download,
  Edit3,
  Gauge,
  Lightbulb,
  Settings,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
  BarChart3,
  Cpu,
  Building,
} from 'lucide-react';
import {
  Area,
  BarChart,
  Bar,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceLine,
  Scatter,
} from 'recharts';
import { AnalysisQABot } from '../components/AnalysisQABot';
import { calculateOptionSDemandCharges, DEFAULT_OPTION_S_RATES_2025_SECONDARY, simulateBatteryDispatchWithSRate } from '../utils/battery/s-rate-calculations';
import { fetchAiHealth, fetchExecutiveNarrative } from '../services/ai-insights-client';
import type { SectionInsight } from '../types/ai-insights';
import { SectionCard } from '../components/SectionCard';
import { checkSRateEligibility, isAlreadyOnOptionS } from '../utils/rates/s-rate-eligibility';
import { getRateByCode } from '../utils/rates/storage';
import type { UtilityProvider } from '../utils/rates/types';
import type { LoadProfile } from '../modules/battery/types';
import type { BatterySpec, SimulationResult } from '../modules/battery/types';
// All calculations moved to backend - see /api/batteries/analyze endpoint
import { BatteryUtilizationGauges } from '../components/charts/BatteryUtilizationGauges';
import { ConstraintWaterfallChart } from '../components/charts/ConstraintWaterfallChart';
import { PeakEventTimeline } from '../components/charts/PeakEventTimeline';
import { PeakEventScatterPlot } from '../components/charts/PeakEventScatterPlot';
import { BatteryPerformanceHeatmap } from '../components/charts/BatteryPerformanceHeatmap';
import { BatteryReasonBadges } from '../components/BatteryReasonBadges';
import { buildReportViewModel, diffHeadline, type BatteryAnalysisManifest, type BatteryAnalysisResultEnvelope } from '../utils/battery/report-vm';
import { exportBatteryCustomerSummaryPdf, exportBatteryFullPdf } from '../utils/battery/report-pdf';

// ============================================
// COLORS
// ============================================
const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  teal: '#14b8a6',
  orange: '#f97316',
  gray: '#6b7280',
  before: '#ef4444',
  after: '#10b981',
  shaved: '#fbbf24',
};

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================
// UTILITY FUNCTIONS
// ============================================
const formatCurrency = (value: number, decimals = 0): string => {
  return '$' + value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const formatPercent = (value: number, decimals = 1): string => {
  return value.toFixed(decimals) + '%';
};

// ============================================
// OPTION S NOTE
// ============================================
// Option S is a different schedule (e.g. B-19S). Customers already on a schedule ending in "S"
// should not be treated as “eligible to switch” because they are already enrolled.

// ============================================
// AI INSIGHT COMPONENT
// ============================================
const AIInsight: React.FC<{
  title: string;
  engineerInsight: string;
  salesInsight: string;
  recommendations?: string[];
}> = ({ title, engineerInsight, salesInsight, recommendations }) => {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mt-4">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <span className="font-semibold text-purple-900">AI Insights: {title}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <div className="mt-4 space-y-3">
          <div className="bg-white rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">For Engineers</span>
            </div>
            <p className="text-sm text-gray-700">{engineerInsight}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800">For Sales</span>
            </div>
            <p className="text-sm text-gray-700">{salesInsight}</p>
          </div>
          {recommendations && (
            <div className="bg-white rounded-lg p-3 border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">Recommendations</span>
              </div>
              <ul className="text-sm text-gray-700 space-y-1">
                {recommendations.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// METRIC CARD COMPONENT
// ============================================
const MetricCard: React.FC<{
  label: string;
  value: string | number;
  subtext?: string;
  status?: 'good' | 'warning' | 'danger' | 'neutral';
  icon?: React.ReactNode;
}> = ({ label, value, subtext, status = 'neutral', icon }) => {
  const statusColors = {
    good: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
    neutral: 'bg-gray-50 border-gray-200 text-gray-800',
  };
  
  return (
    <div className={`rounded-xl border-2 p-4 ${statusColors[status]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium opacity-75">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtext && <div className="text-xs opacity-60 mt-1">{subtext}</div>}
    </div>
  );
};

// ============================================
// PROPS INTERFACE
// ============================================
interface Phase2ResultsProps {
  customerInfo: {
    billingName: string;
    siteAddress: string;
    saId: string;
    accountNumber: string;
    meterNumber: string;
    rateCode: string;
    serviceProvider?: string;
    facilityType?: string;
    rateSchedule?: string;
    climateZone?: string;
  };
  intervalData: Array<{ timestamp: Date | string | number; kw: number | string }>;
  usageData: Array<{
    billEndDate: Date | string | number;
    totalUsageKwh: number | string;
    peakDemandKw: number | string;
    totalCost: number | string;
    onPeakKwh?: number;
    partialPeakKwh?: number;
    offPeakKwh?: number;
    superOffPeakKwh?: number;
  }>;
  battery: {
    modelName: string;
    manufacturer: string;
    capacityKwh: number | string;
    powerKw: number | string;
    efficiency: number | string; // 0..1
    warranty: number | string;
    price: number | string;
  };
  simulationResult: {
    originalPeak: number | string;
    newPeak: number | string;
    peakReduction: number | string;
    peakReductionPercent: number | string;
    threshold?: number | string;
    /** Optional: SOC series (0..1) aligned to the interval series. */
    batterySocHistory?: number[];
    /** Optional: post-dispatch kW series aligned to baseline. */
    newIntervalsKw?: number[];
    finalLoadProfile?: Array<{ timestamp: Date | string | number; kw: number | string }>;
  };
  financials: {
    demandRate: number | string;
    annualSavings: number | string;
    systemCost: number | string;
    effectiveCost: number | string;
    paybackYears: number | string;
    cefoLoan?: number | string;
  };
}

// ============================================
// MAIN COMPONENT
// ============================================
export const Phase2ResultsPage: React.FC<Partial<Phase2ResultsProps>> = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { session } = useAdmin();
  const adminToken = session?.token || '';

  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    fetchAiHealth()
      .then((d) => setAiConfigured(!!d.configured))
      .catch(() => setAiConfigured(false));
  }, []);

  const hasDirectProps =
    !!(props as any).customerInfo &&
    Array.isArray((props as any).intervalData) &&
    Array.isArray((props as any).usageData) &&
    !!(props as any).battery &&
    !!(props as any).simulationResult &&
    !!(props as any).financials;

  const [loadedData, setLoadedData] = useState<Phase2ResultsProps | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Backend-computed comprehensive analysis results
  const [backendAnalysis, setBackendAnalysis] = useState<{
    diagnostic: any;
    peakEvents: any[];
    peakPatterns: any;
    peakFrequency: any;
    usageOptimization: any;
    sizingRecommendation: any;
    chartData: {
      intervals: Array<{ timestamp: string; kw: number }>;
      afterKw: number[];
      socHistory: number[];
    };
  } | null>(null);
  const [isComputingAnalysis] = useState(false);
  const [persistedRun, setPersistedRun] = useState<{
    manifest: BatteryAnalysisManifest;
    inputs: any;
    envelope: BatteryAnalysisResultEnvelope;
    previous?: { manifest: BatteryAnalysisManifest; inputs: any; envelope: BatteryAnalysisResultEnvelope } | null;
  } | null>(null);
  const [showRunDetails, setShowRunDetails] = useState(false);

  const analysisId =
    searchParams.get('analysisId') ||
    ((location.state as any)?.analysisId as string | undefined) ||
    localStorage.getItem('latest_analysis_id') ||
    null;

  // (Print-mode export removed) — PDFs are generated from the persisted analysis_result.json
  // via buildReportViewModel() so UI + PDFs cannot diverge.

  const mapAnalysisToPhase2 = (analysis: any): Phase2ResultsProps => {
    const report = analysis?.analysisReportData || {};
    const ci = analysis?.customerInfo || {};
    const intervalRaw = Array.isArray(analysis?.intervalData)
      ? analysis.intervalData
      : Array.isArray(report?.intervalData)
        ? report.intervalData
        : [];
    const usageRaw = Array.isArray(analysis?.usageData)
      ? analysis.usageData
      : Array.isArray(report?.usageData)
        ? report.usageData
        : [];

    const selectedBattery =
      analysis?.selectedBattery ||
      analysis?.battery ||
      report?.selectedBattery ||
      report?.battery ||
      report?.calculationResult?.batteryInfo ||
      {};
    const calc =
      analysis?.calculationResult ||
      report?.calculationResult ||
      analysis?.simulationResult ||
      report?.simulationResult ||
      {};

    const intervalData = intervalRaw.map((r: any) => ({
      timestamp: r.timestamp ?? r.date ?? r.time ?? r.billEndDate ?? new Date().toISOString(),
      kw: r.kw ?? r.demand ?? r.usage_kw ?? r.value ?? 0,
    }));

    const usageData = usageRaw.map((r: any) => ({
      billEndDate: r.billEndDate ?? r.date ?? r.endDate ?? new Date().toISOString(),
      totalUsageKwh: r.totalUsageKwh ?? r.usageKwh ?? r.kwh ?? 0,
      peakDemandKw: r.peakDemandKw ?? r.demandKw ?? r.kw ?? 0,
      totalCost: r.totalCost ?? r.cost ?? 0,
      onPeakKwh: r.onPeakKwh,
      partialPeakKwh: r.partialPeakKwh,
      offPeakKwh: r.offPeakKwh,
      superOffPeakKwh: r.superOffPeakKwh,
    }));

    const customerInfo = {
      billingName: ci.billingName || ci.companyName || ci.name || '',
      siteAddress: ci.siteAddress || ci.address || ci.siteLocation || '',
      saId: ci.saId || ci.serviceAgreementId || '',
      accountNumber: ci.accountNumber || '',
      meterNumber: ci.meterNumber || '',
      rateCode: ci.rateCode || ci.rateSchedule || '',
      serviceProvider: ci.utilityCompany || ci.serviceProvider || ci.utility || '',
      facilityType: ci.facilityType || ci.facility || '',
      rateSchedule: ci.rateSchedule || ci.rateCode || '',
      climateZone: ci.climateZone || '',
    };

    const battery = {
      modelName: selectedBattery.modelName || '',
      manufacturer: selectedBattery.manufacturer || '',
      capacityKwh: selectedBattery.capacityKwh || selectedBattery.sizeKwh || 0,
      powerKw: selectedBattery.powerKw || selectedBattery.maxPowerKw || 0,
      efficiency: selectedBattery.efficiency || selectedBattery.roundTripEfficiency || 0.9,
      warranty: selectedBattery.warranty || selectedBattery.warrantyYears || 10,
      price: selectedBattery.price || selectedBattery.systemCost || 0,
      quantity: selectedBattery.quantity || selectedBattery.qty || 1,
    };

    const simulationResult = {
      originalPeak: calc.originalPeak ?? calc.original_peak ?? calc?.result?.original_peak ?? 0,
      newPeak: calc.newPeak ?? calc.new_peak ?? calc?.result?.new_peak ?? 0,
      peakReduction:
        calc.peakReduction ??
        ((calc.originalPeak ?? calc.original_peak ?? calc?.result?.original_peak ?? 0) -
          (calc.newPeak ?? calc.new_peak ?? calc?.result?.new_peak ?? 0)),
      peakReductionPercent:
        calc.peakReductionPercent ??
        ((): number => {
          const op = Number(calc.originalPeak ?? calc.original_peak ?? calc?.result?.original_peak ?? 0);
          const np = Number(calc.newPeak ?? calc.new_peak ?? calc?.result?.new_peak ?? 0);
          const pr = Number(calc.peakReduction ?? (op - np));
          return op > 0 ? (pr / op) * 100 : 0;
        })(),
      threshold: calc.threshold ?? calc?.result?.threshold ?? undefined,
      batterySocHistory: Array.isArray(calc?.battery_soc_history)
        ? calc.battery_soc_history
        : Array.isArray(calc?.result?.battery_soc_history)
          ? calc.result.battery_soc_history
          : undefined,
      newIntervalsKw: Array.isArray(calc?.new_intervals_kw)
        ? calc.new_intervals_kw
        : Array.isArray(calc?.result?.new_intervals_kw)
          ? calc.result.new_intervals_kw
          : undefined,
      finalLoadProfile:
        calc.finalLoadProfile ??
        // Some callers store `{ final_load_profile: { intervals: [...] } }`
        (calc.final_load_profile?.intervals ?? calc.final_load_profile) ??
        calc?.result?.final_load_profile?.intervals ??
        undefined,
    };

    const financials = {
      demandRate: calc.demandRate ?? report?.financials?.demandRate ?? 0,
      annualSavings: calc.annualSavings ?? report?.financials?.annualSavings ?? 0,
      systemCost: calc.systemCost ?? report?.financials?.systemCost ?? battery.price ?? 0,
      effectiveCost: calc.effectiveCost ?? report?.financials?.effectiveCost ?? calc.systemCost ?? battery.price ?? 0,
      paybackYears: calc.paybackYears ?? report?.financials?.paybackYears ?? 0,
      cefoLoan: calc.cefoLoan ?? report?.financials?.cefoLoan ?? 0,
    };

    return { customerInfo, intervalData, usageData, battery, simulationResult, financials };
  };

  const mapPersistedRunToPhase2 = (run: {
    manifest: BatteryAnalysisManifest;
    inputs: any;
    envelope: BatteryAnalysisResultEnvelope;
  }): Phase2ResultsProps => {
    const vm = buildReportViewModel({ manifest: run.manifest, envelope: run.envelope });
    const inputs = run.inputs || {};
    const intervalsRaw = Array.isArray(inputs.intervals) ? inputs.intervals : [];
    const billsRaw = Array.isArray(inputs.usageData) ? inputs.usageData : [];
    const ciRaw = inputs.customerInfo || run.envelope.customerInfo || {};
    const meta = run.envelope.batteryMeta || inputs.batteryMeta || {};
    const result = run.envelope.result || {};

    const intervalData = intervalsRaw.map((i: any) => ({
      timestamp: new Date(i.timestamp),
      kw: Number(i.kw) || 0,
      temperature: typeof i.temperature === 'number' ? i.temperature : undefined,
    }));

    const usageData = billsRaw.map((b: any) => ({
      billEndDate: b.billEndDate ?? b.date ?? b.endDate ?? new Date().toISOString(),
      totalUsageKwh: Number(b.totalUsageKwh ?? b.kwh ?? 0) || 0,
      peakDemandKw: Number(b.peakDemandKw ?? b.kw ?? 0) || 0,
      totalCost: Number(b.totalCost ?? b.cost ?? 0) || 0,
      onPeakKwh: b.onPeakKwh,
      partialPeakKwh: b.partialPeakKwh,
      offPeakKwh: b.offPeakKwh,
      superOffPeakKwh: b.superOffPeakKwh,
    }));

    const customerInfo = {
      billingName: ciRaw.billingName || ciRaw.companyName || '',
      siteAddress: ciRaw.siteAddress || ciRaw.siteLocation || '',
      saId: ciRaw.saId || ciRaw.serviceAgreementId || '',
      accountNumber: ciRaw.accountNumber || '',
      meterNumber: ciRaw.meterNumber || '',
      rateCode: ciRaw.rateCode || ciRaw.rateSchedule || vm.rateCode || '',
      serviceProvider: ciRaw.serviceProvider || '',
      facilityType: ciRaw.facilityType || '',
      rateSchedule: ciRaw.rateSchedule || ciRaw.rateCode || '',
      climateZone: ciRaw.climateZone || '',
    };

    const battery = {
      modelName: meta.modelName || meta.label || vm.batteryLabel || 'Battery',
      manufacturer: meta.manufacturer || (meta.portfolio ? 'Portfolio' : '') || '',
      capacityKwh: Number(meta.totalCapacityKwh ?? meta.capacityKwh ?? vm.totalKwh ?? 0) || 0,
      powerKw: Number(meta.totalPowerKw ?? meta.powerKw ?? vm.totalKw ?? 0) || 0,
      efficiency: Number(meta.efficiency ?? 0.9) || 0.9,
      warranty: Number(meta.warrantyYears ?? 10) || 10,
      price: Number(meta.systemCost ?? vm.systemCost ?? 0) || 0,
      quantity: Number(meta.totalUnits ?? meta.quantity ?? 1) || 1,
    };

    const sim = result.simulationResult || {};
    const chart = sim.chartData || {};
    const originalPeak = Number(sim.original_peak ?? 0) || 0;
    const newPeak = Number(sim.new_peak ?? 0) || 0;
    const threshold = Number(result.thresholdKw ?? run.manifest.thresholdKw ?? 0) || 0;

    const simulationResult = {
      originalPeak,
      newPeak,
      peakReduction: originalPeak - newPeak,
      peakReductionPercent: originalPeak > 0 ? ((originalPeak - newPeak) / originalPeak) * 100 : 0,
      threshold,
      batterySocHistory: Array.isArray(chart.socHistory) ? chart.socHistory : undefined,
      newIntervalsKw: Array.isArray(chart.afterKw) ? chart.afterKw : undefined,
      finalLoadProfile: Array.isArray(chart.intervals) ? chart.intervals : undefined,
    };

    const financials = {
      demandRate: vm.demandRatePerKwMonth,
      annualSavings: vm.annualSavings,
      systemCost: vm.systemCost,
      effectiveCost: vm.systemCost,
      paybackYears: vm.paybackYears,
      cefoLoan: 0,
    };

    return { customerInfo, intervalData, usageData, battery, simulationResult, financials };
  };

  useEffect(() => {
    if (hasDirectProps) return;
    if (!analysisId) return;

    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const res = await fetch(`/api/analyses/${analysisId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || `Failed to load analysis (${res.status})`);
        }
        const mapped = mapAnalysisToPhase2(data.analysis);
        if (!cancelled) setLoadedData(mapped);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load analysis');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [analysisId, hasDirectProps]);

  // When a persisted run exists, prefer it as the single source of truth.
  useEffect(() => {
    if (hasDirectProps) return;
    if (!persistedRun) return;
    try {
      const mapped = mapPersistedRunToPhase2(persistedRun);
      setLoadedData(mapped);
      setLoadError(null);
    } catch (e) {
      // If persisted snapshot is malformed, fall back to legacy analysis mapping.
    }
  }, [persistedRun, hasDirectProps]);

  // Load persisted battery run snapshot (source of truth for UI + PDFs)
  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;
    (async () => {
      try {
        const latestRes = await fetch(`/api/analyses/${encodeURIComponent(analysisId)}/battery-run/latest`);
        const latestJson = await latestRes.json().catch(() => ({}));
        if (!latestRes.ok || !latestJson?.success) {
          if (!cancelled) setPersistedRun(null);
          return;
        }
        const manifest = latestJson.manifest as BatteryAnalysisManifest;
        const inputs = latestJson.inputs ?? null;
        const envelope = latestJson.result as BatteryAnalysisResultEnvelope;

        // previous is optional; use for diff panel
        let previous: any = null;
        try {
          const prevRes = await fetch(`/api/analyses/${encodeURIComponent(analysisId)}/battery-run/previous`);
          const prevJson = await prevRes.json().catch(() => ({}));
          if (prevRes.ok && prevJson?.success) {
            previous = {
              manifest: prevJson.manifest as BatteryAnalysisManifest,
              inputs: prevJson.inputs ?? null,
              envelope: prevJson.result as BatteryAnalysisResultEnvelope,
            };
          }
        } catch {
          previous = null;
        }

        if (!cancelled) setPersistedRun({ manifest, inputs, envelope, previous });
      } catch (e) {
        if (!cancelled) setPersistedRun(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  if (!hasDirectProps && isLoading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading analysis results…</div>
      </div>
    );
  }

  if (!hasDirectProps && loadError) {
    return (
      <div className="p-8">
        <div className="text-red-600">Error: {loadError}</div>
      </div>
    );
  }

  if (!hasDirectProps && !loadedData) {
    return (
      <div className="p-8">
        <div className="text-gray-700 font-semibold mb-2">No results loaded</div>
        <div className="text-gray-600">
          Provide an <code className="px-1 py-0.5 bg-gray-100 rounded">analysisId</code> (query param or navigation state).
        </div>
      </div>
    );
  }

  const {
    customerInfo,
    intervalData,
    usageData,
    battery,
    simulationResult,
    financials,
  } = (hasDirectProps ? (props as Phase2ResultsProps) : (loadedData as Phase2ResultsProps));

  const reportVm = useMemo(() => {
    if (!persistedRun) return null;
    return buildReportViewModel({ manifest: persistedRun.manifest, envelope: persistedRun.envelope });
  }, [persistedRun]);

  const prevReportVm = useMemo(() => {
    if (!persistedRun?.previous) return null;
    return buildReportViewModel({ manifest: persistedRun.previous.manifest, envelope: persistedRun.previous.envelope });
  }, [persistedRun]);

  const headlineDiff = useMemo(() => {
    if (!reportVm || !prevReportVm) return null;
    return diffHeadline(reportVm, prevReportVm);
  }, [reportVm, prevReportVm]);

  const tariffEngineResult = useMemo(() => {
    const r = persistedRun?.envelope?.result;
    return r?.tariffEngine ?? null;
  }, [persistedRun]);

  // ==========================================
  // NORMALIZATION (prevents NaN + broken charts)
  // ==========================================
  const toNum = (v: unknown, fallback = 0): number => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
    if (typeof v === 'string') {
      const n = Number(v.replace(/[$,]/g, ''));
      return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
  };

  const toDate = (v: unknown): Date | null => {
    if (v instanceof Date) return Number.isFinite(v.getTime()) ? v : null;
    const d = new Date(v as any);
    return Number.isFinite(d.getTime()) ? d : null;
  };

  const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

  const toDayKeyLocal = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const toMonthKeyLocal = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const inferIntervalHours = (rows: Array<{ timestamp: Date }>): number => {
    if (!rows || rows.length < 2) return 0.25;
    const t0 = rows[0]?.timestamp?.getTime?.() ?? NaN;
    const t1 = rows[1]?.timestamp?.getTime?.() ?? NaN;
    const dtHrs = Number.isFinite(t0) && Number.isFinite(t1) ? Math.abs(t1 - t0) / (1000 * 60 * 60) : NaN;
    return Number.isFinite(dtHrs) && dtHrs > 0 && dtHrs < 24 ? dtHrs : 0.25;
  };

  const intervals = useMemo(() => {
    return (intervalData ?? [])
      .map((r) => {
        const ts = toDate((r as any).timestamp);
        const kw = toNum((r as any).kw, NaN);
        if (!ts || !Number.isFinite(kw)) return null;
        return { timestamp: ts, kw };
      })
      .filter(Boolean) as Array<{ timestamp: Date; kw: number }>;
  }, [intervalData]);

  const bills = useMemo(() => {
    return (usageData ?? [])
      .map((r) => {
        const billEndDate = toDate((r as any).billEndDate);
        const peakDemandKw = toNum((r as any).peakDemandKw, NaN);
        const totalUsageKwh = toNum((r as any).totalUsageKwh, 0);
        const totalCost = toNum((r as any).totalCost, 0);
        if (!billEndDate || !Number.isFinite(peakDemandKw)) return null;
        return { billEndDate, peakDemandKw, totalUsageKwh, totalCost };
      })
      .filter(Boolean) as Array<{ billEndDate: Date; peakDemandKw: number; totalUsageKwh: number; totalCost: number }>;
  }, [usageData]);


  const batteryN = useMemo(() => {
    const eff = clamp01(toNum((battery as any).efficiency, 0.9));
    return {
      modelName: battery?.modelName || 'Battery',
      manufacturer: battery?.manufacturer || '',
      capacityKwh: toNum((battery as any).capacityKwh, 0),
      powerKw: toNum((battery as any).powerKw, 0),
      efficiency: eff,
      warranty: toNum((battery as any).warranty, 10),
      price: toNum((battery as any).price, 0),
    };
  }, [battery]);

  const simN = useMemo(() => {
    const originalPeak = toNum((simulationResult as any).originalPeak, 0);
    const newPeak = toNum((simulationResult as any).newPeak, 0);
    const peakReduction = Math.max(0, toNum((simulationResult as any).peakReduction, originalPeak - newPeak));
    const peakReductionPercent = toNum(
      (simulationResult as any).peakReductionPercent,
      originalPeak > 0 ? (peakReduction / originalPeak) * 100 : 0
    );
    return { originalPeak, newPeak, peakReduction, peakReductionPercent };
  }, [simulationResult]);

  const persistedSocHistory = useMemo(() => {
    const raw = (simulationResult as any)?.batterySocHistory ?? (simulationResult as any)?.battery_soc_history;
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const cleaned = raw.map((v: any) => clamp01(toNum(v, NaN))).filter((v: number) => Number.isFinite(v));
    if (cleaned.length !== intervals.length) return null;
    return cleaned;
  }, [simulationResult, intervals.length]);

  const finalIntervals = useMemo(() => {
    const raw = (simulationResult as any)?.finalLoadProfile as Array<{ timestamp: Date | string | number; kw: number | string }> | undefined;
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const parsed = raw
      .map((r) => {
        const ts = toDate((r as any).timestamp);
        const kw = toNum((r as any).kw, NaN);
        if (!ts || !Number.isFinite(kw)) return null;
        return { timestamp: ts, kw };
      })
      .filter(Boolean) as Array<{ timestamp: Date; kw: number }>;
    return parsed.length > 0 ? parsed : null;
  }, [simulationResult]);

  // Data integrity validation: ensure we have a full simulated interval series aligned to the baseline.
  const hasValidSimulationData = useMemo(() => {
    if (!finalIntervals) return false;
    if (!Array.isArray(intervals) || intervals.length === 0) return false;
    return finalIntervals.length === intervals.length;
  }, [finalIntervals, intervals]);

  // Optional diagnostic: did the simulation actually change anything?
  // (Not required for validity; a battery can legitimately do nothing if there are no actionable peaks.)
  const hasSimulationDifferences = useMemo(() => {
    if (!hasValidSimulationData) return false;
    return finalIntervals!.some((fin, i) => {
      const base = intervals[i];
      return base != null && Math.abs(fin.kw - base.kw) > 0.1;
    });
  }, [hasValidSimulationData, finalIntervals, intervals]);
  void hasSimulationDifferences;

  useEffect(() => {
    if (intervals.length > 0 && !hasValidSimulationData) {
      console.error('⚠️ CRITICAL: Battery simulation interval series is missing or misaligned.');
      console.error('Expected intervals:', intervals.length, 'Simulated intervals:', finalIntervals?.length ?? 0);
    }
  }, [hasValidSimulationData, intervals.length, finalIntervals?.length]);

  const finN = useMemo(() => {
    return {
      demandRate: toNum((financials as any).demandRate, 0),
      annualSavings: toNum((financials as any).annualSavings, 0),
      systemCost: toNum((financials as any).systemCost, 0),
      effectiveCost: toNum((financials as any).effectiveCost, 0),
      paybackYears: toNum((financials as any).paybackYears, 0),
      cefoLoan: toNum((financials as any).cefoLoan, 0),
    };
  }, [financials]);

  // Calculate quantity from system cost vs per-unit price, or use stored quantity
  const batteryQuantity = useMemo(() => {
    const storedQty = toNum((battery as any).quantity, 0);
    if (storedQty > 0) return storedQty;
    
    // Estimate from system cost vs per-unit price
    const perUnitPrice = toNum((battery as any).price, 0);
    if (perUnitPrice > 0 && finN.systemCost > perUnitPrice) {
      const estimated = Math.round(finN.systemCost / perUnitPrice);
      return Math.max(1, estimated);
    }
    return 1;
  }, [battery, finN.systemCost]);

  // If the customer's rate code already ends with "S" (e.g., B-19S), they are already on Option S.
  // In that case, we should not present Option S as a switchable comparison.
  const alreadyOnOptionS = useMemo(() => isAlreadyOnOptionS(String(customerInfo.rateCode || '')), [customerInfo.rateCode]);
  const canCompareOptionS = !alreadyOnOptionS;
  
  // ==========================================
  // STATE
  // ==========================================
  const [activePhase, setActivePhase] = useState<2 | 3>(2);
  const [showCostBuilder, setShowCostBuilder] = useState(false);
  const [includeSRate, setIncludeSRate] = useState(false);

  // Drilldown modal (worst-day view derived from heatmap clicks)
  const [drilldownDayKey, setDrilldownDayKey] = useState<string | null>(null);
  const [drilldownTitle, setDrilldownTitle] = useState<string>('');

  // Option S (schedule) dispatch meta (optimizer-first, fallback to heuristic)
  const [optionSDispatchMeta, setOptionSDispatchMeta] = useState<
    | null
    | {
        engine: string;
        solverStatus?: string;
        warnings: string[];
        modifiedIntervals: Array<{ timestamp: Date | string; kw: number }>;
      }
  >(null);
  const [optionSDispatchLoading, setOptionSDispatchLoading] = useState(false);

  // Daily profile views (Average vs representative extremes)
  type DailyProfileMode = 'AVERAGE' | 'PEAK_DAY' | 'LOW_DAY';
  type DailyProfilePeriod = 'ALL' | 'MOST_USED_MONTH' | 'PEAK_MONTH' | 'LOW_MONTH';
  const [dailyProfileMode, setDailyProfileMode] = useState<DailyProfileMode>('AVERAGE');
  const [dailyProfilePeriod, setDailyProfilePeriod] = useState<DailyProfilePeriod>('ALL');
  const [executiveNarrative, setExecutiveNarrative] = useState<string>('');
  const [executiveNarrativeLoading, setExecutiveNarrativeLoading] = useState(false);
  const [executiveNarrativeError, setExecutiveNarrativeError] = useState<string | null>(null);
  const lastNarrativeKeyRef = useRef<string>('');
  const [costInputs, setCostInputs] = useState({
    batteryHardware: toNum((battery as any).price, 0),
    installationPerUnit: 25000,
    permitsEngineering: 15000,
    profitMargin: 20,
  });

  // ==========================================
  // CORE CALCULATIONS
  // ==========================================

  const toMonthKeyUtc = (d: Date): string => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const toYearKeyUtc = (d: Date): number => d.getUTCFullYear();
  
  // Target threshold for peak shaving
  // If simulation reduced the peak, use that. Otherwise calculate based on battery power.
  const targetThreshold = useMemo(() => {
    const explicit = toNum((simulationResult as any)?.threshold, NaN);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    // If simulation produced a meaningful reduction, use that
    if (simN.newPeak < simN.originalPeak - 0.5) {
      return simN.newPeak;
    }
    // Otherwise, calculate what the threshold SHOULD be based on battery power
    // Battery can shave up to its power rating from the peak
    const calculatedThreshold = simN.originalPeak - batteryN.powerKw;
    // Ensure threshold is at least 50% of original peak
    return Math.max(calculatedThreshold, simN.originalPeak * 0.5);
  }, [simN.newPeak, simN.originalPeak, batteryN.powerKw]);

  // ===== NEW: diagnostics + peak patterns (explainability) =====
  const batterySpecForDiagnostics: BatterySpec = useMemo(
    () => ({
      capacity_kwh: batteryN.capacityKwh,
      max_power_kw: batteryN.powerKw,
      round_trip_efficiency: Math.max(0.01, Math.min(0.999, batteryN.efficiency)),
      degradation_rate: 0.02,
      min_soc: 0.10,
      max_soc: 0.90,
      depth_of_discharge: 0.80,
    }),
    [batteryN.capacityKwh, batteryN.powerKw, batteryN.efficiency]
  );

  const diagSimulationResult: SimulationResult | null = useMemo(() => {
    if (!intervals.length) return null;
    const fin = finalIntervals?.length ? finalIntervals : intervals;
    const newKw = fin.map((i) => i.kw);
    return {
      original_peak: simN.originalPeak,
      new_peak: simN.newPeak,
      savings_kwh: 0,
      final_load_profile: { intervals: fin },
      new_intervals_kw: newKw,
      battery_soc_history: persistedSocHistory ?? undefined,
    };
  }, [intervals, finalIntervals, simN.originalPeak, simN.newPeak, persistedSocHistory]);

  // Do NOT recompute analysis on refresh.
  // Source-of-truth is the persisted analysis_result.json loaded via /api/analyses/:id/battery-run/latest.
  useEffect(() => {
    const r = persistedRun?.envelope?.result;
    if (!r || !r.success) return;
    if (r.analysisMode === 'multi-tier') {
      // Multi-tier: the persisted result does not currently carry the same "diagnostic/peakEvents" shape.
      // Leave backendAnalysis as-is; UI still renders from the persisted envelope for summary + exports.
      return;
    }
    setBackendAnalysis({
      diagnostic: r.diagnostic,
      peakEvents: r.peakEvents,
      peakPatterns: r.peakPatterns,
      peakFrequency: r.peakFrequency,
      usageOptimization: r.usageOptimization,
      sizingRecommendation: r.sizingRecommendation,
      chartData: r.simulationResult?.chartData,
    });
  }, [persistedRun]);

  // Use backend-computed results (fallback to empty if not loaded yet)
  const peakEvents = backendAnalysis?.peakEvents ?? [];
  const peakPatterns = backendAnalysis?.peakPatterns ?? null;
  const peakFrequencyNew = backendAnalysis?.peakFrequency ?? null;
  const batteryDiagnostics = backendAnalysis?.diagnostic ?? null;
  const usageOptimization = backendAnalysis?.usageOptimization ?? null;
  const sizingRecommendation = backendAnalysis?.sizingRecommendation ?? null;
  
  const SHAVE_DETECTION_BUFFER_KW = 0.1; // allow tiny equality/measurement noise
  
  // Battery Specifications
  const batterySpecs = useMemo(() => {
    const duration = batteryN.powerKw > 0 ? batteryN.capacityKwh / batteryN.powerKw : 0;
    const cRate = batteryN.capacityKwh > 0 ? batteryN.powerKw / batteryN.capacityKwh : 0;
    const usableCapacity = batteryN.capacityKwh * 0.9; // 90% DoD typically
    
    return {
      duration: Math.round(duration * 10) / 10,
      cRate: Math.round(cRate * 100) / 100,
      usableCapacity: Math.round(usableCapacity),
      efficiency: Math.round(batteryN.efficiency * 100),
    };
  }, [batteryN]);

  // Cycle Analysis - How many times battery cycles per year
  const cycleAnalysis = useMemo(() => {
    let totalDischargeEvents = 0;
    let totalEnergyDischargedKwh = 0;
    let maxObservedKw = -Infinity;
    
    intervals.forEach((interval) => {
      if (interval.kw > maxObservedKw) maxObservedKw = interval.kw;
      // Count an event when the raw load meets/exceeds the shave threshold (with small buffer)
      if (interval.kw >= targetThreshold - SHAVE_DETECTION_BUFFER_KW) {
        totalDischargeEvents++;
        const shaved = Math.max(0, interval.kw - targetThreshold);
        totalEnergyDischargedKwh += shaved * 0.25; // 15-min intervals
      }
    });
    
    // Scale to annual (assuming interval data covers some period)
    const first = intervals[0]?.timestamp?.getTime();
    const last = intervals[intervals.length - 1]?.timestamp?.getTime();
    const dataSpanDays =
      Number.isFinite(first) && Number.isFinite(last) && intervals.length > 1
        ? Math.max(1, (last - first) / (1000 * 60 * 60 * 24))
        : 365;
    const scaleFactor = dataSpanDays > 0 ? 365 / dataSpanDays : 1;
    
    const annualEnergyKwh = totalEnergyDischargedKwh * scaleFactor;
    const cyclesPerYear = batteryN.capacityKwh > 0 ? annualEnergyKwh / batteryN.capacityKwh : 0;
    const eventsPerMonth = (totalDischargeEvents * scaleFactor) / 12;
    const avgDischargePerEvent = totalDischargeEvents > 0 ? totalEnergyDischargedKwh / totalDischargeEvents : 0;
    
    // Typical LFP batteries: 4000-6000 cycles lifetime
    const expectedLifetimeCycles = 5000;
    const expectedLifetimeYears = cyclesPerYear > 0 ? expectedLifetimeCycles / cyclesPerYear : 20;
    
    return {
      cyclesPerYear: Math.round(cyclesPerYear),
      cyclesPerMonth: Math.round(cyclesPerYear / 12),
      cyclesPerDay: Math.round((cyclesPerYear / 365) * 100) / 100,
      eventsPerMonth: Math.round(eventsPerMonth),
      annualEnergyKwh: Math.round(annualEnergyKwh),
      avgDischargeKwh: Math.round(avgDischargePerEvent * 10) / 10,
      expectedLifetimeYears: Math.min(20, Math.round(expectedLifetimeYears)),
      expectedLifetimeCycles,
      totalEvents: totalDischargeEvents,
      maxObservedKw: Number.isFinite(maxObservedKw) ? Math.round(maxObservedKw * 10) / 10 : 0,
    };
  }, [intervals, targetThreshold, batteryN]);

  const throughputBreakdown = useMemo(() => {
    const annualKwh = cycleAnalysis.annualEnergyKwh;
    return {
      annualKwh,
      monthlyKwh: Math.round(annualKwh / 12),
      dailyKwh: Math.round(annualKwh / 365),
    };
  }, [cycleAnalysis.annualEnergyKwh]);

  // Peak frequency analysis - how often load is at/above target
  const peakFrequency = useMemo(() => {
    if (intervals.length === 0) {
      return {
        hits: 0,
        perDayAvg: 0,
        perWeekAvg: 0,
        perMonthAvg: 0,
        perYear: 0,
        daysWithPeaks: 0,
        weeksWithPeaks: 0,
        monthsWithPeaks: 0,
        maxHitsPerDay: 0,
      };
    }

    const dayCounts = new Map<string, number>();
    const weekCounts = new Map<string, number>();
    const monthCounts = new Map<string, number>();
    let hits = 0;
    let minTs = Infinity;
    let maxTs = -Infinity;

    const getIsoWeek = (date: Date): string => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    intervals.forEach(({ timestamp, kw }) => {
      const ts = timestamp instanceof Date ? timestamp : new Date(timestamp);
      const t = ts.getTime();
      if (Number.isFinite(t)) {
        if (t < minTs) minTs = t;
        if (t > maxTs) maxTs = t;
      }
      if (kw >= targetThreshold - SHAVE_DETECTION_BUFFER_KW) {
        hits++;
        const dayKey = ts.toISOString().slice(0, 10);
        const monthKey = `${ts.getUTCFullYear()}-${String(ts.getUTCMonth() + 1).padStart(2, '0')}`;
        const weekKey = getIsoWeek(ts);
        dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1);
        monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
        weekCounts.set(weekKey, (weekCounts.get(weekKey) || 0) + 1);
      }
    });

    const spanDays = Number.isFinite(minTs) && Number.isFinite(maxTs) && maxTs > minTs
      ? Math.max(1, (maxTs - minTs) / (1000 * 60 * 60 * 24))
      : 1;
    const spanWeeks = spanDays / 7;
    const spanMonths = spanDays / 30.4375; // average days per month
    const perDayAvg = hits / spanDays;
    const perWeekAvg = hits / spanWeeks;
    const perMonthAvg = hits / spanMonths;
    const perYear = hits * (365 / spanDays);
    const maxHitsPerDay = dayCounts.size > 0 ? Math.max(...Array.from(dayCounts.values())) : 0;

    return {
      hits,
      perDayAvg: Math.round(perDayAvg * 100) / 100,
      perWeekAvg: Math.round(perWeekAvg * 100) / 100,
      perMonthAvg: Math.round(perMonthAvg * 100) / 100,
      perYear: Math.round(perYear),
      daysWithPeaks: dayCounts.size,
      weeksWithPeaks: weekCounts.size,
      monthsWithPeaks: monthCounts.size,
      maxHitsPerDay,
    };
  }, [intervals, targetThreshold, SHAVE_DETECTION_BUFFER_KW]);

  // Detect how many billing months are present in the uploaded interval dataset.
  // We use this to annualize monthly demand-charge math without assuming the upload is exactly 12 months.
  const billingMonthsInDataset = useMemo(() => {
    const months = new Set<string>();
    for (const i of intervals) {
      const d = i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp);
      if (!Number.isFinite(d.getTime())) {
        months.add('invalid');
        continue;
      }
      months.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }
    return months.size;
  }, [intervals]);

  const annualizeFactor = billingMonthsInDataset > 0 ? 12 / billingMonthsInDataset : 1;

  // Alternative Battery Scenarios for Comparison
  const alternativeBatteries = useMemo(() => {
    // Generate hypothetical alternatives based on common battery sizes
    const alternatives = [
      { capacityKwh: batteryN.capacityKwh * 0.5, powerKw: batteryN.powerKw * 0.5, name: 'Smaller (50%)' },
      { capacityKwh: batteryN.capacityKwh * 1.5, powerKw: batteryN.powerKw * 1.5, name: 'Larger (150%)' },
      { capacityKwh: batteryN.capacityKwh * 2, powerKw: batteryN.powerKw * 2, name: 'Much Larger (200%)' },
    ];
    
    return alternatives.map(alt => {
      // Estimate peak reduction (limited by power and threshold)
      const maxPossibleReduction = Math.min(alt.powerKw, simN.originalPeak - targetThreshold);
      const estimatedReduction = Math.min(maxPossibleReduction, simN.peakReduction * (alt.powerKw / batteryN.powerKw));
      
      // Estimate cost (roughly linear with capacity and power)
      const estimatedCost = finN.systemCost * ((alt.capacityKwh / batteryN.capacityKwh) * 0.6 + (alt.powerKw / batteryN.powerKw) * 0.4);
      
      // Estimate annual savings
      const estimatedSavings = estimatedReduction * finN.demandRate * billingMonthsInDataset * annualizeFactor;
      
      // Estimate payback
      const estimatedPayback = estimatedSavings > 0 ? estimatedCost / estimatedSavings : Infinity;
      
      return {
        modelName: alt.name,
        capacityKwh: Math.round(alt.capacityKwh),
        powerKw: Math.round(alt.powerKw),
        peakReductionKw: Math.round(estimatedReduction * 10) / 10,
        annualSavings: Math.round(estimatedSavings),
        systemCost: Math.round(estimatedCost),
        paybackYears: Math.round(estimatedPayback * 10) / 10,
      };
    });
  }, [batteryN, simN, finN, targetThreshold]);

  // Degradation Analysis over battery lifetime
  const degradationAnalysis = useMemo(() => {
    const annualDegradation = 0.02; // 2% per year
    const years = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20];
    
    return years.map(year => {
      const capacityRetention = Math.pow(1 - annualDegradation, year);
      const effectiveCapacity = batteryN.capacityKwh * capacityRetention;
      const effectiveSavings = finN.annualSavings * capacityRetention;
      const effectivePeakReductionKw = simN.peakReduction * capacityRetention;
      
      return {
        year,
        capacityPercent: Math.round(capacityRetention * 100),
        capacityKwh: Math.round(effectiveCapacity),
        annualSavings: Math.round(effectiveSavings),
        effectivePeakReductionKw: Math.round(effectivePeakReductionKw * 10) / 10,
        efficiency: Math.round((batteryN.efficiency - (year * 0.002)) * 100), // Slight efficiency loss
      };
    });
  }, [batteryN, finN.annualSavings, simN.peakReduction]);

  // Efficiency Impact
  const efficiencyImpact = useMemo(() => {
    const grossSavingsKw = simN.peakReduction;
    const efficiencyLoss = 1 - batteryN.efficiency;
    const lostToInefficiency = grossSavingsKw * efficiencyLoss;
    const netSavingsKw = grossSavingsKw * batteryN.efficiency;
    const annualLossValue = lostToInefficiency * finN.demandRate * billingMonthsInDataset * annualizeFactor;
    
    return {
      grossSavingsKw: Math.round(grossSavingsKw * 10) / 10,
      netSavingsKw: Math.round(netSavingsKw * 10) / 10,
      lostToInefficiency: Math.round(lostToInefficiency * 10) / 10,
      efficiencyPercent: Math.round(batteryN.efficiency * 100),
      annualLossValue: Math.round(annualLossValue),
      netAnnualSavings: Math.round(finN.annualSavings * batteryN.efficiency),
    };
  }, [simN, batteryN, finN]);

  // Daily/Monthly/Annual Savings Breakdown
  const savingsBreakdown = useMemo(() => {
    const annual = finN.annualSavings;
    const monthly = annual / 12;
    const daily = annual / 365;
    
    // Apply efficiency
    const netAnnual = annual * batteryN.efficiency;
    const netMonthly = netAnnual / 12;
    const netDaily = netAnnual / 365;
    
    return {
      gross: { daily: Math.round(daily), monthly: Math.round(monthly), annual: Math.round(annual) },
      net: { daily: Math.round(netDaily), monthly: Math.round(netMonthly), annual: Math.round(netAnnual) },
    };
  }, [finN.annualSavings, batteryN.efficiency]);

  const facilityStats = useMemo(() => {
    const peakDemand = simN.originalPeak;
    const avgDemand = intervals.length > 0 ? intervals.reduce((sum, i) => sum + i.kw, 0) / intervals.length : 0;
    const loadFactor = peakDemand > 0 ? avgDemand / peakDemand : 0;
    return { avgDemand, loadFactor, peakDemand };
  }, [intervals, simN.originalPeak]);

  const executiveNarrativeInput = useMemo(() => {
    const { peakDemand, avgDemand, loadFactor } = facilityStats;
    const recommendedBattery = [batteryN.manufacturer, batteryN.modelName].filter(Boolean).join(' ').trim() || batteryN.modelName || 'Battery system';

    return {
      customerName: customerInfo.billingName || 'Customer',
      siteAddress: customerInfo.siteAddress || '',
      peakDemand,
      avgDemand,
      loadFactor,
      recommendedBattery,
      annualSavings: finN.annualSavings,
      paybackYears: finN.paybackYears,
      peakReduction: simN.peakReduction,
    };
  }, [batteryN.manufacturer, batteryN.modelName, customerInfo.billingName, customerInfo.siteAddress, facilityStats, finN.annualSavings, finN.paybackYears, simN.peakReduction]);

  const refreshExecutiveNarrative = async (force = false) => {
    const key = JSON.stringify(executiveNarrativeInput);
    if (!force && lastNarrativeKeyRef.current === key && executiveNarrative) return;

    setExecutiveNarrativeLoading(true);
    setExecutiveNarrativeError(null);
    try {
      const narrative = await fetchExecutiveNarrative({ adminToken, analysisData: executiveNarrativeInput });
      setExecutiveNarrative(narrative);
      lastNarrativeKeyRef.current = key;
    } catch (e) {
      setExecutiveNarrativeError(e instanceof Error ? e.message : 'Failed to generate narrative');
    } finally {
      setExecutiveNarrativeLoading(false);
    }
  };

  useEffect(() => {
    // Only auto-generate when Phase 2 (feasibility/savings) is visible
    if (activePhase !== 2) return;
    void refreshExecutiveNarrative(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePhase, executiveNarrativeInput]);

  // Option S eligibility (for customers NOT already on an Option S schedule)
  const optionSEligibility = useMemo(() => {
    const peakDemandKw = simN.originalPeak;
    const avgDemandKw = facilityStats.avgDemand;
    const loadFactor = peakDemandKw > 0 ? avgDemandKw / peakDemandKw : 0;
    return checkSRateEligibility(
      String(customerInfo.rateCode || ''),
      peakDemandKw,
      batteryN.capacityKwh,
      batteryN.powerKw,
      loadFactor,
      intervals
    );
  }, [customerInfo.rateCode, batteryN.capacityKwh, batteryN.powerKw, batteryN, intervals, simN.originalPeak, facilityStats.avgDemand]);

  // Option S dispatch for grading (optimizer-first). If it fails, we fall back to the local heuristic.
  useEffect(() => {
    if (alreadyOnOptionS) {
      setOptionSDispatchMeta(null);
      return;
    }
    if (intervals.length === 0) return;
    if (!Number.isFinite(targetThreshold) || targetThreshold <= 0) return;
    if (batteryN.capacityKwh <= 0 || batteryN.powerKw <= 0) return;

    let cancelled = false;
    (async () => {
      setOptionSDispatchLoading(true);
      try {
        const res = await fetch('/api/batteries/s-rate-optimized', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intervals: intervals.map((i) => ({
              timestamp: (i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp)).toISOString(),
              kw: i.kw,
            })),
            batteryCapacityKwh: batteryN.capacityKwh,
            batteryPowerKw: batteryN.powerKw,
            roundTripEfficiency: batteryN.efficiency,
            thresholdKw: targetThreshold,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) throw new Error(data?.error || `Option S dispatch failed (${res.status})`);

        const modifiedIntervals =
          (Array.isArray(data?.dispatch?.netLoadIntervals) ? data.dispatch.netLoadIntervals : null) ??
          (Array.isArray(data?.dispatch?.modifiedIntervals) ? data.dispatch.modifiedIntervals : null) ??
          [];

        if (!cancelled) {
          setOptionSDispatchMeta({
            engine: String(data?.engine || data?.dispatch?.engine || 'unknown'),
            solverStatus: data?.solverStatus ? String(data.solverStatus) : undefined,
            warnings: Array.isArray(data?.warnings) ? data.warnings.map(String) : [],
            modifiedIntervals,
          });
        }
      } catch (e) {
        // Local heuristic fallback (keeps UI functional if API/solver unavailable)
        const warnings = [
          `Option S optimizer unavailable; using local heuristic dispatch. ${e instanceof Error ? e.message : ''}`.trim(),
        ];
        const fallback = simulateBatteryDispatchWithSRate(
          intervals,
          batteryN.capacityKwh,
          batteryN.powerKw,
          batteryN.efficiency,
          targetThreshold
        );
        if (!cancelled) {
          setOptionSDispatchMeta({
            engine: 'optionS-heuristic-local',
            warnings,
            modifiedIntervals: fallback.modifiedIntervals as any,
          });
        }
      } finally {
        if (!cancelled) setOptionSDispatchLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [alreadyOnOptionS, intervals, batteryN.capacityKwh, batteryN.powerKw, batteryN.efficiency, targetThreshold]);

  // Option S dispatch used for COST comparison only (gated by the toggle)
  const sRateDispatch = useMemo(() => {
    if (!includeSRate) return null;
    if (!canCompareOptionS) return null;
    if (!optionSEligibility.isEligible) return null;
    if (!optionSDispatchMeta?.modifiedIntervals?.length) return null;
    return optionSDispatchMeta;
  }, [includeSRate, canCompareOptionS, optionSEligibility.isEligible, optionSDispatchMeta]);

  // For grading/annualization logic (only meaningful when NOT already on Option S)
  const optionSDispatchForGrade = useMemo(() => {
    if (alreadyOnOptionS) return null;
    if (!optionSDispatchMeta?.modifiedIntervals?.length) return null;
    return optionSDispatchMeta;
  }, [alreadyOnOptionS, optionSDispatchMeta]);

  const intervalHours = useMemo(() => inferIntervalHours(intervals), [intervals]);

  type HourlyRow = { hour: string; before: number; after: number; shaved: number };

  const computeHourlyAverage = (rows: Array<{ timestamp: Date; kw: number }>): number[] => {
    const hourTo: Record<number, { sum: number; n: number }> = {};
    for (let h = 0; h < 24; h++) hourTo[h] = { sum: 0, n: 0 };
    for (const r of rows) {
      const h = r.timestamp.getHours();
      hourTo[h].sum += r.kw;
      hourTo[h].n += 1;
    }
    return Array.from({ length: 24 }, (_, h) => (hourTo[h].n > 0 ? hourTo[h].sum / hourTo[h].n : 0));
  };

  // Build per-day series (baseline + simulated) so we can render Average / Peak-day / Low-day profiles.
  const dayProfiles = useMemo(() => {
    const out = new Map<
      string,
      { dayKey: string; monthKey: string; before: Array<{ timestamp: Date; kw: number }>; after: Array<{ timestamp: Date; kw: number }> }
    >();

    const n = intervals.length;
    for (let idx = 0; idx < n; idx++) {
      const base = intervals[idx];
      if (!base) continue;
      const fin = finalIntervals?.[idx];
      const afterKw = fin?.kw ?? base.kw;

      const dayKey = toDayKeyLocal(base.timestamp);
      const monthKey = toMonthKeyLocal(base.timestamp);
      const cur = out.get(dayKey) ?? { dayKey, monthKey, before: [], after: [] };
      cur.before.push({ timestamp: base.timestamp, kw: base.kw });
      cur.after.push({ timestamp: base.timestamp, kw: afterKw });
      out.set(dayKey, cur);
    }

    return Array.from(out.values());
  }, [intervals, finalIntervals]);

  const monthStats = useMemo(() => {
    const monthTo = new Map<
      string,
      {
        monthKey: string;
        energyKwh: number;
        peakKw: number;
      }
    >();

    for (const d of dayProfiles) {
      const mk = d.monthKey;
      const cur = monthTo.get(mk) ?? { monthKey: mk, energyKwh: 0, peakKw: 0 };
      // energy from baseline series for "most used month"
      cur.energyKwh += d.before.reduce((sum, r) => sum + r.kw * intervalHours, 0);
      cur.peakKw = Math.max(cur.peakKw, ...d.before.map((r) => r.kw));
      monthTo.set(mk, cur);
    }

    const months = Array.from(monthTo.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    const mostUsed = months.reduce((best, m) => (!best || m.energyKwh > best.energyKwh ? m : best), null as any);
    const peakMonth = months.reduce((best, m) => (!best || m.peakKw > best.peakKw ? m : best), null as any);
    const lowMonth = months.reduce((best, m) => (!best || m.peakKw < best.peakKw ? m : best), null as any);

    return {
      months,
      mostUsedMonthKey: mostUsed?.monthKey ?? null,
      peakMonthKey: peakMonth?.monthKey ?? null,
      lowMonthKey: lowMonth?.monthKey ?? null,
    };
  }, [dayProfiles, intervalHours]);

  const filteredDaysForPeriod = useMemo(() => {
    if (dailyProfilePeriod === 'ALL') return dayProfiles;
    const mk =
      dailyProfilePeriod === 'MOST_USED_MONTH'
        ? monthStats.mostUsedMonthKey
        : dailyProfilePeriod === 'PEAK_MONTH'
          ? monthStats.peakMonthKey
          : monthStats.lowMonthKey;
    if (!mk) return dayProfiles;
    return dayProfiles.filter((d) => d.monthKey === mk);
  }, [dailyProfilePeriod, dayProfiles, monthStats]);

  type PeakShavePoint = {
    t: number; // epoch ms
    ts: Date;
    before: number;
    after: number;
    shaved: number;
    monthKey: string;
    dayKey: string;
  };

  // Peak/shaving timeline across the dataset (year). We only keep intervals that matter:
  // - intervals near/above the peak threshold OR
  // - intervals that actually shaved (before-after > buffer)
  const peakShaveTimeline = useMemo(() => {
    const out: PeakShavePoint[] = [];
    const n = intervals.length;
    if (n === 0) return out;

    for (let idx = 0; idx < n; idx++) {
      const base = intervals[idx];
      if (!base) continue;
      const fin = finalIntervals?.[idx];
      const after = fin?.kw ?? base.kw;
      const shaved = Math.max(0, base.kw - after);
      const isNearPeak = base.kw >= targetThreshold - SHAVE_DETECTION_BUFFER_KW;
      const didShave = shaved > SHAVE_DETECTION_BUFFER_KW;
      if (!isNearPeak && !didShave) continue;

      out.push({
        t: base.timestamp.getTime(),
        ts: base.timestamp,
        before: base.kw,
        after,
        shaved,
        monthKey: toMonthKeyLocal(base.timestamp),
        dayKey: toDayKeyLocal(base.timestamp),
      });
    }

    // If there's a ton of points, downsample by picking the top shaved points per day + top raw peaks per day
    // to keep the chart responsive for multi-year datasets.
    if (out.length > 6000) {
      const byDay = new Map<string, PeakShavePoint[]>();
      for (const p of out) {
        const arr = byDay.get(p.dayKey) ?? [];
        arr.push(p);
        byDay.set(p.dayKey, arr);
      }
      const sampled: PeakShavePoint[] = [];
      for (const arr of byDay.values()) {
        const topShaved = [...arr].sort((a, b) => b.shaved - a.shaved).slice(0, 6);
        const topPeak = [...arr].sort((a, b) => b.before - a.before).slice(0, 3);
        sampled.push(...topShaved, ...topPeak);
      }
      sampled.sort((a, b) => a.t - b.t);
      return sampled;
    }

    out.sort((a, b) => a.t - b.t);
    return out;
  }, [intervals, finalIntervals, targetThreshold, SHAVE_DETECTION_BUFFER_KW]);

  const selectedDayForMode = useMemo(() => {
    if (filteredDaysForPeriod.length === 0) return null;
    if (dailyProfileMode === 'AVERAGE') return null;

    // Peak day = day with highest single interval kW (baseline)
    const dayWithMaxPeak = filteredDaysForPeriod.reduce((best, d) => {
      const dPeak = d.before.reduce((mx, r) => Math.max(mx, r.kw), -Infinity);
      const bPeak = best.before.reduce((mx, r) => Math.max(mx, r.kw), -Infinity);
      return dPeak > bPeak ? d : best;
    }, filteredDaysForPeriod[0]);

    // Low day = day with lowest peak kW (baseline) — a proxy for minimum/best case
    const dayWithMinPeak = filteredDaysForPeriod.reduce((best, d) => {
      const dPeak = d.before.reduce((mx, r) => Math.max(mx, r.kw), Infinity);
      const bPeak = best.before.reduce((mx, r) => Math.max(mx, r.kw), Infinity);
      return dPeak < bPeak ? d : best;
    }, filteredDaysForPeriod[0]);

    return dailyProfileMode === 'PEAK_DAY' ? dayWithMaxPeak : dayWithMinPeak;
  }, [dailyProfileMode, filteredDaysForPeriod]);

  // 24-Hour Demand Profile (kW): Average / Peak-day / Low-day, optionally scoped to a month
  const hourlyProfile = useMemo<HourlyRow[]>(() => {
    const rows = filteredDaysForPeriod;
    const empty: HourlyRow[] = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      before: 0,
      after: 0,
      shaved: 0,
    }));
    if (rows.length === 0) return empty;

    let beforeSeries: number[] = [];
    let afterSeries: number[] = [];

    if (dailyProfileMode === 'AVERAGE') {
      const beforeAll = rows.flatMap((d) => d.before);
      const afterAll = rows.flatMap((d) => d.after);
      beforeSeries = computeHourlyAverage(beforeAll);
      afterSeries = computeHourlyAverage(afterAll);
    } else {
      const d = selectedDayForMode;
      if (!d) return empty;
      // Use a single day's series, averaged by hour within that day (still 15-min points)
      beforeSeries = computeHourlyAverage(d.before);
      afterSeries = computeHourlyAverage(d.after);
    }

    return Array.from({ length: 24 }, (_, hour) => {
      const b = beforeSeries[hour] ?? 0;
      const a = afterSeries[hour] ?? 0;
      return {
        hour: `${hour.toString().padStart(2, '0')}:00`,
        before: Math.round(b),
        after: Math.round(a),
        shaved: Math.round(Math.max(0, b - a)),
      };
    });
  }, [filteredDaysForPeriod, dailyProfileMode, selectedDayForMode]);

  // Peak Event Frequency by Hour
  const peakEventsByHour = useMemo(() => {
    const hourCounts: { [hour: number]: number } = {};
    for (let h = 0; h < 24; h++) hourCounts[h] = 0;
    
    intervals.forEach((interval) => {
      if (interval.kw > targetThreshold) {
        const hour = new Date(interval.timestamp).getHours();
        hourCounts[hour]++;
      }
    });
    
    return Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      events: hourCounts[hour],
    }));
  }, [intervals, targetThreshold]);

  // Monthly Demand Comparison (kW): baseline vs battery only
  const monthlyComparison = useMemo(() => {
    // Monthly peaks after simulated battery dispatch
    const afterMonthlyPeaks = new Map<string, number>();
    if (finalIntervals?.length) {
      for (const i of finalIntervals) {
        const mk = toMonthKeyUtc(i.timestamp);
        afterMonthlyPeaks.set(mk, Math.max(afterMonthlyPeaks.get(mk) || 0, i.kw));
      }
    }

    return bills.map((bill) => {
      const mk = toMonthKeyUtc(bill.billEndDate);
      const originalPeak = bill.peakDemandKw;
      const reducedPeak = afterMonthlyPeaks.get(mk) ?? originalPeak;
      const shavedKw = Math.max(0, originalPeak - reducedPeak);
      const monthlySavings = shavedKw * finN.demandRate;
      
      return {
        month: new Date(bill.billEndDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        originalPeak: Math.round(originalPeak),
        newPeak: Math.round(reducedPeak),
        shaved: Math.round(shavedKw),
        savings: Math.round(monthlySavings),
      };
    });
  }, [bills, finalIntervals, finN.demandRate]);

  // Monthly demand-charge savings comparison ($): baseline vs battery vs Option S (schedule switch)
  const monthlyDemandSavingsComparison = useMemo(() => {
    const monthLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    // Precompute monthly peaks after standard battery dispatch (from simulated final intervals)
    const afterMonthlyPeaks = new Map<string, number>();
    if (finalIntervals?.length) {
      for (const i of finalIntervals) {
        const mk = toMonthKeyUtc(i.timestamp);
        afterMonthlyPeaks.set(mk, Math.max(afterMonthlyPeaks.get(mk) || 0, i.kw));
      }
    }

    // Option S: schedule-aware charges
    const optionSBaseline = calculateOptionSDemandCharges(intervals, DEFAULT_OPTION_S_RATES_2025_SECONDARY);
    const optionSBaselineByMonth = new Map(optionSBaseline.monthly.map((m) => [m.month, m.totalDemandCharge]));
    const optionSWithBatteryByMonth = optionSDispatchForGrade?.modifiedIntervals?.length
      ? new Map(
          calculateOptionSDemandCharges(optionSDispatchForGrade.modifiedIntervals, DEFAULT_OPTION_S_RATES_2025_SECONDARY).monthly.map((m) => [
            m.month,
            m.totalDemandCharge,
          ])
        )
      : null;

    // Option S switch comparison (for eligible non-S customers, when toggled on)
    const optionSSwitchByMonth =
      includeSRate && canCompareOptionS && optionSEligibility.isEligible && sRateDispatch?.modifiedIntervals?.length
        ? new Map(
            calculateOptionSDemandCharges(sRateDispatch.modifiedIntervals, DEFAULT_OPTION_S_RATES_2025_SECONDARY).monthly.map((m) => [
              m.month,
              m.totalDemandCharge,
            ])
          )
        : null;

    // If no bills, generate monthly data from interval data
    if (bills.length === 0 && intervals.length > 0) {
      // Group intervals by month and calculate monthly peaks
      const monthlyBaselinePeaks = new Map<string, number>();
      const monthlyBatteryPeaks = new Map<string, number>();
      
      for (const interval of intervals) {
        const mk = toMonthKeyUtc(interval.timestamp);
        monthlyBaselinePeaks.set(mk, Math.max(monthlyBaselinePeaks.get(mk) || 0, interval.kw));
      }
      
      if (finalIntervals?.length) {
        for (const interval of finalIntervals) {
          const mk = toMonthKeyUtc(interval.timestamp);
          monthlyBatteryPeaks.set(mk, Math.max(monthlyBatteryPeaks.get(mk) || 0, interval.kw));
        }
      }
      
      // Generate chart data from monthly peaks
      const allMonths = Array.from(new Set([...monthlyBaselinePeaks.keys(), ...monthlyBatteryPeaks.keys()])).sort();
      
      return allMonths.map((mk) => {
        const [year, month] = mk.split('-');
        const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const baselinePeak = monthlyBaselinePeaks.get(mk) || 0;
        const batteryPeak = monthlyBatteryPeaks.get(mk) || baselinePeak;
        
        const baselineDemandCharge = alreadyOnOptionS
          ? optionSBaselineByMonth.get(mk) ?? baselinePeak * finN.demandRate
          : baselinePeak * finN.demandRate;
        
        const batteryDemandCharge = alreadyOnOptionS
          ? optionSWithBatteryByMonth?.get(mk) ?? baselineDemandCharge
          : batteryPeak * finN.demandRate;
        
        const optionSSwitchedDemandCharge = optionSSwitchByMonth?.get(mk) ?? null;
        
        return {
          month: monthLabel(monthDate),
          batterySavings: Math.max(0, baselineDemandCharge - batteryDemandCharge),
          optionSSavings:
            optionSSwitchedDemandCharge == null ? null : Math.max(0, baselineDemandCharge - optionSSwitchedDemandCharge),
        };
      });
    }
    
    return bills.map((bill) => {
      const mk = toMonthKeyUtc(bill.billEndDate);

      // Baseline and battery under CURRENT schedule
      const baselineDemandCharge = alreadyOnOptionS
        ? optionSBaselineByMonth.get(mk) ?? bill.peakDemandKw * finN.demandRate
        : bill.peakDemandKw * finN.demandRate;

      const batteryDemandCharge = alreadyOnOptionS
        ? optionSWithBatteryByMonth?.get(mk) ?? baselineDemandCharge
        : (afterMonthlyPeaks.get(mk) ?? bill.peakDemandKw) * finN.demandRate;

      // Optional switch comparison: baseline (standard) vs battery+OptionS (schedule-aware)
      const optionSSwitchedDemandCharge = optionSSwitchByMonth?.get(mk) ?? null;

      return {
        month: monthLabel(bill.billEndDate),
        batterySavings: Math.max(0, baselineDemandCharge - batteryDemandCharge),
        optionSSavings:
          optionSSwitchedDemandCharge == null ? null : Math.max(0, baselineDemandCharge - optionSSwitchedDemandCharge),
      };
    });
  }, [
    alreadyOnOptionS,
    bills,
    finN.demandRate,
    includeSRate,
    canCompareOptionS,
    optionSEligibility.isEligible,
    intervals,
    finalIntervals,
    optionSDispatchForGrade,
    sRateDispatch,
  ]);

  // Yearly peak demand comparison (kW): baseline vs battery only
  const yearlyPeakComparison = useMemo(() => {
    const yearTo = new Map<number, { baseline: number; battery: number }>();

    // Baseline peaks from original intervals
    for (const interval of intervals) {
      const year = toYearKeyUtc(interval.timestamp);
      const current = yearTo.get(year) || { baseline: 0, battery: 0 };
      current.baseline = Math.max(current.baseline, interval.kw);
      yearTo.set(year, current);
    }

    // Battery peaks from simulation data (if present)
    if (finalIntervals?.length) {
      const n = Math.min(intervals.length, finalIntervals.length);
      for (let idx = 0; idx < n; idx++) {
        const orig = intervals[idx];
        const fin = finalIntervals[idx];
        if (!orig || !fin) continue;
        const year = toYearKeyUtc(orig.timestamp);
        const current = yearTo.get(year) || { baseline: 0, battery: 0 };
        current.battery = Math.max(current.battery, fin.kw);
        yearTo.set(year, current);
      }
    }

    return Array.from(yearTo.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, v]) => ({
        year: String(year),
        baseline: Math.round(v.baseline * 10) / 10,
        battery: Math.round(v.battery * 10) / 10,
      }));
  }, [intervals, finalIntervals]);

  // Section insights (fallback, sales-friendly)
  const loadProfileInsight: SectionInsight = useMemo(
    () => ({
      sectionId: 'daily-load-profile',
      title: 'Daily Load Profile',
      whatWeAreLookingAt:
        'Average demand (kW) by hour of day. This shows when the facility’s typical peaks occur and how battery dispatch changes the shape.',
      whyItMatters:
        'If peaks cluster into a predictable window, batteries can reliably shave demand charges and create a clear savings story.',
      engineeringFocus: [
        `Target threshold is ~${Math.round(targetThreshold)} kW (battery discharges above this level).`,
        'Verify peak hours align with the facility’s operating schedule and HVAC/process cycles.',
        'Confirm enough battery power (kW) exists to cap the worst peak periods.',
      ],
      salesTalkingPoints: [
        'Demand charges are like a “speeding ticket” for your highest spike—battery acts as a buffer.',
        'This chart shows the before/after profile so the customer can see exactly what the battery removes.',
        canCompareOptionS
          ? 'Use the Option S savings section to compare billing outcomes under an alternative schedule.'
          : 'Customer is already on an Option S schedule (no switch comparison).',
      ],
      recommendations: [
        simN.peakReductionPercent >= 15
          ? 'Peak reduction is in a strong range for demand-charge savings.'
          : 'Peak reduction is modest—consider a higher power (kW) battery or a lower threshold strategy.',
      ],
      isGenerated: false,
    }),
    [includeSRate, simN.peakReductionPercent, targetThreshold]
  );

  const monthlyPeakInsight: SectionInsight = useMemo(
    () => ({
      sectionId: 'monthly-peak-demand',
      title: 'Monthly Peak Demand',
      whatWeAreLookingAt:
        'Monthly peak demand (kW) in each scenario. Utilities commonly set the demand charge using the single highest interval in the month.',
      whyItMatters:
        'Monthly peaks drive demand charges. Flattening the “worst spike” month-by-month is the most direct way to reduce the demand portion of the bill.',
      engineeringFocus: [
        'Look for months where peaks remain high—these indicate longer or higher-amplitude events.',
        'If peaks are seasonal (summer cooling vs winter heating), dispatch strategy may need tuning.',
        'If S-Rate is enabled, compare whether dispatch reduces monthly maxima consistently.',
      ],
      salesTalkingPoints: [
        'This is the monthly “bill setter” number—one spike can set the whole month’s demand charge.',
        'Battery reduces the red bars (without battery) down to the cyan bars (with battery).',
      ],
      isGenerated: false,
    }),
    []
  );

  const yearlyPeakInsight: SectionInsight = useMemo(
    () => ({
      sectionId: 'yearly-peak-demand',
      title: 'Yearly Peak Demand',
      whatWeAreLookingAt:
        'Maximum demand (kW) per year for each scenario. Useful when interval data spans multiple years.',
      whyItMatters:
        'It shows whether peak shaving performance is consistent year-over-year and helps validate long-term expectations.',
      engineeringFocus: ['If only one year appears, you likely have a single-year interval dataset.', 'Large year-to-year variance may indicate operational or weather-driven changes.'],
      salesTalkingPoints: ['This helps reassure the customer that savings aren’t based on a “one-off” month.'],
      isGenerated: false,
    }),
    []
  );

  const demandChargeStory = useMemo(() => {
    const peakKw = Number.isFinite(simN.originalPeak) ? simN.originalPeak : 0;
    const capKw = Number.isFinite(targetThreshold) ? targetThreshold : 0;
    const shavedKw = Math.max(0, peakKw - capKw);
    const demandRate = Number.isFinite(finN.demandRate) ? finN.demandRate : 0;
    const estMonthlySavings = shavedKw * demandRate;
    return { peakKw, capKw, shavedKw, demandRate, estMonthlySavings };
  }, [simN.originalPeak, targetThreshold, finN.demandRate]);

  const demandChargeTiers = useMemo(() => {
    const rateCode = customerInfo.rateCode || customerInfo.rateSchedule || '';
    const utility = (customerInfo.serviceProvider || 'PG&E') as UtilityProvider;
    
    if (!rateCode) {
      return null;
    }

    // Try to get the rate schedule
    const rate = getRateByCode(utility, rateCode);
    
    // Type guard: check if rate has demandCharges property
    if (!rate || !('demandCharges' in rate) || !rate.demandCharges || rate.demandCharges.length === 0) {
      return null;
    }

    // Check if any demand charges have thresholds (tiered structure)
    const hasTiers = rate.demandCharges.some((dc: { threshold?: number }) => dc.threshold !== undefined);
    
    if (hasTiers) {
      // Format tiered demand charges
      const tiers = rate.demandCharges
        .filter((dc: { threshold?: number }) => dc.threshold !== undefined)
        .sort((a: { threshold?: number }, b: { threshold?: number }) => (a.threshold || 0) - (b.threshold || 0))
        .map((dc: { threshold?: number; rate: number }, index: number, arr: Array<{ threshold?: number }>) => {
          const threshold = dc.threshold || 0;
          const nextThreshold = index < arr.length - 1 ? arr[index + 1].threshold : undefined;
          const range = nextThreshold 
            ? `${threshold}–${nextThreshold} kW`
            : `${threshold}+ kW`;
          return {
            name: `Tier ${index + 1}`,
            range,
            rate: dc.rate,
          };
        });
      return { type: 'tiered' as const, tiers, rateName: rate.rateName };
    } else {
      // Format flat demand charges (most common case)
      const charges = rate.demandCharges.map((dc: { name?: string; period?: string; rate: number; season?: string }) => ({
        name: dc.name || 'Demand Charge',
        period: dc.period || 'All Hours',
        rate: dc.rate,
        season: dc.season,
      }));
      return { type: 'flat' as const, charges, rateName: rate.rateName };
    }
  }, [customerInfo.rateCode, customerInfo.rateSchedule, customerInfo.serviceProvider]);

  // Intelligent Holistic Peak Analysis
  const [holisticAnalysis, setHolisticAnalysis] = useState<any | null>(null);
  const [holisticAnalysisLoading, setHolisticAnalysisLoading] = useState(false);
  const [holisticAnalysisError, setHolisticAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    if (intervals.length === 0) {
      setHolisticAnalysis(null);
      return;
    }

    let cancelled = false;
    setHolisticAnalysisLoading(true);
    setHolisticAnalysisError(null);

    (async () => {
      try {
        // Convert intervals to LoadProfile format
        const loadProfile: LoadProfile = {
          intervals: intervals.map(i => ({
            timestamp: i.timestamp,
            kw: i.kw,
          })),
        };

        // Get demand rate from financials
        const demandRate = Number.isFinite(finN.demandRate) ? finN.demandRate : 20;

        // Run holistic analysis on backend to avoid bundling Node-only engine code in the browser.
        const res = await fetch('/api/batteries/holistic-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intervals: loadProfile.intervals.map((i) => ({
              timestamp: i.timestamp instanceof Date ? i.timestamp.toISOString() : new Date(i.timestamp as any).toISOString(),
              kw: i.kw,
            })),
            demandRate,
            financialParams: { discountRate: 0.06, inflationRate: 0.02, analysisPeriod: 15 },
            maxPaybackYears: 10,
          }),
        });
        if (!res.ok) throw new Error(`Holistic analysis failed (${res.status})`);
        const json = await res.json();
        if (!json?.success) throw new Error(String(json?.error || 'Holistic analysis failed'));
        const analysis = json.analysis;

        if (!cancelled) {
          setHolisticAnalysis(analysis);
        }
      } catch (error) {
        console.warn('Holistic analysis failed:', error);
        if (!cancelled) {
          setHolisticAnalysisError(error instanceof Error ? error.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setHolisticAnalysisLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [intervals, finN.demandRate]);

  // Utilization Analysis
  const utilizationAnalysis = useMemo(() => {
    let maxActualDischarge = 0;
    let totalActiveIntervals = 0;
    
    intervals.forEach((interval) => {
      if (interval.kw > targetThreshold) {
        totalActiveIntervals++;
        const discharge = interval.kw - targetThreshold;
        if (discharge > maxActualDischarge) maxActualDischarge = discharge;
      }
    });
    
    const utilizationPercent = batteryN.powerKw > 0 ? (maxActualDischarge / batteryN.powerKw) * 100 : 0;
    const activePercent = intervals.length > 0 ? (totalActiveIntervals / intervals.length) * 100 : 0;
    
    return {
      maxDischargeKw: Math.round(maxActualDischarge),
      utilizationPercent: Math.round(utilizationPercent),
      activePercent: Math.round(activePercent * 10) / 10,
      totalActiveIntervals,
      status: utilizationPercent >= 80 ? 'good' : utilizationPercent >= 50 ? 'warning' : 'danger',
    };
  }, [intervals, targetThreshold, batteryN]);

  // Regression Analysis - Actual vs Predicted (for model validation)
  const regressionAnalysis = useMemo(() => {
    // Compare actual demand (before battery) vs predicted (after battery)
    const dataPoints: Array<{ actual: number; predicted: number }> = [];
    
    intervals.forEach((interval) => {
      const actual = interval.kw;
      const predicted = Math.min(interval.kw, targetThreshold); // Battery clips at threshold
      if (Number.isFinite(actual) && Number.isFinite(predicted) && actual >= 0 && predicted >= 0) {
        dataPoints.push({ actual, predicted });
      }
    });

    if (dataPoints.length === 0) {
      return {
        rmse: 0,
        cvrmse: 0,
        rSquared: 0,
        mbe: 0,
        mbePercent: 0,
        scatterData: [],
        pass: false,
        dataPointCount: 0,
      };
    }

    const n = dataPoints.length;
    const actualMean = dataPoints.reduce((sum, p) => sum + p.actual, 0) / n;
    
    // RMSE (Root Mean Square Error)
    const mse = dataPoints.reduce((sum, p) => sum + Math.pow(p.actual - p.predicted, 2), 0) / n;
    const rmse = Math.sqrt(mse);
    
    // CVRMSE (Coefficient of Variation of RMSE) - ASHRAE Guideline 14
    const cvrmse = actualMean > 0 ? (rmse / actualMean) * 100 : 0;
    
    // R² (Coefficient of Determination)
    const ssRes = dataPoints.reduce((sum, p) => sum + Math.pow(p.actual - p.predicted, 2), 0);
    const ssTot = dataPoints.reduce((sum, p) => sum + Math.pow(p.actual - actualMean, 2), 0);
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
    
    // MBE (Mean Bias Error) - should be close to 0
    const mbe = dataPoints.reduce((sum, p) => sum + (p.predicted - p.actual), 0) / n;
    const mbePercent = actualMean > 0 ? (mbe / actualMean) * 100 : 0;
    
    // Scatter plot data (sample for performance - max 500 points)
    const sampleStep = Math.max(1, Math.floor(dataPoints.length / 500));
    const scatterData = dataPoints.filter((_, idx) => idx % sampleStep === 0).map(p => ({
      actual: Math.round(p.actual * 10) / 10,
      predicted: Math.round(p.predicted * 10) / 10,
    }));

    // ASHRAE Guideline 14 criteria: CVRMSE < 25%, NMBE ±5%
    const pass = cvrmse < 25 && Math.abs(mbePercent) < 5;

    return {
      rmse: Math.round(rmse * 10) / 10,
      cvrmse: Math.round(cvrmse * 100) / 100,
      rSquared: Math.round(rSquared * 1000) / 1000,
      mbe: Math.round(mbe * 10) / 10,
      mbePercent: Math.round(mbePercent * 100) / 100,
      scatterData,
      pass,
      dataPointCount: n,
    };
  }, [intervals, targetThreshold]);

  // Rate grades (Standard vs Option S schedule)
  const rateGrades = useMemo(() => {
    const systemCost = finN.systemCost;

    // Annualize helpers
    const monthKeys = new Set<string>();
    const dayKeys = new Set<string>();
    for (const i of intervals) {
      monthKeys.add(toMonthKeyUtc(i.timestamp));
      dayKeys.add(i.timestamp.toISOString().slice(0, 10));
    }
    const monthsInData = monthKeys.size || 1;
    const daysInData = dayKeys.size || 1;
    const annualizeMonths = 12 / monthsInData;
    const annualizeDays = 365 / daysInData;

    // Standard baseline demand charge (monthly peak × $/kW-month) if NOT already on Option S.
    // If already on Option S, treat "standard" as a counterfactual for comparison only.
    const baselineMonthlyPeaks = new Map<string, number>();
    for (const b of bills) baselineMonthlyPeaks.set(toMonthKeyUtc(b.billEndDate), b.peakDemandKw);
    const standardBaselineAnnual =
      Array.from(baselineMonthlyPeaks.values()).reduce((sum, v) => sum + v, 0) * finN.demandRate * annualizeMonths;

    // Standard with-battery monthly peaks from simulated intervals (finalIntervals)
    const afterMonthlyPeaks = new Map<string, number>();
    if (finalIntervals?.length) {
      for (const i of finalIntervals) {
        const mk = toMonthKeyUtc(i.timestamp);
        afterMonthlyPeaks.set(mk, Math.max(afterMonthlyPeaks.get(mk) || 0, i.kw));
      }
    }
    const standardWithBatteryAnnual =
      Array.from(baselineMonthlyPeaks.entries()).reduce((sum, [mk, peakBefore]) => {
        const peakAfter = afterMonthlyPeaks.get(mk) ?? peakBefore;
        return sum + peakAfter;
      }, 0) *
      finN.demandRate *
      annualizeMonths;

    // Option S baseline/with-battery demand charges (schedule-aware), annualized by days
    const optionSBaselineAnnual =
      calculateOptionSDemandCharges(intervals, DEFAULT_OPTION_S_RATES_2025_SECONDARY).totalInData * annualizeDays;
    const optionSWithBatteryAnnual =
      optionSDispatchForGrade?.modifiedIntervals?.length
        ? calculateOptionSDemandCharges(optionSDispatchForGrade.modifiedIntervals, DEFAULT_OPTION_S_RATES_2025_SECONDARY).totalInData *
          annualizeDays
        : optionSBaselineAnnual;

    // Current baseline schedule for savings:
    // - If already on Option S, baseline is Option S.
    // - Else baseline is Standard.
    const currentBaselineAnnual = alreadyOnOptionS ? optionSBaselineAnnual : standardBaselineAnnual;

    // IMPORTANT:
    // If alreadyOnOptionS, we should NOT present an “Option S ROI/grade” (no switch scenario).
    // In that case, the only meaningful savings is battery savings under the *current* Option S schedule:
    // savingsCurrent = optionS baseline - optionS with battery.
    const savingsStandard = Math.max(0, alreadyOnOptionS ? (optionSBaselineAnnual - optionSWithBatteryAnnual) : (currentBaselineAnnual - standardWithBatteryAnnual));
    const savingsOptionS = Math.max(0, currentBaselineAnnual - optionSWithBatteryAnnual);

    const payback = (s: number) => (s > 0 ? systemCost / s : Infinity);

    const scoreFromPayback = (p: number) => {
      if (!Number.isFinite(p)) return 0;
      if (p <= 3) return 95;
      if (p <= 5) return 85;
      if (p <= 7) return 70;
      if (p <= 10) return 55;
      return 30;
    };

    return {
      alreadyOnOptionS,
      currentBaselineAnnual: Math.round(currentBaselineAnnual),
      standard: {
        // If already on Option S, this “standard” card is repurposed to mean “current schedule (Option S) outcome”.
        annualDemandCharge: Math.round(alreadyOnOptionS ? optionSWithBatteryAnnual : standardWithBatteryAnnual),
        annualSavings: Math.round(savingsStandard),
        paybackYears: payback(savingsStandard),
        score: scoreFromPayback(payback(savingsStandard)),
      },
      optionS: alreadyOnOptionS
        ? null
        : {
            annualDemandCharge: Math.round(optionSWithBatteryAnnual),
            annualSavings: Math.round(savingsOptionS),
            paybackYears: payback(savingsOptionS),
            score: scoreFromPayback(payback(savingsOptionS)),
          },
    };
  }, [alreadyOnOptionS, bills, intervals, finalIntervals, finN.demandRate, finN.systemCost, optionSDispatchForGrade]);

  // Customer Ranking Score
  const customerScore = useMemo(() => {
    const scores = {
      peakReduction: Math.min(100, (simN.peakReductionPercent / 25) * 100),
      cycleEfficiency: Math.min(100, 100 - (cycleAnalysis.cyclesPerYear / 400) * 100),
      utilization: utilizationAnalysis.utilizationPercent,
      batteryFit: Math.min(100, simN.originalPeak > 0 ? (batteryN.capacityKwh / simN.originalPeak) * 100 : 0),
      loadShape: Math.min(100, (cycleAnalysis.eventsPerMonth / 50) * 100),
    };
    
    const weights = { peakReduction: 0.35, cycleEfficiency: 0.15, utilization: 0.20, batteryFit: 0.15, loadShape: 0.15 };
    const totalScore = Object.entries(scores).reduce((sum, [key, val]) => sum + val * weights[key as keyof typeof weights], 0);
    
    let recommendation: string;
    let color: string;
    if (totalScore >= 75) { recommendation = 'Excellent Fit'; color = 'green'; }
    else if (totalScore >= 55) { recommendation = 'Good Fit'; color = 'blue'; }
    else if (totalScore >= 35) { recommendation = 'Marginal Fit'; color = 'amber'; }
    else { recommendation = 'Poor Fit'; color = 'red'; }
    
    return {
      totalScore: Math.round(totalScore),
      scores,
      recommendation,
      color,
      radarData: [
        { metric: 'Peak Reduction', value: scores.peakReduction, fullMark: 100 },
        { metric: 'Cycle Life', value: scores.cycleEfficiency, fullMark: 100 },
        { metric: 'Utilization', value: scores.utilization, fullMark: 100 },
        { metric: 'Battery Fit', value: scores.batteryFit, fullMark: 100 },
        { metric: 'Load Shape', value: scores.loadShape, fullMark: 100 },
      ],
    };
  }, [simN, cycleAnalysis, utilizationAnalysis, batteryN]);

  // ==========================================
  // PHASE 3: FINANCIAL CALCULATIONS (markup/ROI)
  // ==========================================
  
  const projectCosts = useMemo(() => {
    const hardware = costInputs.batteryHardware;
    const installation = costInputs.installationPerUnit;
    const permits = costInputs.permitsEngineering;
    const subtotal = hardware + installation + permits;
    const profit = subtotal * (costInputs.profitMargin / 100);
    const total = subtotal + profit;
    const pct = (part: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
    
    return {
      hardware,
      installation,
      permits,
      subtotal,
      profit,
      total,
      breakdown: [
        { name: 'Hardware', value: hardware, percent: pct(hardware) },
        { name: 'Installation', value: installation, percent: pct(installation) },
        { name: 'Permits/Eng', value: permits, percent: pct(permits) },
        { name: 'Profit', value: profit, percent: pct(profit) },
      ],
    };
  }, [costInputs]);

  const roiAnalysis = useMemo(() => {
    const netAnnualSavings = savingsBreakdown.net.annual;
    const simplePayback = netAnnualSavings > 0 ? projectCosts.total / netAnnualSavings : Infinity;
    
    // NPV and cumulative cash flow
    const discountRate = 0.05;
    const years = Array.from({ length: 10 }, (_, i) => i + 1);
    let cumulativeCashFlow = -projectCosts.total;
    let npv = -projectCosts.total;
    let totalSavings = 0;
    
    const cashFlowData = years.map(year => {
      const degradation = Math.pow(0.98, year);
      const yearSavings = netAnnualSavings * degradation;
      cumulativeCashFlow += yearSavings;
      npv += yearSavings / Math.pow(1 + discountRate, year);
      totalSavings += yearSavings;
      
      return {
        year,
        annualSavings: Math.round(yearSavings),
        cumulative: Math.round(cumulativeCashFlow),
        npvCumulative: Math.round(npv + projectCosts.total - (projectCosts.total / Math.pow(1 + discountRate, year))),
      };
    });
    
    const roi = projectCosts.total > 0 ? ((totalSavings - projectCosts.total) / projectCosts.total) * 100 : 0;
    
    return {
      simplePayback: Math.round(simplePayback * 10) / 10,
      npv: Math.round(npv),
      roi: Math.round(roi),
      totalSavings10Year: Math.round(totalSavings),
      cashFlowData,
    };
  }, [savingsBreakdown, projectCosts]);

  // ==========================================
  // REPORT EXPORTS (Print)
  // ==========================================
  const exportCustomerReport = () => {
    if (!reportVm) return;
    exportBatteryCustomerSummaryPdf(reportVm);
  };
  const exportInternalReport = () => {
    if (!reportVm) return;
    exportBatteryFullPdf(reportVm);
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ========== HEADER ========== */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" /> Back to Calculator
          </button>
          <div className="flex gap-2">
            <button
              onClick={exportCustomerReport}
              disabled={!reportVm}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                reportVm ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500'
              }`}
            >
              <Download className="w-4 h-4" /> Export Report
            </button>
          </div>
        </div>

        {/* ========== DATA SUMMARY BAR ========== */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-4 text-white">
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <span className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> {intervals.length.toLocaleString()} interval data points
            </span>
            <span className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-2">
              <Calendar className="w-4 h-4" /> {bills.length} billing periods
            </span>
            <span className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-2">
              <Battery className="w-4 h-4" />
              {batteryQuantity > 1 
                ? `${batteryQuantity}x ${batteryN.modelName} (${(batteryN.capacityKwh * batteryQuantity).toFixed(0)} kWh / ${(batteryN.powerKw * batteryQuantity).toFixed(0)} kW total)`
                : `${batteryN.modelName} (${batteryN.capacityKwh.toFixed(0)} kWh / ${batteryN.powerKw.toFixed(0)} kW)`}
            </span>
            {finN.annualSavings > 0 && Number.isFinite(finN.paybackYears) && (
              <span className="bg-green-500/90 px-3 py-1 rounded-full flex items-center gap-2 font-semibold">
                <DollarSign className="w-4 h-4" /> 
                ROI: {finN.paybackYears.toFixed(1)}yr payback | ${Number(finN.annualSavings).toLocaleString()}/yr savings
              </span>
            )}
            {alreadyOnOptionS && (
              <span className="bg-purple-500/90 px-3 py-1 rounded-full flex items-center gap-2 font-semibold">
                <Zap className="w-4 h-4" /> Option S Active
              </span>
            )}
          </div>
        </div>

        {/* ========== LAST RUN + DIFF (persisted snapshot) ========== */}
        {reportVm && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">Last run</div>
                <div className="text-xs text-gray-600">
                  analysisId <span className="font-mono">{reportVm.analysisId}</span> • runId{' '}
                  <span className="font-mono">{reportVm.runId}</span> • {new Date(reportVm.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setShowRunDetails((s) => !s)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {showRunDetails ? 'Hide details' : 'Show details'}
              </button>
            </div>

            {showRunDetails && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Baseline peak</div>
                    <div className="text-lg font-bold text-gray-900">{reportVm.baselineKw.toFixed(1)} kW</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Spike count</div>
                    <div className="text-lg font-bold text-gray-900">{reportVm.spikeCount}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Annual savings</div>
                    <div className="text-lg font-bold text-gray-900">
                      ${Math.round(reportVm.annualSavings).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500">NPV (10yr, 5%)</div>
                    <div className="text-lg font-bold text-gray-900">
                      ${Math.round(reportVm.npv10yr).toLocaleString()}
                    </div>
                  </div>
                </div>

                {headlineDiff && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="text-sm font-semibold text-amber-900 mb-2">Diff vs previous run</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      {headlineDiff.map((d) => (
                        <div key={d.label} className="flex justify-between gap-3">
                          <span className="text-amber-900">{d.label}</span>
                          <span className="font-mono text-amber-900">
                            {Number.isFinite(d.delta) ? (d.delta >= 0 ? '+' : '') + d.delta.toFixed(2) : 'n/a'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-600">
                  <div className="font-semibold text-gray-800 mb-1">Manifest</div>
                  <div className="font-mono whitespace-pre-wrap break-words">
                    {reportVm.manifestFooter.join('\n')}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== BILLING CYCLE DETAIL (tariff engine) ========== */}
        {tariffEngineResult?.success && Array.isArray(tariffEngineResult.cycles) && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Billing Cycle Detail</h3>
                <div className="text-sm text-gray-600">
                  Tariff: <span className="font-mono">{tariffEngineResult.detectedTariff?.tariffId}</span> •{' '}
                  <span className="font-mono">{tariffEngineResult.detectedTariff?.rateCode}</span> • confidence{' '}
                  {Number(tariffEngineResult.detectedTariff?.confidence ?? 0).toFixed(2)}
                </div>
                {Array.isArray(tariffEngineResult.missingComponentsNotes) && tariffEngineResult.missingComponentsNotes.length > 0 && (
                  <div className="text-xs text-amber-700 mt-2">
                    Missing components: {tariffEngineResult.missingComponentsNotes.join(' ')}
                  </div>
                )}
              </div>
              {tariffEngineResult.selectedScenario && (
                <div className="text-right">
                  <div className="text-xs text-gray-500">Selected cap</div>
                  <div className="text-lg font-bold text-gray-900">
                    {Number(tariffEngineResult.selectedScenario.capKw ?? 0).toFixed(1)} kW
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 font-semibold text-gray-700">Bill End</th>
                    <th className="text-right p-2 font-semibold text-gray-700">Billing demand before</th>
                    <th className="text-right p-2 font-semibold text-gray-700">Billing demand after</th>
                    <th className="text-left p-2 font-semibold text-gray-700">Determinant</th>
                    <th className="text-left p-2 font-semibold text-gray-700">Binding timestamp</th>
                    <th className="text-right p-2 font-semibold text-gray-700">Cycle savings ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {tariffEngineResult.cycles.map((c: any) => {
                    const det = Array.isArray(c.determinants) ? c.determinants[0] : null;
                    const bind = det?.bindingTimestampsBefore?.[0] || det?.bindingTimestampsAfter?.[0] || '';
                    return (
                      <tr key={c.cycleId} className="border-t">
                        <td className="p-2 font-mono">{String(c.billEndDate || '').slice(0, 10)}</td>
                        <td className="p-2 text-right font-mono">{Number(det?.beforeKw ?? 0).toFixed(1)}</td>
                        <td className="p-2 text-right font-mono">{Number(det?.afterKw ?? 0).toFixed(1)}</td>
                        <td className="p-2">{det?.name || det?.determinantId || 'n/a'}</td>
                        <td className="p-2 font-mono">{bind ? String(bind).replace('T', ' ').slice(0, 16) : 'n/a'}</td>
                        <td className="p-2 text-right font-mono">
                          {Number(c.savings ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {Array.isArray(tariffEngineResult.scenarios) && tariffEngineResult.scenarios.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Scenario summary (top 3)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {tariffEngineResult.scenarios.map((s: any) => (
                    <div key={String(s.capKw)} className="border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500">Cap</div>
                      <div className="text-lg font-bold text-gray-900">{Number(s.capKw).toFixed(1)} kW</div>
                      <div className="text-sm text-gray-700">
                        Savings: ${Math.round(Number(s.annualSavings ?? 0)).toLocaleString()}/yr
                      </div>
                      <div className="text-sm text-gray-700">
                        NPV10: ${Math.round(Number(s.npv10 ?? 0)).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Payback: {Number.isFinite(Number(s.paybackYears)) ? Number(s.paybackYears).toFixed(1) : 'N/A'} yrs
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== BATTERY CONFIGURATION SUMMARY ========== */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Battery className="w-6 h-6 text-indigo-600" />
                Battery System Configuration
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Battery Model</div>
                  <div className="text-lg font-bold text-gray-900">{batteryN.manufacturer} {batteryN.modelName}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {batteryQuantity > 1 ? (
                      <span>{batteryQuantity} units × {batteryN.capacityKwh.toFixed(0)} kWh / {batteryN.powerKw.toFixed(0)} kW</span>
                    ) : (
                      <span>{batteryN.capacityKwh.toFixed(0)} kWh / {batteryN.powerKw.toFixed(0)} kW</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Total System: {(batteryN.capacityKwh * batteryQuantity).toFixed(0)} kWh / {(batteryN.powerKw * batteryQuantity).toFixed(0)} kW
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Financial Performance</div>
                  {finN.annualSavings > 0 && Number.isFinite(finN.paybackYears) ? (
                    <>
                      <div className="text-lg font-bold text-green-600">${Number(finN.annualSavings).toLocaleString()}/yr</div>
                      <div className="text-sm text-gray-600 mt-1">Payback: {finN.paybackYears.toFixed(1)} years</div>
                      <div className="text-xs text-gray-500 mt-2">System Cost: ${Number(finN.systemCost).toLocaleString()}</div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">No financial data available</div>
                  )}
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Rate Schedule Status</div>
                  {alreadyOnOptionS ? (
                    <>
                      <div className="flex items-center gap-2 text-purple-700 font-semibold">
                        <Zap className="w-5 h-5" />
                        <span>Option S Active</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-2">Rate: {customerInfo.rateCode}</div>
                      <div className="text-xs text-gray-500 mt-1">No switch ROI available (already enrolled)</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-gray-700">Standard Rate</div>
                      <div className="text-xs text-gray-600 mt-2">Rate: {customerInfo.rateCode}</div>
                      <div className="text-xs text-blue-600 mt-1">Option S eligibility can be checked</div>
                    </>
                  )}
                </div>
              </div>
              {(batteryN.powerKw * batteryQuantity) < simN.originalPeak * 0.8 && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <strong>Battery sizing note:</strong> Total system power ({(batteryN.powerKw * batteryQuantity).toFixed(0)} kW) is less than 80% of peak demand ({simN.originalPeak.toFixed(0)} kW). 
                      This may limit peak shaving effectiveness. Consider larger system or multiple units.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========== CUSTOMER INFO + SCORE ========== */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{customerInfo.billingName}</h1>
              <p className="text-gray-600 mt-1">{customerInfo.siteAddress}</p>
              <div className="flex gap-6 mt-3 text-sm text-gray-500">
                <span>SAID: <strong className="text-gray-700">{customerInfo.saId}</strong></span>
                <span>Rate: <strong className="text-gray-700">{customerInfo.rateCode}</strong></span>
                <span>Meter: <strong className="text-gray-700">{customerInfo.meterNumber}</strong></span>
              </div>
            </div>
            <div className="text-center">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold ${customerScore.color === 'green' ? 'bg-green-500' : customerScore.color === 'blue' ? 'bg-blue-500' : customerScore.color === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`}>
                {customerScore.totalScore}
              </div>
              <div className={`mt-2 text-sm font-semibold ${customerScore.color === 'green' ? 'text-green-600' : customerScore.color === 'blue' ? 'text-blue-600' : customerScore.color === 'amber' ? 'text-amber-600' : 'text-red-600'}`}>
                {customerScore.recommendation}
              </div>
              <div className="text-xs text-gray-400 mt-1">Battery Fit Score</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-left">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                  <div className="text-[11px] text-gray-600">{alreadyOnOptionS ? 'Current schedule grade (Option S)' : 'Standard rate grade'}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-gray-900">{rateGrades.standard.score}/100</div>
                    <div className="text-[11px] text-gray-700">{formatCurrency(rateGrades.standard.annualSavings)}</div>
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Payback: {Number.isFinite(rateGrades.standard.paybackYears) ? rateGrades.standard.paybackYears.toFixed(1) : '—'} yrs
                  </div>
                </div>
                {alreadyOnOptionS ? (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 flex items-center">
                    <div>
                      <div className="text-[11px] text-purple-700 font-semibold">S-Rate already in place</div>
                      <div className="text-[11px] text-purple-700 mt-1">
                        No Option S “switch” ROI/grade is shown because the site is already enrolled.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                    <div className="text-[11px] text-purple-700">Option S grade</div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-purple-900">{rateGrades.optionS?.score ?? 0}/100</div>
                      <div className="text-[11px] text-purple-800">{formatCurrency(rateGrades.optionS?.annualSavings ?? 0)}</div>
                    </div>
                    <div className="text-[11px] text-purple-700">
                      Payback: {Number.isFinite(rateGrades.optionS?.paybackYears ?? Infinity) ? (rateGrades.optionS?.paybackYears ?? Infinity).toFixed(1) : '—'} yrs
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-2">
            <Building className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-bold text-gray-900">Project Details</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">High-level facility and tariff context for interpreting the savings and ROI.</p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-xs text-gray-500">Facility Type</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">{customerInfo.facilityType || 'N/A'}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-xs text-gray-500">Utility Provider</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">{customerInfo.serviceProvider || 'N/A'}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-xs text-gray-500">Rate Schedule</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">{customerInfo.rateSchedule || customerInfo.rateCode || 'N/A'}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-xs text-gray-500">Peak Demand</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">{facilityStats.peakDemand.toFixed(1)} kW</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-xs text-gray-500">Average Demand</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">{facilityStats.avgDemand.toFixed(1)} kW</div>
              <div className="text-xs text-gray-500 mt-1">Load factor: {(facilityStats.loadFactor * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* ========== PHASE TABS ========== */}
        <div className="flex gap-2">
          <button 
            onClick={() => setActivePhase(2)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${activePhase === 2 ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4" /> Phase 2: Feasibility & Savings
            </span>
          </button>
          <button 
            onClick={() => setActivePhase(3)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${activePhase === 3 ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Phase 3: Markup & ROI
            </span>
          </button>
        </div>

        {/* ==========================================
            PHASE 2: FEASIBILITY & SAVINGS (LOCKED SAVINGS)
        ========================================== */}
        {activePhase === 2 && (
          <div className="space-y-6">
            
            {/* ===== PEAK SHAVING PERFORMANCE DASHBOARD ===== */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold">Peak Shaving Performance Dashboard</h2>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Key battery performance metrics derived from the interval dataset: how much peak demand is reduced, how often peaks occur, and how well the battery’s power rating matches the site’s spikes.
              </p>

              {intervals.length === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 mb-6">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  No valid interval data was detected (timestamps or kW values were not parseable). Upload interval data again and re-run analysis.
                </div>
              )}
              
              {/* Top Metrics */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <MetricCard 
                  label="Peak Reduction" 
                  value={`${formatPercent(simN.peakReductionPercent)}`}
                  subtext={simN.peakReductionPercent >= 15 ? 'Optimal range' : 'Below optimal (15-30%)'}
                  status={simN.peakReductionPercent >= 15 ? 'good' : 'warning'}
                  icon={<AlertTriangle className="w-4 h-4" />}
                />
                <MetricCard 
                  label="Events/Month" 
                  value={cycleAnalysis.eventsPerMonth}
                  subtext="Avg peak shaving cycles"
                  status="neutral"
                  icon={<Activity className="w-4 h-4" />}
                />
                <MetricCard 
                  label="Avg Reduction" 
                  value={`${Math.round(simN.peakReduction)} kW`}
                  subtext="Per event"
                  status="neutral"
                  icon={<TrendingDown className="w-4 h-4" />}
                />
                <MetricCard 
                  label="Utilization" 
                  value={`${utilizationAnalysis.utilizationPercent}%`}
                  subtext={utilizationAnalysis.status === 'good' ? 'Good' : 'Could improve'}
                  status={utilizationAnalysis.status as any}
                  icon={<Gauge className="w-4 h-4" />}
                />
              </div>

              {/* Peak Reduction Explanation */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-2">Understanding Your {formatPercent(simN.peakReductionPercent)} Peak Reduction</h3>
                    <div className="text-sm text-blue-800 space-y-2">
                      <p>
                        <strong>Original Peak:</strong> {Math.round(simN.originalPeak)} kW | 
                        <strong> Optimized Threshold:</strong> {Math.round(targetThreshold)} kW | 
                        <strong> New Peak:</strong> {Math.round(simN.newPeak)} kW
                      </p>
                      <p>
                        The threshold was <strong>optimized to maximize peak reduction per dollar spent</strong>, not set to a fixed percentage. 
                        The system tested multiple threshold values and selected {Math.round(targetThreshold)} kW ({formatPercent((targetThreshold / simN.originalPeak) * 100)} of peak) 
                        because it delivers the best value—achieving {Math.round(simN.originalPeak - simN.newPeak)} kW reduction while maintaining acceptable ROI.
                      </p>
                      <p className="text-xs text-blue-700 pt-1">
                        <strong>Optimization criteria:</strong> Maximizes peak reduction per dollar, subject to payback period constraints (10-25 years). 
                        All costs are pre-markup and pre-tax, ensuring the solution remains profitable after adding fees and markup.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Battery Specs */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500">Target Peak Threshold</div>
                  <div className="text-xl font-bold text-gray-800">{Math.round(targetThreshold)} kW</div>
                  <div className="text-xs text-gray-400">Battery discharges above this level</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500">Battery Duration</div>
                  <div className="text-xl font-bold text-gray-800">{batterySpecs.duration} hrs</div>
                  <div className="text-xs text-gray-400">{batteryN.capacityKwh} kWh ÷ {batteryN.powerKw} kW</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500">C-Rate</div>
                  <div className="text-xl font-bold text-gray-800">{batterySpecs.cRate}C</div>
                  <div className="text-xs text-gray-400">Power-to-capacity ratio</div>
                </div>
              </div>

              {/* Efficiency & Degradation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-blue-800">Round-Trip Efficiency</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Battery Efficiency</span>
                      <span className="font-semibold">{batterySpecs.efficiency}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gross kW Reduction</span>
                      <span className="font-semibold">{efficiencyImpact.grossSavingsKw} kW</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Net kW Reduction (after losses)</span>
                      <span className="font-bold">{efficiencyImpact.netSavingsKw} kW</span>
                    </div>
                    <div className="text-xs text-gray-400 pt-2 border-t">
                      ~{efficiencyImpact.lostToInefficiency} kW lost to charging/discharging inefficiencies
                    </div>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-amber-800">Capacity Degradation Impact</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Year 1 (100%)</span>
                      <span className="font-semibold">{degradationAnalysis[0]?.effectivePeakReductionKw ?? 0} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Year 5 (~92%)</span>
                      <span className="font-semibold">{degradationAnalysis[4]?.effectivePeakReductionKw ?? 0} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Year 10 (~82%)</span>
                      <span className="font-semibold">{degradationAnalysis[9]?.effectivePeakReductionKw ?? 0} kW</span>
                    </div>
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      Capacity fade reduces peak shaving over time (assumes 2%/year).
                    </div>
                  </div>
                </div>
              </div>

            {/* Peak Frequency & Battery Response */}
            <div className="grid grid-cols-4 gap-4 mt-4">
              <MetricCard
                label="Peak hits/day (avg)"
                value={peakFrequency.perDayAvg}
                subtext={`Days with peaks: ${peakFrequency.daysWithPeaks}`}
              />
              <MetricCard
                label="Peak hits/week (avg)"
                value={peakFrequency.perWeekAvg}
                subtext={`Weeks with peaks: ${peakFrequency.weeksWithPeaks}`}
              />
              <MetricCard
                label="Peak hits/month (avg)"
                value={peakFrequency.perMonthAvg}
                subtext={`Months with peaks: ${peakFrequency.monthsWithPeaks}`}
              />
              <MetricCard
                label="Annualized peak hits"
                value={peakFrequency.perYear}
                subtext={`Max in a day: ${peakFrequency.maxHitsPerDay}`}
              />
            </div>
            <div className="text-xs text-gray-600 mt-2">
              Battery expected shave up to {Math.round(simN.peakReduction)} kW when peaks occur (threshold ~{Math.round(targetThreshold)} kW). Events counted when load ≥ target − {SHAVE_DETECTION_BUFFER_KW} kW.
            </div>

            <AIInsight
                title="Performance Analysis"
                engineerInsight={`Battery cycles ${cycleAnalysis.cyclesPerYear} times/year with ${utilizationAnalysis.utilizationPercent}% utilization. At ${cycleAnalysis.cyclesPerYear} cycles/year, expected lifetime is ~${cycleAnalysis.expectedLifetimeYears} years before 80% capacity threshold.`}
                salesInsight={`This battery shaves about ${Math.round(simN.peakReduction)} kW when peaks occur, about ${cycleAnalysis.eventsPerMonth} times per month. Higher peak reduction (15–30%) usually means better customer value and easier savings story.`}
                recommendations={[
                  simN.peakReductionPercent >= 15 ? '✓ Peak reduction is in optimal 15-30% range' : `Consider larger battery to achieve 15%+ reduction (currently ${formatPercent(simN.peakReductionPercent)})`,
                  utilizationAnalysis.utilizationPercent >= 70 ? '✓ Good battery utilization' : 'Battery may be oversized for this load profile',
                  cycleAnalysis.cyclesPerYear < 300 ? '✓ Moderate cycling extends battery life' : 'High cycle count - monitor degradation closely',
                ]}
              />
              <div className="mt-2 text-xs text-gray-600">
                Dispatch diagnostics: max observed load {cycleAnalysis.maxObservedKw} kW vs target {Math.round(targetThreshold * 10) / 10} kW; shave events counted {cycleAnalysis.totalEvents}. Events count when load ≥ target − {SHAVE_DETECTION_BUFFER_KW} kW.
              </div>

              {/* AI Q&A Bot */}
              <AnalysisQABot
                context={{
                  battery: {
                    modelName: batteryN.modelName,
                    manufacturer: batteryN.manufacturer || 'Unknown',
                    capacityKwh: batteryN.capacityKwh,
                    powerKw: batteryN.powerKw,
                    efficiency: batteryN.efficiency,
                    warranty: batteryN.warranty,
                    price: toNum((battery as any).price, 0),
                  },
                  simulationResult: {
                    originalPeak: simN.originalPeak,
                    newPeak: simN.newPeak,
                    peakReduction: simN.peakReduction,
                    peakReductionPercent: simN.peakReductionPercent,
                  },
                  financials: {
                    demandRate: finN.demandRate,
                    annualSavings: finN.annualSavings,
                    systemCost: finN.systemCost,
                    paybackYears: finN.paybackYears,
                  },
                  cycleAnalysis: {
                    cyclesPerYear: cycleAnalysis.cyclesPerYear,
                    eventsPerMonth: cycleAnalysis.eventsPerMonth,
                    maxObservedKw: cycleAnalysis.maxObservedKw,
                  },
                  peakFrequency: {
                    perYear: peakFrequency.perYear,
                    perMonthAvg: peakFrequency.perMonthAvg,
                  },
                  targetThreshold,
                  alternativeBatteries,
                }}
              />

              {/* ===== NEW: Battery Diagnostics & Peak Patterns ===== */}
              {batteryDiagnostics && diagSimulationResult && (
                <div className="mt-6 space-y-6">
                  <SectionCard
                    title="Battery Diagnostics (Why it works / Why it doesn't)"
                    description="Explainable diagnostics: what constrained shaving (kW vs kWh vs charging headroom), what peak shapes you actually have, and what operational changes would make storage work better."
                    icon={<Gauge className="w-5 h-5 text-indigo-600" />}
                  >
                    <div className="space-y-6">
                      <BatteryReasonBadges diagnostic={batteryDiagnostics} />
                      <BatteryUtilizationGauges diagnostic={batteryDiagnostics} />
                      <ConstraintWaterfallChart diagnostic={batteryDiagnostics} />

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="text-sm font-semibold text-gray-900">Top limiting factors</div>
                          <div className="text-xs text-gray-600 mb-2">Ranked by likely impact on missed shaving.</div>
                          <ul className="text-sm text-gray-800 space-y-2">
                            {batteryDiagnostics.limitingFactors.slice(0, 3).map((f, idx) => (
                              <li key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div className="font-semibold">{f.factor.replace(/_/g, ' ')}</div>
                                  <div className="text-xs text-gray-500">{f.severity}</div>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">{f.description}</div>
                                <div className="text-xs text-indigo-700 mt-2">{f.recommendation}</div>
                              </li>
                            ))}
                            {batteryDiagnostics.limitingFactors.length === 0 && (
                              <li className="text-xs text-gray-600">No dominant limiting factor detected for this run.</li>
                            )}
                          </ul>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="text-sm font-semibold text-gray-900">Peak pattern summary</div>
                          <div className="text-xs text-gray-600 mb-2">
                            Peak types help decide whether you need more kW (short spikes) or more kWh (long peaks).
                          </div>
                          <div className="space-y-2">
                            {peakPatterns.slice(0, 4).map((p, idx) => (
                              <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-semibold text-gray-900">{p.patternType.replace(/_/g, ' ')}</div>
                                  <div className="text-xs text-gray-500">{p.batterySuitability}</div>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  ~{p.frequencyPerMonth.toFixed(1)} events/mo • {p.typicalDurationHours.toFixed(2)}h • {p.typicalMagnitudeKw.toFixed(1)} kW excess
                                </div>
                                <div className="text-[11px] text-gray-500 mt-1">{p.reasoning}</div>
                              </div>
                            ))}
                            {peakPatterns.length === 0 && <div className="text-xs text-gray-600">No peak events detected above the target.</div>}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-2">
                            Most common peak hours (by event start):{' '}
                            {peakFrequencyNew.eventsPerHour
                              .map((v, h) => ({ h, v }))
                              .sort((a, b) => b.v - a.v)
                              .slice(0, 3)
                              .map((x) => `${String(x.h).padStart(2, '0')}:00`)
                              .join(', ')}
                          </div>
                        </div>
                      </div>

                      <PeakEventTimeline
                        intervals={intervals}
                        peakEvents={peakEvents}
                        socHistory={persistedSocHistory ?? []}
                        simulationResult={diagSimulationResult}
                        height={320}
                      />

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <PeakEventScatterPlot
                          peakEvents={peakEvents}
                          intervals={intervals}
                          simulationResult={diagSimulationResult}
                          battery={batterySpecForDiagnostics}
                          thresholdKw={targetThreshold}
                          height={280}
                        />
                        <BatteryPerformanceHeatmap
                          intervals={intervals}
                          simulationResult={diagSimulationResult}
                          thresholdKw={targetThreshold}
                          mode="missed"
                          title="Missed shave heatmap"
                          subtitle="Where unshaved excess concentrates (helps target operational load shifting)."
                          onCellClick={(cell) => {
                            const dow = Number(cell.row);
                            const hour = Number(cell.col);
                            if (!Number.isFinite(dow) || !Number.isFinite(hour)) return;

                            const afterKw =
                              diagSimulationResult?.new_intervals_kw && diagSimulationResult.new_intervals_kw.length
                                ? diagSimulationResult.new_intervals_kw
                                : diagSimulationResult?.final_load_profile?.intervals?.map((i) => i.kw) ?? null;

                            const sums = new Map<string, number>();
                            for (let idx = 0; idx < intervals.length; idx++) {
                              const ts = intervals[idx].timestamp instanceof Date ? intervals[idx].timestamp : new Date(intervals[idx].timestamp);
                              if (!Number.isFinite(ts.getTime())) continue;
                              if (ts.getDay() !== dow || ts.getHours() !== hour) continue;
                              const demand = intervals[idx].kw ?? 0;
                              const after = afterKw ? afterKw[idx] ?? demand : demand;
                              const excess = Math.max(0, demand - targetThreshold);
                              const shaved = Math.max(0, demand - after);
                              const missed = Math.max(0, excess - shaved);
                              if (missed <= 0) continue;
                              const dk = toDayKeyLocal(ts);
                              sums.set(dk, (sums.get(dk) ?? 0) + missed);
                            }

                            const best = Array.from(sums.entries()).sort((a, b) => b[1] - a[1])[0];
                            if (!best) return;

                            setDrilldownDayKey(best[0]);
                            setDrilldownTitle(
                              `Worst day for ${DOW_LABELS[dow] ?? 'DOW'} @ ${String(hour).padStart(2, '0')}:00 (missed shave focus)`
                            );
                          }}
                        />
                      </div>

                      {usageOptimization && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="text-sm font-semibold text-gray-900">What would make this battery work better?</div>
                          <div className="text-xs text-gray-600 mb-3">
                            Operational levers inferred from peak timing and concentration (best paired with storage).
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="text-xs font-semibold text-gray-700 mb-2">Load shifting opportunities</div>
                              <ul className="text-xs text-gray-700 space-y-2">
                                {usageOptimization.loadShifting.slice(0, 3).map((o, idx) => (
                                  <li key={idx} className="border border-gray-200 rounded-md p-2">
                                    <div className="font-semibold">{o.equipment}</div>
                                    <div className="text-gray-600">
                                      Shift {o.currentPeakTime} → {o.recommendedShiftTime} • {o.feasibility}
                                    </div>
                                    {o.notes && <div className="text-gray-500 mt-1">{o.notes}</div>}
                                  </li>
                                ))}
                                {usageOptimization.loadShifting.length === 0 && <li>No obvious load shifting patterns detected.</li>}
                              </ul>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="text-xs font-semibold text-gray-700 mb-2">Sizing guidance (minimum vs optimal)</div>
                              <div className="text-xs text-gray-700 space-y-1">
                                <div>
                                  Minimum: <span className="font-semibold">{Math.round(sizingRecommendation.recommendedSizing.minPowerKw)} kW</span> /{' '}
                                  <span className="font-semibold">{Math.round(sizingRecommendation.recommendedSizing.minCapacityKwh)} kWh</span>
                                </div>
                                <div>
                                  Conservative optimal: <span className="font-semibold">{Math.round(sizingRecommendation.recommendedSizing.optimalPowerKw)} kW</span> /{' '}
                                  <span className="font-semibold">{Math.round(sizingRecommendation.recommendedSizing.optimalCapacityKwh)} kWh</span>
                                </div>
                                <div className="text-gray-500 mt-2">
                                  {sizingRecommendation.recommendedSizing.reasoning.slice(0, 3).join(' ')}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </SectionCard>
                </div>
              )}
            </div>

            <SectionCard
              title="Demand Charge Structure (Client Explanation)"
              description="Demand charges are usually set by your single highest 15-minute peak in a month. Batteries reduce that peak so it never shows up on the bill."
              icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
              insight={{
                sectionId: 'demand-charge-explanation',
                title: 'Demand Charge Explanation',
                whatWeAreLookingAt: 'A simple, sales-ready explanation of how demand charges work and how the battery reduces the monthly peak that drives those charges.',
                whyItMatters:
                  'This is typically the biggest lever for commercial customers: one spike sets the whole month’s demand charge. If we cap spikes, savings are immediate and easy to understand.',
                engineeringFocus: [
                  'Confirm the demand charge rate ($/kW-month) and whether billing uses 15-minute or 30-minute intervals.',
                  'Validate the peak cap level (target threshold) against battery kW rating and event duration.',
                  'If S-Rate is pursued, validate eligibility and tariff-driven dispatch requirements.',
                ],
                salesTalkingPoints: [
                  'Demand charges are “penalty fees” for your highest spike in the month.',
                  `Here the customer’s peak is ~${demandChargeStory.peakKw.toFixed(1)} kW; the battery aims to cap it near ~${demandChargeStory.capKw.toFixed(1)} kW.`,
                  `That’s about ${demandChargeStory.shavedKw.toFixed(1)} kW of peak reduction—roughly $${demandChargeStory.estMonthlySavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}/month in demand savings at $${demandChargeStory.demandRate.toFixed(2)}/kW-month.`,
                ],
                recommendations: ['Use the monthly peak chart below to show the “one spike sets the bill” concept visually.'],
                isGenerated: false,
              }}
              insightVariant="green"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs text-gray-600">Current Situation</div>
                  <div className="text-sm text-gray-800 mt-2">
                    Client is billed based on their peak usage of{' '}
                    <span className="font-semibold">{demandChargeStory.peakKw.toFixed(1)} kW</span>. Most utilities charge demand based on the single highest 15-minute interval each month.
                  </div>
                </div>

                {demandChargeTiers ? (
                  demandChargeTiers.type === 'tiered' ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="text-xs text-gray-600 mb-2">
                        Demand Charge Tiers ({demandChargeTiers.rateName})
                      </div>
                      <ul className="text-sm text-gray-800 space-y-1">
                        {demandChargeTiers.tiers.map((tier: { name: string; range: string; rate: number }, idx: number) => (
                          <li key={idx}>
                            <span className="font-semibold">{tier.name} ({tier.range})</span>: ${tier.rate.toFixed(2)}/kW
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="text-xs text-gray-600 mb-2">
                        Demand Charges ({demandChargeTiers.rateName})
                      </div>
                      <ul className="text-sm text-gray-800 space-y-1">
                        {demandChargeTiers.charges.map((charge: { name: string; period: string; rate: number; season?: string }, idx: number) => (
                          <li key={idx}>
                            <span className="font-semibold">{charge.name}</span>
                            {charge.period !== 'All Hours' && ` (${charge.period})`}
                            {charge.season && ` - ${charge.season}`}
                            : ${charge.rate.toFixed(2)}/kW
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="text-xs text-gray-600 mb-2">Demand Charge Information</div>
                    <div className="text-sm text-gray-800">
                      Rate schedule not found. Demand charges depend on the customer's tariff and utility.
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-xs text-emerald-700">Battery Strategy</div>
                  <div className="text-sm text-emerald-900 mt-2">
                    By capping demand near <span className="font-semibold">{demandChargeStory.capKw.toFixed(1)} kW</span>, the battery prevents the facility from reaching higher demand charges during peak events.
                  </div>
                  <div className="mt-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-emerald-800">Estimated demand savings/month</span>
                      <span className="font-semibold text-emerald-900">
                        ${demandChargeStory.estMonthlySavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="text-xs text-emerald-700 mt-1">
                      Based on ~{demandChargeStory.shavedKw.toFixed(1)} kW shaved × ${demandChargeStory.demandRate.toFixed(2)}/kW-month.
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Intelligent Peak Analysis Section */}
            {holisticAnalysisLoading && (
              <SectionCard
                title="Intelligent Peak Analysis & Scenario Recommendations"
                description="Analyzing load patterns and calculating battery scenarios..."
              >
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <div className="text-sm text-gray-600">Analyzing scenarios and testing batteries...</div>
                  </div>
                </div>
              </SectionCard>
            )}
            {holisticAnalysisError && (
              <SectionCard
                title="Intelligent Peak Analysis & Scenario Recommendations"
                description="Error loading analysis"
              >
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-800">Error: {holisticAnalysisError}</div>
                  <div className="text-sm text-red-600 mt-2">Could not load battery catalog. Please ensure the server is running.</div>
                </div>
              </SectionCard>
            )}
            {holisticAnalysis && !holisticAnalysisLoading && (
              <SectionCard
                title="Intelligent Peak Analysis & Scenario Recommendations"
                description="Automatically detects baseline operating levels, identifies all spikes, and analyzes multiple shaving scenarios with full cost-benefit analysis."
                insight={{
                  sectionId: 'intelligent-peak-analysis',
                  title: 'Holistic Battery Analysis',
                  whatWeAreLookingAt: 'Automated analysis of load patterns, spike detection, and economic viability of different shaving scenarios.',
                  whyItMatters: 'This analysis automatically identifies your baseline operating level, detects all demand spikes, and evaluates multiple battery scenarios to find the best economic fit - not just what\'s technically possible, but what makes financial sense.',
                  engineeringFocus: [
                    'Baseline operating level identified through statistical analysis',
                    'All significant spikes detected relative to baseline',
                    'Multiple scenarios tested with full financial analysis (payback, ROI, NPV)',
                    'Economic viability scoring determines which scenarios make sense',
                  ],
                  salesTalkingPoints: [
                    'System automatically identified your typical operating level and all demand spikes',
                    'Multiple shaving scenarios analyzed to find the best economic fit',
                    'Only scenarios with good payback and ROI are recommended',
                  ],
                  recommendations: ['Review recommended scenarios for optimal battery sizing and economics'],
                  isGenerated: false,
                }}
                insightVariant="blue"
              >
                {/* Baseline Analysis */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-blue-600" />
                    Baseline Operating Analysis
                  </h3>
                  
                  {/* Make baseline more prominent */}
                  <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-4 mb-4">
                    <div className="text-sm font-semibold text-blue-900 mb-2">Your Facility's Baseline Operating Level</div>
                    <div className="text-3xl font-bold text-blue-900">
                      {holisticAnalysis.baseline.typicalOperatingKw.toFixed(1)} kW
                    </div>
                    <div className="text-sm text-blue-700 mt-2">
                      This is your typical operating level - the facility runs at this level {holisticAnalysis.baseline.baselinePercentage.toFixed(1)}% of the time.
                      <br />
                      <span className="font-semibold">All spikes above this baseline are what we're analyzing to shave.</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-xs text-blue-600 mb-1">Typical Operating Level (Baseline)</div>
                      <div className="text-2xl font-bold text-blue-900">
                        {holisticAnalysis.baseline.typicalOperatingKw.toFixed(0)} kW
                      </div>
                      <div className="text-xs text-blue-700 mt-1">
                        {holisticAnalysis.baseline.baselinePercentage.toFixed(1)}% of time
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-xs text-gray-600 mb-1">Baseline Threshold</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {holisticAnalysis.baseline.baselineKw.toFixed(0)} kW
                      </div>
                      <div className="text-xs text-gray-700 mt-1">For spike detection</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-xs text-gray-600 mb-1">Mean Demand</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {holisticAnalysis.baseline.meanKw.toFixed(0)} kW
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-xs text-gray-600 mb-1">Std Deviation</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {holisticAnalysis.baseline.stdDevKw.toFixed(0)} kW
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    <div className="font-semibold mb-1">How Baseline Was Calculated:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {holisticAnalysis.baseline.reasoning.map((r, i) => (
                        <li key={i} className="text-xs">{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Detected Spikes */}
                {holisticAnalysis.spikes.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      Detected Spikes ({holisticAnalysis.spikes.length})
                    </h3>
                    <div className="space-y-3">
                      {holisticAnalysis.spikes.slice(0, 5).map((spike, idx) => (
                        <div key={idx} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-semibold text-orange-900">
                                Spike #{idx + 1}: {spike.peakKw.toFixed(1)} kW Peak
                              </div>
                              <div className="text-sm text-orange-700">
                                {new Date(spike.start).toLocaleString()} - {new Date(spike.end).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-orange-600">Duration</div>
                              <div className="font-semibold text-orange-900">{spike.durationHours.toFixed(2)} hrs</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-3 mt-3 text-sm">
                            <div>
                              <div className="text-xs text-gray-600">Excess Above Baseline</div>
                              <div className="font-semibold text-orange-900">{spike.excessKw.toFixed(1)} kW</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600">Average</div>
                              <div className="font-semibold">{spike.avgKw.toFixed(1)} kW</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600">Excess Energy</div>
                              <div className="font-semibold">{spike.excessEnergyKwh.toFixed(1)} kWh</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600">Severity</div>
                              <div className="font-semibold">{spike.severity.toFixed(1)}σ</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scenario Recommendations */}
                {holisticAnalysis.recommendations.bestScenario && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Award className="w-5 h-5 text-green-600" />
                      Recommended Scenario
                    </h3>
                    {holisticAnalysis.recommendations.bestScenario.bestConfiguration && (
                      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="text-lg font-bold text-green-900">
                              Target: {holisticAnalysis.recommendations.bestScenario.targetCapKw} kW Cap
                            </div>
                            <div className="text-sm text-green-700 mt-1">
                              Shaves {holisticAnalysis.recommendations.bestScenario.excessAboveBaselineKw.toFixed(1)} kW above baseline ({holisticAnalysis.recommendations.bestScenario.baselineKw.toFixed(1)} kW)
                            </div>
                          </div>
                          <div className="bg-green-200 px-3 py-1 rounded-full">
                            <span className="text-xs font-semibold text-green-900">RECOMMENDED</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <div className="text-xs text-green-700 mb-1">Battery Configuration</div>
                            <div className="font-semibold text-green-900">
                              {holisticAnalysis.recommendations.bestScenario.bestConfiguration.configuration.description}
                            </div>
                            <div className="text-xs text-green-600 mt-1">
                              {holisticAnalysis.recommendations.bestScenario.bestConfiguration.configuration.totalPowerKw.toFixed(0)} kW / {holisticAnalysis.recommendations.bestScenario.bestConfiguration.configuration.totalCapacityKwh.toFixed(0)} kWh
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-green-700 mb-1">System Cost</div>
                            <div className="font-semibold text-green-900">
                              ${holisticAnalysis.recommendations.bestScenario.bestConfiguration.configuration.totalCost.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-green-700 mb-1">Payback</div>
                            <div className="font-semibold text-green-900">
                              {holisticAnalysis.recommendations.bestScenario.bestConfiguration.paybackYears?.toFixed(1)} years
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-green-700 mb-1">NPV (15yr)</div>
                            <div className="font-semibold text-green-900">
                              ${holisticAnalysis.recommendations.bestScenario.bestConfiguration.npv?.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-green-800">
                          <strong>Annual Savings:</strong> ${holisticAnalysis.recommendations.bestScenario.bestConfiguration.estimatedAnnualSavings?.toLocaleString()} | 
                          <strong> ROI:</strong> {holisticAnalysis.recommendations.bestScenario.bestConfiguration.roi?.toFixed(1)}% | 
                          <strong> Viability Score:</strong> {holisticAnalysis.recommendations.bestScenario.bestConfiguration.viabilityScore}/100
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* All Scenarios Table - Only show scenarios that were actually tested */}
                {holisticAnalysis.scenarios.filter(s => s.bestConfiguration).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Analyzed Scenarios</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100 border-b">
                            <th className="text-left p-2">Target Cap</th>
                            <th className="text-left p-2">Shaving Above Baseline</th>
                            <th className="text-left p-2">Best Configuration</th>
                            <th className="text-right p-2">Cost</th>
                            <th className="text-right p-2">Payback</th>
                            <th className="text-right p-2">NPV</th>
                            <th className="text-center p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {holisticAnalysis.scenarios
                            .filter(s => s.bestConfiguration) // Only show scenarios that were tested
                            .map((scenario, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="p-2 font-semibold">{scenario.targetCapKw} kW</td>
                              <td className="p-2">{scenario.excessAboveBaselineKw.toFixed(1)} kW</td>
                              <td className="p-2">
                                <div>
                                  <div className="font-semibold">{scenario.bestConfiguration!.configuration.description}</div>
                                  <div className="text-xs text-gray-600">
                                    {scenario.bestConfiguration!.configuration.totalPowerKw.toFixed(0)} kW / {scenario.bestConfiguration!.configuration.totalCapacityKwh.toFixed(0)} kWh
                                  </div>
                                  {!scenario.bestConfiguration!.feasible && (
                                    <div className="text-xs text-red-600 mt-1">
                                      ⚠ Not feasible: {scenario.bestConfiguration!.failureReason || 'Insufficient capacity/power'}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 text-right">
                                ${scenario.bestConfiguration!.configuration.totalCost.toLocaleString()}
                              </td>
                              <td className="p-2 text-right">
                                <div>
                                  <div className={scenario.bestConfiguration!.paybackYears! > 20 ? 'text-red-600 font-semibold' : scenario.bestConfiguration!.paybackYears! > 15 ? 'text-orange-600' : ''}>
                                    {scenario.bestConfiguration!.paybackYears?.toFixed(1)} yr
                                  </div>
                                  {!scenario.bestConfiguration!.feasible && scenario.bestConfiguration!.peakReductionKw > 0 && (
                                    <div className="text-xs text-gray-500">
                                      (partial: {scenario.bestConfiguration!.peakReductionKw.toFixed(1)} kW reduced)
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 text-right">
                                <div className={scenario.bestConfiguration!.npv! < 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                                  ${scenario.bestConfiguration!.npv?.toLocaleString()}
                                </div>
                              </td>
                              <td className="p-2 text-center">
                                {scenario.bestConfiguration!.recommendation === 'recommended' && (
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">Recommended</span>
                                )}
                                {scenario.bestConfiguration!.recommendation === 'marginal' && (
                                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">Marginal</span>
                                )}
                                {scenario.bestConfiguration!.recommendation === 'not_recommended' && (
                                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">Not Recommended</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className={`mt-6 border rounded-lg p-4 ${
                  holisticAnalysis.recommendations.viableScenarios.length > 0 
                    ? 'bg-green-50 border-green-200' 
                    : holisticAnalysis.recommendations.marginalScenarios.length > 0
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className={`font-semibold mb-2 ${
                    holisticAnalysis.recommendations.viableScenarios.length > 0 
                      ? 'text-green-900' 
                      : holisticAnalysis.recommendations.marginalScenarios.length > 0
                      ? 'text-yellow-900'
                      : 'text-gray-900'
                  }`}>
                    Analysis Summary
                  </div>
                  {holisticAnalysis.recommendations.viableScenarios.length === 0 && 
                   holisticAnalysis.recommendations.marginalScenarios.length === 0 && (
                    <div className="text-sm text-gray-700 mb-3">
                      <p className="font-medium mb-2">No economically viable battery configurations were found for the analyzed scenarios.</p>
                      <p className="text-xs text-gray-600">
                        This may indicate that battery storage is not financially viable for this site, or that different scenarios should be considered. 
                        Consider reviewing demand patterns, rate structures, or exploring alternative energy solutions.
                      </p>
                    </div>
                  )}
                  <ul className={`text-sm space-y-1 ${
                    holisticAnalysis.recommendations.viableScenarios.length > 0 
                      ? 'text-green-800' 
                      : holisticAnalysis.recommendations.marginalScenarios.length > 0
                      ? 'text-yellow-800'
                      : 'text-gray-700'
                  }`}>
                    {holisticAnalysis.recommendations.summary.map((line, i) => (
                      <li key={i}>• {line}</li>
                    ))}
                  </ul>
                </div>
              </SectionCard>
            )}

            {!hasValidSimulationData && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-md">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">Warning:</span> Battery simulation interval data is missing or incomplete.
                      Charts may not accurately reflect battery dispatch. Please re-run the battery calculation (or re-save the analysis).
                    </p>
                  </div>
                </div>
              </div>
            )}

            <SectionCard
              title="Daily Load Profile (24-Hour Average)"
              description="Average demand (kW) by hour of day, showing baseline vs battery dispatch. Option S affects billing ($), so it appears in savings comparisons."
              right={
                alreadyOnOptionS ? (
                  <div className="text-sm text-gray-600">Option S active</div>
                ) : null
              }
              insight={loadProfileInsight}
              insightVariant="purple"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600">View</span>
                  <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setDailyProfileMode('AVERAGE')}
                      className={`px-3 py-1.5 text-xs font-semibold ${dailyProfileMode === 'AVERAGE' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                      Average day
                    </button>
                    <button
                      type="button"
                      onClick={() => setDailyProfileMode('PEAK_DAY')}
                      className={`px-3 py-1.5 text-xs font-semibold ${dailyProfileMode === 'PEAK_DAY' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                      Peak day
                    </button>
                    <button
                      type="button"
                      onClick={() => setDailyProfileMode('LOW_DAY')}
                      className={`px-3 py-1.5 text-xs font-semibold ${dailyProfileMode === 'LOW_DAY' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                      Low day
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600">Period</span>
                  <select
                    className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
                    value={dailyProfilePeriod}
                    onChange={(e) => setDailyProfilePeriod(e.target.value as any)}
                  >
                    <option value="ALL">All data</option>
                    <option value="MOST_USED_MONTH">Most-used month (kWh)</option>
                    <option value="PEAK_MONTH">Highest-peak month (kW)</option>
                    <option value="LOW_MONTH">Lowest-peak month (kW)</option>
                  </select>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={hourlyProfile}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} label={{ value: 'Demand (kW)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <Tooltip
                    content={({ label, payload }) => {
                      if (!payload || payload.length === 0) return null;
                      const row = (payload[0] as any)?.payload as
                        | { before?: number; after?: number; shaved?: number }
                        | undefined;
                      if (!row) return null;
                      const before = Number(row.before ?? NaN);
                      const after = Number(row.after ?? NaN);
                      const shaved = Number(row.shaved ?? (Number.isFinite(before) && Number.isFinite(after) ? Math.max(0, before - after) : NaN));

                      const fmt = (v: number | null) =>
                        v == null || !Number.isFinite(v) ? '—' : `${Math.round(v)} kW`;

                      return (
                        <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
                          <div className="font-semibold text-gray-900 mb-2">{label}</div>
                          <div className="space-y-1">
                            <div className="flex justify-between gap-4">
                              <span className="text-red-600">Without Battery</span>
                              <span className="font-medium">{fmt(before)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-cyan-600">With Battery</span>
                              <span className="font-medium">{fmt(after)}</span>
                            </div>
                            <div className="flex justify-between gap-4 pt-2 mt-2 border-t border-gray-200">
                              <span className="text-amber-700">Shaved (avg)</span>
                              <span className="font-semibold">{fmt(shaved)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  {/* Shaved area fills between original and after */}
                  <Area 
                    type="monotone" 
                    dataKey="before" 
                    fill="#fef3c7" 
                    stroke="none" 
                    name="(shading)" 
                    fillOpacity={0.6} 
                    legendType="none"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="after" 
                    fill="white" 
                    stroke="none" 
                    fillOpacity={1} 
                    legendType="none"
                  />
                  {/* Clear lines for before/after */}
                  <Line 
                    type="monotone" 
                    dataKey="before" 
                    stroke="#ef4444" 
                    strokeWidth={3} 
                    dot={false}
                    name="Without Battery"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="after" 
                    stroke="#06b6d4" 
                    strokeWidth={3} 
                    dot={false}
                    name="With Battery"
                  />
                  {/* Target threshold line */}
                  <ReferenceLine 
                    y={targetThreshold} 
                    stroke={COLORS.primary} 
                    strokeWidth={2} 
                    strokeDasharray="5 5" 
                    label={{ value: `Target: ${Math.round(targetThreshold)} kW`, fontSize: 10, fill: COLORS.primary, position: 'right' }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-4 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-red-500 rounded" />
                  <span className="text-gray-600">Without battery</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-cyan-500 rounded" />
                  <span className="text-gray-600">With battery</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-100 border border-amber-300 rounded" />
                  <span className="text-gray-600">Shaved by battery</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                The red line is your baseline demand. The cyan line shows the battery’s simulated dispatch on the same load profile. Option S affects billing structure (cost), so it’s shown in the savings section—not on kW charts.
              </p>
            </SectionCard>

            <SectionCard
              title="Monthly Peak Demand Comparison"
              description="Shows the single highest kW peak in each month (how demand charges are set). The battery prevents demand from reaching the 'Without Battery' peak throughout the entire month."
              insight={monthlyPeakInsight}
              insightVariant="blue"
            >
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={monthlyComparison} margin={{ top: 10, right: 20, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280" 
                    style={{ fontSize: '11px' }} 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    style={{ fontSize: '11px' }} 
                    label={{ value: 'kW', angle: -90, position: 'insideLeft', fontSize: 12 }}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px' }}
                    formatter={(value: unknown, name: string) => {
                      const n = typeof value === 'number' ? value : value == null ? null : Number(value);
                      if (name === 'Max Without Battery') {
                        return [n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(0)} kW (original peak)`, name];
                      }
                      if (name === 'Max With Battery') {
                        return [n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(0)} kW (battery prevented higher peaks)`, name];
                      }
                      return [n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(0)} kW`, name];
                    }}
                  />
                  <Legend />
                  {/* Bar showing original peak for comparison (semi-transparent) */}
                  <Bar 
                    dataKey="originalPeak" 
                    fill="#ef4444" 
                    name="Max Without Battery" 
                    radius={[4, 4, 0, 0]}
                    opacity={0.25}
                    maxBarSize={60}
                  />
                  {/* Bar showing the actual peak with battery - should always be below the original */}
                  <Bar 
                    dataKey="newPeak" 
                    fill="#06b6d4" 
                    name="Max With Battery" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-3 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded p-2">
                <p className="font-semibold text-blue-900 mb-1">What this shows:</p>
                <p className="text-blue-800">
                  The <strong>blue bars</strong> show the highest demand reached in each month <strong>with the battery</strong>. 
                  The <strong>semi-transparent red bars</strong> show what the peak would have been <strong>without the battery</strong>. 
                  When the blue bar is below the red bar, it confirms the battery successfully prevented demand from reaching the original peak throughout the entire month, ensuring the monthly demand charge is based on the lower blue value.
                </p>
              </div>
            </SectionCard>

            <SectionCard
              title="Peak Events & Shaving Timeline (Year)"
              description="Peak-related intervals across the dataset (typically a year). Compare baseline vs with-battery at each peak interval; yellow shading indicates kW shaved."
              insightVariant="blue"
            >
              <div className="text-xs text-gray-600 mb-3">
                Plot includes intervals where load ≥ target − {SHAVE_DETECTION_BUFFER_KW} kW or where shaving occurred. If there are many points, the chart auto-samples to stay responsive.
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={peakShaveTimeline} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                  <XAxis
                    dataKey="t"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    scale="time"
                    tickFormatter={(v: any) => {
                      const d = new Date(Number(v));
                      if (!Number.isFinite(d.getTime())) return '';
                      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    }}
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    style={{ fontSize: '11px' }} 
                    label={{ value: 'kW', angle: -90, position: 'insideLeft', fontSize: 12 }} 
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px' }}
                    labelFormatter={(v: any) => {
                      const d = new Date(Number(v));
                      if (!Number.isFinite(d.getTime())) return '';
                      return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                    }}
                    formatter={(value: unknown, name: string) => {
                      if (name === '(shading)') {
                        // Calculate actual shaved amount
                        const point = peakShaveTimeline.find((p: any) => p.before === value || p.after === value);
                        if (point) {
                          const shaved = point.before - point.after;
                          return shaved > 0.1 ? [`${shaved.toFixed(1)} kW shaved`, 'Shaved'] : ['No shaving', 'Shaved'];
                        }
                        return ['—', 'Shaved'];
                      }
                      const n = typeof value === 'number' ? value : value == null ? null : Number(value);
                      const txt = n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(1)} kW`;
                      return [txt, name];
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  {/* Shaved area fills between baseline and after */}
                  <Area 
                    type="monotone" 
                    dataKey="before" 
                    fill="#fef3c7" 
                    stroke="none" 
                    name="Shaved Area" 
                    fillOpacity={0.3} 
                    legendType="none"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="after" 
                    fill="white" 
                    stroke="none" 
                    fillOpacity={1} 
                    legendType="none"
                    stackId="1"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="before" 
                    stroke="#ef4444" 
                    strokeWidth={2} 
                    dot={false} 
                    name="Without Battery (peak intervals)"
                    activeDot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="after" 
                    stroke="#06b6d4" 
                    strokeWidth={2.5} 
                    dot={false} 
                    name="With Battery (peak intervals)"
                    activeDot={{ r: 4 }}
                  />
                  <ReferenceLine
                    y={targetThreshold}
                    stroke={COLORS.primary}
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    label={{ value: `Target: ${Math.round(targetThreshold)} kW`, fontSize: 10, fill: COLORS.primary, position: 'right' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-2 text-xs text-gray-500">
                This focuses on peak-related intervals so you can see exactly when peaks happen and whether the battery moved them (it’s not the full time-series of every interval).
              </div>
            </SectionCard>

            <SectionCard
              title="Monthly Demand Charge Savings (Estimate)"
              description="Estimated demand-charge savings per month under the current schedule (battery) and, optionally, under an Option S schedule switch. Option S is shown here in $ only."
              right={
                canCompareOptionS ? (
                  <label className={`flex items-center gap-3 text-sm ${optionSEligibility.isEligible ? 'text-gray-700' : 'text-gray-400'}`}>
                    <span className="font-medium">Compare Option S savings</span>
                    <input
                      type="checkbox"
                      checked={includeSRate}
                      onChange={(e) => setIncludeSRate(e.target.checked)}
                      disabled={!optionSEligibility.isEligible}
                      title={!optionSEligibility.isEligible ? optionSEligibility.reasons.join(' ') : undefined}
                      className="h-4 w-4 accent-purple-600 disabled:opacity-50"
                    />
                  </label>
                ) : (
                  <div className="text-sm text-gray-600">Already on Option S ({String(customerInfo.rateCode || '').toUpperCase()})</div>
                )
              }
              insightVariant="green"
              insight={{
                sectionId: 'monthly-demand-savings',
                title: 'Monthly Demand Savings',
                whatWeAreLookingAt:
                  'Monthly demand-charge savings estimated from monthly peaks under the current tariff, plus an optional comparison to the Option S schedule using schedule-aware daily demand charge math.',
                whyItMatters:
                  'This is where Option S belongs: it changes how demand charges are computed (daily accumulation + reduced monthly components), so the comparison is financial ($), not a kW “monthly peak” chart.',
                engineeringFocus: [
                  'Battery savings: monthly peak kW reduction × $/kW-month (simplified).',
                  'Option S savings: schedule-aware demand charges computed from simulated Option S dispatch intervals.',
                  alreadyOnOptionS ? 'Customer rate code ends in S, so Option S is the baseline schedule (no switch).' : 'Only treat Option S as a switch if the rate code does not already end in S.',
                ],
                salesTalkingPoints: [
                  'Battery savings come from lowering the bill-setting monthly peak.',
                  'Option S savings come from switching to a billing structure that penalizes peaks daily instead of one spike setting the whole month.',
                ],
                isGenerated: false,
              }}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyDemandSavingsComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <Tooltip
                    formatter={(value: unknown) => {
                      const n = typeof value === 'number' ? value : value == null ? null : Number(value);
                      return n == null || !Number.isFinite(n) ? '—' : `$${n.toFixed(0)}`;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="batterySavings" fill="#06b6d4" name="Battery savings (current schedule)" radius={[2, 2, 0, 0]} />
                  {includeSRate && canCompareOptionS && optionSEligibility.isEligible && (
                    <Bar dataKey="optionSSavings" fill="#8b5cf6" name="Battery + Option S savings" radius={[2, 2, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard
              title="Yearly Peak Demand Comparison"
              description="Max annual kW per scenario. Useful when interval data spans multiple years."
              insight={yearlyPeakInsight}
              insightVariant="blue"
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={yearlyPeakComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="year" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <Tooltip
                    formatter={(value: unknown) => {
                      const n = typeof value === 'number' ? value : value == null ? null : Number(value);
                      return n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(1)} kW`;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="baseline" fill="#ef4444" name="Without Battery" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="battery" fill="#06b6d4" name="With Battery" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard
              title="Technical Analysis & Recommendations"
              description="A sales-ready narrative summary of what the load profile indicates, how storage helps, and what to do next."
              icon={<Brain className="w-5 h-5 text-purple-600" />}
              right={
                <button
                  onClick={() => void refreshExecutiveNarrative(true)}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 disabled:opacity-60"
                  disabled={executiveNarrativeLoading}
                  title={aiConfigured ? 'Regenerate AI narrative' : 'AI is not configured; will use fallback summary'}
                >
                  {executiveNarrativeLoading ? 'Generating…' : 'Regenerate'}
                </button>
              }
              insight={{
                sectionId: 'executive-narrative',
                title: 'Executive Narrative',
                whatWeAreLookingAt:
                  'A consolidated summary of how this facility operates (load shape + peaks), why storage is a fit, and what to emphasize in a customer conversation.',
                whyItMatters:
                  'Sales needs a clean storyline: what drives the bill, where the spikes come from, how the battery caps those spikes, and why the customer should care now.',
                engineeringFocus: [
                  'Validate the peak driver (HVAC vs process) and whether peaks are predictable by hour/season.',
                  'Confirm battery power (kW) is sufficient to cap the worst peaks and that duration matches event length.',
                  includeSRate && canCompareOptionS && optionSEligibility.isEligible
                    ? 'If Option S is being compared, confirm eligibility and the schedule’s demand-charge windows.'
                    : alreadyOnOptionS
                      ? 'Customer is already on Option S; evaluate savings under the current schedule.'
                      : 'Enable Option S to compare the alternative schedule’s billing outcomes.',
                ],
                salesTalkingPoints: [
                  'Your highest spike sets the demand charge—battery prevents that spike from hitting the bill.',
                  'We’re not guessing: this summary is generated from the customer’s actual interval/billing inputs.',
                ],
                recommendations: ['Use this as the closing section in Phase 1, then transition to Phase 2 for pricing and ROI.'],
                isGenerated: !!aiConfigured,
              }}
              insightVariant="purple"
            >
              {executiveNarrativeError && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  Unable to generate narrative: {executiveNarrativeError}
                </div>
              )}
              <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed bg-gray-50 border border-gray-200 rounded-lg p-4">
                {executiveNarrative || 'Generating narrative…'}
              </pre>
            </SectionCard>

            {/* ===== REGRESSION ANALYSIS ===== */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-900">Regression Analysis - Model Validation</h3>
                <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${regressionAnalysis.pass ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {regressionAnalysis.pass ? '✓ ASHRAE Compliant' : '⚠ Not ASHRAE Compliant'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                A defensibility check: compares the original demand to the modeled (battery-capped) demand and reports standard error metrics (ASHRAE Guideline 14 style).
              </p>
              
              {/* Metrics */}
              <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-purple-600 mb-1">RMSE</div>
                  <div className="text-2xl font-bold text-purple-800">{regressionAnalysis.rmse.toFixed(1)} kW</div>
                  <div className="text-xs text-gray-500">Root Mean Square Error</div>
                </div>
                <div className={`rounded-lg p-4 text-center ${regressionAnalysis.cvrmse < 25 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className={`text-xs mb-1 ${regressionAnalysis.cvrmse < 25 ? 'text-green-600' : 'text-red-600'}`}>CVRMSE</div>
                  <div className={`text-2xl font-bold ${regressionAnalysis.cvrmse < 25 ? 'text-green-800' : 'text-red-800'}`}>
                    {regressionAnalysis.cvrmse.toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {regressionAnalysis.cvrmse < 25 ? '✓ < 25% (Pass)' : '✗ ≥ 25% (Fail)'}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-blue-600 mb-1">R²</div>
                  <div className="text-2xl font-bold text-blue-800">{regressionAnalysis.rSquared.toFixed(3)}</div>
                  <div className="text-xs text-gray-500">Coefficient of Determination</div>
                </div>
                <div className={`rounded-lg p-4 text-center ${Math.abs(regressionAnalysis.mbePercent) < 5 ? 'bg-green-50' : 'bg-amber-50'}`}>
                  <div className={`text-xs mb-1 ${Math.abs(regressionAnalysis.mbePercent) < 5 ? 'text-green-600' : 'text-amber-600'}`}>MBE</div>
                  <div className={`text-2xl font-bold ${Math.abs(regressionAnalysis.mbePercent) < 5 ? 'text-green-800' : 'text-amber-800'}`}>
                    {regressionAnalysis.mbePercent > 0 ? '+' : ''}{regressionAnalysis.mbePercent.toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.abs(regressionAnalysis.mbePercent) < 5 ? '✓ Within ±5%' : 'Outside ±5%'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-600 mb-1">Data Points</div>
                  <div className="text-2xl font-bold text-gray-800">{regressionAnalysis.dataPointCount.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Compared</div>
                </div>
              </div>

              {/* Scatter Plot */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Actual vs Predicted Demand</h4>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      type="number"
                      dataKey="actual" 
                      stroke="#6b7280" 
                      style={{ fontSize: '10px' }}
                      label={{ value: 'Actual Demand (kW)', position: 'insideBottom', offset: -5, fontSize: 11 }}
                      domain={['dataMin', 'dataMax']}
                    />
                    <YAxis 
                      type="number"
                      dataKey="predicted" 
                      stroke="#6b7280" 
                      style={{ fontSize: '10px' }}
                      label={{ value: 'Predicted Demand (kW)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                      domain={['dataMin', 'dataMax']}
                    />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value: number) => [`${value} kW`, '']} />
                    <Legend />
                    {/* Perfect fit line (1:1) */}
                    {regressionAnalysis.scatterData.length > 0 && (() => {
                      const allValues = regressionAnalysis.scatterData.flatMap(d => [d.actual, d.predicted]);
                      const minVal = Math.min(...allValues);
                      const maxVal = Math.max(...allValues);
                      const perfectFitData = [
                        { actual: minVal, predicted: minVal },
                        { actual: maxVal, predicted: maxVal },
                      ];
                      return (
                        <Line 
                          type="linear" 
                          dataKey="predicted" 
                          data={perfectFitData}
                          stroke={COLORS.secondary} 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Perfect Fit (1:1)"
                          connectNulls={false}
                        />
                      );
                    })()}
                    {/* Scatter points */}
                    <Scatter name="Data Points" data={regressionAnalysis.scatterData} fill={COLORS.primary} fillOpacity={0.5}>
                      {regressionAnalysis.scatterData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.primary} />
                      ))}
                    </Scatter>
                  </ComposedChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-500 mt-2">
                  Points close to the diagonal line indicate accurate predictions. CVRMSE &lt; 25% and |MBE| &lt; 5% meet ASHRAE Guideline 14 criteria.
                </p>
              </div>

              <AIInsight
                title="Regression Model Quality"
                engineerInsight={`Regression analysis shows ${regressionAnalysis.dataPointCount.toLocaleString()} data points with RMSE of ${regressionAnalysis.rmse} kW. CVRMSE of ${regressionAnalysis.cvrmse}% ${regressionAnalysis.cvrmse < 25 ? 'meets' : 'exceeds'} ASHRAE Guideline 14 threshold (25%). R² of ${regressionAnalysis.rSquared.toFixed(3)} indicates ${regressionAnalysis.rSquared > 0.9 ? 'strong' : regressionAnalysis.rSquared > 0.7 ? 'moderate' : 'weak'} correlation between actual and predicted demand. MBE of ${regressionAnalysis.mbePercent > 0 ? '+' : ''}${regressionAnalysis.mbePercent}% ${Math.abs(regressionAnalysis.mbePercent) < 5 ? 'is within acceptable range' : 'indicates systematic bias'}.`}
                salesInsight={`The model ${regressionAnalysis.pass ? 'passes' : 'does not fully meet'} ASHRAE validation criteria, which means ${regressionAnalysis.pass ? 'the savings projections are reliable and defensible' : 'there may be some uncertainty in the projections'}. CVRMSE of ${regressionAnalysis.cvrmse}% ${regressionAnalysis.cvrmse < 15 ? 'is excellent' : regressionAnalysis.cvrmse < 25 ? 'is acceptable' : 'exceeds industry standards'}, indicating ${regressionAnalysis.cvrmse < 15 ? 'high confidence in the analysis' : 'some variability in the predictions'}.`}
                recommendations={[
                  regressionAnalysis.cvrmse < 25 ? '✓ CVRMSE meets ASHRAE Guideline 14 criteria (< 25%)' : `Consider refining model - CVRMSE ${regressionAnalysis.cvrmse}% exceeds 25% threshold`,
                  Math.abs(regressionAnalysis.mbePercent) < 5 ? '✓ MBE within acceptable range (±5%)' : `MBE bias of ${regressionAnalysis.mbePercent > 0 ? '+' : ''}${regressionAnalysis.mbePercent}% should be investigated`,
                  regressionAnalysis.rSquared > 0.9 ? '✓ Strong model fit (R² > 0.9)' : `R² of ${regressionAnalysis.rSquared.toFixed(3)} suggests ${regressionAnalysis.rSquared > 0.7 ? 'moderate' : 'limited'} explanatory power`,
                ]}
              />
            </div>

            {/* ===== PEAK EVENT FREQUENCY & DEGRADATION ===== */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-bold text-gray-900 mb-4">Peak Event Frequency by Hour</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={peakEventsByHour}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="hour" stroke="#6b7280" style={{ fontSize: '9px' }} interval={2} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                    <Tooltip />
                    <Bar dataKey="events" fill={COLORS.primary} name="Peak Events" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-500 mt-2">When the battery activates to shave demand</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-bold text-gray-900 mb-4">10-Year Degradation Impact</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={degradationAnalysis.filter(d => d.year <= 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="year" stroke="#6b7280" style={{ fontSize: '10px' }} />
                    <YAxis yAxisId="left" stroke={COLORS.danger} style={{ fontSize: '10px' }} domain={[70, 100]} />
                      <YAxis yAxisId="right" orientation="right" stroke={COLORS.secondary} style={{ fontSize: '10px' }} tickFormatter={(v) => `${v} kW`} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="capacityPercent" stroke={COLORS.danger} strokeWidth={2} name="Capacity %" dot />
                      <Line yAxisId="right" type="monotone" dataKey="effectivePeakReductionKw" stroke={COLORS.secondary} strokeWidth={2} name="Peak Reduction (kW)" dot />
                  </ComposedChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-500 mt-2">Battery capacity: 100% → ~82% over 10 years</p>
              </div>
            </div>

            {/* ===== BATTERY LIFECYCLE ===== */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-6">
                <BatteryCharging className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-bold">Battery Lifecycle Analysis</h2>
              </div>
              
              <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-blue-600">Cycles/Year</div>
                  <div className="text-2xl font-bold text-blue-800">{cycleAnalysis.cyclesPerYear}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-purple-600">Cycles/Month</div>
                  <div className="text-2xl font-bold text-purple-800">{cycleAnalysis.cyclesPerMonth}</div>
                </div>
                <div className="bg-teal-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-teal-600">Cycles/Day</div>
                  <div className="text-2xl font-bold text-teal-800">{cycleAnalysis.cyclesPerDay}</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-amber-600">Expected Lifetime</div>
                  <div className="text-2xl font-bold text-amber-800">{cycleAnalysis.expectedLifetimeYears} yrs</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-green-600">Lifetime Cycles</div>
                  <div className="text-2xl font-bold text-green-800">~{cycleAnalysis.expectedLifetimeCycles}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Cycle Economics</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Energy per cycle</span><span className="font-semibold">{batteryN.capacityKwh} kWh</span></div>
                    <div className="flex justify-between"><span>Avg discharge depth</span><span className="font-semibold">{cycleAnalysis.avgDischargeKwh} kWh</span></div>
                    <div className="flex justify-between"><span>Annual energy throughput</span><span className="font-semibold">{cycleAnalysis.annualEnergyKwh.toLocaleString()} kWh</span></div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Critical Milestones</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Warranty End</span><span className="font-semibold text-blue-600">Year {batteryN.warranty}</span></div>
                    <div className="flex justify-between"><span>80% Capacity</span><span className="font-semibold text-amber-600">~Year 10</span></div>
                    <div className="flex justify-between"><span>Replacement Rec.</span><span className="font-semibold text-purple-600">Year {Math.min(20, cycleAnalysis.expectedLifetimeYears + 2)}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== SAVINGS SUMMARY ===== */}
            <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl shadow-sm border border-green-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-bold text-green-800">Energy + Peak Reduction Summary (No $)</h2>
              </div>
              
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Daily Discharge</div>
                  <div className="text-3xl font-bold text-green-700">{throughputBreakdown.dailyKwh.toLocaleString()} kWh</div>
                  <div className="text-xs text-gray-400">Energy shifted (estimated)</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Monthly Discharge</div>
                  <div className="text-3xl font-bold text-green-700">{throughputBreakdown.monthlyKwh.toLocaleString()} kWh</div>
                  <div className="text-xs text-gray-400">Energy shifted (estimated)</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Annual Discharge</div>
                  <div className="text-3xl font-bold text-green-700">{throughputBreakdown.annualKwh.toLocaleString()} kWh</div>
                  <div className="text-xs text-gray-400">Energy shifted (estimated)</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-green-200 text-center">
                <span className="text-sm text-gray-600">Peak demand reduced from </span>
                <span className="font-bold text-red-600">{Math.round(simN.originalPeak)} kW</span>
                <span className="text-sm text-gray-600"> to </span>
                <span className="font-bold text-green-600">{Math.round(simN.newPeak)} kW</span>
                <span className="text-sm text-gray-600"> — a </span>
                <span className="font-bold text-blue-600">{formatPercent(simN.peakReductionPercent)}</span>
                <span className="text-sm text-gray-600"> reduction</span>
              </div>
            </div>

            {/* ===== RANKING RADAR ===== */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-bold">Battery Fit Assessment</h2>
                <span className={`ml-auto px-3 py-1 rounded-full text-sm font-semibold ${customerScore.color === 'green' ? 'bg-green-100 text-green-800' : customerScore.color === 'blue' ? 'bg-blue-100 text-blue-800' : customerScore.color === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                  Score: {customerScore.totalScore}/100 - {customerScore.recommendation}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={customerScore.radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Score" dataKey="value" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
                
                <div className="space-y-3">
                  {Object.entries(customerScore.scores).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className={`font-semibold ${value >= 70 ? 'text-green-600' : value >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{Math.round(value)}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ==========================================
            PHASE 3: MARKUP & ROI (TWEAKABLE)
        ========================================== */}
        {activePhase === 3 && (
          <div className="space-y-6">
            
            {/* ===== OPTION S (SCHEDULE) ===== */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-bold">Option S (Schedule)</h2>
                </div>
                {alreadyOnOptionS ? (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800">
                    S-Rate already in place ({String(customerInfo.rateCode || '').toUpperCase()})
                  </span>
                ) : optionSEligibility.isEligible ? (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                    ✓ Eligible to compare Option S
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">Not eligible</span>
                )}
              </div>

              {alreadyOnOptionS ? (
                <div className="text-sm text-gray-700 mb-4">
                  S-Rate (Option S) is already active on this account, so there is no schedule “switch” ROI to show. We only evaluate storage performance under the current schedule.
                </div>
              ) : (
                <div className="text-sm text-gray-600 mb-3">
                  {optionSEligibility.isEligible
                    ? 'Option S is treated as a schedule switch scenario (billing changes). Toggle it on to include Option S in $ comparisons.'
                    : optionSEligibility.reasons.join(' ')}
                </div>
              )}

              {!alreadyOnOptionS && optionSEligibility.isEligible && (
                <label className="inline-flex items-center gap-3 text-sm text-gray-700 mb-4">
                  <span className="font-medium">Compare Option S ($)</span>
                  <input
                    type="checkbox"
                    checked={includeSRate}
                    onChange={(e) => setIncludeSRate(e.target.checked)}
                    className="h-4 w-4 accent-purple-600"
                  />
                </label>
              )}

              {!alreadyOnOptionS && optionSEligibility.isEligible && (
                <div className="mb-4 text-xs text-gray-700">
                  {optionSDispatchLoading ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      Computing Option S dispatch (optimizer-first)…
                    </div>
                  ) : optionSDispatchMeta ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
                      <div>
                        Engine: <span className="font-semibold">{optionSDispatchMeta.engine}</span>
                        {optionSDispatchMeta.solverStatus ? (
                          <>
                            {' '}
                            • Solver: <span className="font-semibold">{optionSDispatchMeta.solverStatus}</span>
                          </>
                        ) : null}
                      </div>
                      {optionSDispatchMeta.warnings?.length ? (
                        <div className="text-amber-800">
                          {optionSDispatchMeta.warnings.slice(0, 2).map((w, idx) => (
                            <div key={idx}>{w}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500">Using tariff-driven dispatch when available; falls back to heuristic if needed.</div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-500">
                      Option S dispatch not available for this dataset/battery.
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-xs text-gray-600 mb-1">{alreadyOnOptionS ? 'Current schedule outcome (Option S)' : 'Standard rate outcome'}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-gray-900">{rateGrades.standard.score}/100</div>
                    <div className="text-sm text-gray-700">{formatCurrency(rateGrades.standard.annualSavings)}/yr</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Payback: {Number.isFinite(rateGrades.standard.paybackYears) ? rateGrades.standard.paybackYears.toFixed(1) : '—'} yrs
                  </div>
                </div>
                {!alreadyOnOptionS && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="text-xs text-purple-700 mb-1">Option S schedule outcome</div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-purple-900">{rateGrades.optionS?.score ?? 0}/100</div>
                      <div className="text-sm text-purple-800">{formatCurrency(rateGrades.optionS?.annualSavings ?? 0)}/yr</div>
                    </div>
                    <div className="text-xs text-purple-700 mt-1">
                      Payback: {Number.isFinite(rateGrades.optionS?.paybackYears ?? Infinity) ? (rateGrades.optionS?.paybackYears ?? Infinity).toFixed(1) : '—'} yrs
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ===== COST BUILDER ===== */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-bold">Project Cost Breakdown</h2>
                </div>
                <button onClick={() => setShowCostBuilder(!showCostBuilder)} className="text-sm text-purple-600 flex items-center gap-1">
                  <Edit3 className="w-4 h-4" /> {showCostBuilder ? 'Hide' : 'Edit'} Costs
                </button>
              </div>
              
              {showCostBuilder && (
                <div className="grid grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="text-xs text-gray-500">Battery Hardware</label>
                    <input type="number" value={costInputs.batteryHardware} onChange={(e) => setCostInputs({...costInputs, batteryHardware: parseFloat(e.target.value) || 0})} className="w-full border rounded px-2 py-1 text-right font-semibold" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Installation & Labor</label>
                    <input type="number" value={costInputs.installationPerUnit} onChange={(e) => setCostInputs({...costInputs, installationPerUnit: parseFloat(e.target.value) || 0})} className="w-full border rounded px-2 py-1 text-right font-semibold" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Permits & Engineering</label>
                    <input type="number" value={costInputs.permitsEngineering} onChange={(e) => setCostInputs({...costInputs, permitsEngineering: parseFloat(e.target.value) || 0})} className="w-full border rounded px-2 py-1 text-right font-semibold" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Profit Margin %</label>
                    <input type="number" value={costInputs.profitMargin} onChange={(e) => setCostInputs({...costInputs, profitMargin: parseFloat(e.target.value) || 0})} className="w-full border rounded px-2 py-1 text-right font-semibold" />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {projectCosts.breakdown.map((item, idx) => (
                  <div key={idx} className={`flex justify-between items-center p-3 rounded-lg ${idx === projectCosts.breakdown.length - 1 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                    <span className={idx === projectCosts.breakdown.length - 1 ? 'text-green-800 font-semibold' : 'text-gray-700'}>{item.name}</span>
                    <span className="font-bold">{formatCurrency(item.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center p-3 rounded-lg bg-gray-100 border-t-2 border-gray-300">
                  <span className="text-gray-700">Subtotal (before profit)</span>
                  <span className="font-bold">{formatCurrency(projectCosts.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-lg bg-blue-600 text-white">
                  <span className="font-bold text-lg">Total Client Price</span>
                  <span className="font-bold text-2xl">{formatCurrency(projectCosts.total)}</span>
                </div>
              </div>
              
              {/* Cost Summary Bar */}
              <div className="mt-4">
                <div className="h-4 flex rounded-full overflow-hidden">
                  <div style={{ width: `${projectCosts.breakdown[0].percent}%` }} className="bg-blue-500" title={`Hardware: ${projectCosts.breakdown[0].percent}%`} />
                  <div style={{ width: `${projectCosts.breakdown[1].percent}%` }} className="bg-purple-500" title={`Installation: ${projectCosts.breakdown[1].percent}%`} />
                  <div style={{ width: `${projectCosts.breakdown[2].percent}%` }} className="bg-gray-500" title={`Permits: ${projectCosts.breakdown[2].percent}%`} />
                  <div style={{ width: `${projectCosts.breakdown[3].percent}%` }} className="bg-green-500" title={`Profit: ${projectCosts.breakdown[3].percent}%`} />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Hardware {projectCosts.breakdown[0].percent}%</span>
                  <span>Installation {projectCosts.breakdown[1].percent}%</span>
                  <span>Permits {projectCosts.breakdown[2].percent}%</span>
                  <span>Profit {projectCosts.breakdown[3].percent}%</span>
                </div>
              </div>
            </div>

            {/* ===== ROI METRICS ===== */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">Simple Payback</div>
                <div className="text-3xl font-bold text-blue-600">{roiAnalysis.simplePayback} yrs</div>
                <div className="text-xs text-gray-400">Detailed calculation</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">NPV (10yr)</div>
                <div className={`text-3xl font-bold ${roiAnalysis.npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(roiAnalysis.npv)}</div>
                <div className={`text-xs ${roiAnalysis.npv >= 0 ? 'text-green-500' : 'text-red-500'}`}>{roiAnalysis.npv >= 0 ? 'Positive' : 'Negative'}</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">IRR</div>
                <div className="text-3xl font-bold text-purple-600">{roiAnalysis.roi > 0 ? `${Math.min(roiAnalysis.roi, 100)}%` : 'TBD'}</div>
                <div className="text-xs text-green-500">{roiAnalysis.roi > 5 ? 'Exceeds 5% hurdle' : ''}</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">Total Savings (10yr)</div>
                <div className="text-3xl font-bold text-teal-600">{formatCurrency(roiAnalysis.totalSavings10Year)}</div>
                <div className="text-xs text-gray-400">Avg {formatCurrency(roiAnalysis.totalSavings10Year / 10)}/yr</div>
              </div>
            </div>

            {/* ===== CASH FLOW CHART ===== */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-900 mb-4">Cumulative Cash Flow Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={roiAnalysis.cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="year" stroke="#6b7280" style={{ fontSize: '10px' }} label={{ value: 'Year', position: 'bottom' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="cumulative" stroke={COLORS.secondary} strokeWidth={2} name="Cumulative Cash Flow" dot />
                  <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* ===== ANNUAL SAVINGS WITH DEGRADATION ===== */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-900 mb-4">Annual Savings (with 2% Degradation)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={roiAnalysis.cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="year" stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="annualSavings" fill={COLORS.secondary} name="Annual Savings" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-2">Battery capacity: 100% → 82% over 10 years</p>
            </div>

            {/* ===== FINANCIAL RANKING ===== */}
            <div className={`rounded-xl p-6 text-white ${roiAnalysis.npv >= 0 && roiAnalysis.simplePayback <= 8 ? 'bg-gradient-to-r from-green-600 to-teal-600' : roiAnalysis.simplePayback <= 12 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-red-500 to-rose-600'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-2">Financial Assessment</h2>
                  <p className="opacity-90">
                    {roiAnalysis.npv >= 0 && roiAnalysis.simplePayback <= 8 
                      ? '✓ Excellent investment - proceed with confidence' 
                      : roiAnalysis.simplePayback <= 12 
                      ? '⚠ Moderate returns - consider incentives or financing'
                      : '✗ Challenging ROI - review sizing or wait for lower costs'}
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold">{roiAnalysis.npv >= 0 && roiAnalysis.simplePayback <= 8 ? 'A' : roiAnalysis.simplePayback <= 12 ? 'B' : 'C'}</div>
                  <div className="text-sm opacity-75">Investment Grade</div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========== FOOTER ========== */}
        <div className="bg-gray-800 rounded-xl p-4 text-white flex justify-between items-center text-sm">
          <div>
            <span className="font-semibold">Analysis Complete</span>
            <span className="text-gray-400 ml-4">{intervals.length.toLocaleString()} intervals • {bills.length} bills • {batteryN.modelName}</span>
          </div>
          <button
            onClick={exportInternalReport}
            disabled={!reportVm}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              reportVm ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            <Download className="w-4 h-4" /> Export Full Report
          </button>
        </div>

        {/* Drilldown Modal */}
        {drilldownDayKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-5xl bg-white rounded-xl shadow-xl border border-gray-200">
              <div className="flex items-start justify-between p-4 border-b border-gray-200">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{drilldownTitle}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Day: <span className="font-mono">{drilldownDayKey}</span>
                  </div>
                </div>
                <button
                  onClick={() => setDrilldownDayKey(null)}
                  className="px-3 py-1 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Close
                </button>
              </div>

              {(() => {
                const afterKw =
                  diagSimulationResult?.new_intervals_kw && diagSimulationResult.new_intervals_kw.length
                    ? diagSimulationResult.new_intervals_kw
                    : diagSimulationResult?.final_load_profile?.intervals?.map((i) => i.kw) ?? null;

                const points = intervals
                  .map((i, idx) => {
                    const ts = i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp);
                    if (!Number.isFinite(ts.getTime())) return null;
                    if (toDayKeyLocal(ts) !== drilldownDayKey) return null;
                    const demand = i.kw ?? 0;
                    const after = afterKw ? afterKw[idx] ?? demand : demand;
                    const socPct = persistedSocHistory ? (persistedSocHistory[idx] ?? null) : null;
                    return {
                      t: ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      demand,
                      after,
                      soc: socPct != null ? socPct * 100 : null,
                    };
                  })
                  .filter(Boolean) as Array<{ t: string; demand: number; after: number; soc: number | null }>;

                if (!points.length) {
                  return (
                    <div className="p-6 text-sm text-gray-700">
                      No matching intervals found for this day (data may be sparse for the selected bucket).
                    </div>
                  );
                }

                return (
                  <div className="p-6 space-y-4">
                    <div className="text-xs text-gray-600">
                      Baseline vs post-battery net load. The dashed line is the target threshold; SOC is overlaid when available.
                    </div>
                    <ResponsiveContainer width="100%" height={320}>
                      <ComposedChart data={points}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="t" stroke="#6b7280" style={{ fontSize: '12px' }} interval="preserveStartEnd" />
                        <YAxis yAxisId="kw" stroke="#6b7280" style={{ fontSize: '12px' }} />
                        <YAxis yAxisId="soc" orientation="right" stroke="#f59e0b" style={{ fontSize: '12px' }} domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <ReferenceLine yAxisId="kw" y={targetThreshold} stroke="#111827" strokeDasharray="4 4" />
                        <Line yAxisId="kw" type="monotone" dataKey="demand" name="Baseline (kW)" stroke={COLORS.before} dot={false} strokeWidth={2} />
                        <Line yAxisId="kw" type="monotone" dataKey="after" name="After battery (kW)" stroke={COLORS.after} dot={false} strokeWidth={2} />
                        <Line yAxisId="soc" type="monotone" dataKey="soc" name="SOC (%)" stroke={COLORS.accent} dot={false} strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Phase2ResultsPage;
