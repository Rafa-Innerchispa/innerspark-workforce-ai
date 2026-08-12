'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockEmployees } from '@/lib/mockData';

type Role = 'admin' | 'employee' | null;

interface AuthUser {
  id: string;
  name: string;
  role: Role | 'superadmin';
  companyId: string;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);

  useEffect(() => {
    // Check local storage for session on mount
    const stored = localStorage.getItem('femar_session');
    if (stored) {
      try {
        const parsedUser = JSON.parse(stored);
        setUser(parsedUser);
        setActiveCompanyIdState(localStorage.getItem('femar_active_company') || parsedUser.companyId);
      } catch (e) {
        console.error('Invalid session', e);
      }
    }
    setIsLoading(false);
  }, []);

  const setActiveCompanyId = (id: string) => {
    setActiveCompanyIdState(id);
    localStorage.setItem('femar_active_company', id);
    // Reload page to re-fetch data based on new company
    window.location.reload();
  };

  const login = async (cedula: string, password?: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula, password })
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('femar_session', JSON.stringify(data.user));
        
        // Handle superadmin active company (defaults to femar or their assigned company)
        if (data.user.role === 'superadmin') {
          setActiveCompanyIdState('femar'); // Default to first company
          localStorage.setItem('femar_active_company', 'femar');
        } else {
          setActiveCompanyIdState(data.user.companyId);
          localStorage.setItem('femar_active_company', data.user.companyId);
        }
        
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
    localStorage.removeItem('femar_active_company');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, activeCompanyId, setActiveCompanyId }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
