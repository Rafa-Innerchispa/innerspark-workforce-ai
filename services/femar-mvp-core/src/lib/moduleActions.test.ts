import { matchModuleAction, ISKCON_DESK_ACTIONS } from '@/lib/moduleActions';

describe('moduleActions', () => {
  it('photo subdomain is canonical in module domains', () => {
    expect(ISKCON_DESK_ACTIONS.length).toBeGreaterThan(10);
  });

  it('matches emergency plan intent', () => {
    const hit = matchModuleAction('hazme un plan de emergencia', 'iskcon-desk');
    expect(hit?.id).toBe('emergency_plan');
  });

  it('matches sponsors list', () => {
    const hit = matchModuleAction('lista sponsors panihati', 'iskcon-desk');
    expect(hit?.id).toBe('sponsors_list');
  });
});
