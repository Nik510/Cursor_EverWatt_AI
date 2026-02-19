export type DiffCategoryIdV1 =
  | 'rate_and_supply'
  | 'interval'
  | 'weather_determinants'
  | 'battery'
  | 'programs'
  | 'warnings';

export type DiffHighlightItemV1 = {
  label: string;
  before: string;
  after: string;
};

export type DiffCategorySummaryV1 = {
  category: DiffCategoryIdV1;
  changedPaths: string[]; // max 25, sorted
  highlights: DiffHighlightItemV1[]; // max 10
};

export type DiffSummaryV1 = {
  runA: { runId: string; createdAtIso: string };
  runB: { runId: string; createdAtIso: string };
  changedSections: DiffCategoryIdV1[];
  categories: DiffCategorySummaryV1[];
};

