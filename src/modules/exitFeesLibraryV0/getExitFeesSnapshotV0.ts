import path from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

import type { ExitFeesIouV0, ExitFeesProviderTypeV0, ExitFeesSnapshotLookupResultV0, ExitFeesSnapshotV0 } from './types';
import { ExitFeesLibraryReasonCodesV0, uniqSorted } from './reasons';

function safeYmd(s: unknown): string | null {
  const x = String(s ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return null;
  return x;
}

function safeNumNonNeg(x: unknown): number | null {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return n;
}

function asIouV0(raw: unknown): ExitFeesIouV0 | null {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (s === 'PGE' || s === 'PG&E' || s === 'PACIFICGASANDELECTRIC' || s === 'PACIFICGASELECTRIC') return 'PGE';
  if (s === 'SCE' || s === 'SOUTHERNCALIFORNIAEDISON') return 'SCE';
  if (s === 'SDGE' || s === 'SDG&E' || s === 'SANDIEGOGASANDELECTRIC') return 'SDGE';
  return null;
}

function asProviderTypeV0(raw: unknown): ExitFeesProviderTypeV0 | null {
  const s = String(raw ?? '').trim().toUpperCase();
  if (s === 'CCA') return 'CCA';
  if (s === 'DA') return 'DA';
  return null;
}

function parseJsonFile(fp: string): any | null {
  try {
    if (!existsSync(fp)) return null;
    return JSON.parse(readFileSync(fp, 'utf-8'));
  } catch {
    return null;
  }
}

function listSnapshots(args: { iou: ExitFeesIouV0 }): ExitFeesSnapshotV0[] {
  const dir = path.join(process.cwd(), 'data', 'exitFees', 'v0', args.iou);
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .slice()
    .sort((a, b) => a.localeCompare(b));

  const out: ExitFeesSnapshotV0[] = [];
  for (const f of files) {
    const fp = path.join(dir, f);
    const raw = parseJsonFile(fp);
    if (!raw || typeof raw !== 'object') continue;
    out.push(raw as any);
  }
  return out;
}

function snapshotMatches(args: { snapshot: ExitFeesSnapshotV0; providerType: ExitFeesProviderTypeV0; iou: ExitFeesIouV0 }): boolean {
  const iou = asIouV0((args.snapshot as any)?.applicability?.iou);
  const pt = asProviderTypeV0((args.snapshot as any)?.applicability?.providerType);
  return iou === args.iou && pt === args.providerType;
}

function selectLatestLeq(args: { snapshots: ExitFeesSnapshotV0[]; effectiveYmd: string | null }): ExitFeesSnapshotV0 | null {
  const snaps = (args.snapshots || [])
    .slice()
    .filter((s) => safeYmd((s as any)?.effectiveStartYmd))
    .sort((a, b) => String(a.effectiveStartYmd).localeCompare(String(b.effectiveStartYmd)));
  if (!snaps.length) return null;

  const d = args.effectiveYmd && safeYmd(args.effectiveYmd) ? args.effectiveYmd : null;
  if (!d) return snaps[snaps.length - 1] || null;

  const leq = snaps.filter((s) => String(s.effectiveStartYmd) <= d);
  return (leq.length ? leq[leq.length - 1] : snaps[snaps.length - 1]) || null;
}

export function getExitFeesSnapshotV0(args: {
  iou: ExitFeesIouV0 | string | null | undefined;
  effectiveYmd: string | null | undefined;
  providerType: ExitFeesProviderTypeV0 | string | null | undefined;
  /** Optional PCIA vintage key (when known) to select a specific PCIA value deterministically. */
  pciaVintageKey?: string | null;
}): ExitFeesSnapshotLookupResultV0 {
  const warnings: string[] = [];
  const iou = asIouV0(args.iou);
  const providerType = asProviderTypeV0(args.providerType);
  const effectiveYmd = safeYmd(args.effectiveYmd) ?? null;
  const pciaVintageKey = String(args.pciaVintageKey || '').trim() || null;

  const emptySelected = {
    nbcPerKwhTotal: null,
    pciaPerKwhApplied: null,
    otherExitFeesPerKwhTotal: null,
    exitFeesPerKwhTotal: null,
  } as const;

  if (!iou || !providerType) {
    warnings.push(ExitFeesLibraryReasonCodesV0.EXIT_FEES_V0_MISSING);
    return { ok: false, snapshot: null, effectiveYmdUsed: effectiveYmd, selectedCharges: { ...emptySelected }, warnings: uniqSorted(warnings) };
  }

  const snapsAll = listSnapshots({ iou });
  const snapsExact = snapsAll.filter((s) => snapshotMatches({ snapshot: s, providerType, iou }));
  const chosenExact = selectLatestLeq({ snapshots: snapsExact, effectiveYmd });

  // v0 fallback: if no providerType-specific snapshots exist, fall back to any snapshot for the IOU (warnings-first).
  const chosen = chosenExact ?? selectLatestLeq({ snapshots: snapsAll, effectiveYmd });
  if (!chosen) {
    warnings.push(ExitFeesLibraryReasonCodesV0.EXIT_FEES_V0_MISSING);
    return { ok: false, snapshot: null, effectiveYmdUsed: effectiveYmd, selectedCharges: { ...emptySelected }, warnings: uniqSorted(warnings) };
  }
  if (!chosenExact) warnings.push(ExitFeesLibraryReasonCodesV0.EXIT_FEES_V0_PARTIAL);

  const notesRaw = Array.isArray((chosen as any)?.notes) ? ((chosen as any).notes as any[]).map((x) => String(x)).filter(Boolean) : [];
  const notesText = notesRaw.join(' ').toLowerCase();
  if (notesText.includes('seed') || notesText.includes('provisional') || notesText.includes('placeholder') || String((chosen as any)?.acquisitionMethodUsed || '') === 'MANUAL_SEED_V0') {
    warnings.push(ExitFeesLibraryReasonCodesV0.EXIT_FEES_V0_PROVISIONAL_SEED);
  }

  const nbc = safeNumNonNeg((chosen as any)?.charges?.nbcPerKwhTotal);
  const other = safeNumNonNeg((chosen as any)?.charges?.otherExitFeesPerKwhTotal);

  const byVintageRaw = (chosen as any)?.charges?.pciaPerKwhByVintage;
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
  const pciaDefault = safeNumNonNeg((chosen as any)?.charges?.pciaPerKwhDefault);

  const pciaApplied = (() => {
    if (byVintage && Object.keys(byVintage).length) {
      if (pciaVintageKey && Object.prototype.hasOwnProperty.call(byVintage, pciaVintageKey)) return byVintage[pciaVintageKey]!;
      warnings.push(ExitFeesLibraryReasonCodesV0.EXIT_FEES_V0_VINTAGE_UNKNOWN_DEFAULT_USED);
      if (pciaDefault !== null) return pciaDefault;
      warnings.push(ExitFeesLibraryReasonCodesV0.EXIT_FEES_V0_PARTIAL);
      return null;
    }
    return pciaDefault;
  })();

  const anyMissing = nbc === null || other === null || pciaApplied === null;
  if (anyMissing) warnings.push(ExitFeesLibraryReasonCodesV0.EXIT_FEES_V0_PARTIAL);

  const exitFeesPerKwhTotal = anyMissing ? null : (nbc ?? 0) + (pciaApplied ?? 0) + (other ?? 0);

  const snapshot: ExitFeesSnapshotV0 = {
    snapshotId: String((chosen as any)?.snapshotId || '').trim() || `exitFees.v0.${iou}.${String((chosen as any)?.effectiveStartYmd || '').trim() || 'unknown'}`,
    effectiveStartYmd: safeYmd((chosen as any)?.effectiveStartYmd) || '1970-01-01',
    acquisitionMethodUsed: 'MANUAL_SEED_V0',
    ...(notesRaw.length ? { notes: notesRaw } : {}),
    charges: {
      nbcPerKwhTotal: nbc,
      ...(byVintage && Object.keys(byVintage).length ? { pciaPerKwhByVintage: byVintage } : {}),
      pciaPerKwhDefault: pciaDefault,
      otherExitFeesPerKwhTotal: other,
    },
    applicability: {
      providerType,
      iou,
    },
  };

  return {
    ok: true,
    snapshot,
    effectiveYmdUsed: effectiveYmd,
    selectedCharges: {
      nbcPerKwhTotal: nbc,
      pciaPerKwhApplied: pciaApplied,
      otherExitFeesPerKwhTotal: other,
      exitFeesPerKwhTotal,
    },
    warnings: uniqSorted(warnings),
  };
}

