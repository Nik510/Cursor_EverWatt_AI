import type { DRMoney, DRPanel, DRProgramResult } from '../types/dr';

export type DRTableRow = {
  programId: string;
  programName: string;
  market: 'utility' | 'aggregator' | 'caiso';
  utility: string;

  eligible: boolean;
  eligibilityBadge: { label: string; tone: 'green' | 'yellow' | 'red' | 'gray' };
  eligibilityReasons: string[];

  minCommitmentKw: number;
  deliverableTotalKw: number;
  committedKw: number;

  paymentUnit?: 'per_kw_event' | 'per_kwh';
  capacityPaymentPerKwMonth?: number;
  eventPayment?: number;
  estimatedEventsPerYear?: number;

  customerGross?: number;
  everwattFee?: number;
  customerNet?: number;
  payDetail?: string;

  // Optional fields for tooltips / drill-down
  money?: DRMoney;
  whatIfAtMinimum?: DRMoney;
};

function eligibilityBadge(program: DRProgramResult): DRTableRow['eligibilityBadge'] {
  const e = program.eligibility;
  if (e.eligible) return { label: 'Eligible', tone: 'green' };

  // If missing inputs, show "Needs Inputs" instead of a hard "No"
  if (e.missingInputs && e.missingInputs.length > 0) {
    return { label: 'Needs inputs', tone: 'yellow' };
  }
  return { label: 'Not eligible', tone: 'red' };
}

export function drPanelToRows(panel: DRPanel): DRTableRow[] {
  if (!panel?.enabled) return [];

  const rows = panel.programs.map((p) => {
    const badge = eligibilityBadge(p);

    // Use money if eligible; otherwise show what-if only if provided
    const m = p.money ?? undefined;
    const w = p.whatIfAtMinimum ?? undefined;

    const committedKw = m?.committedKw ?? w?.committedKw ?? 0;

    const paymentUnit = m?.paymentUnit ?? w?.paymentUnit;

    return {
      programId: p.programId,
      programName: p.programName,
      market: p.market,
      utility: p.utility,

      eligible: p.eligibility.eligible,
      eligibilityBadge: badge,
      eligibilityReasons: p.eligibility.reasons ?? [],

      minCommitmentKw: p.minimumCommitmentKw,
      deliverableTotalKw: p.deliverable.deliverableTotalKw,
      committedKw,

      paymentUnit,
      capacityPaymentPerKwMonth: m?.capacityPaymentPerKwMonth ?? w?.capacityPaymentPerKwMonth,
      eventPayment: m?.eventPayment ?? w?.eventPayment,
      estimatedEventsPerYear: m?.estimatedEventsPerYear ?? w?.estimatedEventsPerYear,

      customerGross: m?.customerGross ?? w?.customerGross,
      everwattFee: m?.everwattFee ?? w?.everwattFee,
      customerNet: m?.customerNet ?? w?.customerNet,

      payDetail:
        paymentUnit === 'per_kw_event'
          ? '$/kW-event'
          : paymentUnit === 'per_kwh'
            ? '$/kWh'
            : undefined,

      money: m,
      whatIfAtMinimum: w,
    };
  });

  // Sort: eligible first, then by customerNet desc, then by gross desc
  return rows.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    const an = a.customerNet ?? -Infinity;
    const bn = b.customerNet ?? -Infinity;
    if (an !== bn) return bn - an;
    const ag = a.customerGross ?? -Infinity;
    const bg = b.customerGross ?? -Infinity;
    return bg - ag;
  });
}

export function drPanelSummary(panel: DRPanel) {
  const rows = drPanelToRows(panel);
  const eligible = rows.filter((r) => r.eligible);

  const best = eligible[0];
  return {
    fitScore: panel.fitScore,
    deliverableTotalKw: panel.deliverable.totalKw,
    bestProgramName: best?.programName,
    bestCustomerNet: best?.customerNet ?? null,
  };
}
