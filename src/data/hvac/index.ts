/**
 * MASTER HVAC DATABASE - INDEX
 * Complete HVAC equipment database for auditors, sales, and engineers
 */

export * from './master-hvac-database';
export * from './equipment-categories';

import { ALL_HVAC_EQUIPMENT, findHVACEquipment, getHVACEquipmentByCategory, getHVACEquipmentBySubcategory } from './master-hvac-database';
import { HVAC_CATEGORIES, getAllEquipmentTypes, getCategoryById } from './equipment-categories';

export const HVACDatabase = {
  // Equipment
  allEquipment: ALL_HVAC_EQUIPMENT,
  findEquipment: findHVACEquipment,
  getEquipmentByCategory: getHVACEquipmentByCategory,
  getEquipmentBySubcategory: getHVACEquipmentBySubcategory,
  
  // Categories
  categories: HVAC_CATEGORIES,
  getAllEquipmentTypes,
  getCategoryById,
  
  // Statistics
  get stats() {
    return {
      totalEquipmentTypes: ALL_HVAC_EQUIPMENT.length,
      categories: HVAC_CATEGORIES.length,
      subcategories: HVAC_CATEGORIES.reduce((sum, cat) => sum + cat.subcategories.length, 0),
      totalMeasures: getAllEquipmentTypes().length,
      cooling: ALL_HVAC_EQUIPMENT.filter(eq => eq.category === 'cooling').length,
      heating: ALL_HVAC_EQUIPMENT.filter(eq => eq.category === 'heating').length,
      ventilation: ALL_HVAC_EQUIPMENT.filter(eq => eq.category === 'ventilation').length,
      controls: ALL_HVAC_EQUIPMENT.filter(eq => eq.category === 'controls').length,
      electrification: ALL_HVAC_EQUIPMENT.filter(eq => eq.category === 'electrification').length,
    };
  },
};

