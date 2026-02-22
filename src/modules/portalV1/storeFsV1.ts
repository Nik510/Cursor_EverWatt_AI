import path from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';

import type { OrgV1, PortalSessionV1, PortalUserRoleV1, PortalUserV1, ProjectOrgLinkV1 } from './types';
import { getEverwattPortalBaseDirV1 } from '../dataDirsV1';
import { timingSafeEqualHexV1 } from './tokenV1';

type PortalLoginTokenStoredV1 = {
  tokenId: string;
  userId: string;
  email: string;
  tokenHash: string;
  createdAtIso: string;
  expiresAtIso: string;
};

type PortalIndexV1 = {
  orgs: OrgV1[];
  users: PortalUserV1[];
  projectOrgLinks: ProjectOrgLinkV1[];
  sessions: PortalSessionV1[];
  loginTokens: PortalLoginTokenStoredV1[];
};

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

function assertIsoLike(label: string, value: string): string {
  const v = String(value || '').trim();
  if (!v) throw new Error(`${label} is required`);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(v)) throw new Error(`Invalid ${label} (expected ISO string)`);
  return v;
}

function normalizeEmail(raw: unknown): string {
  const email = String(raw ?? '').trim().toLowerCase();
  if (!email) throw new Error('email is required');
  if (email.length > 320) throw new Error('email too long');
  // "Good enough" email validation: ensure at least "a@b"
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Invalid email');
  return email;
}

function normalizeRole(raw: unknown): PortalUserRoleV1 {
  const s = String(raw ?? '').trim().toUpperCase();
  if (s === 'VIEWER') return 'VIEWER';
  if (s === 'ADMIN') return 'ADMIN';
  if (s === 'OWNER') return 'OWNER';
  throw new Error('Invalid role (expected VIEWER|ADMIN|OWNER)');
}

function safeName(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) throw new Error('name is required');
  if (s.length > 140) throw new Error('name too long');
  return s;
}

function normalizeIndex(raw: any): PortalIndexV1 {
  const orgs = Array.isArray(raw?.orgs) ? raw.orgs : [];
  const users = Array.isArray(raw?.users) ? raw.users : [];
  const links = Array.isArray(raw?.projectOrgLinks) ? raw.projectOrgLinks : [];
  const sessions = Array.isArray(raw?.sessions) ? raw.sessions : [];
  const loginTokens = Array.isArray(raw?.loginTokens) ? raw.loginTokens : [];

  return {
    orgs: orgs
      .filter((x: any) => x && typeof x === 'object')
      .map((x: any) => ({
        orgId: String(x.orgId || '').trim(),
        name: String(x.name || '').trim(),
        createdAtIso: String(x.createdAtIso || '').trim(),
      }))
      .filter((o: OrgV1) => o.orgId && o.name && /^\d{4}-\d{2}-\d{2}T/.test(o.createdAtIso)),

    users: users
      .filter((x: any) => x && typeof x === 'object')
      .map((x: any) => {
        const disabledAtIsoRaw = String(x.disabledAtIso || '').trim();
        const disabledAtIso = disabledAtIsoRaw ? disabledAtIsoRaw : undefined;
        return {
          userId: String(x.userId || '').trim(),
          orgId: String(x.orgId || '').trim(),
          email: String(x.email || '').trim().toLowerCase(),
          role: String(x.role || '').trim().toUpperCase(),
          createdAtIso: String(x.createdAtIso || '').trim(),
          ...(disabledAtIso ? { disabledAtIso } : {}),
        };
      })
      .filter((u: any) => u.userId && u.orgId && u.email && /^\d{4}-\d{2}-\d{2}T/.test(String(u.createdAtIso || '')))
      .map((u: any) => ({ ...u, role: normalizeRole(u.role) })) as PortalUserV1[],

    projectOrgLinks: links
      .filter((x: any) => x && typeof x === 'object')
      .map((x: any) => ({ projectId: String(x.projectId || '').trim(), orgId: String(x.orgId || '').trim() }))
      .filter((l: ProjectOrgLinkV1) => !!l.projectId && !!l.orgId),

    sessions: sessions
      .filter((x: any) => x && typeof x === 'object')
      .map((x: any) => ({
        sessionId: String(x.sessionId || '').trim(),
        userId: String(x.userId || '').trim(),
        createdAtIso: String(x.createdAtIso || '').trim(),
        expiresAtIso: String(x.expiresAtIso || '').trim(),
      }))
      .filter((s: PortalSessionV1) => !!s.sessionId && !!s.userId && /^\d{4}-\d{2}-\d{2}T/.test(s.createdAtIso) && /^\d{4}-\d{2}-\d{2}T/.test(s.expiresAtIso)),

    loginTokens: loginTokens
      .filter((x: any) => x && typeof x === 'object')
      .map((x: any) => ({
        tokenId: String(x.tokenId || '').trim(),
        userId: String(x.userId || '').trim(),
        email: String(x.email || '').trim().toLowerCase(),
        tokenHash: String(x.tokenHash || '').trim().toLowerCase(),
        createdAtIso: String(x.createdAtIso || '').trim(),
        expiresAtIso: String(x.expiresAtIso || '').trim(),
      }))
      .filter((t: PortalLoginTokenStoredV1) => !!t.tokenId && !!t.userId && !!t.email && /^[0-9a-f]{64}$/.test(t.tokenHash) && /^\d{4}-\d{2}-\d{2}T/.test(t.createdAtIso) && /^\d{4}-\d{2}-\d{2}T/.test(t.expiresAtIso)),
  };
}

