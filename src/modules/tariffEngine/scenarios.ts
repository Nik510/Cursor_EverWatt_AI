import type { TariffModel } from './schema';

export function generateCandidateCapsKw(args: {
  baselinePeakKw: number;
  tariff: TariffModel;
}): number[] {
  const { baselinePeakKw, tariff } = args;
  const eps = 0.1;
  const caps = new Set<number>();

  // Always include a cap just below the observed baseline peak
  if (Number.isFinite(baselinePeakKw) && baselinePeakKw > 0) {
    caps.add(Math.max(0, baselinePeakKw - eps));
    caps.add(Math.max(0, baselinePeakKw * 0.95));
    caps.add(Math.max(0, baselinePeakKw * 0.90));
  }

  // Include just-below tier thresholds for any demand determinant tiers
  for (const det of tariff.demandDeterminants || []) {
    for (const t of det.tiers || []) {
      if (typeof t.upToKw === 'number' && Number.isFinite(t.upToKw)) {
        caps.add(Math.max(0, t.upToKw - eps));
      }
    }
  }

  // Filter and sort
  const out = [...caps]
    .filter((x) => Number.isFinite(x) && x > 0 && x <= baselinePeakKw)
    .sort((a, b) => a - b);

  // Bound candidate count for runtime
  if (out.length > 24) {
    // Keep lowest 12 + highest 12 (closest to peak), which tends to matter most
    return [...out.slice(0, 12), ...out.slice(-12)];
  }
  return out;
}

