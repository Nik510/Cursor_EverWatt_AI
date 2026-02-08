/**
 * Training Progress
 * Simple localStorage-based progress tracking for EE Training.
 *
 * Notes:
 * - Uses localStorage for now (single-device). Can be migrated to backend later.
 * - Tracks per-module and per-section: viewed, completed, time spent.
 */

import type { TrainingModule } from '../backend/ee-training/types';

const STORAGE_KEY = 'everwatt_training_progress_v1';

export type SectionProgress = {
  sectionId: string;
  firstViewedAt?: string; // ISO
  lastViewedAt?: string; // ISO
  completedAt?: string; // ISO
  completed?: boolean;
  timeSpentSec?: number;
};

export type ModuleProgress = {
  moduleId: string;
  startedAt?: string; // ISO
  lastViewedAt?: string; // ISO
  lastSectionId?: string;
  sections: Record<string, SectionProgress>;
};

export type TrainingProgressStore = {
  version: 1;
  updatedAt: string; // ISO
  modules: Record<string, ModuleProgress>;
};

function nowIso() {
  return new Date().toISOString();
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getTrainingProgressStore(): TrainingProgressStore {
  const parsed = safeParse<TrainingProgressStore>(localStorage.getItem(STORAGE_KEY));
  if (parsed && parsed.version === 1 && parsed.modules) return parsed;
  return { version: 1, updatedAt: nowIso(), modules: {} };
}

function saveTrainingProgressStore(store: TrainingProgressStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...store, updatedAt: nowIso() }));
  } catch (e) {
    console.error('Error saving training progress:', e);
  }
}

function ensureModule(store: TrainingProgressStore, moduleId: string): ModuleProgress {
  if (!store.modules[moduleId]) {
    store.modules[moduleId] = {
      moduleId,
      startedAt: nowIso(),
      lastViewedAt: nowIso(),
      sections: {},
    };
  }
  return store.modules[moduleId];
}

function ensureSection(moduleProg: ModuleProgress, sectionId: string): SectionProgress {
  if (!moduleProg.sections[sectionId]) {
    moduleProg.sections[sectionId] = {
      sectionId,
      firstViewedAt: nowIso(),
      lastViewedAt: nowIso(),
      completed: false,
      timeSpentSec: 0,
    };
  }
  return moduleProg.sections[sectionId];
}

export function markSectionViewed(moduleId: string, sectionId: string) {
  const store = getTrainingProgressStore();
  const mod = ensureModule(store, moduleId);
  const sec = ensureSection(mod, sectionId);
  const t = nowIso();
  mod.lastViewedAt = t;
  mod.lastSectionId = sectionId;
  sec.lastViewedAt = t;
  if (!sec.firstViewedAt) sec.firstViewedAt = t;
  saveTrainingProgressStore(store);
}

export function addSectionTime(moduleId: string, sectionId: string, seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const store = getTrainingProgressStore();
  const mod = ensureModule(store, moduleId);
  const sec = ensureSection(mod, sectionId);
  sec.timeSpentSec = Math.max(0, (sec.timeSpentSec ?? 0) + seconds);
  sec.lastViewedAt = nowIso();
  mod.lastViewedAt = sec.lastViewedAt;
  mod.lastSectionId = sectionId;
  saveTrainingProgressStore(store);
}

export function setSectionCompleted(moduleId: string, sectionId: string, completed: boolean) {
  const store = getTrainingProgressStore();
  const mod = ensureModule(store, moduleId);
  const sec = ensureSection(mod, sectionId);
  sec.completed = completed;
  sec.completedAt = completed ? nowIso() : undefined;
  sec.lastViewedAt = nowIso();
  mod.lastViewedAt = sec.lastViewedAt;
  mod.lastSectionId = sectionId;
  saveTrainingProgressStore(store);
}

export function toggleSectionCompleted(moduleId: string, sectionId: string) {
  const store = getTrainingProgressStore();
  const mod = ensureModule(store, moduleId);
  const sec = ensureSection(mod, sectionId);
  setSectionCompleted(moduleId, sectionId, !sec.completed);
}

export function getModuleProgress(module: TrainingModule) {
  const store = getTrainingProgressStore();
  const mod = store.modules[module.id];
  const total = (module.sections ?? []).length;
  const completed = total
    ? (module.sections ?? []).filter((s) => mod?.sections?.[s.id]?.completed).length
    : 0;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return {
    moduleId: module.id,
    totalSections: total,
    completedSections: completed,
    percent,
    lastViewedAt: mod?.lastViewedAt ?? null,
    lastSectionId: mod?.lastSectionId ?? null,
    timeSpentSec: Object.values(mod?.sections ?? {}).reduce((sum, s) => sum + (s.timeSpentSec ?? 0), 0),
  };
}

export function getSectionProgress(moduleId: string, sectionId: string): SectionProgress | null {
  const store = getTrainingProgressStore();
  return store.modules[moduleId]?.sections?.[sectionId] ?? null;
}

export function clearTrainingProgress() {
  localStorage.removeItem(STORAGE_KEY);
}


