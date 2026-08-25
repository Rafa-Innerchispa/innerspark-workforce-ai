jest.mock('@/lib/firebase', () => ({ db: {} }));

import {
  AuthError,
  assertApprovalAllowed,
  hashSessionToken,
  normalizeRole,
  tenantForRequest,
  type SessionPrincipal,
} from './server';

const tenantAdmin: SessionPrincipal = {
  userId: 'admin-a',
  tenantId: 'tenant-a',
  role: 'tenant_admin',
  expiresAt: '2099-01-01T00:00:00.000Z',
};

const master: SessionPrincipal = {
  userId: 'master',
  tenantId: 'control-plane',
  role: 'master_admin',
  expiresAt: '2099-01-01T00:00:00.000Z',
};

describe('Workforce auth policy', () => {
  test('normalizes legacy admin roles into canonical roles', () => {
    expect(normalizeRole('superadmin')).toBe('master_admin');
    expect(normalizeRole('admin')).toBe('tenant_admin');
    expect(normalizeRole('employee')).toBe('employee');
  });

  test('session tokens are not persisted in plaintext form', () => {
    const token = 'secret-session-token';
    expect(hashSessionToken(token)).not.toBe(token);
    expect(hashSessionToken(token)).toHaveLength(64);
  });

  test('tenant admin cannot request another tenant', () => {
    expect(() => tenantForRequest(tenantAdmin, 'tenant-b')).toThrow(AuthError);
    try {
      tenantForRequest(tenantAdmin, 'tenant-b');
    } catch (error) {
      expect((error as AuthError).code).toBe('cross_tenant_forbidden');
    }
  });

  test('master admin can explicitly operate another tenant', () => {
    expect(tenantForRequest(master, 'tenant-b')).toBe('tenant-b');
  });

  test('tenant admin can approve an employee in own tenant', () => {
    expect(() => assertApprovalAllowed(tenantAdmin, 'tenant-a', 'employee')).not.toThrow();
  });

  test('tenant admin cannot approve another tenant', () => {
    expect(() => assertApprovalAllowed(tenantAdmin, 'tenant-b', 'employee')).toThrow('otra empresa');
  });

  test('tenant admin cannot escalate another user to administrative role', () => {
    expect(() => assertApprovalAllowed(tenantAdmin, 'tenant-a', 'tenant_admin')).toThrow('administrativos');
  });

  test('master admin can approve tenant administrators across tenants', () => {
    expect(() => assertApprovalAllowed(master, 'tenant-b', 'tenant_admin')).not.toThrow();
  });
});
