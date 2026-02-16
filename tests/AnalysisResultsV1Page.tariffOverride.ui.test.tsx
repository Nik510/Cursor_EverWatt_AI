// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

function renderAt(projectId = 'p_test') {
  return render(
    <MemoryRouter initialEntries={[`/analysis/v1/${projectId}`]}>
      <Routes>
        <Route path="/analysis/v1/:projectId" element={<AnalysisResultsV1Page />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AnalysisResultsV1Page tariff override apply/undo', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('click apply -> PATCH called -> shows Applied badge', async () => {
    const user = userEvent.setup();
    const projectId = 'p_test';

    vi.mocked(analysisApi.getAnalysisResultsV1)
      .mockResolvedValueOnce({
        success: true,
        project: { id: projectId, name: 'Test Project' },
        workflow: {
          utility: {
            inputs: { billPdfText: 'PG&E\nRate Schedule: B-19\n', currentRate: { utility: 'PGE', rateCode: 'A-1' } },
            insights: {
              rateFit: { status: 'unknown', because: [], alternatives: [] },
              billPdfTariffTruth: { utilityHint: 'PG&E', rateScheduleText: 'B-19', evidence: { source: 'bill_pdf', matchedText: ['Rate Schedule: B-19'] }, warnings: [] },
              billPdfTariffLibraryMatch: {
                commodity: 'electric',
                utilityId: 'PGE',
                snapshotVersionTag: '2026-02-05T1200Z',
                snapshotCapturedAt: '2026-02-05T12:00:00.000Z',
                resolved: { rateCode: 'B-19', matchType: 'EXACT', sourceUrl: 'https://example.com/B-19', sourceTitle: 'B-19' },
              },
            },
          },
          battery: { gate: { status: 'unknown', because: [] } },
        },
        summary: { json: {}, markdown: '' },
      } as any)
      .mockResolvedValueOnce({
        success: true,
        project: { id: projectId, name: 'Test Project' },
        workflow: {
          utility: {
            inputs: {
              billPdfText: 'PG&E\nRate Schedule: B-19\n',
              currentRate: { utility: 'PGE', rateCode: 'B-19' },
              tariffOverrideV1: {
                schemaVersion: 1,
                commodity: 'electric',
                utilityId: 'PGE',
                snapshotId: '2026-02-05T1200Z',
                tariffIdOrRateCode: 'B-19',
                selectedBy: 'user',
                selectedAt: '2026-02-11T00:00:00.000Z',
                selectionSource: 'bill_pdf_match',
                matchType: 'EXACT',
              },
            },
            insights: {
              rateFit: { status: 'unknown', because: [], alternatives: [] },
              billPdfTariffLibraryMatch: {
                commodity: 'electric',
                utilityId: 'PGE',
                snapshotVersionTag: '2026-02-05T1200Z',
                snapshotCapturedAt: '2026-02-05T12:00:00.000Z',
                resolved: { rateCode: 'B-19', matchType: 'EXACT', sourceUrl: 'https://example.com/B-19', sourceTitle: 'B-19' },
              },
            },
          },
          battery: { gate: { status: 'unknown', because: [] } },
        },
        summary: { json: {}, markdown: '' },
      } as any);

    vi.mocked(apiRequest).mockResolvedValue({ success: true, project: { id: projectId } } as any);

    renderAt(projectId);

    await user.click(await screen.findByRole('button', { name: 'Rate & Tariff' }));
    const applyBtn = await screen.findByRole('button', { name: /Use this tariff/i });
    await user.click(applyBtn);

    expect(vi.mocked(apiRequest)).toHaveBeenCalled();
    const call = vi.mocked(apiRequest).mock.calls.find((c) => String((c as any)[0]?.method || 'GET') === 'PUT');
    expect(call).toBeTruthy();
    expect(String((call as any)[0].url)).toContain(`/api/projects/${encodeURIComponent(projectId)}`);
    const body = JSON.parse(String((call as any)[0].body));
    expect(body.patch.tariffOverrideV1.selectionSource).toBe('bill_pdf_match');
    expect(body.patch.tariffOverrideV1.matchType).toBe('EXACT');
    expect(body.patch.tariffOverrideV1.tariffIdOrRateCode).toBe('B-19');

    expect(await screen.findByText(/Applied \(user-selected\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Undo/i })).toBeInTheDocument();
  });

  it('click undo -> PATCH called -> Applied badge removed', async () => {
    const user = userEvent.setup();
    const projectId = 'p_test';

    vi.mocked(analysisApi.getAnalysisResultsV1)
      .mockResolvedValueOnce({
        success: true,
        project: { id: projectId, name: 'Test Project' },
        workflow: {
          utility: {
            inputs: {
              billPdfText: 'PG&E\nRate Schedule: B-19\n',
              currentRate: { utility: 'PGE', rateCode: 'B-19' },
              tariffOverrideV1: {
                schemaVersion: 1,
                commodity: 'electric',
                utilityId: 'PGE',
                snapshotId: '2026-02-05T1200Z',
                tariffIdOrRateCode: 'B-19',
                selectedBy: 'user',
                selectedAt: '2026-02-11T00:00:00.000Z',
                selectionSource: 'bill_pdf_match',
                matchType: 'EXACT',
              },
            },
            insights: {
              rateFit: { status: 'unknown', because: [], alternatives: [] },
              billPdfTariffLibraryMatch: {
                commodity: 'electric',
                utilityId: 'PGE',
                snapshotVersionTag: '2026-02-05T1200Z',
                snapshotCapturedAt: '2026-02-05T12:00:00.000Z',
                resolved: { rateCode: 'B-19', matchType: 'EXACT', sourceUrl: 'https://example.com/B-19', sourceTitle: 'B-19' },
              },
            },
          },
          battery: { gate: { status: 'unknown', because: [] } },
        },
        summary: { json: {}, markdown: '' },
      } as any)
      .mockResolvedValueOnce({
        success: true,
        project: { id: projectId, name: 'Test Project' },
        workflow: {
          utility: {
            inputs: { billPdfText: 'PG&E\nRate Schedule: B-19\n', currentRate: { utility: 'PGE', rateCode: 'A-1' } },
            insights: {
              rateFit: { status: 'unknown', because: [], alternatives: [] },
              billPdfTariffLibraryMatch: {
                commodity: 'electric',
                utilityId: 'PGE',
                snapshotVersionTag: '2026-02-05T1200Z',
                snapshotCapturedAt: '2026-02-05T12:00:00.000Z',
                resolved: { rateCode: 'B-19', matchType: 'EXACT', sourceUrl: 'https://example.com/B-19', sourceTitle: 'B-19' },
              },
            },
          },
          battery: { gate: { status: 'unknown', because: [] } },
        },
        summary: { json: {}, markdown: '' },
      } as any);

    vi.mocked(apiRequest).mockResolvedValue({ success: true, project: { id: projectId } } as any);

    renderAt(projectId);
    await user.click(await screen.findByRole('button', { name: 'Rate & Tariff' }));

    expect(await screen.findByText(/Applied \(user-selected\)/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Undo/i }));

    const putCalls = vi.mocked(apiRequest).mock.calls.filter((c) => String((c as any)[0]?.method || 'GET') === 'PUT');
    expect(putCalls.length).toBeGreaterThan(0);
    const last = putCalls[putCalls.length - 1] as any;
    const body = JSON.parse(String(last[0].body));
    expect(body.patch.tariffOverrideV1).toBeNull();

    expect(screen.queryByText(/Applied \(user-selected\)/i)).not.toBeInTheDocument();
  });
});

