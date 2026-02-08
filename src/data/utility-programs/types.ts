export type UtilityProgramUtility = 'PG&E' | 'SCE' | 'SDG&E' | 'Other';

export type UtilityProgramCategory =
  | 'Rebates'
  | 'Demand Response'
  | 'Electrification'
  | 'Solar & Storage'
  | 'Rate Optimization'
  | 'Other';

export type UtilityProgram = {
  id: string;
  utility: UtilityProgramUtility;
  name: string;
  category: UtilityProgramCategory;
  summary: string;
  details?: string;
  eligibility?: string[];
  incentives?: string[];
  links?: Array<{ label: string; url: string }>;
  lastUpdated?: string;
};
