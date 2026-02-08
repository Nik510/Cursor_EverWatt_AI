/**
 * EverWatt.AI Core Vision & Guiding Compass
 * 
 * This file contains the foundational truth of EverWatt.AI.
 * All development, features, and decisions must align with this vision.
 * Nothing should ever misalign with this goal.
 * 
 * @see EVERWATT_AI_CORE_VISION.md for the complete vision document
 */

/**
 * Core Mission Statement
 */
export const CORE_MISSION = 
  "EverWatt.AI is a plug-and-play, vendor-agnostic optimization layer that learns from building data to continuously reduce energy and demand—at scale—with provable results.";

/**
 * The Six Pillars - Primary Objectives
 */
export const SIX_PILLARS = {
  DEEPER_SAVINGS: "Deliver deeper energy savings than 'normal automation' - continuously tune HVAC, VFDs, and other big loads for maximum efficiency",
  VENDOR_AGNOSTIC: "Be vendor-agnostic and bypass lock-in - integrate with anything (Ignition, Niagara, BACnet, Siemens, Johnson Controls, etc.)",
  LEARN_AND_IMPROVE: "Use telemetry + learning to improve performance over time - learn what buildings need, identify waste, dispatch control changes safely",
  SCALE_EXPERTISE: "Automate the 'supertech' optimization work so it can scale nationwide - encode expert knowledge into repeatable logic",
  PROVIDE_PROOF: "Provide proof: M&V-grade reporting that utilities and CFOs accept - before/after verification, audit trails, utility-program-ready documentation",
  ENABLE_BUSINESS_MODELS: "Enable new business models (not just projects) - ongoing performance contracts, monitoring subscriptions, portfolio-wide optimization"
} as const;

/**
 * Development Principles - Alignment Check
 * 
 * Before implementing any feature, ask:
 */
export const ALIGNMENT_CHECK = [
  "Does this align with vendor-agnostic principles?",
  "Does this provide provable, M&V-grade results?",
  "Does this enable scaling optimization expertise?",
  "Does this avoid proprietary lock-in?",
  "Does this learn from data to improve over time?"
] as const;

/**
 * What We DON'T Do
 */
export const WHAT_WE_DONT_DO = [
  "Create proprietary protocols that lock customers in",
  "Depend on specific vendor ecosystems",
  "Simplify physics for convenience (accuracy first)",
  "Build features that can't scale nationwide",
  "Ignore data quality or validation"
] as const;

/**
 * What We ALWAYS Do
 */
export const WHAT_WE_ALWAYS_DO = [
  "Use universal interfaces (BACnet, Modbus, REST APIs)",
  "Provide audit trails and proof of savings",
  "Encode expert knowledge into repeatable logic",
  "Learn from telemetry data",
  "Enable new business models beyond one-time projects"
] as const;

/**
 * One Sentence Summary
 */
export const ONE_SENTENCE_SUMMARY = 
  "EverWatt.AI is a comprehensive energy optimization ecosystem that combines real-time equipment assessment, physics-based calculations, AI-powered insights, and vendor-agnostic integration to deliver provable energy savings at scale—from initial audit through ongoing optimization—without vendor lock-in.";

/**
 * Check if a feature aligns with core vision
 */
export function checkAlignment(feature: {
  vendorAgnostic?: boolean;
  providesProof?: boolean;
  scalesExpertise?: boolean;
  avoidsLockIn?: boolean;
  learnsFromData?: boolean;
}): { aligned: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (feature.vendorAgnostic === false) {
    issues.push("Feature creates vendor dependencies - violates vendor-agnostic principle");
  }
  
  if (feature.providesProof === false) {
    issues.push("Feature doesn't provide M&V-grade proof - violates provable results principle");
  }
  
  if (feature.scalesExpertise === false) {
    issues.push("Feature doesn't scale optimization expertise - violates scaling principle");
  }
  
  if (feature.avoidsLockIn === false) {
    issues.push("Feature creates proprietary lock-in - violates vendor-agnostic principle");
  }
  
  if (feature.learnsFromData === false) {
    issues.push("Feature doesn't learn from data - violates learning principle");
  }
  
  return {
    aligned: issues.length === 0,
    issues
  };
}

/**
 * Get vision reference for documentation
 */
export function getVisionReference(): string {
  return "See EVERWATT_AI_CORE_VISION.md for the complete vision document";
}

