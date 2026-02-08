/**
 * Audit Data Storage Utility
 * Handles saving and loading audit data to/from file system
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const AUDIT_STORAGE_DIR = path.join(process.cwd(), 'data', 'audits');

export interface AuditData {
  id: string;
  building: {
    name: string;
    address: string;
    squareFootage: number;
    buildingType: string;
    yearBuilt: number;
    occupancy: number;
    operatingHours: number;
  };
  hvac: Array<{
    type: string;
    manufacturer: string;
    model: string;
    capacity: number;
    efficiency: number;
    yearInstalled: number;
    location: string;
    notes: string;
  }>;
  lighting: Array<{
    fixtureType: string;
    bulbType: string;
    fixtureCount: number;
    wattage: number;
    controls: string;
    location: string;
    notes: string;
  }>;
  timestamp: string;
  updatedAt: string;
}

/**
 * Ensure audit storage directory exists
 */
async function ensureStorageDir(): Promise<void> {
  if (!existsSync(AUDIT_STORAGE_DIR)) {
    await mkdir(AUDIT_STORAGE_DIR, { recursive: true });
  }
}

/**
 * Save audit data to file
 */
export async function saveAudit(auditData: Omit<AuditData, 'id' | 'timestamp' | 'updatedAt'>): Promise<string> {
  await ensureStorageDir();
  
  const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  const fullAudit: AuditData = {
    id,
    ...auditData,
    timestamp,
    updatedAt: timestamp,
  };
  
  const filePath = path.join(AUDIT_STORAGE_DIR, `${id}.json`);
  await writeFile(filePath, JSON.stringify(fullAudit, null, 2));
  
  return id;
}

/**
 * Update existing audit
 */
export async function updateAudit(id: string, auditData: Partial<AuditData>): Promise<void> {
  await ensureStorageDir();
  
  const filePath = path.join(AUDIT_STORAGE_DIR, `${id}.json`);
  
  if (!existsSync(filePath)) {
    throw new Error(`Audit ${id} not found`);
  }
  
  const existing = await loadAudit(id);
  const updated: AuditData = {
    ...existing,
    ...auditData,
    id: existing.id, // Don't allow ID change
    updatedAt: new Date().toISOString(),
  };
  
  await writeFile(filePath, JSON.stringify(updated, null, 2));
}

/**
 * Load audit by ID
 */
export async function loadAudit(id: string): Promise<AuditData> {
  await ensureStorageDir();
  
  const filePath = path.join(AUDIT_STORAGE_DIR, `${id}.json`);
  
  if (!existsSync(filePath)) {
    throw new Error(`Audit ${id} not found`);
  }
  
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * List all audits
 */
export async function listAudits(): Promise<Array<{ id: string; name: string; timestamp: string; updatedAt: string }>> {
  await ensureStorageDir();
  
  const { readdir } = await import('fs/promises');
  const files = await readdir(AUDIT_STORAGE_DIR);
  
  const audits = await Promise.all(
    files
      .filter(f => f.endsWith('.json'))
      .map(async (file) => {
        try {
          const content = await readFile(path.join(AUDIT_STORAGE_DIR, file), 'utf-8');
          const audit: AuditData = JSON.parse(content);
          return {
            id: audit.id,
            name: audit.building.name || 'Unnamed Audit',
            timestamp: audit.timestamp,
            updatedAt: audit.updatedAt,
          };
        } catch (error) {
          console.error(`Error reading audit file ${file}:`, error);
          return null;
        }
      })
  );
  
  return audits
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * Delete audit
 */
export async function deleteAudit(id: string): Promise<void> {
  await ensureStorageDir();
  
  const filePath = path.join(AUDIT_STORAGE_DIR, `${id}.json`);
  
  if (!existsSync(filePath)) {
    throw new Error(`Audit ${id} not found`);
  }
  
  const { unlink } = await import('fs/promises');
  await unlink(filePath);
}

