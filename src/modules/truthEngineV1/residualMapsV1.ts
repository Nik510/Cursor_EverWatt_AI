import type { HourlyObservationV1 } from './baselineV1';

export type ResidualMapsV1 = {
  hourlyResidualByDow: number[][];
  peakResidualHours: Array<{ dow: number; hour: number; meanResidualKw: number; sampleCount: number }>;
};

function roundTo(n: number, decimals: number): number {
  if (!Number.isFinite(n)) return NaN;
  const p = 10 ** decimals;
  const out = Math.round(n * p) / p;
  return Object.is(out, -0) ? 0 : out;
}

export function computeResidualMapsV1(args: {
  hourly: HourlyObservationV1[];
  expectedKwForObs: (o: HourlyObservationV1) => number | null;
  maxPeakHours?: number;
}): ResidualMapsV1 {
  const maxPeak = Number.isFinite(Number(args.maxPeakHours)) ? Math.max(0, Math.trunc(Number(args.maxPeakHours))) : 10;

  const sums: Array<Array<{ s: number; n: number }>> = Array.from({ length: 7 }).map(() => Array.from({ length: 24 }).map(() => ({ s: 0, n: 0 })));

  for (const o of args.hourly) {
    const e = args.expectedKwForObs(o);
    if (e === null || !Number.isFinite(e)) continue;
    const r = o.observedKw - e;
    const dow = Math.max(0, Math.min(6, Math.trunc(o.dow)));
    const hour = Math.max(0, Math.min(23, Math.trunc(o.hour)));
    sums[dow]![hour]!.s += r;
    sums[dow]![hour]!.n += 1;
  }

  const hourlyResidualByDow: number[][] = Array.from({ length: 7 }).map((_, dow) =>
    Array.from({ length: 24 }).map((__, hour) => {
      const cell = sums[dow]![hour]!;
      if (!cell.n) return 0;
      return roundTo(cell.s / cell.n, 6);
    }),
  );

  const peakResidualHours = (() => {
    const cells: Array<{ dow: number; hour: number; meanResidualKw: number; sampleCount: number }> = [];
    for (let dow = 0; dow < 7; dow++) {
      for (let hour = 0; hour < 24; hour++) {
        const cell = sums[dow]![hour]!;
        if (!cell.n) continue;
        const meanResidualKw = roundTo(cell.s / cell.n, 6);
        cells.push({ dow, hour, meanResidualKw, sampleCount: cell.n });
      }
    }
    cells.sort(
      (a, b) =>
        Math.abs(b.meanResidualKw) - Math.abs(a.meanResidualKw) ||
        b.meanResidualKw - a.meanResidualKw ||
        b.sampleCount - a.sampleCount ||
        a.dow - b.dow ||
        a.hour - b.hour,
    );
    return cells.slice(0, maxPeak);
  })();

  return { hourlyResidualByDow, peakResidualHours };
}

