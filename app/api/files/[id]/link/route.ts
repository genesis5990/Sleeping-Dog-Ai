import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ingestFile } from "@/lib/rag/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "generated-files";

// POST /api/files/:id/link — ingest a saved generated file into Case Files
// (documents + document_chunks) so it becomes retrievable RAG context in
// future chat messages, reusing the same ingestion pipeline as file uploads.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: file, error: fetchErr } = await supabase
    .from("generated_files")
    .select("id, workspace_id, filename, mime_type, storage_path, linked_document_id")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchErr || !file) return new NextResponse("File not found or access denied", { status: 404 });

  if (file.linked_document_id) {
    return NextResponse.json({ documentId: file.linked_document_id, status: "already_linked" });
  }

  const { data: blob, error: downloadErr } = await supabase.storage.from(BUCKET).download(file.storage_path);
  if (downloadErr || !blob) {
    return new NextResponse(`Failed to read file content: ${downloadErr?.message ?? "unknown error"}`, {
      status: 500,
    });
  }

  const buffer = Buffer.from(await blob.arrayBuffer());

  const result = await ingestFile(supabase, {
    workspaceId: file.workspace_id,
    uploadedBy: user.id,
    filename: file.filename,
    mimeType: file.mime_type,
    buffer,
  });

  if (result.status === "failed") {
    return new NextResponse(`Ingestion failed: ${result.errorMessage}`, { status: 500 });
  }

  await supabase
    .from("generated_files")
    .update({ linked_document_id: result.documentId })
    .eq("id", file.id);

  return NextResponse.json({ documentId: result.documentId, chunkCount: result.chunkCount, status: "linked" });
}
