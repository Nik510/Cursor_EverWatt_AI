import type { CcaIdV0 } from './types';
import { canonicalCcaIdFromSsaLseNameV0 } from './registry';

export type MatchCcaFromSsaResultV0 =
  | { ok: true; ccaId: CcaIdV0 }
  | { ok: false; ccaId: null };

export function matchCcaFromSsaV0(args: { lseName: string | null | undefined }): MatchCcaFromSsaResultV0 {
  const ccaId = canonicalCcaIdFromSsaLseNameV0(args.lseName);
  if (!ccaId) return { ok: false, ccaId: null };
  return { ok: true, ccaId };
}

