/**
 * Extract ALL Remaining Content from EverWatt_Engine
 * Comprehensive extraction of all DOCX, PDF, and other text-based files
 */

import mammoth from 'mammoth';
import { readdir, stat, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { parsePdfV2 } from '../utils/pdf-parser-v2';

// Use environment variable or fallback to original source location
const BASE_PATH = process.env.TRAINING_DATA_BASE_PATH || 
  'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine';

const OUTPUT_DIR = path.join(process.cwd(), 'data', 'extracted-all-remaining');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'all-remaining-content.json');

interface ExtractedFile {
  fileName: string;
  filePath: string;
  type: 'docx' | 'pdf' | 'xlsx' | 'csv' | 'other';
  size: number;
  extractedAt: string;
  title?: string;
  fullText?: string;
  textLength?: number;
  sections?: Array<{ heading?: string; content: string }>;
  error?: string;
}

async function extractAllRemainingFiles() {
  console.log('🔍 Scanning for all remaining files in EverWatt_Engine...\n');
  console.log(`Base Path: ${BASE_PATH}\n`);

  if (!existsSync(BASE_PATH)) {
    console.error(`❌ Base path not found: ${BASE_PATH}`);
    process.exit(1);
  }

  const extractedFiles: ExtractedFile[] = [];
  const directoriesToScan = [
    path.join(BASE_PATH, '3P_PROGRAMS'),
    path.join(BASE_PATH, 'UTILITY_&_3P_PROGRAMS'),
    path.join(BASE_PATH, 'EVERWATT AI', 'TRAINING APP'),
    path.join(BASE_PATH, 'EVERWATT AI', 'TRAINING_DATA'),
    path.join(BASE_PATH, 'TRAINING_DATA'),
    path.join(BASE_PATH, 'UTILITY_DATA'),
  ];

  // Find all DOCX, PDF, and relevant files
  const filesToExtract: Array<{ path: string; type: string }> = [];

  for (const dir of directoriesToScan) {
    if (!existsSync(dir)) {
      console.log(`⚠️  Directory not found: ${dir}`);
      continue;
    }

    console.log(`📂 Scanning: ${path.relative(BASE_PATH, dir)}`);
    const files = await findFiles(dir, ['.docx', '.pdf', '.xlsx', '.csv']);
    filesToExtract.push(...files);
  }

  console.log(`\n✅ Found ${filesToExtract.length} files to extract\n`);

  // Extract each file
  for (const file of filesToExtract) {
    const relativePath = path.relative(BASE_PATH, file.path);
    console.log(`📄 Extracting: ${relativePath}`);

    try {
      const stats = await stat(file.path);
      const extracted: ExtractedFile = {
        fileName: path.basename(file.path),
        filePath: relativePath,
        type: file.type as any,
        size: stats.size,
        extractedAt: new Date().toISOString(),
      };

      if (file.type === '.docx') {
        await extractDOCX(file.path, extracted);
      } else if (file.type === '.pdf') {
        await extractPDF(file.path, extracted);
      } else if (file.type === '.xlsx' || file.type === '.csv') {
        // For now, just record that it exists
        extracted.fullText = `File exists but content extraction not implemented for ${file.type} files`;
      }

      extractedFiles.push(extracted);
      console.log(`   ✅ Extracted ${extracted.textLength || 0} characters`);

    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : error}`);
      extractedFiles.push({
        fileName: path.basename(file.path),
        filePath: relativePath,
        type: file.type as any,
        size: 0,
        extractedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Save all extracted content
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  await writeFile(OUTPUT_FILE, JSON.stringify(extractedFiles, null, 2), 'utf-8');

  // Generate summary
  const summary = generateSummary(extractedFiles);
  const summaryFile = path.join(OUTPUT_DIR, 'summary.txt');
  await writeFile(summaryFile, summary, 'utf-8');

  console.log('\n' + '='.repeat(80));
  console.log('📊 EXTRACTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Total Files: ${extractedFiles.length}`);
  console.log(`📄 Successfully Extracted: ${extractedFiles.filter(f => f.fullText).length}`);
  console.log(`❌ Errors: ${extractedFiles.filter(f => f.error).length}`);
  console.log(`📝 Total Text: ${extractedFiles.reduce((sum, f) => sum + (f.textLength || 0), 0).toLocaleString()} characters`);
  console.log(`\n💾 Output: ${OUTPUT_FILE}`);
  console.log('='.repeat(80));

  return extractedFiles;
}

