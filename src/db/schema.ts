export const SCHEMA_SQL = `
-- Enable pgvector for semantic search (requires extension permissions)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audits_user_id_idx ON audits(user_id);
CREATE INDEX IF NOT EXISTS audits_updated_at_idx ON audits(updated_at);

CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analyses_user_id_idx ON analyses(user_id);
CREATE INDEX IF NOT EXISTS analyses_updated_at_idx ON analyses(updated_at);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_updated_at_idx ON projects(updated_at);

-- Project metadata fields (idempotent)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS drive_folder_link TEXT;

CREATE TABLE IF NOT EXISTS change_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  change_order_number INTEGER NOT NULL,
  drive_folder_link TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS change_orders_project_number_uidx
  ON change_orders(project_id, change_order_number);
CREATE INDEX IF NOT EXISTS change_orders_user_id_idx ON change_orders(user_id);
CREATE INDEX IF NOT EXISTS change_orders_project_id_idx ON change_orders(project_id);
CREATE INDEX IF NOT EXISTS change_orders_updated_at_idx ON change_orders(updated_at);

-- Table for storing all calculation results (training calculators, reports, etc.)
CREATE TABLE IF NOT EXISTS calculations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  calculation_type TEXT NOT NULL, -- 'energy-savings', 'hvac-optimization', 'roi', 'battery-analysis', etc.
  name TEXT, -- User-friendly name for the calculation
  data JSONB NOT NULL, -- All calculation inputs and results
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calculations_user_id_idx ON calculations(user_id);
CREATE INDEX IF NOT EXISTS calculations_type_idx ON calculations(calculation_type);
CREATE INDEX IF NOT EXISTS calculations_updated_at_idx ON calculations(updated_at);
CREATE INDEX IF NOT EXISTS calculations_user_type_idx ON calculations(user_id, calculation_type);

-- Repo-grounded AI (RAG) knowledge base
-- Stores chunks of repo code/docs with embeddings for retrieval.
CREATE TABLE IF NOT EXISTS ai_repo_chunks (
  id TEXT PRIMARY KEY, -- stable ID (e.g., path:fileHash:chunkIndex)
  path TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_repo_chunks_path_idx ON ai_repo_chunks(path);
CREATE INDEX IF NOT EXISTS ai_repo_chunks_file_hash_idx ON ai_repo_chunks(file_hash);
-- Optional ANN index (requires running ANALYZE and enough rows for ivfflat to be effective)
CREATE INDEX IF NOT EXISTS ai_repo_chunks_embedding_ivfflat_idx
  ON ai_repo_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Lightweight observability log for internal AI usage (avoid storing secrets/PII)
CREATE TABLE IF NOT EXISTS ai_chat_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  endpoint TEXT NOT NULL,
  request JSONB,
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_chat_logs_user_id_idx ON ai_chat_logs(user_id);
CREATE INDEX IF NOT EXISTS ai_chat_logs_created_at_idx ON ai_chat_logs(created_at);

-- ============================================================================
-- Completed Projects + EverWatt Memory + Recommendations (v1 foundation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS completed_projects (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS completed_projects_org_id_idx ON completed_projects(org_id);
CREATE INDEX IF NOT EXISTS completed_projects_imported_at_idx ON completed_projects(imported_at);

CREATE TABLE IF NOT EXISTS memory_index (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  version TEXT NOT NULL,
  data JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS memory_index_org_version_uidx ON memory_index(org_id, version);
CREATE INDEX IF NOT EXISTS memory_index_generated_at_idx ON memory_index(generated_at);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY, -- suggestionId
  org_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recommendations_org_project_idx ON recommendations(org_id, project_id);
CREATE INDEX IF NOT EXISTS recommendations_created_at_idx ON recommendations(created_at);
`;
