import type { CatalogBatteryRow } from '../types/batteryCatalog';
import { apiRequest } from './client';

export type BatteriesCatalogResponse = {
  success: true;
  batteries: CatalogBatteryRow[];
};

export async function getBatteriesCatalog() {
  return apiRequest<BatteriesCatalogResponse>({ url: '/api/batteries/catalog' });
}

export async function listLibraryBatteries() {
  return apiRequest<any>({ url: '/api/library/batteries' });
}

export async function createLibraryBattery(args: { payload: unknown; adminToken: string }) {
  return apiRequest<any>({
    url: '/api/library/batteries',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': args.adminToken,
    },
    body: JSON.stringify(args.payload),
  });
}

export async function deleteLibraryBattery(args: { id: string; adminToken: string }) {
  return apiRequest<any>({
    url: `/api/library/batteries/${encodeURIComponent(args.id)}`,
    method: 'DELETE',
    headers: {
      'x-admin-token': args.adminToken,
    },
  });
}

