/**
 * Import Measures from DOCX Files
 * Extracts energy efficiency measures from the ALL EE MEASURES documents
 */

import { readFile } from 'fs/promises';
import { readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import mammoth from 'mammoth';

// Use environment variable or fallback to original source location
// Note: These are one-time extraction scripts. Extracted data is stored in data/ folder.
const TRAINING_DATA_PATH = process.env.TRAINING_DATA_BASE_PATH 
  ? path.join(process.env.TRAINING_DATA_BASE_PATH, 'EVERWATT AI', 'TRAINING APP')
  : 'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine\\EVERWATT AI\\TRAINING APP';
const TARGET_FILES = [
  'ALL EE MEASURES 1.0.docx',
  'ALL EE MEASURES 2.0.docx',
  'MASTER LIST — ALL ENERGY-EFFICIENCY MEASURES FOR COMMERCIAL BUILDINGS (EVERWATT VERSION).docx'
];

interface ExtractedMeasure {
  name: string;
  category?: string;
  description?: string;
  tags: string[];
}

async function extractMeasuresFromDocx(filePath: string): Promise<ExtractedMeasure[]> {
  console.log(`\n📄 Processing: ${path.basename(filePath)}`);
  
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;

    const measures: ExtractedMeasure[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let currentCategory = '';
    let currentMeasure: Partial<ExtractedMeasure> | null = null;

    for (const line of lines) {
      // Detect category headers (usually all caps, contains "MEASURES" or category names)
      if (line.match(/^(LIGHTING|HVAC|HEATING|COOLING|BUILDING|WATER|PLUMBING|REFRIGERATION|FOOD SERVICE|MOTORS|CONTROLS|RENEWABLE)/i)) {
        currentCategory = line;
        console.log(`  📁 Category: ${currentCategory}`);
        continue;
      }

      // Detect measure items (usually start with number, bullet, or dash)
      if (line.match(/^[\d•\-\*]\s+/) || line.match(/^[A-Z][A-Z\s]+:/)) {
        // Save previous measure
        if (currentMeasure?.name) {
          measures.push(currentMeasure as ExtractedMeasure);
        }

        // Start new measure
        const measureName = line.replace(/^[\d•\-\*]\s+/, '').trim();
        currentMeasure = {
          name: measureName,
          category: currentCategory || undefined,
          tags: [],
        };
      } else if (currentMeasure && line.length > 10) {
        // This might be description
        if (!currentMeasure.description) {
          currentMeasure.description = line;
        } else {
          currentMeasure.description += ' ' + line;
        }
      }
    }

    // Save last measure
    if (currentMeasure?.name) {
      measures.push(currentMeasure as ExtractedMeasure);
    }

    console.log(`  ✅ Extracted ${measures.length} measures`);
    return measures;

  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}:`, error);
    return [];
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('📥 IMPORTING MEASURES FROM DOCX FILES');
  console.log('='.repeat(80));

  if (!existsSync(TRAINING_DATA_PATH)) {
    console.error(`❌ Training data path not found: ${TRAINING_DATA_PATH}`);
    process.exit(1);
  }

  const allMeasures: ExtractedMeasure[] = [];

  // Try to find and process target files
  try {
    const files = await readdir(TRAINING_DATA_PATH);
    
    for (const targetFile of TARGET_FILES) {
      const filePath = path.join(TRAINING_DATA_PATH, targetFile);
      if (existsSync(filePath)) {
        const measures = await extractMeasuresFromDocx(filePath);
        allMeasures.push(...measures);
      } else {
        console.log(`\n⚠️  File not found: ${targetFile}`);
      }
    }

    // Also check TRAINING_DATA/GENERAL EE TRAINING
    const generalEePath = path.join(
      process.env.TRAINING_DATA_BASE_PATH || 'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine',
      'EVERWATT AI',
      'TRAINING_DATA',
      'GENERAL EE TRAINING',
      'MASTER LIST — ALL ENERGY-EFFICIENCY MEASURES FOR COMMERCIAL BUILDINGS (EVERWATT VERSION).docx'
    );

    if (existsSync(generalEePath)) {
      const measures = await extractMeasuresFromDocx(generalEePath);
      allMeasures.push(...measures);
    }

  } catch (error) {
    console.error('Error reading directory:', error);
  }

  // Deduplicate measures (by name)
  const uniqueMeasures = new Map<string, ExtractedMeasure>();
  for (const measure of allMeasures) {
    const key = measure.name.toLowerCase().trim();
    if (!uniqueMeasures.has(key)) {
      uniqueMeasures.set(key, measure);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 EXTRACTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Total unique measures extracted: ${uniqueMeasures.size}`);
  
  // Group by category
  const byCategory = new Map<string, ExtractedMeasure[]>();
  for (const measure of uniqueMeasures.values()) {
    const category = measure.category || 'Uncategorized';
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(measure);
  }

  console.log('\n📁 Measures by Category:');
  for (const [category, measures] of Array.from(byCategory.entries()).sort()) {
    console.log(`   ${category}: ${measures.length} measures`);
  }

  // Output sample of extracted measures
  console.log('\n📋 Sample Measures (first 10):');
  let count = 0;
  for (const measure of uniqueMeasures.values()) {
    if (count >= 10) break;
    console.log(`   ${count + 1}. ${measure.name}${measure.category ? ` [${measure.category}]` : ''}`);
    count++;
  }

  console.log('\n✅ Extraction complete! Next step: Integrate into knowledge base.');
  console.log('='.repeat(80));
}

main().catch(console.error);

