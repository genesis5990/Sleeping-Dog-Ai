// Server-side helpers for the RunPod vLLM serverless endpoint.
// Uses the OpenAI-compatible API at /v2/{endpoint_id}/openai/v1.
// Docs: https://docs.runpod.io/serverless/vllm/get-started

export function getRunpodConfig() {
  const endpointId = process.env.RUNPOD_ENDPOINT_ID;
  const apiKey = process.env.RUNPOD_API_KEY;
  const model = process.env.RUNPOD_MODEL_NAME;

  if (!endpointId || endpointId.startsWith("replace-")) {
    throw new Error("RUNPOD_ENDPOINT_ID is not set");
  }
  if (!apiKey || apiKey.startsWith("replace-")) {
    throw new Error("RUNPOD_API_KEY is not set");
  }
  if (!model) {
    throw new Error("RUNPOD_MODEL_NAME is not set");
  }

  const baseUrl =
    process.env.RUNPOD_BASE_URL ??
    `https://api.runpod.ai/v2/${endpointId}/openai/v1`;

  return { endpointId, apiKey, model, baseUrl };
}

export interface RunpodChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface RunpodChatRequest {
  messages: RunpodChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * Open a streaming chat completion against RunPod's OpenAI-compatible endpoint.
 * Returns the raw fetch Response — caller is responsible for piping/parsing SSE.
 */
export async function streamChatCompletion(
  req: RunpodChatRequest,
  signal?: AbortSignal,
): Promise<Response> {
  const { apiKey, model, baseUrl } = getRunpodConfig();

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.max_tokens ?? 1024,
      messages: req.messages,
    }),
    signal,
  });

  return res;
}
