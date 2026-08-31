import { GoogleAuth } from 'google-auth-library';

import type { McpBridgeResult } from '@/lib/ralfiaMcpBridge';

const DEFAULT_PROJECT = 'innerops-agentic-platform';
const DEFAULT_REGION = 'us-central1';
const DEFAULT_ENDPOINT_ID = 'mg-endpoint-98cacc40-0e4e-41fd-8f86-91a93146e936';
const DEFAULT_ENDPOINT_DNS =
  'mg-endpoint-98cacc40-0e4e-41fd-8f86-91a93146e936.us-central1-92544879138.prediction.vertexai.goog';
const DEFAULT_DEPLOYED_MODEL_ID = '2620158748978577408';

function gemmaConfig() {
  return {
    projectId: process.env.INNEROS_FUNCTION_GEMMA_PROJECT_ID || DEFAULT_PROJECT,
    region: process.env.INNEROS_FUNCTION_GEMMA_ENDPOINT_REGION || DEFAULT_REGION,
    endpointId: (process.env.INNEROS_FUNCTION_GEMMA_ENDPOINT_ID ?? DEFAULT_ENDPOINT_ID).trim(),
    endpointDns: (process.env.INNEROS_FUNCTION_GEMMA_ENDPOINT_DNS ?? DEFAULT_ENDPOINT_DNS).trim(),
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
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse.token;
    if (!accessToken) {
      throw new Error('vertex_access_token_unavailable');
    }

    const url = cfg.endpointDns
      ? `https://${cfg.endpointDns}/v1/projects/${cfg.projectId}/locations/${cfg.region}/endpoints/${cfg.endpointId}:predict`
      : `https://${cfg.region}-aiplatform.googleapis.com/v1/projects/${cfg.projectId}/locations/${cfg.region}/endpoints/${cfg.endpointId}:predict`;

    const prompt = `Classify this tool intent. Return JSON only: {"intent":"call_tool","route":"function_gemma"}. User request: open the weather tool for Guayaquil. Nonce: ${nonce}.`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt, max_tokens: 64 }],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    const latency_ms = Date.now() - startedAt;
    const raw = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        correlation_id: correlationId,
        status: 'FAIL',
        live_mode: 'ERROR',
        provider: 'Google Vertex AI',
        model: 'FunctionGemma',
        model_version: cfg.modelVersion,
        runtime: 'vertex-model-garden-endpoint',
        endpoint_id: cfg.endpointId,
        deployed_model_id: cfg.deployedModelId,
        endpoint_dns: cfg.endpointDns,
        latency_ms,
        nonce,
        error: raw.slice(0, 480),
        routing,
      };
    }

    return {
      ok: true,
      correlation_id: correlationId,
      status: 'PASS',
      live_mode: 'LIVE',
      route_readiness: 'LIVE',
      provider: 'Google Vertex AI',
      model: 'FunctionGemma',
      model_version: cfg.modelVersion,
      runtime: 'vertex-model-garden-endpoint',
      endpoint_id: cfg.endpointId,
      deployed_model_id: cfg.deployedModelId,
      endpoint_dns: cfg.endpointDns,
      latency_ms,
      nonce,
      response_preview: raw.slice(0, 320),
      request_format: 'vertex_predict_generate_prompt',
      known_limitation:
        'Model Garden chatCompletions sample returned HTTP 500 from the serving container; prompt generate format is live.',
      message: 'Live FunctionGemma inference through Vertex Model Garden endpoint.',
      routing,
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
      message: 'Endpoint configured but live probe failed — no fake PASS.',
      routing,
    };
  }
}
