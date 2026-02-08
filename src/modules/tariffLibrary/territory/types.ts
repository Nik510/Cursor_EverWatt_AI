import type { CaTariffUtility } from '../ca/sources';

/**
 * Service territory scaffolding (structure only).
 *
 * v0 intentionally avoids geospatial logic; this exists to anchor future
 * "applicability" metadata and audit language without implying correctness.
 */
export type ServiceTerritoryV0 = {
  utility: CaTariffUtility;
  territoryId: string;
  description: string;
  /** Free-text hint (zip/county/city/etc). Not machine-interpreted in v0. */
  geoHint?: string;
  notes?: string;
};

/**
 * Minimal CA seed list (IDs are stable placeholders; expand later).
 */
export const CA_SERVICE_TERRITORIES_V0: ServiceTerritoryV0[] = [
  {
    utility: 'PGE',
    territoryId: 'PGE_CA',
    description: 'PG&E electric service territory (CA) — placeholder, not geo-validated.',
    geoHint: 'Northern and Central California (general)',
  },
  {
    utility: 'SCE',
    territoryId: 'SCE_CA',
    description: 'SCE electric service territory (CA) — placeholder, not geo-validated.',
    geoHint: 'Southern California (general)',
  },
  {
    utility: 'SDGE',
    territoryId: 'SDGE_CA',
    description: 'SDG&E electric service territory (CA) — placeholder, not geo-validated.',
    geoHint: 'San Diego County / South Orange County (general)',
  },
];

