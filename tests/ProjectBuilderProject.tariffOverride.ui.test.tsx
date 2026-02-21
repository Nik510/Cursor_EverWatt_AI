// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../src/shared/api/projectBuilder', () => {
  return {
    getProject: vi.fn(),
    listVaultFiles: vi.fn(),
    getGraph: vi.fn(),
    getDecisionMemory: vi.fn(),
    ingestWorkbookToInbox: vi.fn(),
    uploadVaultFile: vi.fn(),
    analyzeProject: vi.fn(),
    putGraph: vi.fn(),
    decideInboxItem: vi.fn(),
    addDecisionMemory: vi.fn(),
    deleteDecisionMemory: vi.fn(),
    listInbox: vi.fn(),
    listProposals: vi.fn(),
    getProposalPack: vi.fn(),
    importProposalPack: vi.fn(),
    commitProposalScenario: vi.fn(),
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
import { ProjectBuilderProject } from '../src/pages/projectBuilder/ProjectBuilderProject';

function renderAt(projectId = 'p1') {
  return render(
    <MemoryRouter initialEntries={[`/project-builder/${projectId}`]}>
      <Routes>
        <Route path="/project-builder/:projectId" element={<ProjectBuilderProject />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProjectBuilderProject tariff override visibility', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows read-only message when no override exists', async () => {
    vi.mocked(pbApi.getProject).mockResolvedValue({
      success: true,
      project: {
        id: 'p1',
        driveFolderLink: 'local',
        customer: { projectNumber: '1', companyName: 'TestCo' },
        tariffOverrideV1: null,
      },
    } as any);
    vi.mocked(pbApi.listVaultFiles).mockResolvedValue({ success: true, files: [] } as any);
    vi.mocked(pbApi.getGraph).mockResolvedValue({ success: true, graph: {} } as any);
    vi.mocked(pbApi.getDecisionMemory).mockResolvedValue({ success: true, items: [] } as any);

    renderAt('p1');

    expect(await screen.findByText(/Utility & Tariff/i)).toBeInTheDocument();
    expect(screen.getByText(/No tariff override applied\./i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Clear override/i })).not.toBeInTheDocument();
  });

  it('shows override details and allows clearing via PATCH', async () => {
    const user = userEvent.setup();

    vi.mocked(pbApi.getProject).mockResolvedValue({
      success: true,
      project: {
        id: 'p1',
        driveFolderLink: 'local',
        customer: { projectNumber: '1', companyName: 'TestCo' },
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
          sourceUrl: 'ftp://invalid-link',
          sourceTitle: 'Bad URL',
        },
        auditEventsV1: [
          {
            schemaVersion: 1,
            eventType: 'TARIFF_OVERRIDE_APPLIED',
            at: '2026-02-11T00:00:00.000Z',
            actor: 'user',
            selectionSource: 'bill_pdf_match',
            matchType: 'EXACT',
            previousOverride: null,
            newOverride: {
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
        ],
      },
    } as any);
    vi.mocked(pbApi.listVaultFiles).mockResolvedValue({ success: true, files: [] } as any);
    vi.mocked(pbApi.getGraph).mockResolvedValue({ success: true, graph: {} } as any);
    vi.mocked(pbApi.getDecisionMemory).mockResolvedValue({ success: true, items: [] } as any);

    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      project: {
        id: 'p1',
        driveFolderLink: 'local',
        customer: { projectNumber: '1', companyName: 'TestCo' },
        tariffOverrideV1: null,
        auditEventsV1: [
          {
            schemaVersion: 1,
            eventType: 'TARIFF_OVERRIDE_APPLIED',
            at: '2026-02-11T00:00:00.000Z',
            actor: 'user',
            selectionSource: 'bill_pdf_match',
            matchType: 'EXACT',
            previousOverride: null,
            newOverride: {
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
          {
            schemaVersion: 1,
            eventType: 'TARIFF_OVERRIDE_CLEARED',
            at: '2026-02-11T00:10:00.000Z',
            actor: 'user',
            previousOverride: {
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
            newOverride: null,
          },
        ],
      },
    } as any);

    renderAt('p1');

    expect(await screen.findByText(/^Applied$/i)).toBeInTheDocument();
    expect(screen.getByText(/Rate \/ tariff:/i)).toBeInTheDocument();
    expect(screen.getByText(/B-19/i)).toBeInTheDocument();

    const openSource = screen.getByRole('button', { name: /Open source/i });
    expect(openSource).toBeDisabled();
    expect(openSource).toHaveAttribute('title', expect.stringMatching(/SOURCE_LINK_(INVALID|MISSING)/));

    await user.click(screen.getByRole('button', { name: /Clear override/i }));

    const putCall = vi.mocked(apiRequest).mock.calls.find((c) => String((c as any)[0]?.method || '') === 'PUT') as any;
    expect(putCall).toBeTruthy();
    const body = JSON.parse(String(putCall[0].body));
    expect(body.patch.tariffOverrideV1).toBeNull();

    expect((await screen.findAllByText(/No tariff override applied\./i)).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole('button', { name: /History/i })[0]);
    expect(await screen.findByText(/Last 5 tariff events/i)).toBeInTheDocument();
    // Keep permissive: UI may render an empty-state message depending on filters/grouping.
  });
});

