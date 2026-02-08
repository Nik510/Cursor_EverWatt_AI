import { randomUUID } from 'crypto';
import type { EverWattAuditExportV1 } from '../audit/exchange/types';
import type { EvidenceArtifact, EvidenceSource } from './types';
import { readEvidenceStore, writeEvidenceStore } from './store';

export async function ingestEvidence(args: {
  orgId: string;
  projectId: string;
  audit: EverWattAuditExportV1;
  nowIso: string;
}): Promise<{ source: EvidenceSource; artifacts: EvidenceArtifact[] }> {
  const store = await readEvidenceStore(args.orgId, args.projectId);

  const source: EvidenceSource = {
    sourceId: `audit_exchange_${randomUUID()}`,
    orgId: args.orgId,
    projectId: args.projectId,
    type: 'audit_exchange',
    createdAt: args.nowIso,
    provenance: args.audit.provenance as any,
  };

  const artifacts: EvidenceArtifact[] = (args.audit.artifacts || []).map((a) => ({
    artifactId: String(a.artifactId),
    orgId: args.orgId,
    projectId: args.projectId,
    sourceId: source.sourceId,
    kind: a.kind,
    filename: a.filename,
    uriOrPath: a.uriOrPath,
    capturedAt: a.capturedAt,
    hash: a.hash,
    metadata: a.metadata,
    createdAt: args.nowIso,
  }));

  const next = {
    sources: [source, ...store.sources].slice(0, 2000),
    artifacts: [...artifacts, ...store.artifacts],
    links: store.links,
  };
  await writeEvidenceStore(args.orgId, args.projectId, next);
  return { source, artifacts };
}

