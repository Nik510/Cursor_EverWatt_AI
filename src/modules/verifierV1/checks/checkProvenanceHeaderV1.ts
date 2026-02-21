import type { VerifierCheckResultV1 } from '../types';

function hasOwn(o: any, k: string): boolean {
  return Boolean(o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k));
}

export function checkProvenanceHeaderV1(args: { packJson: any }): VerifierCheckResultV1[] {
  const packJson = args.packJson && typeof args.packJson === 'object' ? args.packJson : null;
  if (!packJson) return [];

  const prov = (packJson as any)?.provenanceHeader ?? null;
  const snap = prov?.snapshotIds ?? null;

  const missing: string[] = [];
  if (!prov || typeof prov !== 'object') missing.push('provenanceHeader');
  if (!snap || typeof snap !== 'object') missing.push('provenanceHeader.snapshotIds');
  for (const k of ['tariffSnapshotId', 'generationEnergySnapshotId', 'addersSnapshotId', 'exitFeesSnapshotId']) {
    if (!hasOwn(snap, k)) missing.push(`provenanceHeader.snapshotIds.${k}`);
  }

  missing.sort((a, b) => a.localeCompare(b));
  if (!missing.length) {
    return [
      {
        code: 'verifier.provenance.missing_header',
        status: 'PASS',
        message: 'Pack provenanceHeader and snapshotIds keys are present.',
        paths: ['packJson.provenanceHeader', 'packJson.provenanceHeader.snapshotIds'],
      },
    ];
  }

  return [
    {
      code: 'verifier.provenance.missing_header',
      status: 'FAIL',
      message: 'Pack provenanceHeader and/or required snapshotIds keys are missing.',
      details: { missing },
      paths: ['packJson.provenanceHeader'],
    },
  ];
}

