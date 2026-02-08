/**
 * Verify Measures Count
 */

import { MASTER_MEASURES } from '../data/knowledge-base/master-measures';

console.log(`✅ Total measures in knowledge base: ${MASTER_MEASURES.length}`);
console.log(`\n📊 By Category:`);

const byCategory = new Map<string, number>();
for (const measure of MASTER_MEASURES) {
  const cat = measure.category.toString();
  byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
}

for (const [category, count] of Array.from(byCategory.entries()).sort()) {
  console.log(`   ${category}: ${count}`);
}

