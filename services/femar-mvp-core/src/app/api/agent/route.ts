import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { db } from '@/lib/firebase';
import { generatePayrollReport } from '@/lib/reportUtils';
import { mockEmployees } from '@/lib/mockData';

export async function POST(req: Request) {
  try {
    const { prompt, history = [], companyId } = await req.json();

    if (!prompt || !companyId) {
      return NextResponse.json({ error: 'Missing prompt or companyId' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const getEmployeesDeclaration: FunctionDeclaration = {
      name: 'get_employees',
      description: 'Obtiene un resumen de la lista de empleados de la empresa',
      parameters: { type: Type.OBJECT, properties: {} }
    };

    const calculatePayrollDeclaration: FunctionDeclaration = {
      name: 'calculate_payroll',
      description: 'Calcula y devuelve el resumen de la pre-nómina del mes actual para la empresa',
      parameters: { type: Type.OBJECT, properties: {} }
    };

    const getAnomaliesDeclaration: FunctionDeclaration = {
      name: 'get_anomalies',
      description: 'Obtiene el reporte de anomalías (atrasos, marcaciones incompletas) del día actual',
      parameters: { type: Type.OBJECT, properties: {} }
    };

    const tools = [{
      functionDeclarations: [getEmployeesDeclaration, calculatePayrollDeclaration, getAnomaliesDeclaration]
    }];

    const systemInstruction = `Eres un asistente experto de inteligencia artificial llamado 'Workforce Agent' para la plataforma 'InnerSpark Workforce AI'. 
Tu objetivo es ayudar a los administradores a gestionar el personal de la empresa usando datos en tiempo real.
El ID de la empresa actual es: ${companyId}. No respondas cosas fuera del contexto de Recursos Humanos o Workforce Management.
Usa las herramientas disponibles para consultar datos reales de la base de datos cuando sea necesario. 
Responde siempre en español, de forma concisa y profesional, usando un formato amigable.`;

    // Process chat history to match genai format
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction,
        tools,
        temperature: 0.2
      },
      history: formattedHistory
    });

    // Send initial message
    let response = await chat.sendMessage({ message: prompt });

    // Handle tool calls if the model decides to use a tool
    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        let toolResult = null;
        
        if (call.name === 'get_employees') {
          const snapshot = await db.collection('employees').where('companyId', '==', companyId).get();
          if (snapshot.size > 0) {
            toolResult = { total_employees: snapshot.size, employees: snapshot.docs.map(d => ({ id: d.id, name: d.data().name, position: d.data().position })) };
          } else {
            // Fallback to mock data if DB not seeded (only for FEMAR)
            const emps = companyId === 'femar' ? mockEmployees.filter(e => e.companyId === companyId) : [];
            toolResult = { total_employees: emps.length, employees: emps.map(e => ({ id: e.id, name: e.name, position: e.role })) };
          }
        } 
        else if (call.name === 'calculate_payroll') {
          // Fetch employees
          const empSnapshot = await db.collection('employees').where('companyId', '==', companyId).get();
          let employees = empSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          if (employees.length === 0) {
            employees = companyId === 'femar' ? mockEmployees.filter(e => e.companyId === companyId) as any : [];
          }
          // Fetch this month logs
          const now = new Date();
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          const logsSnapshot = await db.collection('realtime_logs')
            .where('timestamp', '>=', firstDay)
            .get();
            
          // Filter logs for this company (since realtimelogs don't have companyId directly, filter by emp match)
          const empIds = new Set(employees.map(e => e.id));
          const companyLogs = logsSnapshot.docs.map(d => d.data()).filter(log => empIds.has(log.user_id));
          
          const payroll = generatePayrollReport('el mes actual');
          
          // Filter payroll for this company
          const companyPayroll = payroll.filter((r: any) => empIds.has(r.id));

          toolResult = {
            total_employees_processed: companyPayroll.length,
            total_base_salaries: companyPayroll.reduce((acc: number, item: any) => acc + item.base, 0),
            total_iess_deductions: companyPayroll.reduce((acc: number, item: any) => acc + item.iess, 0),
            total_fines: companyPayroll.reduce((acc: number, item: any) => acc + item.penalty, 0),
            total_net_transfer: companyPayroll.reduce((acc: number, item: any) => acc + item.net, 0)
          };
        }
        else if (call.name === 'get_anomalies') {
          // Dummy data for today's anomalies for demo purposes
          toolResult = {
            date: new Date().toISOString().split('T')[0],
            late_arrivals: [
              { employee: 'Juan Perez', delay_minutes: 15 },
              { employee: 'Maria Gomez', delay_minutes: 45 }
            ],
            missing_checkouts: ['Carlos Ruiz']
          };
        }

        // Send tool result back to the model
        response = await chat.sendMessage({
          message: [{
            functionResponse: {
              name: call.name,
              response: { result: toolResult }
            }
          }]
        });
      }
    }

    return NextResponse.json({ success: true, text: response.text });
  } catch (error) {
    console.error('Agent API Error:', error);
    return NextResponse.json({ error: 'Internal agent error' }, { status: 500 });
  }
}
