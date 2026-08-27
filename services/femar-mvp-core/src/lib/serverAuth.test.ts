jest.mock('@/lib/firebase', () => ({ db: {} }));

import { resolveEffectiveCompany, sessionDocumentId, TenantAccessError } from './serverAuth';

describe('server tenant policy', () => {
  it('pins normal admins to their server-side company even when another tenant is requested', () => {
    expect(resolveEffectiveCompany({ role: 'admin', companyId: 'femar' }, 'iapro')).toBe('femar');
  });

  it('allows a superadmin to select an active company', () => {
    expect(resolveEffectiveCompany({ role: 'superadmin', companyId: 'femar' }, 'iapro')).toBe('iapro');
  });

  it('rejects a non-superadmin without an assigned company', () => {
    expect(() => resolveEffectiveCompany({ role: 'admin' }, 'femar')).toThrow(TenantAccessError);
  });

  it('hashes opaque session tokens before using them as Firestore document ids', () => {
    const token = 'not-a-user-id';
    expect(sessionDocumentId(token)).toHaveLength(64);
    expect(sessionDocumentId(token)).not.toContain(token);
  });
});
