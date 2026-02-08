/**
 * Full Training Data Inventory Script
 * Scans the entire EverWatt_Engine directory to inventory all data
 */

import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface DataItem {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  extension?: string;
  children?: DataItem[];
  depth: number;
}

// Use environment variable or fallback to original source location
// Note: These are one-time extraction scripts. Extracted data is stored in data/ folder.
const TARGET_DIR = process.env.TRAINING_DATA_BASE_PATH || 
  'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine';

async function scanDirectory(dirPath: string, depth: number = 0, maxDepth: number = 10): Promise<DataItem[]> {
  if (depth > maxDepth || !existsSync(dirPath)) {
    return [];
  }

  try {
    const items: DataItem[] = [];
    const entries = await readdir(dirPath);

    for (const entry of entries) {
      // Skip common ignore patterns
      if (entry.startsWith('.') || 
          entry === 'node_modules' || 
          entry === 'dist' || 
          entry === '.git') {
        continue;
      }

      const fullPath = path.join(dirPath, entry);
      
      try {
        const stats = await stat(fullPath);

        const item: DataItem = {
          path: fullPath,
          name: entry,
          type: stats.isDirectory() ? 'directory' : 'file',
          depth,
        };

        if (stats.isFile()) {
          item.size = stats.size;
          item.extension = path.extname(entry).toLowerCase();
        }

        if (stats.isDirectory() && depth < maxDepth) {
          item.children = await scanDirectory(fullPath, depth + 1, maxDepth);
        }

        items.push(item);
      } catch (error) {
        // Skip items we can't access
        continue;
      }
    }

    return items.sort((a, b) => {
      // Directories first, then files
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    return [];
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function analyzeData(items: DataItem[], stats: any = {
  files: 0,
  dirs: 0,
  totalSize: 0,
  byExtension: {},
  byDirectory: {},
  largeFiles: []
}) {
  for (const item of items) {
    const relativePath = item.path.replace(TARGET_DIR + '\\', '');

    if (item.type === 'file') {
      stats.files++;
      stats.totalSize += item.size || 0;
      
      const ext = item.extension || 'no-extension';
      stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;

      // Track large files (> 5MB)
      if ((item.size || 0) > 5 * 1024 * 1024) {
        stats.largeFiles.push({
          path: relativePath,
          size: item.size,
          sizeFormatted: formatSize(item.size || 0)
        });
      }
    } else {
      stats.dirs++;
      const dirName = path.dirname(relativePath);
      stats.byDirectory[dirName] = (stats.byDirectory[dirName] || 0) + 1;
    }

    if (item.children) {
      analyzeData(item.children, stats);
    }
  }
  return stats;
}

function printTree(items: DataItem[], indent: string = '', last: boolean = true) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isLast = i === items.length - 1;
    const prefix = last ? (isLast ? '└── ' : '├── ') : (isLast ? '└── ' : '├── ');
    
    if (item.type === 'directory') {
      console.log(`${indent}${prefix}📁 ${item.name}/`);
      if (item.children && item.children.length > 0) {
        const newIndent = indent + (isLast ? '    ' : '│   ');
        printTree(item.children, newIndent, isLast);
      }
    } else {
      const sizeStr = item.size ? ` (${formatSize(item.size)})` : '';
      console.log(`${indent}${prefix}📄 ${item.name}${sizeStr}`);
    }
  }
}

function categorizeContent(items: DataItem[]) {
  const categories: Record<string, DataItem[]> = {
    training: [],
    batteries: [],
    hvac: [],
    lighting: [],
    utilities: [],
    documentation: [],
    data: [],
    code: [],
    other: []
  };

  function categorizeItem(item: DataItem) {
    const name = item.name.toLowerCase();
    const path = item.path.toLowerCase();

    if (name.includes('training') || name.includes('train') || path.includes('training')) {
      categories.training.push(item);
    } else if (name.includes('battery') || name.includes('bess') || path.includes('battery')) {
      categories.batteries.push(item);
    } else if (name.includes('hvac') || name.includes('chiller') || name.includes('boiler') || path.includes('hvac')) {
      categories.hvac.push(item);
    } else if (name.includes('light') || name.includes('led') || path.includes('light')) {
      categories.lighting.push(item);
    } else if (name.includes('rate') || name.includes('utility') || name.includes('rebate') || path.includes('rate')) {
      categories.utilities.push(item);
    } else if (name.includes('doc') || name.includes('pdf') || name.includes('manual') || name.includes('guide')) {
      categories.documentation.push(item);
    } else if (name.includes('csv') || name.includes('xlsx') || name.includes('data') || name.includes('usage') || name.includes('interval')) {
      categories.data.push(item);
    } else if (name.includes('.ts') || name.includes('.tsx') || name.includes('.js') || name.includes('.json')) {
      categories.code.push(item);
    } else {
      categories.other.push(item);
    }

    if (item.children) {
      item.children.forEach(categorizeItem);
    }
  }

  items.forEach(categorizeItem);
  return categories;
}

async function main() {
  console.log('🔍 Scanning Entire EverWatt_Engine Directory...\n');
  console.log(`📂 Target: ${TARGET_DIR}\n`);

  if (!existsSync(TARGET_DIR)) {
    console.error(`❌ Directory does not exist: ${TARGET_DIR}`);
    process.exit(1);
  }

  try {
    console.log('⏳ Scanning... This may take a moment...\n');
    const inventory = await scanDirectory(TARGET_DIR);
    const stats = analyzeData(inventory);
    const categories = categorizeContent(inventory);

    console.log('='.repeat(100));
    console.log('📊 FULL INVENTORY RESULTS');
    console.log('='.repeat(100));
    
    console.log(`\n📁 Total Directories: ${stats.dirs}`);
    console.log(`📄 Total Files: ${stats.files}`);
    console.log(`💾 Total Size: ${formatSize(stats.totalSize)}\n`);

    console.log('📈 Files by Extension:');
    const sortedExtensions = Object.entries(stats.byExtension)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 20);
    
    for (const [ext, count] of sortedExtensions) {
      console.log(`   ${ext.padEnd(15)} ${count.toString().padStart(5)} files`);
    }

    console.log('\n📂 Content Categories:');
    for (const [category, items] of Object.entries(categories)) {
      if (items.length > 0) {
        console.log(`   ${category.padEnd(15)} ${items.length.toString().padStart(5)} items`);
      }
    }

    if (stats.largeFiles.length > 0) {
      console.log('\n⚠️  Large Files (> 5MB):');
      stats.largeFiles.slice(0, 10).forEach(file => {
        console.log(`   ${file.sizeFormatted.padEnd(10)} ${file.path}`);
      });
      if (stats.largeFiles.length > 10) {
        console.log(`   ... and ${stats.largeFiles.length - 10} more`);
      }
    }

    console.log('\n' + '='.repeat(100));
    console.log('📂 DIRECTORY STRUCTURE (Top Level)');
    console.log('='.repeat(100) + '\n');
    printTree(inventory.slice(0, 50)); // Show first 50 items
    
    if (inventory.length > 50) {
      console.log(`\n... and ${inventory.length - 50} more items (use full scan for complete tree)`);
    }

    console.log('\n' + '='.repeat(100));
    console.log('✅ Inventory Complete!');
    console.log('='.repeat(100));
    console.log('\n📋 Summary:');
    console.log(`   • ${stats.files} files across ${stats.dirs} directories`);
    console.log(`   • Total size: ${formatSize(stats.totalSize)}`);
    console.log(`   • Training content: ${categories.training.length} items`);
    console.log(`   • Battery data: ${categories.batteries.length} items`);
    console.log(`   • HVAC data: ${categories.hvac.length} items`);
    console.log(`   • Documentation: ${categories.documentation.length} items`);
    console.log(`   • Data files: ${categories.data.length} items`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('\nStack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();

