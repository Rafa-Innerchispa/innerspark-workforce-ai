import { NextRequest, NextResponse } from 'next/server';
import { loadGlobalTraceEvents, loadJudgeConsoleSnapshot, runJudgeMcpAction } from '@/lib/judgeConsoleApi';
import { mergeTraceEvents } from '@/lib/judgeGlobalTrace';
import { loadA2aProofBundle } from '@/lib/judgeA2aProofServer';
import { requireJudgeConsoleAccess } from '@/lib/sessionAuth';

const SOFT_OK_ACTIONS = new Set(['demo_recording_suite']);

export async function GET(req: NextRequest) {
  const user = await requireJudgeConsoleAccess();
  if (user instanceof NextResponse) return user;

  const mode = req.nextUrl.searchParams.get('mode');
  const correlationId = req.nextUrl.searchParams.get('correlation_id') || undefined;
  const limit = Number(req.nextUrl.searchParams.get('limit') || '120');

  if (mode === 'trace') {
    const trace = await loadGlobalTraceEvents({ correlationId, limit });
    return NextResponse.json({
      ok: true,
      events: trace.events,
      sources: trace.sources,
      errors: trace.errors,
    });
  }

  if (mode === 'a2a_proof') {
    const bundle = await loadA2aProofBundle(correlationId || undefined);
    return NextResponse.json({ ok: true, ...bundle });
  }

  const snapshot = await loadJudgeConsoleSnapshot({ correlationId, limit });
  return NextResponse.json({
    user: { id: user.id, companyId: user.companyId, role: user.role },
    isOwner: user.role === 'superadmin',
    ...snapshot,
  });
}

export async function POST(req: Request) {
  const user = await requireJudgeConsoleAccess();
  if (user instanceof NextResponse) return user;

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const action = String(body.action || '');
  const result = await runJudgeMcpAction(action, body);
  const correlationId = String(result.correlation_id || body.correlation_id || '').trim();
  if (result.trace_persisted && correlationId) {
    const trace = await loadGlobalTraceEvents({ correlationId, limit: 40 });
    const scoped = trace.events.filter((event) => event.correlation_id === correlationId);
    (result as Record<string, unknown>).trace_events = mergeTraceEvents(scoped);
    (result as Record<string, unknown>).trace_sources = trace.sources;
  }
  const status = result.ok === false && !SOFT_OK_ACTIONS.has(action) ? 502 : 200;
  return NextResponse.json(result, { status });
}
