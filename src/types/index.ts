export type RolUsuario = 'ciudadano' | 'voluntario' | 'coordinador';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rol: RolUsuario;
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
};

export type TabParamList = {
  Inicio: undefined;
  Foro: undefined;
  Capacitaciones: undefined;
  Perfil: undefined;
};
