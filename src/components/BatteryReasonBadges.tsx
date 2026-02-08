import React, { useMemo } from 'react';
import type { BatteryEfficiencyDiagnostic, LimitingFactorType } from '../modules/battery/types';

type Badge = { key: string; label: string; tone: 'gray' | 'red' | 'amber' | 'blue' | 'green' };

function toneClasses(tone: Badge['tone']): string {
  switch (tone) {
    case 'red':
      return 'bg-red-50 text-red-800 border-red-200';
    case 'amber':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'blue':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'green':
      return 'bg-green-50 text-green-800 border-green-200';
    default:
      return 'bg-gray-50 text-gray-800 border-gray-200';
  }
}

function hasFactor(d: BatteryEfficiencyDiagnostic, factor: LimitingFactorType): boolean {
  return (d.limitingFactors || []).some((f) => f.factor === factor && (f.severity === 'critical' || f.severity === 'moderate'));
}

export const BatteryReasonBadges: React.FC<{
  diagnostic: BatteryEfficiencyDiagnostic | null | undefined;
  className?: string;
}> = ({ diagnostic, className }) => {
  const badges = useMemo<Badge[]>(() => {
    if (!diagnostic) return [];

    const b: Badge[] = [];

    const excess = diagnostic.kpis?.excessEnergyKwh ?? 0;
    if (!Number.isFinite(excess) || excess <= 0.01) {
      b.push({ key: 'no_peaks', label: 'No peaks above target', tone: 'gray' });
      return b;
    }

    if (hasFactor(diagnostic, 'power_limit')) b.push({ key: 'power', label: 'Power-limited (kW)', tone: 'red' });
    if (hasFactor(diagnostic, 'capacity_limit')) b.push({ key: 'capacity', label: 'Energy-limited (kWh)', tone: 'red' });
    if (hasFactor(diagnostic, 'soc_limit')) b.push({ key: 'soc', label: 'SOC-limited', tone: 'amber' });
    if (hasFactor(diagnostic, 'charging_opportunity')) b.push({ key: 'charge', label: 'Low recharge headroom', tone: 'amber' });

    const emptyAtPeakRate = diagnostic.usagePatternInsights?.emptyAtPeakRate;
    if (Number.isFinite(emptyAtPeakRate) && emptyAtPeakRate >= 0.35) {
      b.push({ key: 'empty', label: 'Often empty at peak', tone: 'amber' });
    }

    const capture = diagnostic.captureRate;
    if (Number.isFinite(capture)) {
      if (capture >= 0.7) b.push({ key: 'capture_good', label: 'High capture', tone: 'green' });
      else if (capture >= 0.4) b.push({ key: 'capture_ok', label: 'Moderate capture', tone: 'blue' });
      else b.push({ key: 'capture_low', label: 'Low capture', tone: 'amber' });
    }

    // De-dupe while preserving order
    const seen = new Set<string>();
    return b.filter((x) => (seen.has(x.key) ? false : (seen.add(x.key), true)));
  }, [diagnostic]);

  if (!badges.length) return null;

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <span
            key={b.key}
            className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] font-semibold ${toneClasses(b.tone)}`}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
};


