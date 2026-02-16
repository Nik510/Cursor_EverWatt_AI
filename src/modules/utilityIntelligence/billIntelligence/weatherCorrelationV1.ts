import {
  BillIntelligenceWarningCodesV1,
  type BillIntelligenceV1,
  type WeatherCorrelationSignatureV1,
  type WeatherCorrelationV1,
} from './typesV1';
import type { IntervalPointV1 } from './intervalInsightsV1';

const MIN_HOURLY_POINTS_FOR_CORRELATION = 24;

function roundTo(n: number, decimals: number): number {
  if (!Number.isFinite(n)) return NaN;
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

function addWarning(
  warnings: BillIntelligenceV1['warnings'],
  code: BillIntelligenceV1['warnings'][number]['code'],
  reason: string
): void {
  const key = `${code}|${reason}`.toLowerCase();
  if (warnings.some((w) => `${w.code}|${w.reason}`.toLowerCase() === key)) return;
  warnings.push({ code, reason });
}

function pearsonR(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 2) return null;
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    sx += dx * dx;
    sy += dy * dy;
  }
  if (sx <= 0 || sy <= 0) return null;
  return num / Math.sqrt(sx * sy);
}

function signatureFromCorrelations(args: { rKwh: number | null; rKw: number | null }): WeatherCorrelationSignatureV1 {
  const r1 = args.rKwh;
  const r2 = args.rKw;
  if (!Number.isFinite(r1 as any) && !Number.isFinite(r2 as any)) return 'UNKNOWN';

  const a1 = Number.isFinite(r1 as any) ? Math.abs(Number(r1)) : 0;
  const a2 = Number.isFinite(r2 as any) ? Math.abs(Number(r2)) : 0;
  const maxAbs = Math.max(a1, a2);

  // Guardrail: low absolute correlation -> flat (no clear temperature signature).
  if (maxAbs < 0.15) return 'FLAT';

  const bothPos = Number.isFinite(r1 as any) && Number.isFinite(r2 as any) && Number(r1) >= 0.25 && Number(r2) >= 0.25;
  const bothNeg = Number.isFinite(r1 as any) && Number.isFinite(r2 as any) && Number(r1) <= -0.25 && Number(r2) <= -0.25;
  if (bothPos) return 'COOLING_DOMINANT';
  if (bothNeg) return 'HEATING_DOMINANT';
  return 'MIXED';
}

