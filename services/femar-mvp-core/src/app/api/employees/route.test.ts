jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/serverAuth', () => ({
  resolveTenantContext: jest.fn(),
  TenantAccessError: class TenantAccessError extends Error {
    status: number;
    constructor(message: string, status = 401) {
      super(message);
      this.status = status;
    }
  },
}));

jest.mock('@/lib/firebase', () => ({
  db: {
    collection: jest.fn(),
    batch: jest.fn(),
  },
}));

import { db } from '@/lib/firebase';
import { resolveTenantContext } from '@/lib/serverAuth';
import { GET, POST } from './route';

const mockedDb = db as jest.Mocked<typeof db>;
const mockedResolveTenantContext = resolveTenantContext as jest.MockedFunction<typeof resolveTenantContext>;

describe('/api/employees tenant isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedResolveTenantContext.mockResolvedValue({
      userId: 'admin-femar',
      role: 'admin',
      companyId: 'femar',
    });
  });

  it('GET always scopes employees to the company resolved by the server session', async () => {
    const get = jest.fn().mockResolvedValue({
      docs: [{ data: () => ({ id: 'EMP-1', companyId: 'femar', name: 'Ana' }) }],
    });
    const where = jest.fn().mockReturnValue({ get });
    (mockedDb.collection as jest.Mock).mockReturnValue({ where });

    const response = await GET({} as any);
    const payload = await response.json();

    expect(where).toHaveBeenCalledWith('companyId', '==', 'femar');
    expect(payload.employees).toHaveLength(1);
  });

  it('POST ignores a forged client companyId and syncs only same-tenant devices', async () => {
    const employeeSet = jest.fn().mockResolvedValue(undefined);
    const employeeGet = jest.fn().mockResolvedValue({ exists: false });
    const employeeDoc = jest.fn().mockReturnValue({ get: employeeGet, set: employeeSet });

    const devicesGet = jest.fn().mockResolvedValue({
      docs: [
        { id: 'dev-femar-1', data: () => ({ companyId: 'femar', status: 'activo' }) },
        { id: 'dev-femar-2', data: () => ({ companyId: 'femar', status: 'pendiente' }) },
      ],
    });
    const devicesWhere = jest.fn().mockReturnValue({ get: devicesGet });

    const commandRef = { id: 'cmd-1' };
    const commandDoc = jest.fn().mockReturnValue(commandRef);
    const batchSet = jest.fn();
    const batchCommit = jest.fn().mockResolvedValue(undefined);
    (mockedDb.batch as jest.Mock).mockReturnValue({ set: batchSet, commit: batchCommit });

    (mockedDb.collection as jest.Mock).mockImplementation((name: string) => {
      if (name === 'employees') return { doc: employeeDoc };
      if (name === 'devices') return { where: devicesWhere };
      if (name === 'device_commands') return { doc: commandDoc };
      throw new Error(`Unexpected collection ${name}`);
    });

    const req = {
      json: async () => ({
        id: 'EMP-9',
        name: 'Empleado Seguro',
        companyId: 'iapro',
      }),
    } as any;

    const response = await POST(req);
    const payload = await response.json();

    expect(employeeSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'EMP-9', name: 'Empleado Seguro', companyId: 'femar' }),
      { merge: true }
    );
    expect(devicesWhere).toHaveBeenCalledWith('companyId', '==', 'femar');
    expect(batchSet).toHaveBeenCalledTimes(1);
    expect(batchSet).toHaveBeenCalledWith(
      commandRef,
      expect.objectContaining({ companyId: 'femar', deviceId: 'dev-femar-1' })
    );
    expect(batchCommit).toHaveBeenCalledTimes(1);
    expect(payload.syncedDevices).toBe(1);
  });
});
