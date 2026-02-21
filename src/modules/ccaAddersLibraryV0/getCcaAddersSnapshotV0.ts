import path from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

import type { CaIouUtilityV0, CcaAddersSnapshotLookupResultV0, CcaAddersSnapshotV0, CcaIdV0 } from './types';
import { CcaAddersLibraryReasonCodesV0, uniqSorted } from './reasons';
import { computeAddersPerKwhTotal } from './computeAddersPerKwhTotal';

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

function asCcaIdV0(raw: unknown): CcaIdV0 | null {
  const ccaId = String(raw ?? '').trim().toUpperCase() as CcaIdV0;
  const ok = ccaId === 'EBCE' || ccaId === 'SVCE' || ccaId === 'PCE' || ccaId === 'CLEANPOWERSF' || ccaId === 'MCE' || ccaId === 'CPA' || ccaId === 'SDCP';
  return ok ? ccaId : null;
}

function listSnapshots(args: { iouUtility: CaIouUtilityV0; ccaId: CcaIdV0 }): CcaAddersSnapshotV0[] {
  const dir = path.join(process.cwd(), 'data', 'ccaAdders', 'v0', args.iouUtility, args.ccaId);
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .slice()
    .sort((a, b) => a.localeCompare(b));
  const out: CcaAddersSnapshotV0[] = [];
  for (const f of files) {
    const fp = path.join(dir, f);
    const raw = parseJsonFile(fp);
    if (!raw || typeof raw !== 'object') continue;
    out.push(raw as any);
  }
  return out;
}

function snapshotCoversDate(args: { snapshot: CcaAddersSnapshotV0; billPeriodStartYmd: string }): boolean {
  const s = safeYmd(args.snapshot.effectiveStartYmd);
  if (!s) return false;
  const e = args.snapshot.effectiveEndYmd ? safeYmd(args.snapshot.effectiveEndYmd) : null;
  const d = args.billPeriodStartYmd;
  if (!(s <= d)) return false;
  if (e && !(d <= e)) return false;
  return true;
}

