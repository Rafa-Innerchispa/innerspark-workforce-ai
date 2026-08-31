'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/login';
  const isRegisterPage = pathname === '/register';
  const isModuleSelection = pathname === '/modules';
  const isTagsPage = pathname === '/tags';
  const isInnerOSLogin = pathname === '/app/login';
  const isInnerOSRegister = pathname === '/app/register';
  const isInnerOSOnboarding = pathname.startsWith('/app/onboarding/');
  const isInnerOSHandoff = pathname.startsWith('/app/auth/handoff');
  const isInnerOSDesk = pathname === '/app/desk';
  const isInnerOSPending = pathname === '/app/pending-approval';
  const isInnerOSModules = pathname === '/app/modules';
  const isInnerOSJudge = pathname === '/app/judge';
  const isInnerOSApp = pathname.startsWith('/app/');
  const isInnerOSPublicRoute =
    isInnerOSLogin || isInnerOSRegister || isInnerOSOnboarding || isInnerOSPending || isInnerOSHandoff;
  const isFullPage =
    isLoginPage ||
    isRegisterPage ||
    isModuleSelection ||
    isTagsPage ||
    isInnerOSLogin ||
    isInnerOSRegister ||
    isInnerOSOnboarding ||
    isInnerOSPending ||
    isInnerOSHandoff ||
    isInnerOSDesk ||
    isInnerOSModules ||
    isInnerOSJudge;

  useEffect(() => {
    if (!isLoading) {
      if (!user && !isLoginPage && !isRegisterPage && !isInnerOSPublicRoute) {
        router.push(isInnerOSApp ? '/app/login' : '/login');
      } else if (user && (isLoginPage || isRegisterPage)) {
        if (user.role === 'admin' || user.role === 'superadmin') {
          router.push('/modules');
        } else {
          router.push('/mobile');
        }
      } else if (user && isInnerOSLogin) {
        const cid = String(user.companyId || '').toLowerCase();
        if (cid === 'hackathon') {
          router.push('/app/judge');
        } else {
          router.push('/app/modules');
        }
      } else if (user && isInnerOSModules && String(user.companyId || '').toLowerCase() === 'hackathon') {
        router.replace('/app/judge');
      } else if (user && user.role === 'employee' && !isInnerOSApp && pathname !== '/mobile') {
        router.push('/mobile');
      }
    }
  }, [user, isLoading, isLoginPage, isRegisterPage, isInnerOSPublicRoute, isInnerOSApp, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If we are on full pages, don't show sidebar
  if (isFullPage) {
    return <>{children}</>;
  }

  // If not logged in, but not on login (waiting for redirect), show nothing to prevent flashes
  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 h-screen overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
