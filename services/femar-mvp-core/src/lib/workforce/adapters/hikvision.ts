import { DeviceAdapter, WorkforceEvent } from '../types';

export class HikvisionAdapter implements DeviceAdapter {
  async validateDevice(deviceId: string): Promise<boolean> {
    // Mock validation logic
    return deviceId.startsWith('hik');
  }

  async processEvent(event: WorkforceEvent): Promise<void> {
    // Mock processing logic
    console.log(`Processing HIKVISION event: ${event.employeeId} at ${event.timestamp}`);
    // In real impl: call HIKVISION ISAPI
  }

  async getDeviceConfig(deviceId: string): Promise<Record(_, any>> {
    // Mock config retrieval
    return { model: 'DS-2DE4A4IW', firmware: 'V3.4' };
  }
}