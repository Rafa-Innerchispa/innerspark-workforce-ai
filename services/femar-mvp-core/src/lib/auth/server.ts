import crypto from 'crypto';
import { db } from '@/lib/firebase';

export const SESSION_COOKIE = 'workforce_session';
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type CanonicalRole =
  | 'master_admin'
  | 'tenant_admin'
  | 'hr'
  | 'payroll_approver'
  | 'supervisor'
  | 'employee';

export type SessionPrincipal = {
  userId: string;
  tenantId: string;
  role: CanonicalRole;
  displayName?: string;
  expiresAt: string;
};

export class AuthError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function normalizeRole(role?: string): CanonicalRole {
  switch ((role || '').toLowerCase()) {
    case 'superadmin':
    case 'master_admin':
      return 'master_admin';
    case 'admin':
    case 'tenant_admin':
      return 'tenant_admin';
    case 'hr':
      return 'hr';
    case 'payroll_approver':
      return 'payroll_approver';
    case 'supervisor':
      return 'supervisor';
    default:
      return 'employee';
  }
}

export function hashSessionToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (rawKey === name) return decodeURIComponent(rawValue.join('='));
  }
  return null;
}

export async function createServerSession(user: Record<string, unknown>) {
  const userId = String(user.id || user.cedula || '');
  const tenantId = String(user.companyId || user.tenantId || '');
  if (!userId || !tenantId) {
    throw new AuthError(400, 'invalid_identity', 'El usuario no tiene identidad o empresa asignada');
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const role = normalizeRole(String(user.role || 'employee'));

  await db.collection('auth_sessions').doc(tokenHash).set({
    userId,
    tenantId,
    role,
    displayName: String(user.name || user.displayName || ''),
    expiresAt,
    createdAt: new Date().toISOString(),
    revokedAt: null,
  });

  return { token, expiresAt, role, tenantId, userId };
}

export async function requireSession(req: Request): Promise<SessionPrincipal> {
  const token = parseCookie(req.headers.get('cookie'), SESSION_COOKIE);
  if (!token) throw new AuthError(401, 'session_missing', 'Sesión requerida');

  const tokenHash = hashSessionToken(token);
  const ref = db.collection('auth_sessions').doc(tokenHash);
  const snap = await ref.get();
  if (!snap.exists) throw new AuthError(401, 'session_invalid', 'Sesión inválida');

  const session = snap.data() || {};
  if (session.revokedAt) throw new AuthError(401, 'session_revoked', 'Sesión revocada');
  if (!session.expiresAt || Date.parse(session.expiresAt) <= Date.now()) {
    await ref.delete().catch(() => undefined);
    throw new AuthError(401, 'session_expired', 'Sesión expirada');
  }

  return {
    userId: String(session.userId),
    tenantId: String(session.tenantId),
    role: normalizeRole(String(session.role)),
    displayName: session.displayName ? String(session.displayName) : undefined,
    expiresAt: String(session.expiresAt),
  };
}

export function requireAnyRole(principal: SessionPrincipal, roles: CanonicalRole[]) {
  if (principal.role === 'master_admin') return;
  if (!roles.includes(principal.role)) {
    throw new AuthError(403, 'role_forbidden', 'No tienes permisos para esta acción');
  }
}

export function tenantForRequest(principal: SessionPrincipal, requestedTenant?: string | null) {
  if (principal.role === 'master_admin') {
    return requestedTenant || principal.tenantId;
  }
  if (requestedTenant && requestedTenant !== principal.tenantId) {
    throw new AuthError(403, 'cross_tenant_forbidden', 'Acceso entre empresas denegado');
  }
  return principal.tenantId;
}

export function assertApprovalAllowed(
  principal: SessionPrincipal,
  targetTenantId: string,
  targetRole: CanonicalRole,
) {
  if (!targetTenantId) throw new AuthError(400, 'target_tenant_missing', 'La solicitud no tiene empresa destino');
  if (principal.role === 'master_admin') return;
  if (principal.role !== 'tenant_admin') {
    throw new AuthError(403, 'approval_forbidden', 'Sólo un administrador puede aprobar usuarios');
  }
  if (principal.tenantId !== targetTenantId) {
    throw new AuthError(403, 'cross_tenant_forbidden', 'No puedes aprobar usuarios de otra empresa');
  }
  if (targetRole === 'master_admin' || targetRole === 'tenant_admin') {
    throw new AuthError(403, 'role_escalation_forbidden', 'Sólo el administrador maestro puede otorgar roles administrativos');
  }
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return { status: error.status, body: { success: false, code: error.code, message: error.message } };
  }
  return null;
}
