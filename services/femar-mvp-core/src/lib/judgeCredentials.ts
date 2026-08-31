/** Canonical hackathon judge credentials — password login only (no Google). */

export const JUDGE_DEMO_PASSWORD = 'demo123';

export type JudgeLoginAccount = {
  username: string;
  displayName: string;
  audience: string;
};

export const JUDGE_LOGIN_ACCOUNTS: JudgeLoginAccount[] = [
  {
    username: 'HACKATHON-JUDGE',
    displayName: 'Hackathon Judge',
    audience: 'AMD / InnerOS hackathon reviewers',
  },
  {
    username: 'DEVPOST-JUDGE',
    displayName: 'Devpost / XPRIZE Judge',
    audience: 'Devpost and XPRIZE reviewers',
  },
];

export const JUDGE_PORTAL_URL = 'https://inneros.creatorcore.ai/app/login';
export const JUDGE_CONSOLE_PATH = '/app/judge';

export function isJudgeDemoLoginId(loginId: string): boolean {
  const key = loginId.trim().toUpperCase();
  return JUDGE_LOGIN_ACCOUNTS.some((a) => a.username === key);
}

export function judgeLoginHintLines(): string[] {
  return [
    `Login URL: ${JUDGE_PORTAL_URL}`,
    `Username: ${JUDGE_LOGIN_ACCOUNTS.map((a) => a.username).join(' or ')}`,
    `Password: ${JUDGE_DEMO_PASSWORD}`,
    `Do not use Google sign-in for the judge demo.`,
    `After login you land on Judge Console (${JUDGE_CONSOLE_PATH}).`,
  ];
}
