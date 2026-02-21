import type { SectionInsight, WeatherInsight } from '../types/ai-insights';

async function readJson(res: Response): Promise<any> {
  return res.json().catch(() => ({}));
}

function withAdminHeader(token?: string): HeadersInit | undefined {
  const t = String(token || '').trim();
  return t ? { 'x-admin-token': t } : undefined;
}

export async function fetchSectionInsight(args: {
  adminToken?: string;
  sectionId: string;
  sectionTitle?: string;
  sectionData: Record<string, unknown>;
}): Promise<SectionInsight> {
  const res = await fetch('/api/ai/insights/section', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...withAdminHeader(args.adminToken) },
    body: JSON.stringify({ sectionId: args.sectionId, sectionTitle: args.sectionTitle, sectionData: args.sectionData }),
  });
  const data = await readJson(res);
  if (!res.ok || !data?.success) throw new Error(data?.error || `AI request failed (${res.status})`);
  return data.insight as SectionInsight;
}

export async function fetchBatteryInsight(args: {
  adminToken?: string;
  batteries: any[];
  peakProfile: any;
}): Promise<SectionInsight> {
  const res = await fetch('/api/ai/insights/battery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...withAdminHeader(args.adminToken) },
    body: JSON.stringify({ batteries: args.batteries, peakProfile: args.peakProfile }),
  });
  const data = await readJson(res);
  if (!res.ok || !data?.success) throw new Error(data?.error || `AI request failed (${res.status})`);
  return data.insight as SectionInsight;
}

export async function fetchWeatherInsight(args: {
  adminToken?: string;
  correlationData: any;
}): Promise<WeatherInsight> {
  const res = await fetch('/api/ai/insights/weather', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...withAdminHeader(args.adminToken) },
    body: JSON.stringify({ correlationData: args.correlationData }),
  });
  const data = await readJson(res);
  if (!res.ok || !data?.success) throw new Error(data?.error || `AI request failed (${res.status})`);
  return data.insight as WeatherInsight;
}

export async function fetchExecutiveNarrative(args: { adminToken?: string; analysisData: any }): Promise<string> {
  const res = await fetch('/api/ai/insights/executive-narrative', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...withAdminHeader(args.adminToken) },
    body: JSON.stringify({ analysisData: args.analysisData }),
  });
  const data = await readJson(res);
  if (!res.ok || !data?.success) throw new Error(data?.error || `AI request failed (${res.status})`);
  return String(data.text || '');
}

export async function fetchAiHealth(): Promise<{ configured: boolean; dbEnabled: boolean }> {
  const res = await fetch('/api/ai/health');
  const data = await readJson(res);
  return { configured: !!data?.configured, dbEnabled: !!data?.dbEnabled };
}

