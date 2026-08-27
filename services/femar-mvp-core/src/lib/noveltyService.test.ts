import { classifyNovelty, processCheckinNovelty, type WorkSchedule } from './noveltyService';

const mockSet = jest.fn().mockResolvedValue(true);
const mockEmployeeGet = jest.fn();

jest.mock('./firebase', () => ({
  db: {
    collection: jest.fn((name: string) => ({
      doc: jest.fn(() => {
        if (name === 'employees') {
          return { get: mockEmployeeGet };
        }
        return { set: mockSet };
      }),
    })),
  },
}));

const standardSchedule: WorkSchedule = {
  start: '09:00',
  end: '18:00',
  graceMinutes: 15,
  overtimeGraceMinutes: 30,
};

describe('Novelty Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSet.mockResolvedValue(true);
    mockEmployeeGet.mockResolvedValue({ exists: false, data: () => undefined });
  });

  it('does not infer late/overtime when the employee has no configured schedule', () => {
    const novelty = classifyNovelty('2026-08-05 11:30:00', null);
    expect(novelty.type).toBe('ON_TIME');
    expect(novelty.minutes).toBe(0);
    expect(novelty.schedule_status).toBe('not_configured');
  });

  it('detects late arrival from the configured schedule', () => {
    const novelty = classifyNovelty('2026-08-05 09:20:00', standardSchedule);
    expect(novelty.type).toBe('LATE_ARRIVAL');
    expect(novelty.minutes).toBe(20);
    expect(novelty.schedule_status).toBe('configured');
  });

  it('detects overtime from a non-standard shift instead of fixed 18:00', () => {
    const novelty = classifyNovelty('2026-08-05 17:45:00', {
      start: '08:00',
      end: '17:00',
      graceMinutes: 10,
      overtimeGraceMinutes: 30,
    });
    expect(novelty.type).toBe('OVERTIME');
    expect(novelty.minutes).toBe(45);
  });

  it('loads an inline employee schedule before persisting the novelty', async () => {
    mockEmployeeGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        schedule: {
          start: '07:30',
          end: '16:30',
          graceMinutes: 5,
          overtimeGraceMinutes: 20,
        },
      }),
    });

    const novelty = await processCheckinNovelty('user1', '2026-08-05 07:40:00', 'ADMS');
    expect(novelty.type).toBe('LATE_ARRIVAL');
    expect(novelty.minutes).toBe(10);
    expect(novelty.schedule_status).toBe('configured');
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user1',
      schedule_status: 'configured',
    }));
  });

  it('fails explicitly when novelty persistence is unavailable', async () => {
    mockSet.mockRejectedValueOnce(new Error('firestore unavailable'));
    await expect(
      processCheckinNovelty('user1', '2026-08-05 08:55:00', 'MOBILE', standardSchedule),
    ).rejects.toThrow('firestore unavailable');
  });
});
