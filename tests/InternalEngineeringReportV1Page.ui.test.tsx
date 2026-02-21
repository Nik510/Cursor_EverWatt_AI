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
import { InternalEngineeringReportV1Page } from '../src/pages/projectBuilder/InternalEngineeringReportV1Page';

function renderAt(projectId = 'p_test') {
  return render(
    <MemoryRouter initialEntries={[`/project-builder/${projectId}/reports/internal-engineering`]}>
      <Routes>
        <Route path="/project-builder/:projectId/reports/internal-engineering" element={<InternalEngineeringReportV1Page />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('InternalEngineeringReportV1Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Minimal fetch mock for HTML preview.
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes('.html')) {
        return { ok: true, status: 200, text: async () => '<html><body>ok</body></html>' } as any;
      }
      return { ok: true, status: 200, text: async () => '' } as any;
    });
  });

  it('generates a new revision and loads HTML preview', async () => {
    const user = userEvent.setup();
    const projectId = 'p_test';

    vi.mocked(analysisApi.getAnalysisResultsV1).mockResolvedValue({
      success: true,
      project: { id: projectId, name: 'Test' },
      workflow: { utility: { inputs: {}, insights: { rateFit: { status: 'unknown', because: [], alternatives: [] } } } },
      summary: { json: { ok: true }, markdown: 'x' },
    } as any);

    vi.mocked(apiRequest).mockImplementation(async (args: any) => {
      const url = String(args?.url || '');
      if (url.endsWith(`/api/projects/${encodeURIComponent(projectId)}/reports/internal-engineering`) && (!args?.method || args.method === 'GET')) {
        return { success: true, revisions: [] } as any;
      }
      if (url.endsWith(`/api/projects/${encodeURIComponent(projectId)}/reports/internal-engineering`) && args?.method === 'POST') {
        return {
          success: true,
          revision: { id: 'rev1', title: 't', createdAt: '2026-01-01T00:00:00.000Z' },
          revisions: [{ id: 'rev1', title: 't', createdAt: '2026-01-01T00:00:00.000Z' }],
        } as any;
      }
      throw new Error(`Unexpected apiRequest: ${String(args?.method || 'GET')} ${url}`);
    });

    renderAt(projectId);

    await user.click(await screen.findByRole('button', { name: /Generate new revision/i }));

    // Should have a history item and an iframe preview.
    expect(await screen.findByText(/History/i)).toBeInTheDocument();
    const iframe = await screen.findByTitle('internal-engineering-report');
    expect(iframe).toBeInTheDocument();
    expect(String((iframe as any).getAttribute('srcdoc') || '')).toContain('ok');
  });
});

