import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(process.cwd());
const SRC_ROOT = path.join(REPO_ROOT, 'src');
const OUT_PATH = path.join(REPO_ROOT, 'review_pack', 'risks_and_hotspots.md');

const TS_EXTS = ['.ts', '.tsx', '.mts', '.cts'];

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

function readJsonc(p) {
  const raw = safeReadFile(p);
  const noBlock = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  const noLine = noBlock.replace(/^\s*\/\/.*$/gm, '');
  const noTrailingCommas = noLine.replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(noTrailingCommas);
}

function loadTsconfigPaths() {
  const tsconfigPath = path.join(REPO_ROOT, 'tsconfig.json');
  const cfg = readJsonc(tsconfigPath);
  const paths = cfg?.compilerOptions?.paths ?? {};
  /** @type {Array<{prefix:string, targets:string[]}>} */
  const out = [];
  for (const [k, targets] of Object.entries(paths)) {
    const prefix = String(k).replace(/\*.*$/, '');
    const t = Array.isArray(targets) ? targets.map(String) : [];
    out.push({ prefix, targets: t });
  }
  return out;
}

function moduleRootForFile(fileAbs) {
  const rel = normalizeSlashes(path.relative(REPO_ROOT, fileAbs));
  if (!rel.startsWith('src/')) return null;
  const m = rel.match(/^src\/modules\/([^/]+)\//);
  if (m) return `src/modules/${m[1]}`;
  const m2 = rel.match(/^src\/([^/]+)\//);
  if (m2) return `src/${m2[1]}`;
  if (rel.startsWith('src/')) return 'src';
  return null;
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

function resolveImport(spec, fromFileAbs, tsPaths) {
  if (!spec || typeof spec !== 'string') return null;
  if (spec.startsWith('.') || spec.startsWith('/')) {
    const base = spec.startsWith('/') ? path.join(REPO_ROOT, spec) : path.resolve(path.dirname(fromFileAbs), spec);
    return resolveWithExtensions(base);
  }
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
  return null;
}

function extractImportSpecs(fileText) {
  /** @type {string[]} */
  const specs = [];
  const re1 = /\bfrom\s+['"]([^'"]+)['"]/g;
  for (;;) {
    const m = re1.exec(fileText);
    if (!m) break;
    specs.push(m[1]);
  }
  const re2 = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (;;) {
    const m = re2.exec(fileText);
    if (!m) break;
    specs.push(m[1]);
  }
  const re3 = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (;;) {
    const m = re3.exec(fileText);
    if (!m) break;
    specs.push(m[1]);
  }
  return specs;
}

function findCycles(nodes, edges) {
  /** @type {Map<string, string[]>} */
  const adj = new Map();
  for (const n of nodes) adj.set(n, []);
  for (const [a, bs] of edges.entries()) {
    if (!adj.has(a)) continue;
    adj.set(a, Array.from(bs));
  }

  /** @type {Set<string>} */
  const visited = new Set();
  /** @type {Set<string>} */
  const stack = new Set();
  /** @type {string[]} */
  const pathStack = [];
  /** @type {string[][]} */
  const cycles = [];

  function dfs(n) {
    visited.add(n);
    stack.add(n);
    pathStack.push(n);
    const outs = adj.get(n) || [];
    for (const m of outs) {
      if (!adj.has(m)) continue;
      if (!visited.has(m)) dfs(m);
      else if (stack.has(m)) {
        const idx = pathStack.indexOf(m);
        if (idx >= 0) cycles.push(pathStack.slice(idx).concat(m));
      }
    }
    stack.delete(n);
    pathStack.pop();
  }

  for (const n of nodes) {
    if (!visited.has(n)) dfs(n);
  }

  // de-dupe by string key
  const seen = new Set();
  return cycles
    .map((c) => {
      const key = c.join('->');
      return { key, cycle: c };
    })
    .filter((x) => {
      if (seen.has(x.key)) return false;
      seen.add(x.key);
      return true;
    })
    .map((x) => x.cycle);
}

function main() {
  const tsPaths = loadTsconfigPaths();
  const files = walkFiles(SRC_ROOT);

  /** @type {Map<string, Set<string>>} */
  const deps = new Map();
  /** @type {Map<string, Set<string>>} */
  const rdeps = new Map();
  /** @type {Map<string, {fromFile:string, toFile:string}>} */
  const edgeExample = new Map(); // key: "A->B"

  /** @type {Map<string, number>} */
  const fileLineCounts = new Map();

  function addEdge(a, b, fromFileRel, toFileRel) {
    if (!a || !b || a === b) return;
    if (!deps.has(a)) deps.set(a, new Set());
    deps.get(a).add(b);
    if (!rdeps.has(b)) rdeps.set(b, new Set());
    rdeps.get(b).add(a);
    const k = `${a}->${b}`;
    if (!edgeExample.has(k)) edgeExample.set(k, { fromFile: fromFileRel, toFile: toFileRel });
  }

  for (const f of files) {
    const relF = normalizeSlashes(path.relative(REPO_ROOT, f));
    const text = safeReadFile(f);
    fileLineCounts.set(relF, text ? text.split('\n').length : 0);
    const fromRoot = moduleRootForFile(f);
    if (!fromRoot) continue;
    const specs = extractImportSpecs(text);
    for (const spec of specs) {
      const resolved = resolveImport(spec, f, tsPaths);
      if (!resolved) continue;
      const toRoot = moduleRootForFile(resolved);
      if (!toRoot) continue;
      const relTo = normalizeSlashes(path.relative(REPO_ROOT, resolved));
      addEdge(fromRoot, toRoot, relF, relTo);
    }
  }

  const nodes = Array.from(new Set([...deps.keys(), ...rdeps.keys()])).sort();
  const cycles = findCycles(nodes, deps);

  const moduleStats = nodes
    .map((m) => {
      const out = deps.get(m) ? deps.get(m).size : 0;
      const inn = rdeps.get(m) ? rdeps.get(m).size : 0;
      return { module: m, fanOut: out, fanIn: inn, total: out + inn };
    })
    .sort((a, b) => b.total - a.total);

  const topModules = moduleStats.slice(0, 10);
  const topFiles = Array.from(fileLineCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([p, lines]) => ({ path: p, lines }));

  const lines = [];
  lines.push('# Risks and Hotspots');
  lines.push('');
  lines.push('This is a best-effort static review. All items include concrete file paths. If something is uncertain, it is labeled **unknown**.');
  lines.push('');

  lines.push('## Top coupling hotspots (module-level)');
  lines.push('Computed from a static import scan of `src/**/*.ts(x)` (relative + tsconfig alias resolution).');
  lines.push('');
  topModules.forEach((m, i) => {
    lines.push(`- **${i + 1}. \`${m.module}\`** — fan-in: ${m.fanIn}, fan-out: ${m.fanOut}`);
    // include 2 example edges
    const outgoing = Array.from(deps.get(m.module) ?? []).slice(0, 2);
    outgoing.forEach((to) => {
      const ex = edgeExample.get(`${m.module}->${to}`);
      if (ex) lines.push(`  - example edge: \`${ex.fromFile}\` → \`${ex.toFile}\``);
    });
    const incoming = Array.from(rdeps.get(m.module) ?? []).slice(0, 2);
    incoming.forEach((from) => {
      const ex = edgeExample.get(`${from}->${m.module}`);
      if (ex) lines.push(`  - example edge: \`${ex.fromFile}\` → \`${ex.toFile}\``);
    });
  });
  lines.push('');

  lines.push('## Circular dependencies');
  if (!cycles.length) {
    lines.push('- **none found** at the coarse module-root level (static scan)');
  } else {
    cycles.slice(0, 10).forEach((c, i) => {
      lines.push(`- **cycle ${i + 1}**: ${c.map((x) => `\`${x}\``).join(' → ')}`);
    });
  }
  lines.push('');

  lines.push('## God modules / high-impact files (largest by LOC)');
  topFiles.forEach((f, i) => {
    lines.push(`- **${i + 1}. \`${f.path}\`** — ~${f.lines} lines`);
  });
  lines.push('');

  lines.push('## Places where doc changes could break billing/optimizer/UI');
  lines.push('- **Battery PDF reads legacy tariff-engine payload shape** (`tariffEngine.cycles[*].determinants`).');
  lines.push('  - `src/utils/battery/report-pdf.ts`');
  lines.push('  - Upstream payload source is `vm.raw.envelope.result` (`any`) in `src/utils/battery/report-vm.ts`');
  lines.push('- **Generic report generator (`ReportData`) mixes many concerns** (hvac + lighting + battery + financials) and is used by both PDF and Word paths.');
  lines.push('  - `src/utils/report-generator.ts`');
  lines.push('  - `src/utils/report-generator-word.ts`');
  lines.push('- **Change order docs couple to `ChangeOrderRecord` shape**; changes to customer/address fields affect rendering.');
  lines.push('  - `src/utils/change-order-generator.ts`');
  lines.push('  - `src/types/change-order.ts`');
  lines.push('- **Carbon reports depend on EPA equivalency type shapes and factor selection.**');
  lines.push('  - `src/utils/carbon/carbon-report-pdf.ts`');
  lines.push('  - `src/utils/carbon/epa-equivalencies.ts`');
  lines.push('- **Regression export depends on `RegressionAnalysisResult` + model diagnostics fields.**');
  lines.push('  - `src/utils/regression-report-exporter.ts`');
  lines.push('  - `src/utils/regression-analysis.ts`');
  lines.push('- **M&V report generator has its own report data model; doc layout depends on these fields remaining stable.**');
  lines.push('  - `src/utils/mv-report-generator.ts`');
  lines.push('');

  lines.push('## Top 10 coupling risks (concrete items)');
  lines.push('- **1) Docs reading untyped `any` envelopes** can silently break when upstream shapes change.');
  lines.push('  - `src/utils/battery/report-vm.ts` (`BatteryAnalysisResultEnvelope.result: any`)');
  lines.push('- **2) Docs directly read engine-specific payload keys** rather than a stable adapter contract.');
  lines.push('  - `src/utils/battery/report-pdf.ts` (expects `tariffEngine.cycles`)');
  lines.push('- **3) UI ↔ docs coupling through browser-only globals** (Blob/URL/document) makes server-side rendering or node-based generation risky.');
  lines.push('  - `src/utils/report-generator.ts` (`URL.createObjectURL`, `document.createElement`)');
  lines.push('  - `src/utils/change-order-generator.ts` (`URL.createObjectURL`, `document.createElement`)');
  lines.push('- **4) Duplicate helper names across generators** (`downloadFile` vs `downloadBlob`) increases accidental misuse risk.');
  lines.push('  - `src/utils/report-generator.ts` (`downloadFile`)');
  lines.push('  - `src/utils/change-order-generator.ts` (`downloadBlob`)');
  lines.push('- **5) “ReportData” is a broad union container** that can grow into a god-type.');
  lines.push('  - `src/utils/report-generator.ts` (`ReportData`)');
  lines.push('- **6) Large central server file** can act as an integration hotspot; changes can ripple widely.');
  lines.push('  - `src/server.ts`');
  lines.push('- **7) Cross-cutting utilities are imported widely**; small changes can have big blast radius.');
  lines.push('  - `src/utils/*` (see module coupling section above)'); // root path cited
  lines.push('- **8) Module boundary between UI and domain is porous** (UI imports deep domain modules).');
  lines.push('  - Example domain module root: `src/modules/phase1_tariff/*`');
  lines.push('  - Example UI roots: `src/pages/*`, `src/components/*`');
  lines.push('- **9) Multiple PDF generators with different conventions** (save side-effect vs returning Blob) complicates a unified “docs pipeline”.');
  lines.push('  - Side-effect save: `src/utils/battery/report-pdf.ts`, `src/utils/regression-report-exporter.ts`');
  lines.push('  - Blob return: `src/utils/carbon/carbon-report-pdf.ts`, `src/utils/report-generator.ts`');
  lines.push('- **10) Deterministic engines are adjacent to non-deterministic systems** (AI/services); keeping a strict boundary is fragile without enforcement.');
  lines.push('  - Deterministic: `src/modules/phase1_tariff/billing/billingOracle.ts`, `src/modules/tariffEngine/*`');
  lines.push('  - AI/services: `src/services/ai-service.ts`, `src/services/ai-rag-service.ts`');
  lines.push('');

  fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
}

main();

