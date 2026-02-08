import { getZonedParts, zonedLocalToUtcDate } from '../../../billingEngineV1/time/zonedTime';
import type { ComprehensiveBillRecord } from '../../../../utils/utility-data-types';
import type { EvidenceItemV1, BillingCycleV1, IntervalSeriesV1 } from '../../types';
import type { MissingInfoItemV0 } from '../../../utilityIntelligence/missingInfo/types';
import { buildDeterminantsPackV1 } from '../../buildDeterminantsPack';
import { detectPgeCsvTypeV1 } from './detectPgeCsvType';
import { parsePgeIntervalCsvV1 } from './parsePgeIntervalCsv';
import { parsePgeUsageCsvV1 } from './parsePgeUsageCsv';

export type BuildDeterminantsFromPgeExportsInputV1 = {
  intervalCsvText?: string;
  usageCsvText?: string;
  timezoneHint?: string; // default America/Los_Angeles
  utility?: 'PGE' | 'SCE' | 'SDGE';
  rateCodeFallback?: string;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function uniqMissing(items: MissingInfoItemV0[]): MissingInfoItemV0[] {
  const out: MissingInfoItemV0[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const id = String(it?.id || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(it);
  }
  return out;
}

function ymd(parts: { year: number; month: number; day: number }): string {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function parseIsoMs(s: string): number | null {
  const ms = new Date(String(s || '').trim()).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function toLocalPartsAtMidnight(iso: string, tz: string): { year: number; month: number; day: number } | null {
  const ms = parseIsoMs(iso);
  if (ms === null) return null;
  const p = getZonedParts(new Date(ms), tz);
  if (!p) return null;
  return { year: p.year, month: p.month, day: p.day };
}

function localMidnightUtcIso(args: { year: number; month: number; day: number; tz: string }): string {
  return zonedLocalToUtcDate({
    local: { year: args.year, month: args.month, day: args.day, hour: 0, minute: 0, second: 0 },
    timeZone: args.tz,
  }).toISOString();
}

export function buildDeterminantsFromPgeExportsV1(input: BuildDeterminantsFromPgeExportsInputV1) {
  const tz = String(input.timezoneHint || 'America/Los_Angeles').trim() || 'America/Los_Angeles';
  const utility = input.utility || 'PGE';

  const warnings: string[] = [];
  const missingInfo: MissingInfoItemV0[] = [];

  // Detect + parse interval/usage (defensively: allow swapped inputs)
  const intervalTextRaw = String(input.intervalCsvText || '').trim();
  const usageTextRaw = String(input.usageCsvText || '').trim();

  let intervalText = intervalTextRaw;
  let usageText = usageTextRaw;

  if (intervalTextRaw) {
    const det = detectPgeCsvTypeV1(intervalTextRaw);
    if (det.type === 'usage' && !usageTextRaw) {
      usageText = intervalTextRaw;
      intervalText = '';
      warnings.push('intervalCsvText appeared to be a usage export; treated as usageCsvText.');
    }
  }
  if (usageTextRaw) {
    const det = detectPgeCsvTypeV1(usageTextRaw);
    if (det.type === 'interval' && !intervalTextRaw) {
      intervalText = usageTextRaw;
      usageText = '';
      warnings.push('usageCsvText appeared to be an interval export; treated as intervalCsvText.');
    }
  }

  const parsedInterval = intervalText ? parsePgeIntervalCsvV1({ csvTextOrBuffer: intervalText, timezoneHint: tz }) : { meters: [], warnings: [] as string[] };
  const parsedUsage = usageText ? parsePgeUsageCsvV1({ csvTextOrBuffer: usageText, timezoneHint: tz }) : { meters: [], warnings: [] as string[] };

  warnings.push(...parsedInterval.warnings, ...parsedUsage.warnings);

  if (!usageText) {
    missingInfo.push({
      id: 'pge.exports.usage.missing',
      category: 'tariff',
      severity: 'info',
      description: 'Usage export was not provided; billing cycles will fall back to calendar months derived from intervals.',
    });
  }

  // Join meter keys
  const meterKeys = Array.from(
    new Set([
      ...parsedInterval.meters.map((m) => String(m.meterKey || '').trim()).filter(Boolean),
      ...parsedUsage.meters.map((m) => String(m.meterKey || '').trim()).filter(Boolean),
    ]),
  );

  const intervalSeries: IntervalSeriesV1[] = [];
  const billingRecords: ComprehensiveBillRecord[] = [];
  const billingCyclesByMeter: Record<string, BillingCycleV1[]> = {};
  const externalCycleEvidenceByMeter: Record<string, EvidenceItemV1[]> = {};
  const observedTouDemandByMeterAndCycle: Record<
    string,
    Record<string, { values: Partial<Record<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak', number>>; fields?: Partial<Record<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak', string>> }>
  > = {};
  const observedTouEnergyByMeterAndCycle: Record<
    string,
    Record<string, { values: Partial<Record<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak', number>>; fields?: Partial<Record<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak', string>> }>
  > = {};

  for (const meterKey of meterKeys) {
    const i = parsedInterval.meters.find((x) => String(x.meterKey) === meterKey) || null;
    const u = parsedUsage.meters.find((x) => String(x.meterKey) === meterKey) || null;

    // Interval series (kW/kWh)
    if (i && Array.isArray(i.intervals) && i.intervals.length) {
      intervalSeries.push({
        meterId: meterKey,
        intervalMinutes: i.sourceMeta.inferredIntervalMinutes ?? undefined,
        timezone: tz,
        source: 'pgeIntervalCsv',
        points: i.intervals.map((r) => ({
          timestampIso: r.timestampIso,
          intervalMinutes: r.intervalMinutes,
          ...(typeof r.kWh === 'number' ? { kWh: r.kWh } : {}),
          ...(typeof r.kW === 'number' ? { kW: r.kW } : {}),
          ...(typeof (r as any).temperatureF === 'number' ? { temperatureF: (r as any).temperatureF } : {}),
        })),
      });
    }

    // Billing cycles + truth (from usage monthly summaries when available)
    const cycles: BillingCycleV1[] = [];
    const cycleEvidence: EvidenceItemV1[] = [
      { kind: 'assumption', pointer: { source: 'pgeExports', key: 'joinedMeterKey', value: meterKey } },
      { kind: 'assumption', pointer: { source: 'pgeExports', key: 'cycleDerivation', value: 'usage.days + billEndDate (endExclusive next-day local midnight)' } },
      { kind: 'assumption', pointer: { source: 'pgeExports', key: 'timezoneUsed', value: tz } },
    ];

    if (u && Array.isArray(u.monthlySummaries) && u.monthlySummaries.length) {
      const touFields = (u as any)?.sourceMeta?.touKwColumns || {};
      for (const ms of u.monthlySummaries) {
        const billEndLocal = toLocalPartsAtMidnight(ms.billEndDateIso, tz);
        if (!billEndLocal) {
          missingInfo.push({
            id: `pge.exports.billEndDate.parseFailed.${meterKey}`,
            category: 'tariff',
            severity: 'warning',
            description: 'Failed to interpret Bill End Date for cycle derivation.',
          });
          continue;
        }

        // endExclusive = local midnight (billEndDate + 1 day)
        const endExclusiveIso = localMidnightUtcIso({ ...billEndLocal, day: billEndLocal.day + 1, tz });

        // start = local midnight (endExclusive - days)
        const days = Math.max(0, Math.round(Number(ms.days)));
        if (!days) {
          missingInfo.push({
            id: `pge.exports.days.missing.${meterKey}.${ymd(billEndLocal)}`,
            category: 'tariff',
            severity: 'warning',
            description: 'Billing days missing/zero; cannot derive cycle start reliably.',
          });
        }

        const endExclusiveLocal = toLocalPartsAtMidnight(endExclusiveIso, tz) || { ...billEndLocal, day: billEndLocal.day + 1 };
        const startIso = localMidnightUtcIso({ ...endExclusiveLocal, day: endExclusiveLocal.day - days, tz });

        cycles.push({
          startIso,
          endIso: endExclusiveIso,
          label: ymd(billEndLocal),
          timezone: tz,
        });

        // Observed TOU demand buckets (usage-export truth) keyed by cycle label.
        if (ms.kWByTou && Object.keys(ms.kWByTou).length) {
          observedTouDemandByMeterAndCycle[meterKey] = observedTouDemandByMeterAndCycle[meterKey] || {};
          observedTouDemandByMeterAndCycle[meterKey][ymd(billEndLocal)] = {
            values: ms.kWByTou as any,
            fields: {
              onPeak: String(touFields?.onPeak || ''),
              partialPeak: String(touFields?.partialPeak || ''),
              offPeak: String(touFields?.offPeak || ''),
              superOffPeak: String(touFields?.superOffPeak || ''),
            },
          };
        }

        // Observed TOU energy buckets (usage-export truth) keyed by cycle label.
        if (ms.kWhByTou && Object.keys(ms.kWhByTou).length) {
          const touKwhFields = (u as any)?.sourceMeta?.touKwhColumns || {};
          observedTouEnergyByMeterAndCycle[meterKey] = observedTouEnergyByMeterAndCycle[meterKey] || {};
          observedTouEnergyByMeterAndCycle[meterKey][ymd(billEndLocal)] = {
            values: ms.kWhByTou as any,
            fields: {
              onPeak: String(touKwhFields?.onPeak || ''),
              partialPeak: String(touKwhFields?.partialPeak || ''),
              offPeak: String(touKwhFields?.offPeak || ''),
              superOffPeak: String(touKwhFields?.superOffPeak || ''),
            },
          };
        }

        // Synthesize a ComprehensiveBillRecord for reconciliation.
        const billStartDate = new Date(startIso);
        const billEndDate = new Date(endExclusiveIso);
        const rec: ComprehensiveBillRecord = {
          billingName: String(u.identity?.billingName || ''),
          siteAddress: String(u.identity?.siteAddress || ''),
          siteCity: String(u.identity?.siteCity || ''),
          zipCode: String(u.identity?.zip || ''),
          saStatus: '',
          activity: '',
          descriptor: '',
          accountNumber: String(u.identity?.accountNumber || ''),
          meterNumber: String(u.identity?.meterNumber || meterKey),
          nem: false,
          saId: meterKey,
          spId: '',
          prsnId: '',
          naicsCode: '',
          yearOfBillEndDate: billStartDate.getUTCFullYear(),
          billStartDate,
          billEndDate,
          billingDays: days,
          rateCode: String(ms.rateCode || input.rateCodeFallback || ''),
          serviceProvider: String(ms.serviceProvider || ''),
          totalBillAmountPge: Number(ms.dollars?.pgeRevenueAmount || 0),
          chargesPerKwh: 0,
          pgeRevenueAmount: Number(ms.dollars?.pgeRevenueAmount || 0),
          espTotalRevenueAmount: Number(ms.dollars?.espTotalRevenueAmount || 0),
          taxAmount: Number(ms.dollars?.taxAmount || 0),
          totalBillAmount: Number(ms.dollars?.totalBillAmount || 0),
          onPeakKwh: Number(ms.kWhByTou?.onPeak || 0),
          partialPeakKwh: Number(ms.kWhByTou?.partialPeak || 0),
          offPeakKwh: Number(ms.kWhByTou?.offPeak || 0),
          superOffPeakKwh: Number(ms.kWhByTou?.superOffPeak || 0),
          totalUsageKwh: ms.totalKWh !== null ? Number(ms.totalKWh) : 0,
          totalUsageTherms: 0,
          hours: 0,
          maxMaxDemandKw: ms.maxKw !== null ? Number(ms.maxKw) : 0,
          onPeakDemandKw: Number(ms.kWByTou?.onPeak || 0),
          partialPeakDemandKw: Number(ms.kWByTou?.partialPeak || 0),
          offPeakDemandKw: Number(ms.kWByTou?.offPeak || 0),
          superOffPeakDemandKw: Number(ms.kWByTou?.superOffPeak || 0),
          rawRow: {
            meterKey,
            billEndDateIso: ms.billEndDateIso,
            days: ms.days,
            totalKWh: ms.totalKWh,
            maxKw: ms.maxKw,
            ...(ms.kWhByTou ? { kWhByTou: ms.kWhByTou } : {}),
            ...(ms.kWByTou ? { kWByTou: ms.kWByTou } : {}),
            ...(ms.dollars ? { dollars: ms.dollars } : {}),
          },
        };
        billingRecords.push(rec);
      }

      billingCyclesByMeter[meterKey] = cycles;
      externalCycleEvidenceByMeter[meterKey] = cycleEvidence;
    }
  }

  // Determine a rateCode for the pack (best-effort)
  const rateCode = (() => {
    const fromUsage = parsedUsage.meters
      .flatMap((m) => m.monthlySummaries.map((s) => String(s.rateCode || '').trim()))
      .find((x) => x);
    return fromUsage || String(input.rateCodeFallback || '').trim() || '';
  })();

  if (!rateCode) {
    missingInfo.push({
      id: 'pge.exports.rateCode.missing',
      category: 'tariff',
      severity: 'warning',
      description: 'Rate code is missing in usage export and no fallback was provided.',
    });
  }

  // Build pack (explicit cycles when available; otherwise builder falls back to calendar months).
  const pack = buildDeterminantsPackV1({
    utility,
    rateCode,
    supplyType: 'unknown',
    timezone: tz,
    billingRecords: billingRecords.length ? billingRecords : null,
    intervalSeries: intervalSeries.length ? intervalSeries : null,
    ...(Object.keys(billingCyclesByMeter).length ? { billingCyclesByMeter } : {}),
    ...(Object.keys(externalCycleEvidenceByMeter).length ? { externalCycleEvidenceByMeter } : {}),
    ...(Object.keys(observedTouDemandByMeterAndCycle).length ? { observedTouDemandByMeterAndCycle } : {}),
    ...(Object.keys(observedTouEnergyByMeterAndCycle).length ? { observedTouEnergyByMeterAndCycle } : {}),
  });

  // Attach adapter-level MissingInfo and warnings to pack top-level.
  pack.missingInfo = uniqMissing([...(pack.missingInfo || []), ...missingInfo]);
  pack.warnings = Array.from(new Set([...(pack.warnings || []), ...warnings].map((w) => String(w || '').trim()).filter(Boolean)));
  pack.confidenceSummary = {
    confidence: clamp01(pack.confidenceSummary?.confidence ?? 0.3),
    because: [...(pack.confidenceSummary?.because || []), 'PG&E exports adapter: joined usage + interval by meterKey (SA ID / Service Agreement).'],
  };

  const intervalPointsV1ByMeter: Record<string, Array<{ timestampIso: string; intervalMinutes: number; kWh?: number; kW?: number; temperatureF?: number }>> = {};
  for (const m of parsedInterval.meters || []) {
    const meterKey = String((m as any)?.meterKey || '').trim();
    if (!meterKey) continue;
    const pts = Array.isArray((m as any)?.intervals) ? ((m as any).intervals as any[]) : [];
    intervalPointsV1ByMeter[meterKey] = pts.map((p) => ({
      timestampIso: String(p?.timestampIso || '').trim(),
      intervalMinutes: Number(p?.intervalMinutes),
      ...(Number.isFinite(Number(p?.kWh)) ? { kWh: Number(p.kWh) } : {}),
      ...(Number.isFinite(Number(p?.kW)) ? { kW: Number(p.kW) } : {}),
      ...(Number.isFinite(Number(p?.temperatureF)) ? { temperatureF: Number(p.temperatureF) } : {}),
    }));
  }

  return { pack, intervalPointsV1ByMeter };
}

