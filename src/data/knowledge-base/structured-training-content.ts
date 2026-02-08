/**
 * Structured Training Content
 * Loaded from extracted and structured training documents
 */

import { readFile } from 'fs/promises';
import path from 'path';

export interface StructuredTrainingContent {
  id: string;
  title: string;
  category: 'battery' | 'hvac' | 'lighting' | 'measures' | 'ev-charging' | 'demand-response' | 'general';
  source: string;
  sections: TrainingSection[];
  extractedAt: string;
}

export interface TrainingSection {
  heading?: string;
  content: string;
  subsections?: TrainingSection[];
}

let cachedContent: StructuredTrainingContent[] | null = null;

/**
 * Load structured training content from JSON
 */
export async function loadStructuredTrainingContent(): Promise<StructuredTrainingContent[]> {
  if (cachedContent) {
    return cachedContent;
  }

  try {
    const contentPath = path.join(process.cwd(), 'data', 'structured-training-content.json');
    const content = await readFile(contentPath, 'utf-8');
    cachedContent = JSON.parse(content) as StructuredTrainingContent[];
    return cachedContent;
  } catch (error) {
    console.warn('Could not load structured training content:', error);
    return [];
  }
}

/**
 * Get training content by category
 */
export async function getTrainingContentByCategory(
  category: StructuredTrainingContent['category']
): Promise<StructuredTrainingContent[]> {
  const all = await loadStructuredTrainingContent();
  return all.filter(c => c.category === category);
}

/**
 * Get training content by ID
 */
export async function getTrainingContentById(id: string): Promise<StructuredTrainingContent | null> {
  const all = await loadStructuredTrainingContent();
  return all.find(c => c.id === id) || null;
}

/**
 * Search training content
 */
export async function searchTrainingContent(query: string): Promise<StructuredTrainingContent[]> {
  const all = await loadStructuredTrainingContent();
  const lowerQuery = query.toLowerCase();

  return all.filter(content =>
    content.title.toLowerCase().includes(lowerQuery) ||
    content.sections.some(section =>
      section.heading?.toLowerCase().includes(lowerQuery) ||
      section.content.toLowerCase().includes(lowerQuery)
    )
  );
}

/**
 * Get related training content (by category or keywords)
 */
export async function getRelatedTrainingContent(
  id: string,
  limit: number = 5
): Promise<StructuredTrainingContent[]> {
  const content = await getTrainingContentById(id);
  if (!content) return [];

  const all = await loadStructuredTrainingContent();
  const related = all
    .filter(c => c.id !== id && (c.category === content.category || 
      c.title.toLowerCase().includes(content.title.toLowerCase().split(' ')[0])))
    .slice(0, limit);

  return related;
}

