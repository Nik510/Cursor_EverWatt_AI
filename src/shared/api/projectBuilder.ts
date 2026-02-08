import { apiRequest } from './client';

export type Project = any;
export type ProjectGraph = any;
export type VaultFile = any;

export async function getProject(projectId: string) {
  return apiRequest<{ success: true; project: Project }>({
    url: `/api/projects/${encodeURIComponent(projectId)}`,
  });
}

export async function listVaultFiles(projectId: string) {
  return apiRequest<{ success: true; files: VaultFile[] }>({
    url: `/api/projects/${encodeURIComponent(projectId)}/vault/files`,
  });
}

export async function uploadVaultFile(projectId: string, file: File) {
  const fd = new FormData();
  fd.append('file', file);
  return apiRequest<{ success: true; file: VaultFile; project: Project }>({
    url: `/api/projects/${encodeURIComponent(projectId)}/vault/upload`,
    method: 'POST',
    body: fd,
  });
}

export async function getGraph(projectId: string) {
  return apiRequest<{ success: true; graph: ProjectGraph }>({
    url: `/api/projects/${encodeURIComponent(projectId)}/graph`,
  });
}

export async function putGraph(projectId: string, graph: any) {
  return apiRequest<{ success: true; graph: ProjectGraph }>({
    url: `/api/projects/${encodeURIComponent(projectId)}/graph`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ graph }),
  });
}

export async function analyzeProject(projectId: string) {
  return apiRequest<{ success: true; graph: ProjectGraph; draft?: any }>({
    url: `/api/projects/${encodeURIComponent(projectId)}/analyze`,
    method: 'POST',
  });
}

export async function getDecisionMemory(projectId: string) {
  return apiRequest<{ success: true; items: any[] }>({
    url: `/api/projects/${encodeURIComponent(projectId)}/decision-memory`,
  });
}

export async function addDecisionMemory(projectId: string, body: any) {
  return apiRequest<any>({
    url: `/api/projects/${encodeURIComponent(projectId)}/decision-memory`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function deleteDecisionMemory(projectId: string, memoryId: string) {
  return apiRequest<any>({
    url: `/api/projects/${encodeURIComponent(projectId)}/decision-memory/${encodeURIComponent(memoryId)}`,
    method: 'DELETE',
  });
}

export async function ingestWorkbookToInbox(projectId: string, file: File) {
  const fd = new FormData();
  fd.append('file', file);
  return apiRequest<{ success: true; file?: VaultFile; graph?: ProjectGraph; createdCount?: number; skippedCount?: number; inboxCount?: number }>({
    url: `/api/projects/${encodeURIComponent(projectId)}/ingest/workbook`,
    method: 'POST',
    body: fd,
  });
}

export async function listInbox(projectId: string) {
  return apiRequest<{ success: true; inbox: any[] }>({
    url: `/api/projects/${encodeURIComponent(projectId)}/graph/inbox`,
  });
}

export async function decideInboxItem(projectId: string, inboxItemId: string, args: { decision: 'ACCEPT' | 'REJECT'; reason: string }) {
  return apiRequest<{ success: true; graph: ProjectGraph }>({
    url: `/api/projects/${encodeURIComponent(projectId)}/graph/inbox/${encodeURIComponent(inboxItemId)}/decide`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
}

export async function listProposals(projectId: string) {
  return apiRequest<{ success: true; proposals: any[] }>({
    url: `/api/projects/${encodeURIComponent(projectId)}/proposals`,
  });
}

export async function getProposalPack(projectId: string, proposalPackId: string) {
  return apiRequest<{ success: true; pack: any }>({
    url: `/api/projects/${encodeURIComponent(projectId)}/proposals/${encodeURIComponent(proposalPackId)}`,
  });
}

export async function importProposalPack(projectId: string, pack: any) {
  return apiRequest<{ success: true; proposalPackId: string }>({
    url: `/api/projects/${encodeURIComponent(projectId)}/proposals/import`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pack }),
  });
}

export async function commitProposalScenario(projectId: string, proposalPackId: string, scenarioId: string) {
  return apiRequest<any>({
    url: `/api/projects/${encodeURIComponent(projectId)}/proposals/${encodeURIComponent(proposalPackId)}/commit`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId }),
  });
}

