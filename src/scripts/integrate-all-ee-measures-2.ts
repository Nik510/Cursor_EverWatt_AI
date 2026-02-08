/**
 * Integrate ALL EE MEASURES 2.0 into comprehensive databases
 * This will create structured databases for ALL categories and measures
 */

import * as fs from 'fs';
import * as path from 'path';

const EXTRACTION_FILE = path.join(process.cwd(), 'data', 'extracted-all-ee-measures-2', 'full-extraction.json');
const OUTPUT_DIR = path.join(process.cwd(), 'src', 'data', 'master-ee-database');

interface ExtractedMeasure {
  id: string;
  name: string;
  category?: string;
  subcategory?: string;
  description?: string;
  keywords: string[];
}

interface ExtractionData {
  measures: ExtractedMeasure[];
  categories: string[];
  subcategories: string[];
  equipmentTypes: string[];
  technologies: string[];
}

function integrateMeasures() {
  console.log('📦 Integrating ALL EE MEASURES 2.0 into master database...');
  console.log();

  // Load extraction
  const extraction: ExtractionData = JSON.parse(
    fs.readFileSync(EXTRACTION_FILE, 'utf-8')
  );

  // Filter out non-measure entries (like "Understood", "This is the clean...", etc.)
  const validMeasures = extraction.measures.filter(m => {
    const name = m.name.toLowerCase();
    // Filter out intro text and non-measure entries
    return !name.match(/^(understood|this is|it contains|every|cooling|heating|ventilation|controls|electrification|category|subcategory|everwatt|master|database|entire industry|structured list|if you want|just tell me)/i) &&
           name.length > 5 && 
           name.length < 200 &&
           (m.category || m.subcategory || m.name.match(/\w+/));
  });

  console.log(`   Total measures extracted: ${extraction.measures.length}`);
  console.log(`   Valid measures after filtering: ${validMeasures.length}`);
  console.log(`   Categories: ${extraction.categories.length}`);
  console.log(`   Subcategories: ${extraction.subcategories.length}`);
  console.log();

  // Organize by category
  const organizedByCategory: Record<string, {
    category: string;
    subcategories: Record<string, ExtractedMeasure[]>;
  }> = {};

  for (const measure of validMeasures) {
    const category = measure.category || 'UNCATEGORIZED';
    const subcategory = measure.subcategory || 'General';

    if (!organizedByCategory[category]) {
      organizedByCategory[category] = {
        category,
        subcategories: {},
      };
    }

    if (!organizedByCategory[category].subcategories[subcategory]) {
      organizedByCategory[category].subcategories[subcategory] = [];
    }

    organizedByCategory[category].subcategories[subcategory].push(measure);
  }

  // Create master database structure
  const masterDatabase = {
    metadata: {
      version: '2.0',
      extractedAt: new Date().toISOString(),
      sourceFile: 'ALL EE MEASURES 2.0.docx',
      totalMeasures: validMeasures.length,
      totalCategories: Object.keys(organizedByCategory).length,
      totalSubcategories: Object.values(organizedByCategory).reduce(
        (sum, cat) => sum + Object.keys(cat.subcategories).length, 0
      ),
    },
    categories: Object.keys(organizedByCategory).map(categoryName => ({
      id: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: categoryName,
      subcategories: Object.keys(organizedByCategory[categoryName].subcategories).map(subcatName => ({
        id: subcatName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: subcatName,
        measures: organizedByCategory[categoryName].subcategories[subcatName].map(m => ({
          id: m.id,
          name: m.name,
          keywords: m.keywords,
        })),
      })),
    })),
    allMeasures: validMeasures.map(m => ({
      id: m.id,
      name: m.name,
      category: m.category,
      subcategory: m.subcategory,
      keywords: m.keywords,
    })),
  };

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Save master database
  const masterFile = path.join(OUTPUT_DIR, 'master-measures-database.json');
  fs.writeFileSync(masterFile, JSON.stringify(masterDatabase, null, 2), 'utf-8');

  // Save by category for easier access
  for (const category of masterDatabase.categories) {
    const categoryFile = path.join(OUTPUT_DIR, `category-${category.id}.json`);
    fs.writeFileSync(categoryFile, JSON.stringify(category, null, 2), 'utf-8');
  }

  // Create TypeScript export file
  const tsFile = path.join(OUTPUT_DIR, 'index.ts');
  const tsContent = `/**
 * MASTER ENERGY EFFICIENCY DATABASE
 * Complete catalog of ALL energy efficiency measures
 * 
 * Source: ALL EE MEASURES 2.0.docx
 * Generated: ${new Date().toISOString()}
 */

export interface EEMeasure {
  id: string;
  name: string;
  category?: string;
  subcategory?: string;
  keywords: string[];
}

export interface EESubcategory {
  id: string;
  name: string;
  measures: Array<{
    id: string;
    name: string;
    keywords: string[];
  }>;
}

export interface EECategory {
  id: string;
  name: string;
  subcategories: EESubcategory[];
}

export interface MasterEEDatabase {
  metadata: {
    version: string;
    extractedAt: string;
    sourceFile: string;
    totalMeasures: number;
    totalCategories: number;
    totalSubcategories: number;
  };
  categories: EECategory[];
  allMeasures: EEMeasure[];
}

export const masterEEDatabase: MasterEEDatabase = ${JSON.stringify(masterDatabase, null, 2)};

/**
 * Get all measures for a specific category
 */
export function getMeasuresByCategory(categoryName: string): EEMeasure[] {
  return masterEEDatabase.allMeasures.filter(m => 
    m.category?.toLowerCase() === categoryName.toLowerCase()
  );
}

/**
 * Get all measures for a specific subcategory
 */
export function getMeasuresBySubcategory(subcategoryName: string): EEMeasure[] {
  return masterEEDatabase.allMeasures.filter(m => 
    m.subcategory?.toLowerCase() === subcategoryName.toLowerCase()
  );
}

/**
 * Search measures by keyword
 */
export function searchMeasures(query: string): EEMeasure[] {
  const lowerQuery = query.toLowerCase();
  return masterEEDatabase.allMeasures.filter(m => 
    m.name.toLowerCase().includes(lowerQuery) ||
    m.keywords.some(k => k.toLowerCase().includes(lowerQuery)) ||
    m.category?.toLowerCase().includes(lowerQuery) ||
    m.subcategory?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get category by ID
 */
export function getCategoryById(id: string): EECategory | undefined {
  return masterEEDatabase.categories.find(c => c.id === id);
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  return Array.from(new Set(
    masterEEDatabase.allMeasures
      .map(m => m.category)
      .filter((c): c is string => !!c)
  ));
}

/**
 * Get all unique subcategories
 */
export function getAllSubcategories(): string[] {
  return Array.from(new Set(
    masterEEDatabase.allMeasures
      .map(m => m.subcategory)
      .filter((s): s is string => !!s)
  ));
}
`;

  fs.writeFileSync(tsFile, tsContent, 'utf-8');

  console.log('✅ Integration complete!');
  console.log(`   Master database: ${masterFile}`);
  console.log(`   TypeScript export: ${tsFile}`);
  console.log(`   Category files: ${masterDatabase.categories.length}`);
  console.log();
  console.log('📊 Statistics:');
  console.log(`   Total measures: ${masterDatabase.metadata.totalMeasures}`);
  console.log(`   Categories: ${masterDatabase.metadata.totalCategories}`);
  console.log(`   Subcategories: ${masterDatabase.metadata.totalSubcategories}`);
  console.log();
  console.log('📁 Categories:');
  masterDatabase.categories.forEach(cat => {
    console.log(`   - ${cat.name} (${cat.subcategories.length} subcategories, ${cat.subcategories.reduce((sum, s) => sum + s.measures.length, 0)} measures)`);
  });
}

integrateMeasures();

