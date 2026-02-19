import path from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

import type { ReportSessionEventV1, ReportSessionIndexRowV1, ReportSessionRevisionMetaV1, ReportSessionV1, ReportSessionWizardOutputRefV1 } from './types';
import { assertReportSessionInvariantV1, computeReportSessionStatusV1 } from './types';

const ENV_BASEDIR = 'EVERWATT_REPORT_SESSIONS_V1_BASEDIR';

export function getReportSessionsV1BaseDir(): string {
  const env = String(process.env[ENV_BASEDIR] || '').trim();
  if (env) return path.resolve(env);
  return path.join(process.cwd(), '.data', 'reportSessionsV1');
}

export function assertValidReportIdV1(reportIdRaw: string): string {
  const reportId = String(reportIdRaw || '').trim();
  // Security: allowlist only (no path traversal).
  if (!reportId) throw new Error('reportId is required');
  if (reportId.length > 120) throw new Error('reportId too long');
  if (!/^[A-Za-z0-9_-]+$/.test(reportId)) throw new Error('Invalid reportId (allowed: [A-Za-z0-9_-])');
  return reportId;
}

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

function sessionPath(baseDir: string, reportId: string): string {
  return path.join(baseDir, `${reportId}.json`);
}

function wizardOutputPath(baseDir: string, args: { reportId: string; hash: string }): { abs: string; ref: string } {
  const reportId = String(args.reportId || '').trim();
  const hash = String(args.hash || '').trim();
  const ref = path.join('wizardOutputs', `${reportId}_${hash}.json`).replace(/\\/g, '/');
  return { ref, abs: path.join(baseDir, ref) };
}

function toIndexRow(session: ReportSessionV1): ReportSessionIndexRowV1 {
  return {
    reportId: String(session.reportId),
    createdAtIso: String(session.createdAtIso),
    updatedAtIso: String(session.updatedAtIso),
    title: String(session.title),
    kind: session.kind,
    projectId: (session.projectId ?? null) as any,
    status: session.status,
  };
}

function sortIndexRowsDeterministic(rows: ReportSessionIndexRowV1[]): ReportSessionIndexRowV1[] {
  // Deterministic: createdAt desc, then reportId asc.
  return rows
    .slice()
    .sort(
      (a, b) =>
        String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || '')) ||
        String(a.reportId || '').localeCompare(String(b.reportId || '')),
    );
}

async function readIndexRows(baseDir: string): Promise<ReportSessionIndexRowV1[]> {
  const fp = indexPath(baseDir);
  if (!existsSync(fp)) return [];
  try {
    const raw = await readFile(fp, 'utf-8');
    const parsed = JSON.parse(raw) as any;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r) => r && typeof r === 'object')
      .map((r) => ({
        reportId: String((r as any).reportId || '').trim(),
        createdAtIso: String((r as any).createdAtIso || '').trim(),
        updatedAtIso: String((r as any).updatedAtIso || '').trim(),
        title: String((r as any).title || '').trim(),
        kind: String((r as any).kind || '').trim() as any,
        projectId: (r as any).projectId ?? null,
        status: (String((r as any).status || '').trim() || 'INTAKE_ONLY') as any,
      }))
      .filter((r) => r.reportId && r.createdAtIso && r.updatedAtIso && r.title && r.kind && r.status);
  } catch {
    return [];
  }
}

async function writeIndexRows(baseDir: string, rows: ReportSessionIndexRowV1[]): Promise<void> {
  const sorted = sortIndexRowsDeterministic(rows);
  await writeFileAtomicLike(indexPath(baseDir), stableStringifyV1(sorted));
}

