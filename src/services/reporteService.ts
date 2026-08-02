import { apiFetch } from './api';
import { Reporte, TipoDesastre, Estadisticas } from '../types';

// IDs del catálogo tipo_desastre insertados en el script SQL
const TIPO_ID: Record<TipoDesastre, number> = {
  'Terremoto':         1,
  'Inundación':        2,
  'Incendio Forestal': 3,
  'Huracán':           4,
  'Deslizamiento':     5,
  'Tsunami':           6,
};

function apiEstatus(e: string): Reporte['estado'] {
  if (e === 'En_Proceso') return 'En atención';
  if (e === 'Finalizado') return 'Resuelto';
  return 'Activo';
}

export interface MiReporte {
  id: number;
  titulo: string;
  estatus: 'Pendiente' | 'En_Proceso' | 'Finalizado';
  prioridad: string;
  creado_en: string;
  tipo_desastre: string | null;
  emoji: string | null;
}

export async function getMisReportes(): Promise<MiReporte[]> {
  const d = await apiFetch<{ reportes: MiReporte[] }>('/api/reportes/mis-reportes', { auth: true });
  return d.reportes;
}

export async function getReportes(): Promise<Reporte[]> {
  const data = await apiFetch<{ reportes: any[] }>('/api/reportes', { auth: true });
  return data.reportes.map((r) => ({
    id:            String(r.id),
    titulo:        r.titulo,
    descripcion:   r.descripcion || '',
    tipo:          (r.tipo_desastre || 'Terremoto') as TipoDesastre,
    estado:        apiEstatus(r.estatus),
    ubicacion:     r.direccion_texto || '',
    fecha:         (r.creado_en || '').split('T')[0],
    usuarioId:     '',
    usuarioNombre: r.usuario_nombre || '',
    voluntariosIds: [],
  }));
}

export async function getEstadisticas(): Promise<Estadisticas> {
  const d = await apiFetch<any>('/api/reportes/estadisticas', { auth: true });
  return {
    total:      Number(d.total)      || 0,
    activos:    Number(d.pendientes) || 0,
    enAtencion: Number(d.en_proceso) || 0,
    resueltos:  Number(d.finalizados)|| 0,
  };
}

export async function crearReporte(
  titulo: string,
  descripcion: string,
  tipo: TipoDesastre,
  ubicacion: string,
  _usuarioId: string,
  _usuarioNombre: string,
  latitud?: number,
  longitud?: number,
): Promise<void> {
  await apiFetch('/api/reportes', {
    method: 'POST',
    body: {
      titulo,
      descripcion,
      id_tipo_desastre: TIPO_ID[tipo],
      direccion_texto:  ubicacion,
      prioridad:        'Media',
      latitud:          latitud  ?? null,
      longitud:         longitud ?? null,
    },
    auth: true,
  });
}
