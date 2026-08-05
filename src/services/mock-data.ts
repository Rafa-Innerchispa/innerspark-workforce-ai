// Synthetic mock data service — deterministic demo data
import type { AttendanceEvent, AttendanceException, ApprovalRecord, PayrollPeriod, EmployeePayrollBreakdown, PayrollAdjustment, AIReviewResult, AIFinding, ShiftPolicy, ScheduleGroup, AttendanceReportRow, PaySlipLine, EmployeePaySlip, PayrollPeriodV2 } from '../domain/types';
import { employees } from '../data/employees-data';
import { company } from '../data/company-data';
import { locations } from '../data/company-data';
import { shifts } from '../data/company-data';
import { devices } from '../data/devices-data';
import { schedules } from '../data/schedules-data';
import { holidays } from '../data/holidays-data';
import { requests as requestList } from '../data/requests-data';

// Shared exception store (mutable for approval flow)
const _exceptions: AttendanceException[] = [];
const _approvals: ApprovalRecord[] = [];

const h = (d: number, hh: number, mm: number) => `2025-03-${String(d).padStart(2,"0")}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:00-05:00`;

// Build seeded attendance events
function buildEvents(): AttendanceEvent[] {
  const ev: AttendanceEvent[] = [];
  let i = 0;

  const push = (employeeId: string, ds: string, dm: any, pin: string, t: string, typ: "clock_in"|"clock_out", vm: any, pr: any) => {
    ev.push({ id:`evt-${String(++i).padStart(5,"0")}`, deviceSerial:ds, deviceModel:dm, employeePin:pin, employeeId, eventTime:t, verificationMethod:vm, eventType:typ, sourceProtocol:pr, rawEventId:`raw-${pin}-${i}` });
  };

  const active = employees.filter(e => e.status === 'active');
  for (const emp of active) {
    const sched = schedules.find(s => s.employeeId === emp.id);
    const shift = sched ? shifts.find(sh => sh.id === sched.shiftId) : undefined;
    if (!shift) continue;

    for (let d = 3; d <= 14; d++) {
      const dow = new Date(2025, 2, d).getDay();
      if (dow === 0) continue;
      if (sched && !sched.daysOfWeek.includes(dow)) continue;

      const [sh, sm] = shift.startTime.split(':').map(Number);
      const [eh, em] = shift.endTime.split(':').map(Number);
      const v = (emp.employeePin.charCodeAt(0) + d) % 12 - 5;
      let inH = sh, inM = sm + v;
      let outH = eh, outM = em + (v % 7) - 3;

      // Anomalies — some override hour as well
      if (emp.id === 'emp-005' && d === 5) { inM = 38; }
      if (emp.id === 'emp-005' && d === 10) { inM = 42; }
      if (emp.id === 'emp-006' && d === 13) continue; // absence
      if (emp.id === 'emp-008' && d === 7) { inM = 3; } // missing punch
      if (emp.id === 'emp-018' && d === 11) { outH = 13; outM = 45; }
      if (emp.id === 'emp-010' && d === 12) continue; // absence
      if (emp.id === 'emp-010' && d === 13) continue; // absence
      if (emp.id === 'emp-011' && d === 7) { outH = 17; outM = 45; }
      if (emp.id === 'emp-011' && d === 12) { outH = 18; outM = 20; }

      // Handle minute overflow/underflow into hour
      const inHourAdj = inH + Math.floor(inM / 60);
      const inMinAdj = ((inM % 60) + 60) % 60;
      const outHourAdj = outH + Math.floor(outM / 60);
      const outMinAdj = ((outM % 60) + 60) % 60;

      const loc = locations.find(l => l.id === emp.locationId);
      const dev = devices.find(dd => dd.locationId === loc?.id && dd.status === 'online') || devices[0];

      push(emp.id, dev.serial, dev.model, emp.employeePin, h(d, inHourAdj, inMinAdj), "clock_in", "face", dev.protocol);

      if (emp.id === 'emp-008' && d === 7) continue; // missing punch

      push(emp.id, dev.serial, dev.model, emp.employeePin, h(d, outHourAdj, outMinAdj), "clock_out", "face", dev.protocol);
    }
  }
  return ev;
}

const _events = buildEvents();

