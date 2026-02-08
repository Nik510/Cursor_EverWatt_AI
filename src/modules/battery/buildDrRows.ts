import { fitScoreLabel, type FitLabel } from './dr-fit-score';

export type DrProgramResult = {
  programId: string;
  programName: string;
  eligible: boolean;
  eligibilityBadge?: 'Eligible' | 'Needs Inputs' | 'Not Eligible';
  eligibilityReason?: string;
  committedKw: number;
  deliverableKw: number;
  annualCustomerGross: number;
  annualEverWattFee: number;
  fitScore: number;
  fitLabel?: FitLabel;
  fitReasons?: string[];
};

export type DrTableRow = {
  name: string;
  eligibilityBadge: 'Eligible' | 'Needs Inputs' | 'Not Eligible';
  deliverableKw: string;
  committedKw: string;
  grossDr: string;
  everwattFee: string;
  customerNet: string;
  fitScore: number;
  fitLabel: FitLabel;
  fitReasons: string[];
  footnote?: string;
};

export function buildDrRows(programs: DrProgramResult[]): DrTableRow[] {
  const formatUsd = (value: number) => `$${Math.round(value).toLocaleString()}`;

  return programs.map((p) => {
    const committedKwRoundedDown = Math.floor(p.committedKw / 5) * 5;
    const gross = Number(p.annualCustomerGross) || 0;
    const fee = Number(p.annualEverWattFee) || 0;
    const net = gross - fee;

    const eligibilityBadge: DrTableRow['eligibilityBadge'] =
      p.eligibilityBadge ?? (p.eligible ? 'Eligible' : 'Not Eligible');

    return {
      name: p.programName,
      eligibilityBadge,
      deliverableKw: `${(Number(p.deliverableKw) || 0).toFixed(1)}`,
      committedKw: `${committedKwRoundedDown}`,
      grossDr: formatUsd(gross),
      everwattFee: formatUsd(fee),
      customerNet: formatUsd(net),
      fitScore: p.fitScore,
      fitLabel: p.fitLabel ?? fitScoreLabel(p.fitScore),
      fitReasons: Array.isArray(p.fitReasons) ? p.fitReasons : [],
      footnote: eligibilityBadge === 'Eligible' ? undefined : p.eligibilityReason,
    };
  });
}

