import { JUDGE_TESTS, isVerifiedSuccess, parseJudgeTestCommand, safeStatus, testById } from './judgeCore';

describe('judgeCore', () => {
  test('publishes exactly seven independent tests', () => {
    expect(JUDGE_TESTS).toHaveLength(7);
    expect(JUDGE_TESTS.map((item) => item.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(JUDGE_TESTS.map((item) => item.capability)).size).toBe(7);
  });

  test.each([
    ['run test 1', 1],
    ['Run test 7', 7],
    ['ejecuta la opción 3', 3],
    ['ejecutar prueba 4', 4],
    ['test #5', 5],
    ['prueba 2', 2],
  ])('parses natural command %s', (input, expected) => {
    expect(parseJudgeTestCommand(input)).toBe(expected);
  });

  test.each(['run test 8', 'hello', 'ejecuta opción 0', ''])('rejects unsupported command %s', (input) => {
    expect(parseJudgeTestCommand(input)).toBeNull();
  });

  test('only LIVE counts as verified success', () => {
    expect(isVerifiedSuccess('LIVE')).toBe(true);
    expect(isVerifiedSuccess('PARTIAL')).toBe(false);
    expect(isVerifiedSuccess('READY')).toBe(false);
    expect(isVerifiedSuccess('RUNNING')).toBe(false);
  });

  test('normalizes unknown states to ERROR', () => {
    expect(safeStatus('live')).toBe('LIVE');
    expect(safeStatus('pass')).toBe('ERROR');
    expect(safeStatus('pending')).toBe('ERROR');
  });

  test('resolves only tests 1 through 7', () => {
    expect(testById(1)?.title).toBe('Sovereign Local AI');
    expect(testById(6)?.title).toBe('FunctionGemma');
    expect(testById(8)).toBeNull();
  });
});
