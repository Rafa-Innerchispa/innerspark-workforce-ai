import { classifyScheduleNovelty, processCheckinNovelty } from './noveltyService';

const setMock = jest.fn().mockResolvedValue(true);
const scheduleGetMock = jest.fn();

jest.mock('./firebase', () => ({
  db: {
    collection: jest.fn((name: string) => {
      if (name === 'schedules') {
        return {
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ get: scheduleGetMock })
          })
        };
      }
      return {
        doc: jest.fn().mockReturnValue({ set: setMock })
      };
    })
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
  scheduleGetMock.mockResolvedValue({ docs: [] });
});

describe('Novelty Service', () => {
  it('uses the employee schedule instead of a fixed 09:00-18:00 rule', () => {
    expect(classifyScheduleNovelty(8 * 60 + 40, { startTime: '08:30', endTime: '17:30' }))
      .toEqual({ type: 'LATE_ARRIVAL', minutes: 10, scheduleEvidence: 'schedule' });
  });

  it('calculates overtime from the configured shift end', () => {
    expect(classifyScheduleNovelty(18 * 60 + 10, { startTime: '10:00', endTime: '18:00' }))
      .toEqual({ type: 'OVERTIME', minutes: 10, scheduleEvidence: 'schedule' });
  });

  it('returns neutral/on-time evidence when no schedule exists', () => {
    expect(classifyScheduleNovelty(10 * 60 + 30, null))
      .toEqual({ type: 'ON_TIME', minutes: 0, scheduleEvidence: 'no_schedule' });
  });

  it('stamps companyId/tenantId and no-schedule provenance', async () => {
    const novelty = await processCheckinNovelty('user1', '2026-08-25 10:30:00', 'ADMS', 'company-123');
    expect(novelty.companyId).toBe('company-123');
    expect(novelty.tenantId).toBe('company-123');
    expect(novelty.type).toBe('ON_TIME');
    expect(novelty.schedule_evidence).toBe('no_schedule');
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'company-123' }));
  });
});
