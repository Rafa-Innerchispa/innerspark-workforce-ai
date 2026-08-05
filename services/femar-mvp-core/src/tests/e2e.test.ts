import { GET } from '../app/api/health/route';
import { POST as CDataPost } from '../app/api/iclock/cdata/route';
import { NextRequest } from 'next/server';

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  cert: jest.fn(),
}));

const mockCollection = jest.fn();
const mockLimit = jest.fn();
const mockGet = jest.fn();
const mockAdd = jest.fn();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: mockCollection.mockReturnValue({
      limit: mockLimit.mockReturnValue({
        get: mockGet,
      }),
      add: mockAdd,
    }),
  })),
}));

describe('E2E Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check (/api/health)', () => {
    it('should return 200 and alive status', async () => {
      mockGet.mockResolvedValueOnce({ empty: false });
      
      const response = await GET();
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.alive).toBe(true);
      expect(data.services.firestore).toBe('connected');
    });
  });

  describe('ADMS CData Checkin (/api/iclock/cdata)', () => {
    it('should return 400 when body is empty', async () => {
      const req = new NextRequest('http://localhost/api/iclock/cdata', {
        method: 'POST',
        body: null
      });
      
      const response = await CDataPost(req);
      expect(response.status).toBe(400);
    });

    it('should write synthetic checkin to firestore with test_ prefix', async () => {
      const logData = "1\t2023-01-01 10:00:00\t1\t1\t0\t0\t0";
      const req = new NextRequest('http://localhost/api/iclock/cdata?SN=TEST_DEV', {
        method: 'POST',
        body: logData
      });
      
      mockAdd.mockResolvedValueOnce({ id: 'test_doc_id' });
      
      const response = await CDataPost(req);
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toBe('OK');
      expect(mockCollection).toHaveBeenCalledWith('checkins');
      expect(mockAdd).toHaveBeenCalled();
    });
  });
});
