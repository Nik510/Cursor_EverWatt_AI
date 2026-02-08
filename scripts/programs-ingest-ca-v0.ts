import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ProgramSnapshotV1, ProgramV1 } from '../src/modules/programLibrary/v1/types';
import { saveProgramSnapshotV1 } from '../src/modules/programLibrary/v1/storage';

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf-8').digest('hex');
}

function makeVersionTag(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}${min}Z`;
}

async function main() {
  const seedPath = path.join(process.cwd(), 'data', 'programs', 'seed', 'ca-programs.seed.json');
  const raw = await fs.readFile(seedPath, 'utf-8').catch(() => '');
  if (!raw) {
    // eslint-disable-next-line no-console
    console.error(`[programLibrary:v1] missing seed file: ${seedPath}`);
    process.exitCode = 1;
    return;
  }
  const seed = JSON.parse(raw);
  const retrievedAtIso = String(seed?.retrievedAtIso || new Date().toISOString());
  const versionTag = makeVersionTag(retrievedAtIso);
  const provider = String(seed?.provider || 'seed');
  const programsRaw = Array.isArray(seed?.programs) ? seed.programs : [];

  const byUtility = new Map<string, ProgramV1[]>();
  for (const p of programsRaw) {
    const utilityKey = String(p?.utilityKey || '').trim();
    const programId = String(p?.programId || '').trim();
    if (!utilityKey || !programId) continue;
    const program: ProgramV1 = {
      programId,
      utilityKey,
      programName: String(p?.programName || '').trim() || programId,
      implementer: String(p?.implementer || '').trim() || undefined,
      status: (String(p?.status || 'unknown') as any) || 'unknown',
      customerClassTags: Array.isArray(p?.customerClassTags) ? p.customerClassTags : [],
      measureCategories: Array.isArray(p?.measureCategories) ? p.measureCategories : [],
      eligibilityText: String(p?.eligibilityText || '').trim() || undefined,
      eligibilityCallouts: Array.isArray(p?.eligibilityCallouts) ? p.eligibilityCallouts : undefined,
      customerSizeGuidelines: Array.isArray(p?.customerSizeGuidelines) ? p.customerSizeGuidelines : undefined,
      effectiveStartIso: String(p?.effectiveStartIso || '').trim() || undefined,
      effectiveEndIso: String(p?.effectiveEndIso || '').trim() || undefined,
      participatedBefore: typeof p?.participatedBefore === 'boolean' ? Boolean(p.participatedBefore) : undefined,
      internalRating: (p as any)?.internalRating,
      worthItThresholds: (p as any)?.worthItThresholds,
      prominentCallouts: Array.isArray((p as any)?.prominentCallouts) ? (p as any).prominentCallouts : undefined,
      hidden: typeof (p as any)?.hidden === 'boolean' ? Boolean((p as any).hidden) : undefined,
      source: {
        url: String(p?.source?.url || '').trim() || 'seed://ca-programs.seed.json',
        retrievedAtIso,
        provider,
        fingerprintHash: sha256(JSON.stringify(p)),
      },
      because: Array.isArray(p?.because) ? p.because : ['Seeded dataset for deterministic ingestion.'],
      evidence: Array.isArray(p?.evidence) ? p.evidence : [{ kind: 'seed', value: 'ca-programs.seed.json' }],
      missingInfo: Array.isArray(p?.missingInfo) ? p.missingInfo : [],
    };
    const arr = byUtility.get(utilityKey) || [];
    arr.push(program);
    byUtility.set(utilityKey, arr);
  }

  const results: Array<{ utilityKey: string; wrote: boolean; versionTag: string; programCount: number }> = [];
  for (const [utilityKey, programs] of byUtility.entries()) {
    const snapshot: ProgramSnapshotV1 = {
      utilityKey,
      capturedAt: retrievedAtIso,
      versionTag,
      programs: programs.slice().sort((a, b) => a.programId.localeCompare(b.programId)),
      sourceFingerprints: [{ url: seedPath.replace(/\\/g, '/'), contentHash: sha256(raw) }],
    };
    await saveProgramSnapshotV1(snapshot);
    results.push({ utilityKey, wrote: true, versionTag, programCount: snapshot.programs.length });
  }

  // eslint-disable-next-line no-console
  console.log(`[programLibrary:v1] wrote snapshots utilities=${results.length} versionTag=${versionTag}`);
  for (const r of results.sort((a, b) => a.utilityKey.localeCompare(b.utilityKey))) {
    // eslint-disable-next-line no-console
    console.log(`[programLibrary:v1]  ${r.utilityKey}: programs=${r.programCount}`);
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});

