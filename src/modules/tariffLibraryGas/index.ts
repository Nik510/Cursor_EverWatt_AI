import type { CaGasTariffUtility } from './types';
import type { GasTariffRateMetadata } from './types';
import { loadLatestGasSnapshot } from './storage';

export function isGasSnapshotStale(capturedAtIso: string, nowIso: string, maxAgeDays = 14): boolean {
  const capturedAtMs = new Date(capturedAtIso).getTime();
  const nowMs = new Date(nowIso).getTime();
  if (!Number.isFinite(capturedAtMs) || !Number.isFinite(nowMs)) return true;
  const ageMs = nowMs - capturedAtMs;
  const maxMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return ageMs > maxMs;
}

function normRateCode(raw: string): string {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
}

export async function getLatestGasRateMetadata(args: { utility: CaGasTariffUtility; rateCode: string }): Promise<GasTariffRateMetadata | null> {
  const snap = await loadLatestGasSnapshot(args.utility);
  if (!snap) return null;
  const want = normRateCode(args.rateCode);
  const found = (snap.rates || []).find((r) => normRateCode(r.rateCode) === want);
  return found || null;
}

export async function searchGasRates(args: { utility: CaGasTariffUtility; queryText?: string }): Promise<GasTariffRateMetadata[]> {
  const snap = await loadLatestGasSnapshot(args.utility);
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

export async function getLatestGasSnapshotInfo(
  utility: CaGasTariffUtility,
  opts?: { nowIso?: string; maxAgeDays?: number },
): Promise<{ versionTag: string; capturedAt: string; rateCount: number; isStale: boolean } | null> {
  const snap = await loadLatestGasSnapshot(utility);
  if (!snap) return null;
  const nowIso = opts?.nowIso || new Date().toISOString();
  const isStale = isGasSnapshotStale(snap.capturedAt, nowIso, opts?.maxAgeDays ?? 14);
  return { versionTag: snap.versionTag, capturedAt: snap.capturedAt, rateCount: snap.rates?.length || 0, isStale };
}

