import { expect } from 'vitest';

export function enableDemoJwtForTests() {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.EVERWATT_DEMO_AUTH = '1';
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';
}

export async function getDemoBearerToken(app: any, email = 'test@example.com', userId?: string): Promise<string> {
  const res = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ...(userId ? { userId } : {}) }),
  });
  expect(res.status).toBe(200);
  const json: any = await res.json();
  expect(json?.success).toBe(true);
  const token = String(json?.token || '');
  expect(token).toBeTruthy();
  return `Bearer ${token}`;
}

