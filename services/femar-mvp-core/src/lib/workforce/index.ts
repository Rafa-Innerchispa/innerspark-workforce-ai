import { WorkforceEvent } from './types';
import { ZktecoAdapter } from './adapters/zkteco';
import { HikvisionAdapter } from './adapters/hikvision';

export {
  buildTenantAttendanceReport,
  defaultTenantId,
  processDeviceAttlog,
  tenantAttendanceConfig,
} from './attendanceRuntime';

const adapters = {
  zkteco: new ZktecoAdapter(),
  hikvision: new HikvisionAdapter(),
};

export class WorkforceProcessor {
  static async processEvent(event: WorkforceEvent): Promise<void> {
    const adapter = adapters[event.source as keyof typeof adapters];
    if (!adapter) {
      throw new Error(`No adapter found for source: ${event.source}`);
    }
    
    await adapter.validateDevice(event.deviceId);
    await adapter.processEvent(event);
  }
}