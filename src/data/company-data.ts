import type { Company, Location, Shift } from '../domain/types';

export const company: Company = {
  id: 'comp-001',
  name: 'FEMAR — datos demostrativos',
  ruc: '1792837465001',
  address: 'Av. República del Salvador N34-128, Quito, Ecuador',
  phone: '+593 2 398 7654',
  timezone: 'America/Guayaquil',
  currency: 'USD',
};

export const locations: Location[] = [
  { id: 'loc-001', companyId: 'comp-001', name: 'Oficinas Matriz Quito', address: 'Av. República del Salvador N34-128, Quito', latitude: -0.180653, longitude: -78.467838, geofenceRadiusMeters: 200 },
  { id: 'loc-002', companyId: 'comp-001', name: 'Planta Industrial Guayaquil', address: 'Km 15.5 Vía Daule, Guayaquil', latitude: -2.170997, longitude: -79.922359, geofenceRadiusMeters: 300 },
  { id: 'loc-003', companyId: 'comp-001', name: 'Oficina Satélite Cuenca', address: 'Av. de las Américas 5-47, Cuenca', latitude: -2.897413, longitude: -79.004481, geofenceRadiusMeters: 150 },
];

export const shifts: Shift[] = [
  { id: 'shift-001', name: 'Matutino (07:00-15:00)', shiftType: 'regular', startTime: '07:00', endTime: '15:00', graceMinutesLate: 10, graceMinutesEarly: 5, breakStart: '10:00', breakEnd: '10:15', workHoursPerDay: 8 },
  { id: 'shift-002', name: 'Vespertino (15:00-23:00)', shiftType: 'regular', startTime: '15:00', endTime: '23:00', graceMinutesLate: 10, graceMinutesEarly: 5, breakStart: '18:00', breakEnd: '18:15', workHoursPerDay: 8 },
  { id: 'shift-003', name: 'Nocturno (23:00-07:00)', shiftType: 'night', startTime: '23:00', endTime: '07:00', graceMinutesLate: 10, graceMinutesEarly: 5, breakStart: '02:00', breakEnd: '02:15', workHoursPerDay: 8 },
  { id: 'shift-004', name: 'Administrativo (08:00-17:00)', shiftType: 'regular', startTime: '08:00', endTime: '17:00', graceMinutesLate: 15, graceMinutesEarly: 10, breakStart: '12:00', breakEnd: '13:00', workHoursPerDay: 8 },
  { id: 'shift-005', name: 'Ventas (09:00-18:00)', shiftType: 'regular', startTime: '09:00', endTime: '18:00', graceMinutesLate: 15, graceMinutesEarly: 10, breakStart: '13:00', breakEnd: '13:30', workHoursPerDay: 8 },
  { id: 'shift-006', name: 'Part-Time (09:00-13:00)', shiftType: 'part_time', startTime: '09:00', endTime: '13:00', graceMinutesLate: 10, graceMinutesEarly: 5, breakStart: null, breakEnd: null, workHoursPerDay: 4 },
];