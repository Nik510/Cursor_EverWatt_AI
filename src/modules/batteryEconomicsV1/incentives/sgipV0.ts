import { roundTo, safeNum } from '../helpers';
import type { BatteryEconomicsAuditLineItemV1, BatteryEconomicsBatteryV1, BatteryEconomicsSgipInputsV0, BatteryEconomicsSgipOutputsV0 } from '../types';
import { getSgipSnapshotV0 } from '../../sgipLibraryV0';

export const SgipReasonCodesV0 = {
  SGIP_V0_SNAPSHOT_MISSING: 'sgip.v0.snapshot_missing',
  SGIP_V0_ENERGY_ONLY_ESTIMATE: 'sgip.v0.energy_only_estimate',
  SGIP_V0_ELIGIBILITY_UNKNOWN: 'sgip.v0.eligibility_unknown',
  SGIP_V0_PROVISIONAL_SEED: 'sgip.v0.provisional_seed',
} as const;

const NAMEPLATE_TO_USABLE_KWH_FALLBACK_FACTOR_V0 = 0.9 as const;

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
  snapshotId?: string | null;
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
    snapshotId: args.snapshotId ?? null,
    rateSource: null,
    quantities: Array.isArray(args.quantities) ? args.quantities : null,
    notes: args.notes ?? null,
  };
}

