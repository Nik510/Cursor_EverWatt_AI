import type { ZodIssue } from 'zod';
import { AuditExportV1Schema } from './types';

export type AuditExportValidationError = {
  jsonPath: string;
  message: string;
};

function formatJsonPath(path: Array<string | number>): string {
  if (!path.length) return '(root)';
  let out = '';
  for (const p of path) {
    if (typeof p === 'number') out += `[${p}]`;
    else {
      // record keys may include dots; keep as-is (still human-readable)
      if (!out) out += p;
      else out += `.${p}`;
    }
  }
  return out;
}

function issuesToErrors(issues: ZodIssue[]): AuditExportValidationError[] {
  const out: AuditExportValidationError[] = [];
  for (const i of issues) {
    out.push({
      jsonPath: formatJsonPath(i.path as any),
      message: i.message,
    });
  }
  return out;
}

export function validateAuditExport(input: unknown): { ok: true } | { ok: false; errors: AuditExportValidationError[] } {
  const parsed = AuditExportV1Schema.safeParse(input);
  if (parsed.success) return { ok: true };
  return { ok: false, errors: issuesToErrors(parsed.error.issues) };
}

