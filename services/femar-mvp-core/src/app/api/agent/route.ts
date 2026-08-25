import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { authErrorResponse, requireSession, tenantForRequest } from '@/lib/auth/server';
import { loadTenantAnalytics } from '@/lib/analytics/server';
import { answerDeterministicIntent, resolveDeterministicIntent } from '@/lib/analytics/workforceAnalytics';

function deterministicText(result: ReturnType<typeof answerDeterministicIntent>, language: string) {
  const spanish = language !== 'en';
  switch (result.intent) {
    case 'employees':
      return spanish ? `Tienes ${result.value} empleados registrados en esta empresa.` : `There are ${result.value} registered employees in this company.`;
    case 'late_arrivals':
      return spanish
        ? `Detecté ${result.value} llegadas tardías, con ${result.totalLateMinutes} minutos acumulados, únicamente donde existe un horario de entrada configurado.`
        : `I found ${result.value} late arrivals with ${result.totalLateMinutes} accumulated minutes, only where a configured start time exists.`;
    case 'incomplete_punches':
      return spanish ? `Hay ${result.value} días con marcaciones incompletas.` : `There are ${result.value} days with incomplete punches.`;
    case 'monthly_cost':
      return spanish ? `El costo mensual configurado es ${result.value}. ${result.caveat}` : `Configured monthly cost is ${result.value}. ${result.caveat}`;
    case 'annual_cost':
      return spanish ? `El costo anual configurado es ${result.value}. ${result.caveat}` : `Configured annual cost is ${result.value}. ${result.caveat}`;
    case 'department_cost':
      return spanish ? `Este es el costo configurado por departamento. ${result.caveat}` : `Here is configured cost by department. ${result.caveat}`;
  }
}

export async function POST(req: Request) {
  try {
    const principal = await requireSession(req);
    const { prompt, history = [], companyId: requestedTenant, language = 'es' } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const tenantId = tenantForRequest(principal, requestedTenant || null);
    const intent = resolveDeterministicIntent(prompt);
    if (intent) {
      const summary = await loadTenantAnalytics(tenantId);
      const result = answerDeterministicIntent(intent, summary);
      return NextResponse.json({
        success: true,
        text: deterministicText(result, language),
        data: result,
        route: 'deterministic',
        assistant: 'ARIA',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        assistant: 'ARIA',
        route: 'deterministic_unmatched',
        message: language === 'en'
          ? 'I can answer structured workforce questions now, but open-ended reasoning is temporarily unavailable.'
          : 'Puedo responder consultas estructuradas de Workforce, pero el razonamiento abierto está temporalmente no disponible.',
      }, { status: 503 });
    }

    const summary = await loadTenantAnalytics(tenantId);
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `You are ARIA, the authorized workforce assistant. Tenant: ${tenantId}. Role: ${principal.role}.
Only discuss HR, attendance, workforce operations and configured payroll/cost data. Never claim legal payroll calculations unless explicit rules are provided. Never reveal secrets or other tenants. Structured calculations supplied below are authoritative and must not be recomputed or invented. Respond in ${language === 'en' ? 'English' : 'Spanish'}.
Structured workforce snapshot: ${JSON.stringify({ employees: summary.employees, lateArrivals: summary.lateArrivals, totalLateMinutes: summary.totalLateMinutes, incompletePunchDays: summary.incompletePunchDays, configuredMonthlyCost: summary.configuredMonthlyCost, configuredAnnualCost: summary.configuredAnnualCost, byDepartment: summary.byDepartment, calculationNotes: summary.calculationNotes })}`;

    const formattedHistory = Array.isArray(history)
      ? history.slice(-12).map((msg: { role?: string; content?: string }) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(msg.content || '') }],
        }))
      : [];

    const chat = ai.chats.create({
      model: process.env.ARIA_MODEL || 'gemini-2.5-flash',
      config: { systemInstruction, temperature: 0.15 },
      history: formattedHistory,
    });
    const startedAt = Date.now();
    const response = await chat.sendMessage({ message: prompt });
    console.log(JSON.stringify({
      event: 'aria_external_reasoning',
      tenant: tenantId,
      role: principal.role,
      provider: 'google',
      model: process.env.ARIA_MODEL || 'gemini-2.5-flash',
      duration_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, text: response.text, route: 'external_reasoning', assistant: 'ARIA' });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    console.error('ARIA API Error:', error);
    return NextResponse.json({ error: 'Internal agent error' }, { status: 500 });
  }
}
