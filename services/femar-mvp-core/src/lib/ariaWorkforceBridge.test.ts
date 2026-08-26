import { readAriaWorkforceContext } from './ariaWorkforceBridge';

const scheduleGetMock = jest.fn();
const noveltyGetMock = jest.fn();
const setMock = jest.fn();

jest.mock('./firebase', () => ({
  db: {
    collection: jest.fn((name: string) => {
      if (name === 'schedules') {
        return {
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ get: scheduleGetMock }),
          }),
        };
      }
      if (name === 'novelties') {
        return {
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ get: noveltyGetMock }),
          }),
        };
      }
      return { doc: jest.fn().mockReturnValue({ set: setMock }) };
    }),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  scheduleGetMock.mockResolvedValue({ docs: [] });
  noveltyGetMock.mockResolvedValue({ docs: [] });
});

describe('ARIA Workforce read bridge', () => {
  it('returns neutral evidence when the employee has no schedule', async () => {
    const result = await readAriaWorkforceContext({
      companyId: 'company-a',
      employeeId: 'emp-1',
      date: '2026-08-26',
    });

    expect(result.schedule).toBeNull();
    expect(result.scheduleEvidence).toBe('no_schedule');
    expect(result.readOnly).toBe(true);
    expect(setMock).not.toHaveBeenCalled();
  });

  it('filters schedules and novelties to the requested tenant and employee', async () => {
    scheduleGetMock.mockResolvedValue({
      docs: [
        { id: 'wrong-tenant-shift', data: () => ({ companyId: 'company-b', employeeId: 'emp-1', date: '2026-08-26', startTime: '07:00', endTime: '16:00' }) },
        { id: 'target-shift', data: () => ({ companyId: 'company-a', employeeId: 'emp-1', date: '2026-08-26', startTime: '08:30', endTime: '17:30' }) },
        { id: 'other-employee-shift', data: () => ({ companyId: 'company-a', employeeId: 'emp-2', date: '2026-08-26', startTime: '09:00', endTime: '18:00' }) },
      ],
    });
    noveltyGetMock.mockResolvedValue({
      docs: [
        { data: () => ({ user_id: 'emp-2', companyId: 'company-a', tenantId: 'company-a', source: 'ADMS', timestamp: '2026-08-26T15:00:00.000Z', type: 'ON_TIME', minutes: 0, created_at: '2026-08-26T15:00:00.000Z', schedule_id: null, schedule_evidence: 'no_schedule' }) },
        { data: () => ({ user_id: 'emp-1', companyId: 'company-a', tenantId: 'company-a', source: 'MOBILE', timestamp: '2026-08-26T14:00:00.000Z', type: 'LATE_ARRIVAL', minutes: 10, created_at: '2026-08-26T14:00:00.000Z', schedule_id: 'target-shift', schedule_evidence: 'schedule' }) },
        { data: () => ({ user_id: 'emp-1', companyId: 'company-b', tenantId: 'company-b', source: 'ADMS', timestamp: '2026-08-26T13:00:00.000Z', type: 'ON_TIME', minutes: 0, created_at: '2026-08-26T13:00:00.000Z', schedule_id: null, schedule_evidence: 'no_schedule' }) },
      ],
    });

    const result = await readAriaWorkforceContext({
      companyId: 'company-a',
      employeeId: 'emp-1',
      date: '2026-08-26',
    });

    expect(result.schedule?.id).toBe('target-shift');
    expect(result.scheduleEvidence).toBe('schedule');
    expect(result.recentNovelties).toHaveLength(1);
    expect(result.recentNovelties[0].user_id).toBe('emp-1');
    expect(result.recentNovelties[0].companyId).toBe('company-a');
    expect(setMock).not.toHaveBeenCalled();
  });

  it('requires tenant and employee identity', async () => {
    await expect(readAriaWorkforceContext({ companyId: '', employeeId: 'emp-1', date: '2026-08-26' }))
      .rejects.toThrow('company_id_required');
    await expect(readAriaWorkforceContext({ companyId: 'company-a', employeeId: '', date: '2026-08-26' }))
      .rejects.toThrow('employee_id_required');
  });
});
