export type RolUsuario = 'ciudadano' | 'voluntario' | 'coordinador' | 'administrador';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rol: RolUsuario;
  fotoUrl?: string;
  telefono?: string;
}

export type TipoDesastre =
  | 'Terremoto'
  | 'Inundación'
  | 'Incendio Forestal'
  | 'Huracán'
  | 'Deslizamiento'
  | 'Tsunami';

export type EstadoReporte = 'Activo' | 'En atención' | 'Resuelto';

export interface Reporte {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: TipoDesastre;
  estado: EstadoReporte;
  ubicacion: string;
  fecha: string;
  usuarioId: string;
  usuarioNombre: string;
  voluntariosIds: string[];
}

export interface Estadisticas {
  total: number;
  activos: number;
  enAtencion: number;
  resueltos: number;
}

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  CreateReport: undefined;
  ForoDetail: { id: number; titulo: string };
  MisReportes: undefined;
  RegistroOcurrencias: undefined;
  AdminPostulaciones: undefined;
};

export type TabParamList = {
  Inicio: undefined;
  Foro: undefined;
  Voluntario: undefined;
  Capacitaciones: undefined;
  Perfil: undefined;
};

export interface SolicitudVoluntario {
  id: number;
  titulo: string;
  descripcion: string;
  direccion_texto: string | null;
  latitud: number | null;
  longitud: number | null;
  prioridad: string;
  creado_en: string;
  tipo_desastre: string;
  emoji: string;
  reportado_por: string;
  distancia_km: number | null;
  voluntarios_asignados: number;
}

export interface AsignacionVoluntario {
  id: number;
  estado: 'Pendiente' | 'En_camino' | 'Atendiendo' | 'Finalizada';
  creado_en: string;
  actualizado_en: string;
  reporte_id: number;
  titulo: string;
  descripcion: string;
  direccion_texto: string | null;
  prioridad: string;
  latitud: number | null;
  longitud: number | null;
  tipo_desastre: string;
  emoji: string;
}

export interface EvidenciaAsignacion {
  id: number;
  contenido: string | null;
  foto_url: string | null;
  creado_en: string;
}
