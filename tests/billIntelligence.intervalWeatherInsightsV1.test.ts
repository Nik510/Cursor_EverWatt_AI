import { describe, expect, it } from 'vitest';
import { analyzeBillIntelligenceIntervalInsightsV1 } from '../src/modules/utilityIntelligence/billIntelligence/intervalInsightsV1';
import { analyzeBillIntelligenceWeatherCorrelationV1 } from '../src/modules/utilityIntelligence/billIntelligence/weatherCorrelationV1';
import { BillIntelligenceWarningCodesV1 } from '../src/modules/utilityIntelligence/types';

function hourlyPoints(args: {
  startIso: string; // inclusive
  hours: number;
  kWhFn: (i: number, iso: string) => number;
  tempFn?: (i: number, iso: string) => number;
}): Array<{ timestampIso: string; intervalMinutes: number; kWh: number; temperatureF?: number }> {
  const out: Array<{ timestampIso: string; intervalMinutes: number; kWh: number; temperatureF?: number }> = [];
  const start = new Date(args.startIso);
  for (let i = 0; i < args.hours; i++) {
    const d = new Date(start.getTime() + i * 60 * 60 * 1000);
    const iso = d.toISOString();
    const kWh = args.kWhFn(i, iso);
    const t = args.tempFn ? args.tempFn(i, iso) : undefined;
    out.push({ timestampIso: iso, intervalMinutes: 60, kWh, ...(Number.isFinite(Number(t)) ? { temperatureF: Number(t) } : {}) });
  }
  return out;
}

describe('Bill Intelligence v1 interval insights', () => {
  it('computes top hours, weekday/weekend deltas, load factor, and peak day-of-week deterministically', () => {
    // 2026-01-01 Thu, 2026-01-02 Fri, 2026-01-03 Sat (UTC)
    const pts = hourlyPoints({
      startIso: '2026-01-01T00:00:00.000Z',
      hours: 24 * 3,
      kWhFn: (_i, iso) => (new Date(iso).getUTCHours() === 15 ? 100 : 10),
    });

    const out = analyzeBillIntelligenceIntervalInsightsV1({ intervalPointsV1: pts as any, explicitPeakKwFromBill: 50 });

    expect(out.intervalInsightsV1.available).toBe(true);
    expect(out.intervalInsightsV1.topHourOfDayKwh).toEqual({ hourOfDay: 15, percentOfTotal: 0.303 });
    expect(out.intervalInsightsV1.topHourOfDayKw).toEqual({ hourOfDay: 15, value: 100 });

    expect(out.intervalInsightsV1.weekdayAvgKwhPerDay).toBe(330);
    expect(out.intervalInsightsV1.weekendAvgKwhPerDay).toBe(330);
    expect(out.intervalInsightsV1.deltaWeekdayMinusWeekendKwhPerDay).toBe(0);

    expect(out.intervalInsightsV1.weekdayAvgKw).toBe(13.75);
    expect(out.intervalInsightsV1.weekendAvgKw).toBe(13.75);
    expect(out.intervalInsightsV1.deltaWeekdayMinusWeekendKw).toBe(0);

    expect(out.intervalInsightsV1.loadFactorApprox).toBe(0.275);
    expect(out.intervalInsightsV1.peakDayOfWeek).toBe('Thu');
    expect(out.intervalInsightsV1.peakDayOfWeekBasis).toBe('kWh');
  });

  it('emits warning when intervals are absent', () => {
    const out = analyzeBillIntelligenceIntervalInsightsV1({ intervalPointsV1: null, explicitPeakKwFromBill: null });
    expect(out.intervalInsightsV1.available).toBe(false);
    expect(out.warnings.map((w) => w.code)).toContain(BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_REQUIRED);
  });
});

describe('Bill Intelligence v1 weather correlation (Pearson)', () => {
  it('computes deterministic Pearson r and classifies cooling-dominant when load rises with OAT', () => {
    const pts = hourlyPoints({
      startIso: '2026-01-01T00:00:00.000Z',
      hours: 48,
      kWhFn: (i) => i, // rising
      tempFn: (i) => i, // rising
    });
    const out = analyzeBillIntelligenceWeatherCorrelationV1({ intervalPointsV1: pts as any });
    expect(out.weatherCorrelationV1.available).toBe(true);
    expect(out.weatherCorrelationV1.signature).toBe('COOLING_DOMINANT');
    expect(out.weatherCorrelationV1.correlationCoeff_kwh_vs_oat).toBe(1);
    expect(out.weatherCorrelationV1.correlationCoeff_kw_vs_oat).toBe(1);
  });

  it('classifies heating-dominant when load falls with OAT', () => {
    const pts = hourlyPoints({
      startIso: '2026-01-01T00:00:00.000Z',
      hours: 48,
      kWhFn: (i) => 100 - i, // falling
      tempFn: (i) => i, // rising
    });
    const out = analyzeBillIntelligenceWeatherCorrelationV1({ intervalPointsV1: pts as any });
    expect(out.weatherCorrelationV1.available).toBe(true);
    expect(out.weatherCorrelationV1.signature).toBe('HEATING_DOMINANT');
    expect(out.weatherCorrelationV1.correlationCoeff_kwh_vs_oat).toBe(-1);
    expect(out.weatherCorrelationV1.correlationCoeff_kw_vs_oat).toBe(-1);
  });

  it('does not emit correlation metrics when there are not enough hourly buckets', () => {
    const pts = hourlyPoints({
      startIso: '2026-01-01T00:00:00.000Z',
      hours: 10,
      kWhFn: (i) => i,
      tempFn: (i) => i,
    });
    const out = analyzeBillIntelligenceWeatherCorrelationV1({ intervalPointsV1: pts as any });
    expect(out.weatherCorrelationV1.available).toBe(false);
    expect(out.weatherCorrelationV1.correlationCoeff_kwh_vs_oat).toBeUndefined();
    expect(out.warnings.map((w) => w.code)).toContain(BillIntelligenceWarningCodesV1.BILL_INTEL_WEATHER_DATA_INSUFFICIENT_POINTS);
  });
});

