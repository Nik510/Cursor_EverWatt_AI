import { defaultUtilityPrograms, type UtilityProvider } from '../../data/obf/obf-eligibility';

export interface ObfFinancingInput {
  utility: UtilityProvider;
  projectCost: number;
  termMonths?: number;
}

export interface ObfFinancingResult {
  eligibleByMinProjectCost: boolean;
  minProjectCost: number;
  maxPerProject: number;
  maxPerAccount?: number;
  termMonths: number;
  interestRate: string;
  financedAmount: number;
  monthlyPayment: number;
  outOfPocket: number;
}

/**
 * Compute a simple OBF financing estimate.
 * Assumes 0% interest and simple principal/term payment schedule.
 */
export function calculateObfFinancing(input: ObfFinancingInput): ObfFinancingResult {
  const program = defaultUtilityPrograms[input.utility];
  const minProjectCost = program.minProjectCost;
  const maxPerProject = program.defaultMaxFinancing;
  const maxPerAccount = program.maxPerAccount;
  const interestRate = program.defaultInterestRate;
  const termMonths = input.termMonths ?? program.defaultMaxTerm;

  const eligibleByMinProjectCost = input.projectCost >= minProjectCost;
  const financedAmount = eligibleByMinProjectCost ? Math.min(input.projectCost, maxPerProject) : 0;
  const monthlyPayment = financedAmount > 0 && termMonths > 0 ? financedAmount / termMonths : 0;
  const outOfPocket = eligibleByMinProjectCost ? Math.max(0, input.projectCost - financedAmount) : input.projectCost;

  return {
    eligibleByMinProjectCost,
    minProjectCost,
    maxPerProject,
    maxPerAccount,
    termMonths,
    interestRate,
    financedAmount,
    monthlyPayment,
    outOfPocket,
  };
}


