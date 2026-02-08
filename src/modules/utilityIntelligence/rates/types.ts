export type RateCatalogEntry = {
  utilityTerritory: string; // e.g. "PGE"
  utility: string; // e.g. "PG&E"
  rateCode: string; // stable code
  serviceClassTags: string[]; // e.g. ["C&I","secondary","primary","residential"]
  notes: string[];
  requiresDemand: boolean;
  touSensitive: boolean;
  optionSTag?: boolean;
};

export type RateAlternativeStatus = 'candidate' | 'needs_eval' | 'unlikely';

