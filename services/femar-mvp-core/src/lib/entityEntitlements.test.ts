import { resolveAllowedModuleIds, canAccessModule } from '@/lib/entityEntitlements';

describe('entityEntitlements RBAC', () => {
  it('pcdoctor superadmin gets all modules', () => {
    expect(resolveAllowedModuleIds('pcdoctor', 'superadmin')).toContain('quoteops');
    expect(resolveAllowedModuleIds('pcdoctor', 'superadmin')).toContain('founderos');
  });

  it('femar superadmin remains workforce-only by tenant contract', () => {
    expect(resolveAllowedModuleIds('femar', 'superadmin')).toEqual(['workforce-ai']);
    expect(canAccessModule('femar', 'superadmin', 'quoteops')).toBe(false);
  });

  it('femar employee only workforce-ai', () => {
    const mods = resolveAllowedModuleIds('femar', 'employee');
    expect(mods).toEqual(['workforce-ai']);
    expect(canAccessModule('femar', 'employee', 'quoteops')).toBe(false);
  });

  it('iapro only workforce-ai', () => {
    expect(resolveAllowedModuleIds('iapro', 'admin')).toEqual(['workforce-ai']);
    expect(resolveAllowedModuleIds('iapro', 'superadmin')).toEqual(['workforce-ai']);
  });

  it('pcdoctor admin gets all modules', () => {
    expect(resolveAllowedModuleIds('pcdoctor', 'admin').length).toBeGreaterThan(5);
  });

  it('pcdoctor employee gets workforce + ops admin panel only', () => {
    expect(resolveAllowedModuleIds('pcdoctor', 'employee')).toEqual(['workforce-ai', 'inneros-admin']);
  });

  it('hackathon without explicit modules is minimal', () => {
    expect(resolveAllowedModuleIds('hackathon', 'admin')).toEqual(['workforce-ai']);
  });

  it('hackathon with explicit modules respects list', () => {
    expect(
      resolveAllowedModuleIds('hackathon', 'admin', ['visitors', 'smart-quoter'])
    ).toEqual(['visitors', 'smart-quoter']);
  });

  it('iskcon default is iskcon-desk', () => {
    expect(resolveAllowedModuleIds('iskcon', 'admin')).toEqual(['iskcon-desk']);
  });

  it('innerspark_labs demo includes fieldspark photography', () => {
    expect(resolveAllowedModuleIds('innerspark_labs', 'admin')).toContain('fieldspark-photography');
  });

  it('femar cannot access fieldspark without explicit grant', () => {
    expect(canAccessModule('femar', 'admin', 'fieldspark-photography')).toBe(false);
  });
});
