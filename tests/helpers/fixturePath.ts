import path from 'node:path';

function repoRoot(): string {
  // This file lives at tests/helpers/* → repo root is two levels up.
  return path.resolve(__dirname, '..', '..');
}

/**
 * Resolve a repo-relative fixture path in a cross-platform way.
 *
 * - Accepts Windows-style separators (e.g. `tests\\fixtures\\...`) even on Linux.
 * - Accepts forward slashes as well.
 * - Returns an absolute path.
 */
export function resolveFixturePath(relPath: string): string {
  const raw = String(relPath || '').trim();
  if (!raw) return '';

  const normalized = raw.replace(/\\/g, '/');

  if (path.isAbsolute(normalized)) return path.normalize(normalized);

  return path.resolve(repoRoot(), ...normalized.split('/').filter(Boolean));
}

