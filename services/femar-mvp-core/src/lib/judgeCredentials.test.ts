import {
  JUDGE_DEMO_PASSWORD,
  JUDGE_LOGIN_ACCOUNTS,
  isJudgeDemoLoginId,
  judgeLoginHintLines,
} from '@/lib/judgeCredentials';

describe('judgeCredentials', () => {
  it('defines two judge usernames and a shared password', () => {
    expect(JUDGE_LOGIN_ACCOUNTS).toHaveLength(2);
    expect(JUDGE_DEMO_PASSWORD.length).toBeGreaterThanOrEqual(6);
  });

  it('recognizes judge demo login ids case-insensitively', () => {
    expect(isJudgeDemoLoginId('HACKATHON-JUDGE')).toBe(true);
    expect(isJudgeDemoLoginId('devpost-judge')).toBe(true);
    expect(isJudgeDemoLoginId('2222222222')).toBe(false);
  });

  it('builds login hint lines for the judge panel', () => {
    const lines = judgeLoginHintLines();
    expect(lines.join('\n')).toContain('HACKATHON-JUDGE');
    expect(lines.join('\n')).toContain(JUDGE_DEMO_PASSWORD);
    expect(lines.join('\n')).toContain('Do not use Google');
  });
});
