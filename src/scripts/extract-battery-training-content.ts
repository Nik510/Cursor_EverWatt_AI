/**
 * Extract Battery Training Content
 * Extracts and structures content from battery training PDFs and DOCX files
 */

import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { readFile } from 'fs/promises';

// Use environment variable or fallback to original source location
// Note: These are one-time extraction scripts. Extracted data is stored in data/ folder.
const BASE_PATH = process.env.TRAINING_DATA_BASE_PATH || 
  'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine';
const BATTERY_TRAINING_PATHS = [
  path.join(BASE_PATH, 'EVERWATT AI', 'TRAINING_DATA', 'BATTERY_TRAINING_DATA'),
  path.join(BASE_PATH, 'TRAINING_DATA', 'BATTERY_TRAINING_DATA'),
];

interface BatteryTrainingContent {
  fileName: string;
  filePath: string;
  type: 'pdf' | 'docx';
  title: string;
  content: string;
  size: number;
  pages?: number;
  category: string;
}

async function extractFromDocx(filePath: string): Promise<{ title?: string; text: string }> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const title = lines[0]?.trim() || undefined;
    return { title, text };
  } catch (error) {
    throw new Error(`DOCX extraction failed: ${error}`);
  }
}

async function extractFromPdf(filePath: string): Promise<{ title?: string; text: string; pages?: number }> {
  try {
    // Try dynamic import first
    try {
      const pdfModule = await import('pdf-parse');
      const pdfParse = (pdfModule as any).default || pdfModule;
      
      const dataBuffer = await readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      
      const lines = pdfData.text.split('\n').filter(l => l.trim().length > 0);
      const title = pdfData.info?.Title || lines[0]?.trim() || undefined;
      
      return {
        title,
        text: pdfData.text,
        pages: pdfData.numpages,
      };
    } catch (importError) {
      // Fallback to require
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const pdfParse = require('pdf-parse');
      
      const dataBuffer = await readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      
      const lines = pdfData.text.split('\n').filter(l => l.trim().length > 0);
      const title = pdfData.info?.Title || lines[0]?.trim() || undefined;
      
      return {
        title,
        text: pdfData.text,
        pages: pdfData.numpages,
      };
    }
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error}`);
  }
}

async function scanBatteryTrainingFiles(): Promise<string[]> {
  const files: string[] = [];

  for (const trainingPath of BATTERY_TRAINING_PATHS) {
    if (!existsSync(trainingPath)) continue;

    try {
      const entries = await readdir(trainingPath);
      for (const entry of entries) {
        const fullPath = path.join(trainingPath, entry);
        const stats = await stat(fullPath);
        if (stats.isFile() && (entry.endsWith('.pdf') || entry.endsWith('.docx'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      continue;
    }
  }

  return files;
}

async function main() {
  console.log('='.repeat(80));
  console.log('🔋 EXTRACTING BATTERY TRAINING CONTENT');
  console.log('='.repeat(80));

  const files = await scanBatteryTrainingFiles();
  console.log(`\n✅ Found ${files.length} battery training files\n`);

  const extracted: BatteryTrainingContent[] = [];

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(BASE_PATH, filePath);
    const stats = await stat(filePath);
    const isPdf = fileName.endsWith('.pdf');
    const isDocx = fileName.endsWith('.docx');

    console.log(`📄 Processing: ${fileName}`);

    try {
      let title: string | undefined;
      let text: string;
      let pages: number | undefined;

      if (isDocx) {
        const result = await extractFromDocx(filePath);
        title = result.title;
        text = result.text;
        console.log(`  ✅ Extracted ${text.length} characters from DOCX`);
      } else if (isPdf) {
        try {
          const result = await extractFromPdf(filePath);
          title = result.title;
          text = result.text;
          pages = result.pages;
          console.log(`  ✅ Extracted ${text.length} characters from PDF (${pages} pages)`);
        } catch (error) {
          console.log(`  ⚠️  PDF extraction skipped: ${error}`);
          continue;
        }
      } else {
        continue;
      }

      // Categorize content
      const lowerName = fileName.toLowerCase();
      let category = 'general';
      if (lowerName.includes('modeling') || lowerName.includes('sizing')) category = 'modeling';
      else if (lowerName.includes('constraint') || lowerName.includes('technical')) category = 'technical';
      else if (lowerName.includes('financial')) category = 'financial';
      else if (lowerName.includes('peak') || lowerName.includes('shaving')) category = 'peak-shaving';
      else if (lowerName.includes('ml') || lowerName.includes('ai')) category = 'ai-ml';

      extracted.push({
        fileName,
        filePath: relativePath,
        type: isPdf ? 'pdf' : 'docx',
        title: title || fileName.replace(/\.(pdf|docx)$/i, ''),
        content: text,
        size: stats.size,
        pages,
        category,
      });

    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
    }
  }

  // Save extracted content
  const outputDir = path.join(process.cwd(), 'data', 'extracted-battery-training');
  if (!existsSync(outputDir)) {
    await import('fs/promises').then(fs => fs.mkdir(outputDir, { recursive: true }));
  }

  const outputFile = path.join(outputDir, 'battery-training-content.json');
  await import('fs/promises').then(fs =>
    fs.writeFile(outputFile, JSON.stringify(extracted, null, 2))
  );

  console.log('\n' + '='.repeat(80));
  console.log('📊 EXTRACTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Extracted ${extracted.length} battery training documents`);
  
  const byCategory = new Map<string, BatteryTrainingContent[]>();
  for (const item of extracted) {
    if (!byCategory.has(item.category)) {
      byCategory.set(item.category, []);
    }
    byCategory.get(item.category)!.push(item);
  }

  console.log('\n📁 By Category:');
  for (const [category, items] of Array.from(byCategory.entries()).sort()) {
    const totalSize = items.reduce((sum, i) => sum + i.size, 0);
    console.log(`   ${category.padEnd(15)} ${items.length} files, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  }

  console.log(`\n💾 Saved to: ${outputFile}`);
  console.log('='.repeat(80));
}

main().catch(console.error);

