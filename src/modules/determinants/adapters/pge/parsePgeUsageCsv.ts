import Papa from 'papaparse';

import { zonedLocalToUtcDate } from '../../../billingEngineV1/time/zonedTime';
import type { EvidenceItemV1 } from '../../types';
import type { MissingInfoItemV0 } from '../../../utilityIntelligence/missingInfo/types';

export type CanonicalTouKeysV1 = 'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak';

export type PgeUsageMonthlySummaryV1 = {
  billEndDateIso: string;
  days: number;
  totalKWh: number | null;
  maxKw: number | null;
  kWhByTou?: Partial<Record<CanonicalTouKeysV1, number>>;
  kWByTou?: Partial<Record<CanonicalTouKeysV1, number>>;
  rateCode?: string;
  serviceProvider?: string;
  dollars?: Partial<{
    pgeRevenueAmount: number;
    espTotalRevenueAmount: number;
    taxAmount: number;
    totalBillAmount: number;
  }>;
};

export type PgeUsageIdentityV1 = Partial<{
  billingName: string;
  siteAddress: string;
  siteCity: string;
  zip: string;
  accountNumber: string;
  meterNumber: string;
}>;

export type PgeUsageParsedV1 = {
  meterKey: string;
  monthlySummaries: PgeUsageMonthlySummaryV1[];
  identity?: PgeUsageIdentityV1;
  sourceMeta?: {
    timezoneUsed: string;
    touKwColumns: Partial<Record<CanonicalTouKeysV1, string>>;
    touKwhColumns: Partial<Record<CanonicalTouKeysV1, string>>;
  };
  warnings: string[];
  missingInfo: MissingInfoItemV0[];
  evidence: EvidenceItemV1[];
};

