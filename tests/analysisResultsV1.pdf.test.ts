import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { loadBatteryLibraryV1 } from '../src/modules/batteryLibrary/loadLibrary';
import { runUtilityWorkflow } from '../src/modules/workflows/runUtilityWorkflow';
import { generateUtilitySummaryV1 } from '../src/modules/reports/utilitySummary/v1/generateUtilitySummary';
import { renderUtilitySummaryPdf } from '../src/modules/reports/utilitySummary/v1/renderUtilitySummaryPdf';

describe('Analysis Results v1 PDF export', () => {
  it('generates a branded PDF buffer for demo mode', async () => {
    const intervalsPath = path.join(process.cwd(), 'samples', 'interval_peaky_office.json');
    const raw = JSON.parse(await readFile(intervalsPath, 'utf-8')) as any;
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.intervals) ? raw.intervals : [];
    const intervalKwSeries: Array<{ timestampIso: string; kw: number }> = [];
    for (const r of arr) {
      const ts = String(r?.timestampIso ?? r?.timestamp ?? r?.ts ?? '').trim();
      const kw = typeof r?.kw === 'number' ? r.kw : Number(r?.kw);
      if (!ts || !Number.isFinite(kw)) continue;
      intervalKwSeries.push({ timestampIso: ts, kw });
    }

    const libPath = path.join(process.cwd(), 'samples', 'battery_library_fixture.json');
    const lib = await loadBatteryLibraryV1(libPath);

    const inputs = {
      orgId: 'user:test',
      projectId: 'demo',
      serviceType: 'electric',
      utilityTerritory: 'PGE',
      address: { line1: 'Oakland, CA', city: '', state: '', zip: '', country: 'US' },
    } as const;

    const workflow = await runUtilityWorkflow({
      inputs: inputs as any,
      intervalKwSeries,
      batteryLibrary: lib.library.items,
    });

    const summary = generateUtilitySummaryV1({
      inputs: inputs as any,
      insights: workflow.utility.insights,
      utilityRecommendations: workflow.utility.recommendations,
      batteryGate: workflow.battery.gate,
      batterySelection: workflow.battery.selection,
    });

    const pdf = await renderUtilitySummaryPdf({
      project: { name: 'Demo: Peaky Office', address: 'Oakland, CA', territory: 'PGE' },
      summaryMarkdown: summary.markdown,
      summaryJson: summary.json,
    });

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(0);

    // Lightweight text check via existing PDF parser dependency.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), disableWorker: true }).promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it: any) => String(it?.str || '')).join(' ') + '\n';
    }

    const normalizedText = text.replace(/\s+/g, ' ').trim();
    expect(normalizedText).toContain('EverWatt Engine');
    expect(normalizedText).toContain('Analysis Results v1');
    expect(normalizedText).toContain('Building metadata');
    expect(normalizedText).toContain('Rate fit');
    expect(normalizedText).toContain('Battery screening');
  }, 30_000);
});

