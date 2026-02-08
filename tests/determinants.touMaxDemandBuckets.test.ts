import { describe, expect, test } from 'vitest';

import { zonedLocalToUtcDate } from '../src/modules/billingEngineV1/time/zonedTime';
import { computeCycleDemandDeterminants } from '../src/modules/determinants/intervalToDemand';
import { buildDeterminantsPackV1 } from '../src/modules/determinants/buildDeterminantsPack';

describe('determinants: TOU max demand buckets', () => {
  test('Case A: computed kWMaxByTouPeriod from intervals via mapTou', () => {
    const tz = 'America/Los_Angeles';
    const cycle = {
      label: '2026-01-05',
      timezone: tz,
      startIso: zonedLocalToUtcDate({ local: { year: 2026, month: 1, day: 5, hour: 0, minute: 0, second: 0 }, timeZone: tz }).toISOString(),
      endIso: zonedLocalToUtcDate({ local: { year: 2026, month: 1, day: 6, hour: 0, minute: 0, second: 0 }, timeZone: tz }).toISOString(),
    };

    // PGE_SIM_B19_LIKE has PEAK weekday 16-21, OFF_PEAK otherwise.
    const offPeakTs = zonedLocalToUtcDate({ local: { year: 2026, month: 1, day: 5, hour: 10, minute: 0, second: 0 }, timeZone: tz }).toISOString();
    const peakTs = zonedLocalToUtcDate({ local: { year: 2026, month: 1, day: 5, hour: 17, minute: 0, second: 0 }, timeZone: tz }).toISOString();

    const det = computeCycleDemandDeterminants({
      cycle,
      intervals: [
        { timestampIso: offPeakTs, kw: 20, intervalMinutes: 60 },
        { timestampIso: peakTs, kw: 50, intervalMinutes: 60 },
      ],
      seriesIntervalMinutes: 60,
      touContext: { utility: 'PGE', rateCode: 'PGE_SIM_B19_LIKE' },
    });

    expect(det.kWMaxByTouPeriod?.offPeak).toBeCloseTo(20, 6);
    expect(det.kWMaxByTouPeriod?.onPeak).toBeCloseTo(50, 6);
  });

  test('Case B: fallback to usage-derived observed TOU demand when TOU labeling unavailable', () => {
    const tz = 'America/Los_Angeles';
    const pack = buildDeterminantsPackV1({
      utility: 'PGE',
      rateCode: 'UNKNOWN_RATE',
      supplyType: 'unknown',
      timezone: tz,
      billingCyclesByMeter: {
        m1: [
          {
            label: '2026-01-01',
            timezone: tz,
            startIso: '2026-01-01T08:00:00.000Z',
            endIso: '2026-01-02T08:00:00.000Z',
          },
        ],
      },
      intervalSeries: [
        {
          meterId: 'm1',
          intervalMinutes: 60,
          timezone: tz,
          source: 'test',
          points: [{ timestampIso: '2026-01-01T08:00:00.000Z', kw: 10, intervalMinutes: 60 }],
        },
      ],
      observedTouDemandByMeterAndCycle: {
        m1: {
          '2026-01-01': {
            values: { onPeak: 100, partialPeak: 90, offPeak: 40, superOffPeak: 30 },
            fields: { onPeak: 'On Peak (kW)', partialPeak: 'Partial Peak (kW)', offPeak: 'Off Peak (kW)', superOffPeak: 'Super Off Peak (kW)' },
          },
        },
      },
    });

    const c = pack.meters[0].cycles[0];
    expect(c.demand.kWMaxByTouPeriod?.onPeak).toBe(100);
    expect(c.demand.kWMaxByTouPeriod?.offPeak).toBe(40);
  });

  test('Case C: mismatch between computed and usage-derived TOU demand emits MissingInfo warning', () => {
    const tz = 'America/Los_Angeles';
    const pack = buildDeterminantsPackV1({
      utility: 'PGE',
      rateCode: 'PGE_SIM_B19_LIKE',
      supplyType: 'unknown',
      timezone: tz,
      billingCyclesByMeter: {
        m1: [
          {
            label: '2026-01-05',
            timezone: tz,
            startIso: '2026-01-05T08:00:00.000Z',
            endIso: '2026-01-06T08:00:00.000Z',
          },
        ],
      },
      intervalSeries: [
        {
          meterId: 'm1',
          intervalMinutes: 60,
          timezone: tz,
          source: 'test',
          points: [
            { timestampIso: '2026-01-05T18:00:00.000Z', kw: 10, intervalMinutes: 60 }, // 10:00 local OFF_PEAK
            { timestampIso: '2026-01-06T01:00:00.000Z', kw: 50, intervalMinutes: 60 }, // 17:00 local PEAK
          ],
        },
      ],
      observedTouDemandByMeterAndCycle: {
        m1: {
          '2026-01-05': {
            values: { onPeak: 10 }, // mismatch vs computed 50
            fields: { onPeak: 'On Peak (kW)' },
          },
        },
      },
    });

    expect(pack.missingInfo.some((m) => String(m.id).includes('determinants.tou.mismatch'))).toBe(true);
  });
});

