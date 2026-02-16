// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../src/shared/api/tariffs', () => ({
  getLatestCaTariffs: vi.fn(),
  getLatestCaGasTariffs: vi.fn(),
  getCaTariffHistory: vi.fn(),
  getCaTariffSnapshot: vi.fn(),
  getCaGasTariffHistory: vi.fn(),
  getCaGasTariffSnapshot: vi.fn(),
}));

vi.mock('../src/shared/api/utilities', () => ({
  getUtilitiesCaRegistry: vi.fn(),
}));

vi.mock('../src/shared/api/programs', () => ({
  getLatestCaPrograms: vi.fn(),
}));

import * as tariffsApi from '../src/shared/api/tariffs';
import * as utilitiesApi from '../src/shared/api/utilities';
import * as programsApi from '../src/shared/api/programs';
import { TariffBrowserCA } from '../src/pages/TariffBrowserCA';

function renderAtTariffsCaRoute() {
  return render(
    <MemoryRouter initialEntries={['/utilities/tariffs-ca']}>
      <Routes>
        <Route path="/utilities/tariffs-ca" element={<TariffBrowserCA />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(programsApi.getLatestCaPrograms).mockResolvedValue({
    utilities: [],
  } as any);

  vi.mocked(utilitiesApi.getUtilitiesCaRegistry).mockResolvedValue({
    utilities: [{ state: 'CA', utilityKey: 'PGE', displayName: 'Pacific Gas & Electric', commodities: ['ELECTRIC'] }],
  } as any);

  vi.mocked(tariffsApi.getLatestCaTariffs).mockResolvedValue({
    utilities: [
      {
        utility: 'PGE',
        latestSnapshot: { versionTag: 'v1', capturedAt: '2026-02-01T00:00:00Z', rateCount: 2, isStale: false, diffSummary: null },
        rates: [],
      },
    ],
  } as any);

  vi.mocked(tariffsApi.getCaTariffHistory).mockResolvedValue({
    snapshots: [{ versionTag: 'v1', capturedAt: '2026-02-01T00:00:00Z', rateCount: 2, isStale: false, diffSummary: null, sourceFingerprints: [] }],
  } as any);

  vi.mocked(tariffsApi.getCaTariffSnapshot).mockImplementation(async ({ utility, versionTag }: any) => {
    expect(String(utility)).toBe('PGE');
    expect(String(versionTag)).toBe('v1');
    return {
      isStale: false,
      snapshot: {
        utility: 'PGE',
        versionTag: 'v1',
        capturedAt: '2026-02-01T00:00:00Z',
        rates: [
          {
            rateCode: 'A-1',
            sourceTitle: 'Schedule A-1',
            sourceUrl: 'https://example.com/a1.pdf',
            customerClass: 'commercial',
            customerClassSource: 'pdf',
            voltage: 'secondary',
            voltageSource: 'pdf',
            eligibilityNotes: 'Non-res only',
            eligibilitySource: 'pdf',
            effectiveStart: null,
            effectiveEnd: null,
            effectiveSource: 'unknown',
            popularityTier: 'featured',
            isEverWattCanonicalBusiness: true,
            isBusinessRelevant: true,
            sectorGroup: 'non_residential',
            sectorV12: 'commercial',
            customerSegmentV12: 'commercial',
            sectorEvidenceV12: { ruleId: 'R_V12_001' },
          },
          {
            rateCode: 'B-1',
            sourceTitle: 'Schedule B-1',
            sourceUrl: '',
            customerClass: 'commercial',
            eligibilityNotes: 'Non-res only',
            popularityTier: 'featured',
            isEverWattCanonicalBusiness: true,
            isBusinessRelevant: true,
            sectorGroup: 'non_residential',
          },
        ],
      },
    } as any;
  });
});

afterEach(() => {
  cleanup();
});

describe('TariffBrowserCA interactions', () => {
  it('utility cards are clickable and keyboard-activatable', async () => {
    const user = userEvent.setup();
    renderAtTariffsCaRoute();

    const pgeCard = await screen.findByRole('button', { name: /select utility pge/i });
    expect(pgeCard).toHaveAttribute('aria-pressed', 'false');

    await user.click(pgeCard);
    expect(pgeCard).toHaveAttribute('aria-pressed', 'true');

    // Deterministic UI state change: snapshot history section becomes visible.
    expect(await screen.findByText(/Snapshot history \(PGE\)/)).toBeInTheDocument();

    // Keyboard activation should keep it selected.
    pgeCard.focus();
    await user.keyboard('{Enter}');
    expect(pgeCard).toHaveAttribute('aria-pressed', 'true');
  });

  it('row click opens details panel, Open link does not', async () => {
    const user = userEvent.setup();
    renderAtTariffsCaRoute();

    const pgeCard = await screen.findByRole('button', { name: /select utility pge/i });
    await user.click(pgeCard);

    // Wait for snapshot + rates list to load.
    await screen.findByText(/Snapshot history \(PGE\)/);
    const a1Cell = await screen.findByText('A-1');
    const a1Row = a1Cell.closest('tr');
    expect(a1Row).toBeTruthy();

    // Clicking Open should not open the details panel (stopPropagation + row guard).
    const openLink = within(a1Row as HTMLElement).getByRole('link', { name: /open/i });
    expect(openLink).toHaveAttribute('href', 'https://example.com/a1.pdf');
    expect(openLink).toHaveAttribute('target', '_blank');
    await user.click(openLink);
    expect(screen.queryByText('Rate details')).not.toBeInTheDocument();

    // Clicking the row (non-interactive cell) opens details panel.
    await user.click(a1Cell);
    expect(await screen.findByText('Rate details')).toBeInTheDocument();
    expect(screen.getByText(/Sector \(v1\.2\):/)).toBeInTheDocument();
    expect(screen.getAllByText(/rule R_V12_001/).length).toBeGreaterThan(0);
  });

  it('rows without a source URL show disabled Open with a visible reason code', async () => {
    const user = userEvent.setup();
    renderAtTariffsCaRoute();

    const pgeCard = await screen.findByRole('button', { name: /select utility pge/i });
    await user.click(pgeCard);

    await screen.findByText(/Snapshot history \(PGE\)/);
    const b1Cell = await screen.findByText('B-1');
    const b1Row = b1Cell.closest('tr');
    expect(b1Row).toBeTruthy();

    // Disabled state: "Open" is not a link, and reason code is visible.
    expect(within(b1Row as HTMLElement).queryByRole('link', { name: /open/i })).toBeNull();
    expect(within(b1Row as HTMLElement).getByText('Open')).toBeInTheDocument();
    expect(within(b1Row as HTMLElement).getByText('SOURCE_LINK_MISSING')).toBeInTheDocument();
  });
});

