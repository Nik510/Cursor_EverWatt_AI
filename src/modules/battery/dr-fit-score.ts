export type FitLabel = 'Strong Fit' | 'Good Fit' | 'Marginal' | 'Poor Fit';

export type DrFitInputs = {
  // Deliverability
  deliverableKw: number;
  minimumCommitmentKw: number;
  firmPercentile: 20 | 10 | 50;

  // Revenue quality
  capacityRevenueAnnual: number; // $/yr
  eventRevenueAnnual: number; // $/yr
  reliabilityFactor: number; // 0.4–1.0 (utility capacity ~1.0, volatile/merchant lower)

  // Operational risk flags
  overlapsPeakShaving: boolean;
  eventWindowHours: number;
  batteryDurationHours: number;
  manualOpsRequired: boolean;
  drReservePctOfBatteryKw: number; // 0–1

  // Data confidence
  hasTemperatureData: boolean;
  eventDayCount: number;
  hasIntervalGaps: boolean;
  socAssumed: boolean;
};

export type DrFitResult = {
  score: number; // 0–100
  label: FitLabel;
  reasons: string[]; // top reasons explaining score
  components: {
    deliverability: number; // 0–1
    revenueQuality: number; // 0–1
    operationalRisk: number; // 0–1
    dataConfidence: number; // 0–1
  };
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export function fitScoreLabel(score: number): FitLabel {
  if (score >= 80) return 'Strong Fit';
  if (score >= 60) return 'Good Fit';
  if (score >= 40) return 'Marginal';
  return 'Poor Fit';
}

export function computeDrFitScore(i: DrFitInputs): DrFitResult {
  // ----- Deliverability (40%) -----
  const firmFactor = i.firmPercentile === 20 ? 1.0 : i.firmPercentile === 10 ? 0.8 : 0.6;
  const deliverability = clamp01(i.deliverableKw / Math.max(1, i.minimumCommitmentKw)) * firmFactor;

  // ----- Revenue Quality (25%) -----
  const totalRevenue = (i.capacityRevenueAnnual + i.eventRevenueAnnual) || 1;
  const capacityShare = i.capacityRevenueAnnual / totalRevenue;
  const eventShareAdj = (i.eventRevenueAnnual / totalRevenue) * clamp01(i.reliabilityFactor);
  const revenueQuality = clamp01(0.6 * capacityShare + 0.4 * eventShareAdj);

  // ----- Operational Risk (20%) -----
  let operationalRisk = 1.0;
  const opPenalties: Array<[number, string]> = [];

  if (i.overlapsPeakShaving) opPenalties.push([0.15, 'Potential overlap with peak-shaving hours']);
  if (i.eventWindowHours > i.batteryDurationHours) opPenalties.push([0.1, 'Event window longer than battery duration']);
  if (i.manualOpsRequired) opPenalties.push([0.1, 'Requires operational coordination on event days']);
  if (i.drReservePctOfBatteryKw > 0.6) opPenalties.push([0.1, 'Large share of battery capacity required for DR']);

  for (const [p] of opPenalties) operationalRisk -= p;
  operationalRisk = clamp01(operationalRisk);

  // ----- Data Confidence (15%) -----
  let dataConfidence = 1.0;
  const dataPenalties: Array<[number, string]> = [];

  if (!i.hasTemperatureData) dataPenalties.push([0.2, 'Temperature data missing (hottest-day evaluation unavailable)']);
  if (i.eventDayCount < 10) dataPenalties.push([0.2, 'Limited event-day sample size']);
  if (i.hasIntervalGaps) dataPenalties.push([0.1, 'Interval data gaps detected']);
  if (i.socAssumed) dataPenalties.push([0.1, 'Battery SOC at event start assumed']);

  for (const [p] of dataPenalties) dataConfidence -= p;
  dataConfidence = clamp01(dataConfidence);

  // ----- Final score -----
  const score01 =
    0.4 * deliverability +
    0.25 * revenueQuality +
    0.2 * operationalRisk +
    0.15 * dataConfidence;

  const score = Math.round(score01 * 100);

  // ----- Explainability ("why") -----
  const reasons: Array<[number, string]> = [];

  // big drivers first: deliverability shortfall, then penalties
  if (i.deliverableKw < i.minimumCommitmentKw) {
    const shortPct = 1 - clamp01(i.deliverableKw / Math.max(1, i.minimumCommitmentKw));
    reasons.push([0.5 + shortPct, 'Deliverable kW is below program minimum']);
  }

  for (const [p, msg] of opPenalties) reasons.push([p, msg]);
  for (const [p, msg] of dataPenalties) reasons.push([p, msg]);

  // revenue quality explanation
  if (capacityShare < 0.25 && i.eventRevenueAnnual > 0) {
    reasons.push([0.08, 'Revenue is mostly event-based (more variable)']);
  }

  reasons.sort((a, b) => b[0] - a[0]);

  return {
    score,
    label: fitScoreLabel(score),
    reasons: reasons.slice(0, 3).map((r) => r[1]),
    components: { deliverability, revenueQuality, operationalRisk, dataConfidence },
  };
}