function buildExceptions(): AttendanceException[] {
  const ex: AttendanceException[] = [];

  const add = (id: string, eid: string, date: string, type: any, severity: any, desc: string, sStart: string, sEnd: string, aStart: string|null, aEnd: string|null, mins: number, impact: number, note?: string, status: any = 'pending') => {
    ex.push({ id, employeeId:eid, date, type, severity, status, description:desc, scheduledStart:sStart, scheduledEnd:sEnd, actualStart:aStart, actualEnd:aEnd, minutesAffected:mins, monetaryImpact:impact, relatedEventIds:[], createdAt:new Date().toISOString(), aiNote:note });
  };

  add('exc-001', 'emp-005', '2025-03-05', 'lateness', 'high', 'Luisa Fernández entrada 07:38. Atraso 28 min.', '07:00','15:00','07:38','15:02',28,+(28/60*4.09).toFixed(2), 'Segundo atraso del mes. Requiere atención.');
  add('exc-002', 'emp-005', '2025-03-10', 'lateness', 'high', 'Luisa Fernández entrada 07:42. Atraso 32 min.', '07:00','15:00','07:42','15:01',32,+(32/60*4.09).toFixed(2), 'Acumula 60 min de atraso en la semana.');
  add('exc-003', 'emp-008', '2025-03-06', 'missing_punch', 'critical', 'Diego Ramírez no registró salida el 6 de marzo.', '07:00','15:00','07:03',null,480,+(480/60*4.33).toFixed(2), 'Marcación faltante. Se requiere corrección.');
  add('exc-004', 'emp-018', '2025-03-11', 'early_exit', 'high', 'Miguel Ávila salida 13:45. Anticipación 1h15min.', '07:00','15:00','07:02','13:45',75,+(75/60*4.33).toFixed(2), 'Verificar si tenía permiso.');
  add('exc-005', 'emp-011', '2025-03-07', 'extra_time', 'medium', 'Camila Torres trabajó hasta 17:45. Tiempo extra 2h45min.', '07:00','15:00','07:01','17:45',165,0, 'Horas extras. Verificar autorización.');
  add('exc-006', 'emp-011', '2025-03-12', 'extra_time', 'medium', 'Camila Torres trabajó hasta 18:20. Tiempo extra 3h20min.', '07:00','15:00','07:02','18:20',200,0, 'Segunda instancia en la semana. Revisar carga.');
  add('exc-007', 'emp-006', '2025-03-13', 'absence', 'critical', 'Jorge Patricio sin marcación el 13 de marzo. Sin justificación.', '07:00','15:00',null,null,480,+(480/60*4.09).toFixed(2), 'Inasistencia sin justificar.');
  add('exc-008', 'emp-010', '2025-03-12', 'absence', 'critical', 'Andrés Viteri sin marcación el 12 de marzo. Sin justificación.', '07:00','15:00',null,null,480,+(480/60*3.85).toFixed(2), 'Ausencia sin justificar.');
  add('exc-009', 'emp-010', '2025-03-13', 'absence', 'critical', 'Andrés Viteri sin marcación el 13 de marzo. Segundo día.', '07:00','15:00',null,null,480,+(480/60*3.85).toFixed(2), 'Segundo día consecutivo. Activar protocolo.');

  // One pre-approved
  ex.push({ id:'exc-010', employeeId:'emp-013', date:'2025-03-06', type:'early_exit', severity:'medium', status:'approved', description:'Valentina Quintero salida 14:30. Justificación médica aprobada.', scheduledStart:'07:00', scheduledEnd:'15:00', actualStart:'07:05', actualEnd:'14:30', minutesAffected:30, monetaryImpact:0, relatedEventIds:[], createdAt:'2025-03-06T15:00:00-05:00', resolvedAt:'2025-03-06T16:30:00-05:00', resolvedBy:'emp-004' });

  return ex;
}

_exceptions.push(...buildExceptions());

