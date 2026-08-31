import { execFile } from 'node:child_process';
import path from 'node:path';

const PYTHON =
  process.env.RALFIA_MCP_PYTHON ||
  '/home/rlopez/inneros/inneros_core/platform/venv/bin/python';
const FEMAR_ROOT =
  process.env.FEMAR_ROOT ||
  '/home/rlopez/inneros/inneros_core/workspaces/innerspark-workforce-ai/services/femar-mvp-core';
const SCRIPT = path.join(FEMAR_ROOT, 'scripts', 'mcp_tool_call.py');

export type McpBridgeResult = Record<string, unknown> & { ok?: boolean; error?: string };

function runMcpTool(toolName: string, args: Record<string, unknown>): Promise<McpBridgeResult> {
  return new Promise((resolve) => {
    execFile(
      /* turbopackIgnore: true */
      PYTHON,
      [SCRIPT, toolName, JSON.stringify(args)],
      {
        timeout: 25000,
        env: process.env,
        maxBuffer: 2 * 1024 * 1024,
      },
      (err, stdout, stderr) => {
        if (err) {
          resolve({
            ok: false,
            error: err.message,
            stderr: stderr?.slice(0, 400),
          });
          return;
        }
        try {
          resolve(JSON.parse(stdout.trim()) as McpBridgeResult);
        } catch {
          resolve({ ok: false, error: 'invalid_json', raw: stdout.slice(0, 400) });
        }
      }
    );
  });
}

export async function mirrorPendienteToDevBacklog(input: {
  title: string;
  body: string;
  moduleId?: string;
  pendienteId: string;
}): Promise<void> {
  if (process.env.INNEROS_MIRROR_PENDIENTES_TO_BACKLOG === '0') return;
  try {
    await runMcpTool('capture_backlog_item', {
      title: input.title.slice(0, 160),
      body: input.body.slice(0, 2000),
      status: 'discussed',
      kind: 'task',
      source_agent: 'ARIA',
      project: 'inneros-iskcon-hackathon',
      tags: ['inneros-pendiente', 'aria', input.moduleId || 'portal'],
      evidence: `firestore:inneros_pendientes/${input.pendienteId}`,
    });
  } catch {
    // best-effort; Firestore remains source of truth for user pendientes
  }
}

export async function dispatchIskconAg52(
  action: string,
  message: string,
  dryRun = false
): Promise<McpBridgeResult> {
  return runMcpTool('agent_iskcon_dispatch', { action, message, dry_run: dryRun });
}

/** Prefer module_action when Codex registers it on MCP live; else AG-52 dispatch. */
export async function dispatchIskconModuleAction(
  intent: string,
  message: string,
  dryRun = false
): Promise<McpBridgeResult & { channel?: string }> {
  const mod = await runMcpTool('module_action', {
    tenant_id: 'iskcon',
    module_id: 'iskcon-desk',
    intent,
    inputs: { message },
    dry_run: dryRun,
  });
  const err = String(mod.error || mod.text || '');
  if (mod.ok !== false && !err.includes('Unknown tool')) {
    return { ...mod, channel: 'module_action' };
  }
  const ag52 = await dispatchIskconAg52(intent, message, dryRun);
  return { ...ag52, channel: 'agent_iskcon_dispatch' };
}

/** Canal único peer → Mongo + {agent}/INBOX.md */
export async function createAgentMessage(input: {
  targetAgent: string;
  title: string;
  body: string;
  priority?: string;
  fromAgent?: string;
}): Promise<McpBridgeResult> {
  return runMcpTool('create_agent_message', {
    from_agent: input.fromAgent || 'CURSOR',
    target_agent: input.targetAgent,
    title: input.title,
    body: input.body,
    priority: input.priority || 'normal',
  });
}

/** Delegación durable vía A2A → RACB ops_tasks */
export async function a2aDispatch(input: {
  agentId: string;
  title: string;
  body: string;
  correlationId?: string;
  priority?: string;
  dryRun?: boolean;
}): Promise<McpBridgeResult> {
  return runMcpTool('a2a_dispatch', {
    agent_id: input.agentId,
    title: input.title,
    body: input.body,
    correlation_id: input.correlationId || '',
    priority: input.priority || 'normal',
    dry_run: input.dryRun === true,
  });
}

export async function a2aStatus(): Promise<McpBridgeResult> {
  return runMcpTool('a2a_status', {});
}

export async function pollAgentInbox(
  agent: string,
  limit = 10,
  autoAck = true
): Promise<McpBridgeResult> {
  return runMcpTool('poll_agent_inbox', { agent, limit, auto_ack: autoAck });
}

export function callMcpTool(toolName: string, args: Record<string, unknown>): Promise<McpBridgeResult> {
  return runMcpTool(toolName, args);
}
