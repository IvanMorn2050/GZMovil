import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants/api';

export const TOKEN_KEY = '@gz_token';

export const getToken  = ()            => AsyncStorage.getItem(TOKEN_KEY);
export const saveToken = (t: string)   => AsyncStorage.setItem(TOKEN_KEY, t);
export const clearToken = ()           => AsyncStorage.removeItem(TOKEN_KEY);

async function headers(auth: boolean): Promise<HeadersInit> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
  }
  return h;
}

export async function apiFetch<T = any>(
  path: string,
  opts: { method?: string; body?: object; auth?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: await headers(auth),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Error ${res.status}`);
  return data as T;
}

// Para subir archivos como multipart/form-data (no establece Content-Type manualmente)
export async function apiFetchMultipart<T = any>(
  path: string,
  formData: FormData,
): Promise<T> {
  const token = await getToken();
  const hdrs: Record<string, string> = {};
  if (token) hdrs['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: hdrs,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Error ${res.status}`);
  return data as T;
}
