import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { ECOSYSTEM_MODULES } from '@/lib/ecosystemModules';
import { resolveAllowedModuleIds } from '@/lib/entityEntitlements';
import { db } from '@/lib/firebase';
import {
  geminiConfigured,
  isGeminiAuthError,
  resolveGeminiApiKey,
  resolveGeminiModel,
} from '@/lib/geminiConfig';
import { shouldUseGemini, tryConversationalFallback, tryLocalAriaReply } from '@/lib/ariaHelpEngine';
import { matchModuleAction, actionsForModule } from '@/lib/moduleActions';
import { executeModuleAction } from '@/lib/iskconActionEngine';
import { tryPanihatiAriaReply } from '@/lib/panihatiAria';
import { tryAriaPendientesReply } from '@/lib/ariaPendientes';

const navigateDeclaration: FunctionDeclaration = {
  name: 'navigate_to_module',
  description: 'Abre un módulo del ecosistema InnerOS para el usuario',
  parameters: {
    type: Type.OBJECT,
    properties: {
      module_id: {
        type: Type.STRING,
        description: 'ID del módulo: workforce-ai, visitors, smart-quoter, quoteops, founderos, inneros-admin',
      },
      reason: { type: Type.STRING, description: 'Breve explicación para el usuario' },
    },
    required: ['module_id', 'reason'],
  },
};

async function respondLocal(
  prompt: string,
  replyLang: 'es' | 'en',
  allowedModules: ReturnType<typeof ECOSYSTEM_MODULES.filter>,
  moduleId: string,
  extra?: Record<string, unknown>
) {
  const local =
    tryLocalAriaReply(String(prompt), replyLang, allowedModules, 'authenticated', moduleId || undefined) ||
    tryConversationalFallback(String(prompt), replyLang, moduleId || undefined);
  if (local) {
    return NextResponse.json({ ...local, gemini: 'unavailable', ...extra });
  }
  return NextResponse.json({
    text:
      replyLang === 'es'
        ? 'Escribe ayuda para ver módulos, o prueba: patrocinadores, workforce, visitantes, cotizaciones.'
        : 'Type help for modules, or try: sponsors, workforce, visitors, quotes.',
    source: 'local',
    gemini: 'unavailable',
    ...extra,
  });
}

export async function POST(req: Request) {
  const { prompt, history = [], lang: rawLang, moduleContext, attachment } = await req.json();
  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
  }

  const replyLang = rawLang === 'es' ? 'es' : 'en';
  const moduleId = typeof moduleContext?.moduleId === 'string' ? moduleContext.moduleId : '';
  const attachmentNote =
    attachment && typeof attachment === 'object'
      ? `\n[Adjunto: ${String(attachment.name || 'file')} (${String(attachment.mime || '')}), ${Number(attachment.size || 0)} bytes${
          attachment.preview ? `\nPreview:\n${String(attachment.preview).slice(0, 800)}` : ''
        }]`
      : '';
  const effectivePrompt = `${String(prompt)}${attachmentNote}`;

  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('session_token')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userData = userDoc.data()!;
    const allowedIds = resolveAllowedModuleIds(userData.companyId, userData.role, userData.modules);
    const allowedModules = ECOSYSTEM_MODULES.filter((m) => allowedIds.includes(m.id as (typeof allowedIds)[number]));

    const pendientes = await tryAriaPendientesReply(String(effectivePrompt), replyLang, {
      userId,
      companyId: userData.companyId,
      moduleId: moduleId || undefined,
    });
    if (pendientes) {
      return NextResponse.json({
        text: pendientes.text,
        source: pendientes.source,
        data: pendientes.data,
      });
    }

    if (moduleId) {
      const panihati = await tryPanihatiAriaReply(String(effectivePrompt), replyLang);
      if (panihati) {
        return NextResponse.json({
          text: panihati.text,
          source: panihati.source,
          data: panihati.data,
        });
      }

      const action =
        matchModuleAction(String(effectivePrompt), moduleId) ||
        actionsForModule(moduleId).find((a) => a.id === moduleContext?.actionId);
      if (action) {
        const executed = await executeModuleAction(action, replyLang, String(effectivePrompt));
        return NextResponse.json({
          text: executed.text,
          source: 'module_action',
          action: { id: executed.actionId, status: executed.status },
          artifacts: executed.artifacts,
        });
      }
    }

    const local = tryLocalAriaReply(
      String(effectivePrompt),
      replyLang,
      allowedModules,
      'authenticated',
      moduleId || undefined
    );
    if (local) {
      return NextResponse.json({
        text: local.text,
        navigate: local.navigate,
        source: local.source,
      });
    }

    const apiKey = resolveGeminiApiKey();
    if (!apiKey) {
      return respondLocal(String(effectivePrompt), replyLang, allowedModules, moduleId, { gemini: 'unconfigured' });
    }

    if (!shouldUseGemini(String(effectivePrompt), false)) {
      return respondLocal(String(effectivePrompt), replyLang, allowedModules, moduleId);
    }

    const ai = new GoogleGenAI({ apiKey });
    const catalog = allowedModules
      .map((m) => `- ${m.id}: ${m.name} (${m.status}) — ${m.agentHint || m.description}${m.entryUrl ? ` → ${m.entryUrl}` : ''}`)
      .join('\n');

    const systemInstruction = `You are ARIA, the InnerOS assistant (CreatorCore).
User: ${userData.name}, tenant: ${userData.companyId}, role: ${userData.role}.
${moduleId ? `Current module context: ${moduleId}. Prefer module-specific actions over generic navigation.` : ''}
Allowed modules:
${catalog}

Rules:
1. Reply in ${replyLang === 'es' ? 'Spanish' : 'English'} unless the user clearly uses the other language.
2. If the user wants a module, call navigate_to_module with the correct module_id.
3. Never invent URLs. Only modules from the list.
4. Be brief, warm, and professional. Prefer short answers to save tokens.`;

    const chat = ai.chats.create({
      model: resolveGeminiModel(),
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [navigateDeclaration] }],
        temperature: 0.3,
      },
      history: (history || []).map((msg: { role: string; text: string }) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      })),
    });

    const response = await chat.sendMessage({ message: effectivePrompt });

    if (response.functionCalls?.length) {
      const call = response.functionCalls[0];
      const targetModuleId = String(call.args?.module_id || '');
      const mod = allowedModules.find((m) => m.id === targetModuleId);
      if (mod?.entryUrl) {
        return NextResponse.json({
          text: String(call.args?.reason || `Abriendo ${mod.name}.`),
          navigate: { module_id: mod.id, url: mod.entryUrl },
          source: 'gemini',
        });
      }
      return NextResponse.json({
        text: `No tengo acceso a ${targetModuleId} para tu entidad, o aún no está listo.`,
        source: 'gemini',
      });
    }

    return NextResponse.json({
      text: response.text || (replyLang === 'es' ? '¿En qué módulo te ayudo?' : 'Which module can I help with?'),
      source: 'gemini',
    });
  } catch (error) {
    console.error('ARIA ecosystem error:', error);
    if (isGeminiAuthError(error)) {
      console.error('ARIA: Gemini API key invalid or revoked — using local engine');
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('session_token')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const allowedIds = userData
      ? resolveAllowedModuleIds(userData.companyId, userData.role, userData.modules)
      : [];
    const allowedModules = ECOSYSTEM_MODULES.filter((m) => allowedIds.includes(m.id as (typeof allowedIds)[number]));

    return respondLocal(String(effectivePrompt), replyLang, allowedModules, moduleId, {
      gemini_error: isGeminiAuthError(error) ? 'auth' : 'temporary',
    });
  }
}
