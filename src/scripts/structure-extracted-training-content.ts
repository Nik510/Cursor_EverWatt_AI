/**
 * Structure Extracted Training Content
 * Converts extracted DOCX content into structured training content format
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

interface ExtractedDocx {
  fileName: string;
  filePath: string;
  title?: string;
  content: string;
  size: number;
  category: string;
}

interface StructuredTrainingContent {
  id: string;
  title: string;
  category: 'battery' | 'hvac' | 'lighting' | 'measures' | 'ev-charging' | 'demand-response' | 'general';
  source: string;
  sections: TrainingSection[];
  extractedAt: string;
}

interface TrainingSection {
  heading?: string;
  content: string;
  subsections?: TrainingSection[];
}

function generateId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

function parseSections(content: string): TrainingSection[] {
  const sections: TrainingSection[] = [];
  const lines = content.split('\n').filter(l => l.trim().length > 0);

  let currentSection: TrainingSection | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect section headings (ALL CAPS, title case, or numbered)
    const isHeading = 
      trimmed.length > 3 &&
      trimmed.length < 100 &&
      (
        /^[A-Z][A-Z\s&:]+$/.test(trimmed) || // ALL CAPS
        /^[A-Z][a-zA-Z\s&:]+$/.test(trimmed) && /^[A-Z][a-z]+/.test(trimmed) || // Title Case
        /^(Part|Module|Section|Chapter)\s+[IVX\d]+/i.test(trimmed) || // Part I, Module 1, etc.
        /^\d+\.\s+[A-Z]/.test(trimmed) // 1. Heading
      );

    if (isHeading && !trimmed.includes('•') && !trimmed.match(/^\d+[.)]\s*\w/)) {
      // Save previous section
      if (currentSection && currentContent.length > 0) {
        currentSection.content = currentContent.join('\n\n').trim();
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
      }

      // Start new section
      currentSection = {
        heading: trimmed,
        content: '',
      };
      currentContent = [];
    } else if (trimmed.length > 0) {
      currentContent.push(trimmed);
    }
  }

  // Save last section
  if (currentSection && currentContent.length > 0) {
    currentSection.content = currentContent.join('\n\n').trim();
    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }
  }

  // If no sections found, create one with all content
  if (sections.length === 0 && currentContent.length > 0) {
    sections.push({
      heading: undefined,
      content: currentContent.join('\n\n').trim(),
    });
  }

  return sections;
}

function categorizeContent(category: string): 'battery' | 'hvac' | 'lighting' | 'measures' | 'ev-charging' | 'demand-response' | 'general' {
  const lower = category.toLowerCase();
  if (lower.includes('battery')) return 'battery';
  if (lower.includes('hvac')) return 'hvac';
  if (lower.includes('lighting')) return 'lighting';
  if (lower.includes('measure')) return 'measures';
  if (lower.includes('ev') || lower.includes('charging')) return 'ev-charging';
  if (lower.includes('demand') || lower.includes('response')) return 'demand-response';
  return 'general';
}

async function main() {
  console.log('='.repeat(80));
  console.log('🔧 STRUCTURING EXTRACTED TRAINING CONTENT');
  console.log('='.repeat(80));

  // Read all extracted DOCX content
  const allDocxPath = path.join(process.cwd(), 'data', 'extracted-all-docx', 'all-extracted.json');
  const extractedData = JSON.parse(await readFile(allDocxPath, 'utf-8')) as ExtractedDocx[];

  console.log(`\n📥 Loaded ${extractedData.length} extracted documents\n`);

  const structured: StructuredTrainingContent[] = [];

  for (const doc of extractedData) {
    console.log(`📄 Processing: ${doc.fileName}`);

    const sections = parseSections(doc.content);
    const title = doc.title || doc.fileName.replace(/\.docx$/i, '');
    const id = generateId(title);
    const category = categorizeContent(doc.category);

    console.log(`  ✅ Structured into ${sections.length} sections [${category}]`);

    structured.push({
      id,
      title,
      category,
      source: doc.fileName,
      sections,
      extractedAt: new Date().toISOString(),
    });
  }

  // Save structured content
  const outputPath = path.join(process.cwd(), 'data', 'structured-training-content.json');
  await writeFile(outputPath, JSON.stringify(structured, null, 2));

  // Save by category
  const byCategory = new Map<string, StructuredTrainingContent[]>();
  for (const content of structured) {
    if (!byCategory.has(content.category)) {
      byCategory.set(content.category, []);
    }
    byCategory.get(content.category)!.push(content);
  }

  const outputDir = path.join(process.cwd(), 'data', 'structured-training-content');
  await import('fs/promises').then(fs => fs.mkdir(outputDir, { recursive: true }));

  for (const [category, contents] of byCategory.entries()) {
    const catFile = path.join(outputDir, `${category}.json`);
    await import('fs/promises').then(fs =>
      fs.writeFile(catFile, JSON.stringify(contents, null, 2))
    );
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 STRUCTURING SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Structured ${structured.length} training documents`);
  console.log(`\n📁 By Category:`);
  for (const [category, contents] of Array.from(byCategory.entries()).sort()) {
    const totalSections = contents.reduce((sum, c) => sum + c.sections.length, 0);
    console.log(`   ${category.padEnd(15)} ${contents.length} docs, ${totalSections} sections`);
  }
  console.log(`\n💾 Saved to: ${outputPath}`);
  console.log('='.repeat(80));
}

main().catch(console.error);

