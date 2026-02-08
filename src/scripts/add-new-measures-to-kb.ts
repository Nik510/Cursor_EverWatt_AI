/**
 * Add New Measures to Knowledge Base
 * Integrates extracted measures into master-measures.ts
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

interface NewMeasure {
  name: string;
  category: string;
  id: string;
}

async function main() {
  console.log('='.repeat(80));
  console.log('➕ ADDING NEW MEASURES TO KNOWLEDGE BASE');
  console.log('='.repeat(80));

  // Read integration report
  const reportPath = path.join(process.cwd(), 'data', 'integration-report.json');
  const report = JSON.parse(await readFile(reportPath, 'utf-8'));

  console.log(`\n📊 Found ${report.newMeasures.length} new measures to add\n`);

  // Read master measures file
  const masterPath = path.join(process.cwd(), 'src', 'data', 'knowledge-base', 'master-measures.ts');
  let content = await readFile(masterPath, 'utf-8');

  // Find the end of the MASTER_MEASURES array
  const arrayEndMatch = content.match(/\]\s*;\s*$/m);
  if (!arrayEndMatch) {
    console.error('❌ Could not find end of MASTER_MEASURES array');
    return;
  }

  const insertPosition = arrayEndMatch.index!;
  const before = content.substring(0, insertPosition);
  const after = content.substring(insertPosition);

  // Generate measure entries
  const categoryMap: Record<string, string> = {
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

  const newEntries: string[] = [];
  let added = 0;

  for (const measure of report.newMeasures.slice(0, 100)) { // Add first 100
    const categoryEnum = categoryMap[measure.category] || `'${measure.category}'`;
    const nameEscaped = measure.name.replace(/'/g, "\\'");

    newEntries.push(`
  {
    id: '${measure.id}',
    name: '${nameEscaped}',
    category: ${categoryEnum},
    tags: [],
  },`);
    added++;
  }

  // Insert new measures
  const newContent = before + 
    (before.trim().endsWith(']') ? '' : ',') + 
    newEntries.join('') + 
    '\n' + after;

  // Write updated file
  await writeFile(masterPath, newContent, 'utf-8');

  console.log(`✅ Added ${added} new measures to master-measures.ts`);
  console.log(`📁 Location: ${masterPath}`);
  console.log(`\n💡 Remaining ${report.newMeasures.length - added} measures can be added later`);
  console.log('='.repeat(80));
}

main().catch(console.error);

