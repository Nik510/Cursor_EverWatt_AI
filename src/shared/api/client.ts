export type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

async function readJsonSafe(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function apiRequest<T>(args: {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}): Promise<T> {
  const res = await fetch(args.url, {
    method: args.method || 'GET',
    headers: args.headers,
    body: args.body,
  });
  const data = await readJsonSafe(res);
  if (!res.ok || (data && typeof data === 'object' && data.success === false)) {
    const msg = (data && typeof data === 'object' && (data.error || data.message)) ? String(data.error || data.message) : `Request failed (${res.status})`;
    const err: ApiError = { status: res.status, message: msg, details: data };
    throw Object.assign(new Error(msg), err);
  }
  return data as T;
}

