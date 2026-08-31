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
  /** Short ARIA chip label */
  ariaLabel?: string;
};

export const JUDGE_DEMO_STEPS: JudgeDemoStep[] = [
  {
    id: 'verify',
    labelEn: '1 · System alive — MCP health & safe trigger',
    ariaLabel: 'System alive',
    action: 'safe_trigger',
    payload: { trigger: 'verify_system', dry_run: false },
    agent: 'Judge Console → MCP',
    protocol: 'judge_safe_trigger',
    evidenceMongo: 'judge_trace',
    purpose: 'Prove MCP health-watch and safe-trigger pipeline respond on the live fleet.',
    expectedFlow: 'ARIA runs verify_system → health summary appears → Live Trace gains verified rows.',
    passCriteria: 'Response ok !== false; trace status not error.',
  },
  {
    id: 'a2a',
    labelEn: '2 · Agents connected — A2A bridge online',
    ariaLabel: 'Agents connected',
    action: 'a2a_handshake',
    agent: 'MCP → A2A controller',
    protocol: 'a2a_status',
    evidenceMongo: 'agent_activity',
    purpose: 'Show agent-to-agent bridge online with real agent cards registry.',
    expectedFlow: 'MCP a2a_status returns state=online and agent_count > 0 with visible agent names.',
    passCriteria: 'state === "online" and agent_count > 0.',
  },
  {
    id: 'function_gemma',
    labelEn: '3 · FunctionGemma — verify hackathon evidence',
    ariaLabel: 'FunctionGemma evidence',
    action: 'gemma_probe',
    agent: 'Judge Console → Resource Fabric → Google Vertex evidence',
    protocol: 'judge_model_routing_policy + gemma_probe',
    evidenceMongo: 'judge_trace + resource_fabric',
    purpose: 'Verify FunctionGemma hackathon evidence honestly — historical proof, not live inference.',
    expectedFlow: 'Click Verify → HISTORICAL VERIFIED / CURRENTLY NOT_RUNNING shown immediately.',
    passCriteria: 'FunctionGemma identity preserved; no fake live serving spinner.',
  },
  {
    id: 'emergency_pdf',
    labelEn: '4 · Gemini emergency PDF — live generation',
    ariaLabel: 'Gemini PDF',
    action: 'gemini_emergency_pdf',
    agent: 'ARIA → Google Gemini → PDF artifact',
    protocol: 'gemini_generate + buildMinimalPdf',
    evidenceMongo: 'judge_trace + artifact vault',
    purpose: 'Gemini writes a fresh emergency plan (nonce + timestamp) → converted to downloadable PDF.',
    expectedFlow: 'Gemini excerpt + provider/model/latency → Open PDF / Download PDF (application/pdf).',
    passCriteria: 'PDF URL exists; GET returns application/pdf; Gemini text visible unless PARTIAL fallback.',
  },
  {
    id: 'ask_aria',
    labelEn: '5 · ARIA live challenge',
    ariaLabel: 'ARIA challenge',
    action: 'workflow_start',
    payload: { intent: 'ask_aria', message: 'Judge demo: explain InnerOS orchestration with a fresh example.' },
    agent: 'ARIA orchestrator → MCP',
    protocol: 'judge_workflow_start',
    evidenceMongo: 'judge_trace',
    purpose: 'Start a judge workflow through ARIA orchestrator on live MCP.',
    expectedFlow: 'Actual ARIA/workflow response text or honest "workflow started" label.',
    passCriteria: 'ok !== false; response or workflow id present in proof.',
  },
  {
    id: 'local_ai',
    labelEn: '6 · Local-first AMD — Qwen inference',
    ariaLabel: 'Local AMD',
    action: 'local_ai_proof',
    payload: {
      message:
        'Return one sentence confirming local-first routing on AMD with a short code tip. Include a fresh nonce in the answer.',
    },
    agent: 'route_ai_task → Qwen3-Coder on AMD .5',
    protocol: 'route_ai_task + local_model',
    evidenceMongo: 'judge_trace + agent_activity',
    purpose: 'Route a bounded task to local AMD / Qwen path and show actual model output.',
    expectedFlow: 'Model answer + provider/model/runtime/node/latency in proof block.',
    passCriteria: 'Real model output returned; PARTIAL if only routing accepted.',
  },
  {
    id: 'a2a_dispatch',
    labelEn: '7 · Multi-agent RACB — DRY-RUN dispatch',
    ariaLabel: 'RACB dry-run',
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
    expectedFlow: 'DRY-RUN label visible; task_id or dry_run flag; Live Trace shows RACB chain.',
    passCriteria: 'ok !== false; dry_run acknowledged; never claim agent completed work.',
  },
];

export const JUDGE_CLOUD_BURST_NOTE = {
  title: 'AMD Cloud Burst / MI325X',
  preflight:
    'Preflight (this button) runs judge_mi325x_deploy with dry_run=true — estimates cost and capacity only.',
  deploy:
    'Real GPU burst deploy bills immediately and is owner-only. Judges never trigger production deploy from this panel.',
};