function selectSnapshot(args: { snapshots: CcaAddersSnapshotV0[]; billPeriodStartYmd: string | null }): CcaAddersSnapshotV0 | null {
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

function safeNum(x: unknown): number | null {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return n;
}

function safeNumNonNeg(x: unknown): number | null {
  const n = safeNum(x);
  if (n === null) return null;
  if (n < 0) return null;
  return n;
}

function normalizeCharges(raw: any): CcaAddersSnapshotV0['charges'] {
  try {
    if (!raw || typeof raw !== 'object') return null;
    const byVintageRaw = raw?.pciaPerKwhByVintageKey;
    const byVintage =
      byVintageRaw && typeof byVintageRaw === 'object'
        ? Object.fromEntries(
            Object.entries(byVintageRaw as any).flatMap(([k, v]) => {
              const key = String(k || '').trim();
              const n = safeNumNonNeg(v);
              return key && n !== null ? [[key, n]] : [];
            }),
          )
        : null;
    const notes = String(raw?.notes || '').trim() || undefined;
    const out: any = {
      ...(raw?.pciaPerKwhDefault !== undefined ? { pciaPerKwhDefault: safeNumNonNeg(raw.pciaPerKwhDefault) } : {}),
      ...(byVintage && Object.keys(byVintage).length ? { pciaPerKwhByVintageKey: byVintage } : {}),
      ...(raw?.nbcPerKwhTotal !== undefined ? { nbcPerKwhTotal: safeNumNonNeg(raw.nbcPerKwhTotal) } : {}),
      ...(raw?.indifferenceAdjustmentPerKwh !== undefined ? { indifferenceAdjustmentPerKwh: safeNum(raw.indifferenceAdjustmentPerKwh) } : {}),
      ...(raw?.otherPerKwhTotal !== undefined ? { otherPerKwhTotal: safeNumNonNeg(raw.otherPerKwhTotal) } : {}),
      ...(notes ? { notes } : {}),
    };
    return Object.keys(out).length ? (out as any) : null;
  } catch {
    return null;
  }
}

export function getCcaAddersSnapshotV0(args: {
  iouUtility: CaIouUtilityV0 | string | null | undefined;
  ccaId: CcaIdV0 | string | null | undefined;
  billPeriodStartYmd?: string | null;
}): CcaAddersSnapshotLookupResultV0 {
  const warnings: string[] = [];

  const iou = asIouUtilityV0(args.iouUtility);
  const ccaId = asCcaIdV0(args.ccaId);
  const billYmd = safeYmd(args.billPeriodStartYmd) ?? null;

  if (!iou || !ccaId) {
    warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_MISSING);
    return { ok: false, snapshot: null, billPeriodStartYmdUsed: billYmd, warnings: uniqSorted(warnings) };
  }

  const snaps = listSnapshots({ iouUtility: iou, ccaId });
  const chosen = selectSnapshot({ snapshots: snaps, billPeriodStartYmd: billYmd });
  if (!chosen) {
    warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_MISSING);
    return { ok: false, snapshot: null, billPeriodStartYmdUsed: billYmd, warnings: uniqSorted(warnings) };
  }

  const notesRaw = Array.isArray((chosen as any)?.notes) ? ((chosen as any).notes as any[]).map((x) => String(x)).filter(Boolean) : [];
  const notesText = notesRaw.join(' ').toLowerCase();
  if (notesText.includes('seed') || notesText.includes('provisional') || notesText.includes('placeholder')) {
    warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_PROVISIONAL);
  }

  const breakdownRaw = Array.isArray((chosen as any)?.addersBreakdown) ? ((chosen as any).addersBreakdown as any[]) : [];
  const breakdownNorm = breakdownRaw
    .map((x) => ({
      id: String((x as any)?.id || '').trim(),
      label: String((x as any)?.label || '').trim(),
      adderPerKwh: safeNum((x as any)?.adderPerKwh),
      notes: Array.isArray((x as any)?.notes) ? ((x as any).notes as any[]).map((n) => String(n)).filter(Boolean) : null,
    }))
    .filter((x) => x.id && x.label && x.adderPerKwh !== null && x.adderPerKwh >= 0)
    .sort((a, b) => a.id.localeCompare(b.id) || a.label.localeCompare(b.label) || Number(a.adderPerKwh) - Number(b.adderPerKwh));

  const totalRaw = safeNum((chosen as any)?.addersPerKwhTotal);
  const breakdownSum = breakdownNorm.reduce((s, it) => s + (it.adderPerKwh ?? 0), 0);
  const chargesNorm = normalizeCharges((chosen as any)?.charges);
  const isCompleteBundle =
    (chosen as any)?.isCompleteBundle === true || String((chosen as any)?.isCompleteBundle || '').trim().toLowerCase() === 'true'
      ? true
      : (chosen as any)?.isCompleteBundle === false ||
          String((chosen as any)?.isCompleteBundle || '').trim().toLowerCase() === 'false'
        ? false
        : null;

  const addersPerKwhTotal = (() => {
    if (totalRaw !== null && totalRaw >= 0) return totalRaw;
    if (breakdownNorm.length) {
      warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_PARTIAL);
      return breakdownSum;
    }
    if (chargesNorm) {
      const computed = computeAddersPerKwhTotal({ snapshot: { charges: chargesNorm }, pciaVintageKey: null });
      warnings.push(...(computed.warnings || []));
      if ((computed.warnings || []).length) warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_PARTIAL);
      return computed.addersPerKwhTotal;
    }
    warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_PARTIAL);
    return 0;
  })();

  if (breakdownNorm.length && totalRaw !== null && totalRaw >= 0 && Math.abs(totalRaw - breakdownSum) > 1e-9) {
    warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_PARTIAL);
  }
  // If structured charges exist but disagree materially with blended total, surface partial warning (do not override).
  if (chargesNorm) {
    const computed = computeAddersPerKwhTotal({ snapshot: { charges: chargesNorm }, pciaVintageKey: null });
    warnings.push(...(computed.warnings || []));
    if (totalRaw !== null && totalRaw >= 0 && Math.abs(totalRaw - computed.addersPerKwhTotal) > 1e-6) {
      warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_PARTIAL);
    }
  }

  const snapshot: CcaAddersSnapshotV0 = {
    snapshotId: String((chosen as any)?.snapshotId || '').trim() || `ccaAdders.v0.${iou}.${ccaId}.${String((chosen as any)?.effectiveStartYmd || '').trim() || 'unknown'}`,
    iouUtility: iou,
    ccaId,
    effectiveStartYmd: safeYmd((chosen as any)?.effectiveStartYmd) || '1970-01-01',
    effectiveEndYmd: safeYmd((chosen as any)?.effectiveEndYmd) || null,
    timezone: 'America/Los_Angeles',
    acquisitionMethodUsed: 'MANUAL_SEED_V0',
    ...(chargesNorm ? { charges: chargesNorm as any } : {}),
    ...(isCompleteBundle !== null ? { isCompleteBundle } : {}),
    addersPerKwhTotal: addersPerKwhTotal,
    ...(breakdownNorm.length ? { addersBreakdown: breakdownNorm as any } : {}),
    ...(notesRaw.length ? { notes: notesRaw } : {}),
  };

  return { ok: true, snapshot, billPeriodStartYmdUsed: billYmd, warnings: uniqSorted(warnings) };
}

