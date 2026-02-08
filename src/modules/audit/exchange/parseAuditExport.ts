import { AuditExportV1Schema, type EverWattAuditExportV1 } from './types';
import { validateAuditExport, type AuditExportValidationError } from './validateAuditExport';

export type ParseAuditExportResult =
  | { ok: true; export: EverWattAuditExportV1; warnings: string[] }
  | { ok: false; errors: AuditExportValidationError[] };

export function parseAuditExport(input: unknown): ParseAuditExportResult {
  const v = validateAuditExport(input);
  if (!v.ok) return { ok: false, errors: v.errors };

  // safeParse again for typed output (schema is strict and deterministic)
  const parsed = AuditExportV1Schema.safeParse(input);
  if (!parsed.success) {
    // should not happen because validateAuditExport passed, but keep defensive
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => ({ jsonPath: i.path.join('.'), message: i.message })),
    };
  }

  const warnings: string[] = [];
  const artifacts = Array.isArray(parsed.data.artifacts) ? parsed.data.artifacts : [];
  const artifactIds = new Set(artifacts.map((a) => String(a.artifactId)));
  for (const asset of parsed.data.assets || []) {
    for (const ev of asset.evidence || []) {
      if (ev.artifactId && !artifactIds.has(String(ev.artifactId))) {
        warnings.push(`assets[auditAssetId=${asset.auditAssetId}].evidence references missing artifactId=${ev.artifactId}`);
      }
    }
  }

  return { ok: true, export: parsed.data as EverWattAuditExportV1, warnings };
}

