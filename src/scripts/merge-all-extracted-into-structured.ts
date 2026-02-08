/**
 * Merge ALL Extracted Content into Structured Training Content
 * Combines all extracted files into a unified structured format
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'structured-training-content.json');
const PUBLIC_OUTPUT = path.join(process.cwd(), 'public', 'data', 'structured-training-content.json');

interface TrainingContent {
  id: string;
  title: string;
  category: string;
  source: string;
  sections: Array<{
    heading: string;
    content: string;
  }>;
}

async function mergeAllContent() {
  console.log('🔄 Merging all extracted content into structured format...\n');

  const allContent: TrainingContent[] = [];

  // 1. Load existing structured content
  if (existsSync(OUTPUT_FILE)) {
    const existing = JSON.parse(await readFile(OUTPUT_FILE, 'utf-8')) as TrainingContent[];
    allContent.push(...existing);
    console.log(`✅ Loaded ${existing.length} existing documents`);
  }

  // 2. Load ASHRAE content
  const ashraeFile = path.join(DATA_DIR, 'extracted-ashrae-guidelines', 'ashrae-knowledge-architecture.json');
  if (existsSync(ashraeFile)) {
    const ashrae = JSON.parse(await readFile(ashraeFile, 'utf-8'));
    const ashraeId = 'ashrae-knowledge-architecture';
    if (!allContent.find(c => c.id === ashraeId)) {
      allContent.push({
        id: ashraeId,
        title: ashrae.title,
        category: 'hvac',
        source: 'ASHRAE Knowledge Architecture Compendium',
        sections: ashrae.sections
          .filter((s: any) => s.content && s.content.trim().length > 0)
          .map((s: any) => ({
            heading: s.heading || 'ASHRAE Guidelines',
            content: s.content,
          })),
      });
      console.log(`✅ Added ASHRAE content (${ashrae.sections.length} sections)`);
    }
  }

  // 3. Load all remaining extracted content
  const remainingFile = path.join(DATA_DIR, 'extracted-all-remaining', 'all-remaining-content.json');
  if (existsSync(remainingFile)) {
    const remaining = JSON.parse(await readFile(remainingFile, 'utf-8')) as any[];
    
    for (const file of remaining) {
      if (!file.fullText || file.error) continue;

      const id = generateId(file.fileName, file.filePath);
      
      // Check if already exists
      if (allContent.find(c => c.id === id)) continue;

      // Determine category
      const category = determineCategory(file.fileName, file.filePath);

      allContent.push({
        id,
        title: file.title || file.fileName.replace(/\.(docx|pdf|xlsx|csv)$/i, ''),
        category,
        source: file.filePath,
        sections: file.sections || [{
          heading: file.title || file.fileName,
          content: file.fullText,
        }],
      });
    }
    console.log(`✅ Added ${remaining.filter(f => f.fullText && !f.error).length} files from remaining content`);
  }

  // 4. Load from extracted-all-docx
  const docxDir = path.join(DATA_DIR, 'extracted-all-docx');
  if (existsSync(docxDir)) {
    const files = await readdir(docxDir);
    for (const file of files.filter(f => f.endsWith('.json'))) {
      try {
        const content = JSON.parse(await readFile(path.join(docxDir, file), 'utf-8'));
        if (Array.isArray(content)) {
          for (const item of content) {
            const id = generateId(item.fileName || file, '');
            if (!allContent.find(c => c.id === id)) {
              allContent.push({
                id,
                title: item.title || item.fileName || file,
                category: determineCategory(item.fileName || file, ''),
                source: item.filePath || file,
                sections: item.sections || [{
                  heading: item.title || item.fileName || file,
                  content: item.content || '',
                }],
              });
            }
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }

  // 5. Load from extracted-pdfs-v2
  const pdfsFile = path.join(DATA_DIR, 'extracted-pdfs-v2', 'all-pdfs-extracted.json');
  if (existsSync(pdfsFile)) {
    const pdfs = JSON.parse(await readFile(pdfsFile, 'utf-8'));
    if (Array.isArray(pdfs)) {
      for (const pdf of pdfs) {
        const id = generateId(pdf.fileName || '', '');
        if (!allContent.find(c => c.id === id) && pdf.text) {
          allContent.push({
            id,
            title: pdf.title || pdf.fileName || 'PDF Document',
            category: determineCategory(pdf.fileName || '', ''),
            source: pdf.filePath || pdf.fileName || '',
            sections: [{
              heading: pdf.title || pdf.fileName || 'PDF Content',
              content: pdf.text,
            }],
          });
        }
      }
      console.log(`✅ Added PDF content`);
    }
  }

  // Remove duplicates (keep first occurrence)
  const uniqueContent = Array.from(
    new Map(allContent.map(item => [item.id, item])).values()
  );

  // Save merged content
  await writeFile(OUTPUT_FILE, JSON.stringify(uniqueContent, null, 2), 'utf-8');
  await writeFile(PUBLIC_OUTPUT, JSON.stringify(uniqueContent, null, 2), 'utf-8');

  console.log('\n' + '='.repeat(80));
  console.log('📊 MERGE SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Total Documents: ${uniqueContent.length}`);
  
  const byCategory = uniqueContent.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`\nBy Category:`);
  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });

  const totalSections = uniqueContent.reduce((sum, c) => sum + c.sections.length, 0);
  console.log(`\nTotal Sections: ${totalSections}`);
  console.log(`\n💾 Saved to: ${OUTPUT_FILE}`);
  console.log(`💾 Public copy: ${PUBLIC_OUTPUT}`);
  console.log('='.repeat(80));

  return uniqueContent;
}

function generateId(fileName: string, filePath: string): string {
  const base = fileName || filePath || 'unknown';
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

function determineCategory(fileName: string, filePath: string): string {
  const lower = (fileName + ' ' + filePath).toLowerCase();
  
  if (lower.includes('battery') || lower.includes('bess')) return 'battery';
  if (lower.includes('hvac') || lower.includes('ashrae') || lower.includes('chiller') || lower.includes('boiler')) return 'hvac';
  if (lower.includes('lighting') || lower.includes('led')) return 'lighting';
  if (lower.includes('ev') || lower.includes('electric vehicle') || lower.includes('charging')) return 'ev-charging';
  if (lower.includes('demand response') || lower.includes('dr')) return 'demand-response';
  if (lower.includes('measure') || lower.includes('eem')) return 'measures';
  if (lower.includes('utility') || lower.includes('rate') || lower.includes('program') || lower.includes('3p')) return 'utility';
  if (lower.includes('training')) return 'training';
  
  return 'other';
}

// Run merge
mergeAllContent()
  .then(() => {
    console.log('\n✅ All content merged successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
