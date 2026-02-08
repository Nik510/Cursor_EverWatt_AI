/**
 * Add Remaining Measures
 * Adds the remaining 148 measures to the knowledge base
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

async function main() {
  const reportPath = path.join(process.cwd(), 'data', 'integration-report.json');
  const report = JSON.parse(await readFile(reportPath, 'utf-8'));

  // Get measures 101-248 (remaining ones)
  const remainingMeasures = report.newMeasures.slice(100);

  const masterPath = path.join(process.cwd(), 'src', 'data', 'knowledge-base', 'master-measures.ts');
  let content = await readFile(masterPath, 'utf-8');

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
  for (const measure of remainingMeasures) {
    const categoryEnum = categoryMap[measure.category] || `'${measure.category}'`;
    const nameEscaped = measure.name.replace(/'/g, "\\'");
    newEntries.push(`
  {
    id: '${measure.id}',
    name: '${nameEscaped}',
    category: ${categoryEnum},
    tags: [],
  },`);
  }

  // Find insertion point (before the closing bracket)
  const insertMatch = content.match(/(\],\s*\/\*\*)/);
  if (insertMatch) {
    const insertPos = insertMatch.index!;
    const before = content.substring(0, insertPos);
    const after = content.substring(insertPos);
    content = before + newEntries.join('') + '\n' + after;
  } else {
    // Fallback: append before closing bracket
    content = content.replace(/\];\s*$/, newEntries.join('') + '\n];');
  }

  await writeFile(masterPath, content, 'utf-8');
  console.log(`✅ Added ${remainingMeasures.length} remaining measures to knowledge base`);
}

main().catch(console.error);

