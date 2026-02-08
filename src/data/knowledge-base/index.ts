/**
 * Knowledge Base Index
 * Central export for all knowledge base data and utilities
 */

// Types
export * from './types';

// Data
export * from './master-measures';
export * from './equipment-library';
export * from './verticals';

// Re-export for convenience
import { MASTER_MEASURES, getMeasuresByCategory, searchMeasures } from './master-measures';
import { EQUIPMENT_LIBRARY, getEquipmentByType, searchEquipment } from './equipment-library';
import { VERTICAL_PROFILES, getVerticalProfile } from './verticals';
import { KnowledgeBaseQuery, KnowledgeBaseResult } from './types';

/**
 * Unified Knowledge Base Query Function
 * Search across all knowledge base data
 */
export function queryKnowledgeBase(query: KnowledgeBaseQuery): KnowledgeBaseResult {
  const result: KnowledgeBaseResult = {};

  // Search measures
  if (query.search || query.category || query.tags) {
    let measures = MASTER_MEASURES;
    
    if (query.category) {
      measures = getMeasuresByCategory(query.category);
    }
    
    if (query.search) {
      measures = measures.filter(m =>
        searchMeasures(query.search!).includes(m)
      );
    }
    
    if (query.tags && query.tags.length > 0) {
      measures = measures.filter(m =>
        query.tags!.some(tag => m.tags?.includes(tag))
      );
    }
    
    // If no limit is provided, return all matches (caller can still pass a limit).
    result.measures = measures.slice(0, query.limit ?? measures.length);
  }

  // Search equipment
  if (query.search || query.equipmentType) {
    let equipment = EQUIPMENT_LIBRARY;
    
    if (query.equipmentType) {
      equipment = getEquipmentByType(query.equipmentType);
    }
    
    if (query.search && !query.equipmentType) {
      equipment = searchEquipment(query.search);
    }
    
    result.equipment = equipment.slice(0, query.limit ?? equipment.length);
  }

  // Get vertical profiles
  if (query.vertical) {
    const profile = getVerticalProfile(query.vertical);
    if (profile) {
      result.verticals = [profile];
    }
  } else if (query.search) {
    // Search verticals by name
    result.verticals = VERTICAL_PROFILES.filter(v =>
      v.name.toLowerCase().includes(query.search!.toLowerCase()) ||
      v.description.toLowerCase().includes(query.search!.toLowerCase())
    );
  }

  return result;
}

/**
 * Get related content (equipment for a measure, measures for equipment, etc.)
 */
export function getRelatedContent(type: 'measure' | 'equipment', id: string) {
  if (type === 'measure') {
    const measure = MASTER_MEASURES.find(m => m.id === id);
    if (!measure) return null;
    
    const relatedEquipment = measure.relatedEquipment
      ?.map(eqId => EQUIPMENT_LIBRARY.find(e => e.id === eqId))
      .filter(Boolean);
    
    return {
      measure,
      relatedEquipment,
    };
  } else {
    const equipment = EQUIPMENT_LIBRARY.find(e => e.id === id);
    if (!equipment) return null;
    
    const relatedMeasures = equipment.relatedMeasures
      ?.map(mId => MASTER_MEASURES.find(m => m.id === mId))
      .filter(Boolean);
    
    return {
      equipment,
      relatedMeasures,
    };
  }
}

