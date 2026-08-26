import { db } from './firebase';
import type { Novelty, ScheduleRecord, ScheduleEvidence } from './noveltyService';

export interface AriaWorkforceReadRequest {
  companyId: string;
  employeeId: string;
  date: string;
  noveltyLimit?: number;
}

export interface AriaWorkforceReadResult {
  companyId: string;
  tenantId: string;
  employeeId: string;
  date: string;
  schedule: ScheduleRecord | null;
  scheduleEvidence: ScheduleEvidence;
  recentNovelties: Novelty[];
  readOnly: true;
}

function requireText(value: string, errorCode: string): string {
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error(errorCode);
  return normalized;
}

export async function readAriaWorkforceContext(
  request: AriaWorkforceReadRequest
): Promise<AriaWorkforceReadResult> {
  const companyId = requireText(request.companyId, 'company_id_required');
  const employeeId = requireText(request.employeeId, 'employee_id_required');
  const date = requireText(request.date, 'date_required');
  const noveltyLimit = Math.max(1, Math.min(Number(request.noveltyLimit || 20), 100));

  const scheduleSnapshot = await db
    .collection('schedules')
    .where('companyId', '==', companyId)
    .limit(500)
    .get();

  let schedule: ScheduleRecord | null = null;
  for (const doc of scheduleSnapshot.docs) {
    const data = doc.data() as Partial<ScheduleRecord>;
    if (
      String(data.companyId || '') !== companyId ||
      String(data.employeeId || '') !== employeeId ||
      String(data.date || '') !== date
    ) continue;
    if (!data.startTime || !data.endTime) break;
    schedule = {
      id: doc.id,
      companyId,
      employeeId,
      date,
      startTime: String(data.startTime),
      endTime: String(data.endTime),
    };
    break;
  }

  const noveltySnapshot = await db
    .collection('novelties')
    .where('companyId', '==', companyId)
    .limit(500)
    .get();

  const recentNovelties = noveltySnapshot.docs
    .map((doc) => doc.data() as Partial<Novelty>)
    .filter((data) => String(data.user_id || '') === employeeId && String(data.companyId || '') === companyId)
    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
    .slice(0, noveltyLimit) as Novelty[];

  return {
    companyId,
    tenantId: companyId,
    employeeId,
    date,
    schedule,
    scheduleEvidence: schedule ? 'schedule' : 'no_schedule',
    recentNovelties,
    readOnly: true,
  };
}
