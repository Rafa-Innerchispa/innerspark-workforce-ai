import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { requireJudgeConsoleAccess } from '@/lib/sessionAuth';

const ARTIFACT_DIR =
  process.env.JUDGE_ARTIFACT_DIR || '/home/rlopez/data/judge/artifacts';

export async function GET(req: Request) {
  const user = await requireJudgeConsoleAccess();
  if (user instanceof NextResponse) return user;

  const url = new URL(req.url);
  const id = String(url.searchParams.get('id') || '').replace(/[^a-zA-Z0-9._-]/g, '');
  if (!id || !id.startsWith('judge-gemini-pdf-')) {
    return NextResponse.json({ ok: false, error: 'invalid_artifact_id' }, { status: 400 });
  }

  try {
    const filePath = path.join(ARTIFACT_DIR, `${id}.pdf`);
    const pdf = await readFile(filePath);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'artifact_not_found' }, { status: 404 });
  }
}
