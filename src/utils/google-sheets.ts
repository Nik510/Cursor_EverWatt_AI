export interface GoogleSheetsExportInfo {
  spreadsheetId: string;
  gid?: string;
}

export function parseGoogleSheetsUrl(url: string): GoogleSheetsExportInfo | null {
  const u = String(url || '').trim();
  if (!u) return null;

  // Typical forms:
  // - https://docs.google.com/spreadsheets/d/<id>/edit#gid=0
  // - https://docs.google.com/spreadsheets/d/<id>/view?usp=sharing
  // - https://docs.google.com/spreadsheets/d/<id>/export?format=csv&gid=0
  const idMatch = u.match(/https?:\/\/docs\.google\.com\/spreadsheets\/d\/([^/]+)/i);
  if (!idMatch) return null;
  const spreadsheetId = idMatch[1];

  // gid can be in hash or query
  const gidMatch = u.match(/[?#&]gid=(\d+)/i);
  const gid = gidMatch ? gidMatch[1] : undefined;

  return { spreadsheetId, gid };
}

export function toGoogleSheetsCsvExportUrl(info: GoogleSheetsExportInfo): string {
  const gidPart = info.gid ? `&gid=${encodeURIComponent(info.gid)}` : '';
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(info.spreadsheetId)}/export?format=csv${gidPart}`;
}


