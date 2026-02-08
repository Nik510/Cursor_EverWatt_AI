export type ProgramSourceV0 = {
  scope: string; // e.g., "CA"
  sourceType: 'index' | 'program_page';
  url: string;
  notes?: string;
  parser: 'none_v0';
};

/**
 * Program sources registry (v0 scaffold).
 *
 * Intentionally empty until program ingestion is defined. Keeping this typed
 * ensures future ingestion is centralized and auditable.
 */
export const PROGRAM_SOURCES_V0: ProgramSourceV0[] = [];

