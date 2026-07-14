import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ingestFile } from "@/lib/rag/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // embedding a large PDF can take a while on a cold RunPod worker

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per file

// POST /api/documents/ingest — multipart/form-data upload into a workspace's Case Files.
// Fields: workspace_id (text), file (one or more, repeat the "file" field for multiple).
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new NextResponse("Expected multipart/form-data", { status: 400 });
  }

  const workspaceId = form.get("workspace_id");
  if (typeof workspaceId !== "string" || workspaceId.length === 0) {
    return new NextResponse("workspace_id required", { status: 400 });
  }

  // RLS on `workspaces` already scopes this to memberships the caller has,
  // so a bogus/foreign workspace_id simply returns no row here.
  const { data: workspace, error: wsErr } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (wsErr || !workspace) {
    return new NextResponse("Workspace not found or access denied", { status: 404 });
  }

  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return new NextResponse("At least one file is required", { status: 400 });
  }

  const results = [];
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      results.push({
        filename: file.name,
        status: "failed",
        errorMessage: `File exceeds ${MAX_FILE_BYTES / (1024 * 1024)}MB limit`,
      });
      continue;
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await ingestFile(supabase, {
        workspaceId,
        uploadedBy: user.id,
        filename: file.name,
        mimeType: file.type || null,
        buffer,
      });
      results.push({ filename: file.name, ...result });
    } catch (err) {
      results.push({
        filename: file.name,
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ results });
}

// GET /api/documents/ingest?workspace_id=... — list documents for a workspace.
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return new NextResponse("workspace_id required", { status: 400 });

  const { data, error } = await supabase
    .from("documents")
    .select("id, filename, source_type, mime_type, size_bytes, status, error_message, chunk_count, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) return new NextResponse(error.message, { status: 400 });

  return NextResponse.json({ documents: data });
}
