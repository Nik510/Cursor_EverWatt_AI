// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../src/shared/api/analysisResults', async () => {
  const actual: any = await vi.importActual('../src/shared/api/analysisResults');
  return {
    ...actual,
    getAnalysisResultsV1: vi.fn(),
  };
});

vi.mock('../src/shared/api/client', async () => {
  const actual: any = await vi.importActual('../src/shared/api/client');
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

import * as analysisApi from '../src/shared/api/analysisResults';
import { apiRequest } from '../src/shared/api/client';
import { AnalysisResultsV1Page } from '../src/pages/AnalysisResultsV1Page';
import { BillingIntakePlaceholder } from '../src/pages/projectBuilder/BillingIntakePlaceholder';

function renderAt(projectId = 'p_test') {
  return render(
    <MemoryRouter initialEntries={[`/analysis/v1/${projectId}`]}>
      <Routes>
        <Route path="/analysis/v1/:projectId" element={<AnalysisResultsV1Page />} />
        <Route path="/project-builder/:projectId/billing" element={<BillingIntakePlaceholder />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Billing intake page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('pastes bill text, saves to project, and analysis Truth Panel updates', async () => {
    const user = userEvent.setup();
    const projectId = 'p_test';

    // 1) Initial analysis load: missing bill inputs, so CTA shows.
    vi.mocked(analysisApi.getAnalysisResultsV1)
      .mockResolvedValueOnce({
        success: true,
        project: { id: projectId, name: 'Test Project' },
        workflow: {
          utility: { inputs: {}, insights: { rateFit: { status: 'unknown', because: [], alternatives: [] } } },
          battery: { gate: { status: 'unknown', because: [] } },
        },
        summary: { json: {}, markdown: '' },
      } as any)
      // 2) After save + return: billPdfText present, supplyStructure inferred.
      .mockResolvedValueOnce({
        success: true,
        project: { id: projectId, name: 'Test Project' },
        workflow: {
          utility: {
            inputs: { billPdfText: 'community choice aggregation (CCA)' },
            insights: {
              rateFit: { status: 'unknown', because: [], alternatives: [] },
              supplyStructure: { supplyType: 'CCA', confidence: 0.9, because: ['PDF contains CCA'], evidence: { source: 'bill_pdf' } },
            },
          },
          battery: { gate: { status: 'unknown', because: [] } },
        },
        summary: { json: {}, markdown: '' },
      } as any);

    // Project load + save (no network): Billing intake uses apiRequest.
    vi.mocked(apiRequest).mockImplementation(async (args: any) => {
      if (String(args?.url || '') === `/api/projects/${encodeURIComponent(projectId)}` && (!args?.method || args.method === 'GET')) {
        return { success: true, project: { id: projectId, customer: { projectNumber: '1', companyName: 'X' }, telemetry: { billPdfText: '' } } } as any;
      }
      if (String(args?.url || '') === `/api/projects/${encodeURIComponent(projectId)}` && args?.method === 'PUT') {
        const body = JSON.parse(String(args?.body || '{}'));
        const next = body?.patch?.telemetry?.billPdfText ?? '';
        return { success: true, project: { id: projectId, customer: { projectNumber: '1', companyName: 'X' }, telemetry: { billPdfText: next } } } as any;
      }
      throw new Error(`Unexpected apiRequest: ${String(args?.method || 'GET')} ${String(args?.url || '')}`);
    });

    renderAt(projectId);

    // Go to Rate & Tariff and open Billing intake via CTA.
    await user.click(await screen.findByRole('button', { name: 'Rate & Tariff' }));
    await user.click(screen.getByRole('button', { name: /Add bill PDF \/ billing records/i }));

    expect(await screen.findByText(/Billing intake/i)).toBeInTheDocument();
    const textarea = await screen.findByLabelText(/Paste bill text \(from PDF\)/i);
    await user.clear(textarea);
    await user.type(textarea, 'community choice aggregation (CCA)');

    await user.click(screen.getByRole('button', { name: /^Save$/i }));

    // Back on analysis: should have re-fetched and now show inferred supply structure.
    await user.click(await screen.findByRole('button', { name: 'Rate & Tariff' }));
    const supplyLine = await screen.findByText(/Supply:/i);
    expect(supplyLine).toHaveTextContent(/Community Choice Aggregation \(CCA\)/i);

    // Recompute happened via analysis refresh (second call).
    expect(vi.mocked(analysisApi.getAnalysisResultsV1).mock.calls.length).toBe(2);
  });
});

