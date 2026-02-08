/**
 * Unified Data Access Service
 * Provides a single interface to access all training data, measures, and content
 */

import type { 
  TrainingContent, 
  Measure, 
  MeasureTrainingLink,
  SearchResult,
  SearchOptions 
} from '../types/data-service';

// Lazy load data to avoid loading everything at once
let trainingContentCache: TrainingContent[] | null = null;
let measuresCache: Measure[] | null = null;
let linksCache: MeasureTrainingLink[] | null = null;
let searchIndex: Map<string, SearchResult[]> | null = null;

/**
 * Load training content from JSON files
 * Loads from multiple sources to ensure all content is available
 */
async function loadTrainingContent(): Promise<TrainingContent[]> {
  if (trainingContentCache) return trainingContentCache;

  try {
    // Try structured training content first (primary source)
    let data: TrainingContent[] = [];
    
    try {
      const response = await fetch('/data/structured-training-content.json');
      data = await response.json();
    } catch (e) {
      console.warn('Failed to load structured-training-content.json, trying all-extracted-content.json');
      
      // Fallback to all extracted content
      try {
        const response = await fetch('/data/all-extracted-content.json');
        const allContent = await response.json();
        // Convert to TrainingContent format
        data = allContent.map((item: any) => ({
          id: item.id || generateIdFromFileName(item.fileName),
          title: item.title || item.fileName.replace(/\.(docx|pdf|xlsx|csv)$/i, ''),
          category: item.category || 'other',
          source: item.fileName || item.source,
          sections: item.sections || [{
            heading: item.title || item.fileName,
            content: item.content || '',
          }],
        }));
      } catch (e2) {
        console.error('Failed to load any training content:', e2);
        return [];
      }
    }

    // Also try to load ASHRAE content separately if not included
    try {
      const ashraeResponse = await fetch('/data/ashrae-knowledge-architecture.json');
      const ashraeData = await ashraeResponse.json();
      
      // Check if ASHRAE is already in data
      const hasASHRAE = data.some(d => d.id === 'ashrae-knowledge-architecture');
      if (!hasASHRAE && ashraeData.sections) {
        data.push({
          id: 'ashrae-knowledge-architecture',
          title: ashraeData.title,
          category: 'hvac',
          source: 'ASHRAE Knowledge Architecture Compendium',
          sections: ashraeData.sections.map((s: any) => ({
            heading: s.heading || 'ASHRAE Guidelines',
            content: s.content,
          })),
        });
      }
    } catch (e) {
      // ASHRAE file might not exist, that's okay
    }

    // Also load all remaining extracted content
    try {
      const remainingResponse = await fetch('/data/all-remaining-content.json');
      const remainingData = await remainingResponse.json();
      
      if (Array.isArray(remainingData)) {
        for (const file of remainingData) {
          if (!file.fullText || file.error) continue;

          const id = generateIdFromFileName(file.fileName);
          
          // Check if already exists
          if (data.some(d => d.id === id)) continue;

          // Determine category
          const category = determineCategory(file.fileName, file.filePath);

          data.push({
            id,
            title: file.title || file.fileName.replace(/\.(docx|pdf|xlsx|csv)$/i, ''),
            category,
            source: file.filePath || file.fileName,
            sections: file.sections || [{
              heading: file.title || file.fileName,
              content: file.fullText,
            }],
          });
        }
      }
    } catch (e) {
      // All remaining content might not exist, that's okay
    }

    trainingContentCache = data;
    return data;
  } catch (error) {
    console.error('Failed to load training content:', error);
    return [];
  }
}

function generateIdFromFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

function determineCategory(fileName: string, filePath: string): string {
  const lower = (fileName + ' ' + filePath).toLowerCase();
  
  if (lower.includes('battery') || lower.includes('bess')) return 'battery';
  if (lower.includes('hvac') || lower.includes('ashrae') || lower.includes('chiller') || lower.includes('boiler')) return 'hvac';
  if (lower.includes('lighting') || lower.includes('led')) return 'lighting';
  if (lower.includes('ev') || lower.includes('electric vehicle') || lower.includes('charging')) return 'ev-charging';
  if (lower.includes('demand response') || lower.includes('dr')) return 'demand-response';
  if (lower.includes('measure') || lower.includes('eem')) return 'measures';
  if (lower.includes('utility') || lower.includes('rate') || lower.includes('program') || lower.includes('3p') || lower.includes('pge')) return 'utility';
  if (lower.includes('training')) return 'training';
  
  return 'other';
}

/**
 * Load measures data
 */
async function loadMeasures(): Promise<Measure[]> {
  if (measuresCache) return measuresCache;

  try {
    const response = await fetch('/data/extracted-measures.json');
    const data = await response.json();
    measuresCache = data;
    return data;
  } catch (error) {
    console.error('Failed to load measures:', error);
    return [];
  }
}

/**
 * Load measure-training links
 */
async function loadLinks(): Promise<MeasureTrainingLink[]> {
  if (linksCache) return linksCache;

  try {
    const response = await fetch('/data/measure-training-links.json');
    const data = await response.json();
    linksCache = data;
    return data;
  } catch (error) {
    console.error('Failed to load measure-training links:', error);
    return [];
  }
}