describe('AnalysisResultsV1Page bill intelligence panel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders facts, computed metrics, and deeper warnings', async () => {
    const user = userEvent.setup();
    vi.mocked(analysisApi.getAnalysisResultsV1).mockResolvedValueOnce({
      success: true,
      project: { id: 'p_bill', name: 'Bill Project' },
      workflow: {
        utility: {
          inputs: { billPdfText: 'Billing Period: 01/01/2026 - 01/31/2026\nTotal kWh: 1000\nAmount Due: $200\nPeak Demand kW: 50' },
          insights: {
            rateFit: { status: 'ok', because: [], alternatives: [] },
            billIntelligenceV1: {
              extractedFacts: {
                billingPeriod: {
                  startDateIso: '2026-01-01T00:00:00.000Z',
                  endDateIso: '2026-01-31T00:00:00.000Z',
                  days: 31,
                  source: 'bill_pdf',
                  evidence: { ruleId: 'billing_period_label', matchedText: 'Billing Period: 01/01/2026 - 01/31/2026', source: 'bill_pdf' },
                },
                totalKwh: { value: 1000, unit: 'kWh', source: 'bill_pdf', evidence: { ruleId: 'total_kwh_label', matchedText: 'Total kWh: 1000', source: 'bill_pdf' } },
                totalDollars: { value: 200, unit: 'USD', source: 'bill_pdf', evidence: { ruleId: 'total_dollars_label', matchedText: 'Amount Due: $200', source: 'bill_pdf' } },
              },
              derivedMetrics: {
                blendedRate: { value: 0.2, unit: 'USD_per_kWh', source: 'derived_math', confidence: 'derived', inputsUsed: ['totalDollars', 'totalKwh'] },
                avgDailyKwh: { value: 32.258, unit: 'kWh_per_day', source: 'derived_math', confidence: 'derived', inputsUsed: ['totalKwh', 'billingPeriod'] },
                demandFactorApprox: { value: 0.0268, unit: 'ratio', source: 'derived_math', confidence: 'derived', inputsUsed: ['avgKw', 'peakKw'] },
              },
              intervalInsightsV1: {
                available: false,
                reasons: [{ code: 'BILL_INTEL_INTERVAL_DATA_REQUIRED', reason: 'No interval points provided.' }],
              },
              weatherCorrelationV1: {
                available: false,
                signature: 'UNKNOWN',
                reasons: [{ code: 'BILL_INTEL_WEATHER_DATA_REQUIRED', reason: 'No interval points provided.' }],
              },
              warnings: [
                { code: 'BILL_INTEL_INTERVAL_DATA_REQUIRED', reason: 'needs interval data' },
                { code: 'BILL_INTEL_WEATHER_DATA_REQUIRED', reason: 'needs weather data' },
              ],
            },
          },
        },
        battery: { gate: { status: 'unknown', because: [] } },
      },
      summary: { json: {}, markdown: '' },
    } as any);

    renderAt('p_bill');
    await user.click(await screen.findByRole('button', { name: 'Rate & Tariff' }));

    expect(await screen.findByText(/Bill Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/Total kWh/i)).toBeInTheDocument();
    expect(screen.getByText(/1,000 kWh/i)).toBeInTheDocument();
    expect(screen.getByText(/Blended rate/i)).toBeInTheDocument();
    expect(screen.getByText(/0\.200/)).toBeInTheDocument();
    expect(screen.getByText(/BILL_INTEL_INTERVAL_DATA_REQUIRED/)).toBeInTheDocument();
    expect(screen.getByText(/BILL_INTEL_WEATHER_DATA_REQUIRED/)).toBeInTheDocument();
  });

  it('shows interval-derived insights when intervalInsightsV1 is available', async () => {
    const user = userEvent.setup();
    vi.mocked(analysisApi.getAnalysisResultsV1).mockResolvedValueOnce({
      success: true,
      project: { id: 'p_bill_intervals', name: 'Bill Project Intervals' },
      workflow: {
        utility: {
          inputs: { billPdfText: 'Total kWh: 1000' },
          insights: {
            rateFit: { status: 'ok', because: [], alternatives: [] },
            billIntelligenceV1: {
              extractedFacts: { totalKwh: { value: 1000, unit: 'kWh', source: 'bill_pdf', evidence: { ruleId: 'total_kwh_label', matchedText: 'Total kWh: 1000', source: 'bill_pdf' } } },
              derivedMetrics: {},
              intervalInsightsV1: {
                available: true,
                reasons: [],
                topHourOfDayKwh: { hourOfDay: 15, percentOfTotal: 0.3 },
                topHourOfDayKw: { hourOfDay: 15, value: 100 },
              },
              weatherCorrelationV1: { available: false, signature: 'UNKNOWN', reasons: [{ code: 'BILL_INTEL_WEATHER_DATA_MISSING_OAT', reason: 'No temperatureF values found.' }] },
              warnings: [],
            },
          },
        },
        battery: { gate: { status: 'unknown', because: [] } },
      },
      summary: { json: {}, markdown: '' },
    } as any);

    renderAt('p_bill_intervals');
    await user.click(await screen.findByRole('button', { name: 'Rate & Tariff' }));

    expect(await screen.findByText(/From intervals/i)).toBeInTheDocument();
    expect(screen.getByText(/Top kWh hour \(UTC\)/i)).toBeInTheDocument();
    expect(screen.getByText(/15 \(30\.0%\)/i)).toBeInTheDocument();
  });

  it('shows Unknown + reason code when interval insights are unavailable', async () => {
    const user = userEvent.setup();
    vi.mocked(analysisApi.getAnalysisResultsV1).mockResolvedValueOnce({
      success: true,
      project: { id: 'p_bill_no_intervals', name: 'Bill Project No Intervals' },
      workflow: {
        utility: {
          inputs: { billPdfText: 'Total kWh: 1000' },
          insights: {
            rateFit: { status: 'ok', because: [], alternatives: [] },
            billIntelligenceV1: {
              extractedFacts: { totalKwh: { value: 1000, unit: 'kWh', source: 'bill_pdf', evidence: { ruleId: 'total_kwh_label', matchedText: 'Total kWh: 1000', source: 'bill_pdf' } } },
              derivedMetrics: {},
              intervalInsightsV1: { available: false, reasons: [{ code: 'BILL_INTEL_INTERVAL_DATA_REQUIRED', reason: 'No interval points provided.' }] },
              weatherCorrelationV1: { available: false, signature: 'UNKNOWN', reasons: [{ code: 'BILL_INTEL_WEATHER_DATA_REQUIRED', reason: 'No interval points provided.' }] },
              warnings: [],
            },
          },
        },
        battery: { gate: { status: 'unknown', because: [] } },
      },
      summary: { json: {}, markdown: '' },
    } as any);

    renderAt('p_bill_no_intervals');
    await user.click(await screen.findByRole('button', { name: 'Rate & Tariff' }));

    const header = await screen.findByText(/From intervals/i);
    const card = header.parentElement as HTMLElement;
    expect(card).toBeTruthy();
    expect(within(card).getByText(/Unknown/i)).toBeInTheDocument();
    expect(within(card).getByText(/BILL_INTEL_INTERVAL_DATA_REQUIRED/)).toBeInTheDocument();
  });

  it('hides blended rate when dollars are missing', async () => {
    const user = userEvent.setup();
    vi.mocked(analysisApi.getAnalysisResultsV1).mockResolvedValueOnce({
      success: true,
      project: { id: 'p_bill_missing', name: 'Bill Project Missing' },
      workflow: {
        utility: {
          inputs: { billPdfText: 'Total kWh: 800' },
          insights: {
            rateFit: { status: 'ok', because: [], alternatives: [] },
            billIntelligenceV1: {
              extractedFacts: {
                totalKwh: { value: 800, unit: 'kWh', source: 'bill_pdf', evidence: { ruleId: 'total_kwh_label', matchedText: 'Total kWh: 800', source: 'bill_pdf' } },
              },
              derivedMetrics: {},
              intervalInsightsV1: { available: false, reasons: [{ code: 'BILL_INTEL_INTERVAL_DATA_REQUIRED', reason: 'No interval points provided.' }] },
              weatherCorrelationV1: { available: false, signature: 'UNKNOWN', reasons: [{ code: 'BILL_INTEL_WEATHER_DATA_REQUIRED', reason: 'No interval points provided.' }] },
              warnings: [
                { code: 'BILL_INTEL_MISSING_TOTAL_DOLLARS', reason: 'no dollars' },
                { code: 'BILL_INTEL_INTERVAL_DATA_REQUIRED', reason: 'needs interval data' },
                { code: 'BILL_INTEL_WEATHER_DATA_REQUIRED', reason: 'needs weather data' },
              ],
            },
          },
        },
        battery: { gate: { status: 'unknown', because: [] } },
      },
      summary: { json: {}, markdown: '' },
    } as any);

    renderAt('p_bill_missing');
    await user.click(await screen.findByRole('button', { name: 'Rate & Tariff' }));

    expect(await screen.findByText(/Bill Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/Total kWh/i)).toBeInTheDocument();
    expect(screen.queryByText(/Blended rate/i)).not.toBeInTheDocument();
  });
});

