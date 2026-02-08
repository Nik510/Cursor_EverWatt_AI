import { Pool } from 'pg';
import { config } from '../config';
import { SCHEMA_SQL } from './schema';

let pool: Pool | null = null;

export function isDatabaseEnabled(): boolean {
  return config.features.useDatabase && !!config.databaseUrl;
}

export function getDbPool(): Pool {
  if (!pool) {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }
    pool = new Pool({ connectionString: config.databaseUrl });
  }
  return pool;
}

export async function dbQuery<T = unknown>(text: string, params: unknown[] = []): Promise<{ rows: T[] }> {
  const p = getDbPool();
  const res = await p.query(text, params);
  return { rows: res.rows as T[] };
}

export async function ensureDatabaseSchema(): Promise<void> {
  if (!isDatabaseEnabled()) return;
  // Execute multi-statement schema SQL.
  // pg doesn't allow multiple statements in a single query by default in some environments,
  // so we split on ';' and execute sequentially.
  const statements = SCHEMA_SQL.split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await dbQuery(stmt);
  }
}
