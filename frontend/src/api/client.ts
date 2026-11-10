import { store } from '../store';
import { logout } from '../store/authSlice';
import { translate } from '../i18n';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function authHeaders(): Record<string, string> {
  const { auth, ui } = store.getState();
  // Accept-Language — server xatolarni shu tilda qaytaradi
  return { 'Accept-Language': ui.lang, ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}) };
}

async function send(path: string, method: Method, body?: unknown): Promise<Response> {
  const headers = authHeaders();
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, translate(store.getState().ui.lang, 'err.network'));
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && headers.Authorization) store.dispatch(logout());
    const lang = store.getState().ui.lang;
    const detail = typeof data.detail === 'string' ? data.detail : translate(lang, res.status >= 500 ? 'err.server' : 'err.generic');
    throw new ApiError(res.status, detail);
  }
  return res;
}

/** Typed fetch: JSON, Bearer token, FastAPI `detail` xatolari. */
export async function request<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
  const res = await send(path, method, body);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Faylni yuklab olish (masalan CSV eksport). */
export async function download(path: string, filename: string): Promise<void> {
  const blob = await (await send(path, 'GET')).blob();
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};
