import { apiRequest } from './client';

export async function getExtracted(args: { projectId: string; fileId: string }) {
  return apiRequest<{ success: true; extracted: any }>({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/vault/files/${encodeURIComponent(args.fileId)}/extracted`,
  });
}

export async function getChunks(args: { projectId: string; fileId: string; topK?: number; q?: string; page?: string; sheet?: string }) {
  const params = new URLSearchParams();
  params.set('topK', String(args.topK ?? 30));
  if (args.q) params.set('q', args.q);
  if (args.page) params.set('page', args.page);
  if (args.sheet) params.set('sheet', args.sheet);
  return apiRequest<{ success: true; results: any[]; count?: number }>({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/vault/files/${encodeURIComponent(args.fileId)}/chunks?${params.toString()}`,
  });
}

