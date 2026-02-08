import type { AcademyRoleId } from '../data/academy/role-paths';

const STORAGE_KEY = 'everwatt_academy_role_v1';

export function getSavedAcademyRole(): AcademyRoleId | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return (raw as AcademyRoleId) || null;
  } catch {
    return null;
  }
}

export function setSavedAcademyRole(role: AcademyRoleId) {
  try {
    localStorage.setItem(STORAGE_KEY, role);
  } catch {
    // ignore
  }
}

