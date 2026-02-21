import { describe, expect, it } from 'vitest';

import { runScenarioLabV1 } from '../src/modules/scenarioLabV1/runScenarioLabV1';

function mkTruth(args: { hasInterval: boolean; intervalDays: number | null; tier: 'A' | 'B' | 'C' }): any {
  return {
    schemaVersion: 'truthSnapshotV1',
    generatedAtIso: '2026-03-01T00:00:00.000Z',
    coverage: {
      hasInterval: args.hasInterval,
      intervalDays: args.intervalDays,
      granularityMinutes: args.hasInterval ? 60 : null,
      hasWeatherDaily: false,
      weatherDays: null,
      hasBillText: true,
    },
    baselineModelV1: { modelKind: args.hasInterval ? 'INTERVAL_PROFILE_SEASONAL_V1' : 'NONE', params: {}, fitQuality: { tier: args.tier }, notes: [] },
    expectedSeriesSummaryV1: { kind: args.hasInterval ? 'HOURLY_PROFILE' : 'NONE', timezoneUsed: 'America/Los_Angeles', sampleCount: 0, notes: [] },
    residualMapsV1: { hourlyResidualByDow: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0)), peakResidualHours: [] },
    changepointsV1: [],
    anomalyLedgerV1: [],
    truthWarnings: [],
    truthConfidence: { tier: args.tier, reasons: [] },
  };
}

