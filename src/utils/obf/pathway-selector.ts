import type { PGEOBFPathwayType } from '../../data/pge/pge-obf-pathways';

export type ProjectScope = 'single-measure' | 'multiple-measures' | 'whole-building';
export type YesNo = 'yes' | 'no' | 'unknown';

export interface PathwaySelectorInput {
  scope: ProjectScope;
  onPrescriptiveList: YesNo;
  hasIntervalData: YesNo;
  wantsInteractiveEffects: YesNo;
}

/**
 * Deterministic pathway recommender (PG&E OBF)
 * - Prefer NMEC when whole-building or interactive effects AND interval data is available
 * - Prefer Prescriptive when clearly on prescriptive list and the project is straightforward
 * - Otherwise choose Custom
 */
export function recommendPgeObfPathway(input: PathwaySelectorInput): PGEOBFPathwayType {
  if (input.scope === 'whole-building' || input.wantsInteractiveEffects === 'yes') {
    if (input.hasIntervalData === 'yes') return 'site-specific-nmec';
    return 'custom';
  }

  if (input.scope === 'single-measure') {
    if (input.onPrescriptiveList === 'yes') return 'prescriptive';
    return 'custom';
  }

  // multiple-measures
  if (input.onPrescriptiveList === 'yes' && input.hasIntervalData !== 'yes') return 'prescriptive';
  if (input.hasIntervalData === 'yes' && input.wantsInteractiveEffects !== 'no') return 'site-specific-nmec';
  return 'custom';
}


