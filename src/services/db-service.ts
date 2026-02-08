import { randomUUID } from 'crypto';
import { dbQuery, isDatabaseEnabled } from '../db/client';
import type {
  ChangeOrderRecord,
  ProjectRecord,
} from '../types/change-order';

export type StoredRecord = {
  id: string;
  userId: string;
  data: unknown;
  createdAt: string;
  updatedAt: string;
};

export type AuditSummary = {
  id: string;
  name: string;
  timestamp: string;
  updatedAt: string;
};

type DbAuditRow = {
  id: string;
  user_id: string;
  data: unknown;
  created_at: string;
  updated_at: string;
};

type DbAnalysisRow = {
  id: string;
  data: unknown;
  created_at: string;
  updated_at: string;
};

type DbProjectRow = {
  id: string;
  user_id: string;
  data: unknown;
  drive_folder_link: string | null;
  created_at: string;
  updated_at: string;
};

type DbChangeOrderRow = {
  id: string;
  user_id: string;
  project_id: string;
  change_order_number: number;
  drive_folder_link: string;
  data: unknown;
  created_at: string;
  updated_at: string;
};

export async function createAudit(userId: string, data: unknown, id?: string): Promise<string> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const auditId = id || randomUUID();
  await dbQuery(
    `INSERT INTO audits (id, user_id, data, created_at, updated_at)
     VALUES ($1, $2, $3::jsonb, NOW(), NOW())`,
    [auditId, userId, JSON.stringify(data)]
  );
  return auditId;
}

export async function updateAudit(userId: string, id: string, patch: unknown): Promise<void> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const existing = await getAudit(userId, id);
  const existingData = (existing?.data && typeof existing.data === 'object' && existing.data !== null ? existing.data : {}) as Record<string, unknown>;
  const patchData = (patch && typeof patch === 'object' && patch !== null ? patch : {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...existingData, ...patchData, id };
  await dbQuery(
    `UPDATE audits SET data = $3::jsonb, updated_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [id, userId, JSON.stringify(merged)]
  );
}

export async function getAudit(userId: string, id: string): Promise<StoredRecord | null> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const { rows } = await dbQuery<DbAuditRow>(
    `SELECT id, user_id, data, created_at, updated_at FROM audits WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    data: row.data,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function listAudits(userId: string): Promise<AuditSummary[]> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const { rows } = await dbQuery<{ id: string; name: string; created_at: string; updated_at: string }>(
    `SELECT id,
            COALESCE(data->'building'->>'name', data->>'name', id) AS name,
            created_at,
            updated_at
     FROM audits
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 200`,
    [userId]
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    timestamp: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  }));
}

export async function deleteAudit(userId: string, id: string): Promise<void> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  await dbQuery(`DELETE FROM audits WHERE id = $1 AND user_id = $2`, [id, userId]);
}

export async function createAnalysis(userId: string, data: unknown, id?: string): Promise<string> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const analysisId = id || randomUUID();
  await dbQuery(
    `INSERT INTO analyses (id, user_id, data, created_at, updated_at)
     VALUES ($1, $2, $3::jsonb, NOW(), NOW())`,
    [analysisId, userId, JSON.stringify(data)]
  );
  return analysisId;
}

