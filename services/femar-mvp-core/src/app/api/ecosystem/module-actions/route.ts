import { NextResponse } from 'next/server';
import { actionsForModule, matchModuleAction } from '@/lib/moduleActions';
import { executeModuleAction } from '@/lib/iskconActionEngine';
import { ISKCON_DESK_HUBS } from '@/lib/iskconDeskHub';
import { requireSession } from '@/lib/sessionAuth';

export async function GET(req: Request) {
  const user = await requireSession();
  if (user instanceof NextResponse) return user;

  const url = new URL(req.url);
  const moduleId = url.searchParams.get('moduleId') || 'iskcon-desk';
  const actions = actionsForModule(moduleId).map((a) => ({
    id: a.id,
    moduleId: a.moduleId,
    status: a.status,
    titleEn: a.titleEn,
    titleEs: a.titleEs,
    descEn: a.descEn,
    descEs: a.descEs,
  }));

  const hubs =
    moduleId === 'iskcon-desk'
      ? ISKCON_DESK_HUBS.map((h) => ({
          id: h.id,
          actionId: h.actionId,
          icon: h.icon,
          status: h.status,
          titleEn: h.titleEn,
          titleEs: h.titleEs,
          descEn: h.descEn,
          descEs: h.descEs,
          subActions: h.subActions.map((s) => ({
            id: s.id,
            titleEn: s.titleEn,
            titleEs: s.titleEs,
            descEn: s.descEn,
            descEs: s.descEs,
            status: s.status,
          })),
        }))
      : [];

  return NextResponse.json({ ok: true, moduleId, actions, hubs });
}

export async function POST(req: Request) {
  const user = await requireSession();
  if (user instanceof NextResponse) return user;

  const body = await req.json().catch(() => ({}));
  const moduleId = String(body.moduleId || 'iskcon-desk');
  const actionId = body.actionId ? String(body.actionId) : '';
  const hubId = body.hubId ? String(body.hubId) : '';
  const subActionId = body.subActionId ? String(body.subActionId) : '';
  const prompt = String(body.prompt || '');
  const lang = body.lang === 'es' ? 'es' : 'en';

  const actions = actionsForModule(moduleId);
  const action =
    (actionId ? actions.find((a) => a.id === actionId) : undefined) ||
    (prompt ? matchModuleAction(prompt, moduleId) : undefined) ||
    (hubId ? actions.find((a) => a.id === hubId) : undefined);

  if (!action && !hubId) {
    return NextResponse.json(
      { ok: false, error: 'action_not_found', text: lang === 'es' ? 'Acción no reconocida.' : 'Action not recognized.' },
      { status: 400 }
    );
  }

  const resolvedAction =
    action ||
    actions.find((a) => a.id === 'food_for_life') ||
    actions[0];

  const result = await executeModuleAction(resolvedAction, lang, prompt, {
    hubId: hubId || undefined,
    subActionId: subActionId || undefined,
  });
  return NextResponse.json(result);
}
