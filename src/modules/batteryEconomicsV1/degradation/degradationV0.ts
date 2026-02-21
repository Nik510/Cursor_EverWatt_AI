import { clamp01, roundTo, safeNum, sumFixedOrder } from '../helpers';
import type {
  BatteryEconomicsAuditLineItemV1,
  BatteryEconomicsBatteryV1,
  BatteryEconomicsDegradationInputsV0,
  BatteryEconomicsDegradationOutputsV0,
} from '../types';

export const DegradationReasonCodesV0 = {
  DEGRADATION_V0_DEFAULT_FADE_USED: 'battery.degradation.v0.default_fade_used',
  DEGRADATION_V0_AUGMENT_COST_MISSING: 'battery.degradation.v0.augmentation_cost_missing',
  DEGRADATION_V0_REPLACEMENT_PCT_MISSING: 'battery.degradation.v0.replacement_pct_missing',
  DEGRADATION_V0_USABLE_KWH_MISSING: 'battery.degradation.v0.usable_kwh_missing',
} as const;

const DEFAULT_ANNUAL_FADE_PCT = 0.02 as const;
const DEFAULT_EOL_CAPACITY_PCT = 0.7 as const;

function numOrNull(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function qty(id: string, unit: string, value: number | null): { id: string; unit: string; value: number | null } {
  return { id: String(id), unit: String(unit), value: safeNum(value) };
}

function mkLineItem(args: {
  id: string;
  label: string;
  amountUsdRaw: number | null;
  basis: string;
  sourcePath: string;
  quantities?: BatteryEconomicsAuditLineItemV1['quantities'];
  notes?: string | null;
}): BatteryEconomicsAuditLineItemV1 {
  const raw = args.amountUsdRaw === null ? null : Number(args.amountUsdRaw);
  const rounded = raw === null || !Number.isFinite(raw) ? null : roundTo(raw, 2);
  return {
    id: String(args.id),
    label: String(args.label),
    amountUsd: rounded,
    amountUsdRaw: raw !== null && Number.isFinite(raw) ? raw : null,
    basis: String(args.basis || ''),
    sourceEngine: 'assumption',
    sourcePath: String(args.sourcePath || ''),
    snapshotId: null,
    rateSource: null,
    quantities: Array.isArray(args.quantities) ? args.quantities : null,
    notes: args.notes ?? null,
  };
}

function usableKwhInitial(battery: BatteryEconomicsBatteryV1 | null | undefined): number | null {
  const b = battery || null;
  const usable = safeNum((b as any)?.usableKwh);
  if (usable !== null && usable > 0) return usable;
  const e = safeNum(b?.energyKwh);
  const uf = safeNum(b?.usableFraction);
  if (e !== null && e > 0 && uf !== null && uf > 0 && uf <= 1) return e * uf;
  if (e !== null && e > 0) return e;
  return null;
}

export function calcDegradationV0(args: {
  degradationInputsV0: BatteryEconomicsDegradationInputsV0 | null | undefined;
  battery: BatteryEconomicsBatteryV1 | null | undefined;
  analysisHorizonYears: number;
  initialCapexTotalUsd: number | null;
}): {
  degradationV0: BatteryEconomicsDegradationOutputsV0 | null;
  extraCashflowYears1toNUsd: number[] | null;
  auditLineItems: BatteryEconomicsAuditLineItemV1[];
} {
  const in0 = args.degradationInputsV0;
  if (!in0) return { degradationV0: null, extraCashflowYears1toNUsd: null, auditLineItems: [] };

  const warnings: string[] = [];

  const fade = (() => {
    const x = numOrNull(in0.annualCapacityFadePct);
    if (x === null) {
      warnings.push(DegradationReasonCodesV0.DEGRADATION_V0_DEFAULT_FADE_USED);
      return DEFAULT_ANNUAL_FADE_PCT;
    }
    return Math.max(0, Math.min(0.2, x)); // conservative bound
  })();

  const eolPct = (() => {
    const x = numOrNull(in0.endOfLifeCapacityPct);
    if (x === null) return DEFAULT_EOL_CAPACITY_PCT;
    return clamp01(x) || DEFAULT_EOL_CAPACITY_PCT;
  })();

  const horizon = Math.max(1, Math.floor(numOrNull(in0.analysisHorizonYears) ?? args.analysisHorizonYears));

  const strategy = (() => {
    const s = String(in0.augmentationStrategy || '').trim();
    if (s === 'augment_to_hold_usable_kwh' || s === 'replace_at_eol') return s;
    return 'none' as const;
  })();

  const initialUsableKwh = usableKwhInitial(args.battery);
  if (initialUsableKwh === null) warnings.push(DegradationReasonCodesV0.DEGRADATION_V0_USABLE_KWH_MISSING);

  const naturalMult: number[] = [];
  for (let y = 1; y <= horizon; y++) naturalMult.push(Math.max(0, (1 - fade) ** y));

  const replacementYear = (() => {
    if (strategy !== 'replace_at_eol') return null;
    for (let y = 1; y <= horizon; y++) if (naturalMult[y - 1] < eolPct - 1e-12) return y;
    return null;
  })();

  const effMult: number[] = [];
  const augmentationEvents: BatteryEconomicsDegradationOutputsV0['augmentationEvents'] = [];
  const extraCashflow: number[] = Array.from({ length: horizon }, () => 0);
  const audit: BatteryEconomicsAuditLineItemV1[] = [];

  let augmentedCumKwh = 0;
  for (let y = 1; y <= horizon; y++) {
    const nat = naturalMult[y - 1] ?? 0;
    if (strategy === 'augment_to_hold_usable_kwh') {
      const reqCum = initialUsableKwh === null ? null : Math.max(0, initialUsableKwh * (1 - nat));
      const inc = reqCum === null ? null : Math.max(0, reqCum - augmentedCumKwh);
      if (inc !== null) augmentedCumKwh += inc;
      effMult.push(1);

      if (inc !== null && inc > 1e-12) {
        const costPerKwh = numOrNull(in0.augmentationCostUsdPerKwh);
        if (costPerKwh === null) warnings.push(DegradationReasonCodesV0.DEGRADATION_V0_AUGMENT_COST_MISSING);
        const capexUsd = costPerKwh === null ? null : inc * costPerKwh;
        if (capexUsd !== null) extraCashflow[y - 1] -= capexUsd;
        augmentationEvents.push({ year: y, addedKwh: roundTo(inc, 6), capexUsd: capexUsd === null ? null : roundTo(capexUsd, 2) });
        audit.push(
          mkLineItem({
            id: `battery.degradation.v0.augmentation_capex.year${y}`,
            label: `Battery augmentation CAPEX (year ${y})`,
            amountUsdRaw: capexUsd === null ? null : -Math.abs(capexUsd),
            basis: capexUsd === null ? 'unavailable' : `capexUsd = addedKwh * augmentationCostUsdPerKwh`,
            sourcePath: 'degradationV0.augmentation',
            quantities: [qty('addedKwh', 'kWh', inc), qty('augmentationCostUsdPerKwh', '$/kWh', costPerKwh)],
          }),
        );
      }
      continue;
    }

    if (strategy === 'replace_at_eol' && replacementYear !== null && y >= replacementYear) {
      const postYears = y - replacementYear;
      effMult.push(Math.max(0, (1 - fade) ** postYears));
      continue;
    }

    effMult.push(nat);
  }

  const replacementEvent = (() => {
    if (strategy !== 'replace_at_eol' || replacementYear === null) return null;
    const pct = numOrNull(in0.replacementCapexPctOfInitial);
    if (pct === null) warnings.push(DegradationReasonCodesV0.DEGRADATION_V0_REPLACEMENT_PCT_MISSING);
    const capex = numOrNull(args.initialCapexTotalUsd);
    const capexUsd = pct === null || capex === null ? null : Math.max(0, capex) * Math.max(0, pct);
    if (capexUsd !== null) extraCashflow[replacementYear - 1] -= capexUsd;
    audit.push(
      mkLineItem({
        id: 'battery.degradation.v0.replacement_capex',
        label: `Battery replacement CAPEX (year ${replacementYear})`,
        amountUsdRaw: capexUsd === null ? null : -Math.abs(capexUsd),
        basis: capexUsd === null ? 'unavailable' : `capexUsd = replacementCapexPctOfInitial * initialCapexTotalUsd`,
        sourcePath: 'degradationV0.replacement',
        quantities: [qty('replacementCapexPctOfInitial', 'fraction', pct), qty('initialCapexTotalUsd', '$', capex)],
      }),
    );
    return { year: replacementYear, capexUsd: capexUsd === null ? null : roundTo(capexUsd, 2) };
  })();

  // Roll-up totals for deterministic audit convenience.
  const augTotalRaw = sumFixedOrder(
    audit
      .filter((li) => String(li.id).startsWith('battery.degradation.v0.augmentation_capex.year'))
      .map((li) => safeNum(li.amountUsdRaw)),
  );
  if (augTotalRaw !== null) {
    audit.push(
      mkLineItem({
        id: 'battery.degradation.v0.augmentation_capex',
        label: 'Battery augmentation CAPEX (total)',
        amountUsdRaw: augTotalRaw,
        basis: 'sum of augmentation capex events (fixed order)',
        sourcePath: 'degradationV0.augmentation',
        quantities: [],
      }),
    );
  }

  const usableKwhByYear = effMult.map((m) => (initialUsableKwh === null ? 0 : roundTo(Math.max(0, initialUsableKwh) * Math.max(0, m), 6)));
  const effMultRounded = effMult.map((m) => roundTo(Math.max(0, m), 9));

  const out: BatteryEconomicsDegradationOutputsV0 = {
    usableKwhByYear,
    effectiveSavingsMultiplierByYear: effMultRounded,
    augmentationEvents: augmentationEvents.slice().sort((a, b) => a.year - b.year),
    replacementEvent,
    warnings: warnings.sort((a, b) => a.localeCompare(b)),
  };

  return { degradationV0: out, extraCashflowYears1toNUsd: extraCashflow, auditLineItems: audit };
}

