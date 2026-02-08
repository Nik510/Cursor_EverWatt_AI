/**
 * Extract PDFs V2 - Using pdf.js
 * Processes all PDF files that failed with pdf-parse
 */

import { readdir, stat, readFile, mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { parsePdfV2 } from '../utils/pdf-parser-v2';
import { parsePdfFallback } from '../utils/pdf-parser-fallback';

// Use environment variable or fallback to original source location
// Note: These are one-time extraction scripts. Extracted data is stored in data/ folder.
const BASE_PATH = process.env.TRAINING_DATA_BASE_PATH || 
  'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine';
const TARGET_PDFS = [
  'EVERWATT AI/TRAINING_DATA/BATTERY_TRAINING_DATA/(GPT) PDF #1 — Battery Modeling & Sizing Manual.pdf',
  'EVERWATT AI/TRAINING_DATA/BATTERY_TRAINING_DATA/(GPT) PDF #2 — Battery Technical Constraints Manual.pdf',
  'EVERWATT AI/TRAINING_DATA/BATTERY_TRAINING_DATA/Advanced ML Math for Peak Shaving.pdf',
  'EVERWATT AI/TRAINING_DATA/BATTERY_TRAINING_DATA/AI for Battery Peak Demand Shaving.pdf',
  'EVERWATT AI/TRAINING_DATA/BATTERY_TRAINING_DATA/Extracting Battery and EE Logic from SAM.pdf',
  'EVERWATT AI/TRAINING_DATA/BATTERY_TRAINING_DATA/PDF #3 — BATTERY FINANCIAL MODELING MANUAL.pdf',
  'TRAINING_DATA/BATTERY_TRAINING_DATA/(GPT) PDF #1 — Battery Modeling & Sizing Manual.pdf',
  'TRAINING_DATA/BATTERY_TRAINING_DATA/(GPT) PDF #2 — Battery Technical Constraints Manual.pdf',
  'TRAINING_DATA/BATTERY_TRAINING_DATA/Advanced ML Math for Peak Shaving.pdf',
  'TRAINING_DATA/BATTERY_TRAINING_DATA/AI for Battery Peak Demand Shaving.pdf',
  'TRAINING_DATA/BATTERY_TRAINING_DATA/Extracting Battery and EE Logic from SAM.pdf',
  'TRAINING_DATA/BATTERY_TRAINING_DATA/PDF #3 — BATTERY FINANCIAL MODELING MANUAL.pdf',
  'EVERWATT AI/TRAINING_DATA/GEMINI TRAINING SUMMARY/AI Training Material Accuracy Verification.pdf',
];

interface PdfContent {
  fileName: string;
  filePath: string;
  title?: string;
  text: string;
  size: number;
  pages: number;
  category: string;
}

async function scanForPdfs(dirPath: string, basePath: string, found: string[] = []): Promise<string[]> {
  if (!existsSync(dirPath)) return found;

  try {
    const entries = await readdir(dirPath);
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules') continue;

      const fullPath = path.join(dirPath, entry);
      try {
        const stats = await stat(fullPath);
        if (stats.isDirectory()) {
          await scanForPdfs(fullPath, basePath, found);
        } else if (stats.isFile() && entry.endsWith('.pdf')) {
          found.push(fullPath);
        }
      } catch {
        continue;
      }
    }
  } catch {
    // Skip inaccessible directories
  }

  return found;
}

function categorizePdf(fileName: string, filePath: string): string {
  const lowerName = fileName.toLowerCase();
  const lowerPath = filePath.toLowerCase();

  if (lowerName.includes('battery') || lowerPath.includes('battery')) return 'battery';
  if (lowerName.includes('hvac') || lowerPath.includes('hvac')) return 'hvac';
  if (lowerName.includes('lighting')) return 'lighting';
  if (lowerName.includes('financial') || lowerName.includes('modeling')) return 'financial';
  if (lowerName.includes('technical') || lowerName.includes('constraint')) return 'technical';
  if (lowerName.includes('ml') || lowerName.includes('ai') || lowerName.includes('advanced')) return 'ai-ml';
  if (lowerName.includes('gemini') || lowerName.includes('training')) return 'training';
  if (lowerName.includes('extracting') || lowerName.includes('sam')) return 'methodology';
  return 'general';
}

async function main() {
  console.log('='.repeat(80));
  console.log('📄 EXTRACTING PDFs V2 (Using pdf.js)');
  console.log('='.repeat(80));

  // Scan for all PDFs
  const trainingDataPath = path.join(BASE_PATH, 'EVERWATT AI', 'TRAINING_DATA');
  const rootTrainingPath = path.join(BASE_PATH, 'TRAINING_DATA');
  
  const allPdfFiles: string[] = [];
  await scanForPdfs(trainingDataPath, BASE_PATH, allPdfFiles);
  await scanForPdfs(rootTrainingPath, BASE_PATH, allPdfFiles);

  // Remove duplicates
  const uniquePdfs = Array.from(new Set(allPdfFiles));

  console.log(`\n✅ Found ${uniquePdfs.length} PDF files\n`);

  const extracted: PdfContent[] = [];

  for (const filePath of uniquePdfs) {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(BASE_PATH, filePath);
    const stats = await stat(filePath);

    console.log(`📄 Processing: ${fileName}`);

    try {
      let result;
      try {
        // Try pdf.js first
        result = await parsePdfV2(filePath);
      } catch (pdfJsError) {
        console.log(`    ⚠️  pdf.js failed, trying fallback...`);
        // Try fallback method
        result = await parsePdfFallback(filePath);
      }
      
      const { title, text, metadata } = result;
      const category = categorizePdf(fileName, relativePath);

      console.log(`  ✅ Extracted ${text.length} characters (${metadata.pages} pages) [${category}]`);

      extracted.push({
        fileName,
        filePath: relativePath,
        title: title || fileName.replace(/\.pdf$/i, ''),
        text,
        size: stats.size,
        pages: metadata.pages,
        category,
      });

    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
    }
  }

  // Save extracted content
  const outputDir = path.join(process.cwd(), 'data', 'extracted-pdfs-v2');
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const allFile = path.join(outputDir, 'all-pdfs-extracted.json');
  await writeFile(allFile, JSON.stringify(extracted, null, 2));

  // Save by category
  const byCategory = new Map<string, PdfContent[]>();
  for (const pdf of extracted) {
    if (!byCategory.has(pdf.category)) {
      byCategory.set(pdf.category, []);
    }
    byCategory.get(pdf.category)!.push(pdf);
  }

  for (const [category, pdfs] of byCategory.entries()) {
    const catFile = path.join(outputDir, `${category}.json`);
    await writeFile(catFile, JSON.stringify(pdfs, null, 2));
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 EXTRACTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Extracted ${extracted.length} PDF files`);
  console.log(`\n📁 By Category:`);
  for (const [category, pdfs] of Array.from(byCategory.entries()).sort()) {
    const totalSize = pdfs.reduce((sum, p) => sum + p.size, 0);
    const totalPages = pdfs.reduce((sum, p) => sum + p.pages, 0);
    const totalText = pdfs.reduce((sum, p) => sum + p.text.length, 0);
    console.log(`   ${category.padEnd(15)} ${pdfs.length} files, ${totalPages} pages, ${(totalSize / 1024 / 1024).toFixed(2)} MB, ${(totalText / 1024).toFixed(2)} KB text`);
  }
  console.log(`\n💾 Saved to: ${outputDir}`);
  console.log('='.repeat(80));
}

main().catch(console.error);

