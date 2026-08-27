jest.mock('@/lib/firebase', () => ({
  db: {
    collection: jest.fn(),
  },
}));

jest.mock('@/lib/reportUtils', () => ({
  generateDeterministicPayroll: jest.fn(() => []),
}));

import { db } from '@/lib/firebase';
import { configuredGeminiModel, getAnomaliesSummary } from './workforceAgentTools';

const mockedDb = db as jest.Mocked<typeof db>;

describe('workforce Gemini tools', () => {
  const previousWorkforceModel = process.env.WORKFORCE_GEMINI_MODEL;
  const previousGeminiModel = process.env.GEMINI_MODEL;

  afterEach(() => {
    jest.clearAllMocks();
    if (previousWorkforceModel === undefined) delete process.env.WORKFORCE_GEMINI_MODEL;
    else process.env.WORKFORCE_GEMINI_MODEL = previousWorkforceModel;
    if (previousGeminiModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = previousGeminiModel;
  });

  it('requires the Gemini model to be explicitly configured instead of hardcoding one', () => {
    delete process.env.WORKFORCE_GEMINI_MODEL;
    delete process.env.GEMINI_MODEL;
    expect(() => configuredGeminiModel()).toThrow('GEMINI_MODEL_NOT_CONFIGURED');

    process.env.WORKFORCE_GEMINI_MODEL = 'gemini-owner-selected';
    expect(configuredGeminiModel()).toBe('gemini-owner-selected');
  });

  it('derives anomalies only from employees and punches in the authorized tenant', async () => {
    const employeesGet = jest.fn().mockResolvedValue({
      docs: [
        { id: 'e1', data: () => ({ id: 'e1', name: 'Ana' }) },
        { id: 'e2', data: () => ({ id: 'e2', name: 'Luis' }) },
      ],
    });
    const employeesWhere = jest.fn().mockReturnValue({ get: employeesGet });

    const noveltiesGet = jest.fn().mockResolvedValue({
      docs: [
        { data: () => ({ user_id: 'e1', type: 'LATE_ARRIVAL', minutes: 18, timestamp: '2026-08-27T08:18:00-05:00', schedule_status: 'configured' }) },
        { data: () => ({ user_id: 'e2', type: 'ON_TIME', minutes: 0, timestamp: '2026-08-27T08:00:00-05:00', schedule_status: 'not_configured' }) },
        { data: () => ({ user_id: 'other-tenant', type: 'LATE_ARRIVAL', minutes: 40, timestamp: '2026-08-27T08:40:00-05:00', schedule_status: 'configured' }) },
      ],
    });
    const noveltiesWhere = jest.fn().mockReturnValue({ get: noveltiesGet });

    const logsGet = jest.fn().mockResolvedValue({
      docs: [
        { data: () => ({ user_id: 'e1', timestamp: '2026-08-27T08:18:00-05:00' }) },
        { data: () => ({ user_id: 'e2', timestamp: '2026-08-27T08:00:00-05:00' }) },
        { data: () => ({ user_id: 'e2', timestamp: '2026-08-27T17:00:00-05:00' }) },
        { data: () => ({ user_id: 'other-tenant', timestamp: '2026-08-27T08:00:00-05:00' }) },
      ],
    });
    const logsWhere = jest.fn().mockReturnValue({ get: logsGet });

    (mockedDb.collection as jest.Mock).mockImplementation((name: string) => {
      if (name === 'employees') return { where: employeesWhere };
      if (name === 'novelties') return { where: noveltiesWhere };
      if (name === 'realtime_logs') return { where: logsWhere };
      throw new Error(`Unexpected collection ${name}`);
    });

    const result = await getAnomaliesSummary('femar', new Date('2026-08-27T15:00:00-05:00'));

    expect(employeesWhere).toHaveBeenCalledWith('companyId', '==', 'femar');
    expect(result.late_arrivals).toEqual([
      expect.objectContaining({ employee_id: 'e1', minutes: 18 }),
    ]);
    expect(result.missing_checkouts).toEqual([
      expect.objectContaining({ employee_id: 'e1', punches_today: 1 }),
    ]);
    expect(result.employees_without_schedule).toEqual(['e2']);
    expect(result.late_arrivals).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ employee_id: 'other-tenant' }),
    ]));
  });
});
