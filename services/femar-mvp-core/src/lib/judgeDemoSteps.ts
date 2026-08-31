export type JudgeDemoStep = {
  id: string;
  labelEn: string;
  action: string;
  payload?: Record<string, unknown>;
  agent: string;
  protocol: string;
  evidenceMongo: string;
  /** Why this step exists in the demo. */
  purpose: string;
  /** What the judge should watch on screen. */
  expectedFlow: string;
  /** Objective PASS criteria (honest — no fake green). */
  passCriteria: string;
};

export const JUDGE_DEMO_STEPS: JudgeDemoStep[] = [
  {
    id: 'verify',
    labelEn: '1 · MCP health & safe trigger',
    action: 'safe_trigger',
    payload: { trigger: 'verify_system', dry_run: false },
    agent: 'Judge Console → MCP',
    protocol: 'judge_safe_trigger',
    evidenceMongo: 'judge_trace',
    purpose: 'Prove MCP health-watch and safe-trigger pipeline respond on the live fleet.',
    expectedFlow: 'Click Run → JSON shows ok + trigger result → Live Trace gains a verified row.',
    passCriteria: 'Response ok !== false; trace status not error.',
  },
  {
    id: 'a2a',
    labelEn: '2 · A2A bridge online',
    action: 'a2a_handshake',
    agent: 'MCP → A2A controller',
    protocol: 'a2a_status',
    evidenceMongo: 'agent_activity',
    purpose: 'Show agent-to-agent bridge online with real agent cards registry.',
    expectedFlow: 'MCP a2a_status returns state=online and agent_count > 0.',
    passCriteria: 'state === "online".',
  },
  {
    id: 'function_gemma',
    labelEn: '3 · FunctionGemma evidence',
    action: 'gemma_probe',
    agent: 'Judge Console -> Resource Fabric -> Google Vertex evidence',
    protocol: 'judge_model_routing_policy + gemma_probe',
    evidenceMongo: 'judge_trace + resource_fabric',
    purpose: 'Prove the hackathon used a real Gemma-family route honestly without disguising Qwen or another fallback as Gemma.',
    expectedFlow: 'Click Run -> response shows historical verification plus current NOT_RUNNING / READY_TO_REDEPLOY state.',
    passCriteria: 'FunctionGemma identity is preserved; current endpoint may be NOT_RUNNING, but no fake live serving is shown.',
  },
  {
    id: 'emergency_pdf',
    labelEn: '4 · ISKCON emergency PDF artifact',
    action: 'iskcon_emergency_pdf',
    agent: 'ISKCON module → PDF store',
    protocol: 'agent_iskcon_dispatch',
    evidenceMongo: 'judge_trace + artifact vault',
    purpose: 'Generate a real PDF artifact via ISKCON module (not a screenshot mock).',
    expectedFlow: 'Response includes pdf_url or artifact URL; file starts with %PDF-.',
    passCriteria: 'Non-empty PDF artifact URL returned.',
  },
  {
    id: 'ask_aria',
    labelEn: '5 · ARIA judge workflow',
    action: 'workflow_start',
    payload: { intent: 'ask_aria', message: 'Judge demo: explain InnerOS orchestration' },
    agent: 'ARIA orchestrator → MCP',
    protocol: 'judge_workflow_start',
    evidenceMongo: 'judge_trace',
    purpose: 'Start a judge workflow through ARIA orchestrator on live MCP.',
    expectedFlow: 'workflow_id or correlation_id returned; trace shows workflow event.',
    passCriteria: 'ok !== false; workflow or trace id present.',
  },
  {
    id: 'local_ai',
    labelEn: '6 · Local-first AMD routing',
    action: 'workflow_start',
    payload: { intent: 'local_ai_task', message: 'Local inference demo on AMD node' },
    agent: 'route_ai_task → Ollama/vLLM',
    protocol: 'judge_workflow_start + local_model',
    evidenceMongo: 'judge_trace + agent_activity',
    purpose: 'Route a bounded task to local AMD / Ollama path (local-first policy).',
    expectedFlow: 'Workflow starts; routing table shows local runtime when available.',
    passCriteria: 'ok !== false; may be PARTIAL if GPU busy — label stays honest.',
  },
  {
    id: 'a2a_dispatch',
    labelEn: '7 · RACB dispatch → AG-25 (dry run)',
    action: 'a2a_dispatch',
    payload: {
      agent_id: 'AG-25',
      title: 'Judge demo multi-agent',
      body: 'Multi-agent collaboration from Judge Console (dry_run)',
      correlation_id: 'judge-a2a-live-proof-20260830',
      dry_run: true,
    },
    agent: 'Judge → a2a_dispatch → AG-25',
    protocol: 'a2a_dispatch (RACB)',
    evidenceMongo: 'agent_activity + ops_tasks',
    purpose: 'Show durable RACB dispatch without side effects (dry_run=true).',
    expectedFlow: 'Dispatch accepted; task_id or dry_run flag in response; Live Trace shows the RACB chain.',
    passCriteria: 'ok !== false; dry_run acknowledged; correlation visible in trace.',
  },
];

export const JUDGE_CLOUD_BURST_NOTE = {
  title: 'AMD Cloud Burst / MI325X',
  preflight:
    'Preflight (this button) runs judge_mi325x_deploy with dry_run=true — estimates cost and capacity only.',
  deploy:
    'Real GPU burst deploy bills immediately and is owner-only. Judges never trigger production deploy from this panel.',
};
