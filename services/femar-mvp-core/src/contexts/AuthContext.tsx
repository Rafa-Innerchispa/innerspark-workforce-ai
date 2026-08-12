'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockEmployees } from '@/lib/mockData';

type Role = 'admin' | 'employee' | null;

interface AuthUser {
  id: string;
  name: string;
  role: Role;
  companyId: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (cedula: string) => boolean;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => false,
  logout: () => {},
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for session on mount
    const stored = localStorage.getItem('femar_session');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error('Invalid session', e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (cedula: string) => {
    // Admin check
    if (cedula === 'admin' || cedula === '1717016487') {
      const adminUser: AuthUser = { id: cedula, name: 'Administrador (Xavier)', role: 'admin', companyId: 'femar' };
      setUser(adminUser);
      localStorage.setItem('femar_session', JSON.stringify(adminUser));
      return true;
    }
    if (cedula === 'admin_iapro') {
      const adminUser: AuthUser = { id: cedula, name: 'Administrador (IA PRO)', role: 'admin', companyId: 'iapro' };
      setUser(adminUser);
      localStorage.setItem('femar_session', JSON.stringify(adminUser));
      return true;
    }
    if (cedula === 'admin_pcdoctor') {
      const adminUser: AuthUser = { id: cedula, name: 'Administrador (PC DOCTOR)', role: 'admin', companyId: 'pcdoctor' };
      setUser(adminUser);
      localStorage.setItem('femar_session', JSON.stringify(adminUser));
      return true;
    }

    // Employee check
    const emp = mockEmployees.find(e => e.id === cedula);
    if (emp) {
      const empUser: AuthUser = { id: emp.id, name: emp.name, role: 'employee', companyId: emp.companyId || 'femar' };
      setUser(empUser);
      localStorage.setItem('femar_session', JSON.stringify(empUser));
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('femar_session');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
