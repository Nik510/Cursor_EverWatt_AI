import type { CaGasTariffUtility } from '../types';

export type CaGasTariffSourceType = 'tariff_index' | 'tariff_book' | 'rate_schedule_page';

export type CaGasTariffSourceV0 = {
  utility: CaGasTariffUtility;
  sourceType: CaGasTariffSourceType;
  url: string;
  notes?: string;
  parser: 'html_index_v0';
};

/**
 * Centralized registry of CA gas tariff sources (v0).
 *
 * These are best-effort automated indices. If any source becomes unstable,
 * ingestion should fall back to seed snapshots and warnings-first output.
 */
export const CA_GAS_TARIFF_SOURCES_V0: CaGasTariffSourceV0[] = [
  {
    utility: 'PGE',
    sourceType: 'tariff_index',
    url: 'https://www.pge.com/tariffs/en.html',
    notes: 'PG&E tariff book index (contains both ELEC_* and GAS_* schedule PDFs).',
    parser: 'html_index_v0',
  },
  {
    utility: 'SDGE',
    sourceType: 'tariff_index',
    url: 'https://tariffsprd.sdge.com/sdge/tariffs/content/?utilId=SDGE&bookId=GAS&sectId=G-SCHEDS',
    notes: 'SDG&E tariff portal (gas schedules section).',
    parser: 'html_index_v0',
  },
  {
    utility: 'SOCALGAS',
    sourceType: 'tariff_index',
    url: 'https://tariffsprd.socalgas.com/scg/tariffs/content/?utilId=SCG&bookId=GAS&sectId=G-SCHEDS',
    notes: 'SoCalGas tariff portal (gas schedules section).',
    parser: 'html_index_v0',
  },
];

