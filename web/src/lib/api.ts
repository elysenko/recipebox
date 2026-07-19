// budget: 400 lines
// Same-origin API client: nginx proxies /api/ -> backend:3000 in every deployed
// environment; vite dev-server proxies it locally. Never hardcode a backend host.
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  if (!res.ok) {
    // Surface the FastAPI `detail` message so UI error banners stay meaningful.
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && typeof body.detail === 'string') message = body.detail;
    } catch {
      /* non-JSON error body — keep the status-based message */
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
