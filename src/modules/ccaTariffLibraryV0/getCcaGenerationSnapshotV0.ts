import path from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

import type { CaIouUtilityV0, CcaGenerationSnapshotLookupResultV0, CcaGenerationTouSnapshotV0, CcaIdV0, GenerationTouEnergySignalsV0, TouPriceWindowV0 } from './types';
import { CcaTariffLibraryReasonCodesV0, uniqSorted } from './reasons';
import { ccaDisplayNameForIdV0 } from './registry';

function safeYmd(s: unknown): string | null {
  const x = String(s ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return null;
  return x;
}

function parseJsonFile(fp: string): any | null {
  try {
    if (!existsSync(fp)) return null;
    return JSON.parse(readFileSync(fp, 'utf-8'));
  } catch {
    return null;
  }
}

function asIouUtilityV0(raw: unknown): CaIouUtilityV0 | null {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (s === 'PGE' || s === 'PG&E' || s === 'PACIFICGASANDELECTRIC' || s === 'PACIFICGASELECTRIC') return 'PGE';
  if (s === 'SCE' || s === 'SOUTHERNCALIFORNIAEDISON') return 'SCE';
  if (s === 'SDGE' || s === 'SDG&E' || s === 'SANDIEGOGASANDELECTRIC') return 'SDGE';
  return null;
}

function toTouWindows(snapshot: CcaGenerationTouSnapshotV0): TouPriceWindowV0[] {
  const out: TouPriceWindowV0[] = [];
  for (const p of snapshot.touPeriods || []) {
    const pid = String((p as any)?.periodId || '').trim();
    const startMin = Number((p as any)?.startMin);
    const endMin = Number((p as any)?.endMin);
    const price = Number((p as any)?.pricePerKwh);
    if (!pid) continue;
    if (!Number.isFinite(startMin) || !Number.isFinite(endMin) || !(startMin >= 0) || !(endMin > 0) || !(endMin <= 1440)) continue;
    if (!Number.isFinite(price) || price < 0) continue;
    out.push({
      periodId: pid,
      startHourLocal: startMin / 60,
      endHourLocalExclusive: endMin / 60,
      days: 'all',
      pricePerKwh: price,
    });
  }
  // Stable ordering
  return out.sort((a, b) => a.periodId.localeCompare(b.periodId) || a.startHourLocal - b.startHourLocal || a.endHourLocalExclusive - b.endHourLocalExclusive);
}

function listSnapshots(args: { iouUtility: CaIouUtilityV0; ccaId: CcaIdV0 }): CcaGenerationTouSnapshotV0[] {
  const dir = path.join(process.cwd(), 'data', 'ccaTariffs', 'v0', args.iouUtility, args.ccaId);
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .slice()
    .sort((a, b) => a.localeCompare(b));
  const out: CcaGenerationTouSnapshotV0[] = [];
  for (const f of files) {
    const fp = path.join(dir, f);
    const raw = parseJsonFile(fp);
    if (!raw || typeof raw !== 'object') continue;
    out.push(raw as any);
  }
  return out;
}

function snapshotCoversDate(args: { snapshot: CcaGenerationTouSnapshotV0; billPeriodStartYmd: string }): boolean {
  const s = safeYmd(args.snapshot.effectiveStartYmd);
  if (!s) return false;
  const e = args.snapshot.effectiveEndYmd ? safeYmd(args.snapshot.effectiveEndYmd) : null;
  const d = args.billPeriodStartYmd;
  if (!(s <= d)) return false;
  if (e && !(d <= e)) return false;
  return true;
}

function selectSnapshot(args: { snapshots: CcaGenerationTouSnapshotV0[]; billPeriodStartYmd: string | null }): CcaGenerationTouSnapshotV0 | null {
  const snaps = (args.snapshots || [])
    .slice()
    .filter((s) => safeYmd((s as any)?.effectiveStartYmd))
    .sort((a, b) => String(a.effectiveStartYmd).localeCompare(String(b.effectiveStartYmd)));

  if (!snaps.length) return null;

  if (args.billPeriodStartYmd && safeYmd(args.billPeriodStartYmd)) {
    const d = args.billPeriodStartYmd;
    const hits = snaps.filter((s) => snapshotCoversDate({ snapshot: s, billPeriodStartYmd: d }));
    if (!hits.length) return null;
    return hits[hits.length - 1] || null;
  }

  // Latest snapshot (max effectiveStartYmd)
  return snaps[snaps.length - 1] || null;
}

export function getCcaGenerationSnapshotV0(args: {
  iouUtility: CaIouUtilityV0 | string | null | undefined;
  ccaId: CcaIdV0 | string | null | undefined;
  billPeriodStartYmd?: string | null;
}): CcaGenerationSnapshotLookupResultV0 {
  const warnings: string[] = [];

  const iou = asIouUtilityV0(args.iouUtility);
  if (!iou) {
    warnings.push(CcaTariffLibraryReasonCodesV0.CCA_V0_IOU_UNSUPPORTED);
    return { ok: false, snapshot: null, billPeriodStartYmdUsed: safeYmd(args.billPeriodStartYmd) ?? null, warnings: uniqSorted(warnings) };
  }

  const ccaId = String(args.ccaId || '').trim().toUpperCase() as CcaIdV0;
  const ccaOk = ccaId === 'EBCE' || ccaId === 'SVCE' || ccaId === 'PCE' || ccaId === 'CLEANPOWERSF' || ccaId === 'MCE' || ccaId === 'CPA' || ccaId === 'SDCP';
  if (!ccaOk) {
    warnings.push(CcaTariffLibraryReasonCodesV0.CCA_V0_CCA_UNSUPPORTED);
    return { ok: false, snapshot: null, billPeriodStartYmdUsed: safeYmd(args.billPeriodStartYmd) ?? null, warnings: uniqSorted(warnings) };
  }

  const snaps = listSnapshots({ iouUtility: iou, ccaId });
  const billYmd = safeYmd(args.billPeriodStartYmd) ?? null;
  const chosen = selectSnapshot({ snapshots: snaps, billPeriodStartYmd: billYmd });
  if (!chosen) {
    warnings.push(CcaTariffLibraryReasonCodesV0.CCA_V0_SNAPSHOT_MISSING);
    return { ok: false, snapshot: null, billPeriodStartYmdUsed: billYmd, warnings: uniqSorted(warnings) };
  }

  // Minimal sanity normalization (keep deterministic).
  const snapshot: CcaGenerationTouSnapshotV0 = {
    snapshotId: String((chosen as any)?.snapshotId || '').trim() || `cca_v0_${iou}_${ccaId}_${String((chosen as any)?.effectiveStartYmd || '').trim() || 'unknown'}`,
    iouUtility: iou,
    ccaId,
    ccaDisplayName: String((chosen as any)?.ccaDisplayName || '').trim() || ccaDisplayNameForIdV0(ccaId),
    effectiveStartYmd: safeYmd((chosen as any)?.effectiveStartYmd) || '1970-01-01',
    effectiveEndYmd: safeYmd((chosen as any)?.effectiveEndYmd) || null,
    timezone: 'America/Los_Angeles',
    customerClass: 'COMMERCIAL_DEFAULT',
    acquisitionMethodUsed: 'MANUAL_SEED_V0',
    touPeriods: Array.isArray((chosen as any)?.touPeriods) ? ((chosen as any).touPeriods as any) : [],
    notes: Array.isArray((chosen as any)?.notes) ? ((chosen as any).notes as any).map((x: any) => String(x)).filter(Boolean) : [],
  };

  if ((snapshot.notes || []).some((n) => String(n).toLowerCase().includes('seed') || String(n).toLowerCase().includes('provisional'))) {
    warnings.push(CcaTariffLibraryReasonCodesV0.CCA_V0_MANUAL_SEED_PROVISIONAL);
  }

  return { ok: true, snapshot, billPeriodStartYmdUsed: billYmd, warnings: uniqSorted(warnings) };
}

export function buildGenerationTouEnergySignalsV0(args: {
  snapshot: CcaGenerationTouSnapshotV0;
  upstreamWarnings?: string[] | null;
}): GenerationTouEnergySignalsV0 {
  const generationTouEnergyPrices = toTouWindows(args.snapshot);
  const rateCode = `${args.snapshot.ccaId}@${args.snapshot.effectiveStartYmd}`;
  return {
    generationSnapshotId: args.snapshot.snapshotId,
    generationRateCode: rateCode,
    generationTouEnergyPrices,
    warnings: uniqSorted([...(args.upstreamWarnings || [])]),
  };
}

