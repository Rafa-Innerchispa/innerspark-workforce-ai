import { GoogleAuth } from 'google-auth-library';

import type { McpBridgeResult } from '@/lib/ralfiaMcpBridge';

const DEFAULT_PROJECT = 'innerops-agentic-platform';
const DEFAULT_REGION = 'us-central1';
const DEFAULT_ENDPOINT_ID = 'mg-endpoint-98cacc40-0e4e-41fd-8f86-91a93146e936';
const DEFAULT_ENDPOINT_DNS =
  'mg-endpoint-98cacc40-0e4e-41fd-8f86-91a93146e936.us-central1-92544879138.prediction.vertexai.goog';
const DEFAULT_DEPLOYED_MODEL_ID = '2620158748978577408';
const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

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

function vertexAuth(): { auth: GoogleAuth; source: string } {
  // The production app already authenticates Firestore with this inline service
  // account. Reuse the same credential for Vertex instead of assuming gcloud ADC
  // exists on the AMD host.
  const inlineServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (inlineServiceAccount) {
    const credentials = JSON.parse(inlineServiceAccount) as Record<string, string>;
    return {
      auth: new GoogleAuth({ credentials, scopes: [CLOUD_PLATFORM_SCOPE] }),
      source: 'FIREBASE_SERVICE_ACCOUNT_KEY',
    };
  }

  return {
    auth: new GoogleAuth({ scopes: [CLOUD_PLATFORM_SCOPE] }),
    source: 'application_default_credentials',
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

type VertexAttempt = {
  name: string;
  url: string;
  body: Record<string, unknown>;
};

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
    const { auth, source: authSource } = vertexAuth();
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse.token;
    if (!accessToken) {
      throw new Error('vertex_access_token_unavailable');
    }

    const prompt = `Classify this tool intent. Return JSON only: {"intent":"call_tool","route":"function_gemma"}. User request: open the weather tool for Guayaquil. Nonce: ${nonce}.`;
    const basePredictUrl = cfg.endpointDns
      ? `https://${cfg.endpointDns}/v1/projects/${cfg.projectId}/locations/${cfg.region}/endpoints/${cfg.endpointId}:predict`
      : `https://${cfg.region}-aiplatform.googleapis.com/v1/projects/${cfg.projectId}/locations/${cfg.region}/endpoints/${cfg.endpointId}:predict`;

    // FunctionGemma/Model Garden serving has changed request surfaces over time.
    // Try the current dedicated-endpoint OpenAI-compatible route first, then the
    // documented Vertex chatCompletions request format, then the legacy prompt
    // predict format. PASS is returned only after a real 2xx response.
    const attempts: VertexAttempt[] = [];
    if (cfg.endpointDns) {
      attempts.push({
        name: 'dedicated_chat_completions',
        url: `https://${cfg.endpointDns}/v1beta1/projects/${cfg.projectId}/locations/${cfg.region}/endpoints/${cfg.endpointId}/chat/completions`,
        body: {
          model: '',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 64,
          temperature: 0,
        },
      });
    }
    attempts.push(
      {
        name: 'vertex_predict_chat_completions',
        url: basePredictUrl,
        body: {
          instances: [
            {
              '@requestFormat': 'chatCompletions',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 64,
              temperature: 0,
            },
          ],
        },
      },
      {
        name: 'vertex_predict_generate_prompt',
        url: basePredictUrl,
        body: {
          instances: [{ prompt, max_tokens: 64, temperature: 0 }],
        },
      }
    );

    const failures: string[] = [];
    for (const attempt of attempts) {
      try {
        const response = await fetch(attempt.url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(attempt.body),
          signal: AbortSignal.timeout(20_000),
        });
        const raw = await response.text();

        if (!response.ok) {
          failures.push(`${attempt.name}: HTTP ${response.status} ${raw.slice(0, 220)}`);
          continue;
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
          latency_ms: Date.now() - startedAt,
          nonce,
          response_preview: raw.slice(0, 320),
          request_format: attempt.name,
          auth_source: authSource,
          message: 'Live FunctionGemma inference through Vertex Model Garden endpoint.',
          routing,
        };
      } catch (attemptError) {
        failures.push(
          `${attempt.name}: ${attemptError instanceof Error ? attemptError.message : String(attemptError)}`
        );
      }
    }

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
      latency_ms: Date.now() - startedAt,
      nonce,
      auth_source: authSource,
      error: failures.join(' | ').slice(0, 1400),
      message: 'FunctionGemma endpoint was reached but no supported live inference route returned 2xx.',
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
      message: 'Endpoint configured but live probe failed before inference — no fake PASS.',
      routing,
    };
  }
}
