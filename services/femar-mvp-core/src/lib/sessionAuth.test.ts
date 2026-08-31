import { cookies } from 'next/headers';
import {
  getSessionUser,
  assertModuleAccess,
  requireModuleAccess,
  assertTenantAccess,
  type SessionUser,
} from '@/lib/sessionAuth';
import { resolveAllowedModuleIds } from '@/lib/entityEntitlements';

jest.mock('next/headers');

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private body: unknown;
    constructor(body: unknown, init?: { status?: number }) {
      this.status = init?.status || 200;
      this.body = body;
    }
    json = async () => this.body;
  }
  return {
    NextResponse: Object.assign(MockNextResponse, {
      json: (body: unknown, init?: { status?: number }) => new MockNextResponse(body, init),
    }),
  };
});

const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({ get: mockGet }));
const mockCollection = jest.fn((_name: string) => ({ doc: mockDoc }));

jest.mock('@/lib/firebase', () => ({
  db: {
    collection: (name: string) => mockCollection(name),
  },
}));

function mockSessionCookie(userId?: string) {
  (cookies as jest.Mock).mockResolvedValue({
    get: (name: string) =>
      userId && name === 'session_token' ? { value: userId } : undefined,
  });
}

function mockFirestoreUser(
  data: Record<string, unknown>,
  id = 'user-test'
) {
  mockGet.mockResolvedValue({
    exists: true,
    id,
    data: () => data,
  });
}

function buildSessionUser(companyId: string, role: string): SessionUser {
  const allowedModuleIds = resolveAllowedModuleIds(companyId, role);
  return {
    id: 'user-test',
    role,
    companyId,
    allowedModuleIds,
  };
}

describe('sessionAuth cross-tenant RBAC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSessionUser', () => {
    it('returns null without session cookie', async () => {
      mockSessionCookie(undefined);
      expect(await getSessionUser()).toBeNull();
    });

    it('pcdoctor admin session resolves all authorized modules', async () => {
      mockSessionCookie('pc-admin');
      mockFirestoreUser({ role: 'admin', companyId: 'pcdoctor', status: 'ACTIVE' });

      const user = await getSessionUser();
      expect(user?.companyId).toBe('pcdoctor');
      expect(user?.allowedModuleIds).toContain('quoteops');
      expect(user?.allowedModuleIds).toContain('founderos');
      expect(user?.allowedModuleIds.length).toBeGreaterThan(5);
    });

    it('femar admin session is workforce-only', async () => {
      mockSessionCookie('femar-admin');
      mockFirestoreUser({ role: 'admin', companyId: 'femar', status: 'ACTIVE' });

      const user = await getSessionUser();
      expect(user?.allowedModuleIds).toEqual(['workforce-ai']);
    });

    it('iapro admin session is workforce-only', async () => {
      mockSessionCookie('iapro-admin');
      mockFirestoreUser({ role: 'admin', companyId: 'iapro', status: 'ACTIVE' });

      const user = await getSessionUser();
      expect(user?.allowedModuleIds).toEqual(['workforce-ai']);
    });

    it('rejects pending users', async () => {
      mockSessionCookie('pending-user');
      mockFirestoreUser({ role: 'admin', companyId: 'femar', status: 'PENDING' });
      expect(await getSessionUser()).toBeNull();
    });
  });

  describe('assertModuleAccess', () => {
    it('pcdoctor admin may access quoteops', () => {
      const user = buildSessionUser('pcdoctor', 'admin');
      expect(assertModuleAccess(user, 'quoteops')).toBeNull();
    });

    it('femar admin denied quoteops with 403 payload', async () => {
      const user = buildSessionUser('femar', 'admin');
      const denied = assertModuleAccess(user, 'quoteops');
      expect(denied).not.toBeNull();
      expect(denied!.status).toBe(403);
      const body = await denied!.json();
      expect(body.error).toMatch(/Module access denied: quoteops/);
    });

    it('iapro admin denied founderos with 403 payload', async () => {
      const user = buildSessionUser('iapro', 'admin');
      const denied = assertModuleAccess(user, 'founderos');
      expect(denied!.status).toBe(403);
    });

    it('femar may access workforce-ai', () => {
      const user = buildSessionUser('femar', 'employee');
      expect(assertModuleAccess(user, 'workforce-ai')).toBeNull();
    });
  });

  describe('requireModuleAccess', () => {
    it('returns 403 when femar forces foreign module', async () => {
      mockSessionCookie('femar-user');
      mockFirestoreUser({ role: 'admin', companyId: 'femar', status: 'ACTIVE' });

      const result = await requireModuleAccess('quoteops');
      expect(result).toHaveProperty('status', 403);
    });

    it('returns user when pcdoctor admin accesses authorized module', async () => {
      mockSessionCookie('pc-admin');
      mockFirestoreUser({ role: 'admin', companyId: 'pcdoctor', status: 'ACTIVE' });

      const result = await requireModuleAccess('quoteops');
      expect((result as SessionUser).companyId).toBe('pcdoctor');
      expect((result as SessionUser).allowedModuleIds).toContain('quoteops');
    });

    it('returns 401 without session', async () => {
      mockSessionCookie(undefined);
      const result = await requireModuleAccess('workforce-ai');
      expect((result as { status: number }).status).toBe(401);
    });
  });

  describe('assertTenantAccess', () => {
    it('blocks femar admin from another tenant', async () => {
      const user = buildSessionUser('femar', 'admin');
      const denied = assertTenantAccess(user, 'pcdoctor');
      expect(denied!.status).toBe(403);
      const body = await denied!.json();
      expect(body.error).toMatch(/Cross-tenant access denied/);
    });

    it('allows pcdoctor superadmin cross-tenant reads', () => {
      const user = buildSessionUser('pcdoctor', 'superadmin');
      expect(assertTenantAccess(user, 'femar')).toBeNull();
    });
  });
});
