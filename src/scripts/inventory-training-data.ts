/**
 * Training Data Inventory Script
 * Scans the training data folder and creates an inventory of all data
 */

import { readdir, stat, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface DataInventory {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  extension?: string;
  name: string;
  children?: DataInventory[];
}

// Use environment variable or fallback to original source location
// Note: These are one-time extraction scripts. Extracted data is stored in data/ folder.
const TRAINING_DATA_PATH = process.env.TRAINING_DATA_BASE_PATH 
  ? path.join(process.env.TRAINING_DATA_BASE_PATH, 'EVERWATT AI', 'TRAINING_DATA')
  : 'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine\\EVERWATT AI\\TRAINING_DATA';

async function scanDirectory(dirPath: string, depth: number = 0): Promise<DataInventory[]> {
  if (!existsSync(dirPath)) {
    console.log(`⚠️  Directory does not exist: ${dirPath}`);
    return [];
  }

  const items: DataInventory[] = [];
  const entries = await readdir(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stats = await stat(fullPath);

    const item: DataInventory = {
      path: fullPath,
      type: stats.isDirectory() ? 'directory' : 'file',
      name: entry,
    };

    if (stats.isFile()) {
      item.size = stats.size;
      item.extension = path.extname(entry);
    }

    if (stats.isDirectory() && depth < 5) {
      // Recursively scan subdirectories (limit depth to avoid infinite loops)
      try {
        item.children = await scanDirectory(fullPath, depth + 1);
      } catch (error) {
        console.error(`Error scanning ${fullPath}:`, error);
      }
    }

    items.push(item);
  }

  return items;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function analyzeInventory(inventory: DataInventory[], stats: any = { files: 0, dirs: 0, totalSize: 0, byExtension: {} }) {
  for (const item of inventory) {
    if (item.type === 'file') {
      stats.files++;
      stats.totalSize += item.size || 0;
      const ext = item.extension || 'no-ext';
      stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;
    } else {
      stats.dirs++;
      if (item.children) {
        analyzeInventory(item.children, stats);
      }
    }
  }
  return stats;
}

function printInventory(inventory: DataInventory[], indent: string = '') {
  for (const item of inventory) {
    if (item.type === 'directory') {
      console.log(`${indent}📁 ${item.name}/`);
      if (item.children) {
        printInventory(item.children, indent + '  ');
      }
    } else {
      const sizeStr = item.size ? ` (${formatSize(item.size)})` : '';
      console.log(`${indent}📄 ${item.name}${sizeStr}`);
    }
  }
}

async function main() {
  console.log('🔍 Scanning Training Data Folder...\n');
  console.log(`Path: ${TRAINING_DATA_PATH}\n`);

  try {
    const inventory = await scanDirectory(TRAINING_DATA_PATH);
    const stats = analyzeInventory(inventory);

    console.log('='.repeat(80));
    console.log('📊 INVENTORY RESULTS');
    console.log('='.repeat(80));
    console.log(`\n📁 Directories: ${stats.dirs}`);
    console.log(`📄 Files: ${stats.files}`);
    console.log(`💾 Total Size: ${formatSize(stats.totalSize)}`);
    console.log('\n📈 Files by Extension:');
    
    const sortedExtensions = Object.entries(stats.byExtension)
      .sort(([, a], [, b]) => (b as number) - (a as number));
    
    for (const [ext, count] of sortedExtensions) {
      console.log(`   ${ext}: ${count} files`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('📂 DIRECTORY STRUCTURE');
    console.log('='.repeat(80) + '\n');
    printInventory(inventory);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Inventory Complete!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the script
main();

