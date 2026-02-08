/**
 * Integrate ASHRAE Guidelines into Structured Training Content
 * Adds ASHRAE content to the structured training content JSON
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const ASHRAE_FILE = path.join(process.cwd(), 'data', 'extracted-ashrae-guidelines', 'ashrae-knowledge-architecture.json');
const STRUCTURED_CONTENT_FILE = path.join(process.cwd(), 'data', 'structured-training-content.json');
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'structured-training-content.json');

interface ASHRAEContent {
  extractedAt: string;
  sourceFile: string;
  title: string;
  fullText: string;
  textLength: number;
  sections: Array<{
    heading?: string;
    level: number;
    content: string;
  }>;
  categories: string[];
  keywords: string[];
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

async function integrateASHRAE() {
  console.log('🔄 Integrating ASHRAE Guidelines into structured training content...\n');

  try {
    // Load ASHRAE content
    const ashraeData = JSON.parse(await readFile(ASHRAE_FILE, 'utf-8')) as ASHRAEContent;
    console.log(`✅ Loaded ASHRAE content: ${ashraeData.title}`);

    // Load existing structured content
    const existingContent = JSON.parse(await readFile(STRUCTURED_CONTENT_FILE, 'utf-8')) as TrainingContent[];
    console.log(`✅ Loaded ${existingContent.length} existing training documents`);

    // Check if ASHRAE content already exists
    const ashraeId = 'ashrae-knowledge-architecture';
    const existingIndex = existingContent.findIndex(c => c.id === ashraeId);

    // Convert ASHRAE sections to training content format
    const ashraeTrainingContent: TrainingContent = {
      id: ashraeId,
      title: ashraeData.title,
      category: 'hvac',
      source: 'ASHRAE Knowledge Architecture Compendium',
      sections: ashraeData.sections
        .filter(s => s.content && s.content.trim().length > 0)
        .map(s => ({
          heading: s.heading || 'ASHRAE Guidelines',
          content: s.content,
        })),
    };

    if (existingIndex >= 0) {
      // Update existing
      existingContent[existingIndex] = ashraeTrainingContent;
      console.log(`✅ Updated existing ASHRAE entry`);
    } else {
      // Add new
      existingContent.push(ashraeTrainingContent);
      console.log(`✅ Added new ASHRAE entry`);
    }

    // Save updated content
    await writeFile(OUTPUT_FILE, JSON.stringify(existingContent, null, 2), 'utf-8');
    console.log(`\n✅ Saved updated structured training content`);
    console.log(`   Total documents: ${existingContent.length}`);
    console.log(`   ASHRAE sections: ${ashraeTrainingContent.sections.length}`);

    // Also copy to public folder
    const publicFile = path.join(process.cwd(), 'public', 'data', 'structured-training-content.json');
    await writeFile(publicFile, JSON.stringify(existingContent, null, 2), 'utf-8');
    console.log(`✅ Copied to public folder for browser access`);

    console.log('\n✅ Integration complete!');
    return ashraeTrainingContent;

  } catch (error) {
    console.error('❌ Error integrating ASHRAE content:', error);
    throw error;
  }
}

// Run integration
integrateASHRAE()
  .then(() => {
    console.log('\n✅ ASHRAE content successfully integrated!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
