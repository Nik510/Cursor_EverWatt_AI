/**
 * Integrate ALL Extracted Content into Structured Training System
 * Merges all extracted files into the unified training content structure
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const ALL_EXTRACTED_FILE = path.join(process.cwd(), 'data', 'all-extracted-content.json');
const STRUCTURED_CONTENT_FILE = path.join(process.cwd(), 'data', 'structured-training-content.json');
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'structured-training-content.json');

interface ExtractedFile {
  fileName: string;
  filePath: string;
  title: string;
  category: string;
  source: string;
  content: string;
  textLength: number;
  sections?: Array<{ heading?: string; content: string }>;
  type: string;
  extractedAt: string;
}

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

function generateId(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

async function integrateAllContent() {
  console.log('🔄 Integrating ALL extracted content into structured training system...\n');

  try {
    // Load all extracted content
    if (!existsSync(ALL_EXTRACTED_FILE)) {
      console.error(`❌ File not found: ${ALL_EXTRACTED_FILE}`);
      process.exit(1);
    }

    const allExtracted = JSON.parse(await readFile(ALL_EXTRACTED_FILE, 'utf-8')) as ExtractedFile[];
    console.log(`✅ Loaded ${allExtracted.length} extracted files`);

    // Load existing structured content
    let existingContent: TrainingContent[] = [];
    if (existsSync(STRUCTURED_CONTENT_FILE)) {
      existingContent = JSON.parse(await readFile(STRUCTURED_CONTENT_FILE, 'utf-8')) as TrainingContent[];
      console.log(`✅ Loaded ${existingContent.length} existing training documents`);
    }

    // Create map of existing IDs to avoid duplicates
    const existingIds = new Set(existingContent.map(c => c.id));

    // Convert extracted files to training content format
    const newContent: TrainingContent[] = [];

    for (const file of allExtracted) {
      const id = generateId(file.fileName);

      // Skip if already exists
      if (existingIds.has(id)) {
        continue;
      }

      // Convert sections
      const sections = file.sections && file.sections.length > 0
        ? file.sections
            .filter(s => s.content && s.content.trim().length > 0)
            .map(s => ({
              heading: s.heading || file.title,
              content: s.content,
            }))
        : [{
            heading: file.title,
            content: file.content || '',
          }];

      // Only add if there's actual content
      if (sections.length > 0 && sections[0].content.trim().length > 10) {
        newContent.push({
          id,
          title: file.title || file.fileName.replace(/\.(docx|pdf|xlsx|csv)$/i, ''),
          category: file.category || 'other',
          source: file.fileName,
          sections,
        });
      }
    }

    // Merge with existing content
    const mergedContent = [...existingContent, ...newContent];

    // Save updated content
    await writeFile(OUTPUT_FILE, JSON.stringify(mergedContent, null, 2), 'utf-8');
    console.log(`✅ Saved updated structured training content`);
    console.log(`   Total documents: ${mergedContent.length}`);
    console.log(`   New documents added: ${newContent.length}`);

    // Also copy to public folder
    const publicFile = path.join(process.cwd(), 'public', 'data', 'structured-training-content.json');
    await writeFile(publicFile, JSON.stringify(mergedContent, null, 2), 'utf-8');
    console.log(`✅ Copied to public folder for browser access`);

    // Generate summary
    const categories = new Map<string, number>();
    mergedContent.forEach(c => {
      categories.set(c.category, (categories.get(c.category) || 0) + 1);
    });

    console.log('\n📊 Content by Category:');
    Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count} documents`);
      });

    console.log('\n✅ Integration complete!');
    return mergedContent;

  } catch (error) {
    console.error('❌ Error integrating content:', error);
    throw error;
  }
}

// Run integration
integrateAllContent()
  .then(() => {
    console.log('\n✅ All content successfully integrated!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
