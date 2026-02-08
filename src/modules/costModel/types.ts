import type { EvidenceItemV1 } from '../determinants/types';

export type CostLineItemV1 = {
  category: string;
  amount: number; // dollars
  notes?: string;
  evidence?: EvidenceItemV1[];
};

export type ReplacementScheduleItemV1 = { year: number; amount: number; category?: string; evidence?: EvidenceItemV1[] };

export type EscalationAssumptionsV1 = {
  utilityEscalationPctAnnual?: number;
  oAndMEscalationPctAnnual?: number;
  because?: string[];
  evidence?: EvidenceItemV1[];
};

export type FinancingAssumptionsV1 = {
  ratePctAnnual?: number;
  termYears?: number;
  fees?: Array<{ name: string; amount: number }>;
  because?: string[];
  evidence?: EvidenceItemV1[];
};

export type ProjectCostModelV1 = {
  hardCosts: CostLineItemV1[];
  softCosts: CostLineItemV1[];
  oAndMAnnual?: number;
  replacementSchedule?: ReplacementScheduleItemV1[];
  escalationAssumptions?: EscalationAssumptionsV1;
  financingAssumptions?: FinancingAssumptionsV1;
  notes?: string;
};

export type NormalizedProjectCostModelV1 = ProjectCostModelV1 & {
  totals: {
    hardCostTotal: number;
    softCostTotal: number;
    capexTotal: number;
    replacementTotal: number;
    oAndMAnnual: number | null;
  };
  warnings: string[];
  evidence: EvidenceItemV1[];
  because: string[];
};

