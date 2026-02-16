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

import * as analysisApi from '../src/shared/api/analysisResults';
import { AnalysisResultsV1Page } from '../src/pages/AnalysisResultsV1Page';
import { BillingIntakePlaceholder } from '../src/pages/projectBuilder/BillingIntakePlaceholder';

function renderAt(projectId = 'p_test') {
  return render(
    <MemoryRouter initialEntries={[`/analysis/v1/${projectId}`]}>
      <Routes>
        <Route path="/analysis/v1/:projectId" element={<AnalysisResultsV1Page />} />
        <Route path="/project-builder/:projectId/billing" element={<BillingIntakePlaceholder />} />
        <Route path="/utilities/tariffs-ca" element={<div>Tariff Browser CA</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AnalysisResultsV1Page missingInfo action links', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders action links and targets are correct', async () => {
    const user = userEvent.setup();
    const projectId = 'p_test';

    // Make scroll observable in jsdom.
    const scrollSpy = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Element.prototype as any).scrollIntoView = scrollSpy;

    vi.mocked(analysisApi.getAnalysisResultsV1).mockResolvedValue({
      success: true,
      project: { id: projectId, name: 'Test Project' },
      workflow: {
        requiredInputsMissing: ['Current tariff/rate code required to evaluate rate fit'],
        utility: {
          inputs: {},
          insights: {
            rateFit: { status: 'unknown', because: [], alternatives: [] },
            missingInfo: [
              { id: 'billing.billPdfText.missing', severity: 'info', category: 'tariff', description: 'Bill PDF text is missing.' },
              { id: 'tariff.currentRateCode.missing', severity: 'blocking', category: 'tariff', description: 'Current tariff/rate code is missing.' },
              { id: 'tariff.snapshot.missing', severity: 'warning', category: 'tariff', description: 'Tariff snapshots not loaded.' },
              { id: 'some.other.missing', severity: 'info', category: 'tariff', description: 'Something else is missing.' },
            ],
          },
        },
        battery: { gate: { status: 'unknown', because: [] } },
      },
      summary: { json: {}, markdown: '' },
    } as any);

    renderAt(projectId);

    await user.click(await screen.findByRole('button', { name: 'Rate & Tariff' }));

    // Billing engine audit section renders actions.
    const addBill = await screen.findByRole('button', { name: /Add bill text/i });
    expect(addBill).toBeInTheDocument();

    const selectTariff = await screen.findByRole('button', { name: /Select tariff/i });
    expect(selectTariff).toBeInTheDocument();

    const openTariffs = await screen.findByRole('button', { name: /Open tariff library/i });
    expect(openTariffs).toBeInTheDocument();

    // Unrecognized items show Not yet supported.
    expect(await screen.findAllByText(/Not yet supported/i)).not.toHaveLength(0);

    // Click Select tariff => scrollIntoView is invoked (target is the From bill section).
    await user.click(selectTariff);
    expect(scrollSpy).toHaveBeenCalled();

    // Click Add bill text => navigates to Billing intake page.
    await user.click(addBill);
    expect(await screen.findByText(/Billing intake/i)).toBeInTheDocument();

    // Re-render and verify tariff library navigation (route change unmounts the page).
    renderAt(projectId);
    await user.click(await screen.findByRole('button', { name: 'Rate & Tariff' }));
    await user.click(await screen.findByRole('button', { name: /Open tariff library/i }));
    expect(await screen.findByText(/Tariff Browser CA/i)).toBeInTheDocument();
  });
});

