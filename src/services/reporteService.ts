import { Reporte, TipoDesastre, Estadisticas } from '../types';

const reportes: Reporte[] = [
  {
    id: 'r1',
    titulo: 'Sismo de 6.4 grados en zona costera',
    descripcion:
      'Se registró un temblor de magnitud 6.4 con epicentro a 15 km de la costa. Hay daños estructurales en colonias cercanas y se reportan personas atrapadas bajo escombros.',
    tipo: 'Terremoto',
    estado: 'Activo',
    ubicacion: 'Oaxaca, México',
    fecha: '2026-06-17',
    usuarioId: 'u3',
    usuarioNombre: 'Marco Herrera',
    voluntariosIds: ['u2'],
  },
  {
    id: 'r2',
    titulo: 'Desbordamiento del río Grijalva',
    descripcion:
      'Las lluvias de los últimos 3 días provocaron el desbordamiento del río. Aproximadamente 400 familias han sido evacuadas de la zona baja de la ciudad.',
    tipo: 'Inundación',
    estado: 'En atención',
    ubicacion: 'Tabasco, México',
    fecha: '2026-06-16',
    usuarioId: 'u1',
    usuarioNombre: 'Carlos Ramírez',
    voluntariosIds: ['u2', 'u1'],
  },
  {
    id: 'r3',
    titulo: 'Incendio forestal avanza hacia comunidades',
    descripcion:
      'El incendio iniciado en la Sierra Madre lleva 48 horas activo y amenaza con alcanzar 3 comunidades rurales. Se necesitan voluntarios con equipo de protección.',
    tipo: 'Incendio Forestal',
    estado: 'Activo',
    ubicacion: 'Jalisco, México',
    fecha: '2026-06-15',
    usuarioId: 'u3',
    usuarioNombre: 'Marco Herrera',
    voluntariosIds: [],
  },
  {
    id: 'r4',
    titulo: 'Deslizamiento de laderas por lluvias',
    descripcion:
      'Fuertes lluvias provocaron deslizamiento de tierra en la carretera principal. Dos viviendas quedaron sepultadas parcialmente.',
    tipo: 'Deslizamiento',
    estado: 'Resuelto',
    ubicacion: 'Chiapas, México',
    fecha: '2026-06-14',
    usuarioId: 'u1',
    usuarioNombre: 'Carlos Ramírez',
    voluntariosIds: ['u2', 'u1', 'u3'],
  },
];

export function getReportes(): Reporte[] {
  return [...reportes].reverse();
}

export function crearReporte(
  titulo: string,
  descripcion: string,
  tipo: TipoDesastre,
  ubicacion: string,
  usuarioId: string,
  usuarioNombre: string
): Reporte {
  const nuevo: Reporte = {
    id: `r${Date.now()}`,
    titulo,
    descripcion,
    tipo,
    estado: 'Activo',
    ubicacion,
    fecha: new Date().toISOString().split('T')[0],
    usuarioId,
    usuarioNombre,
    voluntariosIds: [],
  };
  reportes.push(nuevo);
  return nuevo;
}

export function toggleAtender(reporteId: string, voluntarioId: string): boolean {
  const r = reportes.find((x) => x.id === reporteId);
  if (!r) return false;
  const idx = r.voluntariosIds.indexOf(voluntarioId);
  if (idx === -1) {
    r.voluntariosIds.push(voluntarioId);
    if (r.estado === 'Activo') r.estado = 'En atención';
    return true;
  } else {
    r.voluntariosIds.splice(idx, 1);
    if (r.voluntariosIds.length === 0 && r.estado === 'En atención') r.estado = 'Activo';
    return false;
  }
}

export function getEstadisticas(): Estadisticas {
  return {
    total: reportes.length,
    activos: reportes.filter((r) => r.estado === 'Activo').length,
    enAtencion: reportes.filter((r) => r.estado === 'En atención').length,
    resueltos: reportes.filter((r) => r.estado === 'Resuelto').length,
  };
}
