// Retrieval side of RAG: embed a query, call the match_document_chunks RPC
// (pgvector cosine similarity, scoped to a workspace via RLS), and format
// the results as grounding context for the chat model.

import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText } from "@/lib/embeddings";

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  filename: string;
  content: string;
  similarity: number;
}

export async function retrieveRelevantChunks(
  supabase: SupabaseClient,
  workspaceId: string,
  query: string,
  matchCount = 8,
): Promise<RetrievedChunk[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const embedding = await embedText(trimmed);

  const { data, error } = await supabase.rpc("match_document_chunks", {
    p_workspace_id: workspaceId,
    p_query_embedding: embedding,
    p_match_count: matchCount,
  });

  if (error) {
    // Retrieval failing shouldn't take down chat — log and return no context.
    console.error("[rag] match_document_chunks failed:", error.message);
    return [];
  }

  return ((data as Record<string, unknown>[]) ?? []).map((row) => ({
    chunkId: row.chunk_id as string,
    documentId: row.document_id as string,
    filename: row.filename as string,
    content: row.content as string,
    similarity: row.similarity as number,
  }));
}

const MIN_SIMILARITY = 0.3; // Below this, a match is likely noise — drop it rather than confuse the model.

/**
 * Builds a system-prompt-appendable context block from retrieved chunks,
 * with inline citation markers so the model can (and should be instructed
 * to) reference sources in its answer.
 */
export function formatContextBlock(chunks: RetrievedChunk[]): string {
  const relevant = chunks.filter((c) => c.similarity >= MIN_SIMILARITY);
  if (relevant.length === 0) return "";

  const sourceLines = relevant
    .map((c, i) => `[${i + 1}] (${c.filename}, similarity ${c.similarity.toFixed(2)})\n${c.content}`)
    .join("\n\n");

  return (
    "You have access to the following excerpts from the workspace's Case Files. " +
    "Use them to ground your answer in the actual documents, and cite sources " +
    "by their [n] marker when you rely on one. If the excerpts don't contain " +
    "the answer, say so rather than guessing.\n\n" +
    sourceLines
  );
}
