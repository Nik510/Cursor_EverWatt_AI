/**
 * Comprehensive Training Data Import Script
 * Systematically imports all training data from documents
 */

import { readdir, stat, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import mammoth from 'mammoth';

// Use environment variable or fallback to original source location
// Note: These are one-time extraction scripts. Extracted data is stored in data/ folder.
const BASE_PATH = process.env.TRAINING_DATA_BASE_PATH || 
  'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine';

interface ImportProgress {
  totalFiles: number;
  processed: number;
  errors: number;
  extracted: {
    measures: number;
    trainingContent: number;
    batteryData: number;
    hvacData: number;
  };
}

const progress: ImportProgress = {
  totalFiles: 0,
  processed: 0,
  errors: 0,
  extracted: {
    measures: 0,
    trainingContent: 0,
    batteryData: 0,
    hvacData: 0,
  },
};

async function extractTextFromDocx(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error(`  ❌ Error extracting text: ${error}`);
    return '';
  }
}

async function processDocxFile(filePath: string, relativePath: string): Promise<void> {
  progress.processed++;
  const fileName = path.basename(filePath);
  
  console.log(`\n[${progress.processed}/${progress.totalFiles}] 📄 ${fileName}`);

  const text = await extractTextFromDocx(filePath);
  
  if (!text || text.length < 50) {
    console.log(`  ⚠️  No meaningful content extracted`);
    return;
  }

  // Categorize by filename and path
  const lowerPath = relativePath.toLowerCase();
  const lowerName = fileName.toLowerCase();

  if (lowerName.includes('measure') || lowerPath.includes('general ee')) {
    console.log(`  ✅ Extracted ${text.length} characters (Measures)`);
    progress.extracted.measures++;
    // TODO: Parse and integrate measures
    
  } else if (lowerName.includes('battery') || lowerPath.includes('battery')) {
    console.log(`  ✅ Extracted ${text.length} characters (Battery Training)`);
    progress.extracted.batteryData++;
    // TODO: Parse and integrate battery training
    
  } else if (lowerName.includes('hvac') || lowerPath.includes('hvac')) {
    console.log(`  ✅ Extracted ${text.length} characters (HVAC Training)`);
    progress.extracted.hvacData++;
    // TODO: Parse and integrate HVAC training
    
  } else {
    console.log(`  ✅ Extracted ${text.length} characters (General Training)`);
    progress.extracted.trainingContent++;
    // TODO: Parse and integrate general training
  }
}

async function scanAndProcessDirectory(dirPath: string, basePath: string = BASE_PATH): Promise<void> {
  if (!existsSync(dirPath)) {
    return;
  }

  try {
    const entries = await readdir(dirPath);

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const relativePath = path.relative(basePath, fullPath);
      
      try {
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          // Skip node_modules and other non-data directories
          if (!entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist') {
            await scanAndProcessDirectory(fullPath, basePath);
          }
        } else if (stats.isFile() && entry.endsWith('.docx')) {
          progress.totalFiles++;
        }
      } catch (error) {
        // Skip files we can't access
        continue;
      }
    }
  } catch (error) {
    // Skip directories we can't access
    return;
  }
}

async function processAllDocxFiles(dirPath: string, basePath: string = BASE_PATH): Promise<void> {
  if (!existsSync(dirPath)) {
    return;
  }

  try {
    const entries = await readdir(dirPath);

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const relativePath = path.relative(basePath, fullPath);
      
      try {
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          if (!entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist') {
            await processAllDocxFiles(fullPath, basePath);
          }
        } else if (stats.isFile() && entry.endsWith('.docx')) {
          await processDocxFile(fullPath, relativePath);
        }
      } catch (error) {
        progress.errors++;
        continue;
      }
    }
  } catch (error) {
    return;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('🚀 COMPREHENSIVE TRAINING DATA IMPORT');
  console.log('='.repeat(80));
  console.log(`\n📂 Base Path: ${BASE_PATH}\n`);

  // Step 1: Count files
  console.log('📊 Step 1: Scanning for DOCX files...');
  const trainingDataPath = path.join(BASE_PATH, 'EVERWATT AI', 'TRAINING_DATA');
  const trainingAppPath = path.join(BASE_PATH, 'EVERWATT AI', 'TRAINING APP');
  const rootTrainingPath = path.join(BASE_PATH, 'TRAINING_DATA');
  
  await scanAndProcessDirectory(trainingDataPath);
  await scanAndProcessDirectory(trainingAppPath);
  await scanAndProcessDirectory(rootTrainingPath);
  
  console.log(`✅ Found ${progress.totalFiles} DOCX files to process\n`);

  // Step 2: Process all files
  console.log('📥 Step 2: Extracting content from DOCX files...\n');
  await processAllDocxFiles(trainingDataPath);
  await processAllDocxFiles(trainingAppPath);
  await processAllDocxFiles(rootTrainingPath);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Processed: ${progress.processed}/${progress.totalFiles} files`);
  console.log(`❌ Errors: ${progress.errors}`);
  console.log(`\n📦 Extracted Content:`);
  console.log(`   • Measures: ${progress.extracted.measures} files`);
  console.log(`   • Battery Training: ${progress.extracted.batteryData} files`);
  console.log(`   • HVAC Training: ${progress.extracted.hvacData} files`);
  console.log(`   • General Training: ${progress.extracted.trainingContent} files`);
  console.log('\n✅ Phase 1 Complete: Text extraction done.');
  console.log('⏭️  Next: Parse and structure extracted content.');
  console.log('='.repeat(80));
}

main().catch(console.error);

