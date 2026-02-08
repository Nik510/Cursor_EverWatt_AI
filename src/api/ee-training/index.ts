/**
 * EE Training API
 * Frontend API layer for accessing training content from backend
 * 
 * This abstracts the backend implementation - can switch from file-based
 * to database or REST API without changing frontend code
 */

import type {
  TrainingModule,
  ModuleCategory,
  TrainingSection,
  GetModulesResponse,
  GetModuleResponse,
  GetSectionResponse,
  CertificationTest,
} from '../../backend/ee-training/types';

// Import backend functions
import {
  getAllModules,
  getModule,
  getSection,
  getTrainingLibrary,
  getAllCertifications,
  getCertification,
  getCertificationByIndustry,
} from '../../backend/ee-training';

/**
 * Get all training modules and categories
 * @param includeHidden - If true, includes hidden/archived modules (admin only)
 */
export async function fetchAllModules(includeHidden: boolean = false): Promise<GetModulesResponse> {
  return await getAllModules(includeHidden);
}

/**
 * Get a specific training module by ID
 */
export async function fetchModule(moduleId: string): Promise<TrainingModule | null> {
  const result = await getModule(moduleId);
  return result?.module || null;
}

/**
 * Get a specific section from a module
 */
export async function fetchSection(
  moduleId: string,
  sectionId: string
): Promise<{ section: TrainingSection; module: TrainingModule } | null> {
  const result = await getSection(moduleId, sectionId);
  if (!result) return null;
  
  return {
    section: result.section,
    module: result.module,
  };
}

/**
 * Get all categories
 */
export async function fetchCategories(): Promise<ModuleCategory[]> {
  const { categories } = await getAllModules();
  return categories;
}

/**
 * Get modules by category
 */
export async function fetchModulesByCategory(categoryId: string): Promise<TrainingModule[]> {
  const { modules } = await getAllModules();
  return modules.filter(m => m.category === categoryId);
}

/**
 * Search modules by query
 */
export async function searchModules(query: string): Promise<TrainingModule[]> {
  const { modules } = await getAllModules();
  const lowerQuery = query.toLowerCase();
  
  return modules.filter(module => 
    module.title.toLowerCase().includes(lowerQuery) ||
    module.subtitle?.toLowerCase().includes(lowerQuery) ||
    module.description?.toLowerCase().includes(lowerQuery) ||
    module.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get the complete training library structure
 */
export async function fetchTrainingLibrary() {
  return await getTrainingLibrary();
}

/**
 * Get all certification tests
 */
export async function fetchAllCertifications(): Promise<CertificationTest[]> {
  return await getAllCertifications();
}

/**
 * Get a specific certification test by ID
 */
export async function fetchCertification(certId: string): Promise<CertificationTest | null> {
  return await getCertification(certId);
}

/**
 * Get certification test by industry
 */
export async function fetchCertificationByIndustry(industry: string): Promise<CertificationTest | null> {
  return await getCertificationByIndustry(industry);
}
