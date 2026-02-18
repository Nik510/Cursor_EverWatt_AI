import { readFileSync } from 'node:fs';
import path from 'node:path';

import { SgipLibraryReasonCodesV0 } from './reasons';
import type { SgipLibrarySelectionRuleV0, SgipSnapshotSelectionResultV0, SgipSnapshotV0 } from './types';

const SNAPSHOT_FILE_NAMES_V0 = ['2026-01-01.json'] as const;

let memoSnapshots: SgipSnapshotV0[] | null = null;

function safeParseSnapshot(raw: any): SgipSnapshotV0 | null {
  if (!raw || typeof raw !== 'object') return null;
  const snapshotId = String((raw as any).snapshotId || '').trim();
  const effectiveStartYmd = String((raw as any).effectiveStartYmd || '').trim();
  const acquisitionMethodUsed = String((raw as any).acquisitionMethodUsed || '').trim();
  if (!snapshotId || !effectiveStartYmd) return null;
  if (acquisitionMethodUsed !== 'MANUAL_SEED_V0') return null;
  const incentiveRates = (raw as any).incentiveRates;
  if (!incentiveRates || typeof incentiveRates !== 'object') return null;
  return raw as SgipSnapshotV0;
}

function loadSnapshotsOnce(): { snapshots: SgipSnapshotV0[]; warnings: string[] } {
  if (memoSnapshots) return { snapshots: memoSnapshots, warnings: [] };
  const warnings: string[] = [];

  // Deterministic, repo-relative (no network). Using cwd avoids bundler/ts transpilation path quirks.
  const baseDir = path.join(process.cwd(), 'src', 'modules', 'sgipLibraryV0', 'data', 'sgip', 'v0');
  const out: SgipSnapshotV0[] = [];
  for (const fn of SNAPSHOT_FILE_NAMES_V0) {
    try {
      const p = path.join(baseDir, fn);
      const raw = JSON.parse(readFileSync(p, 'utf-8')) as any;
      const snap = safeParseSnapshot(raw);
      if (!snap) {
        warnings.push(SgipLibraryReasonCodesV0.SGIP_V0_PROVISIONAL_SEED);
        continue;
      }
      out.push(snap);
    } catch {
      warnings.push(SgipLibraryReasonCodesV0.SGIP_V0_PROVISIONAL_SEED);
    }
  }

  memoSnapshots = out.slice().sort((a, b) => String(a.effectiveStartYmd).localeCompare(String(b.effectiveStartYmd)));
  return { snapshots: memoSnapshots, warnings: warnings.sort((a, b) => a.localeCompare(b)) };
}

function ymd(s: string | null | undefined): string | null {
  const t = String(s || '').trim();
  if (!t) return null;
  // Deterministic lexicographic ordering works for YYYY-MM-DD.
  return t;
}

export function getSgipSnapshotV0(
  effectiveYmd: string | null | undefined,
  selectionRule: SgipLibrarySelectionRuleV0,
): SgipSnapshotSelectionResultV0 {
  const warnings: string[] = [];
  const load = loadSnapshotsOnce();
  warnings.push(...load.warnings);

  const snaps = load.snapshots;
  if (!snaps.length) {
    warnings.push(SgipLibraryReasonCodesV0.SGIP_V0_SNAPSHOT_MISSING);
    return { ok: false, snapshot: null, snapshotIdUsed: null, acquisitionMethodUsed: null, warnings: warnings.sort((a, b) => a.localeCompare(b)) };
  }

  const eff = ymd(effectiveYmd);

  const chosen = (() => {
    if (selectionRule !== 'BILL_PERIOD_START_ELSE_LATEST') return snaps[snaps.length - 1] || null;
    if (!eff) return snaps[snaps.length - 1] || null;
    const eligible = snaps.filter((s) => String(s.effectiveStartYmd) <= eff);
    return (eligible.length ? eligible[eligible.length - 1] : null) || null;
  })();

  if (!chosen) {
    warnings.push(SgipLibraryReasonCodesV0.SGIP_V0_SNAPSHOT_MISSING);
    return { ok: false, snapshot: null, snapshotIdUsed: null, acquisitionMethodUsed: null, warnings: warnings.sort((a, b) => a.localeCompare(b)) };
  }

  return {
    ok: true,
    snapshot: chosen,
    snapshotIdUsed: String(chosen.snapshotId),
    acquisitionMethodUsed: chosen.acquisitionMethodUsed,
    warnings: warnings.sort((a, b) => a.localeCompare(b)),
  };
}

