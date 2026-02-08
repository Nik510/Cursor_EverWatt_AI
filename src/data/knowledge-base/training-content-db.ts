/**
 * Training Content Database
 * Structured training content extracted from documents
 * This will be integrated with the knowledge base system
 */

import type { TechPageData } from '../../data/training/lighting-content';

export interface ExtractedTrainingContent {
  id: string;
  source: string; // Original file name
  category: 'battery' | 'hvac' | 'lighting' | 'general' | 'financial' | 'methodology';
  title: string;
  content: string;
  sections?: string[];
  extractedAt: string;
}

/**
 * This file will be populated with extracted training content
 * as we process the documents
 */
export const EXTRACTED_TRAINING_CONTENT: ExtractedTrainingContent[] = [
  // Content will be added here as documents are processed
];

/**
 * Get training content by category
 */
export function getTrainingContentByCategory(category: string): ExtractedTrainingContent[] {
  return EXTRACTED_TRAINING_CONTENT.filter(c => c.category === category);
}

/**
 * Search training content
 */
export function searchTrainingContent(query: string): ExtractedTrainingContent[] {
  const lowerQuery = query.toLowerCase();
  return EXTRACTED_TRAINING_CONTENT.filter(c =>
    c.title.toLowerCase().includes(lowerQuery) ||
    c.content.toLowerCase().includes(lowerQuery)
  );
}