export function analyzeBillIntelligenceWeatherCorrelationV1(args: {
  intervalPointsV1?: IntervalPointV1[] | null;
}): { weatherCorrelationV1: WeatherCorrelationV1; warnings: BillIntelligenceV1['warnings'] } {
  const warnings: BillIntelligenceV1['warnings'] = [];
  const reasons: WeatherCorrelationV1['reasons'] = [];

  const rawPts = Array.isArray(args.intervalPointsV1) ? args.intervalPointsV1 : [];
  if (!rawPts.length) {
    addWarning(warnings, BillIntelligenceWarningCodesV1.BILL_INTEL_WEATHER_DATA_REQUIRED, 'Interval + weather data required to compute usage vs OAT correlation.');
    reasons.push({ code: BillIntelligenceWarningCodesV1.BILL_INTEL_WEATHER_DATA_REQUIRED, reason: 'No interval points provided.' });
    return { weatherCorrelationV1: { available: false, reasons, signature: 'UNKNOWN' }, warnings };
  }

  // Build hourly buckets (UTC): tempF avg, kWh sum, kW avg.
  const buckets = new Map<string, { tempSum: number; tempN: number; kWhSum: number; kWhN: number; kWSum: number; kWN: number }>();
  for (const p of rawPts) {
    const ts = String((p as any)?.timestampIso || '').trim();
    const mins = Number((p as any)?.intervalMinutes);
    const d = ts ? new Date(ts) : null;
    if (!d || !Number.isFinite(d.getTime())) continue;
    const key = `${d.toISOString().slice(0, 13)}:00Z`; // YYYY-MM-DDTHH:00Z

    const tempF = Number((p as any)?.temperatureF);
    const kWh = Number((p as any)?.kWh);
    const kWExplicit = Number((p as any)?.kW);
    const kWDerived = !Number.isFinite(kWExplicit) && Number.isFinite(kWh) && Number.isFinite(mins) && mins > 0 ? kWh * (60 / mins) : NaN;
    const kW = Number.isFinite(kWExplicit) ? kWExplicit : kWDerived;

    const b = buckets.get(key) || { tempSum: 0, tempN: 0, kWhSum: 0, kWhN: 0, kWSum: 0, kWN: 0 };
    if (Number.isFinite(tempF)) {
      b.tempSum += tempF;
      b.tempN += 1;
    }
    if (Number.isFinite(kWh)) {
      b.kWhSum += kWh;
      b.kWhN += 1;
    }
    if (Number.isFinite(kW)) {
      b.kWSum += kW;
      b.kWN += 1;
    }
    buckets.set(key, b);
  }

  const hourlyTemp: number[] = [];
  const hourlyKwh: number[] = [];
  const hourlyKw: number[] = [];

  // Stable ordering: sort by bucket key (ISO).
  const keys = Array.from(buckets.keys()).sort();
  for (const k of keys) {
    const b = buckets.get(k)!;
    if (b.tempN <= 0) continue;
    const t = b.tempSum / b.tempN;
    if (Number.isFinite(t)) {
      // For kWh correlation we require at least one kWh point in the hour.
      if (b.kWhN > 0) {
        hourlyTemp.push(t);
        hourlyKwh.push(b.kWhSum); // sum kWh within hour
      }
      // For kW correlation we require at least one kW point in the hour.
      if (b.kWN > 0) {
        hourlyKw.push(b.kWSum / b.kWN); // average kW within hour
      }
    }
  }

  const anyTempHours = keys.some((k) => (buckets.get(k)?.tempN || 0) > 0);
  if (!anyTempHours) {
    addWarning(warnings, BillIntelligenceWarningCodesV1.BILL_INTEL_WEATHER_DATA_REQUIRED, 'Weather (OAT) is required to compute correlation metrics.');
    addWarning(warnings, BillIntelligenceWarningCodesV1.BILL_INTEL_WEATHER_DATA_MISSING_OAT, 'No temperatureF values found in interval points.');
    reasons.push({ code: BillIntelligenceWarningCodesV1.BILL_INTEL_WEATHER_DATA_MISSING_OAT, reason: 'No temperatureF values found.' });
    return { weatherCorrelationV1: { available: false, reasons, signature: 'UNKNOWN' }, warnings };
  }

  const out: WeatherCorrelationV1 = { available: false, reasons, signature: 'UNKNOWN' };

  // Correlate kWh vs temp (paired arrays already aligned via push order).
  let rKwh: number | null = null;
  if (hourlyKwh.length >= MIN_HOURLY_POINTS_FOR_CORRELATION) {
    rKwh = pearsonR(hourlyKwh, hourlyTemp);
    if (Number.isFinite(rKwh as any)) {
      out.correlationCoeff_kwh_vs_oat = roundTo(Number(rKwh), 4);
      out.available = true;
    } else {
      addWarning(
        warnings,
        BillIntelligenceWarningCodesV1.BILL_INTEL_WEATHER_DATA_INSUFFICIENT_POINTS,
        'kWh vs OAT correlation not computable (zero variance in kWh or temperature across hourly buckets).'
      );
      reasons.push({
        code: BillIntelligenceWarningCodesV1.BILL_INTEL_WEATHER_DATA_INSUFFICIENT_POINTS,
        reason: 'kWh vs OAT correlation denominator was zero (no variance).',
      });
    }
  } else if (hourlyKwh.length) {
    addWarning(
      warnings,
      BillIntelligenceWarningCodesV1.BILL_INTEL_WEATHER_DATA_INSUFFICIENT_POINTS,
      `Insufficient hourly buckets with both kWh and temperature for correlation (need >=${MIN_HOURLY_POINTS_FOR_CORRELATION}, got ${hourlyKwh.length}).`
    );
    reasons.push({
      code: BillIntelligenceWarningCodesV1.BILL_INTEL_WEATHER_DATA_INSUFFICIENT_POINTS,
      reason: `Not enough hourly (kWh,temp) pairs (need >=${MIN_HOURLY_POINTS_FOR_CORRELATION}).`,
    });
  }

  // Correlate kW vs temp: need paired hourly averages. We need matching temp for each kw hour; rebuild paired arrays.
  const tempForKw: number[] = [];
  const kwForTemp: number[] = [];
  for (const k of keys) {
    const b = buckets.get(k)!;
    if (b.tempN <= 0 || b.kWN <= 0) continue;
    const t = b.tempSum / b.tempN;
    const kw = b.kWSum / b.kWN;
    if (Number.isFinite(t) && Number.isFinite(kw)) {
      tempForKw.push(t);
      kwForTemp.push(kw);
    }
  }

  let rKw: number | null = null;
  if (kwForTemp.length >= MIN_HOURLY_POINTS_FOR_CORRELATION) {
    rKw = pearsonR(kwForTemp, tempForKw);
    if (Number.isFinite(rKw as any)) {
      out.correlationCoeff_kw_vs_oat = roundTo(Number(rKw), 4);
      out.available = true;
    } else {
      addWarning(
        warnings,
        BillIntelligenceWarningCodesV1.BILL_INTEL_WEATHER_DATA_INSUFFICIENT_POINTS,
        'kW vs OAT correlation not computable (zero variance in kW or temperature across hourly buckets).'
      );
      reasons.push({
        code: BillIntelligenceWarningCodesV1.BILL_INTEL_WEATHER_DATA_INSUFFICIENT_POINTS,
        reason: 'kW vs OAT correlation denominator was zero (no variance).',
      });
    }
  } else if (kwForTemp.length) {
    addWarning(
      warnings,
      BillIntelligenceWarningCodesV1.BILL_INTEL_WEATHER_DATA_INSUFFICIENT_POINTS,
      `Insufficient hourly buckets with both kW and temperature for correlation (need >=${MIN_HOURLY_POINTS_FOR_CORRELATION}, got ${kwForTemp.length}).`
    );
    reasons.push({
      code: BillIntelligenceWarningCodesV1.BILL_INTEL_WEATHER_DATA_INSUFFICIENT_POINTS,
      reason: `Not enough hourly (kW,temp) pairs (need >=${MIN_HOURLY_POINTS_FOR_CORRELATION}).`,
    });
  }

  out.signature = signatureFromCorrelations({ rKwh, rKw });
  if (!out.available && out.signature !== 'UNKNOWN') out.available = true;

  return { weatherCorrelationV1: out, warnings };
}

