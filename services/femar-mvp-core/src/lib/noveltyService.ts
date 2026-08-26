import { db } from './firebase';

export type NoveltyType = 'LATE_ARRIVAL' | 'EARLY_DEPARTURE' | 'OVERTIME' | 'ON_TIME';
export type ScheduleEvidence = 'schedule' | 'no_schedule';

export interface ScheduleRecord {
  id?: string;
  companyId: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface Novelty {
  user_id: string;
  companyId: string;
  tenantId: string;
  source: 'ADMS' | 'MOBILE';
  timestamp: string;
  type: NoveltyType;
  minutes: number;
  created_at: string;
  schedule_id: string | null;
  schedule_evidence: ScheduleEvidence;
}

function parseTimestamp(timestampStr: string): Date {
  const parsed = timestampStr.includes('T')
    ? new Date(timestampStr)
    : new Date(timestampStr.replace(' ', 'T') + '-05:00');
  if (Number.isNaN(parsed.getTime())) throw new Error('invalid_attendance_timestamp');
  return parsed;
}

function guayaquilParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    minuteOfDay: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function timeToMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ''));
  if (!match) throw new Error('invalid_schedule_time');
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error('invalid_schedule_time');
  return hour * 60 + minute;
}

export function classifyScheduleNovelty(
  eventMinute: number,
  schedule: Pick<ScheduleRecord, 'startTime' | 'endTime'> | null
): { type: NoveltyType; minutes: number; scheduleEvidence: ScheduleEvidence } {
  if (!schedule) {
    return { type: 'ON_TIME', minutes: 0, scheduleEvidence: 'no_schedule' };
  }

  const start = timeToMinutes(schedule.startTime);
  const end = timeToMinutes(schedule.endTime);
  if (end <= start) throw new Error('overnight_schedule_not_supported');

  if (eventMinute > end) {
    return { type: 'OVERTIME', minutes: eventMinute - end, scheduleEvidence: 'schedule' };
  }
  if (eventMinute > start) {
    return { type: 'LATE_ARRIVAL', minutes: eventMinute - start, scheduleEvidence: 'schedule' };
  }
  return { type: 'ON_TIME', minutes: 0, scheduleEvidence: 'schedule' };
}

async function loadSchedule(companyId: string, employeeId: string, dateKey: string): Promise<ScheduleRecord | null> {
  const snapshot = await db.collection('schedules').where('companyId', '==', companyId).limit(500).get();
  for (const doc of snapshot.docs) {
    const data = doc.data() as Partial<ScheduleRecord>;
    if (String(data.employeeId || '') === employeeId && String(data.date || '') === dateKey) {
      if (!data.startTime || !data.endTime) return null;
      return {
        id: doc.id,
        companyId,
        employeeId,
        date: dateKey,
        startTime: String(data.startTime),
        endTime: String(data.endTime),
      };
    }
  }
  return null;
}

export async function processCheckinNovelty(
  userId: string,
  timestampStr: string,
  source: 'ADMS' | 'MOBILE',
  companyId: string
): Promise<Novelty> {
  if (!companyId) throw new Error('company_id_required_for_novelty');

  const dateObj = parseTimestamp(timestampStr);
  const { dateKey, minuteOfDay } = guayaquilParts(dateObj);
  const schedule = await loadSchedule(companyId, userId, dateKey);
  const classification = classifyScheduleNovelty(minuteOfDay, schedule);

  const novelty: Novelty = {
    user_id: userId || 'unknown',
    companyId,
    tenantId: companyId,
    source,
    timestamp: dateObj.toISOString(),
    type: classification.type,
    minutes: classification.minutes,
    created_at: new Date().toISOString(),
    schedule_id: schedule?.id || null,
    schedule_evidence: classification.scheduleEvidence,
  };

  await db.collection('novelties').doc().set(novelty);
  return novelty;
}
