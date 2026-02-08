import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import OpenAI from 'openai';
import { ensureDatabaseSchema, getDbPool, isDatabaseEnabled } from '../db/client';

type RepoChunk = {
  id: string;
  relPath: string;
  fileHash: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
};

const EMBEDDING_MODEL = process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_DIM = Number(process.env.AI_EMBEDDING_DIM || 1536); // 3-small = 1536

const repoRoot = process.cwd();

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function isIgnoredDir(name: string): boolean {
  return (
    name === 'node_modules' ||
    name === 'dist' ||
    name === 'build' ||
    name === '.git' ||
    name === '.cursor' ||
    name === 'coverage' ||
    name === '.vite' ||
    name === '.next'
  );
}

function shouldIndexFile(relPath: string): boolean {
  // Keep scope "repo only" but avoid huge data exports.
  if (relPath.startsWith('data' + path.sep)) return false;
  if (relPath.startsWith('public' + path.sep)) return false;

  const ext = path.extname(relPath).toLowerCase();
  return (
    ext === '.ts' ||
    ext === '.tsx' ||
    ext === '.js' ||
    ext === '.jsx' ||
    ext === '.md' ||
    ext === '.py' ||
    ext === '.json'
  );
}

function readUtf8(absPath: string): string | null {
  try {
    const buf = fs.readFileSync(absPath);
    // Quick binary-ish detection: reject if many NUL bytes
    const nulCount = buf.slice(0, 2000).filter((b) => b === 0).length;
    if (nulCount > 0) return null;
    return buf.toString('utf8');
  } catch {
    return null;
  }
}

function walkFiles(absDir: string, out: string[]) {
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const ent of entries) {
    const abs = path.join(absDir, ent.name);
    if (ent.isDirectory()) {
      if (isIgnoredDir(ent.name)) continue;
      walkFiles(abs, out);
      continue;
    }
    if (!ent.isFile()) continue;
    const rel = path.relative(repoRoot, abs);
    if (shouldIndexFile(rel)) out.push(abs);
  }
}

function chunkText(text: string, maxChars = 1800, overlap = 200): string[] {
  const cleaned = text.replace(/\r\n/g, '\n');
  if (cleaned.length <= maxChars) return [cleaned];
  const chunks: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    const end = Math.min(cleaned.length, i + maxChars);
    const slice = cleaned.slice(i, end);
    chunks.push(slice);
    if (end === cleaned.length) break;
    i = Math.max(0, end - overlap);
  }
  return chunks;
}

function getOpenAiClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for ingestion');
  return new OpenAI({ apiKey });
}

function toVectorLiteral(embedding: number[]): string {
  // pgvector accepts: '[0.1,0.2,...]'
  return `[${embedding.join(',')}]`;
}

async function embedBatch(client: OpenAI, inputs: string[]): Promise<number[][]> {
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: inputs,
  });
  return res.data.map((d) => d.embedding as number[]);
}

async function upsertChunks(chunks: RepoChunk[]) {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const ch of chunks) {
      await client.query(
        `
        INSERT INTO ai_repo_chunks (id, path, file_hash, chunk_index, content, embedding, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6::vector, NOW())
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          embedding = EXCLUDED.embedding,
          updated_at = NOW()
        `,
        [ch.id, ch.relPath, ch.fileHash, ch.chunkIndex, ch.content, toVectorLiteral(ch.embedding)]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function deleteOldChunksForFile(relPath: string, fileHash: string) {
  const pool = getDbPool();
  await pool.query(`DELETE FROM ai_repo_chunks WHERE path = $1 AND file_hash <> $2`, [relPath, fileHash]);
}

async function main() {
  if (!isDatabaseEnabled()) {
    throw new Error('Database is disabled. Set USE_DATABASE=true and DATABASE_URL before ingesting embeddings.');
  }

  await ensureDatabaseSchema();

  const roots = ['src', 'docs', 'python'];
  const extraRootFiles = fs
    .readdirSync(repoRoot)
    .filter((f) => f.toLowerCase().endsWith('.md'))
    .map((f) => path.join(repoRoot, f));

  const absFiles: string[] = [];
  for (const r of roots) {
    const abs = path.join(repoRoot, r);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
      walkFiles(abs, absFiles);
    }
  }
  for (const abs of extraRootFiles) absFiles.push(abs);

  // De-dupe
  const uniqFiles = Array.from(new Set(absFiles));
  console.log(`📚 Indexing ${uniqFiles.length} files...`);

  const client = getOpenAiClient();

  let totalChunks = 0;
  let totalUpserts = 0;

  for (const absPath of uniqFiles) {
    const relPath = path.relative(repoRoot, absPath);
    const text = readUtf8(absPath);
    if (!text) continue;

    // Avoid pathological files
    if (text.length > 400_000) {
      console.warn(`Skipping very large file (${text.length} chars): ${relPath}`);
      continue;
    }

    const fileHash = sha256(text);
    const pieces = chunkText(text);

    // Embed in batches per-file (keeps failure scope small)
    const inputs = pieces.map((p, idx) => `FILE: ${relPath}\nCHUNK: ${idx}\n\n${p}`);
    const embeddings: number[][] = [];
    const batchSize = 64;
    for (let i = 0; i < inputs.length; i += batchSize) {
      const batch = inputs.slice(i, i + batchSize);
      const out = await embedBatch(client, batch);
      embeddings.push(...out);
    }

    // Sanity check: embedding dim matches table vector dim
    if (embeddings[0] && embeddings[0].length !== EMBEDDING_DIM) {
      throw new Error(
        `Embedding dimension mismatch: got ${embeddings[0].length}, expected ${EMBEDDING_DIM}. Set AI_EMBEDDING_DIM appropriately.`
      );
    }

    const chunks: RepoChunk[] = pieces.map((content, chunkIndex) => {
      const id = `${relPath}:${fileHash}:${chunkIndex}`;
      return {
        id,
        relPath,
        fileHash,
        chunkIndex,
        content,
        embedding: embeddings[chunkIndex] || [],
      };
    });

    await deleteOldChunksForFile(relPath, fileHash);
    await upsertChunks(chunks);

    totalChunks += chunks.length;
    totalUpserts += chunks.length;

    if (totalUpserts % 500 < chunks.length) {
      console.log(`✅ Upserted ${totalUpserts} chunks so far...`);
    }
  }

  console.log(`🎉 Done. Upserted ${totalUpserts} chunks from ${uniqFiles.length} files (total chunks: ${totalChunks}).`);
}

main().catch((err) => {
  console.error('Repo embedding ingestion failed:', err);
  process.exit(1);
});

