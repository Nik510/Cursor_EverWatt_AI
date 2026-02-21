import type { CcaIdV0, CaIouUtilityV0 } from './types';

export type CcaRegistryEntryV0 = {
  ccaId: CcaIdV0;
  ccaDisplayName: string;
  /** SSA canonicalName values that can map to this ccaId deterministically. */
  ssaCanonicalNames: string[];
  /** Extra aliases for matching (normalized string contains match). */
  aliases: string[];
  /** IOU territories where we expect this CCA to appear. */
  iouUtilities: CaIouUtilityV0[];
};

export const CCA_REGISTRY_V0: CcaRegistryEntryV0[] = [
  {
    ccaId: 'EBCE',
    ccaDisplayName: 'East Bay Community Energy',
    ssaCanonicalNames: ['East Bay Community Energy'],
    aliases: ['ebce', 'east bay community energy', 'east bay communityenergy'],
    iouUtilities: ['PGE'],
  },
  {
    ccaId: 'SVCE',
    ccaDisplayName: 'Silicon Valley Clean Energy',
    ssaCanonicalNames: ['Silicon Valley Clean Energy'],
    aliases: ['svce', 'silicon valley clean energy', 'silicon valley cleanenergy'],
    iouUtilities: ['PGE'],
  },
  {
    ccaId: 'PCE',
    ccaDisplayName: 'Peninsula Clean Energy',
    ssaCanonicalNames: ['Peninsula Clean Energy'],
    aliases: ['pce', 'peninsula clean energy', 'peninsula cleanenergy'],
    iouUtilities: ['PGE'],
  },
  {
    ccaId: 'CLEANPOWERSF',
    ccaDisplayName: 'CleanPowerSF',
    ssaCanonicalNames: ['CleanPowerSF'],
    aliases: ['cleanpowersf', 'clean power sf', 'sf clean energy', 'san francisco clean energy'],
    iouUtilities: ['PGE'],
  },
  {
    ccaId: 'MCE',
    ccaDisplayName: 'Marin Clean Energy',
    ssaCanonicalNames: ['Marin Clean Energy'],
    aliases: ['mce', 'marin clean energy', 'marin cleanenergy', 'marin'],
    iouUtilities: ['PGE'],
  },
  {
    ccaId: 'CPA',
    ccaDisplayName: 'Clean Power Alliance',
    ssaCanonicalNames: ['Clean Power Alliance'],
    aliases: ['clean power alliance', 'cpa', 'cleanpoweralliance'],
    iouUtilities: ['SCE'],
  },
  {
    ccaId: 'SDCP',
    ccaDisplayName: 'San Diego Community Power',
    ssaCanonicalNames: ['San Diego Community Power'],
    aliases: ['san diego community power', 'sdcp', 'san diego communitypower'],
    iouUtilities: ['SDGE'],
  },
];

function normText(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-') // hyphen variants
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canonicalCcaIdFromSsaLseNameV0(lseName: string | null | undefined): CcaIdV0 | null {
  const raw = String(lseName || '').trim();
  if (!raw) return null;
  const n = normText(raw);
  if (!n) return null;

  for (const e of CCA_REGISTRY_V0) {
    if ((e.ssaCanonicalNames || []).some((x) => normText(x) === n)) return e.ccaId;
  }
  for (const e of CCA_REGISTRY_V0) {
    const aliases = Array.isArray(e.aliases) ? e.aliases : [];
    const hay = ` ${n} `;
    for (const a0 of aliases) {
      const a = normText(a0);
      if (!a) continue;
      if (hay.includes(` ${a} `) || hay.includes(a)) return e.ccaId;
    }
  }
  return null;
}

export function ccaDisplayNameForIdV0(ccaId: CcaIdV0): string {
  return CCA_REGISTRY_V0.find((e) => e.ccaId === ccaId)?.ccaDisplayName || ccaId;
}

