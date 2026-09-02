import { GET as listModules } from './route';
import { GET as moduleAccess } from './[moduleId]/access/route';
import {
  requireSession,
  requireModuleAccess,
  unauthorizedResponse,
  forbiddenResponse,
  type SessionUser,
} from '@/lib/sessionAuth';
import { resolveAllowedModuleIds } from '@/lib/entityEntitlements';

jest.mock('@/lib/sessionAuth', () => {
  const actual = jest.requireActual('@/lib/sessionAuth');
  return {
    ...actual,
    requireSession: jest.fn(),
    requireModuleAccess: jest.fn(),
  };
});

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

const mockRequireSession = requireSession as jest.Mock;
const mockRequireModuleAccess = requireModuleAccess as jest.Mock;

function sessionFor(companyId: string, role: string): SessionUser {
  const allowedModuleIds = resolveAllowedModuleIds(companyId, role);
  return {
    id: `${companyId}-${role}`,
    name: `${companyId} ${role}`,
    role,
    companyId,
    allowedModuleIds,
  };
}

describe('ecosystem module API RBAC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/ecosystem/modules', () => {
    it('pcdoctor admin sees all authorized modules', async () => {
      mockRequireSession.mockResolvedValue(sessionFor('pcdoctor', 'admin'));

      const res = await listModules();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.allowed_ids).toContain('quoteops');
      expect(data.allowed_ids).toContain('founderos');
      expect(data.modules.length).toBeGreaterThan(5);
    });

    it('femar admin list is workforce-only', async () => {
      mockRequireSession.mockResolvedValue(sessionFor('femar', 'admin'));

      const res = await listModules();
      const data = await res.json();

      expect(data.allowed_ids).toEqual(['workforce-ai']);
      expect(data.modules.map((m: { id: string }) => m.id)).toEqual(['workforce-ai']);
    });

    it('iapro admin list is workforce-only', async () => {
      mockRequireSession.mockResolvedValue(sessionFor('iapro', 'admin'));

      const res = await listModules();
      const data = await res.json();

      expect(data.allowed_ids).toEqual(['workforce-ai']);
      expect(data.modules).toHaveLength(1);
      expect(data.modules[0].id).toBe('workforce-ai');
    });

    it('returns 401 when unauthenticated', async () => {
      mockRequireSession.mockResolvedValue(unauthorizedResponse('Sign in required'));

      const res = await listModules();
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/ecosystem/modules/[moduleId]/access', () => {
    it('pcdoctor admin cannot launch a module whose UI is not ready', async () => {
      mockRequireModuleAccess.mockResolvedValue(sessionFor('pcdoctor', 'admin'));

      const res = await moduleAccess(new Request('http://localhost/access'), {
        params: Promise.resolve({ moduleId: 'quoteops' }),
      });
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.ok).toBe(false);
      expect(data.error).toMatch(/not ready/i);
      expect(mockRequireModuleAccess).toHaveBeenCalledWith('quoteops');
    });

    it('femar forced quoteops access returns 403', async () => {
      mockRequireModuleAccess.mockResolvedValue(
        forbiddenResponse('Module access denied: quoteops')
      );

      const res = await moduleAccess(new Request('http://localhost/access'), {
        params: Promise.resolve({ moduleId: 'quoteops' }),
      });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.ok).toBe(false);
      expect(data.error).toMatch(/Module access denied: quoteops/);
    });

    it('iapro forced founderos access returns 403', async () => {
      mockRequireModuleAccess.mockResolvedValue(
        forbiddenResponse('Module access denied: founderos')
      );

      const res = await moduleAccess(new Request('http://localhost/access'), {
        params: Promise.resolve({ moduleId: 'founderos' }),
      });

      expect(res.status).toBe(403);
    });

    it('workforce launch URL redirects to a real route', async () => {
      mockRequireModuleAccess.mockResolvedValue(sessionFor('femar', 'employee'));

      const res = await moduleAccess(new Request('https://inneros.creatorcore.ai/access', { headers: { host: 'inneros.creatorcore.ai' } }), {
        params: Promise.resolve({ moduleId: 'workforce-ai' }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.launchUrl).toContain('redirect=%2Fmodules');
      expect(data.launchUrl).toContain('workforce.creatorcore.ai');
    });

    it('femar may access workforce-ai', async () => {
      mockRequireModuleAccess.mockResolvedValue(sessionFor('femar', 'employee'));

      const res = await moduleAccess(new Request('http://localhost/access'), {
        params: Promise.resolve({ moduleId: 'workforce-ai' }),
      });

      expect(res.status).toBe(200);
    });

    it('unknown module returns 404 before RBAC', async () => {
      const res = await moduleAccess(new Request('http://localhost/access'), {
        params: Promise.resolve({ moduleId: 'nonexistent-module' }),
      });

      expect(res.status).toBe(404);
      expect(mockRequireModuleAccess).not.toHaveBeenCalled();
    });
  });
});
