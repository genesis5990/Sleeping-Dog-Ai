import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "generated-files";
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB — generous for code/text, not for binaries

interface SaveFileBody {
  workspace_id: string;
  filename: string;
  content: string;
  mime_type?: string;
  language?: string | null;
  thread_id?: string | null;
  message_id?: string | null;
  source?: "auto_detected" | "manual";
}

// POST /api/files — save chat-produced text/code content as a file in the
// workspace's Files area (Supabase Storage + generated_files metadata row).
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  let body: SaveFileBody;
  try {
    body = (await req.json()) as SaveFileBody;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  if (!body.workspace_id || !body.filename || typeof body.content !== "string") {
    return new NextResponse("workspace_id, filename, and content are required", { status: 400 });
  }

  const bytes = Buffer.from(body.content, "utf-8");
  if (bytes.byteLength > MAX_FILE_BYTES) {
    return new NextResponse(`File exceeds ${MAX_FILE_BYTES / (1024 * 1024)}MB limit`, { status: 400 });
  }
  if (bytes.byteLength === 0) {
    return new NextResponse("File content is empty", { status: 400 });
  }

  // 1. Create the metadata row first to get a stable id for the storage path.
  const { data: fileRow, error: insertErr } = await supabase
    .from("generated_files")
    .insert({
      workspace_id: body.workspace_id,
      thread_id: body.thread_id ?? null,
      message_id: body.message_id ?? null,
      created_by: user.id,
      filename: body.filename,
      mime_type: body.mime_type ?? "text/plain",
      size_bytes: bytes.byteLength,
      // Placeholder path updated right after upload succeeds.
      storage_path: "pending",
      source: body.source ?? "manual",
      language: body.language ?? null,
    })
    .select()
    .single();

  if (insertErr || !fileRow) {
    return new NextResponse(`Failed to create file record: ${insertErr?.message ?? "unknown error"}`, {
      status: 400,
    });
  }

  // Path convention matches the storage RLS policy: {workspace_id}/{file_id}/{filename}
  const storagePath = `${body.workspace_id}/${fileRow.id}/${body.filename}`;

  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
    contentType: body.mime_type ?? "text/plain",
    upsert: false,
  });

  if (uploadErr) {
    // Roll back the metadata row so we don't leave an orphaned reference.
    await supabase.from("generated_files").delete().eq("id", fileRow.id);
    return new NextResponse(`Upload failed: ${uploadErr.message}`, { status: 500 });
  }

  const { error: updateErr } = await supabase
    .from("generated_files")
    .update({ storage_path: storagePath })
    .eq("id", fileRow.id);

  if (updateErr) {
    return new NextResponse(`Failed to finalize file record: ${updateErr.message}`, { status: 500 });
  }

  return NextResponse.json({ ...fileRow, storage_path: storagePath });
}

// GET /api/files?workspace_id=... — list saved files for a workspace.
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return new NextResponse("workspace_id required", { status: 400 });

  const { data, error } = await supabase
    .from("generated_files")
    .select("id, filename, mime_type, size_bytes, source, language, thread_id, linked_document_id, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) return new NextResponse(error.message, { status: 400 });
  return NextResponse.json({ files: data });
}
