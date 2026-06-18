import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Usuario, RolUsuario } from '../types';
import { loginService, registerService } from '../services/authService';

interface AuthContextType {
  usuario: Usuario | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  register: (
    nombre: string,
    email: string,
    password: string,
    rol: RolUsuario
  ) => { success: boolean; message: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const login = (email: string, password: string): boolean => {
    const user = loginService(email, password);
    if (user) {
      setUsuario(user);
      return true;
    }
    return false;
  };

  const logout = () => setUsuario(null);

  const register = (nombre: string, email: string, password: string, rol: RolUsuario) =>
    registerService(nombre, email, password, rol);

  return (
    <AuthContext.Provider value={{ usuario, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
