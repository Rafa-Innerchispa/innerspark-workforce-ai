'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Role = 'admin' | 'employee' | null;

interface AuthUser {
  id: string;
  name: string;
  role: Role | 'superadmin';
  companyId: string;
  modules?: string[];
  email?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  allowedModuleIds: string[];
  login: (cedula: string, password?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  allowedModuleIds: [],
  login: async () => false,
  logout: () => {},
  isLoading: true,
  activeCompanyId: null,
  setActiveCompanyId: () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [allowedModuleIds, setAllowedModuleIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        setUser(null);
        setAllowedModuleIds([]);
        return;
      }
      const data = await res.json();
      const sessionUser = data.user as AuthUser;
      setUser(sessionUser);
      setAllowedModuleIds(data.allowedModuleIds || []);
      localStorage.setItem('femar_session', JSON.stringify(sessionUser));
      const active =
        localStorage.getItem('femar_active_company') ||
        (sessionUser.role === 'superadmin' ? 'pcdoctor' : sessionUser.companyId);
      setActiveCompanyIdState(active);
      localStorage.setItem('femar_active_company', active);
    } catch {
      setUser(null);
      setAllowedModuleIds([]);
    }
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setIsLoading(false));
  }, [refreshSession]);

  const setActiveCompanyId = (id: string) => {
    setActiveCompanyIdState(id);
    localStorage.setItem('femar_active_company', id);
    window.location.reload();
  };

  const login = async (cedula: string, password?: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula, password }),
      });

      if (res.ok) {
        await refreshSession();
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const logout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
    setAllowedModuleIds([]);
    setActiveCompanyIdState(null);
    localStorage.removeItem('femar_session');
    localStorage.removeItem('femar_active_company');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        allowedModuleIds,
        login,
        logout,
        isLoading,
        activeCompanyId,
        setActiveCompanyId,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
