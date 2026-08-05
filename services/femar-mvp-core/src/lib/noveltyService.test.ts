import { processCheckinNovelty } from './noveltyService';

// Mock the db
jest.mock('./firebase', () => ({
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    set: jest.fn().mockResolvedValue(true)
  }
}));

describe('Novelty Service', () => {
  it('should detect LATE_ARRIVAL', async () => {
    const novelty = await processCheckinNovelty('user1', '2026-08-05 09:20:00', 'ADMS');
    expect(novelty.type).toBe('LATE_ARRIVAL');
    expect(novelty.minutes).toBe(20);
  });

  it('should detect ON_TIME', async () => {
    const novelty = await processCheckinNovelty('user1', '2026-08-05 08:55:00', 'ADMS');
    expect(novelty.type).toBe('ON_TIME');
  });

  it('should detect EARLY_DEPARTURE', async () => {
    const novelty = await processCheckinNovelty('user1', '2026-08-05 17:30:00', 'ADMS');
    expect(novelty.type).toBe('EARLY_DEPARTURE');
    expect(novelty.minutes).toBe(30);
  });

  it('should detect OVERTIME', async () => {
    const novelty = await processCheckinNovelty('user1', '2026-08-05 18:45:00', 'MOBILE');
    expect(novelty.type).toBe('OVERTIME');
    expect(novelty.minutes).toBe(45);
  });
});
