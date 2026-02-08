/**
 * Form Validation Utilities
 * Provides validation functions for various form inputs
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate building data
 */
export function validateBuildingData(data: {
  name: string;
  address: string;
  squareFootage: number;
  buildingType: string;
  yearBuilt?: number;
  occupancy?: number;
  operatingHours?: number;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Building name is required');
  }

  if (!data.address || data.address.trim().length === 0) {
    errors.push('Building address is required');
  }

  if (!data.squareFootage || data.squareFootage <= 0) {
    errors.push('Square footage must be greater than 0');
  }

  if (data.squareFootage > 10000000) {
    errors.push('Square footage seems unreasonably large');
  }

  if (!data.buildingType || data.buildingType.trim().length === 0) {
    errors.push('Building type is required');
  }

  if (data.yearBuilt && (data.yearBuilt < 1800 || data.yearBuilt > new Date().getFullYear())) {
    errors.push(`Year built must be between 1800 and ${new Date().getFullYear()}`);
  }

  if (data.occupancy && data.occupancy < 0) {
    errors.push('Occupancy cannot be negative');
  }

  if (data.operatingHours && (data.operatingHours < 0 || data.operatingHours > 8760)) {
    errors.push('Operating hours must be between 0 and 8760 (hours per year)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate HVAC system data
 */
export function validateHVACSystem(data: {
  type: string;
  capacity: number;
  currentEfficiency: number;
  proposedEfficiency: number;
  operatingHours: number;
  energyCost: number;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.type) {
    errors.push('HVAC system type is required');
  }

  if (!data.capacity || data.capacity <= 0) {
    errors.push('Capacity must be greater than 0');
  }

  if (data.type === 'chiller' || data.type === 'vrf') {
    // For chillers/VRF: capacity in tons, efficiency in kW/ton or COP
    if (data.capacity > 10000) {
      errors.push('Capacity seems unreasonably large for a chiller/VRF system');
    }
    if (data.currentEfficiency <= 0 || data.currentEfficiency > 10) {
      errors.push('Current efficiency (kW/ton or COP) must be between 0 and 10');
    }
    if (data.proposedEfficiency <= 0 || data.proposedEfficiency > 10) {
      errors.push('Proposed efficiency (kW/ton or COP) must be between 0 and 10');
    }
    if (data.proposedEfficiency >= data.currentEfficiency) {
      errors.push('Proposed efficiency should be better (lower for kW/ton, higher for COP) than current');
    }
  } else if (data.type === 'boiler') {
    // For boilers: capacity in MBH, efficiency in AFUE (0-1)
    if (data.capacity > 100000) {
      errors.push('Capacity seems unreasonably large for a boiler');
    }
    if (data.currentEfficiency <= 0 || data.currentEfficiency > 1) {
      errors.push('Current efficiency (AFUE) must be between 0 and 1');
    }
    if (data.proposedEfficiency <= 0 || data.proposedEfficiency > 1) {
      errors.push('Proposed efficiency (AFUE) must be between 0 and 1');
    }
    if (data.proposedEfficiency <= data.currentEfficiency) {
      errors.push('Proposed efficiency should be better (higher) than current');
    }
  }

  if (data.operatingHours < 0 || data.operatingHours > 8760) {
    errors.push('Operating hours must be between 0 and 8760');
  }

  if (data.energyCost < 0 || data.energyCost > 100) {
    errors.push('Energy cost seems unreasonable (must be between $0 and $100 per unit)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate lighting system data
 */
export function validateLightingSystem(data: {
  type: string;
  currentWattage: number;
  proposedWattage: number;
  fixtureCount: number;
  operatingHours: number;
  energyCost: number;
  controlsSavings?: number;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.type) {
    errors.push('Lighting system type is required');
  }

  if (!data.currentWattage || data.currentWattage <= 0) {
    errors.push('Current wattage must be greater than 0');
  }

  if (data.currentWattage > 1000) {
    errors.push('Current wattage per fixture seems unreasonably high');
  }

  if (data.type === 'retrofit') {
    if (!data.proposedWattage || data.proposedWattage <= 0) {
      errors.push('Proposed wattage must be greater than 0');
    }
    if (data.proposedWattage > 1000) {
      errors.push('Proposed wattage per fixture seems unreasonably high');
    }
    if (data.proposedWattage >= data.currentWattage) {
      errors.push('Proposed wattage should be lower than current wattage for LED retrofit');
    }
  } else if (data.type === 'controls') {
    if (!data.controlsSavings || data.controlsSavings < 0 || data.controlsSavings > 100) {
      errors.push('Controls savings percentage must be between 0 and 100');
    }
  }

  if (!data.fixtureCount || data.fixtureCount <= 0) {
    errors.push('Fixture count must be greater than 0');
  }

  if (data.fixtureCount > 100000) {
    errors.push('Fixture count seems unreasonably large');
  }

  if (data.operatingHours < 0 || data.operatingHours > 8760) {
    errors.push('Operating hours must be between 0 and 8760');
  }

  if (data.energyCost < 0 || data.energyCost > 10) {
    errors.push('Energy cost seems unreasonable (must be between $0 and $10 per kWh)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || email.trim().length === 0) {
    errors.push('Email is required');
  } else if (!emailRegex.test(email)) {
    errors.push('Please enter a valid email address');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate number range
 */
export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  const errors: string[] = [];

  if (isNaN(value)) {
    errors.push(`${fieldName} must be a number`);
  } else if (value < min || value > max) {
    errors.push(`${fieldName} must be between ${min} and ${max}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate required field
 */
export function validateRequired(value: any, fieldName: string): ValidationResult {
  const errors: string[] = [];

  if (value === null || value === undefined || value === '') {
    errors.push(`${fieldName} is required`);
  } else if (typeof value === 'string' && value.trim().length === 0) {
    errors.push(`${fieldName} is required`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