function normHeader(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normLooseHeader(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstHeaderMatch(headers: string[], candidates: string[]): string | null {
  const byNorm = new Map(headers.map((h) => [normHeader(h), h]));
  const byLoose = new Map(headers.map((h) => [normLooseHeader(h), h]));
  for (const c of candidates) {
    const hit = byNorm.get(normHeader(c));
    if (hit) return hit;
  }
  for (const c of candidates) {
    const hit = byLoose.get(normLooseHeader(c));
    if (hit) return hit;
  }
  // Fallback: substring match on loose headers (handles headers like "pg&e revenue amount ($)")
  const headerLooseList = headers.map((h) => ({ h, loose: normLooseHeader(h) }));
  for (const c of candidates) {
    const cl = normLooseHeader(c);
    const found = headerLooseList.find((x) => x.loose === cl || x.loose.includes(cl));
    if (found) return found.h;
  }
  return null;
}

function parseNumberLoose(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  if (!raw) return null;
  const str = raw.replace(/[$,]/g, '').replace(/[()]/g, '-').trim();
  const n = parseFloat(str);
  return Number.isFinite(n) ? n : null;
}

function parseUsDateToUtcIso(args: { raw: string; timeZone: string }): string | null {
  const s = String(args.raw || '').trim();
  if (!s) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (![month, day, year].every((n) => Number.isFinite(n))) return null;
  const d = zonedLocalToUtcDate({ local: { year, month, day, hour: 0, minute: 0, second: 0 }, timeZone: args.timeZone });
  return d.toISOString();
}

function touKeyMap(): Array<{ key: CanonicalTouKeysV1; kwhCols: string[]; kwCols: string[] }> {
  return [
    { key: 'onPeak', kwhCols: ['On Peak (kWh)', 'On Peak kWh', 'On Peak (KWH)'], kwCols: ['On Peak (kW)', 'On Peak kW', 'On Peak (KW)'] },
    { key: 'partialPeak', kwhCols: ['Partial Peak (kWh)', 'Partial Peak kWh'], kwCols: ['Partial Peak (kW)', 'Partial Peak kW'] },
    { key: 'offPeak', kwhCols: ['Off Peak Usage (kWh)', 'Off Peak (kWh)', 'Off Peak kWh'], kwCols: ['Off Peak (kW)', 'Off Peak kW'] },
    { key: 'superOffPeak', kwhCols: ['Super Off Peak (kWh)', 'Super Off Peak kWh'], kwCols: ['Super Off Peak (kW)', 'Super Off Peak kW'] },
  ];
}

export function parsePgeUsageCsvV1(args: {
  csvTextOrBuffer: string | Buffer;
  timezoneHint?: string;
}): { meters: PgeUsageParsedV1[]; warnings: string[] } {
  const tz = String(args.timezoneHint || 'America/Los_Angeles').trim() || 'America/Los_Angeles';
  const text = Buffer.isBuffer(args.csvTextOrBuffer) ? args.csvTextOrBuffer.toString('utf-8') : String(args.csvTextOrBuffer || '');
  const parsed = Papa.parse<Record<string, any>>(text, { header: true, skipEmptyLines: 'greedy' });
  const headers = Array.isArray(parsed?.meta?.fields) ? parsed.meta.fields : [];

  const warnings: string[] = [];
  if (!headers.length) return { meters: [], warnings: ['No CSV headers detected in usage export.'] };

  const colSaId = firstHeaderMatch(headers, ['SA ID', 'SAID', 'Service Agreement', 'Service Agreement ID']);
  const colBillEnd = firstHeaderMatch(headers, ['Bill End Date', 'Bill End', 'Bill Date']);
  const colDays = firstHeaderMatch(headers, ['Days', 'Billing Days']);
  const colRate = firstHeaderMatch(headers, ['Rate', 'Rate Code', 'Rate Schedule']);
  const colServiceProvider = firstHeaderMatch(headers, ['Service Provider', 'Provider', 'Utility']);
  const colTotalKwh = firstHeaderMatch(headers, ['Total Usage (kWh)', 'Total Usage', 'Usage']);
  const colMaxKw = firstHeaderMatch(headers, ['Max. Max Demand (kW)', 'Max Max Demand (kW)', 'Max Demand (kW)', 'Peak Demand (kW)']);

  const colBillingName = firstHeaderMatch(headers, ['Billing Name', 'Customer Name', 'Name']);
  const colSiteAddress = firstHeaderMatch(headers, ['Site Address', 'Service Address', 'Address']);
  const colSiteCity = firstHeaderMatch(headers, ['Site City', 'City']);
  const colZip = firstHeaderMatch(headers, ['Zip Code', 'Zip', 'Postal']);
  const colAccountNumber = firstHeaderMatch(headers, ['Account #', 'Account Number', 'Account']);
  const colMeterNumber = firstHeaderMatch(headers, ['Meter #', 'Meter Number', 'Meter']);

  const colPgeRevenue = firstHeaderMatch(headers, ['PG&E Revenue Amount', 'PGE Revenue Amount']);
  const colEspRevenue = firstHeaderMatch(headers, ['ESP Total Revenue Amount']);
  const colTax = firstHeaderMatch(headers, ['Tax Amount', 'Tax']);
  const colTotalBill = firstHeaderMatch(headers, ['Total Bill Amount', 'Bill Amount', 'Cost']);

  const evidenceCommon: EvidenceItemV1[] = [
    { kind: 'assumption', pointer: { source: 'pgeUsageCsv', key: 'timezoneUsed', value: tz } },
    { kind: 'assumption', pointer: { source: 'pgeUsageCsv', key: 'touKeys', value: 'onPeak/partialPeak/offPeak/superOffPeak' } },
  ];

  // Resolve canonical TOU columns once for this file (exact header names).
  const touKwColumns: Partial<Record<CanonicalTouKeysV1, string>> = {};
  const touKwhColumns: Partial<Record<CanonicalTouKeysV1, string>> = {};
  for (const spec of touKeyMap()) {
    const kwhCol = firstHeaderMatch(headers, spec.kwhCols);
    const kwCol = firstHeaderMatch(headers, spec.kwCols);
    if (kwhCol) touKwhColumns[spec.key] = kwhCol;
    if (kwCol) touKwColumns[spec.key] = kwCol;
  }

  const byMeter = new Map<string, { summaries: PgeUsageMonthlySummaryV1[]; identity: PgeUsageIdentityV1; warnings: string[]; missing: MissingInfoItemV0[]; evidence: EvidenceItemV1[] }>();

  const dataRows = Array.isArray(parsed.data) ? parsed.data : [];
  for (const row of dataRows) {
    if (!row) continue;
    const hasAny = Object.values(row).some((v) => String(v ?? '').trim() !== '');
    if (!hasAny) continue;

    const meterKey = String((colSaId ? row[colSaId] : '') || '').trim();
    const billEndRaw = String((colBillEnd ? row[colBillEnd] : '') || '').trim();
    if (!meterKey || !billEndRaw) continue;

    const billEndDateIso = parseUsDateToUtcIso({ raw: billEndRaw, timeZone: tz });
    if (!billEndDateIso) continue;

    const days = Math.max(0, Math.round(Number(parseNumberLoose(colDays ? row[colDays] : null) ?? 0)));
    const totalKWh = parseNumberLoose(colTotalKwh ? row[colTotalKwh] : null);
    const maxKw = parseNumberLoose(colMaxKw ? row[colMaxKw] : null);

    const m = byMeter.get(meterKey) || {
      summaries: [],
      identity: {},
      warnings: [],
      missing: [],
      evidence: [...evidenceCommon],
    };

    // Identity (best-effort)
    if (colBillingName && !m.identity.billingName) m.identity.billingName = String(row[colBillingName] || '').trim() || undefined;
    if (colSiteAddress && !m.identity.siteAddress) m.identity.siteAddress = String(row[colSiteAddress] || '').trim() || undefined;
    if (colSiteCity && !m.identity.siteCity) m.identity.siteCity = String(row[colSiteCity] || '').trim() || undefined;
    if (colZip && !m.identity.zip) m.identity.zip = String(row[colZip] || '').trim() || undefined;
    if (colAccountNumber && !m.identity.accountNumber) m.identity.accountNumber = String(row[colAccountNumber] || '').trim() || undefined;
    if (colMeterNumber && !m.identity.meterNumber) m.identity.meterNumber = String(row[colMeterNumber] || '').trim() || undefined;

    if (!days) {
      m.missing.push({
        id: 'pge.usage.days.missing',
        category: 'tariff',
        severity: 'warning',
        description: 'Usage export row is missing billing Days; billing cycle derivation may be ambiguous.',
      });
    }

    const kWhByTou: Partial<Record<CanonicalTouKeysV1, number>> = {};
    const kWByTou: Partial<Record<CanonicalTouKeysV1, number>> = {};
    for (const spec of touKeyMap()) {
      const kwhCol = touKwhColumns[spec.key] || null;
      const kwCol = touKwColumns[spec.key] || null;
      const kwhVal = kwhCol ? parseNumberLoose(row[kwhCol]) : null;
      const kwVal = kwCol ? parseNumberLoose(row[kwCol]) : null;
      if (kwhVal !== null && Number.isFinite(kwhVal)) kWhByTou[spec.key] = kwhVal;
      if (kwVal !== null && Number.isFinite(kwVal)) kWByTou[spec.key] = kwVal;
      if (kwhCol) m.evidence.push({ kind: 'billingRecordField', pointer: { source: 'pgeUsageCsv', key: `columnMap.kWh.${spec.key}`, value: kwhCol } });
      if (kwCol) m.evidence.push({ kind: 'billingRecordField', pointer: { source: 'pgeUsageCsv', key: `columnMap.kW.${spec.key}`, value: kwCol } });
    }

    const dollars: PgeUsageMonthlySummaryV1['dollars'] = {};
    const pgeRevenueAmount = colPgeRevenue ? parseNumberLoose(row[colPgeRevenue]) : null;
    const espTotalRevenueAmount = colEspRevenue ? parseNumberLoose(row[colEspRevenue]) : null;
    const taxAmount = colTax ? parseNumberLoose(row[colTax]) : null;
    const totalBillAmount = colTotalBill ? parseNumberLoose(row[colTotalBill]) : null;
    if (pgeRevenueAmount !== null) dollars.pgeRevenueAmount = pgeRevenueAmount;
    if (espTotalRevenueAmount !== null) dollars.espTotalRevenueAmount = espTotalRevenueAmount;
    if (taxAmount !== null) dollars.taxAmount = taxAmount;
    if (totalBillAmount !== null) dollars.totalBillAmount = totalBillAmount;

    m.summaries.push({
      billEndDateIso,
      days,
      totalKWh: totalKWh !== null ? totalKWh : null,
      maxKw: maxKw !== null ? maxKw : null,
      ...(Object.keys(kWhByTou).length ? { kWhByTou } : {}),
      ...(Object.keys(kWByTou).length ? { kWByTou } : {}),
      ...(colRate && String(row[colRate] || '').trim() ? { rateCode: String(row[colRate] || '').trim() } : {}),
      ...(colServiceProvider && String(row[colServiceProvider] || '').trim() ? { serviceProvider: String(row[colServiceProvider] || '').trim() } : {}),
      ...(Object.keys(dollars).length ? { dollars } : {}),
    });

    byMeter.set(meterKey, m);
  }

  const meters: PgeUsageParsedV1[] = [];
  for (const [meterKey, m] of byMeter.entries()) {
    // sort by bill end date
    m.summaries.sort((a, b) => new Date(a.billEndDateIso).getTime() - new Date(b.billEndDateIso).getTime());
    meters.push({
      meterKey,
      monthlySummaries: m.summaries,
      identity: Object.keys(m.identity).length ? m.identity : undefined,
      sourceMeta: { timezoneUsed: tz, touKwColumns, touKwhColumns },
      warnings: Array.from(new Set(m.warnings)),
      missingInfo: m.missing,
      evidence: m.evidence,
    });
  }

  return { meters, warnings };
}

