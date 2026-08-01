import { apiFetch } from './api';

export async function getPublicaciones() {
  const d = await apiFetch<{ publicaciones: any[] }>('/api/foro', { auth: false });
  return d.publicaciones;
}
