import fs from 'node:fs';
import path from 'node:path';

import { buildDeterminantsFromPgeExportsV1 } from '../src/modules/determinants/adapters/pge/buildDeterminantsFromPgeExports';
import { analyzeLoadAttributionV1 } from '../src/modules/loadAttribution/analyzeLoadAttribution';
import { parsePgeUsageCsvV1 } from '../src/modules/determinants/adapters/pge/parsePgeUsageCsv';
import { getZonedParts } from '../src/modules/billingEngineV1/time/zonedTime';

const INTERVAL_FILE = 'LOS GATOS - INTERVAL.csv';
const USAGE_FILE = 'LOS GATOS - USAGE.csv';

function readCsvText(filename: string): string {
  const abs = path.join(process.cwd(), filename);
  try {
    return fs.readFileSync(abs, 'utf-8');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[smoke:pge] Failed to read ${filename}: ${msg}`);
    process.exitCode = 1;
    return '';
  }
}

function fmtNum(n: unknown, digits = 2): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return v.toFixed(digits);
}

function fmtPct(n: unknown, digits = 1): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${(v * 100).toFixed(digits)}%`;
}

function getCanonicalPoints(points: Array<{ timestampIso: string; intervalMinutes: number; kWh?: number; kW?: number; temperatureF?: number }>) {
  return points
    .map((p) => {
      const mins = Number(p.intervalMinutes);
      const kW = Number(p.kW);
      const kWh = Number(p.kWh);
      const kw =
        Number.isFinite(kW) ? kW : Number.isFinite(kWh) && Number.isFinite(mins) && mins > 0 ? kWh * (60 / mins) : NaN;
      const temperatureF = Number(p.temperatureF);
      return {
        timestampIso: String(p.timestampIso || '').trim(),
        kw,
        ...(Number.isFinite(temperatureF) ? { temperatureF } : {}),
      };
    })
    .filter((p) => p.timestampIso && Number.isFinite(p.kw));
}

function printTouDemand(tou: Record<string, number> | null | undefined): string {
  if (!tou) return '—';
  const onPeak = fmtNum((tou as any).onPeak, 2);
  const partialPeak = fmtNum((tou as any).partialPeak, 2);
  const offPeak = fmtNum((tou as any).offPeak, 2);
  const superOffPeak = fmtNum((tou as any).superOffPeak, 2);
  return `onPeak=${onPeak} partialPeak=${partialPeak} offPeak=${offPeak} superOffPeak=${superOffPeak}`;
}

function extractEvidenceValue(evidence: any[] | undefined, key: string): string | null {
  if (!Array.isArray(evidence)) return null;
  const hit = evidence.find((e) => String(e?.pointer?.key || '') === key);
  if (!hit) return null;
  return String(hit?.pointer?.value ?? '').trim() || null;
}

function ymdFromIso(iso: string, tz: string): string | null {
  const ms = new Date(String(iso || '').trim()).getTime();
  if (!Number.isFinite(ms)) return null;
  const parts = getZonedParts(new Date(ms), tz);
  if (!parts) return null;
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function fmtIso(iso: string | null | undefined): string {
  return iso ? String(iso) : '—';
}

async function main() {
  const intervalCsvText = readCsvText(INTERVAL_FILE);
  const usageCsvText = readCsvText(USAGE_FILE);
  const timezoneHint = 'America/Los_Angeles';

  const { pack, intervalPointsV1ByMeter } = buildDeterminantsFromPgeExportsV1({
    intervalCsvText,
    usageCsvText,
    timezoneHint,
    utility: 'PGE',
  });
  const usageParsed = usageCsvText
    ? parsePgeUsageCsvV1({ csvTextOrBuffer: usageCsvText, timezoneHint })
    : { meters: [] as any[] };

  const meters = Array.isArray(pack?.meters) ? pack.meters : [];
  const meterKeys = meters.map((m) => String(m?.meterId || '').trim()).filter(Boolean);
  const totalCycles = meters.reduce((sum, m) => sum + (Array.isArray(m.cycles) ? m.cycles.length : 0), 0);

  console.log('[smoke:pge] Determinants smoke test');
  console.log(`[smoke:pge] Meters found: ${meterKeys.length ? meterKeys.join(', ') : 'none'}`);

  for (const meter of meters) {
    const meterId = String(meter?.meterId || '').trim() || 'unknown';
    const cycles = Array.isArray(meter?.cycles) ? meter.cycles.slice() : [];
    cycles.sort((a, b) => new Date(b.cycle.endIso).getTime() - new Date(a.cycle.endIso).getTime());
    console.log(`[smoke:pge] Meter ${meterId}: billingCycles=${cycles.length}`);

    const recent = cycles[0];
    if (recent) {
      const match = Array.isArray((meter as any)?.reconciliation?.matches)
        ? (meter as any).reconciliation.matches.find((m: any) => String(m?.cycleLabel || '') === String(recent.cycle.label || ''))
        : null;
      const mismatchPct = Number.isFinite(match?.deltaDemandPct)
        ? match.deltaDemandPct
        : Number.isFinite(match?.deltaKwhPct)
          ? match.deltaKwhPct
          : null;

      console.log(
        `[smoke:pge]   latest cycle ${recent.cycle.label}: kWhTotal=${fmtNum(recent.energy?.kwhTotal, 1)} ` +
          `kWMax=${fmtNum(recent.demand?.kWMax, 2)} coveragePct=${fmtPct(recent.demand?.coveragePct, 1)} ` +
          `mismatchPct=${mismatchPct !== null ? fmtPct(mismatchPct, 1) : '—'}`,
      );
      console.log(`[smoke:pge]   kWMaxByTouPeriod: ${printTouDemand(recent.demand?.kWMaxByTouPeriod || null)}`);
      const observedLabels = extractEvidenceValue(recent.evidence as any[], 'touLabelsObserved');
      const unusedBuckets = extractEvidenceValue(recent.evidence as any[], 'touCanonicalBucketsUnused');
      if (observedLabels || unusedBuckets) {
        console.log(
          `[smoke:pge]   TOU labels observed: ${observedLabels || '—'}; unused buckets: ${unusedBuckets || '—'}`,
        );
      }
    }

    const mismatched = Array.isArray((meter as any)?.reconciliation?.matches)
      ? (meter as any).reconciliation.matches.find((m: any) => m && m.ok === false)
      : null;
    if (mismatched) {
      const label = String(mismatched?.cycleLabel || '').trim();
      const cycle = cycles.find((c) => String(c?.cycle?.label || '') === label) || null;
      const cycleStartIso = cycle?.cycle?.startIso || mismatched?.startIso || null;
      const cycleEndIso = cycle?.cycle?.endIso || mismatched?.endIso || null;
      const cycleStartMs = cycleStartIso ? new Date(cycleStartIso).getTime() : NaN;
      const cycleEndMs = cycleEndIso ? new Date(cycleEndIso).getTime() : NaN;
      const intervalPoints = intervalPointsV1ByMeter?.[meterId] || [];
      const inCycle = intervalPoints
        .map((p) => String(p.timestampIso || '').trim())
        .filter((ts) => {
          const ms = new Date(ts).getTime();
          return Number.isFinite(ms) && Number.isFinite(cycleStartMs) && Number.isFinite(cycleEndMs) && ms >= cycleStartMs && ms < cycleEndMs;
        })
        .sort();
      const firstIntervalTs = inCycle[0] || null;
      const lastIntervalTs = inCycle.length ? inCycle[inCycle.length - 1] : null;

      const usageMeter = (usageParsed.meters || []).find((m: any) => String(m?.meterKey || '').trim() === meterId) || null;
      const usageSummary = usageMeter
        ? (usageMeter.monthlySummaries || []).find((s: any) => ymdFromIso(String(s?.billEndDateIso || ''), timezoneHint) === label) || null
        : null;
      const billedDays = Number.isFinite(Number(usageSummary?.days)) ? Number(usageSummary.days) : null;
      const billEndDateIso = usageSummary?.billEndDateIso ? String(usageSummary.billEndDateIso) : null;

      const expectedIntervals = cycle?.demand?.expectedIntervalCount ?? null;
      const observedIntervals = cycle?.demand?.intervalCount ?? null;
      const coveragePct = cycle?.demand?.coveragePct ?? null;

      console.log('[smoke:pge] Reconciliation debug (first mismatch)');
      console.log(`[smoke:pge]   meter=${meterId} cycle=${label || '—'}`);
      console.log(`[smoke:pge]   cycleStartIso=${fmtIso(cycleStartIso)} cycleEndExclusiveIso=${fmtIso(cycleEndIso)}`);
      console.log(
        `[smoke:pge]   expectedIntervals=${Number.isFinite(expectedIntervals as any) ? Number(expectedIntervals) : '—'} ` +
          `observedIntervals=${Number.isFinite(observedIntervals as any) ? Number(observedIntervals) : '—'} ` +
          `coveragePct=${fmtPct(coveragePct, 1)}`,
      );
      console.log(`[smoke:pge]   firstIntervalTs=${fmtIso(firstIntervalTs)} lastIntervalTs=${fmtIso(lastIntervalTs)}`);
      console.log(
        `[smoke:pge]   billedDays=${Number.isFinite(billedDays as any) ? Number(billedDays) : '—'} billEndDateIso=${fmtIso(billEndDateIso)}`,
      );
      console.log(
        `[smoke:pge]   computedKwh=${fmtNum(cycle?.energy?.kwhTotal, 1)} billedKwh=${fmtNum(mismatched?.billKwh, 1)} ` +
          `computedKwMax=${fmtNum(cycle?.demand?.kWMax, 2)} billedKwMax=${fmtNum(mismatched?.billDemandKw, 2)}`,
      );
    }

    const intervalPoints = intervalPointsV1ByMeter?.[meterId] || [];
    if (intervalPoints.length) {
      const canonical = getCanonicalPoints(intervalPoints);
      const loadAttribution = analyzeLoadAttributionV1({
        points: canonical,
        minPoints: 1000,
        minTempStddevF: 3,
      });
      console.log(
        `[smoke:pge]   loadAttribution: classification=${String(loadAttribution.classification || 'n/a')} ` +
          `r2=${fmtNum(loadAttribution.r2, 2)} balanceTempF=${fmtNum(loadAttribution.balanceTempF, 0)} ` +
          `baseLoadKw=${fmtNum(loadAttribution.baseLoadKw, 1)} coolingSlope=${fmtNum(loadAttribution.coolingSlopeKwPerF, 2)} ` +
          `heatingSlope=${fmtNum(loadAttribution.heatingSlopeKwPerF, 2)} status=${String(loadAttribution.status || 'unknown')}`,
      );
    } else {
      console.log('[smoke:pge]   loadAttribution: no interval points available');
    }
  }

  if (Array.isArray(pack?.missingInfo) && pack.missingInfo.length) {
    const entries = pack.missingInfo.map((m) => {
      const label = [String(m?.meterKey || ''), String(m?.billingCycleLabel || '')].filter(Boolean).join(' ');
      const det = m?.details ? JSON.stringify(m.details) : '';
      return [label, String(m?.description || m?.id || '').trim(), det].filter(Boolean).join(' — ');
    });
    console.log(`[smoke:pge] MissingInfo: ${entries.length ? entries.join(' | ') : 'none'}`);
  }

  process.exitCode = meterKeys.length > 0 && totalCycles > 0 ? 0 : 1;
}

void main();
