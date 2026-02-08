export type CaTariffUtility = 'PGE' | 'SCE' | 'SDGE';
export type CaTariffSourceType = 'tariff_index' | 'tariff_book' | 'rate_schedule_page';

export type CaTariffSourceV0 = {
  utility: CaTariffUtility;
  sourceType: CaTariffSourceType;
  url: string;
  notes?: string;
  parser: 'html_index_v0';
};

/**
 * Centralized registry of CA tariff/rate schedule sources (v0).
 *
 * v0 uses placeholder URLs where needed; keep these centralized so ingestion is easy to update.
 */
export const CA_TARIFF_SOURCES_V0: CaTariffSourceV0[] = [
  {
    utility: 'PGE',
    sourceType: 'tariff_index',
    url: 'https://www.pge.com/tariffs/en.html',
    notes: 'PG&E tariff book index (rate schedule PDFs with codes in filenames).',
    parser: 'html_index_v0',
  },
  {
    utility: 'SCE',
    sourceType: 'tariff_index',
    url: 'https://www.sce.com/regulatory/tariff-books',
    notes: 'Placeholder: SCE tariff books index.',
    parser: 'html_index_v0',
  },
  {
    utility: 'SDGE',
    sourceType: 'tariff_index',
    url: 'https://scg-uofa-api-prd-hzczb4hja0g6dcfv.a03.azurefd.net/scg-uofa-wpubtm-prd/tariffs?bookId=ELEC&sectId=ELEC-SCHEDS&utilId=SDGE',
    notes: 'SDG&E tariffs API (JSON list of schedule IDs and names).',
    parser: 'html_index_v0',
  },
];