export async function updateAnalysis(userId: string, id: string, patch: unknown): Promise<Record<string, unknown>> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const existing = await getAnalysis(userId, id);
  if (!existing) throw new Error('Analysis not found');
  const existingData = (existing.data && typeof existing.data === 'object' && existing.data !== null ? existing.data : {}) as Record<string, unknown>;
  const patchData = (patch && typeof patch === 'object' && patch !== null ? patch : {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...existingData, ...patchData, id };

  await dbQuery(
    `UPDATE analyses SET data = $3::jsonb, updated_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [id, userId, JSON.stringify(merged)]
  );

  return merged;
}

export async function getAnalysis(
  userId: string,
  id: string
): Promise<{ data: unknown; createdAt: string; updatedAt: string } | null> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const { rows } = await dbQuery<Pick<DbAnalysisRow, 'data' | 'created_at' | 'updated_at'>>(
    `SELECT data, created_at, updated_at FROM analyses WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    data: row.data,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function listAnalyses(userId: string, status?: string): Promise<Array<Record<string, unknown>>> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');

  const params: unknown[] = [userId];
  let where = 'WHERE user_id = $1';
  if (status) {
    params.push(status);
    where += ` AND data->>'status' = $${params.length}`;
  }

  const { rows } = await dbQuery<DbAnalysisRow>(
    `SELECT id, data, created_at, updated_at
     FROM analyses
     ${where}
     ORDER BY updated_at DESC
     LIMIT 200`,
    params
  );

  return rows.map((r) => {
    const analysis = (r.data && typeof r.data === 'object' && r.data !== null ? r.data : {}) as Record<string, unknown>;
    const customerInfo = (analysis.customerInfo && typeof analysis.customerInfo === 'object' && analysis.customerInfo !== null
      ? analysis.customerInfo
      : {}) as Record<string, unknown>;
    const summary = (analysis.summary && typeof analysis.summary === 'object' && analysis.summary !== null ? analysis.summary : {}) as Record<
      string,
      unknown
    >;
    return {
      id: r.id,
      projectName: (customerInfo.projectName as string) || 'Untitled',
      companyName: (customerInfo.companyName as string) || '',
      facilityName: (customerInfo.facilityName as string) || '',
      createdAt: (analysis.createdAt as string) || new Date(r.created_at).toISOString(),
      updatedAt: (analysis.updatedAt as string) || new Date(r.updated_at).toISOString(),
      status: analysis.status,
      originalPeakKw: summary.originalPeakKw,
      bestPeakReductionKw: summary.bestPeakReductionKw,
      bestAnnualSavings: summary.bestAnnualSavings,
    };
  });
}

export async function createProject(userId: string, data: unknown, id?: string): Promise<string> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const projectId = id || randomUUID();
  const obj = (data && typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {}) as Record<string, unknown>;
  const driveFolderLink = typeof obj.driveFolderLink === 'string' ? obj.driveFolderLink : null;
  await dbQuery(
    `INSERT INTO projects (id, user_id, data, drive_folder_link, created_at, updated_at)
     VALUES ($1, $2, $3::jsonb, $4, NOW(), NOW())`,
    [projectId, userId, JSON.stringify(data), driveFolderLink]
  );
  return projectId;
}

export async function getProject(userId: string, id: string): Promise<ProjectRecord | null> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const { rows } = await dbQuery<DbProjectRow>(
    `SELECT id, user_id, data, drive_folder_link, created_at, updated_at
     FROM projects
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  const row = rows[0];
  if (!row) return null;
  const data = (row.data && typeof row.data === 'object' && row.data !== null ? (row.data as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;

  // IMPORTANT: preserve the full JSONB payload so Project Builder (Vault + Graph) fields survive DB round-trips.
  const base: Record<string, unknown> = { ...(data || {}) };
  base.id = row.id;
  base.driveFolderLink = (row.drive_folder_link || (data.driveFolderLink as string) || '') as string;
  base.customer = (data.customer || {}) as any;
  base.createdAt = new Date(row.created_at).toISOString();
  base.updatedAt = new Date(row.updated_at).toISOString();
  return base as unknown as ProjectRecord;
}

export async function listProjects(userId: string): Promise<ProjectRecord[]> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const { rows } = await dbQuery<DbProjectRow>(
    `SELECT id, user_id, data, drive_folder_link, created_at, updated_at
     FROM projects
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 200`,
    [userId]
  );

  return rows.map((row) => {
    const data = (row.data && typeof row.data === 'object' && row.data !== null ? (row.data as Record<string, unknown>) : {}) as Record<
      string,
      unknown
    >;
    const base: Record<string, unknown> = { ...(data || {}) };
    base.id = row.id;
    base.driveFolderLink = (row.drive_folder_link || (data.driveFolderLink as string) || '') as string;
    base.customer = (data.customer || {}) as any;
    base.createdAt = new Date(row.created_at).toISOString();
    base.updatedAt = new Date(row.updated_at).toISOString();
    return base as unknown as ProjectRecord;
  });
}

export async function updateProject(userId: string, id: string, patch: Partial<ProjectRecord>): Promise<ProjectRecord> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const existing = await getProject(userId, id);
  if (!existing) throw new Error('Project not found');

  const merged: ProjectRecord = {
    ...existing,
    ...patch,
    id,
    customer: { ...(existing.customer || ({} as any)), ...(patch.customer || ({} as any)) },
  };

  await dbQuery(
    `UPDATE projects
     SET data = $3::jsonb,
         drive_folder_link = $4,
         updated_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [id, userId, JSON.stringify({ ...merged }), merged.driveFolderLink]
  );
  return merged;
}

