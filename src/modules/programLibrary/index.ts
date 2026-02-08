import type { ProgramMetadataV0 } from './types';
import { loadLatestProgramSnapshot } from './storage';

export function isSnapshotStale(capturedAtIso: string, nowIso: string, maxAgeDays = 30): boolean {
  const capturedAtMs = new Date(capturedAtIso).getTime();
  const nowMs = new Date(nowIso).getTime();
  if (!Number.isFinite(capturedAtMs) || !Number.isFinite(nowMs)) return true;
  const maxMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return nowMs - capturedAtMs > maxMs;
}

export async function getLatestProgramSnapshotInfo(scope: string, opts?: { nowIso?: string; maxAgeDays?: number }) {
  const snap = await loadLatestProgramSnapshot(scope);
  if (!snap) return null;
  const nowIso = opts?.nowIso || new Date().toISOString();
  const isStale = isSnapshotStale(snap.capturedAt, nowIso, opts?.maxAgeDays ?? 30);
  return { scope: snap.scope, versionTag: snap.versionTag, capturedAt: snap.capturedAt, programCount: snap.programs?.length || 0, isStale };
}

export async function searchPrograms(scope: string, queryText?: string): Promise<ProgramMetadataV0[]> {
  const snap = await loadLatestProgramSnapshot(scope);
  if (!snap) return [];
  const q = String(queryText || '').trim().toLowerCase();
  const items = Array.isArray(snap.programs) ? snap.programs : [];
  if (!q) return items;
  return items.filter((p) => `${p.id} ${p.name} ${p.administrator} ${(p.technologyTags || []).join(' ')} ${(p.sourceUrls || []).join(' ')}`.toLowerCase().includes(q));
}

