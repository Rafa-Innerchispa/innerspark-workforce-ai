import type { Holiday } from '../domain/types';

export const holidays: Holiday[] = [
  { id: 'hol-001', date: '01-01', name: 'Año Nuevo', isRecurring: true, isPaid: true },
  { id: 'hol-002', date: '03-03', name: 'Carnaval (Lunes)', isRecurring: false, year: 2025, isPaid: true },
  { id: 'hol-003', date: '03-04', name: 'Carnaval (Martes)', isRecurring: false, year: 2025, isPaid: true },
  { id: 'hol-004', date: '04-18', name: 'Viernes Santo', isRecurring: true, isPaid: true },
  { id: 'hol-005', date: '05-01', name: 'Día del Trabajador', isRecurring: true, isPaid: true },
  { id: 'hol-006', date: '05-24', name: 'Batalla de Pichincha', isRecurring: true, isPaid: true },
  { id: 'hol-007', date: '08-10', name: 'Primer Grito de Independencia', isRecurring: true, isPaid: true },
  { id: 'hol-008', date: '10-09', name: 'Independencia de Guayaquil', isRecurring: true, isPaid: true },
  { id: 'hol-009', date: '11-02', name: 'Día de los Difuntos', isRecurring: true, isPaid: true },
  { id: 'hol-010', date: '11-03', name: 'Independencia de Cuenca', isRecurring: true, isPaid: true },
  { id: 'hol-011', date: '12-25', name: 'Navidad', isRecurring: true, isPaid: true },
];