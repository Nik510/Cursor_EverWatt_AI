import { describe, expect, test } from 'vitest';
import path from 'path';
import { readFileSync } from 'fs';

import { loadBatteryLibraryV1 } from '../src/modules/batteryLibrary/loadLibrary';
import { runUtilityWorkflow } from '../src/modules/workflows/runUtilityWorkflow';
import { generateUtilitySummaryV1 } from '../src/modules/reports/utilitySummary/v1/generateUtilitySummary';

function loadIntervalFixture(name: string): Array<{ timestampIso: string; kw: number }> {
  const fp = path.join(process.cwd(), 'samples', name);
  return JSON.parse(readFileSync(fp, 'utf-8'));
}

describe('Happy Path workflow: utility + battery screening', () => {
  test('runs workflow, creates inbox suggestions, and generates a client-ready markdown summary', async () => {
    const interval = loadIntervalFixture('interval_peaky_office.json');
    const lib = await loadBatteryLibraryV1(path.join(process.cwd(), 'samples', 'battery_library_fixture.json'));

    let seq = 0;
    const nowIso = new Date('2026-01-01T00:00:00.000Z').toISOString();
    const inputs = {
      orgId: 't',
      projectId: 'p',
      serviceType: 'electric' as const,
      utilityTerritory: 'PGE',
      currentRate: { utility: 'PG&E', rateCode: 'B-19' },
      naicsCode: '622110',
      customerType: 'healthcare',
      meterMeta: { hasDemandChargesKnown: true },
      intervalDataRef: { telemetrySeriesId: 'fixture', resolution: 'hourly' as const, channels: ['kW'] },
    };
    const wf = await runUtilityWorkflow({
      inputs,
      meterId: 'm1',
      intervalKwSeries: interval,
      batteryLibrary: lib.library.items,
      nowIso,
      idFactory: () => `id_${++seq}`,
      suggestionIdFactory: () => `sug_${++seq}`,
      inboxIdFactory: () => `inbox_${++seq}`,
    });

    expect(wf.inbox.suggestions.length).toBeGreaterThan(0);
    expect(wf.inbox.inboxItems.length).toBeGreaterThan(0);

    const summary = generateUtilitySummaryV1({
      inputs,
      insights: wf.utility.insights,
      utilityRecommendations: wf.utility.recommendations,
      batteryGate: wf.battery.gate,
      batterySelection: wf.battery.selection,
      nowIso,
    });

    // Key sections present
    expect(summary.markdown).toContain('## Building metadata');
    expect(summary.markdown).toContain('## Key load shape metrics');
    expect(summary.markdown).toContain('## Rate fit');
    expect(summary.markdown).toContain('## Option S / storage relevance');
    expect(summary.markdown).toContain('## Demand response + utility/ISO programs');
    expect(summary.markdown).toContain('## Battery screening');
    expect(summary.markdown).toContain('## Missing inputs checklist');

    // Checklist present (can be empty if all inputs provided; assert section exists)
    expect(Array.isArray(summary.json.missingInputsChecklist)).toBe(true);
  });
});

