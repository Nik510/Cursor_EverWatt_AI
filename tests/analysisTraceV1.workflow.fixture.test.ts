import { describe, expect, it } from 'vitest';
import path from 'node:path';

import { loadBatteryLibraryV1 } from '../src/modules/batteryLibrary/loadLibrary';
import { runUtilityWorkflow } from '../src/modules/workflows/runUtilityWorkflow';

describe('analysisTraceV1 (workflow)', () => {
  it('is present, deterministic, and bounded', async () => {
    const libPath = path.join(process.cwd(), 'samples', 'battery_library_fixture.json');
    const lib = await loadBatteryLibraryV1(libPath);
    const nowIso = '2026-01-01T00:00:00.000Z';

    const wf = await runUtilityWorkflow({
      inputs: { orgId: 'user:test', projectId: 'p', serviceType: 'electric', utilityTerritory: 'PGE' } as any,
      batteryLibrary: lib.library.items,
      nowIso,
      idFactory: () => 'id1',
      suggestionIdFactory: () => 's1',
      inboxIdFactory: () => 'i1',
    });

    const t = (wf as any)?.analysisTraceV1;
    expect(t).toBeTruthy();
    expect(t.generatedAtIso).toBe(nowIso);

    // Deterministic ordering
    expect(t.ranModules.slice().sort()).toEqual(t.ranModules);
    const skippedSorted = t.skippedModules
      .slice()
      .sort((a: any, b: any) => String(a?.module || '').localeCompare(String(b?.module || '')) || String(a?.reasonCode || '').localeCompare(String(b?.reasonCode || '')));
    expect(skippedSorted).toEqual(t.skippedModules);

    // Bounded arrays
    expect(t.warningsSummary.topEngineWarningCodes.length).toBeLessThanOrEqual(10);
    expect(t.warningsSummary.topMissingInfoCodes.length).toBeLessThanOrEqual(10);
  });

  it('reflects interval/weather presence from provided intervalPointsV1', async () => {
    const libPath = path.join(process.cwd(), 'samples', 'battery_library_fixture.json');
    const lib = await loadBatteryLibraryV1(libPath);
    const nowIso = '2026-01-01T00:00:00.000Z';

    const intervalPointsV1 = [
      { timestampIso: '2026-01-01T00:00:00.000Z', intervalMinutes: 15, kWh: 1, temperatureF: 55 },
      { timestampIso: '2026-01-01T00:15:00.000Z', intervalMinutes: 15, kWh: 1, temperatureF: 56 },
      { timestampIso: '2026-01-01T00:30:00.000Z', intervalMinutes: 15, kWh: 1, temperatureF: 56 },
      { timestampIso: '2026-01-02T00:00:00.000Z', intervalMinutes: 15, kWh: 1, temperatureF: 54 },
    ];

    const wf = await runUtilityWorkflow({
      inputs: { orgId: 'user:test', projectId: 'p', serviceType: 'electric', utilityTerritory: 'PGE' } as any,
      intervalPointsV1: intervalPointsV1 as any,
      batteryLibrary: lib.library.items,
      nowIso,
      idFactory: () => 'id1',
      suggestionIdFactory: () => 's1',
      inboxIdFactory: () => 'i1',
    });

    const t = (wf as any)?.analysisTraceV1;
    expect(t.coverage.hasInterval).toBe(true);
    expect(t.coverage.intervalGranularity).toBe('15m');
    expect(t.coverage.intervalDays).not.toBeNull();
    expect(t.coverage.hasWeatherDaily).toBe(true);
  });
});

