import path from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';

import type { ShareLinkV1, ShareScopeV1 } from './types';
import { getEverwattSharesBaseDirV1 } from '../dataDirsV1';

type ShareLinkStoredV1 = ShareLinkV1 & { tokenHash: string };

function stableStringifyV1(value: unknown): string {
  const seen = new WeakSet<object>();
  const normalize = (v: any): any => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map(normalize);
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) out[k] = normalize(v[k]);
    return out;
  };
  return JSON.stringify(normalize(value), null, 2) + '\n';
}

async function writeFileAtomicLike(targetPath: string, text: string): Promise<void> {
  const dir = path.dirname(targetPath);
  await mkdir(dir, { recursive: true });
  const tmp = `${targetPath}.tmp.${randomBytes(6).toString('hex')}`;
  await writeFile(tmp, text, 'utf-8');
  try {
    // Windows rename won't overwrite; remove first if present.
    if (existsSync(targetPath)) await rm(targetPath, { force: true });
  } catch {
    // best-effort
  }
  await rename(tmp, targetPath);
}

function indexPath(baseDir: string): string {
  return path.join(baseDir, 'index.json');
}

function assertIdLike(args: { label: string; value: string; max?: number }): string {
  const label = String(args.label || 'id');
  const v = String(args.value || '').trim();
  const max = Number.isFinite(Number(args.max)) ? Number(args.max) : 180;
  if (!v) throw new Error(`${label} is required`);
  if (v.length > max) throw new Error(`${label} too long`);
  if (!/^[A-Za-z0-9_-]+$/.test(v)) throw new Error(`Invalid ${label} (allowed: [A-Za-z0-9_-])`);
  return v;
}

function normalizeScopeV1(raw: unknown): ShareScopeV1 {
  const s = String(raw ?? '').trim().toUpperCase();
  if (s === 'VIEW') return 'VIEW';
  if (s === 'DOWNLOAD') return 'DOWNLOAD';
  if (s === 'BOTH') return 'BOTH';
  throw new Error('Invalid scope (expected VIEW|DOWNLOAD|BOTH)');
}

function assertIsoLike(label: string, value: string): string {
  const v = String(value || '').trim();
  if (!v) throw new Error(`${label} is required`);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(v)) throw new Error(`Invalid ${label} (expected ISO string)`);
  return v;
}

function sanitizeNote(note: unknown): string | null {
  const s = String(note ?? '').trim();
  if (!s) return null;
  return s.length > 500 ? s.slice(0, 500) + '…(truncated)' : s;
}

function sortSharesDeterministic(shares: ShareLinkV1[]): ShareLinkV1[] {
  // Deterministic: newest first, then shareId asc.
  return shares
    .slice()
    .sort(
      (a, b) =>
        String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || '')) ||
        String(a.shareId || '').localeCompare(String(b.shareId || '')),
    );
}

function clampShares(shares: ShareLinkV1[], max: number): ShareLinkV1[] {
  const m = Math.max(100, Math.min(50_000, Math.trunc(Number(max) || 50_000)));
  return shares.length <= m ? shares : sortSharesDeterministic(shares).slice(0, m);
}

