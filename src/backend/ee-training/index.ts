/**
 * EE Training Backend
 * Main entry point for training content API
 * 
 * This backend is file-based for now, but can be migrated to a database
 * All content is loaded from the file system structure
 */

import type { 
  TrainingLibrary, 
  TrainingModule, 
  ModuleCategory,
  GetModulesResponse,
  GetModuleResponse,
  GetSectionResponse,
  CertificationTest,
} from './types';

/**
 * Load all modules from the backend
 * In a real implementation, this would:
 * - Scan the modules directory
 * - Load all module JSON files
 * - Return structured data
 * 
 * @param includeHidden - If true, includes hidden/archived modules (admin only)
 */
export async function getAllModules(includeHidden: boolean = false): Promise<GetModulesResponse> {
  // For now, we'll import from the modules directory
  // In production, this could be a file system scan or database query
  let modules = await loadAllModules();
  
  // Filter by visibility unless admin
  if (!includeHidden) {
    modules = modules.filter(m => m.status === 'published');
  }
  
  const categories = await loadAllCategories(modules);
  
  return {
    modules,
    categories,
  };
}

/**
 * Get a specific module by ID
 */
export async function getModule(moduleId: string): Promise<GetModuleResponse | null> {
  const modules = await loadAllModules();
  const module = modules.find(m => m.id === moduleId);
  
  if (!module) {
    return null;
  }
  
  return { module };
}

/**
 * Get a specific section from a module
 */
export async function getSection(moduleId: string, sectionId: string): Promise<GetSectionResponse | null> {
  const moduleResult = await getModule(moduleId);
  if (!moduleResult) {
    return null;
  }
  
  const section = moduleResult.module.sections.find(s => s.id === sectionId);
  if (!section) {
    return null;
  }
  
  return {
    section,
    module: moduleResult.module,
  };
}

/**
 * Load all modules from the file system
 * Loads JSON files from the modules directory
 */
async function loadAllModules(): Promise<TrainingModule[]> {
  const modules: TrainingModule[] = [];

  try {
    // Vite handles JSON imports. Use a glob to avoid manual maintenance.
    const moduleFiles = import.meta.glob('./modules/*.json');
    for (const filePath of Object.keys(moduleFiles)) {
      const loader = moduleFiles[filePath] as () => Promise<any>;
      const raw = await loader();
      const mod = (raw?.default ?? raw) as TrainingModule;
      if (mod && typeof mod.id === 'string') modules.push(mod);
    }
  } catch (error) {
    console.error('Error loading modules:', error);
  }

  // Stable ordering
  return modules.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Load all categories and organize modules
 */
async function loadAllCategories(modules: TrainingModule[]): Promise<ModuleCategory[]> {
  // Group modules by category
  const categoryMap = new Map<string, string[]>();
  
  modules.forEach(module => {
    if (!categoryMap.has(module.category)) {
      categoryMap.set(module.category, []);
    }
    categoryMap.get(module.category)!.push(module.id);
  });
  
  // Convert to category objects
  const categories: ModuleCategory[] = Array.from(categoryMap.entries()).map(([categoryId, moduleIds], index) => ({
    id: categoryId,
    name: formatCategoryName(categoryId),
    order: index,
    modules: moduleIds,
  }));
  
  return categories.sort((a, b) => a.order - b.order);
}

/**
 * Format category ID to display name
 */
function formatCategoryName(categoryId: string): string {
  return categoryId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Export the training library structure
 */
export async function getTrainingLibrary(): Promise<TrainingLibrary> {
  const { modules, categories } = await getAllModules();
  
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    categories,
    modules,
  };
}

/**
 * Load all certification tests
 */
export async function getAllCertifications(): Promise<CertificationTest[]> {
  const certifications: CertificationTest[] = [];

  try {
    const certFiles = import.meta.glob('./certifications/*.json');
    for (const filePath of Object.keys(certFiles)) {
      const loader = certFiles[filePath] as () => Promise<any>;
      const raw = await loader();
      const cert = (raw?.default ?? raw) as CertificationTest;
      if (cert && typeof cert.id === 'string') {
        certifications.push(cert);
      }
    }
  } catch (error) {
    console.error('Error loading certifications:', error);
  }

  return certifications;
}

/**
 * Get a specific certification test by ID
 */
export async function getCertification(certId: string): Promise<CertificationTest | null> {
  const certifications = await getAllCertifications();
  return certifications.find(c => c.id === certId) || null;
}

/**
 * Get certification by industry
 */
export async function getCertificationByIndustry(industry: string): Promise<CertificationTest | null> {
  const certifications = await getAllCertifications();
  return certifications.find(c => c.industry === industry) || null;
}
