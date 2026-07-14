// Server-side helpers for the RunPod embedding serverless endpoint.
// Expects an OpenAI-compatible /v1/embeddings route (e.g. vLLM serving
// BAAI/bge-large-en-v1.5, or Infinity/TEI configured the same way).
// Used by the Case Files RAG pipeline: lib/rag/{ingest,retrieve}.ts.

export const EMBEDDING_DIMENSIONS = 1024; // bge-large-en-v1.5 output size — must match the
// `vector(1024)` column type in the document_chunks migration if you swap models.

export function getEmbeddingConfig() {
  const endpointId = process.env.RUNPOD_EMBEDDING_ENDPOINT_ID;
  const apiKey = process.env.RUNPOD_EMBEDDING_API_KEY ?? process.env.RUNPOD_API_KEY;
  const model = process.env.RUNPOD_EMBEDDING_MODEL_NAME ?? "BAAI/bge-large-en-v1.5";

  if (!endpointId || endpointId.startsWith("replace-")) {
    throw new Error("RUNPOD_EMBEDDING_ENDPOINT_ID is not set");
  }
  if (!apiKey || apiKey.startsWith("replace-")) {
    throw new Error("RUNPOD_EMBEDDING_API_KEY (or RUNPOD_API_KEY) is not set");
  }

  const baseUrl =
    process.env.RUNPOD_EMBEDDING_BASE_URL ??
    `https://api.runpod.ai/v2/${endpointId}/openai/v1`;

  return { endpointId, apiKey, model, baseUrl };
}

interface EmbeddingResponse {
  data: { embedding: number[]; index: number }[];
  model?: string;
  usage?: { prompt_tokens?: number; total_tokens?: number };
}

/**
 * Embed one or more strings via the RunPod embedding endpoint.
 * Returns vectors in the same order as the input array.
 *
 * Batches internally to keep individual requests small — vLLM/embedding
 * servers can be sensitive to very large batch payloads, and RunPod
 * serverless requests have a response-size ceiling.
 */
export async function embedTexts(
  texts: string[],
  opts: { batchSize?: number; signal?: AbortSignal } = {},
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const { apiKey, model, baseUrl } = getEmbeddingConfig();
  const batchSize = opts.batchSize ?? 32;
  const results: number[][] = new Array(texts.length);

  for (let start = 0; start < texts.length; start += batchSize) {
    const batch = texts.slice(start, start + batchSize);

    const res = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: batch }),
      signal: opts.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Embedding request failed (${res.status}): ${errText}`);
    }

    const json = (await res.json()) as EmbeddingResponse;
    for (const item of json.data) {
      results[start + item.index] = item.embedding;
    }
  }

  return results;
}

/** Convenience wrapper for embedding a single string (e.g. a chat query). */
export async function embedText(text: string, signal?: AbortSignal): Promise<number[]> {
  const [vec] = await embedTexts([text], { signal });
  return vec;
}

/** Formats a JS number array as a pgvector literal for use in raw SQL, if ever needed. */
export function toPgVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
