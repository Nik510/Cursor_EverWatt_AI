export type AnnualKwhEstimateV1 = {
  annualKwhEstimate: number;
  monthsUsed: number;
  confidence: number; // 0..1
  because: string[];
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function safeNums(arr: unknown[]): number[] {
  return (arr || [])
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n >= 0);
}

function round0(n: number): number {
  return Math.round(n);
}

/**
 * Deterministically estimate annual kWh.
 *
 * - If 12+ months available: sum most recent 12 months (high confidence)
 * - If 1–11 months available: avg(months) * 12 (medium confidence)
 * - If only monthly scalar available: monthlyKwh * 12 (low/medium confidence)
 */
export function estimateAnnualKwh(input: {
  monthlyKwhByMonth?: Array<{ month: string; kwh: number }>;
  monthlyKwhValues?: number[];
  monthlyKwhScalar?: number;
}): AnnualKwhEstimateV1 | null {
  const because: string[] = [];

  const byMonth = Array.isArray(input.monthlyKwhByMonth) ? input.monthlyKwhByMonth : [];
  const monthValuesFromByMonth = byMonth
    .map((m) => Number(m?.kwh))
    .filter((n) => Number.isFinite(n) && n >= 0);

  const vals = monthValuesFromByMonth.length
    ? monthValuesFromByMonth
    : Array.isArray(input.monthlyKwhValues)
      ? safeNums(input.monthlyKwhValues)
      : [];

  if (vals.length >= 12) {
    const last12 = vals.slice(-12);
    const sum = last12.reduce((s, x) => s + x, 0);
    because.push(`Annual kWh computed from 12 months (sum of most recent 12).`);
    return {
      annualKwhEstimate: round0(sum),
      monthsUsed: 12,
      confidence: 0.9,
      because,
    };
  }

  if (vals.length >= 1) {
    const avg = vals.reduce((s, x) => s + x, 0) / vals.length;
    const est = avg * 12;
    because.push(`Annual kWh estimated by annualizing average monthly kWh over ${vals.length} month(s).`);
    return {
      annualKwhEstimate: round0(est),
      monthsUsed: vals.length,
      confidence: clamp01(0.55 + 0.03 * vals.length), // 1->0.58 … 11->0.88
      because,
    };
  }

  const scalar = Number(input.monthlyKwhScalar);
  if (Number.isFinite(scalar) && scalar >= 0) {
    const est = scalar * 12;
    because.push(`Annual kWh estimated from a single monthly kWh scalar (annualized ×12).`);
    return {
      annualKwhEstimate: round0(est),
      monthsUsed: 1,
      confidence: 0.45,
      because,
    };
  }

  return null;
}

