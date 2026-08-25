'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Role = 'master_admin' | 'tenant_admin' | 'hr' | 'payroll_approver' | 'supervisor' | 'employee';

interface AuthUser {
  id: string;
  name: string;
  role: Role;
  companyId: string;
  modules?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  login: (cedula: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: async () => {},
  isLoading: true,
  activeCompanyId: null,
  setActiveCompanyId: () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);

  const refreshSession = async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!res.ok) {
        setUser(null);
        setActiveCompanyIdState(null);
        return;
      }
      const data = await res.json();
      const nextUser = data.user as AuthUser;
      setUser(nextUser);
      if (nextUser.role === 'master_admin') {
        setActiveCompanyIdState(localStorage.getItem('workforce_active_company') || nextUser.companyId);
      } else {
        setActiveCompanyIdState(nextUser.companyId);
        localStorage.removeItem('workforce_active_company');
      }
    } catch {
      setUser(null);
      setActiveCompanyIdState(null);
    }
  };

  useEffect(() => {
    void refreshSession().finally(() => setIsLoading(false));
  }, []);

  const setActiveCompanyId = (id: string) => {
    if (user?.role !== 'master_admin') return;
    setActiveCompanyIdState(id);
    localStorage.setItem('workforce_active_company', id);
  };

  const login = async (cedula: string, password?: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula, password }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setUser(data.user as AuthUser);
      setActiveCompanyIdState(data.user.companyId);
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setActiveCompanyIdState(null);
      localStorage.removeItem('workforce_active_company');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, activeCompanyId, setActiveCompanyId, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