async function findFiles(dir: string, extensions: string[]): Promise<Array<{ path: string; type: string }>> {
  const files: Array<{ path: string; type: string }> = [];

  async function scan(currentDir: string, depth: number = 0) {
    if (depth > 10) return; // Limit depth

    try {
      const entries = await readdir(currentDir);
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);
        
        try {
          const stats = await stat(fullPath);
          
          if (stats.isDirectory()) {
            await scan(fullPath, depth + 1);
          } else if (stats.isFile()) {
            const ext = path.extname(entry).toLowerCase();
            if (extensions.includes(ext)) {
              files.push({ path: fullPath, type: ext });
            }
          }
        } catch (e) {
          // Skip files we can't access
        }
      }
    } catch (e) {
      // Skip directories we can't access
    }
  }

  await scan(dir);
  return files;
}

async function extractDOCX(filePath: string, extracted: ExtractedFile) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const fullText = result.value;
    
    const lines = fullText.split('\n').filter(l => l.trim().length > 0);
    extracted.title = lines[0]?.trim() || path.basename(filePath, '.docx');
    extracted.fullText = fullText;
    extracted.textLength = fullText.length;

    // Parse sections
    const sections = parseSections(fullText);
    extracted.sections = sections;

  } catch (error) {
    throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function extractPDF(filePath: string, extracted: ExtractedFile) {
  try {
    const result = await parsePdfV2(filePath);
    if (result && result.text) {
      extracted.fullText = result.text;
      extracted.textLength = result.text.length;
      extracted.title = path.basename(filePath, '.pdf');
      
      // Parse sections
      const sections = parseSections(result.text);
      extracted.sections = sections;
    } else {
      throw new Error('PDF extraction returned no text');
    }
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function parseSections(text: string): Array<{ heading?: string; content: string }> {
  const sections: Array<{ heading?: string; content: string }> = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let currentSection: { heading?: string; content: string } | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const isHeading = 
      /^[A-Z][A-Z\s&]+$/.test(line) && line.length < 100 && line.length > 5 ||
      /^\d+\.\s+[A-Z]/.test(line) ||
      /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*:/.test(line) ||
      /^(Chapter|Section|Part|Module)\s+\d+/i.test(line);

    if (isHeading) {
      if (currentSection) {
        currentSection.content = currentContent.join('\n');
        sections.push(currentSection);
      }

      currentSection = {
        heading: line,
        content: '',
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    } else {
      if (!currentSection) {
        currentSection = {
          heading: undefined,
          content: '',
        };
      }
      currentContent.push(line);
    }
  }

  if (currentSection) {
    currentSection.content = currentContent.join('\n');
    sections.push(currentSection);
  }

  return sections;
}

function generateSummary(extracted: ExtractedFile[]): string {
  const successful = extracted.filter(f => f.fullText);
  const errors = extracted.filter(f => f.error);
  const byType = extracted.reduce((acc, f) => {
    acc[f.type] = (acc[f.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return `All Remaining Content Extraction Summary
Generated: ${new Date().toISOString()}

STATISTICS:
- Total Files: ${extracted.length}
- Successfully Extracted: ${successful.length}
- Errors: ${errors.length}
- Total Text: ${extracted.reduce((sum, f) => sum + (f.textLength || 0), 0).toLocaleString()} characters

BY TYPE:
${Object.entries(byType).map(([type, count]) => `  ${type}: ${count}`).join('\n')}

SUCCESSFUL EXTRACTIONS (${successful.length}):
${successful.map((f, i) => 
  `${i + 1}. ${f.fileName} (${f.type}, ${f.textLength?.toLocaleString()} chars)`
).join('\n')}

ERRORS (${errors.length}):
${errors.map((f, i) => 
  `${i + 1}. ${f.fileName}: ${f.error}`
).join('\n')}
`;
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
