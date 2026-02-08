/**
 * Import PDF Training Manuals
 * Extracts content from all PDF training manuals
 */

import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
const pdfParse = (await import('pdf-parse')).default || require('pdf-parse');
import { readFile, mkdir } from 'fs/promises';

// Use environment variable or fallback to original source location
// Note: These are one-time extraction scripts. Extracted data is stored in data/ folder.
const BASE_PATH = process.env.TRAINING_DATA_BASE_PATH || 
  'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine';
const OUTPUT_DIR = path.join(process.cwd(), 'data', 'extracted-pdfs');

interface PdfContent {
  filePath: string;
  fileName: string;
  title?: string;
  text: string;
  pageCount: number;
  size: number;
  category: string;
}

async function processPdfFile(filePath: string, relativePath: string): Promise<PdfContent | null> {
  const fileName = path.basename(filePath);
  console.log(`  📄 Processing: ${fileName}`);

  try {
    const stats = await stat(filePath);
    const dataBuffer = await readFile(filePath);
    // Use dynamic import for pdf-parse
    const pdfParseFunc = (await import('pdf-parse')).default || (await import('pdf-parse'));
    const pdfData = await pdfParseFunc(dataBuffer);

    // Categorize by filename/path
    const lowerPath = relativePath.toLowerCase();
    const lowerName = fileName.toLowerCase();

    let category = 'general';
    if (lowerName.includes('battery') || lowerPath.includes('battery')) {
      category = 'battery';
    } else if (lowerName.includes('hvac') || lowerPath.includes('hvac')) {
      category = 'hvac';
    } else if (lowerName.includes('lighting') || lowerPath.includes('lighting')) {
      category = 'lighting';
    } else if (lowerName.includes('financial') || lowerName.includes('modeling')) {
      category = 'financial';
    }

    const title = pdfData.info?.Title || 
                  pdfData.text.split('\n').find(l => l.trim().length > 10 && l.length < 100)?.trim() ||
                  fileName.replace('.pdf', '');

    return {
      filePath: relativePath,
      fileName,
      title,
      text: pdfData.text,
      pageCount: pdfData.numpages,
      size: stats.size,
      category,
    };
  } catch (error) {
    console.error(`    ❌ Error: ${error}`);
    return null;
  }
}

async function scanForPdfs(dirPath: string, basePath: string, found: string[] = []): Promise<string[]> {
  if (!existsSync(dirPath)) {
    return found;
  }

  try {
    const entries = await readdir(dirPath);

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      
      try {
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          if (!entry.startsWith('.') && entry !== 'node_modules') {
            await scanForPdfs(fullPath, basePath, found);
          }
        } else if (stats.isFile() && entry.endsWith('.pdf')) {
          found.push(fullPath);
        }
      } catch (error) {
        continue;
      }
    }
  } catch (error) {
    // Skip directories we can't access
  }

  return found;
}

async function main() {
  console.log('='.repeat(80));
  console.log('📥 IMPORTING PDF TRAINING MANUALS');
  console.log('='.repeat(80));

  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  // Scan for PDFs
  console.log('\n📊 Scanning for PDF files...');
  const trainingDataPath = path.join(BASE_PATH, 'EVERWATT AI', 'TRAINING_DATA');
  const rootTrainingPath = path.join(BASE_PATH, 'TRAINING_DATA');
  
  const pdfFiles: string[] = [];
  await scanForPdfs(trainingDataPath, BASE_PATH, pdfFiles);
  await scanForPdfs(rootTrainingPath, BASE_PATH, pdfFiles);

  console.log(`✅ Found ${pdfFiles.length} PDF files\n`);

  // Process PDFs
  console.log('📥 Extracting content from PDFs...\n');
  const extracted: PdfContent[] = [];

  for (const pdfFile of pdfFiles) {
    const relativePath = path.relative(BASE_PATH, pdfFile);
    const content = await processPdfFile(pdfFile, relativePath);
    if (content) {
      extracted.push(content);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 EXTRACTION SUMMARY');
  console.log('='.repeat(80));

  const byCategory = new Map<string, PdfContent[]>();
  for (const pdf of extracted) {
    if (!byCategory.has(pdf.category)) {
      byCategory.set(pdf.category, []);
    }
    byCategory.get(pdf.category)!.push(pdf);
  }

  console.log(`\n✅ Extracted ${extracted.length} PDFs`);
  console.log(`\n📁 By Category:`);
  for (const [category, pdfs] of Array.from(byCategory.entries()).sort()) {
    const totalPages = pdfs.reduce((sum, p) => sum + p.pageCount, 0);
    const totalSize = pdfs.reduce((sum, p) => sum + p.size, 0);
    console.log(`   ${category.padEnd(15)} ${pdfs.length} files, ${totalPages} pages, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  }

  // Save extracted content
  const { writeFile } = await import('fs/promises');
  const outputFile = path.join(OUTPUT_DIR, 'pdf-content.json');
  await writeFile(outputFile, JSON.stringify(extracted, null, 2));

  console.log(`\n💾 Saved extracted content to: ${outputFile}`);
  console.log('='.repeat(80));
}

main().catch(console.error);

