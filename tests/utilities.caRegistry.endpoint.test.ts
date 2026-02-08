import { describe, expect, it } from 'vitest';

import app from '../src/server';

describe('utilities endpoint: /api/utilities/ca/registry', () => {
  it('includes required CA POU entries', async () => {
    const res = await app.request('/api/utilities/ca/registry');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json?.success).toBe(true);
    const keys = new Set((json?.utilities || []).map((u: any) => String(u.utilityKey)));
    expect(keys.has('SMUD')).toBe(true);
    expect(keys.has('LADWP')).toBe(true);
    expect(keys.has('PALO_ALTO_UTILITIES')).toBe(true);
    expect(keys.has('SILICON_VALLEY_POWER')).toBe(true);
    expect(keys.has('ALAMEDA_MUNICIPAL_POWER')).toBe(true);
    expect(keys.has('PENINSULA_CLEAN_ENERGY')).toBe(true);
    expect(keys.has('SILICON_VALLEY_CLEAN_ENERGY')).toBe(true);
    expect(keys.has('EAST_BAY_COMMUNITY_ENERGY')).toBe(true);
    expect(keys.has('SONOMA_CLEAN_POWER')).toBe(true);

    const pge = (json?.utilities || []).find((u: any) => String(u.utilityKey) === 'PGE');
    expect(String(pge?.tariffAcquisitionMethod || '')).toBeTruthy();
    expect(Array.isArray(pge?.primaryTariffSourceUrls)).toBe(true);
    expect(pge.primaryTariffSourceUrls.length).toBeGreaterThan(0);
    expect(Array.isArray(pge?.commodities)).toBe(true);
    expect((pge?.commodities || []).map((x: any) => String(x).toUpperCase())).toContain('GAS');
  });
});

