import { execFile } from 'node:child_process';

import { runFunctionGemmaProbe } from '@/lib/functionGemmaProbe';

jest.mock('node:child_process', () => ({
  execFile: jest.fn(),
}));

describe('functionGemmaProbe', () => {
  const mockedExecFile = execFile as unknown as jest.Mock;

  beforeEach(() => {
    mockedExecFile.mockReset();
  });

  it('returns LIVE PASS when python probe succeeds', async () => {
    mockedExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
      cb(
        null,
        JSON.stringify({
          ok: true,
          live_mode: 'LIVE',
          latency_ms: 120,
          response_preview: '{"predictions":[{"content":"call_tool"}]}',
          endpoint_id: 'mg-endpoint-test',
        }),
        ''
      );
    });

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
    expect(mockedExecFile).not.toHaveBeenCalled();
  });
});
