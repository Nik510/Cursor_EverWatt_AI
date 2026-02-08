import OpenAI from 'openai';
import crypto from 'node:crypto';
import { dbQuery, isDatabaseEnabled } from '../db/client';

export type ChatRole = 'system' | 'user' | 'assistant';
export type ChatMessage = { role: ChatRole; content: string };

export type RagChatRequest = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  topK?: number;
  /**
   * Optional caller-provided context (e.g., "what the user is looking at").
   * This stays "repo-only" because it is supplied by the authenticated user.
   */
  analysisContext?: string;
};

export type RagSource = {
  path: string;
  chunkIndex: number;
};

export type RagChatResponse = {
  text: string;
  model: string;
  sources: RagSource[];
};

const DEFAULT_CHAT_MODEL = process.env.AI_CHAT_MODEL || 'gpt-4o-mini';
const DEFAULT_EMBED_MODEL = process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small';
const DEFAULT_TOP_K = Number(process.env.AI_RAG_TOP_K || 8);

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  return new OpenAI({ apiKey });
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

function hashId(prefix: string): string {
  return crypto.createHash('sha256').update(prefix).digest('hex').slice(0, 32);
}

function redactSecrets(input: string): string {
  let s = input;
  // OpenAI-style keys
  s = s.replace(/sk-[A-Za-z0-9]{20,}/g, '[REDACTED_OPENAI_KEY]');
  // Bearer tokens / JWT-like blobs
  s = s.replace(/bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]');
  // PEM blocks
  s = s.replace(/-----BEGIN[\s\S]*?-----END[\s\S]*?-----/g, '[REDACTED_PEM_BLOCK]');
  return s;
}

async function embedQuery(client: OpenAI, text: string): Promise<number[]> {
  const res = await client.embeddings.create({
    model: DEFAULT_EMBED_MODEL,
    input: text,
  });
  return (res.data?.[0]?.embedding as number[]) || [];
}

type RepoRow = { path: string; chunk_index: number; content: string };

async function retrieveRepoContext(query: string, topK: number): Promise<RepoRow[]> {
  if (!isDatabaseEnabled()) return [];

  const client = getClient();
  const embedding = await embedQuery(client, query);
  if (!embedding.length) return [];

  const { rows } = await dbQuery<RepoRow>(
    `
    SELECT path, chunk_index, content
    FROM ai_repo_chunks
    ORDER BY embedding <=> $1::vector
    LIMIT $2
    `,
    [toVectorLiteral(embedding), topK]
  );
  return rows || [];
}

export async function chatWithRepoRag(req: RagChatRequest, opts: { userId?: string } = {}): Promise<RagChatResponse> {
  const model = req.model || DEFAULT_CHAT_MODEL;
  const temperature = typeof req.temperature === 'number' ? req.temperature : 0.2;
  const topK = Number.isFinite(req.topK) ? Number(req.topK) : DEFAULT_TOP_K;

  const messages = Array.isArray(req.messages) ? req.messages : [];
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser?.content?.trim()) throw new Error('messages must include a user prompt');

  const repoRows = await retrieveRepoContext(lastUser.content, Math.max(1, Math.min(30, topK)));
  const sources: RagSource[] = repoRows.map((r) => ({ path: r.path, chunkIndex: r.chunk_index }));

  const system = [
    `You are EverWatt's internal AI assistant for operations and analysis.`,
    `You must answer using the provided repo context when relevant.`,
    `If the repo context does not contain the answer, say what you can infer and what is missing.`,
    `When you use repo context, cite sources as (path#chunkIndex).`,
    `Never fabricate file names, functions, constants, or code behavior.`,
  ].join('\n');

  const contextBlock =
    repoRows.length > 0
      ? repoRows
          .map((r) => `SOURCE: ${r.path}#${r.chunk_index}\n${r.content}`)
          .join('\n\n---\n\n')
      : `No repo context was retrieved. If this is unexpected, run the repo embedding ingestion script.`;

  const assembled: ChatMessage[] = [
    { role: 'system', content: system },
    ...(req.analysisContext ? [{ role: 'system' as const, content: `USER_CONTEXT:\n${req.analysisContext}` }] : []),
    { role: 'system', content: `REPO_CONTEXT:\n\n${contextBlock}` },
    ...messages.filter((m) => m.role !== 'system'),
  ];

  const client = getClient();
  const result = await client.chat.completions.create({
    model,
    temperature,
    messages: assembled.map((m) => ({ role: m.role, content: m.content })),
  });

  const text = result.choices?.[0]?.message?.content || '';

  // Best-effort logging (no secrets; truncate to keep logs small)
  if (isDatabaseEnabled()) {
    try {
      const id = `ai_${hashId(`${Date.now()}:${Math.random()}`)}`;
      await dbQuery(
        `INSERT INTO ai_chat_logs (id, user_id, endpoint, request, response) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)`,
        [
          id,
          opts.userId || null,
          '/api/ai/chat',
          JSON.stringify({
            model,
            temperature,
            topK,
            // Minimize risk: store only a tail window and redact common secret patterns
            messages: messages.slice(-12).map((m) => ({
              role: m.role,
              content: redactSecrets(String(m.content || '')).slice(0, 2000),
            })),
          }),
          JSON.stringify({ model, sources: sources.slice(0, 20), text: redactSecrets(text).slice(0, 4000) }),
        ]
      );
    } catch {
      // avoid failing the request due to logging
    }
  }

  return { text, model, sources };
}

export async function getRepoChunk(params: { path: string; chunkIndex: number }): Promise<{ content: string } | null> {
  if (!isDatabaseEnabled()) return null;
  const { rows } = await dbQuery<{ content: string }>(
    `
    SELECT content
    FROM ai_repo_chunks
    WHERE path = $1 AND chunk_index = $2
    ORDER BY updated_at DESC
    LIMIT 1
    `,
    [params.path, params.chunkIndex]
  );
  return rows?.[0] || null;
}

export async function getRepoIndexStats(): Promise<{ chunks: number } | null> {
  if (!isDatabaseEnabled()) return null;
  const { rows } = await dbQuery<{ count: string }>(`SELECT COUNT(*)::text as count FROM ai_repo_chunks`);
  const count = Number(rows?.[0]?.count || 0);
  return { chunks: Number.isFinite(count) ? count : 0 };
}