/**
 * Build search index for fast searching
 */
async function buildSearchIndex(): Promise<Map<string, SearchResult[]>> {
  if (searchIndex) return searchIndex;

  const index = new Map<string, SearchResult[]>();
  const content = await loadTrainingContent();
  const measures = await loadMeasures();

  // Index by keywords
  content.forEach((doc) => {
    const keywords = extractKeywords(doc.title + ' ' + JSON.stringify(doc.sections));
    keywords.forEach((keyword) => {
      if (!index.has(keyword)) {
        index.set(keyword, []);
      }
      index.get(keyword)!.push({
        type: 'training',
        id: doc.id,
        title: doc.title,
        category: doc.category,
        relevance: 1.0,
        snippet: doc.sections[0]?.content?.substring(0, 200) || '',
      });
    });
  });

  measures.forEach((measure) => {
    const keywords = extractKeywords(measure.name + ' ' + (measure.description || ''));
    keywords.forEach((keyword) => {
      if (!index.has(keyword)) {
        index.set(keyword, []);
      }
      index.get(keyword)!.push({
        type: 'measure',
        id: measure.id,
        title: measure.name,
        category: measure.category,
        relevance: 1.0,
        snippet: measure.description?.substring(0, 200) || '',
      });
    });
  });

  searchIndex = index;
  return index;
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
  
  // Remove common stop words
  const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use']);
  
  return [...new Set(words.filter(w => !stopWords.has(w)))];
}

/**
 * Search across all data
 */
export async function searchData(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    categories = [],
    types = ['training', 'measure'],
    limit = 50,
  } = options;

  const index = await buildSearchIndex();
  const queryKeywords = extractKeywords(query);
  const resultsMap = new Map<string, SearchResult>();

  // Find matching results
  queryKeywords.forEach((keyword) => {
    const matches = index.get(keyword) || [];
    matches.forEach((match) => {
      const key = `${match.type}-${match.id}`;
      if (!resultsMap.has(key)) {
        resultsMap.set(key, { ...match, relevance: 0 });
      }
      const existing = resultsMap.get(key)!;
      existing.relevance += match.relevance;
    });
  });

  // Filter by category and type
  let results = Array.from(resultsMap.values())
    .filter(r => types.includes(r.type))
    .filter(r => categories.length === 0 || categories.includes(r.category || ''))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);

  // Boost exact matches
  const lowerQuery = query.toLowerCase();
  results = results.map(r => {
    const titleMatch = r.title.toLowerCase().includes(lowerQuery);
    const snippetMatch = r.snippet.toLowerCase().includes(lowerQuery);
    return {
      ...r,
      relevance: r.relevance + (titleMatch ? 2 : 0) + (snippetMatch ? 1 : 0),
    };
  }).sort((a, b) => b.relevance - a.relevance);

  return results;
}

/**
 * Get training content by ID
 */
export async function getTrainingContent(id: string): Promise<TrainingContent | null> {
  const content = await loadTrainingContent();
  return content.find(c => c.id === id) || null;
}

/**
 * Get training content by category
 */
export async function getTrainingContentByCategory(
  category: string
): Promise<TrainingContent[]> {
  const content = await loadTrainingContent();
  return content.filter(c => c.category === category);
}

/**
 * Get all categories
 */
export async function getCategories(): Promise<string[]> {
  const content = await loadTrainingContent();
  const categories = new Set<string>();
  content.forEach(c => {
    if (c.category) categories.add(c.category);
  });
  return Array.from(categories).sort();
}

/**
 * Get measure by ID
 */
export async function getMeasure(id: string): Promise<Measure | null> {
  const measures = await loadMeasures();
  return measures.find(m => m.id === id) || null;
}

/**
 * Get measures by category
 */
export async function getMeasuresByCategory(category: string): Promise<Measure[]> {
  const measures = await loadMeasures();
  return measures.filter(m => m.category === category);
}

/**
 * Get training content linked to a measure
 */
export async function getTrainingForMeasure(measureId: string): Promise<TrainingContent[]> {
  const links = await loadLinks();
  const content = await loadTrainingContent();
  
  const relevantLinks = links.filter(l => l.measureId === measureId);
  const contentIds = new Set(relevantLinks.map(l => l.trainingContentIds).flat());
  
  return content.filter(c => contentIds.has(c.id));
}

/**
 * Get measures related to training content
 */
export async function getMeasuresForTraining(trainingId: string): Promise<Measure[]> {
  const links = await loadLinks();
  const measures = await loadMeasures();
  
  const relevantLinks = links.filter(l => 
    l.trainingContentIds.includes(trainingId)
  );
  const measureIds = new Set(relevantLinks.map(l => l.measureId));
  
  return measures.filter(m => measureIds.has(m.id));
}

/**
 * Get all measures
 */
export async function getAllMeasures(): Promise<Measure[]> {
  return loadMeasures();
}

/**
 * Get all training content
 */
export async function getAllTrainingContent(): Promise<TrainingContent[]> {
  return loadTrainingContent();
}

/**
 * Clear all caches (useful for development)
 */
export function clearCache(): void {
  trainingContentCache = null;
  measuresCache = null;
  linksCache = null;
  searchIndex = null;
}
