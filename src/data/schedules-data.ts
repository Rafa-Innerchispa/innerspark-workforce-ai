import type { Schedule } from '../domain/types';
import { employees } from './employees-data';

export const schedules: Schedule[] = [];

const assignShift = (empId: string, shiftId: string, days: number[]) => {
  schedules.push({
    id: `sched-${empId}-current`,
    employeeId: empId, shiftId,
    startDate: '2025-01-01',
    endDate: null,
    daysOfWeek: days,
    effectiveDate: '2025-01-01',
  });
};

// Office workers (Matriz Quito) — shift-004 (Admin 08:00-17:00)
const officeEmpIds = ['emp-001', 'emp-002', 'emp-003', 'emp-022', 'emp-023'];
officeEmpIds.forEach(eid => assignShift(eid, 'shift-004', [1, 2, 3, 4, 5]));

// Sales (Matriz Quito) — shift-005 (Ventas 09:00-18:00)
assignShift('emp-019', 'shift-005', [1, 2, 3, 4, 5]);
assignShift('emp-020', 'shift-005', [1, 2, 3, 4, 5, 6]);
assignShift('emp-021', 'shift-006', [1, 2, 3, 4, 5]);

// Plant workers (Guayaquil) with rotating shifts
const plantEmpIds = employees
  .filter(e => e.locationId === 'loc-002' && e.status === 'active')
  .map(e => e.id);

plantEmpIds.forEach((eid, i) => {
  if (i < 5) assignShift(eid, 'shift-001', [1, 2, 3, 4, 5]);
  else if (i < 10) assignShift(eid, 'shift-002', [1, 2, 3, 4, 5]);
  else assignShift(eid, 'shift-001', [1, 2, 3, 4, 5, 6]);
});