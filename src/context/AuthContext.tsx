import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Usuario, RolUsuario } from '../types';
import { loginApi, registerApi, getPerfilApi } from '../services/authService';
import { saveToken, clearToken, getToken } from '../services/api';

interface LoginResult   { ok: boolean; error?: string }
interface RegisterResult { success: boolean; message: string }

interface AuthContextType {
  usuario:          Usuario | null;
  cargando:         boolean;
  login:            (email: string, password: string) => Promise<LoginResult>;
  logout:           () => Promise<void>;
  register:         (nombre: string, email: string, password: string, rol: RolUsuario) => Promise<RegisterResult>;
  actualizarUsuario:(datos: Partial<Pick<Usuario, 'nombre' | 'fotoUrl' | 'telefono'>>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario,  setUsuario]  = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const p = await getPerfilApi();
          setUsuario(mapUsuario(p));
        }
      } catch {
        await clearToken();
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await loginApi(email, password);
      await saveToken(res.token);
      setUsuario(mapUsuario(res.usuario));
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Credenciales incorrectas' };
    }
  };

  const logout = async () => {
    await clearToken();
    setUsuario(null);
  };

  const register = async (
    nombre: string,
    email: string,
    password: string,
    rol: RolUsuario,
  ): Promise<RegisterResult> => {
    try {
      const res = await registerApi(nombre, email, password, rol);
      return { success: true, message: res.message };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error al registrar' };
    }
  };

  const actualizarUsuario = (datos: Partial<Pick<Usuario, 'nombre' | 'fotoUrl' | 'telefono'>>) => {
    setUsuario(prev => prev ? { ...prev, ...datos } : prev);
  };

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout, register, actualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}

function mapRol(apiRol: string): RolUsuario {
  if (apiRol === 'Voluntario')  return 'voluntario';
  if (apiRol === 'Especialista' || apiRol === 'Administrador') return 'coordinador';
  return 'ciudadano';
}

function mapUsuario(data: any): Usuario {
  return {
    id:       String(data.id),
    nombre:   data.nombre,
    email:    data.email,
    password: '',
    rol:      mapRol(data.rol),
    fotoUrl:  data.foto_url ?? undefined,
    telefono: data.telefono ?? undefined,
  };
}
