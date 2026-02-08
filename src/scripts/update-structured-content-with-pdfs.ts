/**
 * Update Structured Training Content with PDF Extractions
 * Integrates newly extracted PDF content into structured format
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

interface ExtractedPdf {
  fileName: string;
  filePath: string;
  title?: string;
  text: string;
  pages: number;
  category: string;
}

interface StructuredTrainingContent {
  id: string;
  title: string;
  category: 'battery' | 'hvac' | 'lighting' | 'measures' | 'ev-charging' | 'demand-response' | 'general';
  source: string;
  sections: TrainingSection[];
  extractedAt: string;
  sourceType?: 'docx' | 'pdf';
  pages?: number;
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
    
    // Detect section headings
    const isHeading = 
      trimmed.length > 3 &&
      trimmed.length < 100 &&
      (
        /^[A-Z][A-Z\s&:]+$/.test(trimmed) ||
        /^[A-Z][a-zA-Z\s&:]+$/.test(trimmed) && /^[A-Z][a-z]+/.test(trimmed) ||
        /^(Part|Module|Section|Chapter)\s+[IVX\d]+/i.test(trimmed) ||
        /^\d+\.\s+[A-Z]/.test(trimmed)
      );

    if (isHeading && !trimmed.includes('•')) {
      if (currentSection && currentContent.length > 0) {
        currentSection.content = currentContent.join('\n\n').trim();
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
      }
      currentSection = { heading: trimmed, content: '' };
      currentContent = [];
    } else if (trimmed.length > 0) {
      currentContent.push(trimmed);
    }
  }

  if (currentSection && currentContent.length > 0) {
    currentSection.content = currentContent.join('\n\n').trim();
    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }
  }

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
  console.log('🔄 UPDATING STRUCTURED CONTENT WITH PDFs');
  console.log('='.repeat(80));

  // Load existing structured content
  const structuredPath = path.join(process.cwd(), 'data', 'structured-training-content.json');
  let existingContent: StructuredTrainingContent[] = [];
  try {
    existingContent = JSON.parse(await readFile(structuredPath, 'utf-8'));
    console.log(`\n📥 Loaded ${existingContent.length} existing structured documents`);
  } catch {
    console.log(`\n⚠️  No existing structured content found, starting fresh`);
  }

  // Load PDF extracts
  const pdfPath = path.join(process.cwd(), 'data', 'extracted-pdfs-v2', 'all-pdfs-extracted.json');
  const pdfData = JSON.parse(await readFile(pdfPath, 'utf-8')) as ExtractedPdf[];

  console.log(`📥 Loaded ${pdfData.length} PDF extracts\n`);

  // Create structured content from PDFs
  const pdfStructured: StructuredTrainingContent[] = [];

  for (const pdf of pdfData) {
    console.log(`📄 Processing: ${pdf.fileName}`);

    const sections = parseSections(pdf.text);
    const title = pdf.title || pdf.fileName.replace(/\.pdf$/i, '');
    const id = generateId(title);
    const category = categorizeContent(pdf.category);

    // Check if already exists (by filename)
    const exists = existingContent.find(c => c.source === pdf.fileName || c.id === id);
    if (exists) {
      console.log(`  ⚠️  Already exists, updating...`);
      exists.sections = sections;
      exists.sourceType = 'pdf';
      exists.pages = pdf.pages;
    } else {
      console.log(`  ✅ Structured into ${sections.length} sections [${category}]`);
      pdfStructured.push({
        id,
        title,
        category,
        source: pdf.fileName,
        sections,
        extractedAt: new Date().toISOString(),
        sourceType: 'pdf',
        pages: pdf.pages,
      });
    }
  }

  // Merge with existing
  const allContent = [...existingContent, ...pdfStructured];

  // Remove duplicates by ID
  const uniqueContent = new Map<string, StructuredTrainingContent>();
  for (const content of allContent) {
    if (!uniqueContent.has(content.id)) {
      uniqueContent.set(content.id, content);
    } else {
      // Keep the one with more sections or newer source
      const existing = uniqueContent.get(content.id)!;
      if (content.sections.length > existing.sections.length || content.sourceType === 'pdf') {
        uniqueContent.set(content.id, content);
      }
    }
  }

  const finalContent = Array.from(uniqueContent.values());

  // Save updated structured content
  await writeFile(structuredPath, JSON.stringify(finalContent, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('📊 UPDATE SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Total structured documents: ${finalContent.length}`);
  
  const byCategory = new Map<string, number>();
  const bySourceType = new Map<string, number>();
  
  finalContent.forEach(c => {
    byCategory.set(c.category, (byCategory.get(c.category) || 0) + 1);
    bySourceType.set(c.sourceType || 'docx', (bySourceType.get(c.sourceType || 'docx') || 0) + 1);
  });

  console.log(`\n📁 By Category:`);
  for (const [category, count] of Array.from(byCategory.entries()).sort()) {
    console.log(`   ${category.padEnd(15)} ${count} documents`);
  }

  console.log(`\n📄 By Source Type:`);
  for (const [type, count] of Array.from(bySourceType.entries()).sort()) {
    console.log(`   ${type}: ${count} documents`);
  }

  const totalSections = finalContent.reduce((sum, c) => sum + c.sections.length, 0);
  console.log(`\n📊 Total sections: ${totalSections}`);
  console.log(`💾 Updated: ${structuredPath}`);
  console.log('='.repeat(80));
}

main().catch(console.error);

