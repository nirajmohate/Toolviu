import { apiFetch } from './api';

export async function createShare(tool: string, payload: unknown): Promise<{ id: string; url: string; expiresInDays: number }> {
  const data = JSON.stringify(payload);
  const res = await apiFetch<{ id: string; expiresInDays: number }>('/api/share', {
    method: 'POST',
    body: JSON.stringify({ tool, data }),
  });
  return { ...res, url: `${window.location.origin}/tools/${tool}?share=${res.id}` };
}

export async function loadShare<T>(tool: string, id: string): Promise<T> {
  const res = await apiFetch<{ tool: string; data: string }>(`/api/share/${encodeURIComponent(id)}`);
  if (res.tool !== tool) throw new Error('This share link belongs to a different tool.');
  return JSON.parse(res.data) as T;
}
