import path from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';

import type { ShareEventV1, ShareLinkMetaV1, ShareLinkSafeV1, ShareLinkV1, ShareScopeV1 } from './types';
import { getEverwattSharesBaseDirV1 } from '../dataDirsV1';

type ShareLinkStoredV1 = ShareLinkSafeV1 & { tokenHash: string; passwordHash: string | null };

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

function hashLikeOrNull(v: unknown): string | null {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return null;
  // Accept sha256 hex only (no raw UA/IP ever stored).
  if (!/^[0-9a-f]{64}$/.test(s)) return null;
  return s;
}

function normalizeEventV1(raw: any): ShareEventV1 | null {
  const type = String(raw?.type || '').trim().toUpperCase();
  try {
    if (type === 'CREATED') {
      const createdAtIso = assertIsoLike('event.createdAtIso', String(raw?.createdAtIso || '').trim());
      const scope = normalizeScopeV1(raw?.scope);
      const expiresAtIso = String(raw?.expiresAtIso || '').trim() || null;
      const note = Object.prototype.hasOwnProperty.call(raw, 'note') ? (sanitizeNote(raw?.note) ?? null) : undefined;
      return {
        type: 'CREATED',
        createdAtIso,
        scope,
        expiresAtIso: expiresAtIso ? assertIsoLike('event.expiresAtIso', expiresAtIso) : null,
        ...(note !== undefined ? { note } : {}),
      };
    }

    if (type === 'ACCESSED') {
      const atIso = assertIsoLike('event.atIso', String(raw?.atIso || '').trim());
      const userAgentHash = hashLikeOrNull(raw?.userAgentHash) || undefined;
      const ipHash = hashLikeOrNull(raw?.ipHash) || undefined;
      return { type: 'ACCESSED', atIso, ...(userAgentHash ? { userAgentHash } : {}), ...(ipHash ? { ipHash } : {}) };
    }

    if (type === 'REVOKED') {
      const atIso = assertIsoLike('event.atIso', String(raw?.atIso || '').trim());
      return { type: 'REVOKED', atIso };
    }

    if (type === 'EXPIRY_EXTENDED') {
      const atIso = assertIsoLike('event.atIso', String(raw?.atIso || '').trim());
      const newExpiresAtIso = assertIsoLike('event.newExpiresAtIso', String(raw?.newExpiresAtIso || '').trim());
      return { type: 'EXPIRY_EXTENDED', atIso, newExpiresAtIso };
    }

    if (type === 'SCOPE_CHANGED') {
      const atIso = assertIsoLike('event.atIso', String(raw?.atIso || '').trim());
      const newScope = normalizeScopeV1(raw?.newScope);
      return { type: 'SCOPE_CHANGED', atIso, newScope };
    }

    return null;
  } catch {
    return null;
  }
}

function appendBoundedEventV1(eventsRaw: ShareEventV1[] | undefined, ev: ShareEventV1): ShareEventV1[] {
  const prev = Array.isArray(eventsRaw) ? eventsRaw : [];
  const next = [...prev, ev];
  return next.length <= 200 ? next : next.slice(-200);
}

function sanitizeNote(note: unknown): string | null {
  const s = String(note ?? '').trim();
  if (!s) return null;
  return s.length > 500 ? s.slice(0, 500) + '…(truncated)' : s;
}

function sanitizePasswordHint(hint: unknown): string | null {
  const s = String(hint ?? '').trim();
  if (!s) return null;
  // Keep this intentionally short and safe to display.
  return s.length > 140 ? s.slice(0, 140) + '…(truncated)' : s;
}

function sortSharesDeterministic(shares: ShareLinkSafeV1[]): ShareLinkSafeV1[] {
  // Deterministic: newest first, then shareId asc.
  return shares
    .slice()
    .sort(
      (a, b) =>
        String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || '')) ||
        String(a.shareId || '').localeCompare(String(b.shareId || '')),
    );
}

