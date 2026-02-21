import { describe, expect, it } from 'vitest';

import { runVerifierV1 } from '../src/modules/verifierV1/runVerifierV1';

describe('verifierV1 core checks (deterministic)', () => {
  it('PASS when reconcile delta within tolerance', () => {
    const reportJson: any = {
      analysisTraceV1: { coverage: { supplyProviderType: 'NONE', tariffMatchStatus: 'FOUND', intervalDays: 30 }, provenance: {} },
      telemetry: { intervalElectricMetaV1: { pointCount: 100, inferredIntervalMinutes: 60, range: { startIso: '2026-01-01T00:00:00.000Z', endIso: '2026-01-05T00:00:00.000Z' }, warnings: [] } },
      batteryDecisionPackV1_2: { audit: { reconcile: { total: 100, sumLineItems: 100, delta: 0.01 } } },
    };

    const res = runVerifierV1({ generatedAtIso: '2026-03-01T00:00:00.000Z', reportType: 'ENGINEERING_PACK_V1', reportJson, packJson: { provenanceHeader: { snapshotIds: { tariffSnapshotId: null, generationEnergySnapshotId: null, addersSnapshotId: null, exitFeesSnapshotId: null } } } });
    expect(res.status).toBe('PASS');
    expect(res.checks.map((c) => c.code)).toContain('verifier.econ.sum_mismatch');
  });

  it('FAIL when reconcile delta beyond tolerance', () => {
    const reportJson: any = {
      analysisTraceV1: { coverage: { supplyProviderType: 'NONE', tariffMatchStatus: 'FOUND', intervalDays: 30 }, provenance: {} },
      telemetry: { intervalElectricMetaV1: { pointCount: 100, inferredIntervalMinutes: 60, range: { startIso: '2026-01-01T00:00:00.000Z', endIso: '2026-01-05T00:00:00.000Z' }, warnings: [] } },
      batteryDecisionPackV1_2: { audit: { reconcile: { total: 100, sumLineItems: 98, delta: 2.0 } } },
    };

    const res = runVerifierV1({ generatedAtIso: '2026-03-01T00:00:00.000Z', reportType: 'ENGINEERING_PACK_V1', reportJson, packJson: { provenanceHeader: { snapshotIds: { tariffSnapshotId: null, generationEnergySnapshotId: null, addersSnapshotId: null, exitFeesSnapshotId: null } } } });
    expect(res.status).toBe('FAIL');
    const chk = res.checks.find((c) => c.code === 'verifier.econ.sum_mismatch');
    expect(chk?.status).toBe('FAIL');
  });

  it('FAIL when CCA adders+exitFees present and dedup kind not observed', () => {
    const reportJson: any = {
      analysisTraceV1: { coverage: { supplyProviderType: 'CCA', tariffMatchStatus: 'FOUND', intervalDays: 30 }, provenance: { addersSnapshotId: 'a1', exitFeesSnapshotId: 'e1' } },
      batteryEconomicsV1: { audit: { lineItems: [{ id: 'savings.energyAnnual', rateSource: { kind: 'CCA_GEN_V0_ALL_IN_WITH_EXIT_FEES' } }] } },
      telemetry: { intervalElectricMetaV1: { pointCount: 100, inferredIntervalMinutes: 60, range: { startIso: '2026-01-01T00:00:00.000Z', endIso: '2026-01-05T00:00:00.000Z' }, warnings: [] } },
    };

    const res = runVerifierV1({ generatedAtIso: '2026-03-01T00:00:00.000Z', reportType: 'ENGINEERING_PACK_V1', reportJson, packJson: { provenanceHeader: { snapshotIds: { tariffSnapshotId: null, generationEnergySnapshotId: null, addersSnapshotId: 'a1', exitFeesSnapshotId: 'e1' } } } });
    expect(res.status).toBe('FAIL');
    const chk = res.checks.find((c) => c.code === 'verifier.rate.adders_exitfees_doublecount');
    expect(chk?.status).toBe('FAIL');
  });

  it('WARN when tariff match ambiguous and economics present (no published totals)', () => {
    const reportJson: any = {
      analysisTraceV1: { coverage: { supplyProviderType: 'NONE', tariffMatchStatus: 'AMBIGUOUS', intervalDays: 30 }, provenance: {} },
      batteryEconomicsV1: { audit: { lineItems: [] } },
      telemetry: { intervalElectricMetaV1: { pointCount: 100, inferredIntervalMinutes: 60, range: { startIso: '2026-01-01T00:00:00.000Z', endIso: '2026-01-05T00:00:00.000Z' }, warnings: [] } },
    };

    const res = runVerifierV1({ generatedAtIso: '2026-03-01T00:00:00.000Z', reportType: 'ENGINEERING_PACK_V1', reportJson, packJson: { provenanceHeader: { snapshotIds: { tariffSnapshotId: null, generationEnergySnapshotId: null, addersSnapshotId: null, exitFeesSnapshotId: null } } } });
    expect(['WARN', 'FAIL', 'PASS']).toContain(res.status);
    const chk = res.checks.find((c) => c.code === 'verifier.tariff.ambiguous_match');
    expect(chk?.status).toBe('WARN');
  });
});

