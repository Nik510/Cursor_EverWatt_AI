/**
 * Calculation Results Storage Utility
 * Handles saving and loading calculation results (HVAC, Lighting, Battery)
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const CALCULATION_STORAGE_DIR = path.join(process.cwd(), 'data', 'calculations');

export interface CalculationResult {
  id: string;
  type: 'hvac' | 'lighting' | 'battery';
  timestamp: string;
  data: any; // Calculation-specific data
  auditId?: string; // Link to audit if available
}

/**
 * Ensure calculation storage directory exists
 */
async function ensureStorageDir(): Promise<void> {
  if (!existsSync(CALCULATION_STORAGE_DIR)) {
    await mkdir(CALCULATION_STORAGE_DIR, { recursive: true });
  }
}

/**
 * Save calculation result
 */
export async function saveCalculation(
  type: 'hvac' | 'lighting' | 'battery',
  data: any,
  auditId?: string
): Promise<string> {
  await ensureStorageDir();
  
  const id = `calc_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  const calculation: CalculationResult = {
    id,
    type,
    timestamp,
    data,
    auditId,
  };
  
  const filePath = path.join(CALCULATION_STORAGE_DIR, `${id}.json`);
  await writeFile(filePath, JSON.stringify(calculation, null, 2));
  
  return id;
}

/**
 * Load calculation by ID
 */
export async function loadCalculation(id: string): Promise<CalculationResult> {
  await ensureStorageDir();
  
  const filePath = path.join(CALCULATION_STORAGE_DIR, `${id}.json`);
  
  if (!existsSync(filePath)) {
    throw new Error(`Calculation ${id} not found`);
  }
  
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * List all calculations, optionally filtered by type or audit ID
 */
export async function listCalculations(options?: {
  type?: 'hvac' | 'lighting' | 'battery';
  auditId?: string;
}): Promise<Array<{ id: string; type: string; timestamp: string; auditId?: string }>> {
  await ensureStorageDir();
  
  const { readdir } = await import('fs/promises');
  const files = await readdir(CALCULATION_STORAGE_DIR);
  
  const calculations = await Promise.all(
    files
      .filter(f => f.endsWith('.json'))
      .map(async (file) => {
        try {
          const content = await readFile(path.join(CALCULATION_STORAGE_DIR, file), 'utf-8');
          const calc: CalculationResult = JSON.parse(content);
          
          // Apply filters
          if (options?.type && calc.type !== options.type) {
            return null;
          }
          if (options?.auditId && calc.auditId !== options.auditId) {
            return null;
          }
          
          return {
            id: calc.id,
            type: calc.type,
            timestamp: calc.timestamp,
            auditId: calc.auditId,
          };
        } catch (error) {
          console.error(`Error reading calculation file ${file}:`, error);
          return null;
        }
      })
  );
  
  return calculations
    .filter((calc): calc is NonNullable<typeof calc> => calc !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Delete calculation
 */
export async function deleteCalculation(id: string): Promise<void> {
  await ensureStorageDir();
  
  const filePath = path.join(CALCULATION_STORAGE_DIR, `${id}.json`);
  
  if (!existsSync(filePath)) {
    throw new Error(`Calculation ${id} not found`);
  }
  
  const { unlink } = await import('fs/promises');
  await unlink(filePath);
}

