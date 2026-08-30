import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ModuleId, resolveAllowedModuleIds } from '@/lib/entityEntitlements';

export type SessionUser = {
  id: string;
  cedula?: string;
  name?: string;
  email?: string;
  role: string;
  companyId: string;
  status?: string;
  modules?: string[];
  allowedModuleIds: ModuleId[];
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session_token')?.value;
  if (!userId) return null;

  const doc = await db.collection('users').doc(userId).get();
  if (!doc.exists) return null;

  const data = doc.data() || {};
  if (data.status === 'PENDING' || data.status === 'REJECTED') return null;

  const role = String(data.role || 'employee');
  const companyId = String(data.companyId || '');
  const allowedModuleIds = resolveAllowedModuleIds(companyId, role, data.modules);

  return {
    id: doc.id,
    cedula: data.cedula,
    name: data.name,
    email: data.email,
    role,
    companyId,
    status: data.status,
    modules: data.modules,
    allowedModuleIds,
  };
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json({ ok: false, error: message }, { status: 403 });
}

export async function requireSession(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse('Session required');
  return user;
}

export async function requireSuperAdmin(): Promise<SessionUser | NextResponse> {
  const user = await requireSession();
  if (user instanceof NextResponse) return user;
  if (user.role !== 'superadmin') return forbiddenResponse('Superadmin required');
  return user;
}

export function assertModuleAccess(user: SessionUser, moduleId: string): NextResponse | null {
  if (!user.allowedModuleIds.includes(moduleId as ModuleId)) {
    return forbiddenResponse(`Module access denied: ${moduleId}`);
  }
  return null;
}

export async function requireModuleAccess(moduleId: string): Promise<SessionUser | NextResponse> {
  const user = await requireSession();
  if (user instanceof NextResponse) return user;
  const denied = assertModuleAccess(user, moduleId);
  if (denied) return denied;
  return user;
}

export function assertTenantAccess(
  user: SessionUser,
  requestedCompanyId?: string | null
): NextResponse | null {
  if (!requestedCompanyId || requestedCompanyId === user.companyId) return null;
  if (user.role === 'superadmin') return null;
  return forbiddenResponse('Cross-tenant access denied');
}
