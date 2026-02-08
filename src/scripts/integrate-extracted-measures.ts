/**
 * Integrate Extracted Measures into Knowledge Base
 * Merges extracted measures from DOCX files into the master measures list
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

interface ExtractedMeasure {
  name: string;
  category: string;
  description?: string;
  tags: string[];
  lineNumber: number;
}

interface EnergyMeasure {
  id: string;
  name: string;
  category: string;
  description?: string;
  tags?: string[];
}

function generateId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

function categoryToEnum(category: string): string {
  const mapping: Record<string, string> = {
    'BUILDING_AUTOMATION': 'MeasureCategory.BUILDING_AUTOMATION',
    'BUILDING_ENVELOPE': 'MeasureCategory.BUILDING_ENVELOPE',
    'HVAC_COOLING': 'MeasureCategory.HVAC_COOLING',
    'HVAC_HEATING': 'MeasureCategory.HVAC_HEATING',
    'LIGHTING_CONTROLS': 'MeasureCategory.LIGHTING_CONTROLS',
    'MOTORS_DRIVES': 'MeasureCategory.MOTORS_DRIVES',
    'REFRIGERATION': 'MeasureCategory.REFRIGERATION',
    'RENEWABLE_ENERGY': 'MeasureCategory.RENEWABLE_ENERGY',
    'WATER_PLUMBING': 'MeasureCategory.WATER_PLUMBING',
  };
  return mapping[category] || `'${category}'`;
}

async function main() {
  console.log('='.repeat(80));
  console.log('🔄 INTEGRATING EXTRACTED MEASURES');
  console.log('='.repeat(80));

  // Read extracted measures
  const extractedPath = path.join(process.cwd(), 'data', 'extracted-measures.json');
  const extractedData = JSON.parse(await readFile(extractedPath, 'utf-8')) as ExtractedMeasure[];

  console.log(`\n📥 Loaded ${extractedData.length} extracted measures`);

  // Read existing master measures
  const masterMeasuresPath = path.join(process.cwd(), 'src', 'data', 'knowledge-base', 'master-measures.ts');
  const existingContent = await readFile(masterMeasuresPath, 'utf-8');

  // Extract existing measure names
  const existingMeasureNames = new Set<string>();
  const existingMatches = existingContent.match(/name:\s*['"]([^'"]+)['"]/g);
  if (existingMatches) {
    existingMatches.forEach(match => {
      const name = match.match(/['"]([^'"]+)['"]/)![1];
      existingMeasureNames.add(name.toLowerCase().trim());
    });
  }

  console.log(`📊 Found ${existingMeasureNames.size} existing measures in knowledge base`);

  // Find new measures
  const newMeasures: ExtractedMeasure[] = [];
  for (const measure of extractedData) {
    const key = measure.name.toLowerCase().trim();
    if (!existingMeasureNames.has(key)) {
      newMeasures.push(measure);
    }
  }

  console.log(`✅ Found ${newMeasures.length} new measures to integrate\n`);

  // Generate TypeScript code for new measures
  const newMeasureCode: string[] = [];
  
  for (const measure of newMeasures.slice(0, 50)) { // Limit to 50 for now
    const id = generateId(measure.name);
    const category = categoryToEnum(measure.category);
    const tags = measure.tags.length > 0 
      ? `['${measure.tags.join("', '")}']`
      : '[]';

    newMeasureCode.push(`  {
    id: '${id}',
    name: '${measure.name.replace(/'/g, "\\'")}',
    category: ${category},
    tags: ${tags},
  },`);
  }

  // Save integration report
  const report = {
    extracted: extractedData.length,
    existing: existingMeasureNames.size,
    new: newMeasures.length,
    newMeasures: newMeasures.map(m => ({
      name: m.name,
      category: m.category,
      id: generateId(m.name),
    })),
  };

  const reportPath = path.join(process.cwd(), 'data', 'integration-report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log('📊 Integration Summary:');
  console.log(`   • Extracted from DOCX: ${report.extracted}`);
  console.log(`   • Already in KB: ${report.existing}`);
  console.log(`   • New measures: ${report.new}`);
  console.log(`\n💾 Report saved to: ${reportPath}`);
  console.log(`\n💡 Next: Review report and integrate new measures into master-measures.ts`);
  console.log('='.repeat(80));
}

main().catch(console.error);