function clampShares(shares: ShareLinkSafeV1[], max: number): ShareLinkSafeV1[] {
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

        const passwordHashRaw = Object.prototype.hasOwnProperty.call(x, 'passwordHash') ? String((x as any).passwordHash ?? '').trim() : '';
        const passwordHash = passwordHashRaw ? (passwordHashRaw.length > 800 ? null : passwordHashRaw) : null;
        const requiresPasswordRaw = Object.prototype.hasOwnProperty.call(x, 'requiresPassword') ? Boolean((x as any).requiresPassword) : null;
        const requiresPassword = requiresPasswordRaw !== null ? requiresPasswordRaw : Boolean(passwordHash);
        const passwordHint = Object.prototype.hasOwnProperty.call(x, 'passwordHint') ? (sanitizePasswordHint((x as any).passwordHint) ?? null) : null;

        const events: ShareEventV1[] = (() => {
          const rawEvents = Array.isArray((x as any).events) ? (x as any).events : [];
          const norm = rawEvents.map(normalizeEventV1).filter(Boolean) as ShareEventV1[];
          return norm.length <= 200 ? norm : norm.slice(-200);
        })();

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
          requiresPassword,
          passwordHash,
          passwordHint,
          ...(note !== undefined ? { note } : {}),
          events,
        } as any as ShareLinkStoredV1;
      })
      .filter(Boolean) as ShareLinkStoredV1[];
  } catch {
    return [];
  }
}

function stripSecrets(stored: ShareLinkStoredV1): ShareLinkSafeV1 {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tokenHash: _omitTokenHash, passwordHash: _omitPasswordHash, ...pub } = stored as any;
  return pub as ShareLinkSafeV1;
}

function stripTokenHashAndEvents(stored: ShareLinkStoredV1): ShareLinkMetaV1 {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tokenHash: _omitTokenHash, passwordHash: _omitPasswordHash, events: _omitEvents, ...pub } = stored as any;
  return pub as ShareLinkMetaV1;
}

