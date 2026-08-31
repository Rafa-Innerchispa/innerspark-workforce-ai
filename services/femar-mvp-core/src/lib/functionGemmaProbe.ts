import { execFile } from 'node:child_process';
import path from 'node:path';

import type { McpBridgeResult } from '@/lib/ralfiaMcpBridge';

const DEFAULT_PROJECT = 'innerops-agentic-platform';
const DEFAULT_REGION = 'us-central1';
const DEFAULT_ENDPOINT_ID = 'mg-endpoint-98cacc40-0e4e-41fd-8f86-91a93146e936';
const DEFAULT_DEPLOYED_MODEL_ID = '2620158748978577408';
const PYTHON =
  process.env.RALFIA_MCP_PYTHON ||
  '/home/rlopez/inneros/inneros_core/platform/venv/bin/python';
const FEMAR_ROOT =
  process.env.FEMAR_ROOT ||
  '/home/rlopez/inneros/inneros_core/workspaces/innerspark-workforce-ai/services/femar-mvp-core';
const PROBE_SCRIPT = path.join(FEMAR_ROOT, 'scripts', 'function_gemma_live_probe.py');

function gemmaConfig() {
  return {
    projectId: process.env.INNEROS_FUNCTION_GEMMA_PROJECT_ID || DEFAULT_PROJECT,
    region: process.env.INNEROS_FUNCTION_GEMMA_ENDPOINT_REGION || DEFAULT_REGION,
    endpointId: (process.env.INNEROS_FUNCTION_GEMMA_ENDPOINT_ID ?? DEFAULT_ENDPOINT_ID).trim(),
    endpointDns: (process.env.INNEROS_FUNCTION_GEMMA_ENDPOINT_DNS ?? '').trim(),
    deployedModelId: (process.env.INNEROS_FUNCTION_GEMMA_DEPLOYED_MODEL_ID ?? DEFAULT_DEPLOYED_MODEL_ID).trim(),
    modelVersion: process.env.INNEROS_FUNCTION_GEMMA_MODEL_VERSION || 'function-gemma-270m',
  };
}

function historicalProbe(
  correlationId: string,
  routing: Record<string, unknown> | undefined,
  reason: string
): McpBridgeResult {
  return {
    ok: true,
    correlation_id: correlationId,
    status: 'HISTORICAL_PROVEN_CURRENTLY_NOT_RUNNING_READY_TO_REDEPLOY',
    live_mode: 'NOT_READY',
    provider: 'Google Vertex AI',
    model: 'FunctionGemma',
    runtime: 'vertex-model-garden-evidence',
    route_readiness: 'NOT_READY',
    evidence_ref: 'resource_fabric:google-ai-platform + judge_model_routing_policy:bounded_function_intent',
    message: reason,
    routing,
    resource_fabric_status: 'registered_google_ai_platform; detailed telemetry shown in Resource Fabric panel',
  };
}

function runPythonLiveProbe(): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    execFile(
      PYTHON,
      [PROBE_SCRIPT],
      {
        env: process.env,
        timeout: 90_000,
        maxBuffer: 2 * 1024 * 1024,
      },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(String(stderr || err.message).slice(0, 400)));
          return;
        }
        try {
          resolve(JSON.parse(String(stdout).trim()) as Record<string, unknown>);
        } catch {
          reject(new Error('invalid_python_probe_json'));
        }
      }
    );
  });
}

export async function runFunctionGemmaProbe(
  correlationId: string,
  routing?: Record<string, unknown>
): Promise<McpBridgeResult> {
  const cfg = gemmaConfig();
  if (!cfg.endpointId) {
    return historicalProbe(
      correlationId,
      routing,
      'FunctionGemma is presented as verified hackathon evidence; no live endpoint is configured.'
    );
  }

  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();

  try {
    const py = await runPythonLiveProbe();
    const latency_ms =
      typeof py.latency_ms === 'number' ? py.latency_ms : Date.now() - startedAt;
    const endpoint_id = String(py.endpoint_id || cfg.endpointId);
    const endpoint_dns = String(py.endpoint_dns || cfg.endpointDns);
    const base = {
      correlation_id: correlationId,
      provider: 'Google Vertex AI',
      model: 'FunctionGemma',
      model_version: cfg.modelVersion,
      runtime: 'vertex-model-garden-endpoint',
      endpoint_id,
      deployed_model_id: cfg.deployedModelId,
      endpoint_dns,
      latency_ms,
      nonce,
      request_format: String(py.request_format || 'vertex_predict_generate_prompt'),
      known_limitation: String(
        py.known_limitation ||
          'Model Garden chatCompletions sample returned HTTP 500 from the serving container; prompt generate format is live.'
      ),
      routing,
    };

    if (py.ok === true && py.live_mode === 'LIVE') {
      return {
        ...base,
        ok: true,
        status: 'PASS',
        live_mode: 'LIVE',
        route_readiness: 'LIVE',
        response_preview: String(py.response_preview || '').slice(0, 320),
        message: 'Live FunctionGemma inference through Vertex Model Garden endpoint.',
      };
    }

    return {
      ...base,
      ok: false,
      status: 'PARTIAL',
      live_mode: String(py.live_mode || 'NOT_READY'),
      error: String(py.error || py.message || 'function_gemma_probe_failed'),
      message: String(py.message || 'Endpoint configured but live probe failed — no fake PASS.'),
    };
  } catch (error) {
    return {
      ok: false,
      correlation_id: correlationId,
      status: 'PARTIAL',
      live_mode: 'NOT_READY',
      provider: 'Google Vertex AI',
      model: 'FunctionGemma',
      model_version: cfg.modelVersion,
      runtime: 'vertex-model-garden-endpoint',
      endpoint_id: cfg.endpointId,
      deployed_model_id: cfg.deployedModelId,
      endpoint_dns: cfg.endpointDns,
      latency_ms: Date.now() - startedAt,
      nonce,
      error: error instanceof Error ? error.message : String(error),
      message: 'Endpoint configured but live probe failed before inference — no fake PASS.',
      routing,
    };
  }
}
