import fs from 'fs/promises';
import path from 'path';

type Violation = { file: string; importerModuleId: string; spec: string; resolved: string; importedModuleId: string };

const repoRoot = path.resolve(process.cwd());
const srcRoot = path.join(repoRoot, 'src');
const modulesRoot = path.join(srcRoot, 'modules');

const SCANNED_SUBDIRS = ['pages', 'components', 'services'] as const;
const SCANNED_EXTS = new Set(['.ts', '.tsx']);

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (e.isFile()) {
      const ext = path.extname(e.name);
      if (SCANNED_EXTS.has(ext)) out.push(full);
    }
  }
  return out;
}

function moduleIdForFile(filePath: string): string | null {
  const rel = path.relative(modulesRoot, filePath);
  const parts = rel.split(path.sep);
  if (!parts.length) return null;
  const first = parts[0];
  if (!first || first.startsWith('.')) return null;
  return first;
}

function importedModuleIdForResolved(resolvedPath: string): string | null {
  const rel = path.relative(modulesRoot, resolvedPath);
  const parts = rel.split(path.sep);
  const first = parts[0];
  if (!first || first.startsWith('.')) return null;
  return first;
}

function extractImportSpecifiers(code: string): string[] {
  const specs: string[] = [];

  // import ... from 'x'
  for (const m of code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) specs.push(m[1]);
  // import('x')
  for (const m of code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
  // require('x')
  for (const m of code.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);

  return specs;
}

async function resolveRelativeImport(fromFile: string, spec: string): Promise<string | null> {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  for (const c of candidates) {
    if (await exists(c)) return c;
  }
  return null;
}

async function main() {
  const violations: Violation[] = [];

  const moduleDirs = (await fs.readdir(modulesRoot, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => path.join(modulesRoot, e.name));

  const filesToScan: string[] = [];
  for (const modDir of moduleDirs) {
    for (const sd of SCANNED_SUBDIRS) {
      const target = path.join(modDir, sd);
      if (await exists(target)) filesToScan.push(...(await walk(target)));
    }
  }

  for (const f of filesToScan) {
    const importerModuleId = moduleIdForFile(f);
    if (!importerModuleId) continue;
    const code = await fs.readFile(f, 'utf-8');
    for (const spec of extractImportSpecifiers(code)) {
      const resolved = await resolveRelativeImport(f, spec);
      if (!resolved) continue;
      const importedModuleId = importedModuleIdForResolved(resolved);
      if (!importedModuleId) continue;
      if (importedModuleId !== importerModuleId) {
        violations.push({
          file: toPosix(path.relative(repoRoot, f)),
          importerModuleId,
          spec,
          resolved: toPosix(path.relative(repoRoot, resolved)),
          importedModuleId,
        });
      }
    }
  }

  if (violations.length) {
    console.error('Module boundary violations detected (cross-module imports are not allowed):');
    for (const v of violations) {
      console.error(
        `- ${v.file} [${v.importerModuleId}] imports "${v.spec}" -> ${v.resolved} [${v.importedModuleId}]`
      );
    }
    process.exit(1);
  }

  console.log(`OK: no cross-module imports found in src/modules/*/{pages,components,services} (${filesToScan.length} files scanned).`);
}

main().catch((e) => {
  console.error('Module boundary check failed:', e);
  process.exit(2);
});