async function readIndex(baseDir: string): Promise<PortalIndexV1> {
  const fp = indexPath(baseDir);
  if (!existsSync(fp)) return { orgs: [], users: [], projectOrgLinks: [], sessions: [], loginTokens: [] };
  try {
    const raw = await readFile(fp, 'utf-8');
    const parsed = JSON.parse(raw) as any;
    return normalizeIndex(parsed);
  } catch {
    return { orgs: [], users: [], projectOrgLinks: [], sessions: [], loginTokens: [] };
  }
}

async function writeIndex(baseDir: string, idx: PortalIndexV1): Promise<void> {
  const normalized: PortalIndexV1 = {
    orgs: (idx.orgs || []).slice(),
    users: (idx.users || []).slice(),
    projectOrgLinks: (idx.projectOrgLinks || []).slice(),
    sessions: (idx.sessions || []).slice(),
    loginTokens: (idx.loginTokens || []).slice(),
  };

  // Deterministic ordering
  normalized.orgs.sort((a, b) => String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || '')) || String(a.orgId).localeCompare(String(b.orgId)));
  normalized.users.sort((a, b) => String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || '')) || String(a.userId).localeCompare(String(b.userId)));
  normalized.projectOrgLinks.sort((a, b) => String(a.orgId).localeCompare(String(b.orgId)) || String(a.projectId).localeCompare(String(b.projectId)));
  normalized.sessions.sort((a, b) => String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || '')) || String(a.sessionId).localeCompare(String(b.sessionId)));
  normalized.loginTokens.sort((a, b) => String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || '')) || String(a.tokenId).localeCompare(String(b.tokenId)));

  await writeFileAtomicLike(indexPath(baseDir), stableStringifyV1(normalized));
}

function pruneExpiredSessionsAndTokens(idx: PortalIndexV1, nowMs: number): PortalIndexV1 {
  const keepSession = (s: PortalSessionV1) => {
    const exp = Date.parse(String(s.expiresAtIso || ''));
    return Number.isFinite(exp) ? nowMs < exp : false;
  };
  const keepToken = (t: PortalLoginTokenStoredV1) => {
    const exp = Date.parse(String(t.expiresAtIso || ''));
    return Number.isFinite(exp) ? nowMs < exp : false;
  };
  return { ...idx, sessions: (idx.sessions || []).filter(keepSession), loginTokens: (idx.loginTokens || []).filter(keepToken) };
}

