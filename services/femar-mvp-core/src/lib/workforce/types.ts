export interface WorkforceEvent {
  employeeId: string;
  timestamp: Date;
  eventType: 'checkin' | 'checkout' | 'break_start' | 'break_end';
  source: string; // e.g., 'zkteco', 'hikvision'
  deviceId: string;
  evidence?: string; // URL or reference to photo/video
  rawRef?: string; // Raw reference from device
}

export interface DeviceAdapter {
  validateDevice(deviceId: string): Promise<boolean>;
  processEvent(event: WorkforceEvent): Promise<void>;
  getDeviceConfig(deviceId: string): Promise<Record<string, any>>;
}