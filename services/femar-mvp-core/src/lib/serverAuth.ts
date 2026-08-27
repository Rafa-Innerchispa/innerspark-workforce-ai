import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export class TenantAccessError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'TenantAccessError';
    this.status = status;
  }
}

export interface TenantContext {
  userId: string;
  role: string;
  companyId: string;
}

export function sessionDocumentId(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function resolveEffectiveCompany(
  user: { role?: string; companyId?: string },
  requestedCompanyId?: string | null
) {
  if (user.role === 'superadmin') {
    const requested = requestedCompanyId?.trim();
    const companyId = requested || user.companyId?.trim();
    if (!companyId) {
      throw new TenantAccessError('No company selected for superadmin session', 400);
    }
    return companyId;
  }

  const companyId = user.companyId?.trim();
  if (!companyId) {
    throw new TenantAccessError('User is not assigned to a company', 403);
  }
  return companyId;
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await db.collection('sessions').doc(sessionDocumentId(token)).set({
    userId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  return {
    token,
    maxAgeSeconds: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export async function resolveTenantContext(req: NextRequest): Promise<TenantContext> {
  const token = req.cookies.get('session_token')?.value;
  if (!token) {
    throw new TenantAccessError('Authentication required', 401);
  }

  const sessionDoc = await db.collection('sessions').doc(sessionDocumentId(token)).get();
  if (!sessionDoc.exists) {
    throw new TenantAccessError('Invalid session', 401);
  }

  const session = sessionDoc.data();
  const userId = session?.userId;
  const expiresAt = session?.expiresAt ? new Date(session.expiresAt).getTime() : NaN;
  if (!userId || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new TenantAccessError('Session expired', 401);
  }

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new TenantAccessError('Session user not found', 401);
  }

  const user = userDoc.data() || {};
  if (user.status === 'PENDING' || user.status === 'REJECTED') {
    throw new TenantAccessError('User is not authorized', 403);
  }

  // Only superadmins may select a tenant. Regular admins/employees are always pinned
  // to their server-side user.companyId, even if they tamper with this cookie/header.
  const requestedCompanyId =
    req.headers.get('x-workforce-company-id') ||
    req.cookies.get('workforce_active_company')?.value ||
    null;

  const companyId = resolveEffectiveCompany(user, requestedCompanyId);

  return {
    userId,
    role: user.role || 'employee',
    companyId,
  };
}
