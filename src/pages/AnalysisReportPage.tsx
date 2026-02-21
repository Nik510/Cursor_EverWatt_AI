/**
 * Analysis Report Page
 * Comprehensive analysis report with interval data statistics, demand charts,
 * peak event analysis, and battery recommendations.
 *
 * Loads analysis via API (`/api/analyses/:id`) using query param `analysisId`.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import { z } from 'zod';
import {
  ArrowLeft,
  Battery,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Gauge,
  TrendingDown,
  TrendingUp,
  Zap,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Award,
  CloudSun,
  Thermometer,
  DollarSign,
  Info,
  ExternalLink,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
} from 'recharts';
import {
  calculateIntervalStats,
  detectPeakEvents,
  calculatePeakEventStats,
  calculateTOUDistribution,
  calculateMonthlyDemandPattern,
  calculateWeekdayWeekendComparison,
} from '../utils/interval-stats';
import { formatCurrency, formatNumber, formatDate, formatDateTime } from '../utils/format';
import type { LoadInterval } from '../modules/battery/types';
import { GetAnalysisResponseSchema, unwrap } from '../types/api-responses';
import { checkSRateEligibility, estimateSRateSavings } from '../utils/rates/s-rate-eligibility';
import { calculateScenarioComparison } from '../utils/battery/scenario-comparison';
import { getDemandRateForCode } from '../utils/rates/demand-rate-lookup';
import { S_RATE_DAILY_RATE_2025, simulateBatteryDispatchWithSRate } from '../utils/battery/s-rate-calculations';
import { simulatePeakShaving } from '../modules/battery/logic';
import type { BatterySpec } from '../modules/battery/types';
import { buildMonthlyCapEventStats } from '../utils/battery/cap-event-stats';

// AI Insights imports
import { AIInsightPanel, WeatherInsightPanel } from '../components/AIInsightPanel';
import { fetchBatteryInsight, fetchSectionInsight, fetchWeatherInsight } from '../services/ai-insights-client';
import type { SectionInsight, WeatherInsight } from '../types/ai-insights';
import {
  fetchWeatherData,
  mergeWeatherWithIntervals,
  calculateWeatherCorrelation,
  geocodeAddress,
  type WeatherCorrelation,
  type LoadIntervalWithWeather,
} from '../utils/weather-service';

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
  onPeak: '#ef4444',
  offPeak: '#10b981',
  partialPeak: '#f59e0b',
  superOffPeak: '#3b82f6',
};

const PIE_COLORS = [COLORS.onPeak, COLORS.offPeak, COLORS.partialPeak, COLORS.superOffPeak];

// ============================================
// INTERFACES
// ============================================
interface AnalysisData {
  customerInfo: {
    billingName: string;
    siteAddress: string;
    saId: string;
    accountNumber: string;
    meterNumber: string;
    rateCode: string;
    serviceProvider?: string;
  };
  intervalData: LoadInterval[];
  usageData: Array<{
    billEndDate: Date | string;
    totalUsageKwh: number;
    peakDemandKw: number;
    totalCost: number;
    onPeakKwh?: number;
    partialPeakKwh?: number;
    offPeakKwh?: number;
    superOffPeakKwh?: number;
    rateCode?: string;
  }>;
  calculationResult?: {
    result: {
      original_peak: number;
      new_peak: number;
      savings_kwh: number;
    };
    battery: {
      capacity_kwh: number;
      max_power_kw: number;
    };
    batteryInfo: {
      modelName: string;
      manufacturer: string;
      capacityKwh: number;
      powerKw: number;
      roundTripEfficiency: number;
      warrantyYears: number;
    };
    threshold: number;
    demandRate: number;
    annualSavings: number;
    systemCost: number;
    effectiveCost: number;
    paybackYears: number;
  };
  peakEvents?: Array<{
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    peakKw: number;
    energyKwh: number;
  }>;
  aiRecommendations?: Array<{
    modelName: string;
    manufacturer: string;
    capacityKwh: number;
    maxPowerKw: number;
    peakReductionKw: number;
    annualSavings: number;
    systemCost: number;
    paybackYears: number;
    compositeScore?: number;
    best?: { mode: 'STANDARD' | 'S_RATE'; annualSavings: number; paybackYears: number };
    sRate?: { isEligible: boolean; annualDemandCharge: number; annualSavings: number; paybackYears: number };
    capDiscovery?: {
      guaranteedCapKw: number;
      perMonth: Array<{ monthKey: string; peakBeforeKw: number; capKw: number; peakAfterKw: number; feasible: boolean }>;
    };
  }>;
}

type RawAnalysisReportData = Omit<AnalysisData, 'intervalData' | 'usageData' | 'peakEvents'> & {
  intervalData: Array<{ timestamp: string; kw: number }>;
  usageData: Array<{
    billEndDate: string;
    totalUsageKwh: number;
    peakDemandKw: number;
    totalCost: number;
    onPeakKwh?: number;
    partialPeakKwh?: number;
    offPeakKwh?: number;
    superOffPeakKwh?: number;
    rateCode?: string;
  }>;
  peakEvents?: Array<{
    startTime: string;
    endTime: string;
    durationMinutes: number;
    peakKw: number;
    energyKwh: number;
  }>;
};

const RawAnalysisReportDataSchema: z.ZodType<RawAnalysisReportData> = z.object({
  customerInfo: z.object({
    billingName: z.string(),
    siteAddress: z.string(),
    saId: z.string(),
    accountNumber: z.string(),
    meterNumber: z.string(),
    rateCode: z.string(),
    serviceProvider: z.string().optional(),
  }),
  intervalData: z.array(z.object({ timestamp: z.string(), kw: z.number() })),
  usageData: z.array(
    z.object({
      billEndDate: z.string(),
      totalUsageKwh: z.number(),
      peakDemandKw: z.number(),
      totalCost: z.number(),
      onPeakKwh: z.number().optional(),
      partialPeakKwh: z.number().optional(),
      offPeakKwh: z.number().optional(),
      superOffPeakKwh: z.number().optional(),
      rateCode: z.string().optional(),
    })
  ),
  calculationResult: z.unknown().optional(),
  peakEvents: z
    .array(
      z.object({
        startTime: z.string(),
        endTime: z.string(),
        durationMinutes: z.number(),
        peakKw: z.number(),
        energyKwh: z.number(),
      })
    )
    .optional(),
  aiRecommendations: z.unknown().optional(),
});

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
// SECTION HEADER COMPONENT
// ============================================
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}> = ({ icon, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
      {icon}
    </div>
    <div>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================
export const AnalysisReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAdmin();
  const adminToken = session?.token || '';
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Insights state
  const [sectionInsights, setSectionInsights] = useState<Record<string, SectionInsight>>({});
  const [insightsLoading, setInsightsLoading] = useState<Record<string, boolean>>({});
  
  // Weather correlation state
  const [weatherCorrelation, setWeatherCorrelation] = useState<WeatherCorrelation | null>(null);
  const [weatherData, setWeatherData] = useState<LoadIntervalWithWeather[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherInsight, setWeatherInsight] = useState<WeatherInsight | null>(null);
  
  // Derived analysis state (as requested in plan)
  const [sRateEligibility, setSRateEligibility] = useState<ReturnType<typeof checkSRateEligibility> | null>(null);
  const [scenarioResults, setScenarioResults] = useState<ReturnType<typeof calculateScenarioComparison> | null>(null);

  // Scenario chart visibility
  const [visibleScenarios, setVisibleScenarios] = useState({
    baseline: true,
    battery: true,
    battery_srate: true,
  });

  // If we have an analysisId, reuse the Phase 2 Results page so the full report
  // matches the main analysis UI one-for-one (charts, layout, metrics).
  const analysisId = searchParams.get('analysisId');
  if (analysisId) {
    return <Navigate to={`/analysis/results?analysisId=${encodeURIComponent(analysisId)}`} replace />;
  }

  // Load analysis via API using query param `analysisId`
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const analysisId = searchParams.get('analysisId');
        if (!analysisId) {
          throw new Error('No analysis selected. Please run an analysis first.');
        }

        const res = await fetch(`/api/analyses/${encodeURIComponent(analysisId)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`Failed to load analysis (${res.status})`);
        const v = unwrap(GetAnalysisResponseSchema, data);
        const raw = v.analysis?.analysisReportData || v.analysis;
        const parsedRaw = RawAnalysisReportDataSchema.parse(raw);
        const parsed: AnalysisData = {
          ...parsedRaw,
          intervalData: parsedRaw.intervalData.map((i) => ({ ...i, timestamp: new Date(i.timestamp) })),
          usageData: parsedRaw.usageData.map((u) => ({ ...u, billEndDate: new Date(u.billEndDate) })),
          peakEvents: parsedRaw.peakEvents?.map((e) => ({
            ...e,
            startTime: new Date(e.startTime),
            endTime: new Date(e.endTime),
          })),
        };

        if (!cancelled) setAnalysisData(parsed);
      } catch (err) {
        console.error('Error loading analysis data:', err);
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load analysis data.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  // Fetch weather data and calculate correlation
  useEffect(() => {
    const loadWeatherData = async () => {
      if (!analysisData?.intervalData || analysisData.intervalData.length === 0) return;
      
      setWeatherLoading(true);
      try {
        // Get date range from interval data
        const timestamps = analysisData.intervalData.map(i => 
          i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp)
        );
        const startDate = new Date(Math.min(...timestamps.map(t => t.getTime())));
        const endDate = new Date(Math.max(...timestamps.map(t => t.getTime())));
        
        // Geocode address if available
        const address = analysisData.customerInfo?.siteAddress || '';
        const coords = await geocodeAddress(address);
        
        // Fetch weather data from API
        const result = await fetchWeatherData(coords.lat, coords.lng, startDate, endDate);
        
        if (result.success && result.data.length > 0) {
          // Merge weather with interval data
          const intervals = analysisData.intervalData.map(i => ({
            timestamp: i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp),
            kw: i.kw,
          }));
          
          const merged = mergeWeatherWithIntervals(intervals, result.data, result.dailyData);
          setWeatherData(merged);
          
          // Calculate correlation
          const correlation = calculateWeatherCorrelation(merged);
          setWeatherCorrelation(correlation);
          
          // Generate weather insight
          const insight = await fetchWeatherInsight({ adminToken, correlationData: correlation });
          setWeatherInsight(insight);
        }
      } catch (err) {
        console.error('Failed to load weather data:', err);
      } finally {
        setWeatherLoading(false);
      }
    };
    
    loadWeatherData();
  }, [analysisData?.intervalData, analysisData?.customerInfo?.siteAddress]);

  // Calculate statistics (place before effects to avoid TDZ)
  const intervalStats = useMemo(() => {
    if (!analysisData?.intervalData) return null;
    return calculateIntervalStats(analysisData.intervalData);
  }, [analysisData?.intervalData]);

  const peakEvents = useMemo(() => {
    if (!analysisData?.intervalData || !intervalStats) return [];
    const threshold = analysisData.calculationResult?.threshold || intervalStats.peakDemand.kw * 0.9;
    return detectPeakEvents(analysisData.intervalData, threshold);
  }, [analysisData?.intervalData, analysisData?.calculationResult?.threshold, intervalStats]);

  const peakEventStats = useMemo(() => {
    return calculatePeakEventStats(peakEvents);
  }, [peakEvents]);

  const touDistribution = useMemo(() => {
    if (!analysisData?.intervalData) return null;
    return calculateTOUDistribution(analysisData.intervalData);
  }, [analysisData?.intervalData]);

  const monthlyDemand = useMemo(() => {
    if (!analysisData?.intervalData) return [];
    return calculateMonthlyDemandPattern(analysisData.intervalData);
  }, [analysisData?.intervalData]);

  const weekdayWeekend = useMemo(() => {
    if (!analysisData?.intervalData) return null;
    return calculateWeekdayWeekendComparison(analysisData.intervalData);
  }, [analysisData?.intervalData]);

  // Calculate S Rate eligibility
  const computedSRateEligibility = useMemo(() => {
    if (!analysisData || !intervalStats || !analysisData.calculationResult?.batteryInfo) return null;
    
    const batteryInfo = analysisData.calculationResult.batteryInfo;
    return checkSRateEligibility(
      analysisData.customerInfo.rateCode || '',
      intervalStats.peakDemand.kw,
      batteryInfo.capacityKwh,
      batteryInfo.powerKw,
      intervalStats.loadFactor,
      analysisData.intervalData
    );
  }, [analysisData, intervalStats]);

  // Calculate scenario comparison
  const computedScenarioResults = useMemo(() => {
    if (!analysisData || !intervalStats || !analysisData.calculationResult) return null;
    
    const rateCode = analysisData.customerInfo.rateCode || '';
    const demandRateInfo = getDemandRateForCode(rateCode, analysisData.customerInfo.serviceProvider || 'PG&E');
    
    if (!demandRateInfo) return null;
    
    const batteryInfo = analysisData.calculationResult.batteryInfo;
    if (!batteryInfo) return null;
    
    const batterySpec: BatterySpec = {
      capacity_kwh: batteryInfo.capacityKwh,
      max_power_kw: batteryInfo.powerKw,
      round_trip_efficiency: batteryInfo.roundTripEfficiency,
      degradation_rate: 0.02, // Default 2% per year
    };
    
    const threshold = analysisData.calculationResult.threshold || intervalStats.peakDemand.kw * 0.9;
    
    // Estimate blended energy rate from billing data (avoid hardcoded $/kWh).
    // We estimate energy-only cost per kWh by subtracting an estimated demand charge.
    const energyRates = (() => {
      const fallback = { onPeak: 0.25, offPeak: 0.15 };
      const bills = analysisData.usageData || [];
      if (bills.length === 0) return fallback;

      let totalEnergyCost = 0;
      let totalKwh = 0;

      for (const b of bills) {
        const kwh = Number(b.totalUsageKwh || 0);
        const totalCost = Number(b.totalCost || 0);
        const peakKw = Number(b.peakDemandKw || 0);

        // Estimated demand cost for that bill month
        const demandCostEst = peakKw * demandRateInfo.rate;
        const energyCostEst = Math.max(0, totalCost - demandCostEst);

        totalEnergyCost += energyCostEst;
        totalKwh += kwh;
      }

      const avgRate = totalKwh > 0 ? totalEnergyCost / totalKwh : NaN;
      if (!isFinite(avgRate) || avgRate <= 0) return fallback;

      // Without TOU period costs, keep on/off the same blended rate.
      return { onPeak: avgRate, offPeak: avgRate };
    })();
    
    return calculateScenarioComparison(
      analysisData.intervalData,
      batterySpec,
      demandRateInfo,
      S_RATE_DAILY_RATE_2025,
      energyRates,
      threshold
    );
  }, [analysisData, intervalStats]);

  // Store derived results in state (per plan)
  useEffect(() => {
    setSRateEligibility(computedSRateEligibility);
  }, [computedSRateEligibility]);

  useEffect(() => {
    setScenarioResults(computedScenarioResults);
  }, [computedScenarioResults]);

  // Multi-scenario chart data (aligned by interval index)
  const comparisonChartData = useMemo(() => {
    if (!analysisData?.intervalData || !intervalStats) return [];
    const threshold = analysisData.calculationResult?.threshold || intervalStats.peakDemand.kw * 0.9;

    const sampleRate = Math.max(1, Math.floor(analysisData.intervalData.length / 500));
    const baselineIntervals = analysisData.intervalData;

    // Battery scenario intervals (same length/order as baseline)
    let batteryIntervals: LoadInterval[] | null = null;
    let sRateIntervals: LoadInterval[] | null = null;

    if (analysisData.calculationResult?.batteryInfo) {
      const batterySpec: BatterySpec = {
        capacity_kwh: analysisData.calculationResult.batteryInfo.capacityKwh,
        max_power_kw: analysisData.calculationResult.batteryInfo.powerKw,
        round_trip_efficiency: analysisData.calculationResult.batteryInfo.roundTripEfficiency,
        degradation_rate: 0.02,
      };

      const loadProfile = { intervals: baselineIntervals };
      const batteryResult = simulatePeakShaving(loadProfile, batterySpec, threshold);
      batteryIntervals = batteryResult.final_load_profile.intervals;

      const sRateResult = simulateBatteryDispatchWithSRate(
        baselineIntervals,
        batterySpec.capacity_kwh,
        batterySpec.max_power_kw,
        batterySpec.round_trip_efficiency,
        threshold
      );
      sRateIntervals = sRateResult.modifiedIntervals;
    }

    return baselineIntervals
      .filter((_, idx) => idx % sampleRate === 0)
      .map((interval, idx) => {
        const rawIdx = idx * sampleRate;
        const ts = interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp);
        return {
          timestamp: ts.getTime(),
          time: ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          baseline: interval.kw,
          withBattery: batteryIntervals?.[rawIdx]?.kw ?? null,
          withBatterySRate: sRateIntervals?.[rawIdx]?.kw ?? null,
          threshold,
        };
      });
  }, [analysisData?.intervalData, analysisData?.calculationResult?.batteryInfo, analysisData?.calculationResult?.threshold, intervalStats]);

  // Month labels aligned to scenario results (YYYY-MM keys)
  const monthKeys = useMemo(() => {
    if (!analysisData?.intervalData) return [];
    const keys = new Set<string>();
    for (const interval of analysisData.intervalData) {
      const ts = interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp);
      keys.add(`${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`);
    }
    return Array.from(keys).sort();
  }, [analysisData?.intervalData]);

  const monthlySpikeMitigation = useMemo(() => {
    if (!analysisData?.intervalData || analysisData.intervalData.length === 0) return null;
    if (!analysisData.calculationResult?.batteryInfo) return null;

    const baselineIntervals = analysisData.intervalData;
    const threshold = analysisData.calculationResult.threshold || (intervalStats?.peakDemand.kw || 0) * 0.9;
    const demandRate = analysisData.calculationResult.demandRate || 0; // $/kW-month

    // Interval duration (hours)
    let intervalHours = 0.25;
    if (baselineIntervals.length >= 2) {
      const t0 = baselineIntervals[0].timestamp instanceof Date ? baselineIntervals[0].timestamp : new Date(baselineIntervals[0].timestamp);
      const t1 = baselineIntervals[1].timestamp instanceof Date ? baselineIntervals[1].timestamp : new Date(baselineIntervals[1].timestamp);
      const dtMs = Math.abs(t1.getTime() - t0.getTime());
      const h = dtMs / (1000 * 60 * 60);
      if (Number.isFinite(h) && h > 0) intervalHours = h;
    }

    const monthKey = (timestamp: Date | string): string => {
      const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (!Number.isFinite(d.getTime())) return 'invalid';
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    };

    const batterySpec: BatterySpec = {
      capacity_kwh: analysisData.calculationResult.batteryInfo.capacityKwh,
      max_power_kw: analysisData.calculationResult.batteryInfo.powerKw,
      round_trip_efficiency: analysisData.calculationResult.batteryInfo.roundTripEfficiency,
      degradation_rate: 0.02,
    };

    const loadProfile = { intervals: baselineIntervals };
    const batteryResult = simulatePeakShaving(loadProfile, batterySpec, threshold);
    const afterIntervals = batteryResult.final_load_profile.intervals;

    const rowsByMonth = new Map<string, {
      month: string;
      spikeEvents: number;
      mitigatedEvents: number;
      mitigatedEventPeakReductionSumKw: number;
      mitigatedEventPeakReductionMaxKw: number;
      billingPeakBeforeKw: number;
      billingPeakAfterKw: number;
    }>();

    const ensure = (m: string) => {
      const existing = rowsByMonth.get(m);
      if (existing) return existing;
      const next = {
        month: m,
        spikeEvents: 0,
        mitigatedEvents: 0,
        mitigatedEventPeakReductionSumKw: 0,
        mitigatedEventPeakReductionMaxKw: 0,
        billingPeakBeforeKw: 0,
        billingPeakAfterKw: 0,
      };
      rowsByMonth.set(m, next);
      return next;
    };

    // --- Billing peaks before/after ---
    const n = Math.min(baselineIntervals.length, afterIntervals.length);
    for (let i = 0; i < n; i++) {
      const m = monthKey(baselineIntervals[i].timestamp);
      const row = ensure(m);
      row.billingPeakBeforeKw = Math.max(row.billingPeakBeforeKw, baselineIntervals[i].kw);
      row.billingPeakAfterKw = Math.max(row.billingPeakAfterKw, afterIntervals[i]?.kw ?? baselineIntervals[i].kw);
    }

    // --- Spike events (consecutive intervals above threshold) and mitigation per event ---
    let inEvent = false;
    let eventStartIdx = 0;
    for (let i = 0; i < n; i++) {
      const before = baselineIntervals[i].kw;
      const above = before > threshold;
      if (above && !inEvent) {
        inEvent = true;
        eventStartIdx = i;
      }
      const isLast = i === n - 1;
      if ((!above && inEvent) || (isLast && inEvent && above)) {
        const eventEndIdx = isLast && above ? i : i - 1;
        const m = monthKey(baselineIntervals[eventStartIdx].timestamp);
        const row = ensure(m);
        row.spikeEvents += 1;

        let peakBefore = 0;
        let peakAfter = 0;
        let hadAnyMitigation = false;
        for (let j = eventStartIdx; j <= eventEndIdx; j++) {
          const b = baselineIntervals[j].kw;
          const a = afterIntervals[j]?.kw ?? b;
          peakBefore = Math.max(peakBefore, b);
          peakAfter = Math.max(peakAfter, a);
          if (b > threshold && a < b) hadAnyMitigation = true;
        }

        const eventPeakReductionKw = Math.max(0, peakBefore - peakAfter);
        if (hadAnyMitigation && eventPeakReductionKw > 0) {
          row.mitigatedEvents += 1;
          row.mitigatedEventPeakReductionSumKw += eventPeakReductionKw;
          row.mitigatedEventPeakReductionMaxKw = Math.max(row.mitigatedEventPeakReductionMaxKw, eventPeakReductionKw);
        }

        inEvent = false;
      }
    }

    const months = Array.from(rowsByMonth.keys()).sort();
    const monthCount = months.length;
    const annualizeFactor = monthCount > 0 ? 12 / monthCount : 1;

    const monthly = months.map((m) => {
      const r = rowsByMonth.get(m)!;
      const billingPeakReductionKw = Math.max(0, r.billingPeakBeforeKw - r.billingPeakAfterKw);
      const demandSavings = billingPeakReductionKw * demandRate; // $/kW-month * kW

      const avgMitigationKw = r.mitigatedEvents > 0 ? r.mitigatedEventPeakReductionSumKw / r.mitigatedEvents : 0;

      return {
        month: m,
        spikeEvents: r.spikeEvents,
        mitigatedEvents: r.mitigatedEvents,
        avgEventMitigationKw: avgMitigationKw,
        maxEventMitigationKw: r.mitigatedEventPeakReductionMaxKw,
        billingPeakBeforeKw: r.billingPeakBeforeKw,
        billingPeakAfterKw: r.billingPeakAfterKw,
        billingPeakReductionKw,
        demandSavings,
      };
    });

    const totals = monthly.reduce((acc, r) => {
      acc.spikeEvents += r.spikeEvents;
      acc.mitigatedEvents += r.mitigatedEvents;
      acc.billingPeakReductionKwMonthSum += r.billingPeakReductionKw;
      acc.demandSavingsTotal += r.demandSavings;
      return acc;
    }, { spikeEvents: 0, mitigatedEvents: 0, billingPeakReductionKwMonthSum: 0, demandSavingsTotal: 0 });

    return {
      threshold,
      intervalHours,
      demandRate,
      monthCount,
      annualizeFactor,
      monthly,
      totals: {
        ...totals,
        annualizedBillingPeakReductionKwMonthSum: totals.billingPeakReductionKwMonthSum * annualizeFactor,
        annualizedDemandSavings: totals.demandSavingsTotal * annualizeFactor,
      },
    };
  }, [analysisData, intervalStats]);

  // Helper: IRR via bisection (returns decimal, e.g. 0.12)
  const calculateIRR = (cashFlows: number[]): number | null => {
    const npv = (r: number) => cashFlows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + r, t), 0);
    let lo = -0.9;
    let hi = 1.0;
    let fLo = npv(lo);
    let fHi = npv(hi);
    if (!isFinite(fLo) || !isFinite(fHi)) return null;
    if (fLo === 0) return lo;
    if (fHi === 0) return hi;
    if (fLo * fHi > 0) return null; // not bracketed
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      const fMid = npv(mid);
      if (!isFinite(fMid)) return null;
      if (Math.abs(fMid) < 1e-6) return mid;
      if (fLo * fMid <= 0) {
        hi = mid;
        fHi = fMid;
      } else {
        lo = mid;
        fLo = fMid;
      }
    }
    return (lo + hi) / 2;
  };

  // Generate AI insights for sections
  useEffect(() => {
    const generateInsights = async () => {
      if (!analysisData || !intervalStats) return;
      
      // Generate insights for each section
      const sections = [
        { id: 'site-overview', title: 'Site Overview', data: analysisData.customerInfo },
        { id: 'interval-data-summary', title: 'Interval Data Summary', data: {
          totalPoints: intervalStats.totalPoints,
          daysCount: intervalStats.daysCount,
          intervalResolution: intervalStats.intervalResolution,
          missingDataPercent: intervalStats.missingDataPercent,
        }},
        { id: 'demand-statistics', title: 'Demand Statistics', data: {
          peakDemand: intervalStats.peakDemand.kw,
          minDemand: intervalStats.minDemand.kw,
          avgDemand: intervalStats.avgDemand,
          loadFactor: intervalStats.loadFactor,
          totalEnergyKwh: intervalStats.totalEnergyKwh,
        }},
        { id: 'peak-event-analysis', title: 'Peak Event Analysis', data: peakEventStats },
        { id: 'tou-distribution', title: 'Time-of-Use Distribution', data: touDistribution },
      ];
      
      for (const section of sections) {
        if (!sectionInsights[section.id] && !insightsLoading[section.id]) {
          setInsightsLoading(prev => ({ ...prev, [section.id]: true }));
          try {
            const insight = await fetchSectionInsight({
              adminToken,
              sectionId: section.id,
              sectionTitle: section.title,
              sectionData: section.data as Record<string, unknown>,
            });
            setSectionInsights(prev => ({ ...prev, [section.id]: insight }));
          } catch (err) {
            console.error(`Failed to generate insight for ${section.id}:`, err);
          } finally {
            setInsightsLoading(prev => ({ ...prev, [section.id]: false }));
          }
        }
      }
      
      // Generate battery insight if recommendations exist
      if (analysisData.aiRecommendations && analysisData.aiRecommendations.length > 0 && !sectionInsights['battery-recommendations']) {
        setInsightsLoading(prev => ({ ...prev, 'battery-recommendations': true }));
        try {
          const batteryInsight = await fetchBatteryInsight({
            adminToken,
            batteries: analysisData.aiRecommendations.slice(0, 5).map(r => ({
              modelName: r.modelName,
              manufacturer: r.manufacturer,
              capacityKwh: r.capacityKwh,
              maxPowerKw: r.maxPowerKw,
              peakReductionKw: r.peakReductionKw,
              annualSavings: r.annualSavings,
              paybackYears: r.paybackYears,
            })),
            peakProfile: {
              peakKw: intervalStats.peakDemand.kw,
              avgKw: intervalStats.avgDemand,
              loadFactor: intervalStats.loadFactor,
              peakEvents: peakEventStats.totalEvents,
            },
          });
          setSectionInsights(prev => ({ ...prev, 'battery-recommendations': batteryInsight }));
        } catch (err) {
          console.error('Failed to generate battery insight:', err);
        } finally {
          setInsightsLoading(prev => ({ ...prev, 'battery-recommendations': false }));
        }
      }
    };
    
    generateInsights();
  }, [analysisData, intervalStats, peakEventStats, touDistribution]);

  // Prepare chart data
  const demandProfileData = useMemo(() => {
    if (!analysisData?.intervalData || analysisData.intervalData.length === 0) return [];
    
    // Sample data for large datasets (show every Nth point for performance)
    const sampleRate = Math.max(1, Math.floor(analysisData.intervalData.length / 500));
    const threshold = analysisData.calculationResult?.threshold || (intervalStats?.peakDemand.kw || 0) * 0.9;
    
    return analysisData.intervalData
      .filter((_, idx) => idx % sampleRate === 0)
      .map(interval => {
        const ts = interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp);
        return {
          time: ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          timestamp: ts.getTime(),
          demand: interval.kw,
          threshold,
          isPeak: interval.kw > threshold,
        };
      });
  }, [analysisData?.intervalData, analysisData?.calculationResult?.threshold, intervalStats]);

  const peakEventFrequencyData = useMemo(() => {
    return peakEventStats.eventFrequencyByHour.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      events: count,
    }));
  }, [peakEventStats]);

  // Cap-enforcement diagnostics for the top AI recommendation (if present)
  const topRecCapSeries = useMemo(() => {
    const rec = analysisData?.aiRecommendations?.[0];
    const perMonth = rec?.capDiscovery?.perMonth;
    if (!perMonth || perMonth.length === 0) return [];
    return perMonth.map((m) => ({
      month: m.monthKey,
      peakBeforeKw: m.peakBeforeKw,
      capKw: m.capKw,
      peakAfterKw: m.peakAfterKw,
      feasible: m.feasible ? 1 : 0,
    }));
  }, [analysisData?.aiRecommendations]);

  const topRecCapEventBucketData = useMemo(() => {
    const rec = analysisData?.aiRecommendations?.[0];
    const perMonth = rec?.capDiscovery?.perMonth;
    if (!analysisData?.intervalData || !perMonth || perMonth.length === 0) return { data: [], bucketKeys: [] as string[] };

    const capByMonth = new Map<string, number>(perMonth.map((m) => [m.monthKey, m.capKw]));
    const peakBeforeByMonth = new Map<string, number>(perMonth.map((m) => [m.monthKey, m.peakBeforeKw]));
    const stats = buildMonthlyCapEventStats({
      intervals: analysisData.intervalData,
      capByMonth,
      peakBeforeByMonth,
    });

    const toKey = (label: string) => `b_${label.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase()}`;
    const bucketKeys = stats[0]?.bucketsByExceedPct?.map((b) => toKey(b.label)) ?? [];

    const data = stats.map((m) => {
      const row: Record<string, string | number> = {
        month: m.monthKey,
        totalEvents: m.totalEvents,
        capKw: m.capKw,
        peakBeforeKw: m.peakBeforeKw,
      };
      for (const b of m.bucketsByExceedPct) {
        row[toKey(b.label)] = b.count;
      }
      return row;
    });

    return { data, bucketKeys };
  }, [analysisData?.aiRecommendations, analysisData?.intervalData]);

  const touPieData = useMemo(() => {
    if (!touDistribution) return [];
    return [
      { name: 'On-Peak', value: touDistribution.onPeakKwh, percent: touDistribution.onPeakPercent },
      { name: 'Off-Peak', value: touDistribution.offPeakKwh, percent: touDistribution.offPeakPercent },
      { name: 'Partial-Peak', value: touDistribution.partialPeakKwh, percent: touDistribution.partialPeakPercent },
      { name: 'Super Off-Peak', value: touDistribution.superOffPeakKwh, percent: touDistribution.superOffPeakPercent },
    ].filter(d => d.value > 0);
  }, [touDistribution]);

  const dailyPatternData = useMemo(() => {
    if (!analysisData?.intervalData) return [];
    
    const hourlyData: { weekday: number[]; weekend: number[] } = { weekday: [], weekend: [] };
    for (let h = 0; h < 24; h++) {
      hourlyData.weekday[h] = 0;
      hourlyData.weekend[h] = 0;
    }
    
    const hourlyCounts: { weekday: number[]; weekend: number[] } = { weekday: [], weekend: [] };
    for (let h = 0; h < 24; h++) {
      hourlyCounts.weekday[h] = 0;
      hourlyCounts.weekend[h] = 0;
    }
    
    for (const interval of analysisData.intervalData) {
      const ts = interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp);
      const hour = ts.getHours();
      const isWeekend = ts.getDay() === 0 || ts.getDay() === 6;
      
      if (isWeekend) {
        hourlyData.weekend[hour] += interval.kw;
        hourlyCounts.weekend[hour]++;
      } else {
        hourlyData.weekday[hour] += interval.kw;
        hourlyCounts.weekday[hour]++;
      }
    }
    
    return Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      weekday: hourlyCounts.weekday[hour] > 0 ? hourlyData.weekday[hour] / hourlyCounts.weekday[hour] : 0,
      weekend: hourlyCounts.weekend[hour] > 0 ? hourlyData.weekend[hour] / hourlyCounts.weekend[hour] : 0,
    }));
  }, [analysisData?.intervalData]);

  // Weather correlation scatter data
  const weatherScatterData = useMemo(() => {
    if (!weatherData || weatherData.length === 0) return [];
    
    // Aggregate to daily for cleaner scatter plot
    const dailyMap = new Map<string, { temps: number[]; kws: number[] }>();
    
    for (const point of weatherData) {
      const key = point.timestamp.toISOString().split('T')[0];
      if (!dailyMap.has(key)) {
        dailyMap.set(key, { temps: [], kws: [] });
      }
      const day = dailyMap.get(key)!;
      day.temps.push(point.temperatureF);
      day.kws.push(point.kw);
    }
    
    return Array.from(dailyMap.entries()).map(([date, { temps, kws }]) => ({
      date,
      temperature: temps.reduce((a, b) => a + b, 0) / temps.length,
      avgKw: kws.reduce((a, b) => a + b, 0) / kws.length,
    }));
  }, [weatherData]);

  // Handle export
  const handleExport = () => {
    if (!analysisData) return;
    
    const reportData = {
      generatedAt: new Date().toISOString(),
      customerInfo: analysisData.customerInfo,
      intervalStats,
      peakEventStats,
      touDistribution,
      monthlyDemand,
      weekdayWeekend,
      calculationResult: analysisData.calculationResult,
      recommendations: analysisData.aiRecommendations,
      sRateEligibility,
      scenarioResults,
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-report-${analysisData.customerInfo?.billingName || 'export'}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analysis report...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !analysisData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Analysis Data</h2>
          <p className="text-gray-600 mb-6">
            {error || 'Please run an analysis from the Battery Calculator first.'}
          </p>
          <button
            onClick={() => navigate('/calculator')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Go to Calculator
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ===== SECTION H: NAVIGATION HEADER ===== */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/calculator')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Calculator
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4" /> Export Report
            </button>
          </div>
        </div>

        {/* ===== SECTION A: SITE OVERVIEW HEADER ===== */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {analysisData.customerInfo?.billingName || 'Analysis Report'}
              </h1>
              <p className="text-gray-600 mt-1">
                {analysisData.customerInfo?.siteAddress || 'Location not specified'}
              </p>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                <span>
                  SAID: <strong className="text-gray-700">{analysisData.customerInfo?.saId || 'N/A'}</strong>
                </span>
                <span>
                  Rate: <strong className="text-gray-700">{analysisData.customerInfo?.rateCode || 'N/A'}</strong>
                </span>
                <span>
                  Meter: <strong className="text-gray-700">{analysisData.customerInfo?.meterNumber || 'N/A'}</strong>
                </span>
              </div>
            </div>
            {intervalStats && (
              <div className="text-right">
                <div className="text-sm text-gray-500">Data Quality Score</div>
                <div className={`text-3xl font-bold ${
                  intervalStats.dataQualityScore >= 80 ? 'text-green-600' :
                  intervalStats.dataQualityScore >= 60 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {intervalStats.dataQualityScore}%
                </div>
                <div className="text-xs text-gray-400">
                  {formatDate(intervalStats.dateRange.start)} - {formatDate(intervalStats.dateRange.end)}
                </div>
              </div>
            )}
          </div>
          
          {/* AI Insight for Site Overview */}
          <div className="mt-4">
            <AIInsightPanel
              insight={sectionInsights['site-overview'] || null}
              isLoading={insightsLoading['site-overview']}
              defaultExpanded={false}
              compact={true}
              variant="blue"
            />
          </div>
        </div>

        {/* ===== SECTION B: INTERVAL DATA SUMMARY ===== */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <SectionHeader
            icon={<FileText className="w-5 h-5" />}
            title="Interval Data Summary"
            subtitle="Overview of analyzed interval data"
          />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Total Data Points"
              value={formatNumber(intervalStats?.totalPoints || 0, 0)}
              subtext="Intervals analyzed"
              icon={<BarChart3 className="w-4 h-4" />}
            />
            <MetricCard
              label="Days Covered"
              value={intervalStats?.daysCount || 0}
              subtext={`${intervalStats?.intervalResolution || 'Unknown'} resolution`}
              icon={<Calendar className="w-4 h-4" />}
            />
            <MetricCard
              label="Interval Resolution"
              value={intervalStats?.intervalResolution || 'N/A'}
              subtext={`${intervalStats?.intervalMinutes || 0} minutes`}
              icon={<Clock className="w-4 h-4" />}
            />
            <MetricCard
              label="Missing Data"
              value={`${formatNumber(intervalStats?.missingDataPercent || 0, 1)}%`}
              subtext={intervalStats && intervalStats.missingDataPercent < 5 ? 'Excellent' : 'May affect accuracy'}
              status={intervalStats && intervalStats.missingDataPercent < 5 ? 'good' : intervalStats && intervalStats.missingDataPercent < 15 ? 'warning' : 'danger'}
              icon={<AlertTriangle className="w-4 h-4" />}
            />
          </div>
          
          {/* AI Insight for Interval Data */}
          <div className="mt-4">
            <AIInsightPanel
              insight={sectionInsights['interval-data-summary'] || null}
              isLoading={insightsLoading['interval-data-summary']}
              defaultExpanded={false}
              compact={true}
            />
          </div>
        </div>

        {/* ===== SECTION C: DEMAND STATISTICS CARDS ===== */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <SectionHeader
            icon={<Gauge className="w-5 h-5" />}
            title="Demand Statistics"
            subtitle="Peak, minimum, and average demand metrics"
          />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-red-600" />
                <span className="text-xs font-medium text-red-600">Peak Demand</span>
              </div>
              <div className="text-2xl font-bold text-red-800">
                {formatNumber(intervalStats?.peakDemand.kw || 0, 1)} kW
              </div>
              <div className="text-xs text-red-600 mt-1">
                {intervalStats?.peakDemand.timestamp ? formatDateTime(intervalStats.peakDemand.timestamp) : 'N/A'}
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-green-600">Minimum Demand</span>
              </div>
              <div className="text-2xl font-bold text-green-800">
                {formatNumber(intervalStats?.minDemand.kw || 0, 1)} kW
              </div>
              <div className="text-xs text-green-600 mt-1">
                {intervalStats?.minDemand.timestamp ? formatDateTime(intervalStats.minDemand.timestamp) : 'N/A'}
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-600">Average Demand</span>
              </div>
              <div className="text-2xl font-bold text-blue-800">
                {formatNumber(intervalStats?.avgDemand || 0, 1)} kW
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {formatNumber(intervalStats?.totalEnergyKwh || 0, 0)} kWh total
              </div>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-600">Load Factor</span>
              </div>
              <div className="text-2xl font-bold text-purple-800">
                {formatNumber((intervalStats?.loadFactor || 0) * 100, 1)}%
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {(intervalStats?.loadFactor || 0) >= 0.5 ? 'Good utilization' : 'Peaky load profile'}
              </div>
            </div>
          </div>
          
          {/* AI Insight for Demand Statistics */}
          <div className="mt-4">
            <AIInsightPanel
              insight={sectionInsights['demand-statistics'] || null}
              isLoading={insightsLoading['demand-statistics']}
              defaultExpanded={true}
              variant="purple"
            />
          </div>
        </div>

        {/* ===== SECTION D1: S RATE QUALIFICATION ===== */}
        {sRateEligibility && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <SectionHeader
              icon={<Info className="w-5 h-5" />}
              title="S Rate (Option S) Qualification"
              subtitle="PG&E Option S daily demand charge eligibility assessment"
            />
            
            <div className={`rounded-xl border-2 p-6 ${
              sRateEligibility.recommendation === 'recommended' 
                ? 'bg-green-50 border-green-300' 
                : sRateEligibility.recommendation === 'not_recommended'
                ? 'bg-red-50 border-red-300'
                : 'bg-amber-50 border-amber-300'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Eligibility Status: {
                      sRateEligibility.isEligible ? (
                        <span className="text-green-600">Eligible</span>
                      ) : (
                        <span className="text-red-600">Not Eligible</span>
                      )
                    }
                  </h3>
                  <p className="text-sm text-gray-600">
                    Recommendation: {
                      sRateEligibility.recommendation === 'recommended' ? 'Recommended' :
                      sRateEligibility.recommendation === 'not_recommended' ? 'Not Recommended' :
                      'Neutral - Evaluate Further'
                    }
                  </p>
                </div>
                <a
                  href="https://www.pge.com/tariffs/tariffbooks/ELEC_SCHEDS_S.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  PG&E Option S Documentation
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Battery Capacity</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatNumber(sRateEligibility.batteryCapacityPercent, 1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {sRateEligibility.qualificationCriteria.batteryCapacitySufficient 
                      ? '✓ Meets 10% requirement' 
                      : '✗ Below 10% requirement'}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Load Factor</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatNumber(sRateEligibility.loadFactor * 100, 1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {sRateEligibility.qualificationCriteria.loadFactorFavorable 
                      ? '✓ Peaky profile (favorable)' 
                      : '⚠ Moderate profile'}
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">Qualification Criteria</h4>
                <ul className="space-y-2 text-sm">
                  {sRateEligibility.reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className={reason.startsWith('✓') ? 'text-green-600' : reason.startsWith('✗') ? 'text-red-600' : 'text-amber-600'}>
                        {reason}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {analysisData.calculationResult && intervalStats && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Estimated S Rate Savings</h4>
                  <div className="text-sm text-blue-800">
                    {(() => {
                      const demandRateInfo = getDemandRateForCode(
                        analysisData.customerInfo.rateCode || '',
                        analysisData.customerInfo.serviceProvider || 'PG&E'
                      );
                      if (demandRateInfo) {
                        const savings = estimateSRateSavings(
                          intervalStats.peakDemand.kw,
                          demandRateInfo.rate,
                          S_RATE_DAILY_RATE_2025
                        );
                        return savings > 0 
                          ? `Potential additional savings: ${formatCurrency(savings, 'USD', 0)}/month`
                          : 'S rate may not provide additional savings vs current rate';
                      }
                      return 'Unable to calculate savings - rate information unavailable';
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== SECTION D: DEMAND PROFILE CHART (MULTI-SCENARIO) ===== */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <SectionHeader
            icon={<BarChart3 className="w-5 h-5" />}
            title="Demand Profile Comparison"
            subtitle="Baseline vs Battery vs Battery + Option S (all on one chart)"
          />
          
          {/* Toggle buttons (show/hide lines) */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => {
                setVisibleScenarios((prev) => ({ ...prev, baseline: !prev.baseline }));
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                visibleScenarios.baseline ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Baseline
            </button>
            <button
              onClick={() => {
                setVisibleScenarios((prev) => ({ ...prev, battery: !prev.battery }));
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                visibleScenarios.battery ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
              disabled={!analysisData?.calculationResult?.batteryInfo}
              title={!analysisData?.calculationResult?.batteryInfo ? 'Run a battery analysis to enable this scenario' : undefined}
            >
              With Battery
            </button>
            <button
              onClick={() => {
                setVisibleScenarios((prev) => ({ ...prev, battery_srate: !prev.battery_srate }));
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                visibleScenarios.battery_srate ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
              disabled={!analysisData?.calculationResult?.batteryInfo}
              title={!analysisData?.calculationResult?.batteryInfo ? 'Run a battery analysis to enable this scenario' : undefined}
            >
              With Battery + Option S
            </button>
          </div>

          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={comparisonChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} interval="preserveStartEnd" />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '10px' }}
                label={{ value: 'Demand (kW)', angle: -90, position: 'insideLeft', fontSize: 11 }}
              />
              <Tooltip formatter={(value: number) => [`${formatNumber(value, 1)} kW`, 'Demand']} />
              <Legend />

              {visibleScenarios.baseline && (
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke={COLORS.gray}
                  name={`Baseline${scenarioResults?.find((r) => r.scenario === 'baseline') ? ` (${formatCurrency(scenarioResults.find((r) => r.scenario === 'baseline')!.annualTotalCost, 'USD', 0)}/yr)` : ''}`}
                  strokeWidth={2}
                  dot={false}
                />
              )}
              {visibleScenarios.battery && (
                <Line
                  type="monotone"
                  dataKey="withBattery"
                  stroke={COLORS.primary}
                  name={`With Battery${
                    scenarioResults?.find((r) => r.scenario === 'battery')
                      ? ` (Save ${formatCurrency(scenarioResults.find((r) => r.scenario === 'battery')!.annualSavings, 'USD', 0)}/yr)`
                      : ''
                  }`}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              )}
              {visibleScenarios.battery_srate && (
                <Line
                  type="monotone"
                  dataKey="withBatterySRate"
                  stroke={COLORS.secondary}
                  name={`With Battery + Option S${
                    scenarioResults?.find((r) => r.scenario === 'battery_srate')
                      ? ` (Save ${formatCurrency(scenarioResults.find((r) => r.scenario === 'battery_srate')!.annualSavings, 'USD', 0)}/yr)`
                      : ''
                  }`}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              )}

              <ReferenceLine
                y={analysisData.calculationResult?.threshold || (intervalStats?.peakDemand.kw || 0) * 0.9}
                stroke={COLORS.danger}
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `Threshold: ${formatNumber(analysisData.calculationResult?.threshold || (intervalStats?.peakDemand.kw || 0) * 0.9, 0)} kW`,
                  fontSize: 10,
                  fill: COLORS.danger,
                  position: 'right',
                }}
              />
            </LineChart>
          </ResponsiveContainer>

          {scenarioResults && (
            <div className="mt-3 text-xs text-gray-600 flex flex-wrap gap-4 justify-center">
              <span>
                Baseline peak: <strong>{formatNumber(scenarioResults.find((r) => r.scenario === 'baseline')?.peakDemandKw || 0, 1)} kW</strong>
              </span>
              {scenarioResults.find((r) => r.scenario === 'battery') && (
                <span>
                  Battery peak: <strong>{formatNumber(scenarioResults.find((r) => r.scenario === 'battery')!.peakDemandKw, 1)} kW</strong> • Reduction:{' '}
                  <strong>
                    {formatNumber(
                      (scenarioResults.find((r) => r.scenario === 'baseline')?.peakDemandKw || 0) -
                        scenarioResults.find((r) => r.scenario === 'battery')!.peakDemandKw,
                      1
                    )}{' '}
                    kW
                  </strong>
                </span>
              )}
              {scenarioResults.find((r) => r.scenario === 'battery_srate') && (
                <span>
                  Battery + Option S peak: <strong>{formatNumber(scenarioResults.find((r) => r.scenario === 'battery_srate')!.peakDemandKw, 1)} kW</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ===== SECTION E: PEAK EVENT ANALYSIS ===== */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <SectionHeader
            icon={<Zap className="w-5 h-5" />}
            title="Peak Event Analysis"
            subtitle="Analysis of demand peaks exceeding threshold"
          />
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <MetricCard
              label="Peak Events Detected"
              value={peakEventStats.totalEvents}
              status={peakEventStats.totalEvents > 0 ? 'neutral' : 'good'}
            />
            <MetricCard
              label="Longest Event"
              value={`${peakEventStats.longestEventDuration} min`}
              subtext="Duration"
            />
            <MetricCard
              label="Max Events/Day"
              value={peakEventStats.maxEventsPerDay}
              subtext="Single day peak"
            />
            <MetricCard
              label="95th %ile Energy"
              value={`${formatNumber(peakEventStats.percentile95EventEnergy, 1)} kWh`}
              subtext="Per event"
            />
            <MetricCard
              label="Avg Event Duration"
              value={`${formatNumber(peakEventStats.avgEventDuration, 0)} min`}
              subtext={`${formatNumber(peakEventStats.avgEventEnergy, 1)} kWh avg`}
            />
          </div>
          
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Event Frequency by Hour</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={peakEventFrequencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" stroke="#6b7280" style={{ fontSize: '9px' }} interval={2} />
                <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                <Tooltip />
                <Bar dataKey="events" fill={COLORS.accent} name="Peak Events" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Shows when peak events occur throughout the day - useful for battery dispatch optimization.
            </p>
          </div>
          
          {/* AI Insight for Peak Events */}
          <div className="mt-4">
            <AIInsightPanel
              insight={sectionInsights['peak-event-analysis'] || null}
              isLoading={insightsLoading['peak-event-analysis']}
              defaultExpanded={true}
            />
          </div>
        </div>

        {/* ===== SECTION F: TIME-OF-USE DISTRIBUTION ===== */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <SectionHeader
            icon={<PieChartIcon className="w-5 h-5" />}
            title="Time-of-Use Distribution"
            subtitle="Energy consumption by rate period"
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* TOU Pie Chart */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">Energy by Rate Period</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={touPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${formatNumber(percent, 0)}%`}
                    labelLine={false}
                  >
                    {touPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${formatNumber(value, 0)} kWh`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Monthly Demand Pattern */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">Monthly Peak Demand</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyDemand}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '9px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <Tooltip formatter={(value: number) => `${formatNumber(value, 1)} kW`} />
                  <Bar dataKey="peakKw" fill={COLORS.primary} name="Peak kW" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Weekday vs Weekend */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">Weekday vs Weekend</h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyPatternData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" stroke="#6b7280" style={{ fontSize: '9px' }} interval={3} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <Tooltip formatter={(value: number) => `${formatNumber(value, 1)} kW`} />
                  <Legend />
                  <Line type="monotone" dataKey="weekday" stroke={COLORS.primary} name="Weekday" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="weekend" stroke={COLORS.secondary} name="Weekend" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Weekday/Weekend Summary */}
          {weekdayWeekend && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm font-semibold text-blue-800 mb-2">Weekday</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-blue-600">Avg</div>
                    <div className="font-semibold">{formatNumber(weekdayWeekend.weekday.avgKw, 1)} kW</div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-600">Peak</div>
                    <div className="font-semibold">{formatNumber(weekdayWeekend.weekday.peakKw, 1)} kW</div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-600">Total</div>
                    <div className="font-semibold">{formatNumber(weekdayWeekend.weekday.totalKwh, 0)} kWh</div>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm font-semibold text-green-800 mb-2">Weekend</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-green-600">Avg</div>
                    <div className="font-semibold">{formatNumber(weekdayWeekend.weekend.avgKw, 1)} kW</div>
                  </div>
                  <div>
                    <div className="text-xs text-green-600">Peak</div>
                    <div className="font-semibold">{formatNumber(weekdayWeekend.weekend.peakKw, 1)} kW</div>
                  </div>
                  <div>
                    <div className="text-xs text-green-600">Total</div>
                    <div className="font-semibold">{formatNumber(weekdayWeekend.weekend.totalKwh, 0)} kWh</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* AI Insight for TOU Distribution */}
          <div className="mt-4">
            <AIInsightPanel
              insight={sectionInsights['tou-distribution'] || null}
              isLoading={insightsLoading['tou-distribution']}
              defaultExpanded={false}
              variant="green"
            />
          </div>
        </div>

        {/* ===== SECTION F1: FINANCIAL ANALYSIS ===== */}
        {scenarioResults && scenarioResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <SectionHeader
              icon={<DollarSign className="w-5 h-5" />}
              title="Financial Analysis"
              subtitle="Cost comparison and ROI metrics for all scenarios"
            />
            
            {/* Annual Cost Comparison Table */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Annual Cost Comparison</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Scenario</th>
                      <th className="px-4 py-2 text-right">Demand Charges</th>
                      <th className="px-4 py-2 text-right">Energy Charges</th>
                      <th className="px-4 py-2 text-right">Total Annual Cost</th>
                      <th className="px-4 py-2 text-right">Annual Savings</th>
                      <th className="px-4 py-2 text-right">Payback Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarioResults.map((result, idx) => {
                      const systemCost = analysisData?.calculationResult?.systemCost || 0;
                      const paybackYears = systemCost > 0 && result.annualSavings > 0 
                        ? systemCost / result.annualSavings 
                        : 0;
                      
                      return (
                        <tr key={result.scenario} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 font-semibold">
                            {result.scenario === 'baseline' ? 'Baseline' :
                             result.scenario === 'battery' ? 'With Battery' :
                             'With Battery + Option S'}
                          </td>
                          <td className="px-4 py-2 text-right">{formatCurrency(result.annualDemandCharge, 'USD', 0)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(result.annualEnergyCharge, 'USD', 0)}</td>
                          <td className="px-4 py-2 text-right font-bold">{formatCurrency(result.annualTotalCost, 'USD', 0)}</td>
                          <td className={`px-4 py-2 text-right ${result.annualSavings > 0 ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                            {result.annualSavings > 0 ? formatCurrency(result.annualSavings, 'USD', 0) : '-'}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {paybackYears > 0 && result.scenario !== 'baseline' ? (
                              <span className={paybackYears <= 5 ? 'text-green-600' : paybackYears <= 8 ? 'text-amber-600' : 'text-red-600'}>
                                {formatNumber(paybackYears, 1)} years
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Monthly Savings Chart */}
            {scenarioResults.length > 1 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Monthly Savings (Demand vs Energy)</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(() => {
                    const baseline = scenarioResults.find((r) => r.scenario === 'baseline');
                    const battery = scenarioResults.find((r) => r.scenario === 'battery');
                    const srate = scenarioResults.find((r) => r.scenario === 'battery_srate');
                    if (!baseline) return [];

                    return baseline.monthlyTotalCosts.map((_, idx) => {
                      const month = monthKeys[idx] || `Month ${idx + 1}`;
                      return {
                        month,
                        batteryDemandSavings: battery ? Math.max(0, (baseline.monthlyDemandCharges[idx] || 0) - (battery.monthlyDemandCharges[idx] || 0)) : 0,
                        batteryEnergySavings: battery ? Math.max(0, (baseline.monthlyEnergyCharges[idx] || 0) - (battery.monthlyEnergyCharges[idx] || 0)) : 0,
                        sRateDemandSavings: srate ? Math.max(0, (baseline.monthlyDemandCharges[idx] || 0) - (srate.monthlyDemandCharges[idx] || 0)) : 0,
                        sRateEnergySavings: srate ? Math.max(0, (baseline.monthlyEnergyCharges[idx] || 0) - (srate.monthlyEnergyCharges[idx] || 0)) : 0,
                      };
                    });
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '9px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value, 'USD', 0)} />
                    <Legend />
                    {scenarioResults.find((r) => r.scenario === 'battery') && (
                      <>
                        <Bar dataKey="batteryDemandSavings" stackId="battery" fill={COLORS.primary} name="Battery Demand Savings" />
                        <Bar dataKey="batteryEnergySavings" stackId="battery" fill="#93c5fd" name="Battery Energy Savings" />
                      </>
                    )}
                    {scenarioResults.find((r) => r.scenario === 'battery_srate') && (
                      <>
                        <Bar dataKey="sRateDemandSavings" stackId="srate" fill={COLORS.secondary} name="Battery + Option S Demand Savings" />
                        <Bar dataKey="sRateEnergySavings" stackId="srate" fill="#86efac" name="Battery + Option S Energy Savings" />
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Monthly Spike Mitigation + Billing Peak Reduction Table */}
            {monthlySpikeMitigation && monthlySpikeMitigation.monthly.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Monthly Peak Spikes & Demand Charge Reduction</h4>
                <p className="text-xs text-gray-500 mb-3">
                  Demand charges are billed off the single highest kW in each billing month. “Spike events” are consecutive intervals above the threshold.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Month</th>
                        <th className="px-3 py-2 text-right">Spikes</th>
                        <th className="px-3 py-2 text-right">Mitigated</th>
                        <th className="px-3 py-2 text-right">Avg Mitigation</th>
                        <th className="px-3 py-2 text-right">Max Mitigation</th>
                        <th className="px-3 py-2 text-right">Peak Before</th>
                        <th className="px-3 py-2 text-right">Peak After</th>
                        <th className="px-3 py-2 text-right">ΔkW</th>
                        <th className="px-3 py-2 text-right">Δ$ (Demand)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlySpikeMitigation.monthly.map((r, idx) => (
                        <tr key={r.month} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 font-semibold">{r.month}</td>
                          <td className="px-3 py-2 text-right">{r.spikeEvents}</td>
                          <td className="px-3 py-2 text-right">{r.mitigatedEvents}</td>
                          <td className="px-3 py-2 text-right">{formatNumber(r.avgEventMitigationKw, 1)} kW</td>
                          <td className="px-3 py-2 text-right">{formatNumber(r.maxEventMitigationKw, 1)} kW</td>
                          <td className="px-3 py-2 text-right">{formatNumber(r.billingPeakBeforeKw, 1)} kW</td>
                          <td className="px-3 py-2 text-right">{formatNumber(r.billingPeakAfterKw, 1)} kW</td>
                          <td className="px-3 py-2 text-right font-semibold text-green-700">{formatNumber(r.billingPeakReductionKw, 1)} kW</td>
                          <td className="px-3 py-2 text-right font-semibold text-green-700">{formatCurrency(r.demandSavings, 'USD', 0)}</td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50 border-t">
                        <td className="px-3 py-2 font-bold">Rollup</td>
                        <td className="px-3 py-2 text-right font-bold">{monthlySpikeMitigation.totals.spikeEvents}</td>
                        <td className="px-3 py-2 text-right font-bold">{monthlySpikeMitigation.totals.mitigatedEvents}</td>
                        <td className="px-3 py-2 text-right text-xs text-gray-600" colSpan={2}>
                          {monthlySpikeMitigation.monthCount === 12
                            ? '12 months of data'
                            : `${monthlySpikeMitigation.monthCount} months (annualized ×${formatNumber(monthlySpikeMitigation.annualizeFactor, 2)})`}
                        </td>
                        <td className="px-3 py-2 text-right" colSpan={2}></td>
                        <td className="px-3 py-2 text-right font-bold text-green-800">
                          {formatNumber(monthlySpikeMitigation.totals.annualizedBillingPeakReductionKwMonthSum / 12, 1)} kW
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-green-800">
                          {formatCurrency(monthlySpikeMitigation.totals.annualizedDemandSavings, 'USD', 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  “ΔkW” is the billing-month peak reduction. Rollup “ΔkW” is the average monthly reduction (annualized). “Δ$” uses your demand rate ({formatCurrency(monthlySpikeMitigation.demandRate, 'USD', 2)}/kW-month).
                </p>
              </div>
            )}
            
            {/* ROI Metrics */}
            {analysisData?.calculationResult && scenarioResults.find((r) => r.scenario === 'battery') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">ROI Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <div className="text-blue-600 text-xs mb-1">Simple Payback</div>
                    <div className="font-bold text-gray-900">
                      {(() => {
                        const batteryResult = scenarioResults.find((r) => r.scenario === 'battery');
                        const systemCost = analysisData.calculationResult.systemCost || 0;
                        const annualSavings = batteryResult?.annualSavings || 0;
                        return annualSavings > 0 ? formatNumber(systemCost / annualSavings, 1) + ' years' : 'N/A';
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-600 text-xs mb-1">10-Year NPV (6%)</div>
                    <div className="font-bold text-gray-900">
                      {(() => {
                        const batteryResult = scenarioResults.find((r) => r.scenario === 'battery');
                        const systemCost = analysisData.calculationResult.systemCost || 0;
                        const annualSavings = batteryResult?.annualSavings || 0;
                        if (annualSavings <= 0) return 'N/A';
                        const discountRate = 0.06;
                        let npv = -systemCost;
                        for (let year = 1; year <= 10; year++) {
                          npv += annualSavings / Math.pow(1 + discountRate, year);
                        }
                        return formatCurrency(npv, 'USD', 0);
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-600 text-xs mb-1">20-Year NPV (6%)</div>
                    <div className="font-bold text-gray-900">
                      {(() => {
                        const batteryResult = scenarioResults.find((r) => r.scenario === 'battery');
                        const systemCost = analysisData.calculationResult.systemCost || 0;
                        const annualSavings = batteryResult?.annualSavings || 0;
                        if (annualSavings <= 0) return 'N/A';
                        const discountRate = 0.06;
                        let npv = -systemCost;
                        for (let year = 1; year <= 20; year++) {
                          npv += annualSavings / Math.pow(1 + discountRate, year);
                        }
                        return formatCurrency(npv, 'USD', 0);
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-600 text-xs mb-1">IRR (20y)</div>
                    <div className="font-bold text-gray-900">
                      {(() => {
                        const batteryResult = scenarioResults.find((r) => r.scenario === 'battery');
                        const systemCost = analysisData.calculationResult.systemCost || 0;
                        const annualSavings = batteryResult?.annualSavings || 0;
                        if (annualSavings <= 0 || systemCost <= 0) return 'N/A';
                        const cashFlows = [-systemCost, ...Array.from({ length: 20 }, () => annualSavings)];
                        const irr = calculateIRR(cashFlows);
                        return irr === null ? 'N/A' : `${formatNumber(irr * 100, 1)}%`;
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-600 text-xs mb-1">20-Year Total Savings</div>
                    <div className="font-bold text-gray-900">
                      {(() => {
                        const batteryResult = scenarioResults.find((r) => r.scenario === 'battery');
                        const annualSavings = batteryResult?.annualSavings || 0;
                        return formatCurrency(annualSavings * 20, 'USD', 0);
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== SECTION G1: BATTERY PERFORMANCE METRICS ===== */}
        {analysisData?.calculationResult?.batteryInfo && intervalStats && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <SectionHeader
              icon={<Activity className="w-5 h-5" />}
              title="Battery Performance Metrics"
              subtitle="Detailed battery utilization and performance analysis"
            />
            
            {(() => {
              const threshold = analysisData.calculationResult?.threshold || intervalStats.peakDemand.kw * 0.9;
              const loadProfile = { intervals: analysisData.intervalData };
              const batterySpec: BatterySpec = {
                capacity_kwh: analysisData.calculationResult.batteryInfo.capacityKwh,
                max_power_kw: analysisData.calculationResult.batteryInfo.powerKw,
                round_trip_efficiency: analysisData.calculationResult.batteryInfo.roundTripEfficiency,
                degradation_rate: 0.02,
              };
              const batteryResult = simulatePeakShaving(loadProfile, batterySpec, threshold);
              
              // Calculate performance metrics
              const totalEnergyDischarged = batteryResult.energy_discharged || 0;
              const totalEnergyCharged = batteryResult.energy_charged || 0;
              const usableCapacity = batterySpec.capacity_kwh * 0.90; // 90% DoD
              const maxPossibleEnergy = usableCapacity * analysisData.intervalData.length * 0.25; // 15-min intervals
              const utilizationRate = maxPossibleEnergy > 0 ? (totalEnergyDischarged / maxPossibleEnergy) * 100 : 0;
              
              // Calculate capture rate (energy discharged vs potential shaving)
              const potentialShaving = analysisData.intervalData
                .filter(i => i.kw > threshold)
                .reduce((sum, i) => sum + (i.kw - threshold) * 0.25, 0);
              const captureRate = potentialShaving > 0 ? (totalEnergyDischarged / potentialShaving) * 100 : 0;
              
              // Calculate discharge events
              const socHistory = batteryResult.battery_soc_history || [];
              let dischargeEvents = 0;
              let inDischarge = false;
              for (let i = 1; i < socHistory.length; i++) {
                if (socHistory[i] < socHistory[i - 1] && !inDischarge) {
                  dischargeEvents++;
                  inDischarge = true;
                } else if (socHistory[i] >= socHistory[i - 1]) {
                  inDischarge = false;
                }
              }
              
              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <MetricCard
                      label="Utilization Rate"
                      value={`${formatNumber(utilizationRate, 1)}%`}
                      subtext="% of capacity used"
                      status={utilizationRate >= 50 ? 'good' : utilizationRate >= 25 ? 'warning' : 'neutral'}
                    />
                    <MetricCard
                      label="Capture Rate"
                      value={`${formatNumber(captureRate, 1)}%`}
                      subtext="% of peaks captured"
                      status={captureRate >= 80 ? 'good' : captureRate >= 50 ? 'warning' : 'neutral'}
                    />
                    <MetricCard
                      label="Energy Throughput"
                      value={`${formatNumber(totalEnergyDischarged, 0)} kWh`}
                      subtext="Total discharged"
                    />
                    <MetricCard
                      label="Discharge Events"
                      value={dischargeEvents}
                      subtext="Peak shaving cycles"
                    />
                    <MetricCard
                      label="Avg SOC"
                      value={
                        socHistory.length > 0
                          ? `${formatNumber((socHistory.reduce((a, b) => a + b, 0) / socHistory.length) * 100, 1)}%`
                          : 'N/A'
                      }
                      subtext="State of charge"
                    />
                  </div>
                  
                  {/* SOC History Chart */}
                  {socHistory.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Battery State of Charge History</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={(() => {
                          const sampleRate = Math.max(1, Math.floor(socHistory.length / 200));
                          return socHistory
                            .filter((_, idx) => idx % sampleRate === 0)
                            .map((soc, idx) => ({
                              index: idx,
                              soc: soc * 100,
                            }));
                        })()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis stroke="#6b7280" style={{ fontSize: '9px' }} />
                          <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} domain={[0, 100]} />
                          <Tooltip formatter={(value: number) => [`${formatNumber(value, 1)}%`, 'SOC']} />
                          <Area
                            type="monotone"
                            dataKey="soc"
                            stroke={COLORS.teal}
                            fill={COLORS.teal}
                            fillOpacity={0.3}
                            name="State of Charge (%)"
                          />
                          <ReferenceLine y={10} stroke={COLORS.danger} strokeDasharray="5 5" label="Min SOC" />
                          <ReferenceLine y={90} stroke={COLORS.secondary} strokeDasharray="5 5" label="Max SOC" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* ===== SECTION H: ADDITIONAL VISUALIZATIONS ===== */}
        {scenarioResults && scenarioResults.length > 1 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <SectionHeader
              icon={<BarChart3 className="w-5 h-5" />}
              title="Additional Analysis"
              subtitle="Hourly patterns, monthly peaks, and seasonal comparisons"
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hourly Average Demand Pattern */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Hourly Average Demand Pattern</h4>
                <ResponsiveContainer width="100%" height={250}>
                  {(() => {
                    const hourlyData: { hour: string; baseline: number; withBattery: number }[] = [];
                    for (let h = 0; h < 24; h++) {
                      hourlyData[h] = {
                        hour: `${h.toString().padStart(2, '0')}:00`,
                        baseline: 0,
                        withBattery: 0,
                      };
                    }
                    
                    const counts = { baseline: new Array(24).fill(0), withBattery: new Array(24).fill(0) };
                    
                    // Baseline
                    for (const interval of analysisData?.intervalData || []) {
                      const ts = interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp);
                      const hour = ts.getHours();
                      hourlyData[hour].baseline += interval.kw;
                      counts.baseline[hour]++;
                    }
                    
                    // With Battery
                    if (analysisData?.calculationResult?.batteryInfo) {
                      const threshold = analysisData.calculationResult.threshold || (intervalStats?.peakDemand.kw || 0) * 0.9;
                      const loadProfile = { intervals: analysisData.intervalData };
                      const batterySpec: BatterySpec = {
                        capacity_kwh: analysisData.calculationResult.batteryInfo.capacityKwh,
                        max_power_kw: analysisData.calculationResult.batteryInfo.powerKw,
                        round_trip_efficiency: analysisData.calculationResult.batteryInfo.roundTripEfficiency,
                        degradation_rate: 0.02,
                      };
                      const batteryResult = simulatePeakShaving(loadProfile, batterySpec, threshold);
                      
                      for (const interval of batteryResult.final_load_profile.intervals) {
                        const ts = interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp);
                        const hour = ts.getHours();
                        hourlyData[hour].withBattery += interval.kw;
                        counts.withBattery[hour]++;
                      }
                    }
                    
                    // Calculate averages
                    for (let h = 0; h < 24; h++) {
                      if (counts.baseline[h] > 0) hourlyData[h].baseline /= counts.baseline[h];
                      if (counts.withBattery[h] > 0) hourlyData[h].withBattery /= counts.withBattery[h];
                    }
                    
                    return (
                      <LineChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="hour" stroke="#6b7280" style={{ fontSize: '9px' }} interval={3} />
                        <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                        <Tooltip formatter={(value: number) => `${formatNumber(value, 1)} kW`} />
                        <Legend />
                        <Line type="monotone" dataKey="baseline" stroke={COLORS.gray} name="Baseline" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="withBattery" stroke={COLORS.primary} name="With Battery" strokeWidth={2} dot={false} />
                      </LineChart>
                    );
                  })()}
                </ResponsiveContainer>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Average demand by hour of day - shows when battery is most effective
                </p>
              </div>
              
              {/* Monthly Peak Demand Comparison */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Monthly Peak Demand Comparison</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={(() => {
                    const baseline = scenarioResults.find((r) => r.scenario === 'baseline');
                    const battery = scenarioResults.find((r) => r.scenario === 'battery');
                    const sRate = scenarioResults.find((r) => r.scenario === 'battery_srate');
                    
                    if (!baseline) return [];
                    
                    return baseline.monthlyPeaks.map((peak, idx) => {
                      const data: any = {
                        month: monthKeys[idx] || `Month ${idx + 1}`,
                        baseline: peak,
                      };
                      if (battery) data.battery = battery.monthlyPeaks[idx] || 0;
                      if (sRate) data.batterySRate = sRate.monthlyPeaks[idx] || 0;
                      return data;
                    });
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '9px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                    <Tooltip formatter={(value: number) => `${formatNumber(value, 1)} kW`} />
                    <Legend />
                    <Bar dataKey="baseline" fill={COLORS.gray} name="Baseline" radius={[2, 2, 0, 0]} />
                    {scenarioResults.find((r) => r.scenario === 'battery') && (
                      <Bar dataKey="battery" fill={COLORS.primary} name="With Battery" radius={[2, 2, 0, 0]} />
                    )}
                    {scenarioResults.find((r) => r.scenario === 'battery_srate') && (
                      <Bar dataKey="batterySRate" fill={COLORS.secondary} name="With Battery + Option S" radius={[2, 2, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Monthly peak demand for all scenarios - highlights months with highest savings
                </p>
              </div>
            </div>
            
            {/* Seasonal Analysis */}
            {(() => {
              const baseline = scenarioResults.find((r) => r.scenario === 'baseline');
              const battery = scenarioResults.find((r) => r.scenario === 'battery');
              
              if (!baseline) return null;

              const isSummer = (monthNum: number) => monthNum >= 6 && monthNum <= 9; // Jun-Sep
              const isWinter = (monthNum: number) => monthNum === 11 || monthNum === 12 || monthNum === 1 || monthNum === 2; // Nov-Feb

              let summerBaseline = 0;
              let winterBaseline = 0;
              let summerBattery = 0;
              let winterBattery = 0;

              for (let i = 0; i < baseline.monthlyTotalCosts.length; i++) {
                const key = monthKeys[i];
                const monthNum = key ? Number(key.split('-')[1]) : (i % 12) + 1;
                if (isSummer(monthNum)) {
                  summerBaseline += baseline.monthlyTotalCosts[i] || 0;
                  summerBattery += battery?.monthlyTotalCosts[i] || 0;
                } else if (isWinter(monthNum)) {
                  winterBaseline += baseline.monthlyTotalCosts[i] || 0;
                  winterBattery += battery?.monthlyTotalCosts[i] || 0;
                }
              }
              
              return (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Seasonal Savings Breakdown</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="text-sm font-semibold text-orange-800 mb-2">Summer (Jun-Sep)</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-xs text-orange-600">Baseline Cost</div>
                          <div className="font-semibold">{formatCurrency(summerBaseline, 'USD', 0)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-orange-600">With Battery</div>
                          <div className="font-semibold">{formatCurrency(summerBattery, 'USD', 0)}</div>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-orange-200">
                          <div className="text-xs text-orange-600">Summer Savings</div>
                          <div className="font-bold text-green-600">{formatCurrency(summerBaseline - summerBattery, 'USD', 0)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-sm font-semibold text-blue-800 mb-2">Winter (Nov-Feb)</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-xs text-blue-600">Baseline Cost</div>
                          <div className="font-semibold">{formatCurrency(winterBaseline, 'USD', 0)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-blue-600">With Battery</div>
                          <div className="font-semibold">{formatCurrency(winterBattery, 'USD', 0)}</div>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-blue-200">
                          <div className="text-xs text-blue-600">Winter Savings</div>
                          <div className="font-bold text-green-600">{formatCurrency(winterBaseline - winterBattery, 'USD', 0)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Peak Event Duration Distribution (Histogram) */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Peak Event Duration Distribution</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={(() => {
                    const buckets = [
                      { label: '0-15m', min: 0, max: 15, count: 0 },
                      { label: '15-30m', min: 15, max: 30, count: 0 },
                      { label: '30-60m', min: 30, max: 60, count: 0 },
                      { label: '60-120m', min: 60, max: 120, count: 0 },
                      { label: '120m+', min: 120, max: Infinity, count: 0 },
                    ];
                    for (const e of peakEvents) {
                      const d = e.durationMinutes;
                      const b = buckets.find((x) => d >= x.min && d < x.max) || buckets[buckets.length - 1];
                      b.count += 1;
                    }
                    return buckets.map(({ label, count }) => ({ duration: label, count }));
                  })()}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="duration" stroke="#6b7280" style={{ fontSize: '9px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS.accent} name="Events" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Helps validate whether battery sizing matches typical peak-event durations.
              </p>
            </div>
          </div>
        )}

        {/* ===== SECTION I: WEATHER CORRELATION ANALYSIS ===== */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <SectionHeader
            icon={<CloudSun className="w-5 h-5" />}
            title="Weather Correlation Analysis"
            subtitle="Electricity usage relationship with outdoor temperature"
          />
          
          {weatherLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-600">Loading weather data...</span>
            </div>
          ) : weatherCorrelation ? (
            <>
              {/* Weather metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className={`rounded-xl border-2 p-4 ${
                  weatherCorrelation.rSquared >= 0.7 ? 'bg-green-50 border-green-200' :
                  weatherCorrelation.rSquared >= 0.4 ? 'bg-amber-50 border-amber-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Thermometer className="w-4 h-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-600">R-Squared</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {formatNumber(weatherCorrelation.rSquared * 100, 1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Weather explains {formatNumber(weatherCorrelation.rSquared * 100, 0)}% of usage variance
                  </div>
                </div>
                
                <MetricCard
                  label="Weather Sensitivity"
                  value={weatherCorrelation.weatherSensitivity.charAt(0).toUpperCase() + weatherCorrelation.weatherSensitivity.slice(1)}
                  subtext={weatherCorrelation.weatherSensitivity === 'high' ? 'Strongly weather-driven' : 
                           weatherCorrelation.weatherSensitivity === 'medium' ? 'Moderately weather-driven' : 
                           'Process/baseload driven'}
                  status={weatherCorrelation.weatherSensitivity === 'high' ? 'good' : 
                          weatherCorrelation.weatherSensitivity === 'medium' ? 'warning' : 'neutral'}
                />
                
                <MetricCard
                  label="Baseload Estimate"
                  value={`${formatNumber(weatherCorrelation.baseload, 0)} kW`}
                  subtext="Temperature-independent demand"
                />
                
                <MetricCard
                  label="Cooling Sensitivity"
                  value={`${formatNumber(weatherCorrelation.coolingSlope, 2)} kW/°F`}
                  subtext={weatherCorrelation.coolingSlope > weatherCorrelation.heatingSlope ? 
                           'Cooling-dominated building' : 'Heating-dominated building'}
                />
              </div>
              
              {/* Scatter Plot */}
              {weatherScatterData.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Temperature vs. Energy Consumption</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={weatherScatterData.sort((a, b) => a.temperature - b.temperature)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="temperature" 
                        stroke="#6b7280" 
                        style={{ fontSize: '10px' }}
                        label={{ value: 'Temperature (°F)', position: 'bottom', fontSize: 11, offset: -5 }}
                      />
                      <YAxis 
                        stroke="#6b7280" 
                        style={{ fontSize: '10px' }}
                        label={{ value: 'Avg Demand (kW)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          name === 'avgKw' ? `${formatNumber(value, 1)} kW` : `${formatNumber(value, 1)}°F`,
                          name === 'avgKw' ? 'Avg Demand' : 'Temperature'
                        ]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="avgKw" 
                        stroke={COLORS.teal} 
                        fill={COLORS.teal}
                        fillOpacity={0.3}
                        name="Avg Demand"
                      />
                      <ReferenceLine 
                        x={65} 
                        stroke={COLORS.gray} 
                        strokeDasharray="5 5"
                        label={{ value: '65°F Base', fontSize: 10, fill: COLORS.gray }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Shows how energy consumption varies with outdoor temperature. 65°F is the standard base temperature for degree day calculations.
                  </p>
                </div>
              )}
              
              {/* ASHRAE Guideline 14 Compliance */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  ASHRAE Guideline 14 Compliance
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600">R² (Coefficient of Determination):</span>
                    <span className={`ml-2 font-semibold ${weatherCorrelation.rSquared >= 0.7 ? 'text-green-600' : 'text-amber-600'}`}>
                      {formatNumber(weatherCorrelation.rSquared, 3)}
                      {weatherCorrelation.rSquared >= 0.7 ? ' ✓' : ' (< 0.7 recommended)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-600">Model Status:</span>
                    <span className="ml-2 font-semibold">
                      {weatherCorrelation.rSquared >= 0.7 ? 
                        <span className="text-green-600">Valid for M&V baseline</span> : 
                        <span className="text-amber-600">May need additional variables</span>
                      }
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Weather Insight Panel */}
              {weatherInsight && (
                <WeatherInsightPanel
                  summary={weatherInsight.summary}
                  technicalFindings={weatherInsight.technicalFindings}
                  efficiencyOpportunities={weatherInsight.efficiencyOpportunities}
                  impactOnBattery={weatherInsight.impactOnBattery}
                />
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CloudSun className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Weather data not available. Enter a valid site address to enable weather correlation analysis.</p>
            </div>
          )}
        </div>

        {/* ===== SECTION G: BATTERY RECOMMENDATIONS ===== */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <SectionHeader
            icon={<Battery className="w-5 h-5" />}
            title="Battery Recommendations"
            subtitle="Top recommended batteries based on your load profile"
          />
          
          {analysisData.aiRecommendations && analysisData.aiRecommendations.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {analysisData.aiRecommendations.slice(0, 3).map((rec, idx) => (
                  (() => {
                    const displaySavings = rec.best?.annualSavings ?? rec.annualSavings;
                    const displayPayback = rec.best?.paybackYears ?? rec.paybackYears;
                    const bestMode = rec.best?.mode ?? 'STANDARD';
                    return (
                  <div
                    key={`${rec.manufacturer}-${rec.modelName}`}
                    className={`rounded-xl border-2 p-4 ${
                      idx === 0 ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {idx === 0 && <Award className="w-5 h-5 text-green-600" />}
                      <span className={`text-xs font-semibold ${idx === 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        #{idx + 1} {idx === 0 ? 'Best Match' : 'Alternative'}
                      </span>
                      {bestMode === 'S_RATE' && (
                        <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                          Best via Option S
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-gray-900">{rec.modelName}</h4>
                    <p className="text-sm text-gray-500 mb-3">{rec.manufacturer}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-xs text-gray-500">Capacity</span>
                        <div className="font-semibold">{rec.capacityKwh} kWh</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Power</span>
                        <div className="font-semibold">{rec.maxPowerKw} kW</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Peak Reduction</span>
                        <div className="font-semibold text-green-600">{formatNumber(rec.peakReductionKw, 1)} kW</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Annual Savings</span>
                        <div className="font-semibold text-green-600">{formatCurrency(displaySavings, 'USD', 0)}</div>
                      </div>
                    </div>
                    {idx === 0 && rec.capDiscovery?.guaranteedCapKw != null && (
                      <div className="mt-3 text-xs text-gray-600">
                        Guaranteed monthly cap (worst month): <span className="font-semibold">{formatNumber(rec.capDiscovery.guaranteedCapKw, 1)} kW</span>
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between text-sm">
                      <span className="text-gray-500">System Cost</span>
                      <span className="font-bold">{formatCurrency(rec.systemCost, 'USD', 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Payback</span>
                      <span className={`font-bold ${displayPayback <= 5 ? 'text-green-600' : displayPayback <= 8 ? 'text-amber-600' : 'text-red-600'}`}>
                        {formatNumber(displayPayback, 1)} years
                      </span>
                    </div>
                  </div>
                    );
                  })()
                ))}
              </div>
              
              {/* Comparison Table */}
              {analysisData.aiRecommendations.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Battery</th>
                        <th className="px-4 py-2 text-right">Capacity</th>
                        <th className="px-4 py-2 text-right">Power</th>
                        <th className="px-4 py-2 text-right">Peak Reduction</th>
                        <th className="px-4 py-2 text-right">Annual Savings</th>
                        <th className="px-4 py-2 text-right">System Cost</th>
                        <th className="px-4 py-2 text-right">Payback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisData.aiRecommendations.map((rec, idx) => (
                        (() => {
                          const displaySavings = rec.best?.annualSavings ?? rec.annualSavings;
                          const displayPayback = rec.best?.paybackYears ?? rec.paybackYears;
                          const bestMode = rec.best?.mode ?? 'STANDARD';
                          return (
                        <tr key={`${rec.manufacturer}-${rec.modelName}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2">
                            <div className="font-semibold">{rec.modelName}</div>
                            <div className="text-xs text-gray-500">{rec.manufacturer}</div>
                            {bestMode === 'S_RATE' && (
                              <div className="text-[11px] text-purple-700 mt-0.5">Best via Option S</div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">{rec.capacityKwh} kWh</td>
                          <td className="px-4 py-2 text-right">{rec.maxPowerKw} kW</td>
                          <td className="px-4 py-2 text-right text-green-600">{formatNumber(rec.peakReductionKw, 1)} kW</td>
                          <td className="px-4 py-2 text-right text-green-600">{formatCurrency(displaySavings, 'USD', 0)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(rec.systemCost, 'USD', 0)}</td>
                          <td className={`px-4 py-2 text-right font-semibold ${displayPayback <= 5 ? 'text-green-600' : displayPayback <= 8 ? 'text-amber-600' : 'text-red-600'}`}>
                            {formatNumber(displayPayback, 1)} yrs
                          </td>
                        </tr>
                          );
                        })()
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Cap enforcement + event severity diagnostics for the top recommendation */}
              {topRecCapSeries.length > 0 && (
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-800">Monthly Billing Peak vs Cap (Top Recommendation)</h4>
                      <span className="text-xs text-gray-500">Each month’s max sets demand charges</span>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={topRecCapSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '9px' }} />
                        <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                        <Tooltip formatter={(value: number) => `${formatNumber(value, 1)} kW`} />
                        <Legend />
                        <Line type="monotone" dataKey="peakBeforeKw" stroke="#ef4444" name="Peak Before" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="peakAfterKw" stroke="#06b6d4" name="Peak After (Sim)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="capKw" stroke="#111827" name="Discovered Cap" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {topRecCapEventBucketData.data.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-800">Peak Events Above Cap (by Severity)</h4>
                        <span className="text-xs text-gray-500">Events are consecutive intervals where kW &gt; cap</span>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={topRecCapEventBucketData.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '9px' }} />
                          <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                          <Tooltip />
                          <Legend />
                          {topRecCapEventBucketData.bucketKeys.map((k, idx2) => (
                            <Bar
                              key={k}
                              dataKey={k}
                              stackId="events"
                              name={k.replace(/^b_/, '').replace(/_/g, ' ')}
                              fill={['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#0f172a'][idx2 % 7]}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : analysisData.calculationResult ? (
            // Show selected battery if no AI recommendations
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">Selected Battery</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-xs text-green-600">Model</span>
                  <div className="font-bold text-gray-900">{analysisData.calculationResult.batteryInfo?.modelName || 'N/A'}</div>
                  <div className="text-sm text-gray-500">{analysisData.calculationResult.batteryInfo?.manufacturer || ''}</div>
                </div>
                <div>
                  <span className="text-xs text-green-600">Capacity</span>
                  <div className="font-bold text-gray-900">{analysisData.calculationResult.batteryInfo?.capacityKwh || 0} kWh</div>
                </div>
                <div>
                  <span className="text-xs text-green-600">Annual Savings</span>
                  <div className="font-bold text-green-700">{formatCurrency(analysisData.calculationResult.annualSavings || 0, 'USD', 0)}</div>
                </div>
                <div>
                  <span className="text-xs text-green-600">Payback Period</span>
                  <div className="font-bold text-gray-900">{formatNumber(analysisData.calculationResult.paybackYears || 0, 1)} years</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Battery className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No battery recommendations available. Run an analysis to get recommendations.</p>
            </div>
          )}
          
          {/* AI Insight for Battery Recommendations */}
          {(analysisData.aiRecommendations?.length || analysisData.calculationResult) && (
            <div className="mt-4">
              <AIInsightPanel
                insight={sectionInsights['battery-recommendations'] || null}
                isLoading={insightsLoading['battery-recommendations']}
                defaultExpanded={true}
                variant="green"
              />
            </div>
          )}
        </div>

        {/* ===== FOOTER ===== */}
        <div className="bg-gray-800 rounded-xl p-4 text-white flex justify-between items-center text-sm">
          <div>
            <span className="font-semibold">Analysis Report</span>
            <span className="text-gray-400 ml-4">
              {formatNumber(intervalStats?.totalPoints || 0, 0)} intervals • 
              {intervalStats?.daysCount || 0} days • 
              Generated {new Date().toLocaleDateString()}
            </span>
          </div>
          <button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisReportPage;
