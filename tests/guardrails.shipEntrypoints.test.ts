import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const ENTRYPOINTS = ['src/main.ship.tsx', 'src/App.ship.tsx'] as const;

function findForbiddenImports(sourceText: string): string[] {
  const forbiddenSubstrings = ['serverOnly/'];
  const hits: string[] = [];

  for (const sub of forbiddenSubstrings) {
    if (sourceText.includes(sub)) hits.push(sub);
  }

  return hits;
}

describe('guardrails: ship entrypoints are browser-safe', () => {
  for (const rel of ENTRYPOINTS) {
    it(`${rel} does not import serverOnly paths`, async () => {
      const abs = path.join(ROOT, rel);
      const text = await readFile(abs, 'utf-8');
      expect(findForbiddenImports(text)).toEqual([]);
    });
  }
});

