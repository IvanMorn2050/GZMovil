import { apiFetch } from './api';

export async function getAlertas() {
  const d = await apiFetch<{ alertas: any[] }>('/api/alertas', { auth: false });
  return d.alertas;
}
