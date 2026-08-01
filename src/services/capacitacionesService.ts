import { apiFetch } from './api';

export async function getCapacitaciones() {
  const d = await apiFetch<{ capacitaciones: any[] }>('/api/capacitaciones', { auth: false });
  return d.capacitaciones;
}

export async function getProximas() {
  const d = await apiFetch<{ sesiones: any[] }>('/api/capacitaciones/proximas', { auth: false });
  return d.sesiones;
}

export async function getOrganizaciones() {
  const d = await apiFetch<{ organizaciones: any[] }>('/api/capacitaciones/organizaciones', { auth: false });
  return d.organizaciones;
}

export async function inscribirse(capId: number) {
  return apiFetch(`/api/capacitaciones/${capId}/inscribir`, { method: 'POST', auth: true });
}