export function createPortalStoreFsV1(args?: { baseDir?: string }) {
  const baseDir = path.resolve(String(args?.baseDir || '').trim() || getEverwattPortalBaseDirV1());

  return {
    baseDir,

    async createOrg(args: { name: string; orgId?: string; createdAtIso?: string }): Promise<OrgV1> {
      const nowIso = String(args.createdAtIso || new Date().toISOString()).trim();
      assertIsoLike('createdAtIso', nowIso);
      const name = safeName(args.name);

      const orgId = args.orgId ? assertIdLike({ label: 'orgId', value: args.orgId, max: 180 }) : `org_${randomUUID()}`;
      const idx0 = await readIndex(baseDir);
      const idx = pruneExpiredSessionsAndTokens(idx0, Date.now());
      if (idx.orgs.some((o) => String(o.orgId) === orgId)) throw new Error('orgId already exists');

      const rec: OrgV1 = { orgId, name, createdAtIso: nowIso };
      await writeIndex(baseDir, { ...idx, orgs: [rec, ...(idx.orgs || [])] });
      return rec;
    },

    async createUser(args: {
      orgId: string;
      email: string;
      role: PortalUserRoleV1;
      userId?: string;
      createdAtIso?: string;
    }): Promise<PortalUserV1> {
      const nowIso = String(args.createdAtIso || new Date().toISOString()).trim();
      assertIsoLike('createdAtIso', nowIso);

      const orgId = assertIdLike({ label: 'orgId', value: args.orgId, max: 180 });
      const email = normalizeEmail(args.email);
      const role = normalizeRole(args.role);
      const userId = args.userId ? assertIdLike({ label: 'userId', value: args.userId, max: 180 }) : `pu_${randomUUID()}`;

      const idx0 = await readIndex(baseDir);
      const idx = pruneExpiredSessionsAndTokens(idx0, Date.now());
      if (!idx.orgs.some((o) => String(o.orgId) === orgId)) throw new Error('org not found');
      if (idx.users.some((u) => String(u.email).toLowerCase() === email)) throw new Error('email already exists');
      if (idx.users.some((u) => String(u.userId) === userId)) throw new Error('userId already exists');

      const rec: PortalUserV1 = { userId, orgId, email, role, createdAtIso: nowIso };
      await writeIndex(baseDir, { ...idx, users: [rec, ...(idx.users || [])] });
      return rec;
    },

    async linkProjectToOrg(args: { projectId: string; orgId: string }): Promise<ProjectOrgLinkV1> {
      const projectId = assertIdLike({ label: 'projectId', value: args.projectId, max: 120 });
      const orgId = assertIdLike({ label: 'orgId', value: args.orgId, max: 180 });
      const idx0 = await readIndex(baseDir);
      const idx = pruneExpiredSessionsAndTokens(idx0, Date.now());
      if (!idx.orgs.some((o) => String(o.orgId) === orgId)) throw new Error('org not found');

      const withoutProject = (idx.projectOrgLinks || []).filter((l) => String(l.projectId) !== projectId);
      const rec: ProjectOrgLinkV1 = { projectId, orgId };
      await writeIndex(baseDir, { ...idx, projectOrgLinks: [rec, ...withoutProject] });
      return rec;
    },

    async listOrgUsers(args: { orgId: string }): Promise<PortalUserV1[]> {
      const orgId = assertIdLike({ label: 'orgId', value: args.orgId, max: 180 });
      const idx0 = await readIndex(baseDir);
      const idx = pruneExpiredSessionsAndTokens(idx0, Date.now());
      return (idx.users || []).filter((u) => String(u.orgId) === orgId).slice();
    },

    async getUserByEmail(emailRaw: string): Promise<PortalUserV1 | null> {
      const email = normalizeEmail(emailRaw);
      const idx0 = await readIndex(baseDir);
      const idx = pruneExpiredSessionsAndTokens(idx0, Date.now());
      const u = (idx.users || []).find((x) => String(x.email).toLowerCase() === email) || null;
      return u;
    },

    async getUserById(userIdRaw: string): Promise<PortalUserV1 | null> {
      const userId = assertIdLike({ label: 'userId', value: userIdRaw, max: 180 });
      const idx0 = await readIndex(baseDir);
      const idx = pruneExpiredSessionsAndTokens(idx0, Date.now());
      return (idx.users || []).find((u) => String(u.userId) === userId) || null;
    },

    async getOrgById(orgIdRaw: string): Promise<OrgV1 | null> {
      const orgId = assertIdLike({ label: 'orgId', value: orgIdRaw, max: 180 });
      const idx0 = await readIndex(baseDir);
      const idx = pruneExpiredSessionsAndTokens(idx0, Date.now());
      return (idx.orgs || []).find((o) => String(o.orgId) === orgId) || null;
    },

    async listProjectIdsForOrg(args: { orgId: string }): Promise<string[]> {
      const orgId = assertIdLike({ label: 'orgId', value: args.orgId, max: 180 });
      const idx0 = await readIndex(baseDir);
      const idx = pruneExpiredSessionsAndTokens(idx0, Date.now());
      return (idx.projectOrgLinks || [])
        .filter((l) => String(l.orgId) === orgId)
        .map((l) => String(l.projectId))
        .filter(Boolean);
    },

    async getOrgIdForProject(projectIdRaw: string): Promise<string | null> {
      const projectId = assertIdLike({ label: 'projectId', value: projectIdRaw, max: 120 });
      const idx0 = await readIndex(baseDir);
      const idx = pruneExpiredSessionsAndTokens(idx0, Date.now());
      const link = (idx.projectOrgLinks || []).find((l) => String(l.projectId) === projectId) || null;
      return link ? String(link.orgId) : null;
    },

    async upsertLoginToken(args: {
      userId: string;
      email: string;
      tokenHash: string;
      createdAtIso?: string;
      expiresAtIso: string;
      tokenId?: string;
    }): Promise<PortalLoginTokenStoredV1> {
      const userId = assertIdLike({ label: 'userId', value: args.userId, max: 180 });
      const email = normalizeEmail(args.email);
      const tokenHash = String(args.tokenHash || '').trim().toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(tokenHash)) throw new Error('tokenHash must be sha256 hex');
      const createdAtIso = assertIsoLike('createdAtIso', String(args.createdAtIso || new Date().toISOString()).trim());
      const expiresAtIso = assertIsoLike('expiresAtIso', String(args.expiresAtIso || '').trim());
      const tokenId = args.tokenId ? assertIdLike({ label: 'tokenId', value: args.tokenId, max: 180 }) : `pt_${randomUUID()}`;

      const idx0 = await readIndex(baseDir);
      const idx = pruneExpiredSessionsAndTokens(idx0, Date.now());
      const user = (idx.users || []).find((u) => String(u.userId) === userId) || null;
      if (!user) throw new Error('user not found');
      if (String(user.email).toLowerCase() !== email) throw new Error('email does not match user');

      const nextTokens = (idx.loginTokens || []).filter((t) => String(t.email).toLowerCase() !== email);
      const rec: PortalLoginTokenStoredV1 = { tokenId, userId, email, tokenHash, createdAtIso, expiresAtIso };
      await writeIndex(baseDir, { ...idx, loginTokens: [rec, ...nextTokens] });
      return rec;
    },

    async consumeLoginToken(args: { email: string; tokenHash: string; nowMs?: number }): Promise<{ userId: string } | null> {
      const email = normalizeEmail(args.email);
      const tokenHash = String(args.tokenHash || '').trim().toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(tokenHash)) return null;
      const nowMs = Number.isFinite(Number(args.nowMs)) ? Number(args.nowMs) : Date.now();

      const idx0 = await readIndex(baseDir);
      const idx = pruneExpiredSessionsAndTokens(idx0, nowMs);
      const tokenRec = (idx.loginTokens || []).find((t) => String(t.email).toLowerCase() === email) || null;
      if (!tokenRec) return null;
      const exp = Date.parse(String(tokenRec.expiresAtIso || ''));
      if (!Number.isFinite(exp) || nowMs >= exp) return null;
      if (!timingSafeEqualHexV1(String(tokenRec.tokenHash), tokenHash)) return null;

      const user = (idx.users || []).find((u) => String(u.userId) === String(tokenRec.userId)) || null;
      if (!user) return null;
      if (user.disabledAtIso) return null;

      const nextTokens = (idx.loginTokens || []).filter((t) => String(t.email).toLowerCase() !== email);
      await writeIndex(baseDir, { ...idx, loginTokens: nextTokens });
      return { userId: String(user.userId) };
    },

    async createSession(args: { userId: string; createdAtIso?: string; expiresAtIso: string; sessionId?: string }): Promise<PortalSessionV1> {
      const userId = assertIdLike({ label: 'userId', value: args.userId, max: 180 });
      const createdAtIso = assertIsoLike('createdAtIso', String(args.createdAtIso || new Date().toISOString()).trim());
      const expiresAtIso = assertIsoLike('expiresAtIso', String(args.expiresAtIso || '').trim());
      const sessionId = args.sessionId ? assertIdLike({ label: 'sessionId', value: args.sessionId, max: 180 }) : `ps_${randomUUID()}`;

      const idx0 = await readIndex(baseDir);
      const idx = pruneExpiredSessionsAndTokens(idx0, Date.now());
      const user = (idx.users || []).find((u) => String(u.userId) === userId) || null;
      if (!user) throw new Error('user not found');
      if (user.disabledAtIso) throw new Error('user disabled');

      const expMs = Date.parse(expiresAtIso);
      if (!Number.isFinite(expMs) || expMs <= Date.now()) throw new Error('expiresAtIso must be in the future');

      // Keep sessions bounded.
      const kept = (idx.sessions || []).filter((s) => String(s.userId) !== userId).slice(0, 50_000);
      const rec: PortalSessionV1 = { sessionId, userId, createdAtIso, expiresAtIso };
      await writeIndex(baseDir, { ...idx, sessions: [rec, ...kept] });
      return rec;
    },

    async getSession(sessionIdRaw: string, nowMs?: number): Promise<PortalSessionV1 | null> {
      const sessionId = assertIdLike({ label: 'sessionId', value: sessionIdRaw, max: 180 });
      const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
      const idx0 = await readIndex(baseDir);
      const idx = pruneExpiredSessionsAndTokens(idx0, now);
      const s = (idx.sessions || []).find((x) => String(x.sessionId) === sessionId) || null;
      if (!s) return null;
      const exp = Date.parse(String(s.expiresAtIso || ''));
      if (!Number.isFinite(exp) || now >= exp) return null;
      return s;
    },

    async revokeSession(sessionIdRaw: string): Promise<void> {
      const sessionId = assertIdLike({ label: 'sessionId', value: sessionIdRaw, max: 180 });
      const idx0 = await readIndex(baseDir);
      const idx = pruneExpiredSessionsAndTokens(idx0, Date.now());
      const next = (idx.sessions || []).filter((s) => String(s.sessionId) !== sessionId);
      if (next.length !== (idx.sessions || []).length) {
        await writeIndex(baseDir, { ...idx, sessions: next });
      }
    },
  };
}

