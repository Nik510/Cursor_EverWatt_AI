/**
 * Comprehensive PDF Extraction
 * Extracts all PDF files from training data directories
 */

import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { readFile } from 'fs/promises';

// Use environment variable or fallback to original source location
// Note: These are one-time extraction scripts. Extracted data is stored in data/ folder.
const BASE_PATH = process.env.TRAINING_DATA_BASE_PATH || 
  'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine';

interface PdfContent {
  fileName: string;
  filePath: string;
  title?: string;
  text: string;
  size: number;
  pages?: number;
  category: string;
}

async function extractFromPdf(filePath: string): Promise<{ title?: string; text: string; pages?: number }> {
  try {
    // Try dynamic import
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
    try {
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
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error}`);
    }
  }
}

async function scanAllPdfs(dirPath: string, basePath: string, found: string[] = []): Promise<string[]> {
  if (!existsSync(dirPath)) return found;

  try {
    const entries = await readdir(dirPath);
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules') continue;

      const fullPath = path.join(dirPath, entry);
      try {
        const stats = await stat(fullPath);
        if (stats.isDirectory()) {
          await scanAllPdfs(fullPath, basePath, found);
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
  console.log('📄 COMPREHENSIVE PDF EXTRACTION');
  console.log('='.repeat(80));

  const pathsToScan = [
    path.join(BASE_PATH, 'EVERWATT AI', 'TRAINING_DATA'),
    path.join(BASE_PATH, 'TRAINING_DATA'),
  ];

  const allPdfFiles: string[] = [];
  for (const scanPath of pathsToScan) {
    await scanAllPdfs(scanPath, BASE_PATH, allPdfFiles);
  }

  console.log(`\n✅ Found ${allPdfFiles.length} PDF files\n`);

  const extracted: PdfContent[] = [];

  for (const filePath of allPdfFiles) {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(BASE_PATH, filePath);
    const stats = await stat(filePath);

    console.log(`📄 Processing: ${fileName}`);

    try {
      const { title, text, pages } = await extractFromPdf(filePath);
      const category = categorizePdf(fileName, relativePath);

      console.log(`  ✅ Extracted ${text.length} characters${pages ? ` (${pages} pages)` : ''} [${category}]`);

      extracted.push({
        fileName,
        filePath: relativePath,
        title: title || fileName.replace(/\.pdf$/i, ''),
        text,
        size: stats.size,
        pages,
        category,
      });

    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
    }
  }

  // Save extracted content
  const outputDir = path.join(process.cwd(), 'data', 'extracted-pdfs-comprehensive');
  if (!existsSync(outputDir)) {
    await import('fs/promises').then(fs => fs.mkdir(outputDir, { recursive: true }));
  }

  const allFile = path.join(outputDir, 'all-pdfs.json');
  await import('fs/promises').then(fs =>
    fs.writeFile(allFile, JSON.stringify(extracted, null, 2))
  );

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
    await import('fs/promises').then(fs =>
      fs.writeFile(catFile, JSON.stringify(pdfs, null, 2))
    );
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 EXTRACTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Extracted ${extracted.length} PDF files`);
  console.log(`\n📁 By Category:`);
  for (const [category, pdfs] of Array.from(byCategory.entries()).sort()) {
    const totalSize = pdfs.reduce((sum, p) => sum + p.size, 0);
    const totalPages = pdfs.reduce((sum, p) => sum + (p.pages || 0), 0);
    console.log(`   ${category.padEnd(15)} ${pdfs.length} files, ${totalPages} pages, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  }
  console.log(`\n💾 Saved to: ${outputDir}`);
  console.log('='.repeat(80));
}

main().catch(console.error);

