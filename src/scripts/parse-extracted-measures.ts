/**
 * Parse Extracted Measures
 * Parses the extracted text from measure documents into structured data
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';

// Use environment variable or fallback to original source location
// Note: These are one-time extraction scripts. Extracted data is stored in data/ folder.
const BASE_PATH = process.env.TRAINING_DATA_BASE_PATH || 
  'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine';
const MEASURE_FILES = [
  path.join(BASE_PATH, 'EVERWATT AI', 'TRAINING APP', 'ALL EE MEASURES 1.0.docx'),
  path.join(BASE_PATH, 'EVERWATT AI', 'TRAINING APP', 'ALL EE MEASURES 2.0.docx'),
];

interface ParsedMeasure {
  name: string;
  category: string;
  description?: string;
  tags: string[];
  lineNumber: number;
}

function parseMeasuresFromText(text: string, sourceFile: string): ParsedMeasure[] {
  const measures: ParsedMeasure[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const categoryMap: Record<string, string> = {
    'LIGHTING': 'LIGHTING_CONTROLS',
    'HVAC COOLING': 'HVAC_COOLING',
    'HVAC HEATING': 'HVAC_HEATING',
    'HVAC': 'HVAC_COOLING',
    'BUILDING': 'BUILDING_ENVELOPE',
    'WATER': 'WATER_PLUMBING',
    'PLUMBING': 'WATER_PLUMBING',
    'REFRIGERATION': 'REFRIGERATION',
    'FOOD SERVICE': 'FOOD_SERVICE',
    'MOTORS': 'MOTORS_DRIVES',
    'CONTROLS': 'BUILDING_AUTOMATION',
    'RENEWABLE': 'RENEWABLE_ENERGY',
  };

  let currentCategory = '';
  let measureCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();

    // Detect category
    for (const [key, value] of Object.entries(categoryMap)) {
      if (upperLine.includes(key) && upperLine.length < 100) {
        currentCategory = value;
        console.log(`  📁 Category detected: ${key} → ${value}`);
        break;
      }
    }

    // Detect measure (starts with number, bullet, dash, or is a short capitalized phrase)
    const isMeasure = 
      /^[\d•\-\*●▪▫]\s+/.test(line) || // Starts with number/bullet
      /^[A-Z][A-Z\s&]{5,80}:\s*$/.test(line) || // ALL CAPS phrase ending with colon
      (/^[A-Z][a-zA-Z\s&]{3,60}$/.test(line) && line.length < 70 && !line.includes(',')); // Title case phrase

    if (isMeasure && currentCategory) {
      const measureName = line
        .replace(/^[\d•\-\*●▪▫]\s+/, '')
        .replace(/:\s*$/, '')
        .trim();

      if (measureName.length > 3 && measureName.length < 150) {
        measureCounter++;
        measures.push({
          name: measureName,
          category: currentCategory,
          tags: extractTags(measureName),
          lineNumber: i + 1,
        });
      }
    }
  }

  return measures;
}

function extractTags(measureName: string): string[] {
  const tags: string[] = [];
  const lower = measureName.toLowerCase();

  // Technology tags
  if (lower.includes('led')) tags.push('led', 'lighting');
  if (lower.includes('vfd') || lower.includes('variable')) tags.push('vfd', 'variable-speed');
  if (lower.includes('hvac')) tags.push('hvac');
  if (lower.includes('chiller')) tags.push('chiller', 'cooling');
  if (lower.includes('boiler')) tags.push('boiler', 'heating');
  if (lower.includes('battery')) tags.push('battery', 'storage');
  if (lower.includes('solar') || lower.includes('pv')) tags.push('solar', 'renewable');
  if (lower.includes('controls')) tags.push('controls', 'automation');

  // Action tags
  if (lower.includes('replace') || lower.includes('upgrade')) tags.push('retrofit');
  if (lower.includes('optimiz')) tags.push('optimization');
  if (lower.includes('maintenance')) tags.push('maintenance');

  return tags;
}

async function main() {
  console.log('='.repeat(80));
  console.log('🔍 PARSING MEASURES FROM DOCX FILES');
  console.log('='.repeat(80));

  const allMeasures: ParsedMeasure[] = [];

  for (const filePath of MEASURE_FILES) {
    console.log(`\n📄 Processing: ${path.basename(filePath)}`);
    
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;
      
      const measures = parseMeasuresFromText(text, filePath);
      console.log(`  ✅ Extracted ${measures.length} measures`);
      
      allMeasures.push(...measures);
    } catch (error) {
      console.error(`  ❌ Error: ${error}`);
    }
  }

  // Deduplicate by name
  const uniqueMeasures = new Map<string, ParsedMeasure>();
  for (const measure of allMeasures) {
    const key = measure.name.toLowerCase().trim();
    if (!uniqueMeasures.has(key) || measure.lineNumber < uniqueMeasures.get(key)!.lineNumber) {
      uniqueMeasures.set(key, measure);
    }
  }

  // Group by category
  const byCategory = new Map<string, ParsedMeasure[]>();
  for (const measure of uniqueMeasures.values()) {
    if (!byCategory.has(measure.category)) {
      byCategory.set(measure.category, []);
    }
    byCategory.get(measure.category)!.push(measure);
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 PARSING RESULTS');
  console.log('='.repeat(80));
  console.log(`\n✅ Total unique measures: ${uniqueMeasures.size}`);
  console.log(`\n📁 By Category:`);
  
  for (const [category, measures] of Array.from(byCategory.entries()).sort()) {
    console.log(`   ${category.padEnd(25)} ${measures.length.toString().padStart(3)} measures`);
  }

  // Show samples
  console.log('\n📋 Sample Measures:');
  let shown = 0;
  for (const measure of uniqueMeasures.values()) {
    if (shown >= 15) break;
    console.log(`   ${measure.name} [${measure.category}]`);
    shown++;
  }

  // Save to JSON for review
  const outputPath = path.join(process.cwd(), 'data', 'extracted-measures.json');
  await writeFile(outputPath, JSON.stringify(Array.from(uniqueMeasures.values()), null, 2));
  console.log(`\n💾 Saved to: ${outputPath}`);
  console.log('='.repeat(80));
}

main().catch(console.error);

