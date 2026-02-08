/**
 * Extract HVAC Training Content
 * Extracts and structures content from HVAC training documents
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
const HVAC_PATHS = [
  path.join(BASE_PATH, 'EVERWATT AI', 'TRAINING_DATA', 'HVAC_TRAINING_DATA'),
  path.join(BASE_PATH, 'EVERWATT AI', 'HVAC AUDIT'),
];

interface HvacTrainingContent {
  fileName: string;
  filePath: string;
  type: 'pdf' | 'docx';
  title: string;
  content: string;
  size: number;
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

async function scanHvacFiles(): Promise<string[]> {
  const files: string[] = [];

  for (const hvacPath of HVAC_PATHS) {
    if (!existsSync(hvacPath)) continue;

    try {
      const entries = await readdir(hvacPath);
      for (const entry of entries) {
        const fullPath = path.join(hvacPath, entry);
        const stats = await stat(fullPath);
        if (stats.isFile() && entry.endsWith('.docx')) {
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
  console.log('❄️  EXTRACTING HVAC TRAINING CONTENT');
  console.log('='.repeat(80));

  const files = await scanHvacFiles();
  console.log(`\n✅ Found ${files.length} HVAC training files\n`);

  const extracted: HvacTrainingContent[] = [];

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(BASE_PATH, filePath);
    const stats = await stat(filePath);

    console.log(`📄 Processing: ${fileName}`);

    try {
      const result = await extractFromDocx(filePath);
      console.log(`  ✅ Extracted ${result.text.length} characters`);

      const lowerName = fileName.toLowerCase();
      let category = 'general';
      if (lowerName.includes('savings') || lowerName.includes('methodology')) category = 'savings';
      else if (lowerName.includes('optimization')) category = 'optimization';
      else if (lowerName.includes('audit') || lowerName.includes('checklist')) category = 'audit';

      extracted.push({
        fileName,
        filePath: relativePath,
        type: 'docx',
        title: result.title || fileName.replace(/\.docx$/i, ''),
        content: result.text,
        size: stats.size,
        category,
      });

    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
    }
  }

  // Save extracted content
  const outputDir = path.join(process.cwd(), 'data', 'extracted-hvac-training');
  if (!existsSync(outputDir)) {
    await import('fs/promises').then(fs => fs.mkdir(outputDir, { recursive: true }));
  }

  const outputFile = path.join(outputDir, 'hvac-training-content.json');
  await import('fs/promises').then(fs =>
    fs.writeFile(outputFile, JSON.stringify(extracted, null, 2))
  );

  console.log('\n' + '='.repeat(80));
  console.log('📊 EXTRACTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Extracted ${extracted.length} HVAC training documents`);
  console.log(`💾 Saved to: ${outputFile}`);
  console.log('='.repeat(80));
}

main().catch(console.error);

