import type { VaultChunk } from './project-vault-extract';

function tokenize(q: string): string[] {
  return String(q || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 64);
}

export function retrieveChunksKeyword(args: {
  query: string;
  chunks: Array<VaultChunk & { fileId: string; storageKey?: string }>;
  topK?: number;
}): Array<VaultChunk & { fileId: string; storageKey?: string; score: number }> {
  const topK = Math.max(1, Math.min(30, Number(args.topK || 10)));
  const tokens = new Set(tokenize(args.query));
  if (tokens.size === 0) return [];

  const scored = args.chunks
    .map((c) => {
      const hay = `${c.text}`.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (hay.includes(t)) score += 1;
      }
      // Small boost for shorter chunks with matches (often more precise)
      if (score > 0) score += Math.max(0, 0.5 - Math.min(0.5, c.text.length / 6000));
      return { ...c, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

