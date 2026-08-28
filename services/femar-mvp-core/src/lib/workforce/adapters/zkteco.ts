import { DeviceAdapter, WorkforceEvent } from '../types';

export class ZktecoAdapter implements DeviceAdapter {
  async validateDevice(deviceId: string): Promise<boolean> {
    // Mock validation logic
    return deviceId.startsWith('zk');
  }

  async processEvent(event: WorkforceEvent): Promise<void> {
    // Mock processing logic
    console.log(`Processing ZKTECO event: ${event.employeeId} at ${event.timestamp}`);
    // In real impl: call ZKTECO SDK/API
  }

  async getDeviceConfig(deviceId: string): Promise<Record<string, any>> {
    // Mock config retrieval
    return { model: 'ZKTime', firmware: 'V1.2' };
  }
}