async function readAllShares(baseDir: string): Promise<ShareLinkStoredV1[]> {
  const fp = indexPath(baseDir);
  if (!existsSync(fp)) return [];
  try {
    const raw = await readFile(fp, 'utf-8');
    const parsed = JSON.parse(raw) as any;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x === 'object')
      .map((x) => {
        const shareId = String((x as any).shareId || '').trim();
        const createdAtIso = String((x as any).createdAtIso || '').trim();
        const projectId = String((x as any).projectId || '').trim();
        const revisionId = String((x as any).revisionId || '').trim();
        const reportType = String((x as any).reportType || '').trim();
        const scope = (() => {
          try {
            return normalizeScopeV1((x as any).scope);
          } catch {
            return null;
          }
        })();
        const expiresAtIso = String((x as any).expiresAtIso || '').trim() || null;
        const revokedAtIso = String((x as any).revokedAtIso || '').trim() || null;
        const tokenHash = String((x as any).tokenHash || '').trim().toLowerCase();
        const accessCount = Number((x as any).accessCount || 0);
        const lastAccessAtIso = String((x as any).lastAccessAtIso || '').trim() || null;
        const createdBy = Object.prototype.hasOwnProperty.call(x, 'createdBy') ? (String((x as any).createdBy ?? '').trim() || null) : undefined;
        const note = Object.prototype.hasOwnProperty.call(x, 'note') ? (sanitizeNote((x as any).note) ?? null) : undefined;

        if (!shareId || !createdAtIso || !projectId || !revisionId || !reportType || !scope) return null;
        if (!/^[0-9a-f]{64}$/.test(tokenHash)) return null;
        return {
          shareId,
          createdAtIso,
          ...(createdBy !== undefined ? { createdBy } : {}),
          projectId,
          revisionId,
          reportType,
          scope,
          expiresAtIso,
          revokedAtIso,
          tokenHash,
          accessCount: Number.isFinite(accessCount) && accessCount >= 0 ? Math.trunc(accessCount) : 0,
          lastAccessAtIso,
          ...(note !== undefined ? { note } : {}),
        } as any as ShareLinkStoredV1;
      })
      .filter(Boolean) as ShareLinkStoredV1[];
  } catch {
    return [];
  }
}

function stripTokenHash(stored: ShareLinkStoredV1): ShareLinkV1 {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tokenHash: _omit, ...pub } = stored as any;
  return pub as ShareLinkV1;
}

async function writeAllShares(baseDir: string, shares: ShareLinkStoredV1[]): Promise<void> {
  const bounded = clampShares(shares as any as ShareLinkV1[], 50_000) as any as ShareLinkStoredV1[];
  const sorted = sortSharesDeterministic(bounded);
  await writeFileAtomicLike(indexPath(baseDir), stableStringifyV1(sorted));
}

