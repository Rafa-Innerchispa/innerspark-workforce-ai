import type { EmployeeRequest } from '../domain/types';

export const requests: EmployeeRequest[] = [
  // Approved requests
  {
    id: 'req-001', employeeId: 'emp-013', type: 'justification', status: 'approved',
    startDate: '2025-03-06', endDate: '2025-03-06',
    reason: 'Salida anticipada por cita médica programada',
    notes: 'Adjunto certificado médico',
    attachmentUrl: null,
    approverComment: 'Justificación válida. Aprobado.',
    createdAt: '2025-03-05T10:00:00-05:00',
    resolvedAt: '2025-03-05T14:30:00-05:00', resolvedBy: 'emp-004',
  },
  {
    id: 'req-002', employeeId: 'emp-007', type: 'permission', status: 'approved',
    startDate: '2025-03-10', endDate: '2025-03-10',
    reason: 'Permiso personal de medio día',
    notes: '',
    attachmentUrl: null,
    approverComment: 'Concedido.',
    createdAt: '2025-03-09T08:00:00-05:00',
    resolvedAt: '2025-03-09T16:00:00-05:00', resolvedBy: 'emp-004',
  },

  // Pending requests
  {
    id: 'req-003', employeeId: 'emp-011', type: 'overtime', status: 'pending',
    startDate: '2025-03-17', endDate: '2025-03-21',
    reason: 'Requiero autorización para horas extra durante la semana de mayor producción (17-21 marzo). Aprox. 2h diarias.',
    notes: 'Carga de trabajo incrementada por pedido urgente.',
    attachmentUrl: null, approverComment: null,
    createdAt: '2025-03-14T09:15:00-05:00',
    resolvedAt: null, resolvedBy: null,
  },
  {
    id: 'req-004', employeeId: 'emp-005', type: 'vacation', status: 'pending',
    startDate: '2025-04-01', endDate: '2025-04-15',
    reason: 'Solicitud de vacaciones anuales del 1 al 15 de abril.',
    notes: '15 días solicitados. Quedan 9 días disponibles según saldo.',
    attachmentUrl: null, approverComment: null,
    createdAt: '2025-03-10T11:00:00-05:00',
    resolvedAt: null, resolvedBy: null,
  },
  {
    id: 'req-005', employeeId: 'emp-009', type: 'schedule_change', status: 'pending',
    startDate: '2025-03-17', endDate: null,
    reason: 'Solicito cambio temporal de turno matutino a vespertino por dos semanas para cuidado de familiar.',
    notes: 'Del 17 al 31 de marzo.',
    attachmentUrl: null, approverComment: null,
    createdAt: '2025-03-13T15:30:00-05:00',
    resolvedAt: null, resolvedBy: null,
  },
  {
    id: 'req-006', employeeId: 'emp-012', type: 'manual_punch', status: 'pending',
    startDate: '2025-03-11', endDate: '2025-03-11',
    reason: 'No registró entrada el 11 de marzo porque el dispositivo biométrico no reconoció su huella. Llegó a las 07:05.',
    notes: 'Quedó registrado en el libro de asistencia manual.',
    attachmentUrl: null, approverComment: null,
    createdAt: '2025-03-11T07:30:00-05:00',
    resolvedAt: null, resolvedBy: null,
  },

  // Rejected requests
  {
    id: 'req-007', employeeId: 'emp-006', type: 'overtime', status: 'rejected',
    startDate: '2025-03-08', endDate: '2025-03-08',
    reason: 'Solicito tiempo extra para terminar informe.',
    notes: '',
    attachmentUrl: null,
    approverComment: 'No autorizado. El informe puede completarse en horario regular.',
    createdAt: '2025-03-07T16:45:00-05:00',
    resolvedAt: '2025-03-08T08:30:00-05:00', resolvedBy: 'emp-004',
  },
];