// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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

function renderAt(projectId = 'demo') {
  return render(
    <MemoryRouter initialEntries={[`/analysis/v1/${projectId}`]}>
      <Routes>
        <Route path="/analysis/v1/:projectId" element={<AnalysisResultsV1Page />} />
        <Route path="/project-builder/:projectId/billing" element={<BillingIntakePlaceholder />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AnalysisResultsV1Page supplyStructure card', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it('shows Supply: Unknown + reason code when bill inputs are absent', async () => {
    const user = userEvent.setup();

    vi.mocked(analysisApi.getAnalysisResultsV1).mockResolvedValue({
      success: true,
      project: { name: 'Test Project' },
      workflow: {
        utility: {
          inputs: {},
          insights: {
            rateFit: { status: 'unknown', because: [], alternatives: [] },
          },
        },
        battery: { gate: { status: 'unknown', because: [] } },
      },
      summary: { json: {}, markdown: '' },
    } as any);

    renderAt('demo');

    // Switch into the Rate & Tariff context (card should only be visible there).
    await user.click(await screen.findByRole('button', { name: 'Rate & Tariff' }));

    expect(await screen.findByText(/Supply:\s*Unknown/i)).toBeInTheDocument();
    expect(screen.getByText(/Reason code:/i)).toBeInTheDocument();
    expect(screen.getByText(analysisApi.SupplyStructureWarningCodesV1.MISSING_INPUT)).toBeInTheDocument();
    expect(screen.getByText(/Requires billing records or parsed bill PDF text to infer supply structure\./i)).toBeInTheDocument();

    const cta = screen.getByRole('button', { name: /Add bill PDF \/ billing records/i });
    expect(cta).toBeInTheDocument();
    await user.click(cta);
    expect(await screen.findByText(/Billing intake/i)).toBeInTheDocument();
    expect(screen.getByText(/Paste bill text \(from PDF\)/i)).toBeInTheDocument();
  });

  it('shows inferred supply structure when insights include supplyStructure', async () => {
    const user = userEvent.setup();

    vi.mocked(analysisApi.getAnalysisResultsV1).mockResolvedValue({
      success: true,
      project: { name: 'Test Project' },
      workflow: {
        utility: {
          inputs: { billingRecords: [{ any: 'shape' }] },
          insights: {
            rateFit: { status: 'unknown', because: [], alternatives: [] },
            supplyStructure: { supplyType: 'CCA', confidence: 0.9, because: ['PDF contains CCA'], evidence: { source: 'bill_records' } },
          },
        },
        battery: { gate: { status: 'unknown', because: [] } },
      },
      summary: { json: {}, markdown: '' },
    } as any);

    renderAt('demo');

    await user.click(await screen.findByRole('button', { name: 'Rate & Tariff' }));

    const supplyLine = await screen.findByText(/Supply:/i);
    expect(supplyLine).toHaveTextContent(/Community Choice Aggregation \(CCA\)/i);
    expect(screen.queryByText(analysisApi.SupplyStructureWarningCodesV1.MISSING_INPUT)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add bill PDF \/ billing records/i })).not.toBeInTheDocument();
  });

  it('renders Truth Panel sections and disables source link when invalid', async () => {
    const user = userEvent.setup();

    vi.mocked(analysisApi.getAnalysisResultsV1).mockResolvedValue({
      success: true,
      project: { name: 'Test Project' },
      workflow: {
        utility: {
          inputs: {
            currentRate: { utility: 'PGE', rateCode: 'A-1', capturedAt: '2024-01-01T00:00:00Z' },
            billingRecords: [{ any: 'shape' }],
            billPdfText: 'PG&E\\nRate Schedule: B-19\\n',
          },
          insights: {
            rateFit: { status: 'unknown', because: [], alternatives: [] },
            tariffLibrary: {
              snapshotVersionTag: '2024-01-01',
              snapshotCapturedAt: '2024-01-01T00:00:00Z',
              rateMetadata: {
                rateCode: 'A-1',
                sourceUrl: 'ftp://invalid-link',
                sourceTitle: 'Bad URL',
                effectiveStatus: 'active',
              },
            },
            supplyStructure: { supplyType: 'bundled', confidence: 0.8, because: ['deterministic'], evidence: { source: 'rate_context' } },
            billPdfTariffLibraryMatch: {
              commodity: 'electric',
              snapshotCapturedAt: '2026-02-05T12:00:00.000Z',
              warnings: ['BILL_TARIFF_AMBIGUOUS'],
              candidates: [
                { rateCode: 'B-19', score: 0.91, reason: 'Collapsed rateCode startsWith wanted.', sourceUrl: 'https://example.com/B-19', sourceTitle: 'B-19' },
                { rateCode: 'B-20', score: 0.82, reason: 'Collapsed rateCode contains wanted.', sourceUrl: 'https://example.com/B-20', sourceTitle: 'B-20' },
              ],
            },
            missingInfo: [
              { id: 'm1', severity: 'medium', category: 'billing', description: 'Missing billing periods' },
            ],
          },
        },
        battery: { gate: { status: 'unknown', because: [] } },
      },
      summary: { json: {}, markdown: '' },
    } as any);

    renderAt('demo');

    await user.click(await screen.findByRole('button', { name: 'Rate & Tariff' }));

    expect(await screen.findByText(/Truth Panel/i)).toBeInTheDocument();
    expect(screen.getByText(/Tariff selection/i)).toBeInTheDocument();
    expect(screen.getByText(/Rate code:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Snapshot captured:/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Effective status:/i)).toBeInTheDocument();

    expect(screen.getByText(/From bill/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Utility:/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Rate Schedule:/i)).toBeInTheDocument();
    expect(screen.getByText(/PG&E/i)).toBeInTheDocument();
    expect(screen.getAllByText(/B-19/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Library match/i)).toBeInTheDocument();
    expect(screen.getByText(/BILL_TARIFF_AMBIGUOUS/i)).toBeInTheDocument();
    expect(screen.getByText(/Candidates/i)).toBeInTheDocument();

    const sourceButton = screen.getByRole('button', { name: /Open source/i });
    expect(sourceButton).toBeDisabled();
    expect(sourceButton).toHaveAttribute('title', expect.stringMatching(/SOURCE_LINK_(INVALID|MISSING)/));

    expect(await screen.findByText(/Billing engine audit/i)).toBeInTheDocument();
    const missingInfoLine = screen.queryByText(/Missing billing periods/i) || screen.queryByText(/No billing-engine missing info/i);
    expect(missingInfoLine).not.toBeNull();
  });
});

