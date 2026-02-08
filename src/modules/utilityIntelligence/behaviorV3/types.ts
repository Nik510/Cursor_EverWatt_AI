import type { EvidenceItemV1 } from '../../determinants/types';
import type { MissingInfoItemV0 } from '../missingInfo/types';

export type BehaviorInsightConfidenceLevelV3 = 'high' | 'medium' | 'low';
export type BehaviorCommodityV3 = 'electric' | 'gas';

export type InsightCardV3 = {
  id: string;
  commodity: BehaviorCommodityV3;
  finding: string;
  askCustomer: string;
  confidence: { level: BehaviorInsightConfidenceLevelV3; because: string[] };
  evidence: EvidenceItemV1[];
};

export type ElectricBehaviorInsightsV3 = {
  commodity: 'electric';
  dataWindow: { startIso: string | null; endExclusiveIso: string | null; monthCount: number; notes: string[] };
  usage: {
    unit: 'kWh';
    last12: number | null;
    last24: number | null;
    last36: number | null;
    prior12: number | null;
    yoyDeltaPct: number | null;
    slopePerMonth: number | null;
    peakMonth?: { month: string; kWh: number } | null;
  };
  demand?: {
    unit: 'kW';
    last12AvgMonthlyMax: number | null;
    prior12AvgMonthlyMax: number | null;
    yoyDeltaPct: number | null;
    slopePerMonth: number | null;
    peakMonth?: { month: string; kWMax: number } | null;
  };
  stepChanges?: Array<{ whenMonth: string; deltaKwh: number; deltaPct: number; confidence: number }>;
  seasonality?: { winterAvgKwh: number | null; summerAvgKwh: number | null; skewPct: number | null };
  peakTiming?: { topPeaks: Array<{ timestampIso: string; kW: number; meterKey?: string | null }> };
  conversationCards: InsightCardV3[];
  because: string[];
  evidence: EvidenceItemV1[];
  missingInfo: MissingInfoItemV0[];
  confidence: number; // 0..1
};

export type GasBehaviorInsightsV3 = {
  commodity: 'gas';
  dataWindow: { startIso: string | null; endExclusiveIso: string | null; monthCount: number; notes: string[] };
  usage: {
    unit: 'therms';
    last12: number | null;
    last24: number | null;
    last36: number | null;
    prior12: number | null;
    yoyDeltaPct: number | null;
    slopePerMonth: number | null;
    peakMonth?: { month: string; therms: number } | null;
  };
  stepChanges?: Array<{ whenMonth: string; deltaTherms: number; deltaPct: number; confidence: number }>;
  seasonality?: { winterAvgTherms: number | null; summerAvgTherms: number | null; skewPct: number | null };
  conversationCards: InsightCardV3[];
  because: string[];
  evidence: EvidenceItemV1[];
  missingInfo: MissingInfoItemV0[];
  confidence: number; // 0..1
};

export type BehaviorInsightsV3 = {
  version: 'behaviorV3.v1';
  electric?: ElectricBehaviorInsightsV3;
  gas?: GasBehaviorInsightsV3;
};

