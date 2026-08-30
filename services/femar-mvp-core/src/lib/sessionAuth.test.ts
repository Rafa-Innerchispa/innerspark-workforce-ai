jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    body: unknown;

    constructor(body: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status || 200;
    }

    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }
  }

  return { NextResponse: MockNextResponse };
});

import { NextResponse } from 'next/server';
import { assertModuleAccess, assertTenantAccess, type SessionUser } from './sessionAuth';


function user(companyId: string, role: string, allowedModuleIds: string[]): SessionUser {
  return {
    id: `${companyId}-${role}`,
    role,
    companyId,
    status: 'APPROVED',
    allowedModuleIds: allowedModuleIds as SessionUser['allowedModuleIds'],
  };
}

describe('authenticated tenant/module security matrix', () => {
  it('allows PC Doctor admin across authorized InnerOS modules', () => {
    const pcdoctor = user('pcdoctor', 'admin', ['workforce-ai', 'quoteops', 'founderos', 'credentials']);

    expect(assertModuleAccess(pcdoctor, 'workforce-ai')).toBeNull();
    expect(assertModuleAccess(pcdoctor, 'quoteops')).toBeNull();
    expect(assertModuleAccess(pcdoctor, 'founderos')).toBeNull();
    expect(assertModuleAccess(pcdoctor, 'credentials')).toBeNull();
  });

  it('returns backend 403 for FEMAR direct URL bypass outside Workforce', () => {
    const femar = user('femar', 'superadmin', ['workforce-ai']);
    const denied = assertModuleAccess(femar, 'quoteops');

    expect(denied).toBeInstanceOf(NextResponse);
    expect(denied?.status).toBe(403);
  });

  it('returns backend 403 for IA PRO direct URL bypass outside Workforce', () => {
    const iapro = user('iapro', 'admin', ['workforce-ai']);
    const denied = assertModuleAccess(iapro, 'fieldspark-photography');

    expect(denied).toBeInstanceOf(NextResponse);
    expect(denied?.status).toBe(403);
  });

  it('allows ISKCON only for explicitly granted modules', () => {
    const iskcon = user('iskcon', 'admin', ['iskcon-desk']);

    expect(assertModuleAccess(iskcon, 'iskcon-desk')).toBeNull();
    expect(assertModuleAccess(iskcon, 'founderos')?.status).toBe(403);
  });

  it('blocks cross-tenant access for non-superadmin users', () => {
    const femar = user('femar', 'admin', ['workforce-ai']);
    const denied = assertTenantAccess(femar, 'pcdoctor');

    expect(denied).toBeInstanceOf(NextResponse);
    expect(denied?.status).toBe(403);
  });

  it('allows superadmin cross-tenant actions only after explicit module authorization', () => {
    const pcdoctor = user('pcdoctor', 'superadmin', ['workforce-ai', 'quoteops']);

    expect(assertTenantAccess(pcdoctor, 'femar')).toBeNull();
    expect(assertModuleAccess(pcdoctor, 'quoteops')).toBeNull();
  });
});
