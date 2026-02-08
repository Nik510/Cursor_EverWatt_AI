import { apiRequest } from './client';

export async function runCalculator(args: { kind: 'battery' | 'hvac'; projectId: string }) {
  return apiRequest<{ success: true; pack: any }>({
    url: `/api/calc/${encodeURIComponent(args.kind)}/run`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: args.projectId }),
  });
}

