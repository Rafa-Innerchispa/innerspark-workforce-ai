import { createSchedule, listSchedules, normalizeScheduleInput } from './scheduleService';

function makeMockDb(docs: Array<{ id: string; data: object }> = []) {
  const store: Record<string, object> = {};
  for (const d of docs) store[d.id] = d.data;
  return {
    collection: (_name: string) => ({
      doc: (id?: string) => {
        const docId = id || 'generated-id';
        return {
          id: docId,
          set: async (data: object) => {
            store[docId] = data;
          },
        };
      },
      orderBy: (_field: string, _dir: 'asc' | 'desc') => ({
        limit: (_n: number) => ({
          get: async () => ({
            docs: Object.entries(store).map(([id, data]) => ({
              id,
              data: () => data,
            })),
          }),
        }),
      }),
    }),
  };
}

describe('scheduleService', () => {
  it('normalizes valid schedule input', () => {
    const parsed = normalizeScheduleInput({
      employeeId: '1790000001',
      employeeName: 'Juan Pérez',
      shift: 'Mañana (08:00 - 17:00)',
      date: '2026-08-29',
      status: 'Pendiente',
    });
    expect(parsed?.employeeId).toBe('1790000001');
  });

  it('rejects invalid schedule input', () => {
    expect(normalizeScheduleInput({ employeeId: '', employeeName: 'x', shift: 's', date: 'd', status: 'Pendiente' })).toBeNull();
  });

  it('creates and lists schedules', async () => {
    const db = makeMockDb();
    await createSchedule(db, {
      employeeId: '1790000001',
      employeeName: 'Juan Pérez',
      shift: 'Mañana (08:00 - 17:00)',
      date: '2026-08-29',
      status: 'Pendiente',
    });
    const rows = await listSchedules(db, { limit: 10 });
    expect(rows).toHaveLength(1);
    expect(rows[0].employeeName).toBe('Juan Pérez');
  });
});