// Exported service
export const mockData = {
  company, locations, shifts, devices,
  employees: () => employees,
  employee: (id: string) => employees.find(e => e.id === id),
  schedules: () => schedules,
  events: () => _events,
  recentEvents: (n = 20) => [..._events].sort((a,b) => b.eventTime.localeCompare(a.eventTime)).slice(0, n),
  eventsByEmployee: (eid: string) => _events.filter(e => e.employeeId === eid),
  eventsToday: () => {
    const today = '2025-03-14';
    return _events.filter(e => e.eventTime.startsWith(today)).sort((a,b) => b.eventTime.localeCompare(a.eventTime));
  },

  exceptions: () => _exceptions,
  pendingExceptions: () => _exceptions.filter(e => e.status === 'pending'),
  exceptionsByEmployee: (eid: string) => _exceptions.filter(e => e.employeeId === eid),
  exceptionsByType: (type: string) => _exceptions.filter(e => e.type === type),

  approvals: () => _approvals,
  approve: (exceptionId: string, approverId: string, comment: string, correction?: Partial<AttendanceException>) => {
    const exc = _exceptions.find(e => e.id === exceptionId);
    if (!exc) return null;
    exc.status = 'approved';
    exc.resolvedAt = new Date().toISOString();
    exc.resolvedBy = approverId;
    const rec: ApprovalRecord = { id:`apr-${_approvals.length+1}`, exceptionId, employeeId:exc.employeeId, approverId, action:'approved', comment, correctionData:correction, timestamp:new Date().toISOString() };
    _approvals.push(rec);
    return rec;
  },

  payrollPeriod: (): PayrollPeriod => {
    const active = employees.filter(e => e.status === 'active');
    const pending = _exceptions.filter(e => e.status === 'pending');
    return {
      id:'pp-2025-p1', companyId:'comp-001', name:'Marzo 2025 — P1 (3–14 Mar)', startDate:'2025-03-03', endDate:'2025-03-14', status:'under_review',
      totalEmployees:active.length, totalBaseSalary:active.reduce((s,e)=>s+e.baseSalary,0), totalOvertime:98.24, totalAdditions:150, totalDeductions:67.36,
      totalNetPayroll:active.reduce((s,e)=>s+e.baseSalary,0)+98.24+150-67.36, overtime50Hours:12, overtime100Hours:4, overtime50Amount:73.68, overtime100Amount:24.56,
      anomalyCount: pending.length, criticalAnomalyCount: pending.filter(e => e.severity === 'critical').length,
    };
  },

  payrollBreakdowns: (): EmployeePayrollBreakdown[] => {
    return employees.filter(e => e.status === 'active').map(emp => {
      const empExc = _exceptions.filter(e => e.employeeId === emp.id);
      const hasPend = empExc.some(e => e.status === 'pending');
      const hasCrit = empExc.some(e => e.severity === 'critical' && e.status === 'pending');
      const days = new Set(_events.filter(e => e.employeeId === emp.id).map(e => e.eventTime.slice(0,10))).size;
      const additions: PayrollAdjustment[] = empExc.filter(e => e.type==='extra_time' && e.status==='approved').map(e => ({ id:`adj-${e.id}`, concept:`Horas extra — ${e.date}`, amount:e.monetaryImpact||34.50, type:'addition', isConfigurable:true, description:e.description }));
      const deductions: PayrollAdjustment[] = empExc.filter(e => (e.type==='lateness'||e.type==='absence') && e.status==='approved').map(e => ({ id:`adj-${e.id}`, concept:`${e.type==='lateness'?'Atraso':'Ausencia'} — ${e.date}`, amount:e.monetaryImpact, type:'deduction', isConfigurable:true, description:e.description }));
      return {
        employeeId:emp.id, fullName:emp.fullName, department:emp.department, baseSalary:emp.baseSalary, workedDays:Math.max(days,1),
        totalWorkedHours:days*8, regularHours:days*8, overtime50Hours:0, overtime100Hours:0, overtime50Amount:0, overtime100Amount:0,
        additions, deductions, totalAdditions:additions.reduce((s,a)=>s+a.amount,0), totalDeductions:deductions.reduce((s,a)=>s+a.amount,0),
        grossPay:emp.baseSalary, netPay:emp.baseSalary, status: hasCrit ? 'has_anomalies' : hasPend ? 'pending_review' : 'complete',
      };
    });
  },

  aiReview: (): AIReviewResult => {
    const pending = _exceptions.filter(e => e.status === 'pending');
    const critical = pending.filter(e => e.severity === 'critical');
    const totalImpact = pending.reduce((s,e) => s + e.monetaryImpact, 0);
    const findings: AIFinding[] = pending.map(e => ({
      employeeId: e.employeeId,
      employeeName: employees.find(emp => emp.id === e.employeeId)?.fullName || 'Desconocido',
      issue: e.description,
      evidence: [`Marcaje: ${e.actualStart || 'Sin registro'} — ${e.actualEnd || 'Sin registro'}`, `Diferencia: ${e.minutesAffected} min`],
      rulesApplied: ['Comparación vs horario asignado', 'Regla de tolerancia por turno'],
      estimatedImpact: e.monetaryImpact,
      riskLevel: (e.severity === 'critical' ? 'critical' : e.severity === 'high' ? 'high' : 'medium') as any,
    }));

    return {
      periodId: 'pp-2025-p1', periodName: 'Marzo 2025 — P1 (3–14 Mar)',
      overallRiskLevel: critical.length > 0 ? 'high' : pending.length > 3 ? 'medium' : 'low',
      summary: `Se identificaron ${pending.length} anomalías pendientes. Impacto estimado: $${totalImpact.toFixed(2)}. ${critical.length > 0 ? `${critical.length} hallazgos críticos requieren atención.` : ''}`,
      anomalyBreakdown: [
        { type:'lateness', count:_exceptions.filter(e=>e.type==='lateness').length, totalImpact:_exceptions.filter(e=>e.type==='lateness').reduce((s,e)=>s+e.monetaryImpact,0) },
        { type:'absence', count:_exceptions.filter(e=>e.type==='absence').length, totalImpact:_exceptions.filter(e=>e.type==='absence').reduce((s,e)=>s+e.monetaryImpact,0) },
        { type:'missing_punch', count:_exceptions.filter(e=>e.type==='missing_punch').length, totalImpact:_exceptions.filter(e=>e.type==='missing_punch').reduce((s,e)=>s+e.monetaryImpact,0) },
        { type:'early_exit', count:_exceptions.filter(e=>e.type==='early_exit').length, totalImpact:_exceptions.filter(e=>e.type==='early_exit').reduce((s,e)=>s+e.monetaryImpact,0) },
        { type:'extra_time', count:_exceptions.filter(e=>e.type==='extra_time').length, totalImpact:_exceptions.filter(e=>e.type==='extra_time').reduce((s,e)=>s+e.monetaryImpact,0) },
      ],
      criticalFindings: findings.slice(0, 4),
      recommendations: critical.length > 0
        ? ['⚠ No cerrar período. Resolver ausencias de Andrés Viteri (12-13 mar).', 'Solicitar justificación marcaje faltante de Diego Ramírez.', 'Documentar horas extra de Camila Torres.', 'Una vez resueltas las críticas, el período puede cerrarse con riesgo medio.']
        : ['✅ Período listo para cierre. Revisar atrasos pendientes.', 'Documentar justificaciones de horas extra.', 'Adjinar respaldos de auditoría.'],
      canClosePeriod: critical.length === 0,
      reasonSummary: critical.length > 0 ? `❌ ${critical.length} excepción(es) crítica(s) sin resolver. No cerrar.` : '✅ Sin anomalías críticas. Período puede cerrarse.',
      reviewedAt: new Date().toISOString(),
      modelUsed: 'deterministic',
    };
  },

  // --- New data for competitive parity ---

  shiftPolicies: (): ShiftPolicy[] => [
    { id:'sp-001', name:'Diurno — Producción', shiftType:'regular', startTime:'07:00', endTime:'15:00', graceMinutes:10, breakMinutes:15, workHoursPerDay:8, maxOvertimeHoursPerDay:4, requiresNightSurcharge:false, nightSurchargeStart:'', nightSurchargeEnd:'', requiredPunches:4, overtimePolicy:'50% diurno, 100% festivo', active:true },
    { id:'sp-002', name:'Vespertino — Producción', shiftType:'regular', startTime:'15:00', endTime:'23:00', graceMinutes:10, breakMinutes:15, workHoursPerDay:8, maxOvertimeHoursPerDay:4, requiresNightSurcharge:true, nightSurchargeStart:'22:00', nightSurchargeEnd:'23:00', requiredPunches:4, overtimePolicy:'50% diurno, 100% nocturno', active:true },
    { id:'sp-003', name:'Nocturno', shiftType:'night', startTime:'23:00', endTime:'07:00', graceMinutes:10, breakMinutes:30, workHoursPerDay:8, maxOvertimeHoursPerDay:4, requiresNightSurcharge:true, nightSurchargeStart:'23:00', nightSurchargeEnd:'07:00', requiredPunches:4, overtimePolicy:'100% horas nocturnas + recargo 25%', active:true },
    { id:'sp-004', name:'Lactancia', shiftType:'flexible', startTime:'07:30', endTime:'14:30', graceMinutes:15, breakMinutes:60, workHoursPerDay:6, maxOvertimeHoursPerDay:2, requiresNightSurcharge:false, nightSurchargeStart:'', nightSurchargeEnd:'', requiredPunches:2, overtimePolicy:'50% hasta 2h', active:true },
    { id:'sp-005', name:'Administrativo', shiftType:'regular', startTime:'08:00', endTime:'17:00', graceMinutes:15, breakMinutes:60, workHoursPerDay:8, maxOvertimeHoursPerDay:4, requiresNightSurcharge:false, nightSurchargeStart:'', nightSurchargeEnd:'', requiredPunches:2, overtimePolicy:'50% diurno', active:true },
    { id:'sp-006', name:'Ventas — Part Time', shiftType:'part_time', startTime:'09:00', endTime:'13:00', graceMinutes:10, breakMinutes:0, workHoursPerDay:4, maxOvertimeHoursPerDay:2, requiresNightSurcharge:false, nightSurchargeStart:'', nightSurchargeEnd:'', requiredPunches:2, overtimePolicy:'50%', active:true },
  ],

  scheduleGroups: (): ScheduleGroup[] => [
    { id:'sg-001', name:'Matriz Quito — Admin', locationId:'loc-001', policyId:'sp-005', employeeIds:['emp-001','emp-002','emp-003','emp-022','emp-023'] },
    { id:'sg-002', name:'Matriz Quito — Ventas', locationId:'loc-001', policyId:'sp-006', employeeIds:['emp-019','emp-020','emp-021'] },
    { id:'sg-003', name:'Planta Guayaquil — Diurno', locationId:'loc-002', policyId:'sp-001', employeeIds:['emp-005','emp-006','emp-007','emp-008','emp-009'] },
    { id:'sg-004', name:'Planta Guayaquil — Vespertino', locationId:'loc-002', policyId:'sp-002', employeeIds:['emp-011','emp-012','emp-013','emp-014','emp-015'] },
    { id:'sg-005', name:'Planta Guayaquil — Nocturno', locationId:'loc-002', policyId:'sp-003', employeeIds:['emp-016','emp-017','emp-018','emp-025'] },
    { id:'sg-006', name:'Cuenca — General', locationId:'loc-003', policyId:'sp-005', employeeIds:[] },
  ],

  holidays: () => holidays,
  holidaysInMonth: (month: number) => holidays.filter(h => {
    const m = parseInt(h.date.split('-')[0], 10);
    return (!h.year || h.year === 2025) && m === month;
  }),

  requests: () => requestList,
  pendingRequests: () => requestList.filter(r => r.status === 'pending'),
  requestsByEmployee: (eid: string) => requestList.filter(r => r.employeeId === eid),

  approveRequest: (reqId: string, approverId: string, comment: string) => {
    const req = requestList.find(r => r.id === reqId);
    if (!req) return null;
    req.status = 'approved';
    req.resolvedAt = new Date().toISOString();
    req.resolvedBy = approverId;
    req.approverComment = comment;
    return req;
  },
  rejectRequest: (reqId: string, approverId: string, comment: string) => {
    const req = requestList.find(r => r.id === reqId);
    if (!req) return null;
    req.status = 'rejected';
    req.resolvedAt = new Date().toISOString();
    req.resolvedBy = approverId;
    req.approverComment = comment;
    return req;
  },

  attendanceReport: (): AttendanceReportRow[] => {
    return employees.filter(e => e.status === 'active').map(emp => {
      const empEv = _events.filter(e => e.employeeId === emp.id);
      const empExc = _exceptions.filter(e => e.employeeId === emp.id);
      const days = new Set(empEv.map(e => e.eventTime.slice(0,10))).size;
      const lateMins = empExc.filter(e => e.type === 'lateness').reduce((s, e) => s + e.minutesAffected, 0);
      const absences = empExc.filter(e => e.type === 'absence').length;
      const permCount = requestList.filter(r => r.employeeId === emp.id && (r.type === 'permission' || r.type === 'justification') && r.status === 'approved').length;
      const regular = days * 8;
      return {
        employeeId: emp.id, fullName: emp.fullName, department: emp.department,
        regularHours: regular, nightHours: 0, overtime50Hours: 0, overtime100Hours: 0,
        absences, lateMinutes: lateMins, permissions: permCount, totalHours: regular,
      };
    });
  },

  // --- Enhanced payroll / pre-nómina ---
  payrollPeriodV2: (): PayrollPeriodV2 => {
    const active = employees.filter(e => e.status === 'active');
    const crit = _exceptions.filter(e => e.status === 'pending' && e.severity === 'critical');
    return {
      id:'pp-2025-p1', name:'Marzo 2025 — P1 (3–14 Mar)', startDate:'2025-03-03', endDate:'2025-03-14',
      status: crit.length > 0 ? 'borrador' : 'en_revision',
      totalEmployees: active.length,
      totalBaseSalary: active.reduce((s,e) => s + e.baseSalary, 0),
      totalOvertime50: 73.68,
      totalOvertime100: 24.56,
      totalNightSurcharge: 18.40,
      totalAdditions: 150,
      totalDeductions: 67.36,
      totalNetPayroll: active.reduce((s,e) => s + e.baseSalary, 0) + 73.68 + 24.56 + 18.40 + 150 - 67.36,
      criticalAnomalyCount: crit.length,
    };
  },

  paySlip: (empId: string): EmployeePaySlip | null => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return null;
    const empEv = _events.filter(e => e.employeeId === empId);
    const empExc = _exceptions.filter(e => e.employeeId === empId);
    const days = new Set(empEv.map(e => e.eventTime.slice(0,10))).size;
    const pendCrit = empExc.filter(e => e.status === 'pending' && e.severity === 'critical');
    const regular = days * 8;
    const hr = emp.hourlyRate;
    const lines: PaySlipLine[] = [];

    // Base salary prorated
    lines.push({ concept:'Salario base proporcional', type:'earnings', amount: emp.baseSalary, ruleApplied:'Contrato / días del período', referenceDate:'2025-03' });
    // Regular hours
    lines.push({ concept:`Horas regulares (${regular}h × $${hr.toFixed(2)})`, type:'earnings', amount: +(regular * hr).toFixed(2), ruleApplied:'Horas trabajadas dentro del turno', referenceDate:'2025-03-03—14' });

    // Overtime
    empExc.filter(e => e.type === 'extra_time' && e.status === 'approved').forEach(e => {
      lines.push({ concept:`Hora extra 50% — ${e.date}`, type:'earnings', amount: e.monetaryImpact || 34.50, ruleApplied:'Art. 55 Código Trabajo: recargo 50%', evidenceLink:`${e.date} salida ${e.actualEnd}`, referenceDate:e.date });
    });

    // Night surcharge
    lines.push({ concept:'Recargo nocturno (estimado)', type:'earnings', amount: 18.40, ruleApplied:'Art. 49 CT: 25% sobre hora diurna', referenceDate:'2025-03-03—14' });

    // Late deductions
    empExc.filter(e => e.type === 'lateness' && e.status === 'approved').forEach(e => {
      lines.push({ concept:`Descuento atraso — ${e.date} (${e.minutesAffected} min)`, type:'deduction', amount: e.monetaryImpact, ruleApplied:'Minutos no trabajados / jornada × salario', evidenceLink:`Entrada ${e.actualStart}`, referenceDate:e.date });
    });

    // Absence deductions
    empExc.filter(e => e.type === 'absence' && e.status === 'approved').forEach(e => {
      lines.push({ concept:`Descuento ausencia — ${e.date}`, type:'deduction', amount: e.monetaryImpact, ruleApplied:'Día no trabajado sin goce', evidenceLink:'Sin marcación', referenceDate:e.date });
    });

    // IESS deduction (9.45%)
    const iess = +(emp.baseSalary * 0.0945).toFixed(2);
    lines.push({ concept:'Aporte IESS 9.45%', type:'deduction', amount: iess, ruleApplied:'Ley de Seguridad Social', referenceDate:'2025-03' });

    const totalEarnings = lines.filter(l => l.type === 'earnings').reduce((s, l) => s + l.amount, 0);
    const totalDeductions = lines.filter(l => l.type === 'deduction').reduce((s, l) => s + l.amount, 0);

    return {
      employeeId: emp.id, fullName: emp.fullName, department: emp.department, position: emp.position,
      baseSalary: emp.baseSalary, hourlyRate: hr, workedDays: Math.max(days, 1),
      lines, grossPay: totalEarnings, totalDeductions, netPay: +(totalEarnings - totalDeductions).toFixed(2),
      status: pendCrit.length > 0 ? 'has_anomalies' : 'complete',
      criticalAnomalies: pendCrit.length,
    };
  },

  paySlips: (): EmployeePaySlip[] => {
    return employees.filter(e => e.status === 'active').map(e => mockData.paySlip(e.id)).filter(Boolean) as EmployeePaySlip[];
  },
};