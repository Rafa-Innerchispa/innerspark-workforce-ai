import { db } from './firebase';

export type NoveltyType = 'LATE_ARRIVAL' | 'EARLY_DEPARTURE' | 'OVERTIME' | 'ON_TIME';
export type ScheduleStatus = 'configured' | 'not_configured';

export interface WorkSchedule {
  start: string;
  end: string;
  graceMinutes?: number;
  overtimeGraceMinutes?: number;
}

export interface Novelty {
  user_id: string;
  source: 'ADMS' | 'MOBILE';
  timestamp: string;
  type: NoveltyType;
  minutes: number;
  schedule_status: ScheduleStatus;
  schedule?: WorkSchedule;
  created_at: string;
}

function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function localMinutes(dateObj: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guayaquil',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(dateObj);
  const rawHours = Number(parts.find(part => part.type === 'hour')?.value || '0');
  const hours = rawHours === 24 ? 0 : rawHours;
  const minutes = Number(parts.find(part => part.type === 'minute')?.value || '0');
  return hours * 60 + minutes;
}

function parseTimestamp(timestampStr: string): Date {
  const dateObj = timestampStr.includes('T')
    ? new Date(timestampStr)
    : new Date(timestampStr.replace(' ', 'T') + '-05:00');
  if (Number.isNaN(dateObj.getTime())) {
    throw new Error(`invalid_checkin_timestamp:${timestampStr}`);
  }
  return dateObj;
}

function scheduleFromEmployee(data: Record<string, unknown> | undefined): WorkSchedule | null {
  if (!data) return null;
  const inline = data.schedule;
  if (inline && typeof inline === 'object') {
    const schedule = inline as Record<string, unknown>;
    const start = String(schedule.start || schedule.startTime || '');
    const end = String(schedule.end || schedule.endTime || '');
    if (parseTime(start) !== null && parseTime(end) !== null) {
      return {
        start,
        end,
        graceMinutes: Number(schedule.graceMinutes ?? 15),
        overtimeGraceMinutes: Number(schedule.overtimeGraceMinutes ?? 30),
      };
    }
  }

  const start = String(data.scheduleStart || data.shiftStart || '');
  const end = String(data.scheduleEnd || data.shiftEnd || '');
  if (parseTime(start) !== null && parseTime(end) !== null) {
    return {
      start,
      end,
      graceMinutes: Number(data.graceMinutes ?? 15),
      overtimeGraceMinutes: Number(data.overtimeGraceMinutes ?? 30),
    };
  }
  return null;
}

export async function getEmployeeSchedule(userId: string): Promise<WorkSchedule | null> {
  const docRef = db.collection('employees').doc(userId);
  if (!docRef || typeof docRef.get !== 'function') return null;
  const snapshot = await docRef.get();
  if (!snapshot?.exists || typeof snapshot.data !== 'function') return null;
  return scheduleFromEmployee(snapshot.data() as Record<string, unknown> | undefined);
}

export function classifyNovelty(timestampStr: string, schedule: WorkSchedule | null): Omit<Novelty, 'user_id' | 'source' | 'created_at'> {
  const dateObj = parseTimestamp(timestampStr);
  if (!schedule) {
    return {
      timestamp: dateObj.toISOString(),
      type: 'ON_TIME',
      minutes: 0,
      schedule_status: 'not_configured',
    };
  }

  const entryTime = parseTime(schedule.start);
  const exitTime = parseTime(schedule.end);
  if (entryTime === null || exitTime === null) {
    return {
      timestamp: dateObj.toISOString(),
      type: 'ON_TIME',
      minutes: 0,
      schedule_status: 'not_configured',
    };
  }

  const timeInMinutes = localMinutes(dateObj);
  const grace = Math.max(0, Number(schedule.graceMinutes ?? 15));
  const overtimeGrace = Math.max(0, Number(schedule.overtimeGraceMinutes ?? 30));
  let type: NoveltyType = 'ON_TIME';
  let minutes = 0;

  if (timeInMinutes < entryTime + 120) {
    if (timeInMinutes > entryTime + grace) {
      type = 'LATE_ARRIVAL';
      minutes = timeInMinutes - entryTime;
    }
  } else if (timeInMinutes >= exitTime) {
    if (timeInMinutes > exitTime + overtimeGrace) {
      type = 'OVERTIME';
      minutes = timeInMinutes - exitTime;
    }
  } else if (timeInMinutes > entryTime + 120 && timeInMinutes < exitTime) {
    type = 'EARLY_DEPARTURE';
    minutes = exitTime - timeInMinutes;
  }

  return {
    timestamp: dateObj.toISOString(),
    type,
    minutes,
    schedule_status: 'configured',
    schedule,
  };
}

export async function processCheckinNovelty(
  userId: string,
  timestampStr: string,
  source: 'ADMS' | 'MOBILE',
  scheduleOverride?: WorkSchedule | null,
): Promise<Novelty> {
  const schedule = scheduleOverride === undefined
    ? await getEmployeeSchedule(userId)
    : scheduleOverride;
  const classified = classifyNovelty(timestampStr, schedule);
  const novelty: Novelty = {
    user_id: userId || 'unknown',
    source,
    ...classified,
    created_at: new Date().toISOString(),
  };

  const docRef = db.collection('novelties').doc();
  if (!docRef || typeof docRef.set !== 'function') {
    throw new Error('novelty_persistence_unavailable');
  }
  await docRef.set(novelty);
  return novelty;
}