async function writeAllShares(baseDir: string, shares: ShareLinkStoredV1[]): Promise<void> {
  const bounded = clampShares(shares as any as ShareLinkSafeV1[], 50_000) as any as ShareLinkStoredV1[];
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
      requiresPassword?: boolean;
      passwordHash?: string | null;
      passwordHint?: string | null;
      shareId?: string;
    }): Promise<ShareLinkSafeV1> {
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
      const passwordHash = args.passwordHash === undefined ? null : (String(args.passwordHash ?? '').trim() || null);
      const requiresPassword = args.requiresPassword === undefined ? Boolean(passwordHash) : Boolean(args.requiresPassword);
      const passwordHint = args.passwordHint === undefined ? null : (sanitizePasswordHint(args.passwordHint) ?? null);

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
        requiresPassword,
        passwordHash,
        passwordHint,
        ...(note !== undefined ? { note } : {}),
        events: appendBoundedEventV1([], {
          type: 'CREATED',
          createdAtIso: nowIso,
          scope,
          expiresAtIso,
          ...(note ? { note } : {}),
        }),
      };

      const existing = await readAllShares(baseDir);
      if (existing.some((s) => String((s as any).tokenHash || '').toLowerCase() === tokenHash)) {
        throw new Error('Share token already exists');
      }
      const next = [recStored as ShareLinkStoredV1, ...existing];
      await writeAllShares(baseDir, next);
      return stripSecrets(recStored as ShareLinkStoredV1);
    },

    async listSharesForProject(args: { projectId: string; limit?: number }): Promise<ShareLinkMetaV1[]> {
      const projectId = assertIdLike({ label: 'projectId', value: args.projectId, max: 120 });
      const limitRaw = Number(args.limit ?? 50);
      const limit = Math.max(1, Math.min(200, Number.isFinite(limitRaw) ? Math.trunc(limitRaw) : 50));
      const all = await readAllShares(baseDir);
      const filtered = all.filter((s) => String((s as any).projectId || '') === projectId);
      return sortSharesDeterministic(filtered as any as ShareLinkSafeV1[])
        .slice(0, limit)
        .map((s) => stripTokenHashAndEvents(s as any as ShareLinkStoredV1));
    },

    async listShares(args?: { limit?: number; q?: string }): Promise<ShareLinkMetaV1[]> {
      const limitRaw = Number(args?.limit ?? 100);
      const limit = Math.max(1, Math.min(500, Number.isFinite(limitRaw) ? Math.trunc(limitRaw) : 100));
      const q = String(args?.q || '').trim().toLowerCase();
      const all = await readAllShares(baseDir);
      const filtered = q
        ? all.filter((s: any) => {
            const projectId = String(s?.projectId || '').toLowerCase();
            const revisionId = String(s?.revisionId || '').toLowerCase();
            const note = String(s?.note || '').toLowerCase();
            return projectId.includes(q) || revisionId.includes(q) || note.includes(q);
          })
        : all;
      return sortSharesDeterministic(filtered as any as ShareLinkSafeV1[])
        .slice(0, limit)
        .map((s) => stripTokenHashAndEvents(s as any as ShareLinkStoredV1));
    },

    async getShareById(shareIdRaw: string): Promise<ShareLinkSafeV1> {
      const shareId = assertIdLike({ label: 'shareId', value: shareIdRaw, max: 180 });
      const all = await readAllShares(baseDir);
      const found = all.find((s) => String(s.shareId) === shareId);
      if (!found) throw new Error('Share not found');
      return stripSecrets(found as ShareLinkStoredV1);
    },

    async getShareStoredById(shareIdRaw: string): Promise<ShareLinkStoredV1> {
      const shareId = assertIdLike({ label: 'shareId', value: shareIdRaw, max: 180 });
      const all = await readAllShares(baseDir);
      const found = all.find((s) => String(s.shareId) === shareId);
      if (!found) throw new Error('Share not found');
      return found as ShareLinkStoredV1;
    },

    async resolveShareByTokenHash(tokenHashRaw: string): Promise<ShareLinkSafeV1> {
      const tokenHash = String(tokenHashRaw || '').trim().toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(tokenHash)) throw new Error('Invalid share token');
      const all = await readAllShares(baseDir);
      const found = all.find((s) => String((s as any).tokenHash || '').toLowerCase() === tokenHash);
      if (!found) throw new Error('Invalid share token');
      return stripSecrets(found as ShareLinkStoredV1);
    },

    async resolveShareStoredByTokenHash(tokenHashRaw: string): Promise<ShareLinkStoredV1> {
      const tokenHash = String(tokenHashRaw || '').trim().toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(tokenHash)) throw new Error('Invalid share token');
      const all = await readAllShares(baseDir);
      const found = all.find((s) => String((s as any).tokenHash || '').toLowerCase() === tokenHash);
      if (!found) throw new Error('Invalid share token');
      return found as ShareLinkStoredV1;
    },

    async revokeShare(args: { shareId: string; nowIso?: string }): Promise<ShareLinkSafeV1> {
      const shareId = assertIdLike({ label: 'shareId', value: args.shareId, max: 180 });
      const nowIso = String(args.nowIso || new Date().toISOString()).trim();
      assertIsoLike('nowIso', nowIso);

      const all = await readAllShares(baseDir);
      const idx = all.findIndex((s) => String(s.shareId) === shareId);
      if (idx < 0) throw new Error('Share not found');
      const prev = all[idx] as any;
      const alreadyRevoked = String(prev?.revokedAtIso || '').trim();
      const nextRec: any = alreadyRevoked
        ? prev
        : {
            ...prev,
            revokedAtIso: nowIso,
            events: appendBoundedEventV1(Array.isArray(prev?.events) ? prev.events : [], { type: 'REVOKED', atIso: nowIso }),
          };
      const next = all.slice();
      next[idx] = nextRec as ShareLinkStoredV1;
      await writeAllShares(baseDir, next);
      return stripSecrets(nextRec as ShareLinkStoredV1);
    },

    async extendExpiry(args: { shareId: string; extendHours: number; nowIso?: string }): Promise<ShareLinkSafeV1> {
      const shareId = assertIdLike({ label: 'shareId', value: args.shareId, max: 180 });
      const nowIso = String(args.nowIso || new Date().toISOString()).trim();
      assertIsoLike('nowIso', nowIso);

      const extendHoursRaw = Number(args.extendHours ?? 0);
      const extendHours = Math.max(1, Math.min(24 * 365 * 5, Number.isFinite(extendHoursRaw) ? Math.trunc(extendHoursRaw) : 168));

      const all = await readAllShares(baseDir);
      const idx = all.findIndex((s) => String(s.shareId) === shareId);
      if (idx < 0) throw new Error('Share not found');
      const prev = all[idx] as any;

      const prevExpMs = prev?.expiresAtIso ? Date.parse(String(prev.expiresAtIso)) : NaN;
      const baseMs = Number.isFinite(prevExpMs) ? prevExpMs : Date.parse(nowIso);
      const nextExpiresAtIso = new Date(baseMs + extendHours * 60 * 60 * 1000).toISOString();

      const nextRec: any = {
        ...prev,
        expiresAtIso: nextExpiresAtIso,
        events: appendBoundedEventV1(Array.isArray(prev?.events) ? prev.events : [], {
          type: 'EXPIRY_EXTENDED',
          atIso: nowIso,
          newExpiresAtIso: nextExpiresAtIso,
        }),
      };
      const next = all.slice();
      next[idx] = nextRec as ShareLinkStoredV1;
      await writeAllShares(baseDir, next);
      return stripSecrets(nextRec as ShareLinkStoredV1);
    },

    async setScope(args: { shareId: string; scope: ShareScopeV1; nowIso?: string }): Promise<ShareLinkSafeV1> {
      const shareId = assertIdLike({ label: 'shareId', value: args.shareId, max: 180 });
      const nowIso = String(args.nowIso || new Date().toISOString()).trim();
      assertIsoLike('nowIso', nowIso);
      const scope = normalizeScopeV1(args.scope);

      const all = await readAllShares(baseDir);
      const idx = all.findIndex((s) => String(s.shareId) === shareId);
      if (idx < 0) throw new Error('Share not found');
      const prev = all[idx] as any;
      if (String(prev?.scope || '').toUpperCase() === scope) return stripSecrets(prev as ShareLinkStoredV1);

      const nextRec: any = {
        ...prev,
        scope,
        events: appendBoundedEventV1(Array.isArray(prev?.events) ? prev.events : [], { type: 'SCOPE_CHANGED', atIso: nowIso, newScope: scope }),
      };
      const next = all.slice();
      next[idx] = nextRec as ShareLinkStoredV1;
      await writeAllShares(baseDir, next);
      return stripSecrets(nextRec as ShareLinkStoredV1);
    },

    async setPassword(args: { shareId: string; passwordHash: string; passwordHint?: string | null; nowIso?: string }): Promise<ShareLinkSafeV1> {
      const shareId = assertIdLike({ label: 'shareId', value: args.shareId, max: 180 });
      const nowIso = String(args.nowIso || new Date().toISOString()).trim();
      assertIsoLike('nowIso', nowIso);

      const passwordHash = String(args.passwordHash || '').trim();
      if (!passwordHash) throw new Error('passwordHash is required');
      if (passwordHash.length > 800) throw new Error('passwordHash too long');
      const passwordHint = args.passwordHint === undefined ? null : (sanitizePasswordHint(args.passwordHint) ?? null);

      const all = await readAllShares(baseDir);
      const idx = all.findIndex((s) => String(s.shareId) === shareId);
      if (idx < 0) throw new Error('Share not found');
      const prev = all[idx] as any;

      const nextRec: any = {
        ...prev,
        requiresPassword: true,
        passwordHash,
        passwordHint,
      };

      const next = all.slice();
      next[idx] = nextRec as ShareLinkStoredV1;
      await writeAllShares(baseDir, next);
      return stripSecrets(nextRec as ShareLinkStoredV1);
    },

    async recordAccess(args: { shareId: string; nowIso?: string; userAgentHash?: string | null; ipHash?: string | null }): Promise<void> {
      const shareId = assertIdLike({ label: 'shareId', value: args.shareId, max: 180 });
      const nowIso = String(args.nowIso || new Date().toISOString()).trim();
      assertIsoLike('nowIso', nowIso);
      const userAgentHash = hashLikeOrNull(args.userAgentHash) || undefined;
      const ipHash = hashLikeOrNull(args.ipHash) || undefined;

      const all = await readAllShares(baseDir);
      const idx = all.findIndex((s) => String(s.shareId) === shareId);
      if (idx < 0) return;
      const prev = all[idx] as any;
      const nextRec: any = {
        ...prev,
        accessCount: Math.max(0, Math.trunc(Number(prev?.accessCount || 0))) + 1,
        lastAccessAtIso: nowIso,
        events: appendBoundedEventV1(Array.isArray(prev?.events) ? prev.events : [], {
          type: 'ACCESSED',
          atIso: nowIso,
          ...(userAgentHash ? { userAgentHash } : {}),
          ...(ipHash ? { ipHash } : {}),
        }),
      };
      const next = all.slice();
      next[idx] = nextRec as ShareLinkStoredV1;
      await writeAllShares(baseDir, next);
    },
  };
}

