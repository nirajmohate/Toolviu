// The browser calls /api/* on the same origin (Next.js rewrites it to the Express API).
// Set NEXT_PUBLIC_API_URL to call the API directly instead.
const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export const apiUrl = (path: string) => `${base}${path}`;

export type ApiError = { code: string; message: string };

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.error?.message || `Request failed (${res.status}).`;
    throw Object.assign(new Error(message), { code: json?.error?.code, status: res.status });
  }
  return json as T;
}
