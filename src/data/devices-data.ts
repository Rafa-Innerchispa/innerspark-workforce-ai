import type { BiometricDevice } from '../domain/types';

export const devices: BiometricDevice[] = [
  {
    id: 'dev-001', serial: 'SF2A-EC-QUITO-001', model: 'ZKTeco_SenseFace_2A',
    name: 'SenseFace 2A — Acceso Principal', locationId: 'loc-001',
    ipAddress: '192.168.1.100', port: 4370, protocol: 'TA_PUSH',
    firmwareVersion: 'V2.8.6', status: 'online', lastSync: '2025-03-14T10:30:00-05:00',
    lastSyncStatus: 'success', employeeCount: 12,
  },
  {
    id: 'dev-002', serial: 'WL-EC-GYE-002', model: 'ZKTeco_WL_Series',
    name: 'WL-700 — Ingreso Planta', locationId: 'loc-002',
    ipAddress: '192.168.2.50', port: 4370, protocol: 'TCP_IP',
    firmwareVersion: 'V1.4.2', status: 'online', lastSync: '2025-03-14T10:25:00-05:00',
    lastSyncStatus: 'success', employeeCount: 18,
  },
  {
    id: 'dev-003', serial: 'ADMS-GYE-003', model: 'ZKTeco_ADMS',
    name: 'ADMS — Servidor Central', locationId: 'loc-002',
    ipAddress: '192.168.2.10', port: 8080, protocol: 'ADMS',
    firmwareVersion: 'V3.1.0', status: 'online', lastSync: '2025-03-14T10:28:00-05:00',
    lastSyncStatus: 'success', employeeCount: 25,
  },
  {
    id: 'dev-004', serial: 'M-APP-INTERNAL', model: 'mobile_app',
    name: 'App Móvil Empleados', locationId: 'loc-003',
    ipAddress: 'N/A', port: 0, protocol: 'internal_mobile',
    firmwareVersion: '1.0.0', status: 'online', lastSync: '2025-03-14T10:30:00-05:00',
    lastSyncStatus: 'success', employeeCount: 5,
  },
  {
    id: 'dev-005', serial: 'SF2A-EC-CUE-005', model: 'ZKTeco_SenseFace_2A',
    name: 'SenseFace 2A — Cuenca', locationId: 'loc-003',
    ipAddress: '192.168.3.100', port: 4370, protocol: 'TA_PUSH',
    firmwareVersion: 'V2.8.5', status: 'offline', lastSync: '2025-03-13T22:00:00-05:00',
    lastSyncStatus: 'partial', employeeCount: 3,
  },
];