import { runFunctionGemmaProbe } from '@/lib/functionGemmaProbe';

jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getClient: jest.fn().mockResolvedValue({
      getAccessToken: jest.fn().mockResolvedValue({ token: 'test-token' }),
    }),
  })),
}));

describe('functionGemmaProbe', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns LIVE PASS when endpoint responds', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => '{"predictions":[{"content":"{\\"intent\\":\\"call_tool\\"}"}]}',
    })) as typeof fetch;

    const result = await runFunctionGemmaProbe('corr-live-test', { routes: [] });
    expect(result.ok).toBe(true);
    expect(result.live_mode).toBe('LIVE');
    expect(result.status).toBe('PASS');
    expect(String(result.response_preview)).toContain('predictions');
  });

  it('returns historical when endpoint id is cleared', async () => {
    const prev = process.env.INNEROS_FUNCTION_GEMMA_ENDPOINT_ID;
    process.env.INNEROS_FUNCTION_GEMMA_ENDPOINT_ID = '';
    const result = await runFunctionGemmaProbe('corr-hist', undefined);
    process.env.INNEROS_FUNCTION_GEMMA_ENDPOINT_ID = prev;
    expect(result.live_mode).toBe('NOT_READY');
    expect(String(result.status)).toContain('HISTORICAL');
  });
});
