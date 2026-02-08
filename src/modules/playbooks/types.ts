import type { MeasureType } from '../measures/types';

export type PlaybookPriority = 'LOW' | 'MED' | 'HIGH';

export type PlaybookCondition = {
  sqftMin?: number;
  sqftMax?: number;
  scheduleBucket?: '24_7' | 'business_hours' | 'mixed' | 'unknown';
  /** Project Builder asset types required to be present (any-of). */
  systemAnyOf?: string[];
  /** Project Builder asset types required to be present (all-of). */
  systemAllOf?: string[];
};

export type PlaybookMeasureRule = {
  measureType: MeasureType;
  rationale: string;
};

export type EverWattPlaybook = {
  playbookId: string;
  buildingType: string; // e.g. healthcare, office, school
  /**
   * Optional conditions gate. If omitted, playbook matches by buildingType only.
   * Supports either a single condition or an array (any condition can match).
   */
  applicabilityConditions?: PlaybookCondition | PlaybookCondition[];
  preferredMeasures: PlaybookMeasureRule[];
  discouragedMeasures?: PlaybookMeasureRule[];
  priority: PlaybookPriority;
  version: string; // e.g. v1
  authoredBy: string;
};

export type PlaybookMatch = {
  playbook: EverWattPlaybook;
  matchedBecause: string[];
};

export type PlaybookAlignment = 'preferred' | 'neutral' | 'discouraged';

