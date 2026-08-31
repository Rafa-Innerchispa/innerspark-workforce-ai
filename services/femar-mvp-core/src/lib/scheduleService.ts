export type ScheduleStatus =
  | 'Completado'
  | 'Falta Injustificada'
  | 'Atraso'
  | 'Vacaciones'
  | 'Pendiente';

export interface ScheduleRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  shift: string;
  date: string;
  status: ScheduleStatus;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleInput {
  employeeId: string;
  employeeName: string;
  shift: string;
  date: string;
  status: ScheduleStatus;
  companyId?: string;
}

type FirestoreDb = {
  collection: (name: string) => {
    doc: (id?: string) => {
      id: string;
      set: (data: object, options?: object) => Promise<unknown>;
    };
    orderBy: (field: string, direction: 'asc' | 'desc') => {
      limit: (n: number) => { get: () => Promise<{ docs: Array<{ id: string; data: () => object }> }> };
    };
  };
};

export function normalizeScheduleInput(raw: Partial<ScheduleInput>): ScheduleInput | null {
  const employeeId = String(raw.employeeId || '').trim();
  const employeeName = String(raw.employeeName || '').trim();
  const shift = String(raw.shift || '').trim();
  const date = String(raw.date || '').trim();
  const status = raw.status as ScheduleStatus;
  const allowed: ScheduleStatus[] = [
    'Completado',
    'Falta Injustificada',
    'Atraso',
    'Vacaciones',
    'Pendiente',
  ];
  if (!employeeId || !employeeName || !shift || !date || !allowed.includes(status)) {
    return null;
  }
  return {
    employeeId,
    employeeName,
    shift,
    date,
    status,
    companyId: raw.companyId ? String(raw.companyId).trim() : undefined,
  };
}

export async function listSchedules(
  db: FirestoreDb,
  options: { limit?: number } = {},
): Promise<ScheduleRecord[]> {
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
  const snapshot = await db
    .collection('schedules')
    .orderBy('date', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map((doc) => {
    const data = doc.data() as Omit<ScheduleRecord, 'id'>;
    return { id: doc.id, ...data };
  });
}

export async function createSchedule(
  db: FirestoreDb,
  input: ScheduleInput,
): Promise<ScheduleRecord> {
  const now = new Date().toISOString();
  const ref = db.collection('schedules').doc();
  const record: ScheduleRecord = {
    id: ref.id,
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(record);
  return record;
}
