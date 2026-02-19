// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AnalysisRunsV1Page } from '../src/pages/projectBuilder/AnalysisRunsV1Page';

function renderAt(url = '/project-builder/analysis-runs') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/project-builder/analysis-runs" element={<AnalysisRunsV1Page />} />
        <Route path="/project-builder" element={<div>Project Builder</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AnalysisRunsV1Page (UI)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // jsdom does not implement object URL APIs by default.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis.URL as any).createObjectURL = vi.fn(() => 'blob:mock');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis.URL as any).revokeObjectURL = vi.fn(() => {});
  });

  it('renders runs list, loads details on click, diffs on button click, and exposes PDF download', async () => {
    const user = userEvent.setup();

    const runA = {
      runId: 'run_a',
      createdAtIso: '2026-02-19T10:00:00.000Z',
      inputFingerprint: 'aaaaaaaaaa1111111111',
      summary: { utility: 'PGE', rateCode: 'E-19', supplyProviderType: 'NONE', lseName: '', hasIntervals: true, hasWeather: false, rateSourceKind: 'bill_pdf' },
    };
    const runB = {
      runId: 'run_b',
      createdAtIso: '2026-02-19T09:00:00.000Z',
      inputFingerprint: 'bbbbbbbbbb2222222222',
      summary: { utility: 'SCE', rateCode: 'TOU-8', supplyProviderType: 'CCA', lseName: 'CleanPower', hasIntervals: false, hasWeather: true, rateSourceKind: 'override' },
    };

    const analysisRunPayload = (runId: string) => ({
      runId,
      createdAtIso: runId === 'run_a' ? runA.createdAtIso : runB.createdAtIso,
      nowIso: runId === 'run_a' ? runA.createdAtIso : runB.createdAtIso,
      projectId: null,
      inputFingerprint: runId === 'run_a' ? runA.inputFingerprint : runB.inputFingerprint,
      engineVersions: {},
      provenance: {},
      warningsSummary: { engineWarningsCount: 0, topEngineWarningCodes: [], missingInfoCount: 0, topMissingInfoCodes: [] },
      snapshot: {
        response: {
          success: true,
          project: { id: 'p_test', name: 'Test', territory: 'PGE' },
          workflow: {
            utility: {
              inputs: { utilityTerritory: 'PGE', currentRateSelectionSource: 'bill_pdf', currentRate: { utility: 'PGE', rateCode: 'E-19' } },
              insights: { rateFit: { status: 'good' }, supplyStructure: { supplyType: 'bundled', confidence: 0.9, because: [] } },
            },
          },
          summary: { json: { rateFit: { status: 'good' }, building: { currentRateCode: 'E-19', territory: 'PGE' } }, markdown: '' },
        },
        reportJson: {
          summary: { json: { rateFit: { status: 'good' }, building: { currentRateCode: 'E-19', territory: 'PGE' } }, markdown: '' },
          telemetry: { intervalElectricV1: { present: true, pointCount: 10, warningCount: 0 } },
          missingInfo: [{ id: 'x.missing' }, { id: 'a.missing' }],
          auditDrawerV1: { moneyExplainers: { e1: {}, e2: {} } },
        },
      },
    });

    const diffPayload = {
      runA: { runId: 'run_a', createdAtIso: runA.createdAtIso },
      runB: { runId: 'run_b', createdAtIso: runB.createdAtIso },
      changedSections: ['rate_and_supply'],
      categories: [
        {
          category: 'rate_and_supply',
          changedPaths: ['/summary/json/building/currentRateCode'],
          highlights: [{ label: 'currentRateCode', before: 'E-19', after: 'TOU-8' }],
        },
      ],
    };

    const fetchMock = vi.fn(async (input: any, init?: any) => {
      const url = String(typeof input === 'string' ? input : input?.url || '');
      const method = String(init?.method || 'GET').toUpperCase();

      if (url === '/api/analysis-results-v1/runs' && method === 'GET') {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ success: true, runs: [runA, runB], warnings: [] }),
        } as any;
      }
      if (url === '/api/analysis-results-v1/runs/run_a' && method === 'GET') {
        return { ok: true, status: 200, headers: new Headers(), json: async () => ({ success: true, analysisRun: analysisRunPayload('run_a') }) } as any;
      }
      if (url === '/api/analysis-results-v1/runs/run_b' && method === 'GET') {
        return { ok: true, status: 200, headers: new Headers(), json: async () => ({ success: true, analysisRun: analysisRunPayload('run_b') }) } as any;
      }
      if (url === '/api/analysis-results-v1/diff' && method === 'POST') {
        return { ok: true, status: 200, headers: new Headers(), json: async () => ({ success: true, diff: diffPayload }) } as any;
      }
      if ((url === '/api/analysis-results-v1/runs/run_a/pdf' || url === '/api/analysis-results-v1/runs/run_b/pdf') && method === 'GET') {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-disposition': 'attachment; filename="test.pdf"' }),
          blob: async () => new Blob(['%PDF-mock'], { type: 'application/pdf' }),
        } as any;
      }

      return { ok: false, status: 404, headers: new Headers(), json: async () => ({ success: false, error: 'not found' }) } as any;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = fetchMock;

    renderAt();

    // List renders.
    expect(await screen.findByText('Analysis Runs (V1)')).toBeInTheDocument();
    expect(await screen.findByText('PGE')).toBeInTheDocument();
    expect(await screen.findByText('SCE')).toBeInTheDocument();

    // Clicking a row loads details.
    await user.click(await screen.findByRole('button', { name: /SCE/i }));
    expect(await screen.findByText(/run_b/i)).toBeInTheDocument();

    // Diff only happens on explicit click.
    await user.click(await screen.findByRole('button', { name: 'Diff' }));
    expect(await screen.findByText(/Highlights \(max 10\)/i)).toBeInTheDocument();
    expect(await screen.findByText(/currentRateCode/i)).toBeInTheDocument();

    // PDF download button exists; clicking should call the pdf endpoint fetch.
    const dl = await screen.findByRole('button', { name: /Download PDF/i });
    expect(dl).toBeInTheDocument();
    await user.click(dl);
    expect(fetchMock).toHaveBeenCalledWith('/api/analysis-results-v1/runs/run_b/pdf', expect.anything());
  });
});

