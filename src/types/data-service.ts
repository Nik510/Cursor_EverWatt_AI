/**
 * Type definitions for the unified data service
 */

export interface TrainingContent {
  id: string;
  title: string;
  category: string;
  source: string;
  sections: Array<{
    heading: string;
    content: string;
  }>;
}

export interface Measure {
  id: string;
  name: string;
  category?: string;
  description?: string;
  tags?: string[];
}

export interface MeasureTrainingLink {
  measureId: string;
  measureName: string;
  trainingContentIds: string[];
  relevanceScore: number;
}

export interface SearchResult {
  type: 'training' | 'measure';
  id: string;
  title: string;
  category?: string;
  relevance: number;
  snippet: string;
}

export interface SearchOptions {
  categories?: string[];
  types?: Array<'training' | 'measure'>;
  limit?: number;
}