export function calcSgipAwardV0(args: {
  sgipInputsV0: BatteryEconomicsSgipInputsV0 | null | undefined;
  battery: BatteryEconomicsBatteryV1 | null | undefined;
}): { sgipV0: BatteryEconomicsSgipOutputsV0 | null; auditLineItems: BatteryEconomicsAuditLineItemV1[] } {
  const in0 = args.sgipInputsV0;
  if (!in0) return { sgipV0: null, auditLineItems: [] };

  const warnings: string[] = [];

  const eligible = in0.eligible;
  const category = in0.category;
  const capReq = numOrNull(in0.requestedIncentiveCapUsd);
  const effectiveYmd = String(in0.effectiveYmd || '').trim() || null;

  const snapSel = getSgipSnapshotV0(effectiveYmd, 'BILL_PERIOD_START_ELSE_LATEST');
  warnings.push(...(snapSel.warnings || []));
  if ((snapSel.warnings || []).includes('sgip.v0.provisional_seed')) warnings.push(SgipReasonCodesV0.SGIP_V0_PROVISIONAL_SEED);

  if (eligible !== true) {
    if (eligible === null) warnings.push(SgipReasonCodesV0.SGIP_V0_ELIGIBILITY_UNKNOWN);
    const out: BatteryEconomicsSgipOutputsV0 = {
      ok: false,
      awardUsd: null,
      awardUsdPerKwh: null,
      basisKwh: null,
      warnings: warnings.sort((a, b) => a.localeCompare(b)),
      ...(snapSel.snapshotIdUsed ? { snapshotIdUsed: snapSel.snapshotIdUsed } : {}),
      ...(snapSel.acquisitionMethodUsed ? { acquisitionMethodUsed: snapSel.acquisitionMethodUsed } : {}),
    };

    const li = mkLineItem({
      id: 'incentive.sgip.v0.award',
      label: 'SGIP incentive (v0, award)',
      amountUsdRaw: null,
      basis: eligible === false ? 'ineligible (explicit)' : 'eligibility unknown',
      sourcePath: 'sgipV0.award',
      snapshotId: snapSel.snapshotIdUsed,
      quantities: [qty('basisKwh', 'kWh', null), qty('rateUsdPerWh', '$/Wh', null), qty('capUsd', '$', capReq)],
    });
    return { sgipV0: out, auditLineItems: [li] };
  }

  if (!category) {
    warnings.push(SgipReasonCodesV0.SGIP_V0_ELIGIBILITY_UNKNOWN);
    const out: BatteryEconomicsSgipOutputsV0 = {
      ok: false,
      awardUsd: null,
      awardUsdPerKwh: null,
      basisKwh: null,
      warnings: warnings.sort((a, b) => a.localeCompare(b)),
      ...(snapSel.snapshotIdUsed ? { snapshotIdUsed: snapSel.snapshotIdUsed } : {}),
      ...(snapSel.acquisitionMethodUsed ? { acquisitionMethodUsed: snapSel.acquisitionMethodUsed } : {}),
    };
    const li = mkLineItem({
      id: 'incentive.sgip.v0.award',
      label: 'SGIP incentive (v0, award)',
      amountUsdRaw: null,
      basis: 'eligible=true but category missing',
      sourcePath: 'sgipV0.award',
      snapshotId: snapSel.snapshotIdUsed,
      quantities: [qty('basisKwh', 'kWh', null), qty('rateUsdPerWh', '$/Wh', null), qty('capUsd', '$', capReq)],
    });
    return { sgipV0: out, auditLineItems: [li] };
  }

  if (!snapSel.ok || !snapSel.snapshot) {
    warnings.push(SgipReasonCodesV0.SGIP_V0_SNAPSHOT_MISSING);
    const out: BatteryEconomicsSgipOutputsV0 = {
      ok: false,
      awardUsd: null,
      awardUsdPerKwh: null,
      basisKwh: null,
      warnings: warnings.sort((a, b) => a.localeCompare(b)),
    };
    const li = mkLineItem({
      id: 'incentive.sgip.v0.award',
      label: 'SGIP incentive (v0, award)',
      amountUsdRaw: null,
      basis: 'snapshot missing',
      sourcePath: 'sgipV0.award',
      snapshotId: null,
      quantities: [qty('basisKwh', 'kWh', null), qty('rateUsdPerWh', '$/Wh', null), qty('capUsd', '$', capReq)],
    });
    return { sgipV0: out, auditLineItems: [li] };
  }

  const bat = args.battery || null;
  const usableKwh = numOrNull((bat as any)?.usableKwh);
  const nameplateKwh = numOrNull(bat?.energyKwh);
  const basisKwh = (() => {
    if (usableKwh !== null && usableKwh > 0) return usableKwh;
    if (nameplateKwh !== null && nameplateKwh > 0) return nameplateKwh * NAMEPLATE_TO_USABLE_KWH_FALLBACK_FACTOR_V0;
    return null;
  })();
  if (!(usableKwh !== null && usableKwh > 0)) warnings.push(SgipReasonCodesV0.SGIP_V0_ENERGY_ONLY_ESTIMATE);

  const rate = (snapSel.snapshot.incentiveRates as any)?.[category] || null;
  const rateUsdPerWh = numOrNull(rate?.rateUsdPerWh);
  const awardRaw = (() => {
    if (basisKwh === null) return null;
    if (rateUsdPerWh === null) return null;
    const wh = basisKwh * 1000;
    const uncapped = wh * rateUsdPerWh;
    if (capReq !== null) return Math.min(uncapped, Math.max(0, capReq));
    return uncapped;
  })();

  const awardUsdPerKwh = awardRaw === null || basisKwh === null || !(basisKwh > 0) ? null : awardRaw / basisKwh;
  const out: BatteryEconomicsSgipOutputsV0 = {
    ok: awardRaw !== null,
    awardUsd: awardRaw === null ? null : roundTo(awardRaw, 2),
    awardUsdPerKwh: awardUsdPerKwh === null ? null : roundTo(awardUsdPerKwh, 6),
    basisKwh: basisKwh === null ? null : roundTo(basisKwh, 6),
    snapshotIdUsed: snapSel.snapshotIdUsed || undefined,
    acquisitionMethodUsed: snapSel.acquisitionMethodUsed || undefined,
    warnings: warnings.sort((a, b) => a.localeCompare(b)),
  };

  const sourcePath = `sgipLibraryV0.snapshot.${String(snapSel.snapshotIdUsed)}.incentiveRates.${String(category)}`;
  const li = mkLineItem({
    id: 'incentive.sgip.v0.award',
    label: 'SGIP incentive (v0, award)',
    amountUsdRaw: awardRaw,
    basis: awardRaw === null ? 'unavailable' : `Wh=basisKwh*1000; award=Wh*rateUsdPerWh; cap applied if provided`,
    sourcePath,
    snapshotId: snapSel.snapshotIdUsed,
    quantities: [
      qty('basisKwh', 'kWh', basisKwh),
      qty('rateUsdPerWh', '$/Wh', rateUsdPerWh),
      qty('capUsd', '$', capReq),
    ],
    notes: `category=${String(category)}`,
  });

  return { sgipV0: out, auditLineItems: [li] };
}

