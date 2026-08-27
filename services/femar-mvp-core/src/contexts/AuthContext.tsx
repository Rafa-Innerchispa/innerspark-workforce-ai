'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Role = 'admin' | 'employee' | null;

interface AuthUser {
  id: string;
  name: string;
  role: Role | 'superadmin';
  companyId: string;
  modules?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  login: (cedula: string, password?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {},
  isLoading: true,
  activeCompanyId: null,
  setActiveCompanyId: () => {},
});

function persistActiveCompany(id: string | null) {
  if (id) {
    localStorage.setItem('femar_active_company', id);
    document.cookie = `workforce_active_company=${encodeURIComponent(id)}; Path=/; SameSite=Lax`;
  } else {
    localStorage.removeItem('femar_active_company');
    document.cookie = 'workforce_active_company=; Path=/; Max-Age=0; SameSite=Lax';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('femar_session');
    if (stored) {
      try {
        const parsedUser = JSON.parse(stored);
        const restoredCompany = localStorage.getItem('femar_active_company') || parsedUser.companyId;
        setUser(parsedUser);
        setActiveCompanyIdState(restoredCompany);
        persistActiveCompany(restoredCompany);
      } catch (e) {
        console.error('Invalid session', e);
      }
    }
    setIsLoading(false);
  }, []);

  const setActiveCompanyId = (id: string) => {
    setActiveCompanyIdState(id);
    persistActiveCompany(id);
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
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('femar_session', JSON.stringify(data.user));

        const companyId = data.user.role === 'superadmin' ? 'femar' : data.user.companyId;
        setActiveCompanyIdState(companyId);
        persistActiveCompany(companyId);
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setActiveCompanyIdState(null);
    localStorage.removeItem('femar_session');
    persistActiveCompany(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, activeCompanyId, setActiveCompanyId }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
