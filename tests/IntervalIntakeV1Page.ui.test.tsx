// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../src/shared/api/projectBuilder', () => {
  return {
    uploadVaultFile: vi.fn(),
  };
});

vi.mock('../src/shared/api/client', async () => {
  const actual: any = await vi.importActual('../src/shared/api/client');
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

import * as pbApi from '../src/shared/api/projectBuilder';
import { apiRequest } from '../src/shared/api/client';
import { IntervalIntakeV1Page } from '../src/pages/projectBuilder/IntervalIntakeV1Page';

function renderAt(projectId = 'p_test') {
  return render(
    <MemoryRouter initialEntries={[{ pathname: `/project-builder/${projectId}/intake/intervals`, state: { returnTo: `/analysis/v1/${projectId}` } } as any]}>
      <Routes>
        <Route path="/project-builder/:projectId/intake/intervals" element={<IntervalIntakeV1Page />} />
        <Route path="/analysis/v1/:projectId" element={<div>Analysis</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('IntervalIntakeV1Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('uploads CSV, previews, and saves to project.telemetry.intervalElectricV1/meta', async () => {
    const user = userEvent.setup();
    const projectId = 'p_test';

    const csvText = [
      'Service Agreement,Start Date Time,End Date Time,Usage,Usage Unit,Peak Demand,Demand Unit,Avg. Temperature,Temperature Unit',
      '123,1/1/2026 0:00,1/1/2026 0:15,1.500,KWH,6.000,KW,55,FAHRENHEIT',
      '123,1/1/2026 0:15,1/1/2026 0:30,1.200,KWH,4.800,KW,55,FAHRENHEIT',
    ].join('\n');

    vi.mocked(pbApi.uploadVaultFile as any).mockResolvedValue({
      success: true,
      file: { id: 'vf1', filename: 'interval.csv', contentType: 'text/csv', storageKey: 'k1', uploadedAt: '2026-01-01T00:00:00.000Z' },
      project: { id: projectId },
    });

    vi.mocked(apiRequest).mockImplementation(async (args: any) => {
      const url = String(args?.url || '');
      if (url === `/api/projects/${encodeURIComponent(projectId)}` && (!args?.method || args.method === 'GET')) {
        return { success: true, project: { id: projectId, telemetry: {} } } as any;
      }
      if (url === `/api/projects/${encodeURIComponent(projectId)}` && args?.method === 'PUT') {
        const body = JSON.parse(String(args?.body || '{}'));
        const tel = body?.patch?.telemetry || {};
        expect(Array.isArray(tel.intervalElectricV1)).toBe(true);
        expect(tel.intervalElectricV1.length).toBe(2);
        expect(tel.intervalElectricMetaV1).toBeTruthy();
        expect(tel.intervalElectricMetaV1.source.kind).toBe('vaultFile');
        expect(tel.intervalElectricMetaV1.source.vaultFileId).toBe('vf1');
        return { success: true, project: { id: projectId, telemetry: tel } } as any;
      }
      throw new Error(`Unexpected apiRequest: ${String(args?.method || 'GET')} ${url}`);
    });

    renderAt(projectId);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    const file = new File([csvText], 'interval.csv', { type: 'text/csv' });
    await user.upload(fileInput, file);

    // Preview should show detected format.
    expect(await screen.findByText(/Parse preview/i)).toBeInTheDocument();
    expect(await screen.findByText(/pge_interval_csv_v1/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Save$/i }));

    expect(vi.mocked(pbApi.uploadVaultFile as any).mock.calls.length).toBe(1);
    // PUT called once for telemetry patch.
    expect(vi.mocked(apiRequest).mock.calls.some((c) => c?.[0]?.method === 'PUT')).toBe(true);
  });
});

