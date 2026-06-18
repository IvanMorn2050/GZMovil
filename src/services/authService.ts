import { Usuario, RolUsuario } from '../types';

const usuarios: Usuario[] = [
  {
    id: 'u1',
    nombre: 'Carlos Ramírez',
    email: 'carlos@guardianzero.com',
    password: '1234',
    rol: 'coordinador',
  },
  {
    id: 'u2',
    nombre: 'Laura Mendoza',
    email: 'laura@guardianzero.com',
    password: '1234',
    rol: 'voluntario',
  },
  {
    id: 'u3',
    nombre: 'Marco Herrera',
    email: 'marco@guardianzero.com',
    password: '1234',
    rol: 'ciudadano',
  },
];

export function loginService(email: string, password: string): Usuario | null {
  return usuarios.find((u) => u.email === email && u.password === password) ?? null;
}

export function registerService(
  nombre: string,
  email: string,
  password: string,
  rol: RolUsuario
): { success: boolean; message: string } {
  if (usuarios.find((u) => u.email === email)) {
    return { success: false, message: 'El correo ya está registrado.' };
  }
  usuarios.push({ id: `u${Date.now()}`, nombre, email, password, rol });
  return { success: true, message: 'Registro exitoso.' };
}
