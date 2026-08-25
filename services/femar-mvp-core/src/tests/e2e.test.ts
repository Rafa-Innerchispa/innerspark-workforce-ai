import { GET } from '../app/api/health/route';
import { POST as CDataPost } from '../app/api/iclock/cdata/route';

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  cert: jest.fn(),
  applicationDefault: jest.fn(),
}));

import { db } from '@/lib/firebase';

jest.mock('firebase-admin/firestore', () => {
  const mockGet = jest.fn();
  const mockAdd = jest.fn();
  const mockSet = jest.fn().mockResolvedValue(true);
  const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
  const mockDocGet = jest.fn().mockResolvedValue({ exists: false, data: () => undefined });
  const mockDoc = jest.fn().mockReturnValue({ set: mockSet, get: mockDocGet });
  const mockCollection = jest.fn().mockReturnValue({ limit: mockLimit, add: mockAdd, doc: mockDoc });

  const mockBatchCommit = jest.fn();
  const mockBatchSet = jest.fn();
  const mockBatch = jest.fn().mockReturnValue({ commit: mockBatchCommit, set: mockBatchSet });

  return {
    getFirestore: jest.fn(() => ({ collection: mockCollection, batch: mockBatch }))
  };
});

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    constructor(body: unknown, init?: { status?: number }) {
      this.status = init?.status || 200;
      Object.assign(this, { text: async () => body });
    }
    static json(body: unknown, init?: { status?: number }) {
      return { status: init?.status || 200, json: async () => body };
    }
  }
  return { NextResponse: MockNextResponse, NextRequest: jest.fn() };
});

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => ({ bucket: jest.fn(() => ({ file: jest.fn() })) })),
}));

describe('E2E Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check (/api/health)', () => {
    it('should return 200 and alive status', async () => {
      (db.collection('users').limit(1).get as jest.Mock).mockResolvedValueOnce({ empty: false });
      const response = await GET();
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.alive).toBe(true);
      expect(data.services.firestore).toBe('connected');
    });
  });

  describe('ADMS CData Checkin (/api/iclock/cdata)', () => {
    it('should return 400 when body is empty', async () => {
      const req = {
        method: 'POST',
        text: async () => '',
        json: async () => ({}),
        url: 'http://localhost/api/iclock/cdata',
        nextUrl: { searchParams: new URLSearchParams() }
      } as unknown as Request;
      const response = await CDataPost(req as never);
      expect(response.status).toBe(400);
    });

    it('should write synthetic checkin to firestore without inventing tenant ownership', async () => {
      const logData = "1\t2023-01-01 10:00:00\t1\t1\t0\t0\t0";
      const req = {
        method: 'POST',
        text: async () => logData,
        json: async () => ({}),
        url: 'http://localhost/api/iclock/cdata?SN=TEST_DEV',
        nextUrl: { searchParams: new URLSearchParams('?SN=TEST_DEV') }
      } as unknown as Request;

      (db.batch().commit as jest.Mock).mockResolvedValueOnce(true);
      const response = await CDataPost(req as never);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(text).toBe('OK');
      expect(db.collection).toHaveBeenCalledWith('devices');
      expect(db.collection).toHaveBeenCalledWith('adms_logs');
      expect(db.batch().commit).toHaveBeenCalled();
    });
  });
});