export async function createChangeOrder(
  userId: string,
  args: {
    projectId: string;
    driveFolderLink: string;
    data: ChangeOrderRecord;
    id?: string;
  }
): Promise<ChangeOrderRecord> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const id = args.id || randomUUID();

  // Atomic numbering: assign next CO# per project inside the INSERT
  const { rows } = await dbQuery<Pick<DbChangeOrderRow, 'change_order_number' | 'created_at' | 'updated_at'>>(
    `WITH next_num AS (
      SELECT COALESCE(MAX(change_order_number), 0) + 1 AS n
      FROM change_orders
      WHERE project_id = $1 AND user_id = $2
    )
    INSERT INTO change_orders (id, user_id, project_id, change_order_number, drive_folder_link, data, created_at, updated_at)
    SELECT $3, $2, $1, next_num.n, $4, $5::jsonb, NOW(), NOW()
    FROM next_num
    RETURNING change_order_number, created_at, updated_at`,
    [args.projectId, userId, id, args.driveFolderLink, JSON.stringify(args.data)]
  );
  const row = rows[0];
  if (!row) throw new Error('Failed to create change order');

  return {
    ...args.data,
    id,
    projectId: args.projectId,
    driveFolderLink: args.driveFolderLink,
    changeOrderNumber: row.change_order_number,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function getNextChangeOrderNumber(userId: string, projectId: string): Promise<number> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const { rows } = await dbQuery<{ n: number }>(
    `SELECT COALESCE(MAX(change_order_number), 0) + 1 AS n
     FROM change_orders
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  return rows[0]?.n ?? 1;
}

export async function getChangeOrder(userId: string, id: string): Promise<ChangeOrderRecord | null> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const { rows } = await dbQuery<DbChangeOrderRow>(
    `SELECT id, user_id, project_id, change_order_number, drive_folder_link, data, created_at, updated_at
     FROM change_orders
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  const row = rows[0];
  if (!row) return null;
  const data = (row.data && typeof row.data === 'object' && row.data !== null ? (row.data as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  return {
    ...(data as any),
    id: row.id,
    projectId: row.project_id,
    changeOrderNumber: row.change_order_number,
    driveFolderLink: row.drive_folder_link,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function listChangeOrders(userId: string, projectId: string): Promise<ChangeOrderRecord[]> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const { rows } = await dbQuery<DbChangeOrderRow>(
    `SELECT id, user_id, project_id, change_order_number, drive_folder_link, data, created_at, updated_at
     FROM change_orders
     WHERE user_id = $1 AND project_id = $2
     ORDER BY change_order_number DESC
     LIMIT 500`,
    [userId, projectId]
  );

  return rows.map((row) => {
    const data = (row.data && typeof row.data === 'object' && row.data !== null ? (row.data as Record<string, unknown>) : {}) as Record<
      string,
      unknown
    >;
    return {
      ...(data as any),
      id: row.id,
      projectId: row.project_id,
      changeOrderNumber: row.change_order_number,
      driveFolderLink: row.drive_folder_link,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  });
}

export async function updateChangeOrder(
  userId: string,
  id: string,
  patch: Partial<ChangeOrderRecord>
): Promise<ChangeOrderRecord> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const existing = await getChangeOrder(userId, id);
  if (!existing) throw new Error('Change order not found');

  const merged: ChangeOrderRecord = {
    ...existing,
    ...patch,
    id,
    customer: { ...(existing.customer || ({} as any)), ...(patch.customer || ({} as any)) },
  };

  await dbQuery(
    `UPDATE change_orders
     SET data = $3::jsonb,
         drive_folder_link = $4,
         updated_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [id, userId, JSON.stringify({ ...merged }), merged.driveFolderLink]
  );

  return merged;
}

// ============================================================================
// Calculation Results Storage
// ============================================================================

export type CalculationType = 
  | 'energy-savings'
  | 'hvac-optimization'
  | 'hvac-optimizer-run'
  | 'roi'
  | 'battery-analysis'
  | 'multi-tier-analysis'
  | 's-rate-analysis'
  | 'other';

export type CalculationRecord = {
  id: string;
  userId: string;
  calculationType: CalculationType;
  name: string | null;
  data: unknown;
  createdAt: string;
  updatedAt: string;
};

type DbCalculationRow = {
  id: string;
  user_id: string;
  calculation_type: string;
  name: string | null;
  data: unknown;
  created_at: string;
  updated_at: string;
};

export async function createCalculation(
  userId: string,
  calculationType: CalculationType,
  data: unknown,
  name?: string,
  id?: string
): Promise<string> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const calculationId = id || randomUUID();
  await dbQuery(
    `INSERT INTO calculations (id, user_id, calculation_type, name, data, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), NOW())`,
    [calculationId, userId, calculationType, name || null, JSON.stringify(data)]
  );
  return calculationId;
}

export async function updateCalculation(
  userId: string,
  id: string,
  patch: Partial<{ data: unknown; name: string }>
): Promise<CalculationRecord> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const existing = await getCalculation(userId, id);
  if (!existing) throw new Error('Calculation not found');

  const updates: string[] = [];
  const params: unknown[] = [id, userId];
  let paramIndex = 3;

  if (patch.data !== undefined) {
    updates.push(`data = $${paramIndex}::jsonb`);
    params.push(JSON.stringify(patch.data));
    paramIndex++;
  }

  if (patch.name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    params.push(patch.name);
    paramIndex++;
  }

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    await dbQuery(
      `UPDATE calculations SET ${updates.join(', ')} WHERE id = $1 AND user_id = $2`,
      params
    );
  }

  const updated = await getCalculation(userId, id);
  if (!updated) throw new Error('Failed to retrieve updated calculation');
  return updated;
}

export async function getCalculation(userId: string, id: string): Promise<CalculationRecord | null> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const { rows } = await dbQuery<DbCalculationRow>(
    `SELECT id, user_id, calculation_type, name, data, created_at, updated_at
     FROM calculations
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    calculationType: row.calculation_type as CalculationType,
    name: row.name,
    data: row.data,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function listCalculations(
  userId: string,
  calculationType?: CalculationType
): Promise<CalculationRecord[]> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  const params: unknown[] = [userId];
  let where = 'WHERE user_id = $1';
  if (calculationType) {
    params.push(calculationType);
    where += ` AND calculation_type = $${params.length}`;
  }

  const { rows } = await dbQuery<DbCalculationRow>(
    `SELECT id, user_id, calculation_type, name, data, created_at, updated_at
     FROM calculations
     ${where}
     ORDER BY updated_at DESC
     LIMIT 500`,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    calculationType: row.calculation_type as CalculationType,
    name: row.name,
    data: row.data,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

export async function deleteCalculation(userId: string, id: string): Promise<void> {
  if (!isDatabaseEnabled()) throw new Error('Database is not enabled');
  await dbQuery(`DELETE FROM calculations WHERE id = $1 AND user_id = $2`, [id, userId]);
}
