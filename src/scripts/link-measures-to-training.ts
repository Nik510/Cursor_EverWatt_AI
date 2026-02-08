/**
 * Link Measures to Training Content
 * Creates relationships between measures and relevant training content
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { MASTER_MEASURES } from '../data/knowledge-base/master-measures';

interface StructuredTrainingContent {
  id: string;
  title: string;
  category: string;
  sections: Array<{ heading?: string; content: string }>;
}

interface MeasureTrainingLink {
  measureId: string;
  measureName: string;
  trainingContentIds: string[];
  relevanceScore: number;
}

function calculateRelevance(measureName: string, trainingContent: StructuredTrainingContent): number {
  const lowerMeasure = measureName.toLowerCase();
  const lowerTitle = trainingContent.title.toLowerCase();
  const lowerContent = trainingContent.sections
    .map(s => `${s.heading || ''} ${s.content}`)
    .join(' ')
    .toLowerCase();

  let score = 0;

  // Extract keywords from measure name
  const keywords = lowerMeasure
    .split(/[\s-&]+/)
    .filter(w => w.length > 3);

  // Check title match
  for (const keyword of keywords) {
    if (lowerTitle.includes(keyword)) {
      score += 10;
    }
  }

  // Check content match
  for (const keyword of keywords) {
    // Escape special regex characters
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const occurrences = (lowerContent.match(new RegExp(escapedKeyword, 'g')) || []).length;
    score += Math.min(occurrences * 2, 10); // Cap at 10 per keyword
  }

  // Category match bonus
  const measureCategory = lowerMeasure;
  if (lowerTitle.includes('battery') && measureCategory.includes('battery')) score += 5;
  if (lowerTitle.includes('hvac') && (measureCategory.includes('hvac') || measureCategory.includes('chiller') || measureCategory.includes('boiler'))) score += 5;
  if (lowerTitle.includes('lighting') && measureCategory.includes('light')) score += 5;
  if (lowerTitle.includes('led') && measureCategory.includes('led')) score += 5;

  return score;
}

async function main() {
  console.log('='.repeat(80));
  console.log('🔗 LINKING MEASURES TO TRAINING CONTENT');
  console.log('='.repeat(80));

  // Load training content
  const trainingPath = path.join(process.cwd(), 'data', 'structured-training-content.json');
  const trainingContent = JSON.parse(await readFile(trainingPath, 'utf-8')) as StructuredTrainingContent[];

  console.log(`\n📥 Loaded ${trainingContent.length} training documents`);
  console.log(`📊 Processing ${MASTER_MEASURES.length} measures\n`);

  const links: MeasureTrainingLink[] = [];

  for (const measure of MASTER_MEASURES) {
    if (!measure || !measure.name) continue;
    
    const relevantTraining: Array<{ id: string; score: number }> = [];

    for (const training of trainingContent) {
      const score = calculateRelevance(measure.name, training);
      if (score > 5) { // Threshold for relevance
        relevantTraining.push({ id: training.id, score });
      }
    }

    // Sort by score and take top 5
    relevantTraining.sort((a, b) => b.score - a.score);
    const topTraining = relevantTraining.slice(0, 5).map(t => t.id);

    if (topTraining.length > 0) {
      const avgScore = relevantTraining.slice(0, 5).reduce((sum, t) => sum + t.score, 0) / topTraining.length;
      links.push({
        measureId: measure.id,
        measureName: measure.name,
        trainingContentIds: topTraining,
        relevanceScore: avgScore,
      });
    }
  }

  // Save links
  const linksPath = path.join(process.cwd(), 'data', 'measure-training-links.json');
  await writeFile(linksPath, JSON.stringify(links, null, 2));

  console.log(`\n✅ Created ${links.length} measure-to-training links`);
  console.log(`\n📊 Top Linked Measures:`);
  links
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10)
    .forEach(link => {
      console.log(`   ${link.measureName}: ${link.trainingContentIds.length} links (score: ${link.relevanceScore.toFixed(1)})`);
    });

  console.log(`\n💾 Saved to: ${linksPath}`);
  console.log('='.repeat(80));
}

main().catch(console.error);

