// Orchestrates the full ingestion pipeline for one uploaded file:
// extract text -> chunk -> embed -> store in document_chunks -> mark ready.
//
// Called from app/api/documents/ingest/route.ts. Takes a Supabase client
// that already carries the caller's session so every write goes through
// the same RLS policies as the rest of the app — no service-role bypass.

import type { SupabaseClient } from "@supabase/supabase-js";
import { extractText } from "@/lib/rag/extract";
import { chunkText, estimateTokenCount } from "@/lib/rag/chunk";
import { embedTexts } from "@/lib/embeddings";

export interface IngestFileInput {
  workspaceId: string;
  uploadedBy: string;
  filename: string;
  mimeType: string | null;
  buffer: Buffer;
}

export interface IngestResult {
  documentId: string;
  chunkCount: number;
  status: "ready" | "failed";
  errorMessage?: string;
}

export async function ingestFile(
  supabase: SupabaseClient,
  input: IngestFileInput,
): Promise<IngestResult> {
  // 1. Create the document row up front (status: processing) so the UI can
  //    show progress even if extraction/embedding takes a while.
  const { data: doc, error: insertErr } = await supabase
    .from("documents")
    .insert({
      workspace_id: input.workspaceId,
      uploaded_by: input.uploadedBy,
      filename: input.filename,
      mime_type: input.mimeType,
      size_bytes: input.buffer.byteLength,
      status: "processing",
      source_type: "other",
    })
    .select("id")
    .single();

  if (insertErr || !doc) {
    throw new Error(`Failed to create document row: ${insertErr?.message ?? "unknown error"}`);
  }

  const documentId = doc.id as string;

  try {
    // 2. Extract plain text.
    const extracted = await extractText(input.buffer, input.filename, input.mimeType);
    if (extracted.text.trim().length === 0) {
      throw new Error("No extractable text found in file");
    }

    // 3. Chunk.
    const chunks = chunkText(extracted.text);
    if (chunks.length === 0) {
      throw new Error("Text extracted but produced zero chunks");
    }

    // 4. Embed all chunks (batched internally by embedTexts).
    const embeddings = await embedTexts(chunks.map((c) => c.content));

    // 5. Store chunks. Insert in one call — document_chunks has a unique
    //    (document_id, chunk_index) constraint so re-ingestion is safe to retry.
    const rows = chunks.map((chunk, i) => ({
      document_id: documentId,
      workspace_id: input.workspaceId,
      chunk_index: chunk.index,
      content: chunk.content,
      token_count: estimateTokenCount(chunk.content),
      embedding: embeddings[i],
      metadata: extracted.metadata,
    }));

    const { error: chunkErr } = await supabase.from("document_chunks").insert(rows);
    if (chunkErr) {
      throw new Error(`Failed to store chunks: ${chunkErr.message}`);
    }

    // 6. Mark ready.
    await supabase
      .from("documents")
      .update({
        status: "ready",
        source_type: extracted.sourceType,
        chunk_count: chunks.length,
        metadata: extracted.metadata,
        error_message: null,
      })
      .eq("id", documentId);

    return { documentId, chunkCount: chunks.length, status: "ready" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown ingestion error";
    await supabase
      .from("documents")
      .update({ status: "failed", error_message: message })
      .eq("id", documentId);

    return { documentId, chunkCount: 0, status: "failed", errorMessage: message };
  }
}