function mkBatteryPack(args: { annualTotal: number; energy: number; demand: number; ratchet: number; capex: number; payback: number; confidenceTier: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  return {
    method: 'battery_decision_pack_v1.2',
    ok: true,
    confidenceTier: args.confidenceTier,
    warnings: [],
    missingInfo: [],
    inputsSummary: { utility: 'PGE', rate: 'B-19', providerType: 'NONE', hasIntervals: true, hasAllInGenPrices: true },
    constraints: { input: null, applied: { backupOnly: false, noExport: false, interconnectionLimitKw: null, maxKwEffective: null, minKwEffective: null, maxKwhEffective: null, minDurationHoursEffective: null, maxDurationHoursEffective: null, excludeDurationsHoursEffective: [], requireIndoorRated: false, requireNemaRating: null, siteNotes: null }, hardFilter: { candidatesBefore: 1, candidatesAfter: 1, bindingConstraintIds: [] }, rejectedByGates: [] },
    topCandidates: [
      {
        id: 'cand_1',
        kw: 50,
        kwh: 100,
        durationH: 2,
        chemistryClass: 'LFP_PLACEHOLDER',
        score: 0.9,
        economicsSummary: {
          annualSavingsTotalUsd: args.annualTotal,
          savingsByCategoryUsd: { energyArbitrageUsd: args.energy, demandUsd: args.demand, ratchetUsd: args.ratchet, drUsd: 0, otherUsd: 0 },
          capexTotalUsd: args.capex,
          opexAnnualTotalUsd: 0,
          netAnnualUsd: args.annualTotal,
          paybackYears: args.payback,
          npvLiteUsd: 1,
          rateSourceKind: 'DELIVERY',
        },
        whyThisWorks: [],
        whyNotBetter: [],
      },
    ],
    selected: { candidateId: 'cand_1', rationaleBullets: [], economicsSummary: null },
    batteryDecisionSensitivityV1: { ok: true, reasonCodes: [], scenarios: [] },
    recommendationV1: { recommendedCandidateId: 'cand_1', recommendationTier: 'MODERATE', reasonsTop: [], whyNotOthers: [], keyAssumptions: [], risks: [] },
    audit: { lineItems: [], reconcile: { total: null, sumLineItems: null, delta: null } },
  };
}

describe('scenarioLabV1 fixture (deterministic gating + bounding)', () => {
  it('claims BLOCK suppresses annualUsd (LIMITED_BY_CLAIMS_POLICY)', () => {
    const lab = runScenarioLabV1({
      storedRunSnapshot: {
        nowIso: '2026-03-01T00:00:00.000Z',
        analysisTraceV1: { coverage: { hasInterval: true, intervalDays: 30, tariffMatchStatus: 'FOUND', supplyProviderType: 'NONE', hasRatchetHistory: true } },
        workflow: { utility: { insights: { batteryDecisionPackV1_2: mkBatteryPack({ annualTotal: 10000, energy: 6000, demand: 3000, ratchet: 1000, capex: 40000, payback: 4, confidenceTier: 'HIGH' }) } } },
      },
      truthSnapshotV1: mkTruth({ hasInterval: true, intervalDays: 30, tier: 'A' }),
      verifierResultV1: { status: 'PASS', generatedAtIso: '2026-03-01T00:00:00.000Z', checks: [], summary: { passCount: 0, warnCount: 0, failCount: 0 } } as any,
      claimsPolicyV1: {
        status: 'BLOCK',
        blockedReasons: ['verifier:FAIL'],
        allowedClaims: { canClaimAnnualUsdSavings: false, canClaimDemandSavings: false, canRecommendTariffSwitch: false, canRecommendBatterySizing: false, canClaimEmissionsAvoided: false },
        requiredNextData: [{ code: 'required:interval_data', label: 'interval_data' }],
      } as any,
      constraints: { maxScenarios: 25, maxFrontierPoints: 15 },
    });

    const hybrid = lab.scenarios.find((s) => s.scenarioId === 'BATTERY_HYBRID_TOU_PLUS_DEMAND');
    expect(hybrid).toBeTruthy();
    expect(hybrid!.kpis.annualUsd).toBeNull();
    expect(hybrid!.gating.blockedReasons).toContain('LIMITED_BY_CLAIMS_POLICY');
  });

  it('ratchet missing blocks demand-shave template', () => {
    const lab = runScenarioLabV1({
      storedRunSnapshot: {
        nowIso: '2026-03-01T00:00:00.000Z',
        analysisTraceV1: { coverage: { hasInterval: true, intervalDays: 30, tariffMatchStatus: 'FOUND', supplyProviderType: 'NONE', hasRatchetHistory: false } },
        workflow: { utility: { insights: { batteryDecisionPackV1_2: mkBatteryPack({ annualTotal: 9000, energy: 5000, demand: 3000, ratchet: 1000, capex: 35000, payback: 4, confidenceTier: 'MEDIUM' }) } } },
      },
      truthSnapshotV1: mkTruth({ hasInterval: true, intervalDays: 30, tier: 'B' }),
      verifierResultV1: { status: 'PASS', generatedAtIso: '2026-03-01T00:00:00.000Z', checks: [], summary: { passCount: 0, warnCount: 0, failCount: 0 } } as any,
      claimsPolicyV1: {
        status: 'LIMITED',
        blockedReasons: ['ratchetHistory:MISSING'],
        allowedClaims: { canClaimAnnualUsdSavings: true, canClaimDemandSavings: false, canRecommendTariffSwitch: true, canRecommendBatterySizing: true, canClaimEmissionsAvoided: true },
        requiredNextData: [{ code: 'billing_history_12_months', label: 'billing_history_12_months' }],
      } as any,
      constraints: null,
    });

    const demand = lab.scenarios.find((s) => s.scenarioId === 'BATTERY_DEMAND_SHAVE_ONLY');
    expect(demand).toBeTruthy();
    expect(demand!.status).toBe('BLOCKED');
    expect(demand!.gating.blockedReasons.join(' ')).toContain('ratchetHistory:MISSING');
  });

  it('tariff ambiguous surfaces in tariff validation scenario', () => {
    const lab = runScenarioLabV1({
      storedRunSnapshot: {
        nowIso: '2026-03-01T00:00:00.000Z',
        analysisTraceV1: { coverage: { hasInterval: true, intervalDays: 30, tariffMatchStatus: 'AMBIGUOUS', supplyProviderType: 'NONE', hasRatchetHistory: true } },
        workflow: { utility: { insights: { batteryDecisionPackV1_2: mkBatteryPack({ annualTotal: 9000, energy: 5000, demand: 3000, ratchet: 1000, capex: 35000, payback: 4, confidenceTier: 'MEDIUM' }) } } },
      },
      truthSnapshotV1: mkTruth({ hasInterval: true, intervalDays: 30, tier: 'B' }),
      verifierResultV1: { status: 'WARN', generatedAtIso: '2026-03-01T00:00:00.000Z', checks: [], summary: { passCount: 0, warnCount: 0, failCount: 0 } } as any,
      claimsPolicyV1: {
        status: 'LIMITED',
        blockedReasons: ['tariffMatchStatus:AMBIGUOUS'],
        allowedClaims: { canClaimAnnualUsdSavings: true, canClaimDemandSavings: true, canRecommendTariffSwitch: false, canRecommendBatterySizing: true, canClaimEmissionsAvoided: true },
        requiredNextData: [{ code: 'rate_code', label: 'rate_code' }],
      } as any,
      constraints: null,
    });

    const validate = lab.scenarios.find((s) => s.scenarioId === 'TARIFF_VALIDATE_CURRENT');
    expect(validate).toBeTruthy();
    expect(validate!.status).toBe('RAN');
    expect(validate!.gating.blockedReasons.join(' ')).toContain('tariffMatchStatus:AMBIGUOUS');
  });

  it('interval missing blocks battery templates (no economics)', () => {
    const lab = runScenarioLabV1({
      storedRunSnapshot: {
        nowIso: '2026-03-01T00:00:00.000Z',
        analysisTraceV1: { coverage: { hasInterval: false, intervalDays: null, tariffMatchStatus: 'UNKNOWN', supplyProviderType: 'NONE', hasRatchetHistory: null } },
        workflow: { utility: { insights: { batteryDecisionPackV1_2: null } } },
      },
      truthSnapshotV1: mkTruth({ hasInterval: false, intervalDays: null, tier: 'C' }),
      verifierResultV1: { status: 'PASS', generatedAtIso: '2026-03-01T00:00:00.000Z', checks: [], summary: { passCount: 0, warnCount: 0, failCount: 0 } } as any,
      claimsPolicyV1: null,
      constraints: null,
    });

    const hybrid = lab.scenarios.find((s) => s.scenarioId === 'BATTERY_HYBRID_TOU_PLUS_DEMAND');
    expect(hybrid).toBeTruthy();
    expect(hybrid!.status).toBe('BLOCKED');
  });
});

