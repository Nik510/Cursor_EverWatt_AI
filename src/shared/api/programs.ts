import { apiRequest } from './client';

export type ProgramV1Api = {
  programId: string;
  utilityKey: string;
  programName: string;
  [k: string]: any;
};

export type CaProgramsLatestResponse = {
  success: true;
  utilities: Array<{
    utilityKey: string;
    latestSnapshot: null | { versionTag: string; capturedAt: string | null; isStale: boolean; programCount: number };
    programs: ProgramV1Api[];
    error?: { message: string };
  }>;
  warnings?: string[];
  errors?: Array<{ utility: string; endpoint: string; reason: string }>;
};

export async function getLatestCaPrograms(args?: { utility?: string; allowResidential?: boolean; onlyParticipatedBefore?: boolean }) {
  const qs = new URLSearchParams();
  if (args?.utility) qs.set('utility', String(args.utility));
  if (args?.allowResidential) qs.set('allowResidential', '1');
  if (args?.onlyParticipatedBefore) qs.set('onlyParticipatedBefore', '1');
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequest<CaProgramsLatestResponse>({ url: `/api/programs/ca/latest${suffix}` });
}

