import type { EvidenceItemV1 } from '../../determinants/types';
import type { MissingInfoItemV0 } from '../missingInfo/types';

export type BehaviorTrendDirectionV1 = 'up' | 'down' | 'flat';

export type InsightCardV1 = {
  id: string;
  finding: string;
  whyItMatters: string;
  confidence: { level: 'high' | 'medium' | 'low'; because: string[] };
  customerQuestions: string[];
  likelyCauses: Array<{ cause: string; weight: number }>;
  recommendedNextSteps: string[];
};

export type BehaviorInsightsV1 = {
  dataWindow: {
    monthsAvailable: number;
    overlapMonthsReconcilable: number;
    firstMonth?: string;
    lastMonth?: string;
  };
  usageTrend: {
    last12Kwh?: number;
    prior12Kwh?: number;
    pctChange?: number;
    slopeKwhPerMonth?: number;
    direction?: BehaviorTrendDirectionV1;
    yoyByMonth?: Array<{ month: string; pctChange: number }>;
  };
  demandTrend: {
    last12Kw?: number;
    prior12Kw?: number;
    pctChange?: number;
    slopeKwPerMonth?: number;
  };
  seasonality: {
    topMonthsByKwh: Array<{ month: string; kwh: number }>;
    topMonthsByKw: Array<{ month: string; kw: number }>;
    seasonalAmplitude?: { kwhPct?: number; kwPct?: number };
  };
  peaks: {
    topSpikes: Array<{ timestampIso: string; kW: number; touBucket?: string; temperatureF?: number; meterKey?: string }>;
    peakHourHistogram?: Record<string, number>;
    peakWeekdayHistogram?: Record<string, number>;
  };
  loadShape: {
    baseLoadKw?: number;
    baseLoadTrend?: number;
    loadFactorTrend?: number;
  };
  anomalies: {
    stepChangeDetected?: { whenMonth: string; deltaKwh?: number; deltaBaseKw?: number; confidence: number };
    weekendShareChange?: { last12WeekendPct: number; prior12WeekendPct: number };
  };
  insightCards: InsightCardV1[];
  confidence: number;
  because: string[];
  evidence: EvidenceItemV1[];
  missingInfo: MissingInfoItemV0[];
};
