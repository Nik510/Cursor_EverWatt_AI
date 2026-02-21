type KnownReportTypeV1 = 'ENGINEERING_PACK_V1' | 'EXECUTIVE_PACK_V1' | 'INTERNAL_ENGINEERING_V1';

function safeFilenamePart(input: string, fallback: string): string {
  const cleaned = String(input || '')
    .trim()
    .replace(/[^\w\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '')
    .slice(0, 120);
  return cleaned || fallback;
}

function yyyymmddFromIso(iso: string | null | undefined): string {
  const raw = String(iso || '').trim();
  if (!raw) return '00000000';
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return '00000000';
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function reportTypeLabel(reportType: string): string {
  const rt = String(reportType || '').trim().toUpperCase();
  if (rt === 'ENGINEERING_PACK_V1') return 'EngineeringPack';
  if (rt === 'EXECUTIVE_PACK_V1') return 'ExecutivePack';
  if (rt === 'INTERNAL_ENGINEERING_V1') return 'InternalEngineeringReport';
  return safeFilenamePart(rt || 'Report', 'Report');
}

export function buildRevisionFilenameV1(args: {
  reportType: KnownReportTypeV1 | string;
  projectOrReportId: string;
  revisionId: string;
  createdAtIso?: string | null;
  ext: 'pdf' | 'json' | 'zip' | 'txt';
}): string {
  const label = reportTypeLabel(args.reportType);
  const idPart = safeFilenamePart(args.projectOrReportId, 'id');
  const revPart = safeFilenamePart(args.revisionId, 'rev');
  const yyyymmdd = yyyymmddFromIso(args.createdAtIso);
  const ext = safeFilenamePart(args.ext, 'bin');
  return `EverWatt_${label}_${idPart}_Rev${revPart}_${yyyymmdd}.${ext}`;
}