function clampArrayUniqueMostRecentFirst(items: string[], max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of items) {
    const s = String(x || '').trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function clampWarningsSortedUnique(items: string[], max: number): string[] {
  const set = new Set<string>();
  for (const w of items) {
    const s = String(w || '').trim();
    if (!s) continue;
    set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, max);
}

function uniqSortedIds(items: string[], max: number): string[] {
  const set = new Set<string>();
  for (const it of items) {
    const s = String(it || '').trim();
    if (!s) continue;
    set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, max);
}

function clampRevisionsUniqueMostRecentFirst(items: ReportSessionRevisionMetaV1[], max: number): ReportSessionRevisionMetaV1[] {
  const out: ReportSessionRevisionMetaV1[] = [];
  const seen = new Set<string>();
  for (const r of items) {
    const revisionId = String((r as any)?.revisionId || '').trim();
    const runId = String((r as any)?.runId || '').trim();
    if (!revisionId) continue;
    if (!runId) continue;
    if (seen.has(revisionId)) continue;
    seen.add(revisionId);
    out.push({
      revisionId,
      createdAtIso: String((r as any)?.createdAtIso || '').trim(),
      runId,
      format: String((r as any)?.format || 'JSON') as any,
      ...(String((r as any)?.downloadUrl || '').trim() ? { downloadUrl: String((r as any).downloadUrl).trim() } : {}),
    });
    if (out.length >= max) break;
  }
  return out;
}

function clampEventsAppendBounded(existing: ReportSessionEventV1[] | undefined, e: ReportSessionEventV1, max: number): ReportSessionEventV1[] {
  const base = Array.isArray(existing) ? existing.slice(0) : [];
  base.push(e);
  return base.length <= max ? base : base.slice(base.length - max);
}

function approxUtf8Bytes(text: string): number {
  return Buffer.byteLength(String(text || ''), 'utf-8');
}

export function generateReportIdV1(args?: { nowIso?: string; entropyHex?: string }): string {
  const nowIso = String(args?.nowIso || new Date().toISOString()).trim();
  const compact = nowIso
    .replace(/[-:]/g, '')
    .replace('.000Z', 'Z')
    .replace(/\.\d+Z$/, 'Z')
    .replace('T', '_')
    .replace('Z', '');
  const entropyHex = String(args?.entropyHex || randomBytes(3).toString('hex')).trim().replace(/[^a-f0-9]/gi, '').toLowerCase();
  const rand6 = (entropyHex || '000000').slice(0, 6).padEnd(6, '0');
  return `rs_${compact}_${rand6}`;
}

export function createReportSessionsStoreFsV1(args?: { baseDir?: string }) {
  const baseDir = path.resolve(String(args?.baseDir || '').trim() || getReportSessionsV1BaseDir());

  async function writeSession(session: ReportSessionV1): Promise<void> {
    assertReportSessionInvariantV1(session);
    const reportId = assertValidReportIdV1(session.reportId);
    const fp = sessionPath(baseDir, reportId);
    await writeFileAtomicLike(fp, stableStringifyV1(session));

    const existing = await readIndexRows(baseDir);
    const next = existing.filter((r) => String(r.reportId) !== reportId);
    next.push(toIndexRow(session));
    await writeIndexRows(baseDir, next);
  }

  async function readSession(reportIdRaw: string): Promise<ReportSessionV1> {
    const reportId = assertValidReportIdV1(reportIdRaw);
    const fp = sessionPath(baseDir, reportId);
    if (!existsSync(fp)) throw new Error('Report session not found');
    const raw = await readFile(fp, 'utf-8');
    const parsed = JSON.parse(raw) as any;
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid stored report session');
    const runIds = Array.isArray(parsed.runIds) ? parsed.runIds : [];
    const revisions = Array.isArray(parsed.revisions) ? parsed.revisions : [];
    const warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];
    const wizardOutputV1 = parsed.wizardOutputV1 ?? null;
    const status = String(parsed.status || '').trim() ? (parsed.status as any) : computeReportSessionStatusV1({ runIds, revisions, wizardOutputV1 } as any);
    const events = Array.isArray(parsed.events) ? parsed.events : [];

    return {
      ...(parsed as any),
      reportId,
      runIds,
      revisions,
      warnings,
      status,
      events,
      wizardOutputV1,
    } as ReportSessionV1;
  }

  return {
    baseDir,

    async createSession(draft: {
      reportId?: string;
      title?: string;
      kind: string;
      projectId?: string | null;
      inputsSummary?: Record<string, unknown> | null;
      nowIso?: string;
      entropyHex?: string;
    }): Promise<{ reportId: string; session: ReportSessionV1 }> {
      const nowIso = String(draft?.nowIso || new Date().toISOString()).trim();
      const reportId = draft?.reportId ? assertValidReportIdV1(String(draft.reportId)) : generateReportIdV1({ nowIso, entropyHex: String(draft?.entropyHex || '').trim() || undefined });

      const kindRaw = String(draft?.kind || '').trim();
      const kind = (kindRaw || 'CUSTOM') as any;

      const title = String(draft?.title || '').trim() || `Report Session • ${nowIso.slice(0, 10)}`;
      const projectId = String(draft?.projectId ?? '').trim() || null;

      const inputsSummaryRaw = (draft?.inputsSummary && typeof draft.inputsSummary === 'object' ? draft.inputsSummary : {}) as any;
      const inputsSummary = {
        ...(inputsSummaryRaw.hasBillText ? { hasBillText: Boolean(inputsSummaryRaw.hasBillText) } : {}),
        ...(inputsSummaryRaw.hasIntervals ? { hasIntervals: Boolean(inputsSummaryRaw.hasIntervals) } : {}),
        ...(inputsSummaryRaw.hasAddress ? { hasAddress: Boolean(inputsSummaryRaw.hasAddress) } : {}),
        ...(inputsSummaryRaw.hasQuestionnaire ? { hasQuestionnaire: Boolean(inputsSummaryRaw.hasQuestionnaire) } : {}),
        ...(inputsSummaryRaw.hasNotes ? { hasNotes: Boolean(inputsSummaryRaw.hasNotes) } : {}),
        ...(String(inputsSummaryRaw.utilityHint || '').trim() ? { utilityHint: String(inputsSummaryRaw.utilityHint).trim().slice(0, 60) } : {}),
      };

      const session: ReportSessionV1 = {
        reportId,
        createdAtIso: nowIso,
        updatedAtIso: nowIso,
        title,
        kind,
        ...(projectId ? { projectId } : {}),
        inputsSummary,
        runIds: [],
        revisions: [],
        status: 'INTAKE_ONLY',
        events: [{ type: 'CREATED', atIso: nowIso }],
        wizardOutputV1: null,
        warnings: [],
      };

      await writeSession(session);
      return { reportId, session };
    },

    async getSession(reportId: string): Promise<ReportSessionV1> {
      return await readSession(reportId);
    },

    async listSessions(args?: { limit?: number; query?: string }): Promise<ReportSessionV1[]> {
      const limitRaw = Number(args?.limit ?? 50);
      const limit = Math.max(1, Math.min(200, Number.isFinite(limitRaw) ? Math.trunc(limitRaw) : 50));
      const q = String(args?.query || '').trim().toLowerCase();

      const rows = await readIndexRows(baseDir);
      const sorted = sortIndexRowsDeterministic(rows);
      const filteredRows = !q
        ? sorted
        : sorted.filter((r) => {
            const parts = [r.reportId, r.title, r.kind, r.projectId ?? '']
              .map((x) => String(x || '').toLowerCase())
              .join(' | ');
            return parts.includes(q);
          });

      const out: ReportSessionV1[] = [];
      for (const r of filteredRows.slice(0, limit)) {
        try {
          out.push(await readSession(r.reportId));
        } catch {
          // ignore missing/corrupt sessions; index is the source of truth.
        }
      }
      // Deterministic: createdAt desc, then reportId asc.
      out.sort((a, b) => String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || '')) || String(a.reportId || '').localeCompare(String(b.reportId || '')));
      return out;
    },

    async attachRun(reportIdRaw: string, runIdRaw: string, opts?: { nowIso?: string }): Promise<ReportSessionV1> {
      const reportId = assertValidReportIdV1(reportIdRaw);
      const runId = String(runIdRaw || '').trim();
      if (!runId) throw new Error('runId is required');
      if (runId.length > 120) throw new Error('runId too long');
      if (!/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error('Invalid runId (allowed: [A-Za-z0-9_-])');

      const nowIso = String(opts?.nowIso || new Date().toISOString()).trim();
      const session = await readSession(reportId);
      const nextRunIds = clampArrayUniqueMostRecentFirst([runId, ...(Array.isArray(session.runIds) ? session.runIds : [])], 50);

      const updated: ReportSessionV1 = {
        ...session,
        updatedAtIso: nowIso,
        runIds: nextRunIds,
        events: clampEventsAppendBounded(session.events, { type: 'RUN_ATTACHED', atIso: nowIso, runId }, 50),
      };
      updated.status = computeReportSessionStatusV1(updated);
      await writeSession(updated);
      return updated;
    },

    async attachRevision(
      reportIdRaw: string,
      revisionMeta: ReportSessionRevisionMetaV1,
      opts?: { nowIso?: string },
    ): Promise<ReportSessionV1> {
      const reportId = assertValidReportIdV1(reportIdRaw);
      const nowIso = String(opts?.nowIso || new Date().toISOString()).trim();
      const session = await readSession(reportId);

      const runId = String((revisionMeta as any)?.runId || '').trim();
      if (!runId) throw new Error('revisionMeta.runId is required');
      if (!Array.isArray(session.runIds) || !session.runIds.includes(runId)) throw new Error(`revisionMeta.runId must reference an attached runId (${runId})`);

      const nextRevisions = clampRevisionsUniqueMostRecentFirst([revisionMeta, ...(Array.isArray(session.revisions) ? session.revisions : [])], 50);
      const updated: ReportSessionV1 = {
        ...session,
        updatedAtIso: nowIso,
        revisions: nextRevisions,
        events: clampEventsAppendBounded(session.events, { type: 'REVISION_ATTACHED', atIso: nowIso, revisionId: String((revisionMeta as any)?.revisionId || '').trim(), runId }, 50),
      };
      updated.status = computeReportSessionStatusV1(updated);
      await writeSession(updated);
      return updated;
    },

    async patchSession(reportIdRaw: string, patch: Partial<Pick<ReportSessionV1, 'title' | 'projectId' | 'inputsSummary' | 'warnings' | 'kind'>>, opts?: { nowIso?: string }): Promise<ReportSessionV1> {
      const reportId = assertValidReportIdV1(reportIdRaw);
      const nowIso = String(opts?.nowIso || new Date().toISOString()).trim();
      const session = await readSession(reportId);

      const title = Object.prototype.hasOwnProperty.call(patch, 'title') ? String(patch.title || '').trim() || session.title : session.title;
      const kind = Object.prototype.hasOwnProperty.call(patch, 'kind') ? (String((patch as any).kind || '').trim() as any) || session.kind : session.kind;
      const prevProjectId = session.projectId ?? null;
      const projectId = Object.prototype.hasOwnProperty.call(patch, 'projectId') ? (String((patch as any).projectId || '').trim() || null) : prevProjectId;
      const inputsSummary =
        Object.prototype.hasOwnProperty.call(patch, 'inputsSummary') && patch.inputsSummary && typeof patch.inputsSummary === 'object'
          ? (patch.inputsSummary as any)
          : session.inputsSummary;
      const warnings = Object.prototype.hasOwnProperty.call(patch, 'warnings')
        ? clampWarningsSortedUnique(Array.isArray((patch as any).warnings) ? (patch as any).warnings : [], 50)
        : clampWarningsSortedUnique(Array.isArray(session.warnings) ? session.warnings : [], 50);

      let events = session.events;
      if (!prevProjectId && projectId) {
        events = clampEventsAppendBounded(events, { type: 'PROJECT_SHELL_CREATED', atIso: nowIso, projectId }, 50);
      }

      const updated: ReportSessionV1 = {
        ...session,
        updatedAtIso: nowIso,
        title,
        kind,
        ...(projectId ? { projectId } : {}),
        inputsSummary,
        warnings,
        events,
      };
      updated.status = computeReportSessionStatusV1(updated);

      await writeSession(updated);
      return updated;
    },

    async attachWizardOutput(
      reportIdRaw: string,
      args: {
        wizardOutput: unknown;
        hash: string;
        generatedAtIso: string;
        runIdsUsed: string[];
        revisionIdsUsed: string[];
        preferInlineUnderBytes?: number;
      },
      opts?: { nowIso?: string },
    ): Promise<ReportSessionV1> {
      const reportId = assertValidReportIdV1(reportIdRaw);
      const nowIso = String(opts?.nowIso || new Date().toISOString()).trim();
      const session = await readSession(reportId);

      const hash = String(args?.hash || '').trim();
      if (!hash) throw new Error('hash is required');
      const generatedAtIso = String(args?.generatedAtIso || '').trim();
      if (!generatedAtIso) throw new Error('generatedAtIso is required');
      const runIdsUsed = uniqSortedIds(Array.isArray(args?.runIdsUsed) ? args.runIdsUsed : [], 50);
      const revisionIdsUsed = uniqSortedIds(Array.isArray(args?.revisionIdsUsed) ? args.revisionIdsUsed : [], 50);

      const preferInlineUnderBytes = Math.max(8_000, Math.min(400_000, Math.trunc(Number(args?.preferInlineUnderBytes ?? 80_000) || 80_000)));
      const wizardText = stableStringifyV1(args.wizardOutput);
      const approxBytes = approxUtf8Bytes(wizardText);

      let wizardOutputV1: ReportSessionWizardOutputRefV1;
      if (approxBytes <= preferInlineUnderBytes) {
        wizardOutputV1 = { kind: 'INLINE', hash, generatedAtIso, runIdsUsed, revisionIdsUsed, wizardOutput: args.wizardOutput, approxBytes };
      } else {
        const { abs, ref } = wizardOutputPath(baseDir, { reportId, hash });
        await writeFileAtomicLike(abs, wizardText);
        wizardOutputV1 = { kind: 'BLOB_REF', hash, generatedAtIso, runIdsUsed, revisionIdsUsed, blobRef: ref, approxBytes };
      }

      const updated: ReportSessionV1 = {
        ...session,
        updatedAtIso: nowIso,
        wizardOutputV1,
        events: clampEventsAppendBounded(session.events, { type: 'WIZARD_OUTPUT_BUILT', atIso: nowIso, hash, runIdsUsed }, 50),
      };
      updated.status = computeReportSessionStatusV1(updated);
      await writeSession(updated);
      return updated;
    },

    async readWizardOutput(reportIdRaw: string): Promise<unknown | null> {
      const reportId = assertValidReportIdV1(reportIdRaw);
      const session = await readSession(reportId);
      const wiz = (session as any)?.wizardOutputV1 as any;
      if (!wiz) return null;
      const kind = String(wiz?.kind || '').trim();
      if (kind === 'INLINE') return wiz?.wizardOutput ?? null;
      if (kind === 'BLOB_REF') {
        const ref = String(wiz?.blobRef || '').trim();
        if (!ref) return null;
        const abs = path.join(baseDir, ref);
        if (!existsSync(abs)) throw new Error('Stored wizard output blob not found');
        const raw = await readFile(abs, 'utf-8');
        return JSON.parse(raw);
      }
      return null;
    },

    async recordError(reportIdRaw: string, args: { code: string; context?: Record<string, unknown> }, opts?: { nowIso?: string }): Promise<ReportSessionV1> {
      const reportId = assertValidReportIdV1(reportIdRaw);
      const nowIso = String(opts?.nowIso || new Date().toISOString()).trim();
      const session = await readSession(reportId);
      const code = String(args?.code || '').trim() || 'unknown_error';
      const context = args?.context && typeof args.context === 'object' ? args.context : undefined;
      const updated: ReportSessionV1 = {
        ...session,
        updatedAtIso: nowIso,
        events: clampEventsAppendBounded(session.events, { type: 'ERROR_RECORDED', atIso: nowIso, code, ...(context ? { context } : {}) }, 50),
      };
      updated.status = computeReportSessionStatusV1(updated);
      await writeSession(updated);
      return updated;
    },
  };
}

