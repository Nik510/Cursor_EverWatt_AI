import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(process.cwd());
const OUT_PATH = path.join(REPO_ROOT, 'review_pack', 'repo_tree.txt');

const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.git']);
const MAX_DEPTH = 4; // repo root = depth 0
const MAX_ENTRIES_PER_DIR = 25; // prevent giant trees (keeps review pack readable)

function isExcludedDirName(name) {
  return EXCLUDE_DIRS.has(name);
}

function safeReaddir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function writeTree() {
  /** @type {string[]} */
  const lines = [];
  const rootLabel = path.basename(REPO_ROOT) + path.sep;
  lines.push(rootLabel);
  lines.push('');
  lines.push(`Depth: ${MAX_DEPTH}`);
  lines.push(`Excluded directories: ${Array.from(EXCLUDE_DIRS).sort().join(', ')}`);
  lines.push('');

  function walk(dirAbs, depth, prefix) {
    if (depth > MAX_DEPTH) return;
    const allEntries = safeReaddir(dirAbs)
      .filter((e) => !e.name.startsWith('.cursor')) // avoid editor state noise if present
      .filter((e) => (e.isDirectory() ? !isExcludedDirName(e.name) : true))
      .sort((a, b) => {
        // directories first, then files; alphabetical within each
        const ad = a.isDirectory() ? 0 : 1;
        const bd = b.isDirectory() ? 0 : 1;
        if (ad !== bd) return ad - bd;
        return a.name.localeCompare(b.name);
      });

    const entries =
      allEntries.length > MAX_ENTRIES_PER_DIR ? allEntries.slice(0, MAX_ENTRIES_PER_DIR) : allEntries;

    const lastIdx = entries.length - 1;
    entries.forEach((ent, idx) => {
      const isLast = idx === lastIdx;
      const branch = isLast ? '└── ' : '├── ';
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');
      const rel = path.relative(REPO_ROOT, path.join(dirAbs, ent.name));
      const label = ent.isDirectory() ? `${ent.name}${path.sep}` : ent.name;
      lines.push(prefix + branch + label);
      if (ent.isDirectory() && depth < MAX_DEPTH) {
        walk(path.join(dirAbs, ent.name), depth + 1, nextPrefix);
      }
    });

    if (allEntries.length > MAX_ENTRIES_PER_DIR) {
      const remaining = allEntries.length - MAX_ENTRIES_PER_DIR;
      lines.push(prefix + `└── … (${remaining} more entries; truncated)`);
    }
  }

  walk(REPO_ROOT, 1, '');

  fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
}

writeTree();

