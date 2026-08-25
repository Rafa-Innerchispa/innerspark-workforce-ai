import { db } from '@/lib/firebase';
import { summarizeWorkforce, type AnalyticsEmployee, type AttendanceEvent } from './workforceAnalytics';

export async function loadTenantAnalytics(tenantId: string, fromIso?: string, toIso?: string) {
  const employeeSnapshot = await db.collection('employees').where('companyId', '==', tenantId).get();
  const employees: AnalyticsEmployee[] = employeeSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      department: data.department || data.area || data.departmentName,
      monthlyCost: Number(data.monthlyCost || 0) || undefined,
      baseSalary: Number(data.baseSalary || data.salary || 0) || undefined,
      scheduleStart: data.scheduleStart || data.shiftStart || undefined,
    };
  });

  const employeeIds = new Set(employees.map(employee => employee.id));
  let query: FirebaseFirestore.Query = db.collection('realtime_logs');
  if (fromIso) query = query.where('timestamp', '>=', fromIso);
  if (toIso) query = query.where('timestamp', '<=', toIso);
  const logSnapshot = await query.get();
  const events: AttendanceEvent[] = logSnapshot.docs
    .map(doc => doc.data())
    .filter(data => employeeIds.has(String(data.user_id || data.userId || '')))
    .map(data => ({
      userId: String(data.user_id || data.userId),
      timestamp: String(data.timestamp || data.event_at || ''),
      type: data.type || data.punch_type || undefined,
    }));

  return summarizeWorkforce(employees, events);
}
