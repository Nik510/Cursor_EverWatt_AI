/**
 * Extract ALL Remaining Files from EverWatt_Engine
 * Comprehensive extraction of all DOCX, PDF, and Excel files not yet processed
 */

import { readdir, stat, readFile, writeFile, mkdir, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import XLSX from 'xlsx';

// Use environment variable or fallback to original source location
const BASE_PATH = process.env.TRAINING_DATA_BASE_PATH || 
  'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine';

const OUTPUT_DIR = path.join(process.cwd(), 'data', 'extracted-all-remaining');
const MERGED_OUTPUT = path.join(process.cwd(), 'data', 'all-extracted-content.json');

interface ExtractedFile {
  fileName: string;
  filePath: string;
  type: 'docx' | 'pdf' | 'xlsx' | 'csv';
  size: number;
  extractedAt: string;
  content?: string;
  textLength?: number;
  sections?: Array<{ heading?: string; content: string }>;
  sheets?: Array<{ name: string; rows: number; columns: number; headers: string[] }>;
}

async function extractAllRemainingFiles() {
  console.log('🔍 Scanning for all remaining files to extract...\n');
  console.log(`Base Path: ${BASE_PATH}\n`);

  const extractedFiles: ExtractedFile[] = [];
  const filesToProcess: Array<{ path: string; type: 'docx' | 'pdf' | 'xlsx' | 'csv' }> = [];

  // Directories to scan
  const scanDirs = [
    path.join(BASE_PATH, '3P_PROGRAMS'),
    path.join(BASE_PATH, 'UTILITY_&_3P_PROGRAMS'),
    path.join(BASE_PATH, 'UTILITY_DATA'),
    path.join(BASE_PATH, 'EVERWATT AI', 'TRAINING DATA'),
    path.join(BASE_PATH, 'EVERWATT AI', 'TRAINING APP'),
  ];

  // Find all files
  for (const dir of scanDirs) {
    if (!existsSync(dir)) continue;
    
    try {
      const files = await findFiles(dir, ['.docx', '.pdf', '.xlsx', '.csv']);
      filesToProcess.push(...files);
    } catch (error) {
      console.warn(`⚠️  Error scanning ${dir}:`, error);
    }
  }

  console.log(`📋 Found ${filesToProcess.length} files to process\n`);

  // Ensure output directory
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  // Process each file
  for (const file of filesToProcess) {
    try {
      console.log(`📄 Processing: ${path.basename(file.path)}`);
      const extracted = await extractFile(file.path, file.type);
      if (extracted) {
        extractedFiles.push(extracted);
        console.log(`   ✅ Extracted ${extracted.textLength || 0} characters`);
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Save individual file extractions
  const individualFile = path.join(OUTPUT_DIR, 'all-remaining-files.json');
  await writeFile(individualFile, JSON.stringify(extractedFiles, null, 2), 'utf-8');

  // Load existing merged content and add new files
  let existingContent: any[] = [];
  if (existsSync(MERGED_OUTPUT)) {
    try {
      existingContent = JSON.parse(await readFile(MERGED_OUTPUT, 'utf-8'));
    } catch (e) {
      // File might be empty or invalid, start fresh
    }
  }

  // Add new files to merged content
  const newContent = extractedFiles.map(f => ({
    fileName: f.fileName,
    filePath: f.filePath,
    title: f.fileName.replace(/\.(docx|pdf|xlsx|csv)$/i, ''),
    category: categorizeFile(f.fileName, f.filePath),
    source: f.fileName,
    content: f.content || '',
    textLength: f.textLength || 0,
    sections: f.sections || [],
    type: f.type,
    extractedAt: f.extractedAt,
  }));

  const mergedContent = [...existingContent, ...newContent];
  await writeFile(MERGED_OUTPUT, JSON.stringify(mergedContent, null, 2), 'utf-8');

  // Also copy to public folder
  const publicFile = path.join(process.cwd(), 'public', 'data', 'all-extracted-content.json');
  await writeFile(publicFile, JSON.stringify(mergedContent, null, 2), 'utf-8');

  console.log('\n' + '='.repeat(80));
  console.log('📊 EXTRACTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Processed ${extractedFiles.length} files`);
  console.log(`📄 Total content: ${extractedFiles.reduce((sum, f) => sum + (f.textLength || 0), 0).toLocaleString()} characters`);
  console.log(`💾 Saved to: ${OUTPUT_DIR}`);
  console.log(`💾 Merged content: ${MERGED_OUTPUT}`);
  console.log('='.repeat(80));

  return extractedFiles;
}

async function findFiles(dir: string, extensions: string[], depth: number = 0): Promise<Array<{ path: string; type: 'docx' | 'pdf' | 'xlsx' | 'csv' }>> {
  if (depth > 10) return []; // Prevent infinite recursion
  
  const files: Array<{ path: string; type: 'docx' | 'pdf' | 'xlsx' | 'csv' }> = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await findFiles(fullPath, extensions, depth + 1);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          const type = ext.substring(1) as 'docx' | 'pdf' | 'xlsx' | 'csv';
          files.push({ path: fullPath, type });
        }
      }
    }
  } catch (error) {
    // Directory might not exist or be accessible
  }
  
  return files;
}

async function extractFile(filePath: string, type: 'docx' | 'pdf' | 'xlsx' | 'csv'): Promise<ExtractedFile | null> {
  const stats = await stat(filePath);
  const fileName = path.basename(filePath);
  const relativePath = path.relative(BASE_PATH, filePath);

  try {
    if (type === 'docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;
      
      // Parse sections
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const sections: Array<{ heading?: string; content: string }> = [];
      let currentSection: { heading?: string; content: string } | null = null;

      for (const line of lines) {
        const isHeading = /^[A-Z][A-Z\s&]+$/.test(line.trim()) && line.length < 100;
        
        if (isHeading && currentSection) {
          sections.push(currentSection);
          currentSection = { heading: line.trim(), content: '' };
        } else if (isHeading) {
          currentSection = { heading: line.trim(), content: '' };
        } else if (currentSection) {
          currentSection.content += (currentSection.content ? '\n' : '') + line;
        } else {
          currentSection = { content: line };
        }
      }
      if (currentSection) sections.push(currentSection);

      return {
        fileName,
        filePath: relativePath,
        type: 'docx',
        size: stats.size,
        extractedAt: new Date().toISOString(),
        content: text,
        textLength: text.length,
        sections,
      };
    } else if (type === 'xlsx' || type === 'csv') {
      // For Excel/CSV, extract schema and sample data
      const workbook = XLSX.readFile(filePath);
      const sheets: Array<{ name: string; rows: number; columns: number; headers: string[] }> = [];

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
        const headers = data.length > 0 
          ? data[0].map((h: any) => String(h || '')).filter((h: string) => h.trim().length > 0)
          : [];

        sheets.push({
          name: sheetName,
          rows: data.length,
          columns: headers.length,
          headers,
        });
      }

      // Extract text representation
      const textContent = sheets.map(s => 
        `Sheet: ${s.name}\nHeaders: ${s.headers.join(', ')}\nRows: ${s.rows}\n`
      ).join('\n');

      return {
        fileName,
        filePath: relativePath,
        type: type as 'xlsx' | 'csv',
        size: stats.size,
        extractedAt: new Date().toISOString(),
        content: textContent,
        textLength: textContent.length,
        sheets,
      };
    } else if (type === 'pdf') {
      // PDF extraction would require pdfjs-dist
      // For now, mark as needing extraction
      return {
        fileName,
        filePath: relativePath,
        type: 'pdf',
        size: stats.size,
        extractedAt: new Date().toISOString(),
        content: `[PDF file - ${stats.size} bytes - needs extraction]`,
        textLength: 0,
      };
    }
  } catch (error) {
    console.error(`   Error extracting ${fileName}:`, error);
    return null;
  }

  return null;
}

function categorizeFile(fileName: string, filePath: string): string {
  const lowerName = fileName.toLowerCase();
  const lowerPath = filePath.toLowerCase();

  if (lowerPath.includes('utility') || lowerPath.includes('pge') || lowerPath.includes('rate')) {
    return 'utility-rates';
  }
  if (lowerPath.includes('3p') || lowerPath.includes('program')) {
    return 'programs';
  }
  if (lowerPath.includes('battery')) {
    return 'battery';
  }
  if (lowerPath.includes('hvac') || lowerName.includes('ashrae')) {
    return 'hvac';
  }
  if (lowerPath.includes('training')) {
    return 'training';
  }
  return 'other';
}

// Run extraction
extractAllRemainingFiles()
  .then(() => {
    console.log('\n✅ Complete extraction finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
