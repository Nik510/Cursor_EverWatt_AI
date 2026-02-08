import type { CaTariffUtility } from './ca/sources';
import type { TariffRateMetadata } from './types';
import { loadLatestSnapshot } from './storage';

export function isSnapshotStale(capturedAtIso: string, nowIso: string, maxAgeDays = 14): boolean {
  const capturedAtMs = new Date(capturedAtIso).getTime();
  const nowMs = new Date(nowIso).getTime();
  if (!Number.isFinite(capturedAtMs) || !Number.isFinite(nowMs)) return true;
  const ageMs = nowMs - capturedAtMs;
  const maxMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return ageMs > maxMs;
}

function normRateCode(raw: string): string {
  const s = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  const m = /^([A-Z]{1,3})-?(\d{1,3})([A-Z]?)$/.exec(s);
  if (m) return `${m[1]}-${m[2]}${m[3] || ''}`;
  return s;
}

export async function getLatestRateMetadata(args: {
  utility: CaTariffUtility;
  rateCode: string;
}): Promise<TariffRateMetadata | null> {
  const snap = await loadLatestSnapshot(args.utility);
  if (!snap) return null;
  const want = normRateCode(args.rateCode);
  const found = snap.rates.find((r) => normRateCode(r.rateCode) === want);
  return found || null;
}

export async function searchRates(args: { utility: CaTariffUtility; queryText?: string }): Promise<TariffRateMetadata[]> {
  const snap = await loadLatestSnapshot(args.utility);
  if (!snap) return [];
  const q = String(args.queryText || '').trim().toLowerCase();
  const rates = snap.rates || [];
  if (!q) return rates.slice().sort((a, b) => a.rateCode.localeCompare(b.rateCode));

  return rates
    .filter((r) => {
      const hay = `${r.rateCode} ${r.name || ''} ${r.sourceTitle || ''} ${r.sourceUrl}`.toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => a.rateCode.localeCompare(b.rateCode));
}

export async function getLatestSnapshotInfo(
  utility: CaTariffUtility,
  opts?: { nowIso?: string; maxAgeDays?: number },
): Promise<{ versionTag: string; capturedAt: string; rateCount: number; isStale: boolean } | null> {
  const snap = await loadLatestSnapshot(utility);
  if (!snap) return null;
  const nowIso = opts?.nowIso || new Date().toISOString();
  const isStale = isSnapshotStale(snap.capturedAt, nowIso, opts?.maxAgeDays ?? 14);
  return { versionTag: snap.versionTag, capturedAt: snap.capturedAt, rateCount: snap.rates?.length || 0, isStale };
}

