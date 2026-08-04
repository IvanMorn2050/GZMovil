import { apiFetch, apiFetchMultipart } from './api';
import { RolUsuario } from '../types';

const ROL_MAP: Record<RolUsuario, string> = {
  ciudadano:     'Civil',
  voluntario:    'Voluntario',
  coordinador:   'Especialista',
  administrador: 'Administrador',
};

export function loginApi(email: string, contrasena: string) {
  return apiFetch<{ token: string; usuario: any }>('/api/auth/login', {
    method: 'POST',
    body:   { email, contrasena },
    auth:   false,
  });
}

export function registerApi(
  nombre: string,
  email: string,
  contrasena: string,
  rol: RolUsuario,
) {
  return apiFetch<{ message: string }>('/api/auth/registro', {
    method: 'POST',
    body:   { nombre, email, contrasena, rol: ROL_MAP[rol] },
    auth:   false,
  });
}

export function getPerfilApi() {
  return apiFetch<any>('/api/perfil', { auth: true });
}

export function updatePerfilApi(nombre: string, email: string, telefono?: string) {
  return apiFetch<{ message: string; requiere_verificacion: boolean }>('/api/perfil', {
    method: 'PUT',
    body:   { nombre, email, telefono: telefono || null },
    auth:   true,
  });
}

export function postulacionApi(rol_solicitado: string, motivo: string) {
  return apiFetch<{ message: string }>('/api/perfil/postulacion', {
    method: 'POST',
    body:   { rol_solicitado, motivo },
    auth:   true,
  });
}

export function getHomeStatsApi() {
  return apiFetch<any>('/api/reportes/home', { auth: true });
}

export async function uploadMediaApi(uri: string): Promise<{ url: string; filename: string }> {
  const filename = uri.split('/').pop() ?? 'media.jpg';
  const ext      = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const isVideo  = ['mp4', 'mov'].includes(ext);
  const mimeType = isVideo ? 'video/mp4' : ext === 'png' ? 'image/png' : 'image/jpeg';

  const formData = new FormData();
  formData.append('archivo', { uri, name: filename, type: mimeType } as any);

  return apiFetchMultipart<{ url: string; filename: string }>('/api/media/upload', formData);
}

// ── Volunteer API ─────────────────────────────────────────────────────

export function actualizarUbicacionVolApi(lat: number, lng: number) {
  return apiFetch<{ message: string }>('/api/voluntario/ubicacion', {
    method: 'PUT', body: { lat, lng }, auth: true,
  });
}

export function getSolicitudesVolApi() {
  return apiFetch<{ solicitudes: any[] }>('/api/voluntario/solicitudes', { auth: true });
}

export function responderSolicitudApi(reporteId: number, respuesta: 'aceptar' | 'rechazar') {
  return apiFetch<{ message: string; estado: string }>(
    `/api/voluntario/solicitudes/${reporteId}/responder`,
    { method: 'POST', body: { respuesta }, auth: true },
  );
}

export function getMisAsignacionesApi() {
  return apiFetch<{ asignaciones: any[] }>('/api/voluntario/asignaciones', { auth: true });
}

export function actualizarEstadoAsignApi(asigId: number, estado: string) {
  return apiFetch<{ message: string; estado: string }>(
    `/api/voluntario/asignaciones/${asigId}/estado`,
    { method: 'PUT', body: { estado }, auth: true },
  );
}

export function agregarEvidenciaApi(asigId: number, contenido?: string, foto_url?: string) {
  return apiFetch<{ message: string; id: number }>(
    `/api/voluntario/asignaciones/${asigId}/evidencia`,
    { method: 'POST', body: { contenido: contenido || null, foto_url: foto_url || null }, auth: true },
  );
}

export function getEvidenciasApi(asigId: number) {
  return apiFetch<{ evidencias: any[] }>(
    `/api/voluntario/asignaciones/${asigId}/evidencias`,
    { auth: true },
  );
}

// ─────────────────────────────────────────────────────────────────────

export async function uploadFotoApi(uri: string): Promise<{ foto_url: string }> {
  const filename = uri.split('/').pop() ?? 'photo.jpg';
  const ext      = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const formData = new FormData();
  formData.append('foto', { uri, name: filename, type: mimeType } as any);

  return apiFetchMultipart<{ foto_url: string }>('/api/perfil/foto', formData);
}

// ── Certificaciones ──────────────────────────────────────────────────

export interface Certificacion {
  id: number;
  nombre_archivo: string;
  archivo_url: string;
  creado_en: string;
}

export function getCertificacionesApi() {
  return apiFetch<{ certificaciones: Certificacion[] }>('/api/perfil/certificaciones', { auth: true });
}

export async function uploadCertificacionApi(uri: string, nombreOriginal: string): Promise<Certificacion> {
  const formData = new FormData();
  formData.append('archivo', { uri, name: nombreOriginal, type: 'application/pdf' } as any);
  return apiFetchMultipart<Certificacion>('/api/perfil/certificaciones', formData);
}

export function deleteCertificacionApi(id: number) {
  return apiFetch<{ message: string }>(`/api/perfil/certificaciones/${id}`, { method: 'DELETE', auth: true });
}

// ── Administración ────────────────────────────────────────────────────

export interface PostulacionPendiente {
  id: number;
  rol_solicitado: string;
  estado: string;
  motivo: string;
  creado_en: string;
  id_usuario: number;
  nombre: string;
  email: string;
  telefono: string | null;
  foto_url: string | null;
  total_certificaciones: number;
}

export function getPostulacionesPendientesApi() {
  return apiFetch<{ postulaciones: PostulacionPendiente[] }>('/api/admin/postulaciones', { auth: true });
}

export function getCertificacionesPostulanteApi(postulacionId: number) {
  return apiFetch<{ certificaciones: Certificacion[] }>(
    `/api/admin/postulaciones/${postulacionId}/certificaciones`, { auth: true },
  );
}

export function responderPostulacionApi(postulacionId: number, respuesta: 'aprobar' | 'rechazar') {
  return apiFetch<{ message: string }>(
    `/api/admin/postulaciones/${postulacionId}/responder`,
    { method: 'POST', body: { respuesta }, auth: true },
  );
}
