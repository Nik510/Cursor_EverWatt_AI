import type { EvidenceItemV1 } from '../../determinants/types';
import type { MissingInfoItemV0 } from '../missingInfo/types';

export type BehaviorInsightConfidenceLevelV2 = 'high' | 'medium' | 'low';

export type InsightCardV2 = {
  id: string;
  finding: string;
  askCustomer: string;
  confidence: { level: BehaviorInsightConfidenceLevelV2; because: string[] };
  evidence: EvidenceItemV1[];
};

export type BehaviorInsightsV2 = {
  dataWindow: {
    startIso: string | null;
    endExclusiveIso: string | null;
    cycleCount: number;
    notes: string[];
  };
  usageTrend?: {
    last12Kwh: number | null;
    prior12Kwh: number | null;
    deltaPct: number | null;
    slopePerMonth: number | null;
    confidence: number; // 0..1
  };
  demandTrend?: {
    last12KwMax: number | null;
    prior12KwMax: number | null;
    deltaPct: number | null;
    slopePerMonth: number | null;
    confidence: number; // 0..1
  };
  stepChanges?: Array<{ whenMonth: string; deltaKwh: number; deltaPct: number; confidence: number }>;
  peakTiming?: {
    topPeaks: Array<{ timestampIso: string; kW: number; meterKey?: string | null }>;
  };
  seasonality?: {
    kwhByMonthOfYear: Array<{ month: number; avgKwh: number }>;
    kwMaxByMonthOfYear: Array<{ month: number; avgKwMax: number }>;
  };
  baseLoadDrift?: {
    baseLoadKwLatest?: number | null;
    avgKwSlopePerMonth?: number | null;
  };
  weekendShare?: {
    last12WeekendPct: number | null;
    prior12WeekendPct: number | null;
    deltaPctPts: number | null;
  };
  conversationCards: InsightCardV2[];
  because: string[];
  evidence: EvidenceItemV1[];
  missingInfo: MissingInfoItemV0[];
  confidence: number; // 0..1
};

