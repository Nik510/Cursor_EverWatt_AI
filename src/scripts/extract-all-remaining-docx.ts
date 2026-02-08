/**
 * Extract All Remaining DOCX Files
 * Scans and extracts content from all DOCX files in training data
 */

import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import mammoth from 'mammoth';

// Use environment variable or fallback to original source location
// Note: These are one-time extraction scripts. Extracted data is stored in data/ folder.
const BASE_PATH = process.env.TRAINING_DATA_BASE_PATH || 
  'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine';

interface ExtractedDocx {
  fileName: string;
  filePath: string;
  title?: string;
  content: string;
  size: number;
  category: string;
}

async function extractDocx(filePath: string): Promise<{ title?: string; text: string }> {
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const title = lines[0]?.trim() || undefined;
  return { title, text };
}

async function scanAllDocx(dirPath: string, basePath: string, found: string[] = []): Promise<string[]> {
  if (!existsSync(dirPath)) return found;

  try {
    const entries = await readdir(dirPath);
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules') continue;

      const fullPath = path.join(dirPath, entry);
      try {
        const stats = await stat(fullPath);
        if (stats.isDirectory()) {
          await scanAllDocx(fullPath, basePath, found);
        } else if (stats.isFile() && entry.endsWith('.docx')) {
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

function categorizeFile(fileName: string, filePath: string): string {
  const lowerName = fileName.toLowerCase();
  const lowerPath = filePath.toLowerCase();

  if (lowerName.includes('measure') || lowerPath.includes('general ee')) return 'measures';
  if (lowerName.includes('battery') || lowerPath.includes('battery')) return 'battery';
  if (lowerName.includes('hvac') || lowerPath.includes('hvac')) return 'hvac';
  if (lowerName.includes('lighting') || lowerPath.includes('lighting')) return 'lighting';
  if (lowerName.includes('demand response') || lowerPath.includes('demand')) return 'demand-response';
  if (lowerName.includes('ev') || lowerPath.includes('ev')) return 'ev-charging';
  if (lowerName.includes('incentive') || lowerName.includes('tariff') || lowerPath.includes('incentive')) return 'incentives';
  if (lowerName.includes('multi') || lowerName.includes('stacking')) return 'multi-measure';
  if (lowerName.includes('architecture') || lowerName.includes('framework')) return 'architecture';
  if (lowerName.includes('ai') || lowerName.includes('prompt') || lowerName.includes('gemini')) return 'ai-framework';
  return 'general';
}

async function main() {
  console.log('='.repeat(80));
  console.log('📥 EXTRACTING ALL REMAINING DOCX FILES');
  console.log('='.repeat(80));

  // Scan all DOCX files - comprehensive scan
  const pathsToScan = [
    path.join(BASE_PATH, 'EVERWATT AI', 'TRAINING_DATA'),
    path.join(BASE_PATH, 'EVERWATT AI', 'TRAINING APP'),
    path.join(BASE_PATH, 'EVERWATT AI', 'HVAC AUDIT'),
    path.join(BASE_PATH, 'TRAINING_DATA'),
    path.join(BASE_PATH), // Also scan root
  ];

  const allDocxFiles: string[] = [];
  for (const scanPath of pathsToScan) {
    await scanAllDocx(scanPath, BASE_PATH, allDocxFiles);
  }

  console.log(`\n✅ Found ${allDocxFiles.length} DOCX files total\n`);

  const extracted: ExtractedDocx[] = [];

  for (const filePath of allDocxFiles) {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(BASE_PATH, filePath);
    const stats = await stat(filePath);

    console.log(`📄 Processing: ${fileName}`);

    try {
      const { title, text } = await extractDocx(filePath);
      const category = categorizeFile(fileName, relativePath);

      console.log(`  ✅ Extracted ${text.length} characters [${category}]`);

      extracted.push({
        fileName,
        filePath: relativePath,
        title,
        content: text,
        size: stats.size,
        category,
      });
    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
    }
  }

  // Save by category
  const outputDir = path.join(process.cwd(), 'data', 'extracted-all-docx');
  if (!existsSync(outputDir)) {
    await import('fs/promises').then(fs => fs.mkdir(outputDir, { recursive: true }));
  }

  const byCategory = new Map<string, ExtractedDocx[]>();
  for (const doc of extracted) {
    if (!byCategory.has(doc.category)) {
      byCategory.set(doc.category, []);
    }
    byCategory.get(doc.category)!.push(doc);
  }

  // Save all
  const allFile = path.join(outputDir, 'all-extracted.json');
  await import('fs/promises').then(fs =>
    fs.writeFile(allFile, JSON.stringify(extracted, null, 2))
  );

  // Save by category
  for (const [category, docs] of byCategory.entries()) {
    const catFile = path.join(outputDir, `${category}.json`);
    await import('fs/promises').then(fs =>
      fs.writeFile(catFile, JSON.stringify(docs, null, 2))
    );
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 EXTRACTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Extracted ${extracted.length} DOCX files`);
  console.log(`\n📁 By Category:`);
  for (const [category, docs] of Array.from(byCategory.entries()).sort()) {
    const totalSize = docs.reduce((sum, d) => sum + d.size, 0);
    console.log(`   ${category.padEnd(20)} ${docs.length} files, ${(totalSize / 1024).toFixed(2)} KB`);
  }
  console.log(`\n💾 Saved to: ${outputDir}`);
  console.log('='.repeat(80));
}

main().catch(console.error);

