import { describe, it, expect } from 'vitest';

import { isUsHolidayYmd } from '../src/modules/billingEngineV1/tou/usHolidays';

describe('billingEngineV1: isUsHolidayYmd (deterministic US holiday calc)', () => {
  it('flags New Year’s Day', () => {
    expect(isUsHolidayYmd({ year: 2026, month: 1, day: 1 })).toBe(true);
    expect(isUsHolidayYmd({ year: 2026, month: 1, day: 2 })).toBe(false);
  });

  it('applies observed rules for Independence Day', () => {
    // 2026-07-04 is Saturday -> observed Friday 2026-07-03
    expect(isUsHolidayYmd({ year: 2026, month: 7, day: 3 })).toBe(true);
    expect(isUsHolidayYmd({ year: 2026, month: 7, day: 4 })).toBe(true);
    expect(isUsHolidayYmd({ year: 2026, month: 7, day: 2 })).toBe(false);
  });

  it('flags Thanksgiving (4th Thursday in November)', () => {
    // 2026 Thanksgiving is 2026-11-26
    expect(isUsHolidayYmd({ year: 2026, month: 11, day: 26 })).toBe(true);
    expect(isUsHolidayYmd({ year: 2026, month: 11, day: 27 })).toBe(false);
  });
});