export function createSharesStoreFsV1(args?: { baseDir?: string }) {
  const baseDir = path.resolve(String(args?.baseDir || '').trim() || getEverwattSharesBaseDirV1());

  return {
    baseDir,

    async createShareLink(args: {
      tokenHash: string;
      projectId: string;
      revisionId: string;
      reportType: string;
      scope: ShareScopeV1;
      expiresAtIso: string | null;
      createdAtIso?: string;
      createdBy?: string | null;
      note?: string | null;
      shareId?: string;
    }): Promise<ShareLinkV1> {
      const nowIso = String(args.createdAtIso || new Date().toISOString()).trim();
      assertIsoLike('createdAtIso', nowIso);

      const tokenHash = String(args.tokenHash || '').trim().toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(tokenHash)) throw new Error('tokenHash must be sha256 hex');

      const projectId = assertIdLike({ label: 'projectId', value: args.projectId, max: 120 });
      const revisionId = assertIdLike({ label: 'revisionId', value: args.revisionId, max: 120 });
      const reportType = String(args.reportType || '').trim();
      if (!reportType) throw new Error('reportType is required');
      if (reportType.length > 80) throw new Error('reportType too long');

      const scope = normalizeScopeV1(args.scope);

      const expiresAtIsoRaw = args.expiresAtIso ? String(args.expiresAtIso).trim() : '';
      const expiresAtIso = expiresAtIsoRaw ? assertIsoLike('expiresAtIso', expiresAtIsoRaw) : null;

      const shareId = args.shareId ? assertIdLike({ label: 'shareId', value: args.shareId, max: 180 }) : randomUUID();
      const createdBy = args.createdBy === undefined ? undefined : (String(args.createdBy ?? '').trim() || null);
      const note = args.note === undefined ? undefined : (sanitizeNote(args.note) ?? null);

      const recStored: any = {
        shareId,
        createdAtIso: nowIso,
        ...(createdBy !== undefined ? { createdBy } : {}),
        projectId,
        revisionId,
        reportType,
        scope,
        expiresAtIso,
        revokedAtIso: null,
        tokenHash,
        accessCount: 0,
        lastAccessAtIso: null,
        ...(note !== undefined ? { note } : {}),
      };

      const existing = await readAllShares(baseDir);
      if (existing.some((s) => String((s as any).tokenHash || '').toLowerCase() === tokenHash)) {
        throw new Error('Share token already exists');
      }
      const next = [recStored as ShareLinkStoredV1, ...existing];
      await writeAllShares(baseDir, next);
      return stripTokenHash(recStored as ShareLinkStoredV1);
    },

    async listSharesForProject(args: { projectId: string; limit?: number }): Promise<ShareLinkV1[]> {
      const projectId = assertIdLike({ label: 'projectId', value: args.projectId, max: 120 });
      const limitRaw = Number(args.limit ?? 50);
      const limit = Math.max(1, Math.min(200, Number.isFinite(limitRaw) ? Math.trunc(limitRaw) : 50));
      const all = await readAllShares(baseDir);
      const filtered = all.filter((s) => String((s as any).projectId || '') === projectId);
      return sortSharesDeterministic(filtered as any as ShareLinkV1[])
        .slice(0, limit)
        .map((s) => stripTokenHash(s as any as ShareLinkStoredV1));
    },

    async getShareById(shareIdRaw: string): Promise<ShareLinkV1> {
      const shareId = assertIdLike({ label: 'shareId', value: shareIdRaw, max: 180 });
      const all = await readAllShares(baseDir);
      const found = all.find((s) => String(s.shareId) === shareId);
      if (!found) throw new Error('Share not found');
      return stripTokenHash(found as ShareLinkStoredV1);
    },

    async resolveShareByTokenHash(tokenHashRaw: string): Promise<ShareLinkV1> {
      const tokenHash = String(tokenHashRaw || '').trim().toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(tokenHash)) throw new Error('Invalid share token');
      const all = await readAllShares(baseDir);
      const found = all.find((s) => String((s as any).tokenHash || '').toLowerCase() === tokenHash);
      if (!found) throw new Error('Invalid share token');
      return stripTokenHash(found as ShareLinkStoredV1);
    },

    async revokeShare(args: { shareId: string; nowIso?: string }): Promise<ShareLinkV1> {
      const shareId = assertIdLike({ label: 'shareId', value: args.shareId, max: 180 });
      const nowIso = String(args.nowIso || new Date().toISOString()).trim();
      assertIsoLike('nowIso', nowIso);

      const all = await readAllShares(baseDir);
      const idx = all.findIndex((s) => String(s.shareId) === shareId);
      if (idx < 0) throw new Error('Share not found');
      const prev = all[idx] as any;
      const alreadyRevoked = String(prev?.revokedAtIso || '').trim();
      const nextRec: any = alreadyRevoked ? prev : { ...prev, revokedAtIso: nowIso };
      const next = all.slice();
      next[idx] = nextRec as ShareLinkStoredV1;
      await writeAllShares(baseDir, next);
      return stripTokenHash(nextRec as ShareLinkStoredV1);
    },

    async recordAccess(args: { shareId: string; nowIso?: string }): Promise<void> {
      const shareId = assertIdLike({ label: 'shareId', value: args.shareId, max: 180 });
      const nowIso = String(args.nowIso || new Date().toISOString()).trim();
      assertIsoLike('nowIso', nowIso);

      const all = await readAllShares(baseDir);
      const idx = all.findIndex((s) => String(s.shareId) === shareId);
      if (idx < 0) return;
      const prev = all[idx] as any;
      const nextRec: any = {
        ...prev,
        accessCount: Math.max(0, Math.trunc(Number(prev?.accessCount || 0))) + 1,
        lastAccessAtIso: nowIso,
      };
      const next = all.slice();
      next[idx] = nextRec as ShareLinkStoredV1;
      await writeAllShares(baseDir, next);
    },
  };
}

