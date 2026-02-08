/**
 * Extract All Remaining PDFs
 * Uses the PDF parser to extract text from all PDF files
 */

import { readdir, stat, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { parsePdfV2 } from '../utils/pdf-parser-v2';
import { parsePdfFallback } from '../utils/pdf-parser-fallback';

const BASE_PATH = process.env.TRAINING_DATA_BASE_PATH || 
  'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine';

const OUTPUT_DIR = path.join(process.cwd(), 'data', 'extracted-all-pdfs-final');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'all-pdfs-extracted.json');

interface ExtractedPDF {
  fileName: string;
  filePath: string;
  size: number;
  extractedAt: string;
  text: string;
  textLength: number;
  pages?: number;
  method: 'pdfjs' | 'fallback';
}

async function extractAllPDFs() {
  console.log('📄 Extracting all remaining PDF files...\n');

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  // Find all PDF files
  const pdfFiles: string[] = [];
  const scanDirs = [
    path.join(BASE_PATH, 'UTILITY_DATA'),
    path.join(BASE_PATH, 'UTILITY_&_3P_PROGRAMS'),
    path.join(BASE_PATH, 'TRAINING_DATA', 'BATTERY_TRAINING_DATA'),
  ];

  for (const dir of scanDirs) {
    if (!existsSync(dir)) continue;
    const files = await findPDFs(dir);
    pdfFiles.push(...files);
  }

  console.log(`📋 Found ${pdfFiles.length} PDF files to extract\n`);

  const extracted: ExtractedPDF[] = [];

  for (const pdfPath of pdfFiles) {
    try {
      const fileName = path.basename(pdfPath);
      const relativePath = path.relative(BASE_PATH, pdfPath);
      const stats = await stat(pdfPath);

      console.log(`📄 Extracting: ${fileName}`);

      let text = '';
      let method: 'pdfjs' | 'fallback' = 'pdfjs';
      let pages = 0;

      // Try primary parser
      try {
        const result = await parsePdfV2(pdfPath);
        text = result.text;
        pages = result.pages || 0;
        method = 'pdfjs';
      } catch (error) {
        // Try fallback
        try {
          const result = await parsePdfFallback(pdfPath);
          text = result.text;
          pages = result.pages || 0;
          method = 'fallback';
        } catch (e2) {
          console.warn(`   ⚠️  Could not extract: ${fileName}`);
          text = `[PDF file - ${stats.size} bytes - extraction failed]`;
        }
      }

      if (text.length > 0) {
        extracted.push({
          fileName,
          filePath: relativePath,
          size: stats.size,
          extractedAt: new Date().toISOString(),
          text,
          textLength: text.length,
          pages,
          method,
        });
        console.log(`   ✅ Extracted ${text.length} characters (${pages} pages, method: ${method})`);
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Save extracted PDFs
  await writeFile(OUTPUT_FILE, JSON.stringify(extracted, null, 2), 'utf-8');
  console.log(`\n✅ Saved ${extracted.length} extracted PDFs to: ${OUTPUT_FILE}`);

  // Also copy to public folder
  const publicFile = path.join(process.cwd(), 'public', 'data', 'all-pdfs-extracted.json');
  await writeFile(publicFile, JSON.stringify(extracted, null, 2), 'utf-8');
  console.log(`✅ Copied to public folder`);

  const totalText = extracted.reduce((sum, e) => sum + e.textLength, 0);
  const totalPages = extracted.reduce((sum, e) => sum + (e.pages || 0), 0);

  console.log('\n' + '='.repeat(80));
  console.log('📊 PDF EXTRACTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Extracted: ${extracted.length} PDFs`);
  console.log(`📄 Total text: ${totalText.toLocaleString()} characters`);
  console.log(`📑 Total pages: ${totalPages}`);
  console.log('='.repeat(80));

  return extracted;
}

async function findPDFs(dir: string, depth: number = 0): Promise<string[]> {
  if (depth > 10) return [];
  
  const pdfs: string[] = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subPDFs = await findPDFs(fullPath, depth + 1);
        pdfs.push(...subPDFs);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
        pdfs.push(fullPath);
      }
    }
  } catch (error) {
    // Directory might not exist
  }
  
  return pdfs;
}

// Run extraction
extractAllPDFs()
  .then(() => {
    console.log('\n✅ PDF extraction complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
