import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(process.cwd());
const SRC_ROOT = path.join(REPO_ROOT, 'src');
const OUT_PATH = path.join(REPO_ROOT, 'review_pack', 'module_index.md');

const TS_EXTS = ['.ts', '.tsx', '.mts', '.cts'];

function readJson(p) {
  const raw = fs.readFileSync(p, 'utf8');
  // Best-effort JSONC support (tsconfig has comments).
  const noBlock = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  const noLine = noBlock.replace(/^\s*\/\/.*$/gm, '');
  // Remove trailing commas in objects/arrays (best-effort).
  const noTrailingCommas = noLine.replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(noTrailingCommas);
}

function safeReadFile(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function isTsFile(name) {
  const ext = path.extname(name).toLowerCase();
  return TS_EXTS.includes(ext) && !name.endsWith('.d.ts');
}

function walkFiles(dirAbs) {
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  const stack = [dirAbs];
  while (stack.length) {
    const cur = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      // skip common junk
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'build' || e.name === '.next' || e.name === '.git') continue;
      if (e.name.startsWith('.cursor')) continue;
      const p = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile() && isTsFile(e.name)) out.push(p);
    }
  }
  return out;
}

function normalizeSlashes(p) {
  return p.replace(/\\/g, '/');
}

function moduleRootForFile(fileAbs) {
  const rel = normalizeSlashes(path.relative(REPO_ROOT, fileAbs));
  if (!rel.startsWith('src/')) return null;

  // src/modules/<name>/...
  const m = rel.match(/^src\/modules\/([^/]+)\//);
  if (m) return `src/modules/${m[1]}`;

  // other src roots: src/<root>/...
  const m2 = rel.match(/^src\/([^/]+)\//);
  if (m2) return `src/${m2[1]}`;

  // src/<file>
  if (rel.startsWith('src/')) return 'src';
  return null;
}

function listModuleRoots() {
  const roots = new Set();

  // fixed src roots (as requested)
  const fixed = [
    'src/api',
    'src/backend',
    'src/components',
    'src/config',
    'src/contexts',
    'src/core',
    'src/data',
    'src/db',
    'src/hooks',
    'src/middleware',
    'src/modules',
    'src/pages',
    'src/scripts',
    'src/services',
    'src/shared',
    'src/storage',
    'src/tools',
    'src/types',
    'src/ui',
    'src/utils',
    'src/validation',
  ];
  fixed.forEach((r) => roots.add(r));

  // expand src/modules/<name>
  const modulesDir = path.join(SRC_ROOT, 'modules');
  if (exists(modulesDir)) {
    const ents = fs.readdirSync(modulesDir, { withFileTypes: true }).filter((e) => e.isDirectory());
    for (const e of ents) roots.add(`src/modules/${e.name}`);
  }

  return Array.from(roots).sort();
}

function loadTsconfigPaths() {
  const tsconfigPath = path.join(REPO_ROOT, 'tsconfig.json');
  const cfg = readJson(tsconfigPath);
  const paths = cfg?.compilerOptions?.paths ?? {};
  /** @type {Array<{prefix:string, targets:string[]}>} */
  const out = [];
  for (const [k, targets] of Object.entries(paths)) {
    // only handle simple "@x/*": ["src/..../ *"]
    const prefix = String(k).replace(/\*.*$/, '');
    const t = Array.isArray(targets) ? targets.map(String) : [];
    out.push({ prefix, targets: t });
  }
  return out;
}

function resolveImport(spec, fromFileAbs, tsPaths) {
  if (!spec || typeof spec !== 'string') return null;
  if (spec.startsWith('.') || spec.startsWith('/')) {
    const base = spec.startsWith('/') ? path.join(REPO_ROOT, spec) : path.resolve(path.dirname(fromFileAbs), spec);
    return resolveWithExtensions(base);
  }

  // tsconfig path aliases
  for (const p of tsPaths) {
    if (spec.startsWith(p.prefix)) {
      const suffix = spec.slice(p.prefix.length);
      for (const tgt of p.targets) {
        const tgtPrefix = tgt.replace(/\*.*$/, '');
        const candidate = path.join(REPO_ROOT, tgtPrefix, suffix);
        const resolved = resolveWithExtensions(candidate);
        if (resolved) return resolved;
      }
    }
  }

  return null; // bare module import
}

function resolveWithExtensions(baseAbs) {
  const tries = [
    baseAbs,
    baseAbs + '.ts',
    baseAbs + '.tsx',
    baseAbs + '.js',
    baseAbs + '.jsx',
    path.join(baseAbs, 'index.ts'),
    path.join(baseAbs, 'index.tsx'),
  ];
  for (const t of tries) {
    if (exists(t) && fs.statSync(t).isFile()) return t;
  }
  return null;
}

function extractImportSpecs(fileText) {
  /** @type {string[]} */
  const specs = [];

  // import ... from 'x'
  const re1 = /\bfrom\s+['"]([^'"]+)['"]/g;
  for (;;) {
    const m = re1.exec(fileText);
    if (!m) break;
    specs.push(m[1]);
  }

  // import('x')
  const re2 = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (;;) {
    const m = re2.exec(fileText);
    if (!m) break;
    specs.push(m[1]);
  }

  // require('x')
  const re3 = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (;;) {
    const m = re3.exec(fileText);
    if (!m) break;
    specs.push(m[1]);
  }

  return specs;
}

function summarizePurpose(rootId) {
  // Use module registry descriptions where applicable (UI modules)
  const registryPath = path.join(SRC_ROOT, 'modules', 'registry.ts');
  const regText = safeReadFile(registryPath);
  // crude extraction: look for `id: 'x'` and nearby `description: '...'`
  const idMatch = rootId.startsWith('src/modules/') ? rootId.slice('src/modules/'.length) : null;
  if (idMatch) {
    const re = new RegExp(`id:\\s*'${idMatch.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}'[\\s\\S]{0,400}?description:\\s*'([^']+)'`, 'm');
    const m = regText.match(re);
    if (m) return { purpose: m[1].trim(), evidence: [normalizeSlashes(path.relative(REPO_ROOT, registryPath))] };
  }

  // Fall back to index.ts top comment line
  const indexPath = path.join(REPO_ROOT, rootId, 'index.ts');
  const indexPath2 = path.join(REPO_ROOT, rootId, 'index.tsx');
  const idx = exists(indexPath) ? indexPath : exists(indexPath2) ? indexPath2 : null;
  if (idx) {
    const t = safeReadFile(idx);
    const firstLines = t.split('\n').slice(0, 12).join('\n');
    const comment = firstLines.match(/\/\*\*?([\s\S]*?)\*\//);
    if (comment) {
      const one = comment[1]
        .split('\n')
        .map((l) => l.replace(/^\s*\*\s?/, '').trim())
        .filter(Boolean)[0];
      if (one) return { purpose: one.replace(/\s+/g, ' '), evidence: [normalizeSlashes(path.relative(REPO_ROOT, idx))] };
    }
    return {
      purpose: 'unknown (no module description found in index header)',
      evidence: [normalizeSlashes(path.relative(REPO_ROOT, idx))],
    };
  }

  return { purpose: 'unknown (no index.ts entrypoint found)', evidence: [] };
}

function classify(rootId) {
  if (rootId.startsWith('src/pages') || rootId.startsWith('src/components') || rootId.startsWith('src/modules/') && rootId.includes('/pages')) return 'ui';
  if (rootId === 'src/core' || rootId === 'src/types' || rootId === 'src/utils' || rootId === 'src/validation' || rootId === 'src/storage' || rootId === 'src/db') return 'core';
  if (rootId.startsWith('src/modules/')) return 'feature';
  if (rootId.startsWith('src/services') || rootId.startsWith('src/server')) return 'core';
  return 'core';
}

function main() {
  const moduleRoots = listModuleRoots();
  const tsPaths = loadTsconfigPaths();
  const files = walkFiles(SRC_ROOT);

  /** @type {Map<string, Set<string>>} */
  const deps = new Map();
  /** @type {Map<string, Set<string>>} */
  const rdeps = new Map();
  /** @type {Map<string, number>} */
  const fileInbound = new Map();

  function addEdge(a, b, fromFile, toFile) {
    if (!a || !b || a === b) return;
    if (!deps.has(a)) deps.set(a, new Set());
    deps.get(a).add(b);
    if (!rdeps.has(b)) rdeps.set(b, new Set());
    rdeps.get(b).add(a);
    if (toFile) fileInbound.set(toFile, (fileInbound.get(toFile) ?? 0) + 1);
  }

  for (const f of files) {
    const fromRoot = moduleRootForFile(f);
    if (!fromRoot) continue;
    const text = safeReadFile(f);
    const specs = extractImportSpecs(text);
    for (const spec of specs) {
      const resolved = resolveImport(spec, f, tsPaths);
      if (!resolved) continue;
      const toRoot = moduleRootForFile(resolved);
      if (!toRoot) continue;
      addEdge(fromRoot, toRoot, f, normalizeSlashes(path.relative(REPO_ROOT, resolved)));
    }
  }

  // Key entry files: prefer index.ts; else most-imported file within module root.
  function keyEntryFiles(rootId) {
    const candidates = [];
    const idxTs = path.join(REPO_ROOT, rootId, 'index.ts');
    const idxTsx = path.join(REPO_ROOT, rootId, 'index.tsx');
    if (exists(idxTs)) candidates.push(normalizeSlashes(path.relative(REPO_ROOT, idxTs)));
    if (exists(idxTsx)) candidates.push(normalizeSlashes(path.relative(REPO_ROOT, idxTsx)));
    if (candidates.length) return candidates;

    // find top inbound file within root (best-effort)
    const prefix = normalizeSlashes(rootId + '/');
    const ranked = Array.from(fileInbound.entries())
      .filter(([p]) => normalizeSlashes(p).startsWith(prefix))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([p]) => normalizeSlashes(p));
    return ranked.length ? ranked : ['unknown'];
  }

  const lines = [];
  lines.push('# Module Index');
  lines.push('');
  lines.push('This file is generated for review; it is **read-only** and reflects a best-effort static import scan of `src/**/*.ts(x)`.');
  lines.push('');
  lines.push('## No-touch boundaries (for this review pack)');
  lines.push('- `src/modules/tariffEngine/**`');
  lines.push('- `src/modules/battery/**`');
  lines.push('- `src/app/**` (note: this repo uses `src/App.tsx`)');
  lines.push('');
  lines.push('## Import alias map (tsconfig)');
  lines.push(`- Source: \`${normalizeSlashes(path.relative(REPO_ROOT, path.join(REPO_ROOT, 'tsconfig.json')))}\``);
  for (const p of tsPaths) {
    lines.push(`- \`${p.prefix}*\` → ${p.targets.map((t) => `\`${t}\``).join(', ')}`);
  }
  lines.push('');
  lines.push('## Module roots covered');
  lines.push(moduleRoots.map((r) => `- \`${r}\``).join('\n'));
  lines.push('');

  for (const rootId of moduleRoots) {
    const { purpose, evidence } = summarizePurpose(rootId);
    const entryFiles = keyEntryFiles(rootId);
    const d = Array.from(deps.get(rootId) ?? []).sort();
    const rd = Array.from(rdeps.get(rootId) ?? []).sort();

    lines.push(`## \`${rootId}\``);
    lines.push('');
    lines.push(`- **purpose**: ${purpose}`);
    lines.push(`- **key entry files**: ${entryFiles.map((p) => `\`${p}\``).join(', ')}`);
    lines.push(`- **key dependencies**: ${d.length ? d.map((x) => `\`${x}\``).join(', ') : 'none found (static scan)'}`);
    lines.push(`- **what depends on it**: ${rd.length ? rd.map((x) => `\`${x}\``).join(', ') : 'none found (static scan)'}`);
    lines.push(`- **classification**: \`${classify(rootId)}\``);
    const ev = new Set(evidence);
    for (const ef of entryFiles) {
      if (ef && ef !== 'unknown') ev.add(ef);
    }
    lines.push(`- **evidence checked**: ${ev.size ? Array.from(ev).map((p) => `\`${p}\``).join(', ') : '`unknown`'}`);
    lines.push('');
  }

  fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
}

main();

